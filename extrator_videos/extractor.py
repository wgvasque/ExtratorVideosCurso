from typing import Optional, List
from .schema import VideoExtractionResult, VideoSource, VideoVariant
from .browser import BrowserSession
from .auth import programmatic_login
from .network_capture import NetworkCapture, is_video_url
import requests
from .resolver import canonicalize
from .hls import parse_hls
from .dash import parse_dash
from .metadata import enrich_metadata
from .drm import detect_drm_playlist, detect_drm_eme_flag

def extract(url: str, cookies_path: Optional[str] = None, proxy: Optional[str] = None, email: Optional[str] = None, senha: Optional[str] = None) -> VideoExtractionResult:
    sources: List[VideoSource] = []
    if is_video_url(url):
        ct = None
        try:
            r = requests.head(url, timeout=15, allow_redirects=True)
            ct = r.headers.get("content-type")
        except Exception:
            ct = None
        u = canonicalize(url)
        if (ct and "mpegurl" in ct) or u.lower().endswith(".m3u8"):
            hls = parse_hls(u)
            drm = detect_drm_playlist(hls.get("raw"))
            vs = hls.get("variants", [])
            for v in vs:
                v.download_url = v.url if not drm else None
            note = None if drm else f"ffmpeg -i {u} -c copy output.mp4"
            sources.append(VideoSource(source_url=u, type="hls", drm=drm, variants=vs, notes=note))
        elif (ct and "dash+xml" in ct) or u.lower().endswith(".mpd"):
            dash = parse_dash(u)
            ddrm = dash.get("drm")
            vs = dash.get("variants", [])
            for v in vs:
                v.download_url = u if not ddrm else None
            note = None if ddrm else f"ffmpeg -i {u} -c copy output.mp4"
            sources.append(VideoSource(source_url=u, type="dash", drm=ddrm, variants=vs, notes=note))
        else:
            t = infer_type_from_ext(u)
            v = VideoVariant(url=u, type=t, download_url=u)
            sources.append(VideoSource(source_url=u, type="file", variants=[v]))
        result = VideoExtractionResult(url=url, sources=sources)
        enrich_metadata(result)
        return result
    initial_cookies = None
    try:
        initial_cookies = programmatic_login(url, email or "", senha or "") if (email and senha) else None
    except Exception:
        initial_cookies = None
    
    # Ler variável HEADLESS do ambiente
    import os
    headless = os.getenv("HEADLESS", "false").lower() in ("true", "1", "yes")
    
    session = BrowserSession(proxy=proxy, cookies_path=cookies_path, email=email, senha=senha, initial_cookies=initial_cookies, headless=headless)
    capture = session.collect(url)
    candidates = capture.video_candidates()
    eme_drm = detect_drm_eme_flag(capture)
    for c in candidates:
        t = c.get("type") or ""
        u = canonicalize(c.get("url"))
        vs: List[VideoVariant] = []
        drm = None
        if t in ["application/vnd.apple.mpegurl", "application/x-mpegURL"] or (u and u.lower().endswith(".m3u8")):
            hls = parse_hls(u)
            drm = detect_drm_playlist(hls.get("raw"))
            vs = hls.get("variants", [])
            for v in vs:
                v.download_url = v.url if not drm else None
        elif t in ["application/dash+xml"] or (u and u.lower().endswith(".mpd")):
            dash = parse_dash(u)
            drm = dash.get("drm")
            vs = dash.get("variants", [])
            for v in vs:
                v.download_url = u if not drm else None
        elif u and is_video_url(u):
            tpe = infer_type_from_ext(u)
            vs = [VideoVariant(url=u, type=tpe, download_url=u)]
        src = VideoSource(source_url=u, type=("hls" if u.endswith(".m3u8") else ("dash" if u.endswith(".mpd") else "file")), drm=drm or eme_drm, variants=vs)
        sources.append(src)
    result = VideoExtractionResult(url=url, sources=sources)
    enrich_metadata(result)
    session.close()
    return result

def infer_type_from_ext(u: str) -> str:
    l = u.lower()
    if l.endswith('.mp4'):
        return 'mp4'
    if l.endswith('.mov'):
        return 'mov'
    if l.endswith('.webm'):
        return 'webm'
    if l.endswith('.ogg') or l.endswith('.ogv'):
        return 'ogg'
    if l.endswith('.ts'):
        return 'ts'
    return 'file'
