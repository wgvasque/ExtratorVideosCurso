import os
import tempfile
import requests
import subprocess
import m3u8
from urllib.parse import urljoin
from .hls import parse_hls

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"

def select_stream(manifest_url: str, headers: dict):
    h = parse_hls(manifest_url)
    auds = h.get("audios") or []
    if auds:
        default = next((a for a in auds if a.get('default')), None)
        return (default or auds[0]).get('uri')
    vars = h.get("variants") or []
    if vars:
        best = sorted(vars, key=lambda v: v.bitrate_bps or 0, reverse=True)[0]
        return best.url
    return manifest_url

def _headers(headers: dict):
    h = {"User-Agent": UA}
    if headers:
        h.update(headers)
    return h

def download_segments_to_ts(stream_url: str, headers: dict, out_ts: str):
    sess = requests.Session()
    sess.headers.update(_headers(headers))
    m = m3u8.load(stream_url, headers=_headers(headers))
    txt = m.dumps()
    if "#EXT-X-KEY" in txt:
        return False
    with open(out_ts, "wb") as f:
        for s in m.segments:
            u = s.uri
            if not u.startswith("http"):
                u = urljoin(stream_url, u)
            r = sess.get(u, stream=True, timeout=30)
            for chunk in r.iter_content(chunk_size=1024 * 256):
                if chunk:
                    f.write(chunk)
    return True

def convert_ts_to_wav(ts_path: str, wav_path: str):
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", ts_path,
        "-vn", "-ac", "1", "-ar", "16000",
        wav_path,
    ]
    subprocess.run(cmd, check=True)
    return wav_path

def download_hls_to_wav(manifest_url: str, headers: dict):
    stream = select_stream(manifest_url, headers)
    ts_path = os.path.join(tempfile.gettempdir(), "hls_concat.ts")
    ok = download_segments_to_ts(stream, headers, ts_path)
    if not ok:
        return None
    wav_path = os.path.join(tempfile.gettempdir(), "hls_audio.wav")
    convert_ts_to_wav(ts_path, wav_path)
    return wav_path
