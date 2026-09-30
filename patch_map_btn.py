with open('src/components/IndiaWatershedMap.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
old_div = r'<div style=\{\{ marginTop: \'10px\', paddingTop: \'8px\', borderTop: \'1px solid #eee\', fontSize: \'11px\', color: \'#888\' \}\}>\n\s*<strong>Source:</strong> Watersight field evidence\n\s*</div>'

new_div = """<div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #eee', fontSize: '11px', color: '#888', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span><strong>Source:</strong> Watersight field evidence</span>
        <a href={`/satellite-analysis?lat=${feature.geometry?.coordinates[1]}&lng=${feature.geometry?.coordinates[0]}&img=${encodeURIComponent(p.image_url || '')}`} target="_blank" className="button button-primary" style={{ padding: '4px 8px', fontSize: '10px', textDecoration: 'none' }}>Analyze Satellite Data</a>
      </div>"""

text = re.sub(old_div, new_div, text)
with open('src/components/IndiaWatershedMap.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
