import requests
import sqlite3
import json
import urllib3
urllib3.disable_warnings()

DB_PATH = 'backend/watersight_ingest.db'
states = ['BIHAR', 'RAJASTHAN', 'KARNATAKA', 'GUJARAT', 'ASSAM', 'ODISHA', 'UTTAR PRADESH', 'TAMIL NADU']

def fetch_fast():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    for state in states:
        print(f"Trying to get 1 quick geotag for {state}...")
        jobs = conn.execute("SELECT url FROM crawl_jobs WHERE type='geotag' AND state_name=? AND status='pending' LIMIT 50", (state,)).fetchall()
        
        success = False
        for job in jobs:
            if success: break
            sno = job['url'].split(':')[1]
            try:
                r = requests.post('https://bhuvan-app1.nrsc.gov.in/wdc2.0/php/get_geotag.php', json={"collection_sno": sno}, verify=False, timeout=3)
                data = r.json()
                if isinstance(data, list) and len(data) > 0:
                    for feature in data:
                        props = feature.get('properties', {})
                        w_code = props.get('work_serial_code')
                        if w_code:
                            conn.execute("""INSERT OR REPLACE INTO geotags 
                                          (work_serial_code, state_name, district_name, project_name, activity_description, geometry, full_json)
                                          VALUES (?, ?, ?, ?, ?, ?, ?)""",
                                          (w_code, props.get('state_name'), props.get('district_name'), props.get('project_name'),
                                           props.get('activity_description'), json.dumps(feature.get('geometry')), json.dumps(feature)))
                    conn.commit()
                    print(f"  -> SUCCESS for {state}: sno {sno}")
                    success = True
            except:
                pass
        if not success:
            print(f"  -> Failed to get quick geotag for {state}")
            
    conn.close()

if __name__ == '__main__':
    fetch_fast()
