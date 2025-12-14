import os
import json
import time
import datetime
import uuid
from urllib.parse import urlparse
import shutil

LEVELS = ["debug", "info", "warning", "error"]

def now_iso():
    return datetime.datetime.now().replace(microsecond=0).isoformat()

def ms():
    return int(time.time() * 1000)

def safe_name(s: str):
    return "".join([c if c.isalnum() else "_" for c in s])

def sanitize_domain(s: str):
    out = []
    for c in (s or ""):
        if c.isalnum() or c in ".-":
            out.append(c)
        else:
            out.append("_")
    return "".join(out)

def redact(value):
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            kl = k.lower()
            if kl in ("cookie", "authorization"):
                out[k] = "[redacted]"
            else:
                out[k] = redact(v)
        return out
    if isinstance(value, list):
        return [redact(v) for v in value]
    if isinstance(value, str):
        return value.replace("@", "[at]")
    return value

class StepLogger:
    def __init__(self, run_id: str, level: str = "info", log_dir: str = "logs"):
        self.run_id = run_id
        self.level = level if level in LEVELS else "info"
        self.log_dir = log_dir
        self.started_iso = now_iso()
        self.finished_iso = None
        self.steps = []
        self.context = {}
        self.stats = {}

    def set_context(self, ctx: dict):
        self.context = redact(ctx or {})

    def step(self, descricao: str, categoria: str = "system", level: str = "info"):
        return StepContext(self, descricao, categoria, level)

    def add_step(self, data: dict):
        self.steps.append(redact(data))

    def finalize(self, out_path: str):
        self.finished_iso = now_iso()
        durations = [s.get("duracao_ms", 0) for s in self.steps if isinstance(s.get("duracao_ms", 0), int)]
        total_ms = sum(durations) if durations else 0
        fastest = min(durations) if durations else 0
        slowest = max(durations) if durations else 0
        avg = int(total_ms / len(durations)) if durations else 0
        by_cat = {}
        for s in self.steps:
            c = s.get("categoria")
            by_cat.setdefault(c, {"count": 0, "total_ms": 0})
            by_cat[c]["count"] += 1
            by_cat[c]["total_ms"] += s.get("duracao_ms", 0)
        self.stats = {
            "count": len(self.steps),
            "fastest_ms": fastest,
            "slowest_ms": slowest,
            "avg_ms": avg,
            "by_category": by_cat,
        }
        payload = {
            "run_id": self.run_id,
            "started_iso": self.started_iso,
            "finished_iso": self.finished_iso,
            "total_ms": total_ms,
            "level": self.level,
            "format": "json",
            "context": self.context,
            "steps": self.steps,
            "summary": self.stats,
        }
        # derive domain and id from context
        dom = "misc"
        cid = safe_name(self.run_id)
        try:
            u = self.context.get("input_url") or ""
            if u:
                p = urlparse(u)
                dom = sanitize_domain(p.netloc or dom)
                tail = p.path.strip("/").split("/")
                if tail:
                    cid = tail[-1]
        except Exception:
            pass
        base_dir = os.path.join(self.log_dir, dom, safe_name(cid))
        # ensure directory
        try:
            os.makedirs(base_dir, exist_ok=True)
        except PermissionError:
            base_dir = self.log_dir
        except OSError:
            base_dir = self.log_dir
        # disk space check
        try:
            usage = shutil.disk_usage(base_dir)
            if usage.free < 100 * 1024 * 1024:  # <100MB free
                self.steps.append({
                    "id": str(uuid.uuid4()),
                    "descricao": "Aviso de espaço em disco",
                    "categoria": "system",
                    "inicio_iso": now_iso(),
                    "fim_iso": now_iso(),
                    "duracao_ms": 0,
                    "status": "warning",
                    "level": self.level,
                    "detalhes": {"free_bytes": usage.free},
                    "erro": None,
                    "retry_count": 0,
                })
        except Exception:
            pass
        tmp = os.path.join(base_dir, f"{safe_name(self.run_id)}.tmp.json")
        final = os.path.join(base_dir, out_path)
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                f.write(json.dumps(payload, ensure_ascii=False, indent=2))
            os.replace(tmp, final)
        except Exception:
            try:
                # fallback to log_dir flat
                os.makedirs(self.log_dir, exist_ok=True)
                tmp2 = os.path.join(self.log_dir, f"{safe_name(self.run_id)}.tmp.json")
                final2 = os.path.join(self.log_dir, out_path)
                with open(tmp2, "w", encoding="utf-8") as f:
                    f.write(json.dumps(payload, ensure_ascii=False, indent=2))
                os.replace(tmp2, final2)
            except Exception:
                pass

class StepContext:
    def __init__(self, logger: StepLogger, descricao: str, categoria: str, level: str):
        self.logger = logger
        self.descricao = descricao
        self.categoria = categoria
        self.level = level
        self.severity = level
        self.id = str(uuid.uuid4())
        self.inicio_iso = None
        self.fim_iso = None
        self.t0 = None
        self.t1 = None
        self.status = "sucesso"
        self.details = {}
        self.retry_count = 0

    def __enter__(self):
        self.inicio_iso = now_iso()
        self.t0 = ms()
        return self

    def details_update(self, d: dict):
        try:
            self.details.update(d or {})
        except Exception:
            pass

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.fim_iso = now_iso()
        self.t1 = ms()
        dur = self.t1 - self.t0 if self.t1 and self.t0 else 0
        if exc_type is not None:
            self.status = "falha"
            err = str(exc_val) if exc_val else "erro"
        else:
            err = None
        self.logger.add_step({
            "id": self.id,
            "descricao": self.descricao,
            "categoria": self.categoria,
            "inicio_iso": self.inicio_iso,
            "fim_iso": self.fim_iso,
            "duracao_ms": dur,
            "status": self.status,
            "level": self.level,
            "severity": self.severity,
            "detalhes": self.details,
            "erro": err,
            "retry_count": self.retry_count,
        })
        # swallow exceptions to continue pipeline
        return True
