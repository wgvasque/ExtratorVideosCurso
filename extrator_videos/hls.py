from typing import Dict, List
from .schema import VideoVariant
import m3u8
from urllib.parse import urljoin
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"

def parse_hls(url: str) -> Dict:
    m = m3u8.load(url, headers={"User-Agent": UA})
    variants: List[VideoVariant] = []
    for pl in m.playlists or []:
        info = pl.stream_info
        res = None
        br = None
        frv = None
        if info:
            if info.resolution:
                res = f"{info.resolution[0]}x{info.resolution[1]}"
            if info.bandwidth:
                br = int(info.bandwidth)
            if info.frame_rate:
                frv = float(info.frame_rate)
        variants.append(VideoVariant(url=absolute(url, pl.uri), type="hls", resolution=res, bitrate_bps=br, frame_rate=frv))
    # audio media renditions
    audios = []
    for media in getattr(m, 'media', []) or []:
        try:
            if (getattr(media, 'type', None) or '').lower() == 'audio' and media.uri:
                audios.append({
                    'uri': absolute(url, media.uri),
                    'group_id': getattr(media, 'group_id', None),
                    'language': getattr(media, 'language', None),
                    'name': getattr(media, 'name', None),
                    'default': getattr(media, 'default', False),
                })
        except Exception:
            continue
    raw = m.dumps()
    return {"variants": variants, "audios": audios, "raw": raw}

def absolute(base: str, path: str) -> str:
    if not path:
        return base
    if path.startswith("http"):
        return path
    return urljoin(base, path)
