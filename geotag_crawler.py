import requests
import re
import json
import time
import urllib3
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

STATES_TO_CRAWL = {
    'WEST BENGAL': '19',
    'MAHARASHTRA': '27',
    'BIHAR': '10',
    'RAJASTHAN': '8',
    'KARNATAKA': '29'
}

BASE_URL = 'https://wdcpmksy.dolr.gov.in/'
BHUVAN_URL = 'https://bhuvan-app1.nrsc.gov.in/wdc2.0/php/get_geotag.php'

def get_links(url, filter_text):
    try:
        r = requests.get(url, verify=False, timeout=15)
        soup = BeautifulSoup(r.text, 'html.parser')
        links = []
        for a in soup.find_all('a'):
            href = a.get('href')
            if href and filter_text in href:
                links.append(href)
        return links
    except:
        return []

def get_geotags_for_project(proj_link):
    # e.g. getProjDtlAssetGeoData?projid=310&stname=WEST BENGAL&distname=BANKURA&projname=BANKURA-WDC...
    works_links = get_links(BASE_URL + proj_link, 'collection_sno')
    
    geotags = []
    snos = set()
    for link in works_links:
        # extract collection_sno=160472470
        m = re.search(r'collection_sno=(\d+)', link)
        if m:
            snos.add(m.group(1))
            
    for sno in snos:
        try:
            r = requests.post(BHUVAN_URL, json={"collection_sno": sno}, verify=False, timeout=15)
            data = r.json()
            if isinstance(data, list) and len(data) > 0:
                geotags.extend(data)
        except Exception as e:
            pass
            
    return geotags

def crawl_state(stname, stcode):
    print(f"Crawling {stname}...")
    dist_url = f"{BASE_URL}getDistWiseAssetGeoData?stcode={stcode}&stname={stname}"
    proj_links = get_links(dist_url, 'getProjWiseAssetGeoData')
    
    all_geotags = []
    
    # Just crawl up to 5 districts per state to keep it fast for the test, 
    # but the logic scales nationwide.
    for proj_link in proj_links[:3]:
        work_links = get_links(BASE_URL + proj_link, 'getProjDtlAssetGeoData')
        
        # Up to 5 projects per district
        for work_link in work_links[:5]:
            tags = get_geotags_for_project(work_link)
            all_geotags.extend(tags)
            print(f"  Got {len(tags)} tags for project.")
            
    return all_geotags

def run_crawler():
    results = []
    for stname, stcode in STATES_TO_CRAWL.items():
        tags = crawl_state(stname, stcode)
        results.extend(tags)
        
    # Also save the result
    with open('backend/geotags_cache.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False)
    print(f"Done. Saved {len(results)} total geotags.")

if __name__ == '__main__':
    run_crawler()
