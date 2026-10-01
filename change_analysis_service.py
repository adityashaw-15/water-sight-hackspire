import uuid
import threading
import json
import os
import sqlite3
from datetime import datetime
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

from analysis_service import get_db_connection, create_aoi, get_stac_assets, process_band

change_jobs = {}

def update_change_job_db(job_id, **kwargs):
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
            sql = f"UPDATE change_analysis_job SET {', '.join(set_clauses)} WHERE id = ?"
            cursor.execute(sql, values)
            conn.commit()
    except Exception as e:
        print(f"Failed to update change job {job_id} in db: {e}")
    finally:
        conn.close()

def get_change_job_status(job_id):
    if job_id in change_jobs:
        return change_jobs[job_id]
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM change_analysis_job WHERE id = ?", (job_id,))
        row = cursor.fetchone()
        if row:
            return {
                'status': row['status'],
                'progress': row['progress'],
                'current_step': row['current_step'],
                'error_message': row['error_message'],
                'result': {
                    'baseline': {
                        'scene_id': row['baseline_scene_id'],
                        'date': row['baseline_date'],
                        'cloud_cover': row['baseline_cloud_cover'],
                        'mean_ndvi': row['baseline_mean_ndvi'],
                        'vegetation_percentage': row['baseline_vegetation_percentage'],
                        'water_area_ha': row['baseline_water_area_ha']
                    },
                    'comparison': {
                        'scene_id': row['comparison_scene_id'],
                        'date': row['comparison_date'],
                        'cloud_cover': row['comparison_cloud_cover'],
                        'mean_ndvi': row['comparison_mean_ndvi'],
                        'vegetation_percentage': row['comparison_vegetation_percentage'],
                        'water_area_ha': row['comparison_water_area_ha']
                    },
                    'change': {
                        'mean_ndvi_change': row['mean_ndvi_change'],
                        'vegetation_change_percentage_points': row['vegetation_change_percentage_points'],
                        'water_area_change_ha': row['water_area_change_ha'],
                        'water_area_change_percent': row['water_area_change_percent'],
                        'vegetation_increase_area_ha': row['vegetation_increase_area_ha'],
                        'vegetation_decrease_area_ha': row['vegetation_decrease_area_ha'],
                        'stable_area_ha': row['stable_area_ha']
                    },
                    'bounds': json.loads(row['bounds']) if row['bounds'] else None,
                    'preview_urls': {
                        'ndvi_change': f"/static/satellite/change/{job_id}/ndvi_change_preview.png",
                        'ndvi_baseline': f"/static/satellite/change/{job_id}/ndvi_baseline_preview.png",
                        'ndvi_comparison': f"/static/satellite/change/{job_id}/ndvi_comparison_preview.png",
                    }
                } if row['status'] == 'complete' else None
            }
    except Exception as e:
        print(f"DB read error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()
            
    return None

def process_scene_data(assets, aoi_polygon, utm_crs):
    green_array, _ = process_band(assets['B03'], aoi_polygon, target_crs=utm_crs, target_res=20)
    red_array, red_meta = process_band(assets['B04'], aoi_polygon, target_crs=utm_crs, target_res=20)
    nir_array, _ = process_band(assets['B08'], aoi_polygon, target_crs=utm_crs, target_res=20)
    
    if assets['SCL']:
        scl_array, _ = process_band(assets['SCL'], aoi_polygon, target_crs=utm_crs, target_res=20, is_mask=True)
        invalid_classes = [0, 1, 3, 8, 9, 10, 11]
        valid_mask = ~np.isin(scl_array, invalid_classes)
    else:
        valid_mask = np.ones(red_array.shape, dtype=bool)

    valid_mask &= (red_array > 0) & (nir_array > 0) & (green_array > 0)
    
    red_f = red_array.astype(float)
    nir_f = nir_array.astype(float)
    green_f = green_array.astype(float)
    
    with np.errstate(divide='ignore', invalid='ignore'):
        ndvi = (nir_f - red_f) / (nir_f + red_f)
        ndwi = (green_f - nir_f) / (green_f + nir_f)
        
    ndvi = np.where(valid_mask, ndvi, np.nan)
    ndwi = np.where(valid_mask, ndwi, np.nan)
    
    return ndvi, ndwi, valid_mask, red_meta

def run_change_analysis(baseline_id, comparison_id, lat, lon, job_id, update_progress):
    try:
        update_progress(10, 'Creating Common AOI (500m buffer)')
        aoi_polygon, utm_crs = create_aoi(lat, lon, 500)
        
        update_progress(20, 'Acquiring STAC Assets for Baseline')
        base_assets = get_stac_assets(baseline_id, lat, lon)
        
        update_progress(30, 'Processing Baseline 20m Raster')
        base_ndvi, base_ndwi, base_mask, meta = process_scene_data(base_assets, aoi_polygon, utm_crs)
        
        update_progress(50, 'Acquiring STAC Assets for Comparison')
        comp_assets = get_stac_assets(comparison_id, lat, lon)
        
        update_progress(60, 'Processing Comparison 20m Raster')
        comp_ndvi, comp_ndwi, comp_mask, _ = process_scene_data(comp_assets, aoi_polygon, utm_crs)
        
        update_progress(70, 'Calculating Pixel-wise Change')
        
        # We can only calculate change where BOTH dates are valid clouds/nodata
        common_valid = base_mask & comp_mask
        if not np.any(common_valid):
            raise Exception("Insufficient common cloud-free pixels between the two scenes.")
            
        ndvi_change = np.where(common_valid, comp_ndvi - base_ndvi, np.nan)
        ndwi_change = np.where(common_valid, comp_ndwi - base_ndwi, np.nan)
        
        pixel_area_ha = (20 * 20) / 10000.0
        
        def get_stats(ndvi, ndwi, valid):
            v_ndvi = ndvi[valid]
            v_ndwi = ndwi[valid]
            veg_pct = int(np.sum(v_ndvi >= 0.2)) / len(v_ndvi) * 100 if len(v_ndvi) > 0 else 0
            water_ha = int(np.sum(v_ndwi > 0)) * pixel_area_ha
            mean_n = float(np.nanmean(v_ndvi)) if len(v_ndvi) > 0 else 0
            return veg_pct, water_ha, mean_n

        base_veg_pct, base_water_ha, base_mean = get_stats(base_ndvi, base_ndwi, base_mask)
        comp_veg_pct, comp_water_ha, comp_mean = get_stats(comp_ndvi, comp_ndwi, comp_mask)
        
        # Spatial change analysis based on common pixels
        v_change = ndvi_change[common_valid]
        inc_ha = int(np.sum(v_change > 0.10)) * pixel_area_ha
        dec_ha = int(np.sum(v_change < -0.10)) * pixel_area_ha
        stable_ha = int(np.sum((v_change >= -0.10) & (v_change <= 0.10))) * pixel_area_ha
        
        update_progress(85, 'Writing Output GeoTIFFs')
        out_dir = os.path.join('static', 'satellite', 'change', job_id)
        os.makedirs(out_dir, exist_ok=True)
        
        meta.update({"dtype": "float32", "nodata": np.nan})
        
        for name, data in [('ndvi_baseline.tif', base_ndvi), 
                           ('ndvi_comparison.tif', comp_ndvi),
                           ('ndvi_change.tif', ndvi_change)]:
            with rasterio.open(os.path.join(out_dir, name), 'w', **meta) as dst:
                dst.write(data.astype(np.float32), 1)

        # PNG Previews
        plt.figure(figsize=(6,6))
        cmap = plt.cm.RdYlGn
        cmap.set_bad(color='black', alpha=0)
        plt.imshow(ndvi_change, cmap=cmap, vmin=-0.3, vmax=0.3)
        plt.axis('off')
        plt.savefig(os.path.join(out_dir, 'ndvi_change_preview.png'), bbox_inches='tight', pad_inches=0, transparent=True)
        plt.close()
        
        plt.figure(figsize=(6,6))
        plt.imshow(base_ndvi, cmap=cmap, vmin=-1, vmax=1)
        plt.axis('off')
        plt.savefig(os.path.join(out_dir, 'ndvi_baseline_preview.png'), bbox_inches='tight', pad_inches=0, transparent=True)
        plt.close()
        
        plt.figure(figsize=(6,6))
        plt.imshow(comp_ndvi, cmap=cmap, vmin=-1, vmax=1)
        plt.axis('off')
        plt.savefig(os.path.join(out_dir, 'ndvi_comparison_preview.png'), bbox_inches='tight', pad_inches=0, transparent=True)
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
            "baseline": {
                "scene_id": baseline_id,
                "date": base_assets['acquisition_date'],
                "cloud_cover": base_assets['cloud_cover'],
                "mean_ndvi": base_mean,
                "vegetation_percentage": base_veg_pct,
                "water_area_ha": base_water_ha
            },
            "comparison": {
                "scene_id": comparison_id,
                "date": comp_assets['acquisition_date'],
                "cloud_cover": comp_assets['cloud_cover'],
                "mean_ndvi": comp_mean,
                "vegetation_percentage": comp_veg_pct,
                "water_area_ha": comp_water_ha
            },
            "change": {
                "mean_ndvi_change": comp_mean - base_mean,
                "vegetation_change_percentage_points": comp_veg_pct - base_veg_pct,
                "water_area_change_ha": comp_water_ha - base_water_ha,
                "water_area_change_percent": ((comp_water_ha - base_water_ha) / base_water_ha * 100) if base_water_ha > 0 else 0,
                "vegetation_increase_area_ha": inc_ha,
                "vegetation_decrease_area_ha": dec_ha,
                "stable_area_ha": stable_ha
            },
            "bounds": [[wgs84_bounds[1], wgs84_bounds[0]], [wgs84_bounds[3], wgs84_bounds[2]]],
            "preview_urls": {
                "ndvi_change": f"/static/satellite/change/{job_id}/ndvi_change_preview.png",
                "ndvi_baseline": f"/static/satellite/change/{job_id}/ndvi_baseline_preview.png",
                "ndvi_comparison": f"/static/satellite/change/{job_id}/ndvi_comparison_preview.png"
            }
        }
        
        update_change_job_db(
            job_id,
            status='complete',
            progress=100,
            current_step='Complete',
            completed_at=datetime.utcnow().isoformat(),
            baseline_mean_ndvi=base_mean,
            comparison_mean_ndvi=comp_mean,
            mean_ndvi_change=comp_mean - base_mean,
            baseline_vegetation_percentage=base_veg_pct,
            comparison_vegetation_percentage=comp_veg_pct,
            vegetation_change_percentage_points=comp_veg_pct - base_veg_pct,
            baseline_water_area_ha=base_water_ha,
            comparison_water_area_ha=comp_water_ha,
            water_area_change_ha=comp_water_ha - base_water_ha,
            water_area_change_percent=result_payload['change']['water_area_change_percent'],
            vegetation_increase_area_ha=inc_ha,
            vegetation_decrease_area_ha=dec_ha,
            stable_area_ha=stable_ha,
            baseline_date=base_assets['acquisition_date'],
            comparison_date=comp_assets['acquisition_date'],
            baseline_cloud_cover=base_assets['cloud_cover'],
            comparison_cloud_cover=comp_assets['cloud_cover'],
            bounds=json.dumps(result_payload['bounds']),
            output_directory=out_dir
        )
        
        return result_payload
        
    except Exception as e:
        print(f"Change Analysis failed: {e}")
        update_change_job_db(job_id, status='failed', error_message=str(e), current_step='Failed')
        raise e

def start_change_analysis_job(baseline_id, comparison_id, lat, lon):
    job_id = str(uuid.uuid4())
    change_jobs[job_id] = {'status': 'queued', 'progress': 0, 'current_step': 'Initializing'}
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''INSERT INTO change_analysis_job 
            (id, baseline_scene_id, comparison_scene_id, latitude, longitude, status, progress, current_step, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (job_id, baseline_id, comparison_id, lat, lon, 'queued', 0, 'Initializing', datetime.utcnow().isoformat()))
        conn.commit()
    except Exception as e:
        print("DB Init Error:", e)
    finally:
        if 'conn' in locals():
            conn.close()
    
    def worker():
        try:
            def update_progress(p, step):
                change_jobs[job_id]['progress'] = p
                change_jobs[job_id]['current_step'] = step
                update_change_job_db(job_id, progress=p, current_step=step)
                
            result = run_change_analysis(baseline_id, comparison_id, float(lat), float(lon), job_id, update_progress)
            change_jobs[job_id]['status'] = 'complete'
            change_jobs[job_id]['result'] = result
        except Exception as e:
            change_jobs[job_id]['status'] = 'failed'
            change_jobs[job_id]['error_message'] = str(e)
            
    thread = threading.Thread(target=worker)
    thread.daemon = True
    thread.start()
    
    return job_id

from flask import Blueprint, request, jsonify
from flask_login import login_required

change_analysis_bp = Blueprint('change_analysis_bp', __name__)

@change_analysis_bp.route('/api/change-analysis/start', methods=['POST'])
@login_required
def start_change_analysis():
    data = request.json
    baseline_id = data.get('baseline_scene_id')
    comparison_id = data.get('comparison_scene_id')
    lat = data.get('lat')
    lng = data.get('lng')
    job_id = start_change_analysis_job(baseline_id, comparison_id, lat, lng)
    return jsonify({'job_id': job_id})

@change_analysis_bp.route('/api/change-analysis/<job_id>/status', methods=['GET'])
@login_required
def change_analysis_status(job_id):
    status = get_change_job_status(job_id)
    if not status:
        return jsonify({'status': 'not_found'}), 404
    return jsonify(status)

@change_analysis_bp.route('/api/change-analysis/<job_id>/results', methods=['GET'])
@login_required
def change_analysis_results(job_id):
    status = get_change_job_status(job_id)
    if status and status.get('status') == 'complete':
        return jsonify(status.get('result'))
    return jsonify({'error': 'Results not ready'}), 400
