import os
import json
import hashlib
import time

def cache_key(input_url: str, manifest_url: str, headers: dict) -> str:
    h = hashlib.sha256()
    h.update((input_url or "").encode("utf-8"))
    h.update((manifest_url or "").encode("utf-8"))
    keys = sorted((headers or {}).keys())
    for k in keys:
        if k.lower() in ("cookie", "authorization"):
            continue
        v = headers.get(k)
        h.update((k + ":" + str(v)).encode("utf-8"))
    return h.hexdigest()

def _file_path(dir_path: str, key: str) -> str:
    return os.path.join(dir_path, key + ".json")

def load_transcription(dir_path: str, key: str, ttl_hours: int = None):
    try:
        p = _file_path(dir_path, key)
        if not os.path.exists(p):
            return None
        if ttl_hours is not None:
            age = time.time() - os.path.getmtime(p)
            if age > ttl_hours * 3600:
                return None
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None

def save_transcription(dir_path: str, key: str, data: dict):
    try:
        os.makedirs(dir_path, exist_ok=True)
        p = _file_path(dir_path, key)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        return True
    except Exception:
        return False
