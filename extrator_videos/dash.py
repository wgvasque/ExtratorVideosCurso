from typing import Dict, List
import requests
from .schema import VideoVariant

def parse_dash(url: str) -> Dict:
    xml = requests.get(url, timeout=20).text
    drm = None
    if "cenc:" in xml or "ContentProtection" in xml:
        drm = "dash_drm"
    variants: List[VideoVariant] = []
    try:
        from xml.etree import ElementTree as ET
        root = ET.fromstring(xml)
        ns = {"mpd": root.tag.split("}")[0].strip("{")}
        for rep in root.findall(".//mpd:Representation", ns):
            bw = rep.attrib.get("bandwidth")
            w = rep.attrib.get("width")
            h = rep.attrib.get("height")
            codecs = rep.attrib.get("codecs")
            res = f"{w}x{h}" if w and h else None
            br = int(bw) if bw and bw.isdigit() else None
            variants.append(VideoVariant(url=url, type="dash", resolution=res, bitrate_bps=br, codec=codecs))
    except Exception:
        pass
    return {"variants": variants, "drm": drm}
