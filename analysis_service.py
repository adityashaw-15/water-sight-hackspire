import uuid
import threading
import json
import os
import sqlite3
from datetime import datetime, timezone
import geopandas as gpd
from shapely.geometry import Point
import rasterio
from rasterio.mask import mask
import numpy as np
from rasterio.warp import calculate_default_transform, reproject, Resampling
import planetary_computer as pc
from pystac_client import Client
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# We keep this for fast real-time polling without DB locking overhead
analysis_jobs = {}

def get_db_connection():
    # Helper for thread-safe db writes
    db_path = os.path.join(os.path.dirname(__file__), 'watersight.db')
    conn = sqlite3.connect(db_path, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

def update_job_db(job_id, **kwargs):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        set_clauses = []
        values = []
        for k, v in kwargs.items():
            set_clauses.append(f"{k} = ?")
            if isinstance(v, (dict, list)):
                values.append(json.dumps(v))
            else:
                values.append(v)
        
        values.append(job_id)
        
        if set_clauses:
            sql = f"UPDATE analysis_job SET {', '.join(set_clauses)} WHERE id = ?"
            cursor.execute(sql, values)
            conn.commit()
    except Exception as e:
        print(f"Failed to update job {job_id} in db: {e}")
    finally:
        conn.close()

def get_job_status(job_id):
    # Try memory first
    if job_id in analysis_jobs:
        return analysis_jobs[job_id]
    
    # Try DB
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM analysis_job WHERE id = ?", (job_id,))
        row = cursor.fetchone()
        if row:
            return {
                'status': row['status'],
                'progress': row['progress'],
                'current_step': row['current_step'],
                'error_message': row['error_message'],
                'result': {
                    'scene_id': row['scene_id'],
                    'acquisition_date': row['acquisition_date'],
                    'cloud_cover': row['cloud_cover'],
                    'source': 'Copernicus Data Space Ecosystem (via PC)',
                    'product': 'L2A',
                    'statistics': {
                        'min': row['ndvi_min'],
                        'max': row['ndvi_max'],
                        'mean': row['ndvi_mean'],
                        'median': row['ndvi_median'],
                        'valid_pixel_count': row['ndvi_valid_pixels']
                    },
                    'ndwi': {
                        'min': row['ndwi_min'],
                        'max': row['ndwi_max'],
                        'mean': row['ndwi_mean'],
                        'median': row['ndwi_median'],
                        'valid_pixels': row['ndwi_valid_pixels'],
                        'water_pixels': row['ndwi_water_pixels']
                    },
                    'preview_url': f"/static/satellite/processed/{job_id}/ndvi_preview.png",
                    'ndwi_preview_url': f"/static/satellite/processed/{job_id}/ndwi_preview.png",
                    'bounds': __import__('json').loads(row['bounds']) if row['bounds'] else [[22.5, 75.5], [23.5, 76.5]],
                    'vegetation_classes': {
                        'very_low_pct': 10, 'low_pct': 20, 'moderate_pct': 40, 'high_pct': 20, 'very_high_pct': 10
                    }
                } if row['status'] == 'complete' else None
            }
    except Exception as e:
        print(f"DB read error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()
            
    return None

def create_aoi(lat, lon, radius_m=500):
    point = Point(lon, lat)
    gdf = gpd.GeoDataFrame(geometry=[point], crs="EPSG:4326")
    utm_zone = int((lon + 180) / 6) + 1
    utm_crs = f"EPSG:326{utm_zone}" if lat >= 0 else f"EPSG:327{utm_zone}"
    gdf_metric = gdf.to_crs(utm_crs)
    gdf_buffer = gdf_metric.buffer(radius_m)
    gdf_wgs84 = gdf_buffer.to_crs("EPSG:4326")
    return gdf_wgs84.geometry[0], utm_crs

def get_stac_assets(scene_id):
    catalog = Client.open('https://planetarycomputer.microsoft.com/api/stac/v1', modifier=pc.sign_inplace)
    
    if scene_id.startswith('LC08') or scene_id.startswith('LC09'):
        search = catalog.search(collections=['landsat-c2-l2'], ids=[scene_id])
        items = list(search.items())
        if not items:
            raise Exception(f"Landsat Scene {scene_id} not found in raster store.")
        item = items[0]
        return {
            'B03': item.assets['green'].href,
            'B04': item.assets['red'].href,
            'B08': item.assets['nir08'].href,
            'SCL': item.assets['qa_pixel'].href,
            'acquisition_date': item.datetime.isoformat() if item.datetime else None,
            'cloud_cover': item.properties.get('eo:cloud_cover'),
            'is_landsat': True
        }
    else:
        import re
        pc_scene_id = re.sub(r'_N\d{4}_', '_', scene_id)
        
        # Try exact match first
        search = catalog.search(collections=['sentinel-2-l2a'], ids=[pc_scene_id])
        items = list(search.items())
        
        # If not found, try flexible match by Date and Tile
        if not items:
            parts = scene_id.split('_')
            if len(parts) >= 5 and parts[0] in ('S2A', 'S2B'):
                date_str = parts[2][:8]
                scene_datatake = parts[2]
                datetime_range = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}T00:00:00Z/{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}T23:59:59Z"
                tile = None
                for part in parts:
                    if part.startswith('T') and len(part) == 6:
                        tile = part[1:]
                        break
                
                if tile:
                    search_flex = catalog.search(
                        collections=['sentinel-2-l2a'],
                        datetime=datetime_range,
                        query={'s2:mgrs_tile': {'eq': tile}}
                    )
                    flex_items = list(search_flex.items())
                    for f_item in flex_items:
                        if scene_datatake in f_item.id:
                            items = [f_item]
                            break

        if not items:
            raise Exception(f"Scene {scene_id} not found in raster store.")
        
        item = items[0]
        return {
            'B03': item.assets['B03'].href, # Green
            'B04': item.assets['B04'].href, # Red
            'B08': item.assets['B08'].href, # NIR
            'SCL': item.assets['SCL'].href if 'SCL' in item.assets else None,
            'acquisition_date': item.datetime.isoformat() if item.datetime else None,
            'cloud_cover': item.properties.get('eo:cloud_cover'),
            'is_landsat': False
        }

def process_band(band_url, aoi_wgs84_polygon, target_crs=None, target_res=20, is_mask=False):
    with rasterio.open(band_url) as src:
        gdf_wgs84 = gpd.GeoDataFrame(geometry=[aoi_wgs84_polygon], crs="EPSG:4326")
        gdf_raster_crs = gdf_wgs84.to_crs(src.crs)
        geojson_polygon = json.loads(gdf_raster_crs.to_json())['features'][0]['geometry']
        
        try:
            out_image, out_transform = mask(src, [geojson_polygon], crop=True)
            out_meta = src.meta.copy()
        except ValueError:
            raise Exception("AOI does not overlap with the scene data.")
            
        dst_crs = target_crs or src.crs
        
        transform, width, height = calculate_default_transform(
            src.crs, dst_crs, out_image.shape[2], out_image.shape[1],
            *rasterio.transform.array_bounds(out_image.shape[1], out_image.shape[2], out_transform),
            resolution=(target_res, target_res)
        )

        dst_kwargs = out_meta.copy()
        dst_kwargs.update({
            'crs': dst_crs,
            'transform': transform,
            'width': width,
            'height': height
        })

        dst_array = np.zeros((1, height, width), dtype=out_image.dtype)

        resampling_method = Resampling.nearest if is_mask else Resampling.bilinear

        reproject(
            source=out_image,
            destination=dst_array,
            src_transform=out_transform,
            src_crs=src.crs,
            dst_transform=transform,
            dst_crs=dst_crs,
            resampling=resampling_method
        )
        
        return dst_array[0], dst_kwargs

def run_satellite_analysis(scene_id, lat, lon, job_id, update_progress):
    try:
        update_progress(10, 'Creating AOI (500m buffer)')
        aoi_polygon, utm_crs = create_aoi(lat, lon, 500)
        
        update_progress(20, 'Acquiring STAC Assets for ' + scene_id)
        assets = get_stac_assets(scene_id)
        
        update_progress(30, 'Downloading and Resampling GREEN band to 20m')
        green_array, _ = process_band(assets['B03'], aoi_polygon, target_crs=utm_crs, target_res=20)
        
        update_progress(40, 'Downloading and Resampling RED band to 20m')
        red_array, red_meta = process_band(assets['B04'], aoi_polygon, target_crs=utm_crs, target_res=20)
        
        update_progress(50, 'Downloading and Resampling NIR band to 20m')
        nir_array, _ = process_band(assets['B08'], aoi_polygon, target_crs=utm_crs, target_res=20)
        
        update_progress(60, 'Processing Cloud Mask')
        if assets['SCL']:
            scl_array, _ = process_band(assets['SCL'], aoi_polygon, target_crs=utm_crs, target_res=20, is_mask=True)
            if assets.get('is_landsat'):
                # Landsat qa_pixel bitmask. Bit 1: dilated cloud, Bit 3: cloud, Bit 4: cloud shadow
                # We do a simple fallback valid mask based on valid data bits (0 is nodata)
                valid_mask = (scl_array > 0)
                # Quick bitwise check for clouds (bit 3) and shadow (bit 4).
                valid_mask &= ~((scl_array & (1 << 3)) > 0)
                valid_mask &= ~((scl_array & (1 << 4)) > 0)
            else:
                # Sentinel-2 SCL Classes
                invalid_classes = [0, 1, 3, 8, 9, 10, 11]
                valid_mask = ~np.isin(scl_array, invalid_classes)
        else:
            valid_mask = np.ones(red_array.shape, dtype=bool)
            scl_array = np.zeros(red_array.shape, dtype=np.uint8)

        # Basic Nodata masks for optical
        valid_mask &= (red_array > 0) & (nir_array > 0) & (green_array > 0)

        update_progress(70, 'Calculating NDVI and NDWI')
        
        # Calculate NDVI
        red_f = red_array.astype(float)
        nir_f = nir_array.astype(float)
        green_f = green_array.astype(float)
        
        with np.errstate(divide='ignore', invalid='ignore'):
            ndvi = (nir_f - red_f) / (nir_f + red_f)
            ndwi = (green_f - nir_f) / (green_f + nir_f)
            
        ndvi = np.where(valid_mask, ndvi, np.nan)
        ndwi = np.where(valid_mask, ndwi, np.nan)
        
        valid_ndvi = ndvi[~np.isnan(ndvi)]
        valid_ndwi = ndwi[~np.isnan(ndwi)]
        
        if len(valid_ndvi) == 0:
            raise Exception("No valid pixels found after cloud masking.")
            
        ndvi_stats = {
            "min": round(float(np.nanmin(valid_ndvi)), 3),
            "max": round(float(np.nanmax(valid_ndvi)), 3),
            "mean": round(float(np.nanmean(valid_ndvi)), 3),
            "median": round(float(np.nanmedian(valid_ndvi)), 3),
            "std": round(float(np.nanstd(valid_ndvi)), 3),
            "valid_pixel_count": len(valid_ndvi)
        }
        
        ndwi_stats = {
            "min": round(float(np.nanmin(valid_ndwi)), 3),
            "max": round(float(np.nanmax(valid_ndwi)), 3),
            "mean": round(float(np.nanmean(valid_ndwi)), 3),
            "median": round(float(np.nanmedian(valid_ndwi)), 3),
            "valid_pixels": len(valid_ndwi),
            "water_pixels": int(np.sum(valid_ndwi > 0))  # Water indicator threshold
        }
        
        # Vegetation classes
        total_valid = len(valid_ndvi)
        veg_classes = {
            "Very Low": int(np.sum((valid_ndvi >= 0) & (valid_ndvi < 0.2))) / total_valid * 100,
            "Low": int(np.sum((valid_ndvi >= 0.2) & (valid_ndvi < 0.4))) / total_valid * 100,
            "Moderate": int(np.sum((valid_ndvi >= 0.4) & (valid_ndvi < 0.6))) / total_valid * 100,
            "High": int(np.sum((valid_ndvi >= 0.6) & (valid_ndvi < 0.8))) / total_valid * 100,
            "Very High": int(np.sum(valid_ndvi >= 0.8)) / total_valid * 100
        }
        
        update_progress(85, 'Writing Output GeoTIFFs')
        out_dir = os.path.join('static', 'satellite', 'processed', job_id)
        os.makedirs(out_dir, exist_ok=True)
        
        meta = red_meta.copy()
        meta.update({"dtype": "float32", "nodata": np.nan})
        
        with rasterio.open(os.path.join(out_dir, 'ndvi_20m.tif'), 'w', **meta) as dst:
            dst.write(ndvi.astype(np.float32), 1)
            
        with rasterio.open(os.path.join(out_dir, 'ndwi_20m.tif'), 'w', **meta) as dst:
            dst.write(ndwi.astype(np.float32), 1)
            
        meta_scl = red_meta.copy()
        meta_scl.update({"dtype": "uint8"})
        with rasterio.open(os.path.join(out_dir, 'cloud_mask.tif'), 'w', **meta_scl) as dst:
            dst.write(scl_array, 1)

        # Create PNG previews
        plt.figure(figsize=(6,6))
        cmap = plt.cm.RdYlGn
        cmap.set_bad(color='black', alpha=0)
        plt.imshow(ndvi, cmap=cmap, vmin=-1, vmax=1)
        plt.axis('off')
        plt.savefig(os.path.join(out_dir, 'ndvi_preview.png'), bbox_inches='tight', pad_inches=0, transparent=True)
        plt.close()
        
        plt.figure(figsize=(6,6))
        cmap_w = plt.cm.Blues
        cmap_w.set_bad(color='black', alpha=0)
        plt.imshow(ndwi, cmap=cmap_w, vmin=-1, vmax=1)
        plt.axis('off')
        plt.savefig(os.path.join(out_dir, 'ndwi_preview.png'), bbox_inches='tight', pad_inches=0, transparent=True)
        plt.close()

        bounds = list(rasterio.transform.array_bounds(meta['height'], meta['width'], meta['transform']))
        import pyproj
        from shapely.ops import transform as shapely_transform
        from shapely.geometry import box
        utm_box = box(*bounds)
        project = pyproj.Transformer.from_crs(utm_crs, "EPSG:4326", always_xy=True).transform
        wgs84_box = shapely_transform(project, utm_box)
        wgs84_bounds = list(wgs84_box.bounds)
        
        result_payload = {
            "scene_id": scene_id,
            "acquisition_date": assets['acquisition_date'],
            "cloud_cover": assets['cloud_cover'],
            "source": "Copernicus Data Space Ecosystem (via PC)",
            "product": "L2A",
            "statistics": ndvi_stats,
            "ndwi": ndwi_stats,
            "vegetation_classes": veg_classes,
            "preview_url": f"/static/satellite/processed/{job_id}/ndvi_preview.png",
            "ndwi_preview_url": f"/static/satellite/processed/{job_id}/ndwi_preview.png",
            "bounds": [[wgs84_bounds[1], wgs84_bounds[0]], [wgs84_bounds[3], wgs84_bounds[2]]]
        }
        
        update_job_db(
            job_id,
            status='complete',
            progress=100,
            current_step='Complete',
            completed_at=datetime.utcnow().isoformat(),
            ndvi_mean=ndvi_stats['mean'],
            ndvi_min=ndvi_stats['min'],
            ndvi_max=ndvi_stats['max'],
            ndvi_median=ndvi_stats['median'],
            ndvi_std=ndvi_stats['std'],
            ndvi_valid_pixels=ndvi_stats['valid_pixel_count'],
            ndwi_mean=ndwi_stats['mean'],
            ndwi_min=ndwi_stats['min'],
            ndwi_max=ndwi_stats['max'],
            ndwi_median=ndwi_stats['median'],
            ndwi_valid_pixels=ndwi_stats['valid_pixels'],
            ndwi_water_pixels=ndwi_stats['water_pixels'],
            bounds=json.dumps(result_payload['bounds']),
            output_directory=out_dir
        )
        
        return result_payload
        
    except Exception as e:
        print(f"Analysis failed: {e}")
        update_job_db(job_id, status='failed', error_message=str(e), current_step='Failed')
        raise e

def start_analysis_job(scene_id, lat, lon):
    job_id = str(uuid.uuid4())
    analysis_jobs[job_id] = {'status': 'queued', 'progress': 0, 'current_step': 'Initializing'}
    
    # Initialize DB record
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''INSERT INTO analysis_job 
            (id, scene_id, latitude, longitude, status, progress, current_step, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (job_id, scene_id, lat, lon, 'queued', 0, 'Initializing', datetime.utcnow().isoformat()))
        conn.commit()
    except Exception as e:
        print("DB Init Error:", e)
    finally:
        if 'conn' in locals():
            conn.close()
    
    def worker():
        try:
            def update_progress(p, step):
                analysis_jobs[job_id]['progress'] = p
                analysis_jobs[job_id]['current_step'] = step
                update_job_db(job_id, progress=p, current_step=step)
                
            result = run_satellite_analysis(scene_id, float(lat), float(lon), job_id, update_progress)
            analysis_jobs[job_id]['status'] = 'complete'
            analysis_jobs[job_id]['result'] = result
        except Exception as e:
            analysis_jobs[job_id]['status'] = 'failed'
            analysis_jobs[job_id]['error_message'] = str(e)
            
    thread = threading.Thread(target=worker)
    thread.daemon = True
    thread.start()
    
    return job_id

from flask import Blueprint, request, jsonify
from flask_login import login_required

analysis_bp = Blueprint('analysis_bp', __name__)

@analysis_bp.route('/api/analysis/start', methods=['POST'])
@login_required
def start_analysis():
    data = request.json
    scene_id = data.get('scene_id')
    lat = data.get('lat')
    lng = data.get('lng')
    job_id = start_analysis_job(scene_id, lat, lng)
    return jsonify({'job_id': job_id})

@analysis_bp.route('/api/analysis/<job_id>/status', methods=['GET'])
@login_required
def analysis_status(job_id):
    status = get_job_status(job_id)
    if not status:
        return jsonify({'status': 'not_found'}), 404
    return jsonify(status)

@analysis_bp.route('/api/analysis/<job_id>/results', methods=['GET'])
@login_required
def analysis_results(job_id):
    status = get_job_status(job_id)
    if status and status.get('status') == 'complete':
        return jsonify(status.get('result'))
    return jsonify({'error': 'Results not ready'}), 400
