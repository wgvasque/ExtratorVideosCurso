import os
import tempfile
import subprocess
from urllib.parse import urlparse, parse_qs
import wave
from concurrent.futures import ThreadPoolExecutor, as_completed

def ffmpeg_audio_stream(input_url: str, headers: dict = None, out_path: str = None, preview_seconds: int = None):
    h = headers or {}
    hs = []
    ua_val = None
    src = str(input_url).strip().replace("`", "")
    parsed = urlparse(src)
    host = parsed.netloc or ""
    is_cf_manifest = ("cloudflarestream.com" in host) and ("/manifest/video.m3u8" in src)
    if "cloudflarestream.com" in host and "/manifest/video.m3u8" in src and ("?p=" in src):
        try:
            qs = parse_qs(parsed.query or "")
            token = (qs.get("p") or [None])[0]
            if token and ('.' in token) and (len(token.split('.')) == 3):
                token = str(token).strip().replace("`", "")
                src = f"{parsed.scheme}://{parsed.netloc}/{token}/manifest/video.m3u8"
                parsed = urlparse(src)
                is_cf_manifest = True
        except Exception:
            pass
    for k, v in h.items():
        sv = str(v).strip().replace("`", "").replace("\r", "").replace("\n", "")
        if k.lower() == "user-agent":
            ua_val = sv
        hs.append(f"{k}: {sv}")
    hdr = None if is_cf_manifest else ("\r\n".join(hs) if hs else None)
    tmp = out_path or os.path.join(tempfile.gettempdir(), "transcribe_input.wav")
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    if hdr:
        cmd += ["-headers", hdr]
    if ua_val:
        cmd += ["-user_agent", ua_val]
    try:
        rw_ms = int(os.getenv("FFMPEG_RW_TIMEOUT_MS") or "15000")
    except Exception:
        rw_ms = 15000
    cmd += ["-rw_timeout", str(rw_ms * 1000)]
    cmd += ["-i", src, "-vn", "-map", "0:a:0?", "-ac", "1", "-ar", "16000"]
    if preview_seconds and preview_seconds > 0:
        cmd += ["-t", str(preview_seconds)]
    cmd += [tmp]
    subprocess.run(cmd, check=True)
    return tmp

def split_wav_chunks(path: str, chunk_seconds: int):
    out = []
    with wave.open(path, 'rb') as w:
        fr = w.getframerate()
        ch = w.getnchannels()
        sw = w.getsampwidth()
        total_frames = w.getnframes()
        frames_per_chunk = fr * chunk_seconds
        start = 0
        idx = 0
        while start < total_frames:
            end = min(start + frames_per_chunk, total_frames)
            w.setpos(start)
            data = w.readframes(end - start)
            cpath = os.path.join(tempfile.gettempdir(), f"chunk_{os.path.basename(path)}_{idx}.wav")
            with wave.open(cpath, 'wb') as cw:
                cw.setnchannels(ch)
                cw.setsampwidth(sw)
                cw.setframerate(fr)
                cw.writeframes(data)
            out.append({"path": cpath, "offset": start / fr})
            start = end
            idx += 1
    return out
