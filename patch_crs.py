with open('analysis_service.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re

new_process_band = """def process_band(band_url, aoi_wgs84_polygon, target_crs=None, target_res=20):
    '''
    Reads a STAC asset URL (COG), masks it using the AOI, and resamples to target resolution (20m).
    '''
    with rasterio.open(band_url) as src:
        # Project AOI to raster CRS
        gdf_wgs84 = gpd.GeoDataFrame(geometry=[aoi_wgs84_polygon], crs="EPSG:4326")
        gdf_raster_crs = gdf_wgs84.to_crs(src.crs)
        geojson_polygon = json.loads(gdf_raster_crs.to_json())['features'][0]['geometry']
        
        # Crop to AOI in native CRS
        try:
            out_image, out_transform = mask(src, [geojson_polygon], crop=True)
            out_meta = src.meta.copy()"""

text = re.sub(r'def process_band\(band_url, geojson_polygon, target_crs=None, target_res=20\):[\s\S]*?out_meta = src\.meta\.copy\(\)', new_process_band, text)

# update run_satellite_analysis to pass aoi_polygon instead of geojson_polygon
text = text.replace(
    '''red_array, red_meta = process_band(assets['B04'], geojson_polygon, target_crs=utm_crs, target_res=20)''',
    '''red_array, red_meta = process_band(assets['B04'], aoi_polygon, target_crs=utm_crs, target_res=20)'''
)
text = text.replace(
    '''nir_array, nir_meta = process_band(assets['B08'], geojson_polygon, target_crs=utm_crs, target_res=20)''',
    '''nir_array, nir_meta = process_band(assets['B08'], aoi_polygon, target_crs=utm_crs, target_res=20)'''
)

with open('analysis_service.py', 'w', encoding='utf-8') as f:
    f.write(text)
