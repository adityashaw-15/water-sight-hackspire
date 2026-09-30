import requests
import re
import json
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_real_geotags():
    geotags = []
    # Hardcoded a few known collection_sno to prove the pipeline without crawling for 2 hours
    snos = ['160472470', '160472316', '160472273', '160472961', '160468254']
    for sno in snos:
        try:
            r = requests.post('https://bhuvan-app1.nrsc.gov.in/wdc2.0/php/get_geotag.php', json={"collection_sno": sno}, verify=False, timeout=10)
            data = r.json()
            if isinstance(data, list) and len(data) > 0:
                geotags.extend(data)
        except Exception as e:
            print("Failed", sno, e)

    with open('backend/geotags_cache.json', 'w', encoding='utf-8') as f:
        json.dump(geotags, f, ensure_ascii=False)
    print("Saved", len(geotags), "geotags.")

if __name__ == '__main__':
    get_real_geotags()
