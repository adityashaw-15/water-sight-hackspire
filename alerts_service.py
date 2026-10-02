import requests
import json
import urllib3
from flask import Blueprint, jsonify, request
from datetime import datetime

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

alerts_bp = Blueprint('alerts_bp', __name__)

NDMA_URL = 'https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails'
CACHE = {'data': [], 'last_updated': None}

def fetch_ndma_alerts():
    try:
        response = requests.get(NDMA_URL, verify=False, timeout=10)
        response.raise_for_status()
        data = response.json()
        CACHE['data'] = data
        CACHE['last_updated'] = datetime.utcnow()
        return data, True
    except Exception as e:
        print(f"Error fetching NDMA alerts: {e}")
        return CACHE['data'], False

@alerts_bp.route('/api/alerts', methods=['GET'])
def get_alerts():
    state = request.args.get('state', '').lower()
    district = request.args.get('district', '').lower()
    
    # Simple caching (refresh if older than 5 minutes or empty)
    if not CACHE['data'] or (datetime.utcnow() - CACHE['last_updated']).total_seconds() > 300:
        alerts, is_live = fetch_ndma_alerts()
    else:
        alerts = CACHE['data']
        is_live = False

    filtered_alerts = []
    
    for alert in alerts:
        area = str(alert.get('area_description', '')).lower()
        msg = str(alert.get('warning_message', '')).lower()
        
        # If filtering is requested, apply simple text match
        if state and state not in area and state not in msg:
            continue
        if district and district not in area and district not in msg:
            continue
            
        filtered_alerts.append({
            'id': alert.get('identifier', ''),
            'severity': alert.get('severity', 'INFO'),
            'title': alert.get('disaster_type', 'Alert'),
            'description': alert.get('warning_message', ''),
            'location': alert.get('area_description', ''),
            'confidence': alert.get('severity_level', ''),
            'time': alert.get('effective_start_time', ''),
            'valid_until': alert.get('effective_end_time', ''),
            'source': alert.get('alert_source', 'NDMA SACHET'),
            'color': alert.get('severity_color', 'blue'),
            'centroid': alert.get('centroid', '')
        })
        
    return jsonify({
        'status': 'success',
        'is_live': is_live,
        'count': len(filtered_alerts),
        'alerts': filtered_alerts,
        'summary': {
            'active': len(filtered_alerts),
            'high_priority': sum(1 for a in filtered_alerts if a['severity'] in ['SEVERE', 'WARNING', 'ALERT']),
            'flash_flood': sum(1 for a in filtered_alerts if 'flood' in a['title'].lower()),
            'heavy_rainfall': sum(1 for a in filtered_alerts if 'rain' in a['title'].lower()),
            'drought': sum(1 for a in filtered_alerts if 'drought' in a['title'].lower())
        }
    })
