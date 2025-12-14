import requests
import m3u8
from urllib.parse import urljoin
import time

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"

def download_hls(manifest_url: str, out_path: str, headers: dict = None, sleep_ms: int = None, proxy: str = None):
    h = {"User-Agent": UA}
    if headers:
        h.update(headers)
    m = m3u8.load(manifest_url, headers=h)
    sess = requests.Session()
    if proxy:
        sess.proxies = {"http": proxy, "https": proxy}
    with open(out_path, "wb") as f:
        for s in m.segments:
            u = s.uri
            if not u.startswith("http"):
                u = urljoin(manifest_url, u)
            r = sess.get(u, stream=True, headers=h, timeout=30)
            for chunk in r.iter_content(chunk_size=1024 * 256):
                if chunk:
                    f.write(chunk)
            if sleep_ms and sleep_ms > 0:
                time.sleep(sleep_ms / 1000.0)
