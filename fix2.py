with open('src/components/ImageUpload.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(r'locationStatusMsg\.includes\([^)]+\)', "locationStatusMsg.includes('\\\\n')", text)

with open('src/components/ImageUpload.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
