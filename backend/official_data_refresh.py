import sqlite3
import requests
import urllib3
import time
from datetime import datetime
import os
from concurrent.futures import ThreadPoolExecutor

urllib3.disable_warnings()

DB_PATH = 'backend/watersight_ingest.db'

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''CREATE TABLE IF NOT EXISTS states (state_code TEXT PRIMARY KEY, state_name TEXT)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS districts (dist_code TEXT PRIMARY KEY, dist_name TEXT, state_code TEXT)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS projects (project_code TEXT PRIMARY KEY, project_name TEXT, state_code TEXT, dist_code TEXT)''')
    conn.execute('''CREATE TABLE IF NOT EXISTS sync_status (type TEXT PRIMARY KEY, last_sync TEXT, status TEXT, message TEXT)''')
    conn.commit()
    conn.close()

def update_sync_status(sync_type, status, message=""):
    conn = sqlite3.connect(DB_PATH)
    last_sync = datetime.now().isoformat()
    conn.execute("INSERT OR REPLACE INTO sync_status (type, last_sync, status, message) VALUES (?, ?, ?, ?)", (sync_type, last_sync, status, message))
    conn.commit()
    conn.close()

def fetch_districts(sc):
    try:
        dr = requests.post(f'https://bhuvan-app1.nrsc.gov.in/wdc2.0/php/get_districts.php?state_code={sc}', verify=False, timeout=5)
        return sc, dr.json()
    except:
        return sc, []
        
def fetch_projects(args):
    sc, dc = args
    try:
        pr = requests.post(f'https://bhuvan-app1.nrsc.gov.in/wdc2.0/php/get_projects.php?state_code={sc}&dist_code={dc}', verify=False, timeout=5)
        return sc, dc, pr.json()
    except:
        return sc, dc, []

def refresh_administrative():
    print("[ADMIN] refresh started")
    try:
        r = requests.post('https://bhuvan-app1.nrsc.gov.in/wdc2.0/php/get_states.php', verify=False, timeout=10)
        states = r.json()
        if not isinstance(states, list) or len(states) < 10:
            raise Exception("Invalid states response")
        
        conn = sqlite3.connect(DB_PATH)
        conn.execute("BEGIN TRANSACTION")
        
        for st in states:
            if st.get('state_code') != 'All':
                conn.execute("INSERT OR REPLACE INTO states (state_code, state_name) VALUES (?, ?)", (st['state_code'], st['state_name']))
                
        state_codes = [s['state_code'] for s in states if s.get('state_code') != 'All']
        total_districts = 0
        
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = executor.map(fetch_districts, state_codes)
            for sc, dists in results:
                for d in dists:
                    if d.get('dist_code') != 'All':
                        conn.execute("INSERT OR REPLACE INTO districts (dist_code, dist_name, state_code) VALUES (?, ?, ?)", (d['dist_code'], d['dist_name'], sc))
                        total_districts += 1
                        
        conn.commit()
        conn.close()
        print(f"[ADMIN] refresh successful (states: {len(state_codes)}, districts: {total_districts})")
        update_sync_status('administrative', 'success', 'Cached Official Data')
    except Exception as e:
        print(f"[ADMIN] refresh failed, using cache: {e}")
        update_sync_status('administrative', 'error', str(e))

def refresh_projects():
    print("[WDC] refresh started")
    try:
        conn = sqlite3.connect(DB_PATH)
        districts = conn.execute("SELECT dist_code, state_code FROM districts").fetchall()
        
        total_projects = 0
        projects_to_insert = []
        
        args = [(d[1], d[0]) for d in districts]
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = executor.map(fetch_projects, args)
            for sc, dc, projs in results:
                for p in projs:
                    if p.get('project_code') != 'All':
                        projects_to_insert.append((p['project_code'], p['project_name'], sc, dc))
                        total_projects += 1
                        
        conn.execute("BEGIN TRANSACTION")
        conn.executemany("INSERT OR REPLACE INTO projects (project_code, project_name, state_code, dist_code) VALUES (?, ?, ?, ?)", projects_to_insert)
        conn.commit()
        conn.close()
        print(f"[WDC] refresh successful ({total_projects} projects)")
        update_sync_status('wdc', 'success', 'Cached Official Data')
    except Exception as e:
        print(f"[WDC] refresh failed, using cache: {e}")
        update_sync_status('wdc', 'error', str(e))

if __name__ == '__main__':
    init_db()
    refresh_administrative()
    refresh_projects()
