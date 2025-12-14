from .network_capture import NetworkCapture

def detect_drm_playlist(text: str):
    if not text:
        return None
    if "#EXT-X-KEY" in text and "KEYFORMAT" in text:
        if "com.widevine" in text:
            return "widevine"
        if "com.apple" in text:
            return "fairplay"
        if "com.microsoft" in text:
            return "playready"
        return "encrypted"
    return None

def detect_drm_eme_flag(capture: NetworkCapture):
    try:
        if capture.flags.get("drm"):
            return capture.flags.get("drm")
    except Exception:
        return None
    return None
