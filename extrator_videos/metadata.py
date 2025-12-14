import shutil
import subprocess
from typing import Optional
import requests
from .schema import VideoExtractionResult, VideoSource, VideoVariant

def enrich_metadata(result: VideoExtractionResult):
    for s in result.sources:
        if s.type == "hls":
            for v in s.variants:
                d = hls_duration(v.url)
                v.duration_seconds = d
                if v.bitrate_bps and d:
                    v.estimated_size_bytes = int(v.bitrate_bps * d / 8)
                if has_ffprobe():
                    info = ffprobe_info(v.url)
                    if info:
                        v.codec = info.get("codec") or v.codec
                        if not v.resolution and info.get("width") and info.get("height"):
                            v.resolution = f"{info.get('width')}x{info.get('height')}"
                        if not v.frame_rate and info.get("frame_rate"):
                            v.frame_rate = info.get("frame_rate")
                        if not v.bitrate_bps and info.get("bit_rate"):
                            v.bitrate_bps = info.get("bit_rate")
                        if not v.duration_seconds and info.get("duration"):
                            v.duration_seconds = info.get("duration")
        elif s.type == "file":
            for v in s.variants:
                size = content_length(v.url)
                v.estimated_size_bytes = size
                if has_ffprobe():
                    info = ffprobe_info(v.url)
                    if info:
                        v.codec = info.get("codec") or v.codec
                        if not v.resolution and info.get("width") and info.get("height"):
                            v.resolution = f"{info.get('width')}x{info.get('height')}"
                        if not v.frame_rate and info.get("frame_rate"):
                            v.frame_rate = info.get("frame_rate")
                        if not v.bitrate_bps and info.get("bit_rate"):
                            v.bitrate_bps = info.get("bit_rate")
                        if not v.duration_seconds and info.get("duration"):
                            v.duration_seconds = info.get("duration")

def has_ffprobe() -> bool:
    return shutil.which("ffprobe") is not None

def hls_duration(url: str) -> Optional[float]:
    try:
        txt = requests.get(url, timeout=20).text
        total = 0.0
        for line in txt.splitlines():
            if line.startswith("#EXTINF:"):
                num = line.split(":", 1)[1].split(",")[0]
                try:
                    total += float(num)
                except Exception:
                    pass
        return total if total > 0 else None
    except Exception:
        return None

def content_length(url: str) -> Optional[int]:
    try:
        r = requests.head(url, timeout=20, allow_redirects=True)
        cl = r.headers.get("content-length")
        if cl and cl.isdigit():
            return int(cl)
    except Exception:
        return None
    return None

def ffprobe_info(url: str) -> Optional[dict]:
    try:
        cmd = [
            "ffprobe",
            "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=codec_name,width,height,avg_frame_rate,bit_rate",
            "-show_entries", "format=duration",
            "-of", "json",
            url,
        ]
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if p.returncode != 0:
            return None
        import json
        data = json.loads(p.stdout)
        stream = (data.get("streams") or [{}])[0]
        fmt = data.get("format") or {}
        codec = stream.get("codec_name")
        width = stream.get("width")
        height = stream.get("height")
        br = stream.get("bit_rate")
        fr = stream.get("avg_frame_rate")
        dur = fmt.get("duration")
        try:
            fr_val = None
            if fr and "/" in fr:
                a, b = fr.split("/")
                if int(b) != 0:
                    fr_val = int(a) / int(b)
        except Exception:
            fr_val = None
        return {
            "codec": codec,
            "width": width,
            "height": height,
            "bit_rate": int(br) if br and str(br).isdigit() else None,
            "frame_rate": fr_val,
            "duration": float(dur) if dur else None,
        }
    except Exception:
        return None
