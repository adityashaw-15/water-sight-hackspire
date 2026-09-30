with open('analysis_service.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re

new_search = '''
    import re
    pc_scene_id = re.sub(r'_N\d{4}_', '_', scene_id)
    search = catalog.search(collections=['sentinel-2-l2a'], ids=[pc_scene_id])
    items = list(search.items())
    if not items:
        # Fallback to date/point search just in case
        raise Exception(f"Scene {pc_scene_id} not found in raster store.")
'''

text = re.sub(r'    search = catalog.search\(collections=\[\'sentinel-2-l2a\'\], ids=\[scene_id\]\)\n    items = list\(search\.items\(\)\)\n    if not items:\n        raise Exception\(f"Scene \{scene_id\} not found in raster store\."\)', new_search, text)

with open('analysis_service.py', 'w', encoding='utf-8') as f:
    f.write(text)
