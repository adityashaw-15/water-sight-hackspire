import requests
import json

def get_bounds(query):
    headers = {'User-Agent': 'Watersight/1.0'}
    r = requests.get(f'https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1', headers=headers)
    if r.status_code == 200 and r.json():
        return r.json()[0]['boundingbox']
    return None

print(get_bounds("Madhya Pradesh, India"))
print(get_bounds("Jabalpur, Madhya Pradesh, India"))
