import os
from dotenv import load_dotenv

# Check file contents
with open('c:/Users/user/Documents/ChatGPT/water-sight/water-sight/.env', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("--- .ENV FILE INSPECTION ---")
for line in lines:
    line = line.strip('\n')
    if '=' not in line: continue
    k, v = line.split('=', 1)
    if k == 'GOOGLE_CLIENT_ID':
        print(f'GOOGLE_CLIENT_ID length: {len(v)}')
        print(f'GOOGLE_CLIENT_ID first 8: {v[:8]}')
        print(f'GOOGLE_CLIENT_ID last 20: {v[-20:]}')
        print(f'GOOGLE_CLIENT_ID has leading whitespace: {v.startswith(" ")}')
        print(f'GOOGLE_CLIENT_ID has trailing whitespace: {v.endswith(" ")}')
        print(f'GOOGLE_CLIENT_ID starts with quotes: {v.startswith(chr(34)) or v.startswith(chr(39))}')
    elif k == 'GOOGLE_CLIENT_SECRET':
        print(f'GOOGLE_CLIENT_SECRET configured: {bool(v.strip())}')

print("\n--- ENVIRONMENT VAR INSPECTION (BEFORE LOAD_DOTENV) ---")
env_id = os.environ.get('GOOGLE_CLIENT_ID', 'NOT SET')
print(f"GOOGLE_CLIENT_ID in os.environ: {env_id[:8] if env_id != 'NOT SET' else env_id}")

print("\n--- ENVIRONMENT VAR INSPECTION (AFTER LOAD_DOTENV) ---")
load_dotenv(override=True)
env_id2 = os.environ.get('GOOGLE_CLIENT_ID', 'NOT SET')
print(f"GOOGLE_CLIENT_ID in os.environ: {env_id2[:8] if env_id2 != 'NOT SET' else env_id2}")
