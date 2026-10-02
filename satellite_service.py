import requests
import json
from datetime import datetime, timezone
import planetary_computer as pc

PC_STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1/search"

def search_satellite_scenes(lat, lon, start_date, end_date, max_cloud_cover=20, source="Sentinel-2"):
    try:
        buffer = 0.05
        bbox = [lon - buffer, lat - buffer, lon + buffer, lat + buffer]

        if len(start_date) == 10:
            start_date = f"{start_date}T00:00:00Z"
        if len(end_date) == 10:
            end_date = f"{end_date}T23:59:59Z"

        collection = "sentinel-2-l2a"
        satellite_name = "Sentinel-2"
        resolution = 10
        if "Landsat" in source:
            collection = "landsat-c2-l2"
            satellite_name = "Landsat 8/9"
            resolution = 30

        payload = {
            "collections": [collection],
            "bbox": bbox,
            "datetime": f"{start_date}/{end_date}",
            "limit": 10,
            "query": {
                "eo:cloud_cover": {"lte": max_cloud_cover}
            }
        }

        response = requests.post(PC_STAC_URL, json=payload)
        response.raise_for_status()
        data = response.json()

        scenes = []
        for feature in data.get('features', []):
            props = feature.get('properties', {})
            cloud_cover = props.get('eo:cloud_cover', 100)
            
            if cloud_cover > max_cloud_cover:
                continue
                
            assets = feature.get('assets', {})
            
            thumbnail = None
            if 'rendered_preview' in assets:
                thumbnail = assets['rendered_preview'].get('href')
                thumbnail = pc.sign(thumbnail)

            scenes.append({
                "id": feature['id'],
                "collection": collection,
                "satellite": satellite_name,
                "product": "Level-2",
                "acquisition_date": props.get('datetime'),
                "cloud_cover": round(cloud_cover, 2),
                "resolution_m": resolution,
                "geometry": feature.get('geometry'),
                "bbox": feature.get('bbox'),
                "thumbnail": thumbnail,
                "source": "Microsoft Planetary Computer",
                "available_assets": list(assets.keys())
            })
            
        return scenes
    except Exception as e:
        print(f"STAC Search Error: {e}")
        return []
