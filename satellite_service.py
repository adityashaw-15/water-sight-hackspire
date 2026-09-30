import requests
import json
from datetime import datetime, timezone

CDSE_STAC_URL = "https://stac.dataspace.copernicus.eu/v1/search"

def search_satellite_scenes(lat, lon, start_date, end_date, max_cloud_cover=20):
    try:
        buffer = 0.05
        bbox = [lon - buffer, lat - buffer, lon + buffer, lat + buffer]

        # Ensure RFC3339 datetime format for CDSE
        if len(start_date) == 10:
            start_date = f"{start_date}T00:00:00Z"
        if len(end_date) == 10:
            end_date = f"{end_date}T23:59:59Z"

        payload = {
            "collections": ["sentinel-2-l2a"],
            "bbox": bbox,
            "datetime": f"{start_date}/{end_date}",
            "limit": 10
        }

        response = requests.post(CDSE_STAC_URL, json=payload)
        response.raise_for_status()
        data = response.json()

        scenes = []
        for feature in data.get('features', []):
            props = feature.get('properties', {})
            cloud_cover = props.get('eo:cloud_cover', 100)
            
            if cloud_cover > max_cloud_cover:
                continue
                
            assets = feature.get('assets', {})
            
            # CDSE Thumbnail (if available) or fallback
            thumbnail = None
            if 'thumbnail' in assets:
                thumbnail = assets['thumbnail'].get('href')

            scenes.append({
                "id": feature['id'],
                "collection": feature.get('collection', 'sentinel-2-l2a'),
                "satellite": "Sentinel-2",
                "product": props.get('processing:level', 'Level-2A'),
                "acquisition_date": props.get('datetime'),
                "cloud_cover": round(cloud_cover, 2),
                "resolution_m": props.get('gsd', 10),
                "geometry": feature.get('geometry'),
                "bbox": feature.get('bbox'),
                "thumbnail": thumbnail,
                "source": "Copernicus Data Space Ecosystem",
                "available_assets": list(assets.keys())
            })
            
        return scenes
    except Exception as e:
        print(f"STAC Search Error: {e}")
        return []
