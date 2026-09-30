import requests
import re
import sqlite3
import time
import json
import logging
import urllib3
import random
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

DB_PATH = 'backend/watersight_ingest.db'

STATES_TO_CRAWL = {
    'WEST BENGAL': '19',
    'MAHARASHTRA': '27',
    'BIHAR': '10',
    'RAJASTHAN': '8',
    'KARNATAKA': '29',
    'ASSAM': '18',
    'GUJARAT': '24',
    'ODISHA': '21',
    'TAMIL NADU': '33',
    'UTTAR PRADESH': '9'
}

MAX_CONCURRENCY = 10
REQUEST_DELAY = (0, 0.5)
MAX_RETRIES = 2
TIMEOUT = 10

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row
    return conn

def setup_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS crawl_jobs (
        url TEXT PRIMARY KEY,
        type TEXT,
        parent_url TEXT,
        state_name TEXT,
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        last_attempt TIMESTAMP,
        error TEXT,
        data TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS geotags (
        work_serial_code TEXT PRIMARY KEY,
        state_name TEXT,
        district_name TEXT,
        project_name TEXT,
        activity_description TEXT,
        geometry TEXT,
        full_json TEXT
    )''')
    conn.commit()
    conn.close()

def add_job(url, job_type, parent_url, state_name):
    conn = get_db()
    try:
        conn.execute("INSERT OR IGNORE INTO crawl_jobs (url, type, parent_url, state_name) VALUES (?, ?, ?, ?)",
                     (url, job_type, parent_url, state_name))
        conn.commit()
    finally:
        conn.close()

def update_job_status(url, status, error=None, data=None):
    conn = get_db()
    try:
        conn.execute("UPDATE crawl_jobs SET status=?, error=?, data=?, last_attempt=CURRENT_TIMESTAMP, retry_count=retry_count+1 WHERE url=?",
                     (status, str(error) if error else None, data, url))
        conn.commit()
    finally:
        conn.close()

def get_pending_jobs(job_type, limit=10, state_filter=None):
    conn = get_db()
    try:
        if state_filter:
            jobs = conn.execute("SELECT * FROM crawl_jobs WHERE type=? AND status IN ('pending', 'timeout', 'failed') AND retry_count < ? AND state_name=? ORDER BY RANDOM() LIMIT ?", 
                               (job_type, MAX_RETRIES, state_filter, limit)).fetchall()
        else:
            jobs = conn.execute("SELECT * FROM crawl_jobs WHERE type=? AND status IN ('pending', 'timeout', 'failed') AND retry_count < ? ORDER BY RANDOM() LIMIT ?", 
                               (job_type, MAX_RETRIES, limit)).fetchall()
        return [dict(j) for j in jobs]
    finally:
        conn.close()

def fetch_with_backoff(url, method='GET', json_data=None):
    time.sleep(random.uniform(*REQUEST_DELAY))
    try:
        if method == 'GET':
            r = requests.get(url, verify=False, timeout=TIMEOUT)
        else:
            r = requests.post(url, json=json_data, verify=False, timeout=TIMEOUT)
        r.raise_for_status()
        return r
    except requests.exceptions.Timeout:
        raise TimeoutError("Read timed out")
    except Exception as e:
        raise e

def process_state(job):
    try:
        r = fetch_with_backoff(job['url'])
        soup = BeautifulSoup(r.text, 'html.parser')
        d_links = [a.get('href') for a in soup.find_all('a') if a.get('href') and 'getProjWiseAssetGeoData' in a.get('href')]
        if not d_links:
            update_job_status(job['url'], 'empty')
            return
        
        for link in d_links:
            add_job('https://wdcpmksy.dolr.gov.in/' + link, 'district', job['url'], job['state_name'])
        update_job_status(job['url'], 'success')
    except TimeoutError as e:
        update_job_status(job['url'], 'timeout', e)
    except Exception as e:
        update_job_status(job['url'], 'failed', e)

def process_district(job):
    try:
        r = fetch_with_backoff(job['url'])
        soup = BeautifulSoup(r.text, 'html.parser')
        p_links = [a.get('href') for a in soup.find_all('a') if a.get('href') and 'getProjDtlAssetGeoData' in a.get('href')]
        if not p_links:
            update_job_status(job['url'], 'empty')
            return
            
        for link in p_links:
            add_job('https://wdcpmksy.dolr.gov.in/' + link, 'project', job['url'], job['state_name'])
        update_job_status(job['url'], 'success')
    except TimeoutError as e:
        update_job_status(job['url'], 'timeout', e)
    except Exception as e:
        update_job_status(job['url'], 'failed', e)

def process_project(job):
    try:
        r = fetch_with_backoff(job['url'])
        soup = BeautifulSoup(r.text, 'html.parser')
        snos = set()
        for a in soup.find_all('a'):
            href = a.get('href')
            if href and 'collection_sno' in href:
                m = re.search(r'collection_sno=(\d+)', href)
                if m: snos.add(m.group(1))
        
        if not snos:
            update_job_status(job['url'], 'empty')
            return
            
        for sno in snos:
            add_job(f"sno:{sno}", 'geotag', job['url'], job['state_name'])
        update_job_status(job['url'], 'success')
    except TimeoutError as e:
        update_job_status(job['url'], 'timeout', e)
    except Exception as e:
        update_job_status(job['url'], 'failed', e)

def process_geotag(job):
    sno = job['url'].split(':')[1]
    try:
        r = fetch_with_backoff('https://bhuvan-app1.nrsc.gov.in/wdc2.0/php/get_geotag.php', method='POST', json_data={"collection_sno": sno})
        data = r.json()
        if isinstance(data, list) and len(data) > 0:
            conn = get_db()
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
            conn.close()
            update_job_status(job['url'], 'success')
        else:
            update_job_status(job['url'], 'empty')
    except TimeoutError as e:
        update_job_status(job['url'], 'timeout', e)
    except Exception as e:
        update_job_status(job['url'], 'failed', e)

def run_worker(job_type, process_func, max_jobs=5, state_filter=None):
    jobs = get_pending_jobs(job_type, max_jobs, state_filter)
    if not jobs: return False
    
    with ThreadPoolExecutor(max_workers=MAX_CONCURRENCY) as executor:
        futures = {executor.submit(process_func, job): job for job in jobs}
        for future in as_completed(futures):
            pass
    return True

def print_stats():
    conn = get_db()
    stats = conn.execute("""
        SELECT state_name, 
               COUNT(DISTINCT project_name) as projects, 
               COUNT(*) as geotagged_works, 
               COUNT(DISTINCT district_name) as districts 
        FROM geotags 
        GROUP BY state_name
    """).fetchall()
    
    print("\n" + "="*60)
    print("INGESTION STATUS REPORT")
    print("="*60)
    print(f"{'State':<20} | {'Projects':<10} | {'Works':<10} | {'Districts':<10}")
    print("-" * 60)
    total_w = 0
    for s in stats:
        print(f"{s['state_name']:<20} | {s['projects']:<10} | {s['geotagged_works']:<10} | {s['districts']:<10}")
        total_w += s['geotagged_works']
    print("="*60)
    print(f"Total Geotagged Works: {total_w}\n")
    
    errors = conn.execute("SELECT status, count(*) FROM crawl_jobs GROUP BY status").fetchall()
    print("Job Status Counts:")
    for e in errors:
        print(f"  {e['status']}: {e['count(*)']}")
    conn.close()

if __name__ == '__main__':
    setup_db()
    for state, code in STATES_TO_CRAWL.items():
        url = f"https://wdcpmksy.dolr.gov.in/getDistWiseAssetGeoData?stcode={code}&stname={state}"
        add_job(url, 'state', 'root', state)
        
    print("Starting Resumable Ingestor aggressively for proof-of-concept...")
    
    run_worker('state', process_state, max_jobs=20)
    
    # Run targeted passes so each state gets at least a few districts processed
    for state in STATES_TO_CRAWL.keys():
        run_worker('district', process_district, max_jobs=5, state_filter=state)
        run_worker('project', process_project, max_jobs=10, state_filter=state)
        run_worker('geotag', process_geotag, max_jobs=20, state_filter=state)
        
    print_stats()
