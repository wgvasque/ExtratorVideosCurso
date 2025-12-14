import os
import json
import hashlib
import time

def key_for(url: str) -> str:
    return hashlib.sha256((url or "").encode("utf-8")).hexdigest()

def load(dir_path: str, url: str, ttl_hours: int = None):
    try:
        k = key_for(url)
        p = os.path.join(dir_path, k + ".json")
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

def save(dir_path: str, url: str, data: dict):
    try:
        os.makedirs(dir_path, exist_ok=True)
        k = key_for(url)
        p = os.path.join(dir_path, k + ".json")
        with open(p, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        return True
    except Exception:
        return False
