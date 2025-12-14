import os
import json

def validate_log_json(path: str) -> bool:
    try:
        with open(path, "r", encoding="utf-8") as f:
            j = json.load(f)
        required = ["run_id", "started_iso", "finished_iso", "total_ms", "context", "steps", "summary"]
        for k in required:
            if k not in j:
                return False
        return True
    except Exception:
        return False

def validate_summary_json(path: str) -> bool:
    try:
        with open(path, "r", encoding="utf-8") as f:
            j = json.load(f)
        for k in ["resumo_conciso", "pontos_chave", "topicos", "orientacoes", "secoes"]:
            if k not in j:
                return False
        return True
    except Exception:
        return False

def validate_access(path: str) -> bool:
    try:
        return os.access(path, os.R_OK | os.W_OK)
    except Exception:
        return False

def validate_gemini_authentic(path: str) -> bool:
    try:
        with open(path, "r", encoding="utf-8") as f:
            j = json.load(f)
        raw = j.get("retorno_literal_gemini")
        origin = j.get("origin")
        model = j.get("gemini_model")
        return bool(raw) and origin == "gemini" and bool(model)
    except Exception:
        return False

def assess_quality(path: str) -> dict:
    out = {"resumo_words": 0, "pontos_count": 0, "orient_count": 0, "resumo_ok": False, "pontos_ok": False, "orient_ok": False}
    try:
        with open(path, "r", encoding="utf-8") as f:
            j = json.load(f)
        resumo = (j.get("resumo_conciso") or "").strip()
        pontos = j.get("pontos_chave") or []
        orient = j.get("orientacoes") or []
        out["resumo_words"] = len([w for w in resumo.split() if w])
        out["pontos_count"] = len(pontos)
        out["orient_count"] = len(orient)
        out["resumo_ok"] = 200 <= out["resumo_words"] <= 300
        out["pontos_ok"] = 7 <= out["pontos_count"] <= 15
        out["orient_ok"] = 7 <= out["orient_count"] <= 15
    except Exception:
        pass
    return out
