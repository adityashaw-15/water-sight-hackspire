import requests, urllib3, re
urllib3.disable_warnings()
r = requests.get('https://bhuvan-app1.nrsc.gov.in/wdc2.0/static/js/main.c725dc51.js', verify=False)
lines = r.text.replace(';', ';\n')
for line in lines.split('\n'):
    if 'php' in line.lower() and ('dist' in line.lower() or 'proj' in line.lower()):
        print(line[:200])
