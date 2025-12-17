from typing import Dict, List

VIDEO_EXTS = [".mp4", ".m3u8", ".ts", ".mov", ".webm", ".ogg", ".mpd"]

def is_video_url(url: str) -> bool:
    u = url.lower().split("?")[0]
    return any(u.endswith(e) for e in VIDEO_EXTS)

class NetworkCapture:
    def __init__(self):
        self.requests: List[Dict] = []
        self.responses: List[Dict] = []
        self.flags: Dict[str, bool] = {}

    def on_request(self, req):
        self.requests.append({
            "url": req.url,
            "method": req.method,
            "resource_type": req.resource_type,
            "headers": dict(req.headers)
        })

    def on_response(self, res):
        try:
            ct = res.headers.get("content-type")
        except Exception:
            ct = None
        self.responses.append({
            "url": res.url,
            "status": res.status,
            "headers": dict(res.headers),
            "type": ct
        })

    def video_candidates(self) -> List[Dict]:
        cands: List[Dict] = []
        for r in self.responses:
            u = r.get("url")
            t = r.get("type") or ""
            if is_video_url(u) or (t.startswith("video/") if t else False) or t in ["application/vnd.apple.mpegurl", "application/x-mpegURL", "application/dash+xml"]:
                cands.append(r)
        return cands
