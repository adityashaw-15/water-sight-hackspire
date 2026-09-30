import sqlite3
import json
from flask import Blueprint, jsonify, request
import os
import subprocess
from datetime import datetime

projects_bp = Blueprint('projects', __name__)
DB_PATH = 'backend/watersight_ingest.db'

def get_last_sync(sync_type):
    if not os.path.exists(DB_PATH):
        return None
    try:
        conn = sqlite3.connect(DB_PATH)
        row = conn.execute("SELECT last_sync, status, message FROM sync_status WHERE type=?", (sync_type,)).fetchone()
        conn.close()
        if row:
            return {"timestamp": row[0], "status": row[1], "message": row[2]}
    except Exception as e:
        pass
    return None

@projects_bp.route('/api/data/status', methods=['GET'])
def get_data_status():
    if not os.path.exists(DB_PATH):
        return jsonify({
            "administrative": {"cache_exists": False, "status": "Not Synchronized"},
            "wdc_pmsky": {"cache_exists": False, "status": "Not Synchronized"},
            "geotags": {"cache_exists": False, "status": "Not Synchronized"}
        })
    try:
        conn = sqlite3.connect(DB_PATH)
        
        # Admin stats
        st_count = conn.execute("SELECT count(*) FROM states").fetchone()[0]
        dist_count = conn.execute("SELECT count(*) FROM districts").fetchone()[0]
        admin_sync = get_last_sync('administrative')
        
        # WDC stats
        proj_count = conn.execute("SELECT count(*) FROM projects").fetchone()[0]
        wdc_sync = get_last_sync('wdc')
        
        # Geotag stats
        geo_count = conn.execute("SELECT count(*) FROM geotags").fetchone()[0]
        geo_states = conn.execute("SELECT count(DISTINCT state_name) FROM geotags").fetchone()[0]
        geo_dists = conn.execute("SELECT count(DISTINCT district_name) FROM geotags").fetchone()[0]
        
        conn.close()
        
        return jsonify({
            "administrative": {
                "state_count": st_count,
                "district_count": dist_count,
                "cache_exists": st_count > 0,
                "last_successful_sync": admin_sync['timestamp'] if admin_sync else None,
                "status": admin_sync['status'] if admin_sync else "unknown",
                "message": admin_sync['message'] if admin_sync else ""
            },
            "wdc_pmsky": {
                "project_count": proj_count,
                "cache_exists": proj_count > 0,
                "last_successful_sync": wdc_sync['timestamp'] if wdc_sync else None,
                "status": wdc_sync['status'] if wdc_sync else "unknown",
                "message": wdc_sync['message'] if wdc_sync else ""
            },
            "geotags": {
                "record_count": geo_count,
                "state_count": geo_states,
                "district_count": geo_dists,
                "last_successful_sync": wdc_sync['timestamp'] if wdc_sync else None,
                "status": wdc_sync['status'] if wdc_sync else "unknown"
            }
        })
    except Exception as e:
         return jsonify({"error": str(e)}), 500

@projects_bp.route('/api/data/refresh', methods=['POST'])
def refresh_data():
    # Trigger background refresh asynchronously
    try:
        # Check if already running by checking processes (simple approach, just start it)
        subprocess.Popen(["python", "backend/official_data_refresh.py"], close_fds=True)
        return jsonify({"status": "success", "message": "Background refresh started. This will not block the dashboard."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@projects_bp.route('/api/states', methods=['GET'])
def get_states():
    if not os.path.exists(DB_PATH):
        return jsonify({"status": "unavailable", "source": "official", "message": "Official dataset has not been synchronized yet."}), 503
        
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT state_code as id, state_name as name FROM states ORDER BY state_name").fetchall()
        conn.close()
        
        if not rows:
            return jsonify({"status": "unavailable", "source": "official", "message": "Official dataset has not been synchronized yet."}), 503
            
        sync_info = get_last_sync('administrative')
        status = "Cached Official Data"
        if sync_info and sync_info['status'] == 'error':
            status = "Temporarily offline — Using Official Cache"
            
        return jsonify({
            "status": "success",
            "source": "official-cache",
            "cache_status": "fresh" if (sync_info and sync_info['status'] == 'success') else "stale",
            "last_successful_sync": sync_info['timestamp'] if sync_info else "",
            "connection_status": status,
            "data": [dict(r) for r in rows]
        })
    except Exception as e:
        return jsonify({"status": "unavailable", "source": "official", "message": str(e)}), 503

@projects_bp.route('/api/states/<state_code>/districts', methods=['GET'])
def get_districts(state_code):
    if not os.path.exists(DB_PATH):
        return jsonify({"status": "unavailable", "source": "official", "message": "Official dataset has not been synchronized yet."}), 503
        
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT dist_code as id, dist_name as name FROM districts WHERE state_code=? ORDER BY dist_name", (state_code,)).fetchall()
        conn.close()
        
        if not rows:
            return jsonify({"status": "unavailable", "source": "official", "message": "Official dataset has not been synchronized yet."}), 503
            
        sync_info = get_last_sync('administrative')
        status = "Cached Official Data"
        if sync_info and sync_info['status'] == 'error':
            status = "Temporarily offline — Using Official Cache"
            
        return jsonify({
            "status": "success",
            "source": "official-cache",
            "cache_status": "fresh" if (sync_info and sync_info['status'] == 'success') else "stale",
            "last_successful_sync": sync_info['timestamp'] if sync_info else "",
            "connection_status": status,
            "data": [dict(r) for r in rows]
        })
    except Exception as e:
        return jsonify({"status": "unavailable", "source": "official", "message": str(e)}), 503

@projects_bp.route('/api/projects', methods=['GET'])
def get_projects():
    scope = request.args.get('scope', 'india')
    state = request.args.get('state')
    district = request.args.get('district')
    
    if not os.path.exists(DB_PATH):
        return jsonify({"status": "unavailable", "source": "official", "message": "Official dataset has not been synchronized yet."}), 503
        
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        
        if district:
            rows = conn.execute("SELECT project_code as id, project_name as name, state_code as state, dist_code as district FROM projects WHERE dist_code=?", (district,)).fetchall()
        elif state:
            rows = conn.execute("SELECT project_code as id, project_name as name, state_code as state, dist_code as district FROM projects WHERE state_code=?", (state,)).fetchall()
        else:
            rows = conn.execute("SELECT project_code as id, project_name as name, state_code as state, dist_code as district FROM projects").fetchall()
        
        # Hydrate with spatial status
        hydrated_rows = []
        for r in rows:
            d = dict(r)
            count = conn.execute("SELECT COUNT(*) FROM geotags WHERE project_name=?", (d['name'],)).fetchone()[0]
            d['project_status'] = 'official'
            d['spatial_status'] = 'verified' if count > 0 else 'not_available'
            d['geotag_count'] = count
            hydrated_rows.append(d)
            
        # Get state summary for the dashboard
        if not state and not district:
            state_counts = conn.execute("SELECT state_code as name, COUNT(*) as count FROM projects GROUP BY state_code").fetchall()
            states_summary = [dict(s) for s in state_counts]
        else:
            states_summary = []
            
        conn.close()
        
        sync_info = get_last_sync('wdc')
        status = "Cached Official Data"
        if sync_info and sync_info['status'] == 'error':
            status = "Temporarily offline — Using Official Cache"
            
        filtered_projects = hydrated_rows
        
        return jsonify({
            "status": "success",
            "source": "official-cache",
            "cache_status": "fresh" if (sync_info and sync_info['status'] == 'success') else "stale",
            "last_successful_sync": sync_info['timestamp'] if sync_info else "",
            "connection_status": status,
            "scope": "state" if state else scope,
            "total_projects": len(filtered_projects),
            "states": states_summary,
            "projects": filtered_projects,
            "verified_geometries": 0
        })
    except Exception as e:
        return jsonify({"status": "unavailable", "source": "official", "message": str(e)}), 503

@projects_bp.route('/api/projects/geotagged', methods=['GET'])
def get_geotagged():
    scope = request.args.get('scope', 'india')
    state = request.args.get('state')
    
    project_id = request.args.get('project_id')

    unique_geotags = []
    if os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        
        if project_id:
            proj_row = conn.execute("SELECT project_name FROM projects WHERE project_code=?", (project_id,)).fetchone()
            if proj_row:
                rows = conn.execute("SELECT full_json FROM geotags WHERE project_name=?", (proj_row['project_name'],)).fetchall()
            else:
                rows = []
        elif state:
            rows = conn.execute("SELECT full_json FROM geotags WHERE LOWER(state_name)=?", (state.lower(),)).fetchall()
        else:
            rows = conn.execute("SELECT full_json FROM geotags").fetchall()
            
        unique_geotags = [json.loads(row['full_json']) for row in rows]
        
        # Deduplicate
        unique_dict = {}
        for g in unique_geotags:
            code = g.get('properties', {}).get('work_serial_code')
            if code:
                unique_dict[code] = g
        unique_geotags = list(unique_dict.values())
        conn.close()
        
    states_rep = len(set(g['properties']['state_name'] for g in unique_geotags))
    districts_rep = len(set(g['properties']['district_name'] for g in unique_geotags))
    
    photo_count = 0
    for g in unique_geotags:
        props = g.get('properties', {})
        for i in range(1, 5):
            if props.get(f'photo{i}_name'):
                photo_count += 1
                
    return jsonify({
        "scope": scope,
        "total_projects": 1221,
        "total_spatial_records": len(unique_geotags),
        "states_represented": states_rep,
        "districts_represented": districts_rep,
        "features": list(unique_geotags),
        "photo_count": photo_count
    })

import requests
from io import BytesIO
from flask import send_file

@projects_bp.route('/api/projects/geotagged/<int:collection_sno>/photos', methods=['GET'])
def get_geotag_photos(collection_sno):
    if not os.path.exists(DB_PATH):
        return jsonify({"photos": [], "available": False, "message": "No official photograph available for this geotag."})
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT full_json FROM geotags WHERE json_extract(full_json, '$.properties.collection_sno') = ?", (collection_sno,)).fetchone()
    conn.close()
    
    if not row:
        return jsonify({"photos": [], "available": False, "message": "No official photograph available for this geotag."})
        
    props = json.loads(row['full_json']).get('properties', {})
    photos = []
    
    for i in range(1, 5):
        pname = props.get(f'photo{i}_name')
        if pname:
            photos.append({
                "url": f"/api/projects/geotagged/{collection_sno}/photo/{i}",
                "thumbnail_url": f"/api/projects/geotagged/{collection_sno}/photo/{i}",
                "type": "official",
                "filename": pname,
                "available": True,
                "date": props.get('server_time'),
                "stage": props.get('stage')
            })
            
    if not photos:
        return jsonify({"photos": [], "available": False, "message": "No official photograph available for this geotag."})
        
    return jsonify({
        "collection_sno": str(collection_sno),
        "source": "DoLR / NRSC Bhuvan",
        "photos": photos
    })

@projects_bp.route('/api/projects/geotagged/<int:collection_sno>/photo/<int:photo_id>', methods=['GET'])
def proxy_photo(collection_sno, photo_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT full_json FROM geotags WHERE json_extract(full_json, '$.properties.collection_sno') = ?", (collection_sno,)).fetchone()
    conn.close()
    
    if not row:
        return "Not found", 404
        
    props = json.loads(row['full_json']).get('properties', {})
    uri = props.get('uri')
    pname = props.get(f'photo{photo_id}_name')
    
    if not uri or not pname:
        return "Photo not available", 404
        
    bhuvan_url = f"https://bhuvan-fdc1.nrsc.gov.in/wdc_fdc/upload_poly/photos_comp2/{uri}/{pname}"
    
    try:
        import urllib3
        urllib3.disable_warnings()
        r = requests.get(bhuvan_url, verify=False, timeout=10)
        if r.status_code == 200:
            return send_file(BytesIO(r.content), mimetype=r.headers.get('Content-Type', 'image/jpeg'))
        else:
            return "Official photograph could not be retrieved from Bhuvan at this time.", 502
    except Exception as e:
        return "Official photograph could not be retrieved from Bhuvan at this time.", 502

@projects_bp.route('/api/bounds', methods=['GET'])
def get_bounds():
    state_id = request.args.get('state_code')
    dist_id = request.args.get('dist_code')
    if not state_id:
        return jsonify({"error": "state_code required"}), 400
    
    conn = sqlite3.connect(DB_PATH)
    conn.execute('CREATE TABLE IF NOT EXISTS bounds_cache (query TEXT PRIMARY KEY, bounds TEXT)')
    
    state_row = conn.execute("SELECT state_name FROM states WHERE state_code=?", (state_id,)).fetchone()
    if not state_row:
        conn.close()
        return jsonify({"error": "state not found"}), 404
    
    query = f"{state_row[0]}, India"
    
    if dist_id:
        dist_row = conn.execute("SELECT dist_name FROM districts WHERE dist_code=?", (dist_id,)).fetchone()
        if dist_row:
            query = f"{dist_row[0]}, {state_row[0]}, India"
            
    cache_row = conn.execute("SELECT bounds FROM bounds_cache WHERE query=?", (query,)).fetchone()
    if cache_row:
        conn.close()
        return jsonify({"bounds": json.loads(cache_row[0])})
        
    import requests
    headers = {'User-Agent': 'Watersight/1.0'}
    r = requests.get(f'https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1', headers=headers)
    bounds = None
    if r.status_code == 200 and r.json():
        b = r.json()[0]['boundingbox']
        bounds = [[float(b[0]), float(b[2])], [float(b[1]), float(b[3])]]
        conn.execute("INSERT OR REPLACE INTO bounds_cache (query, bounds) VALUES (?, ?)", (query, json.dumps(bounds)))
        conn.commit()
    conn.close()
    
    if bounds:
        return jsonify({"bounds": bounds})
    return jsonify({"error": "bounds not found"}), 404

@projects_bp.route('/api/projects/<project_id>/photos', methods=['GET'])
def get_project_photos_list(project_id):
    if not os.path.exists(DB_PATH):
        return jsonify({"photos": [], "total_photos": 0, "total_locations": 0})
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    proj_row = conn.execute("SELECT project_name FROM projects WHERE project_code=?", (project_id,)).fetchone()
    if not proj_row:
        conn.close()
        return jsonify({"photos": [], "total_photos": 0, "total_locations": 0})
        
    rows = conn.execute("SELECT full_json FROM geotags WHERE project_name=?", (proj_row['project_name'],)).fetchall()
    conn.close()
    
    unique_dict = {}
    for r in rows:
        g = json.loads(r['full_json'])
        code = g.get('properties', {}).get('work_serial_code')
        if code:
            unique_dict[code] = g
            
    geotags = list(unique_dict.values())
    
    photos = []
    locations_with_photos = set()
    
    for g in geotags:
        props = g.get('properties', {})
        geom = g.get('geometry', {})
        coords = geom.get('coordinates', [0, 0]) if geom else [0, 0]
        sno = props.get('collection_sno')
        has_photo = False
        
        for i in range(1, 5):
            pname = props.get(f'photo{i}_name')
            if pname and sno:
                has_photo = True
                photos.append({
                    "collection_sno": str(sno),
                    "work_code": props.get('work_serial_code'),
                    "activity": props.get('activity_description'),
                    "latitude": coords[1],
                    "longitude": coords[0],
                    "image_url": f"/api/projects/geotagged/{sno}/photo/{i}",
                    "thumbnail_url": f"/api/projects/geotagged/{sno}/photo/{i}",
                    "photo_date": props.get('server_time'),
                    "stage": props.get('stage'),
                    "source": "DoLR / NRSC Bhuvan"
                })
        if has_photo:
            locations_with_photos.add(sno)
            
    return jsonify({
        "project_id": project_id,
        "project_name": proj_row['project_name'],
        "source": "DoLR / NRSC Bhuvan",
        "total_photos": len(photos),
        "total_locations": len(locations_with_photos),
        "photos": photos
    })
