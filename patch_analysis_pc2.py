with open('analysis_service.py', 'r', encoding='utf-8') as f:
    text = f.read()

old_str = '''    search = catalog.search(collections=['sentinel-2-l2a'], ids=[scene_id])
    items = list(search.items())
    if not items:
        raise Exception(f"Scene {scene_id} not found in raster store.")'''

new_str = '''    import re
    pc_scene_id = re.sub(r'_N\d{4}_', '_', scene_id)
    search = catalog.search(collections=['sentinel-2-l2a'], ids=[pc_scene_id])
    items = list(search.items())
    if not items:
        raise Exception(f"Scene {pc_scene_id} not found in raster store.")'''

text = text.replace(old_str, new_str)

with open('analysis_service.py', 'w', encoding='utf-8') as f:
    f.write(text)
