with open('analysis_service.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re

new_return = """        bounds = list(rasterio.transform.array_bounds(ndvi_meta['height'], ndvi_meta['width'], ndvi_meta['transform']))
        import pyproj
        from shapely.ops import transform as shapely_transform
        from shapely.geometry import box
        utm_box = box(*bounds)
        project = pyproj.Transformer.from_crs(utm_crs, "EPSG:4326", always_xy=True).transform
        wgs84_box = shapely_transform(project, utm_box)
        wgs84_bounds = list(wgs84_box.bounds)
        
        return {
            "scene_id": scene_id,
            "acquisition_date": assets['acquisition_date'],
            "cloud_cover": assets['cloud_cover'],
            "source": "Copernicus Data Space Ecosystem (via PC)",
            "product": "L2A",
            "statistics": stats,
            "preview_url": f"/static/satellite/processed/{job_id}/ndvi_preview.png",
            "bounds": [[wgs84_bounds[1], wgs84_bounds[0]], [wgs84_bounds[3], wgs84_bounds[2]]]
        }"""

text = re.sub(r'        return \{\n\s*"scene_id": scene_id,[\s\S]*?"preview_url": f"/static/satellite/processed/\{job_id\}/ndvi_preview\.png"\n\s*\}', new_return, text)

with open('analysis_service.py', 'w', encoding='utf-8') as f:
    f.write(text)
