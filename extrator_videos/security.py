import hashlib
import time
import json

def hash_input(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def write_processing_log(entry: dict, path: str = "processing.log"):
    e = dict(entry)
    e["ts"] = int(time.time())
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(e, ensure_ascii=False) + "\n")
