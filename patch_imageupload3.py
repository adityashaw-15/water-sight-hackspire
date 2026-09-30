with open('src/components/ImageUpload.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

text = re.sub(
    r'if \(res\.status === 401\) throw new Error\("Please log in to upload field evidence\."\);',
    r"if (res.status === 401) { window.location.href = '/login?next=%2F'; return; }",
    text
)

text = text.replace(
    'onUpload({ file, data: livePayload });',
    '''try { onUpload({ file, data: livePayload }); } catch (e) { console.error('onUpload error (live):', e); }'''
)

text = text.replace(
    'onUpload({ file, data: payload });',
    '''try { onUpload({ file, data: payload }); } catch (e) { console.error('onUpload error (exif):', e); }'''
)

with open('src/components/ImageUpload.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
