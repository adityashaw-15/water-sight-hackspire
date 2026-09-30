import sqlite3, requests, urllib3
from concurrent.futures import ThreadPoolExecutor
urllib3.disable_warnings()

DB_PATH = 'backend/watersight_ingest.db'
conn = sqlite3.connect(DB_PATH)
districts = conn.execute("SELECT state_code, dist_code FROM districts").fetchall()
conn.close()

def fetch_projects(d):
    sc, dc = d
    for _ in range(3):
        try:
            r = requests.post(f'https://bhuvan-app1.nrsc.gov.in/wdc2.0/php/get_projects.php?state_code={sc}&dist_code={dc}', verify=False, timeout=5)
            if r.status_code == 200:
                data = r.json()
                projs = [(p['project_code'], p['project_name'], sc, dc) for p in data if p.get('project_code') != 'All']
                return projs
        except:
            pass
    return []

print(f"Fetching projects for {len(districts)} districts...")
all_projects = []
with ThreadPoolExecutor(max_workers=5) as executor:
    for res in executor.map(fetch_projects, districts):
        all_projects.extend(res)

print(f"Found {len(all_projects)} projects. Saving to DB...")
conn = sqlite3.connect(DB_PATH)
conn.execute("BEGIN TRANSACTION")
conn.executemany("INSERT OR REPLACE INTO projects (project_code, project_name, state_code, dist_code) VALUES (?, ?, ?, ?)", all_projects)
conn.commit()
conn.close()
print("Done!")
