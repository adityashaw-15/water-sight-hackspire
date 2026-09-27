
import httpx
import xml.etree.ElementTree as ET

try:
    r = httpx.get("https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms?service=WMS&request=GetCapabilities", verify=False, timeout=15.0)
    root = ET.fromstring(r.content)
    namespace = {"wms": "http://www.opengis.net/wms"}
    for layer in root.iter("{http://www.opengis.net/wms}Layer"):
        name = layer.find("{http://www.opengis.net/wms}Name")
        title = layer.find("{http://www.opengis.net/wms}Title")
        if name is not None and title is not None:
            n_text = name.text.lower()
            t_text = title.text.lower()
            if "watershed" in n_text or "basin" in n_text or "watershed" in t_text or "basin" in t_text:
                print(f"{name.text}: {title.text}")
except Exception as e:
    print(f"Error: {e}")

