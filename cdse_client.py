import os
import time
import requests
import base64
from typing import Dict, Any

CDSE_TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
CDSE_PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process"

_cached_token = None
_token_expiry = 0

def get_cdse_access_token() -> str:
    global _cached_token, _token_expiry
    
    # Check if cached token is still valid (with 60s buffer)
    if _cached_token and time.time() < (_token_expiry - 60):
        return _cached_token
        
    client_id = os.environ.get("CDSE_CLIENT_ID")
    client_secret = os.environ.get("CDSE_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        raise ValueError("CDSE_CLIENT_ID or CDSE_CLIENT_SECRET is not configured in the environment.")
        
    data = {
        "grant_type": "client_credentials"
    }
    
    # Basic Auth header for client credentials
    auth_str = f"{client_id}:{client_secret}"
    b64_auth = base64.b64encode(auth_str.encode('ascii')).decode('ascii')
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": f"Basic {b64_auth}"
    }
    
    try:
        response = requests.post(CDSE_TOKEN_URL, data=data, headers=headers, timeout=10)
        response.raise_for_status()
        token_data = response.json()
        
        _cached_token = token_data.get("access_token")
        # Expires_in is in seconds
        expires_in = token_data.get("expires_in", 3600)
        _token_expiry = time.time() + expires_in
        
        return _cached_token
    except requests.exceptions.HTTPError as e:
        if response.status_code == 401:
            raise ValueError("Authentication failed: Invalid CDSE credentials.")
        raise Exception(f"CDSE Authentication API Error: {response.text}")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Failed to connect to CDSE authentication service: {str(e)}")

def fetch_sentinel2_process_api(bbox: list, date_start: str, date_end: str, out_path: str):
    """
    Calls CDSE Process API to get B04 (Red) and B08 (NIR) as a multi-band GeoTIFF.
    bbox: [min_lon, min_lat, max_lon, max_lat]
    """
    token = get_cdse_access_token()
    
    evalscript = """
    //VERSION=3
    function setup() {
      return {
        input: ["B04", "B08", "dataMask"],
        output: { bands: 3, sampleType: "FLOAT32" }
      };
    }
    function evaluatePixel(sample) {
      return [sample.B04, sample.B08, sample.dataMask];
    }
    """
    
    request_data = {
        "input": {
            "bounds": {
                "bbox": bbox,
                "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"}
            },
            "data": [{
                "type": "sentinel-2-l2a",
                "dataFilter": {
                    "timeRange": {
                        "from": date_start,
                        "to": date_end
                    }
                }
            }]
        },
        "output": {
            "width": 512,
            "height": 512,
            "responses": [{
                "identifier": "default",
                "format": {"type": "image/tiff"}
            }]
        },
        "evalscript": evalscript
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "image/tiff"
    }
    
    response = requests.post(CDSE_PROCESS_URL, json=request_data, headers=headers, timeout=60)
    
    if response.status_code != 200:
        raise Exception(f"Process API failed ({response.status_code}): {response.text}")
        
    with open(out_path, 'wb') as f:
        f.write(response.content)
        
    return out_path
