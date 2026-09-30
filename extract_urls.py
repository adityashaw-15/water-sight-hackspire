import requests
import re
import urllib3
urllib3.disable_warnings()
r = requests.get('https://bhuvan-app1.nrsc.gov.in/wdc2.0/static/js/main.c725dc51.js', verify=False)
js = r.text
print("Found strings containing 'photo' or 'image' pattern:")
urls = re.findall(r'[\'"]([^\'"]+?photo[^\'"]+?)[\'"]', js, re.IGNORECASE)
for u in set(urls):
    print("MATCH:", u)

print("\nFound strings containing 'http':")
urls2 = re.findall(r'[\'"](https://bhuvan[^\'"]+)[\'"]', js, re.IGNORECASE)
for u in set(urls2):
    print("URL:", u)

print("\nLook for img tags:")
imgs = re.findall(r'img[^>]+src=[\'"]([^\'"]+)[\'"]', js, re.IGNORECASE)
for u in set(imgs):
    print("IMG SRC:", u)
    
print("\nLook for image construction logic:")
logic = re.findall(r'(.{0,50}\.photo1_name.{0,50})', js)
for l in logic:
    print("LOGIC:", l)
