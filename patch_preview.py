with open('analysis_service.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re

old_write = r'''        with rasterio\.open\(out_tiff, 'w', \*\*ndvi_meta\) as dst:\n            dst\.write\(ndvi\.astype\(np\.float32\), 1\)'''

new_write = """        with rasterio.open(out_tiff, 'w', **ndvi_meta) as dst:
            dst.write(ndvi.astype(np.float32), 1)
            
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        plt.figure(figsize=(6,6))
        cmap = plt.cm.RdYlGn
        cmap.set_bad(color='black', alpha=0)
        plt.imshow(ndvi, cmap=cmap, vmin=-1, vmax=1)
        plt.axis('off')
        out_png = os.path.join(out_dir, 'ndvi_preview.png')
        plt.savefig(out_png, bbox_inches='tight', pad_inches=0, transparent=True)
        plt.close()"""

text = re.sub(old_write, new_write, text)

text = text.replace(
    'f"/static/satellite/processed/{job_id}/ndvi_20m.tif" # To be replaced with a PNG preview logic ideally',
    'f"/static/satellite/processed/{job_id}/ndvi_preview.png"'
)

with open('analysis_service.py', 'w', encoding='utf-8') as f:
    f.write(text)
