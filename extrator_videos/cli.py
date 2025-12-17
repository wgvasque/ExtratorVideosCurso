import json
import argparse
import os
import logging
from dotenv import load_dotenv
from .extractor import extract
from .credential_manager import get_credentials
from .downloader import download_hls
from .browser import BrowserSession

def main():
    load_dotenv()
    logging.basicConfig(level=logging.INFO)
    p = argparse.ArgumentParser()
    p.add_argument("url")
    p.add_argument("--cookies", dest="cookies", default=None)
    p.add_argument("--proxy", dest="proxy", default=None)
    p.add_argument("--out", dest="out", default=None)
    p.add_argument("--email", dest="email", default=None)
    p.add_argument("--senha", dest="senha", default=None)
    p.add_argument("--download", dest="download", default=None)
    args = p.parse_args()
    email_arg = args.email or os.getenv("EMAIL")
    senha_arg = args.senha or os.getenv("SENHA")
    
    # Resolve credentials via manager
    email, senha = get_credentials(args.url, email_arg, senha_arg)
    
    res = extract(args.url, cookies_path=args.cookies, proxy=args.proxy, email=email, senha=senha)
    if args.download:
        target = None
        if args.download == "best":
            best_bitrate = -1
            for s in res.sources:
                if s.type == "hls" and s.variants:
                    for v in s.variants:
                        if v.bitrate_bps and v.bitrate_bps > best_bitrate:
                            best_bitrate = v.bitrate_bps
                            target = v.url
            if not target:
                for s in res.sources:
                    if s.type == "hls":
                        target = s.source_url
                        break
        else:
            for s in res.sources:
                if s.type == "hls" and s.variants:
                    for v in s.variants:
                        if args.download in (v.resolution or "") or f"/{args.download}/" in v.url:
                            target = v.url
                            break
                if target:
                    break
            if not target:
                for s in res.sources:
                    if s.type == "hls":
                        target = s.source_url
                        break
        if target:
            headers = {}
            referer = os.getenv("REFERER") or args.url
            if referer:
                headers["Referer"] = referer
                headers["Origin"] = referer.split("/", 3)[:3][0] if referer.startswith("http") else None
                if headers.get("Origin") is None:
                    headers.pop("Origin")
            sess = BrowserSession(proxy=args.proxy, cookies_path=args.cookies, email=email, senha=senha)
            try:
                sess.collect(args.url)
            except Exception:
                pass
            ck = sess.cookies_header_for(target)
            ua = sess.user_agent() or None
            if ck:
                headers["Cookie"] = ck
            if ua:
                headers["User-Agent"] = ua
            sleep_ms = None
            if os.getenv("SLOW_DOWNLOAD") == "1":
                try:
                    sleep_ms = int(os.getenv("SEGMENT_SLEEP_MS") or "500")
                except Exception:
                    sleep_ms = 500
            out_file = f"video_{args.download}.ts" if args.download != "best" else "video_best.ts"
            download_hls(target, out_file, headers=headers, sleep_ms=sleep_ms, proxy=args.proxy)
    data = json.dumps({
        "url": res.url,
        "sources": [
            {
                "source_url": s.source_url,
                "type": s.type,
                "drm": s.drm,
                "variants": [
                    {
                        "url": v.url,
                        "type": v.type,
                        "resolution": v.resolution,
                        "bitrate_bps": v.bitrate_bps,
                        "frame_rate": v.frame_rate,
                        "codec": v.codec,
                        "duration_seconds": v.duration_seconds,
                        "estimated_size_bytes": v.estimated_size_bytes,
                        "download_url": v.download_url,
                    } for v in s.variants
                ],
                "notes": s.notes,
            } for s in res.sources
        ],
        "metadata": res.metadata,
    }, ensure_ascii=False, indent=2)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(data)
    else:
        print(data)

if __name__ == "__main__":
    main()
