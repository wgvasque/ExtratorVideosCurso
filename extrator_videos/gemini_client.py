import os
import google.generativeai as genai
import re
import json

def configure():
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY ausente")
    genai.configure(api_key=key)

def load_prompt():
    path = os.getenv("PROMPT_PATH") or "prompt_padrao.json"
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None

def _prefer_models_prefix(name: str) -> str:
    try:
        return name if name.startswith("models/") else ("models/" + name)
    except Exception:
        return name

def serialize_blocks(blocks: list, max_chars: int = 15000) -> str:
    try:
        s = str(blocks)
        if len(s) <= max_chars:
            return s
        out = []
        total = 0
        for b in reversed(blocks):
            bs = str(b)
            if total + len(bs) > max_chars:
                break
            out.append(b)
            total += len(bs)
        out.reverse()
        return str(out)
    except Exception:
        return str(blocks)[:max_chars]

def extract_response_text(resp) -> str:
    try:
        t = getattr(resp, "text", None)
        if t:
            return t
        cand = getattr(resp, "candidates", None)
        if cand and len(cand) > 0:
            content = getattr(cand[0], "content", None)
            parts = getattr(content, "parts", None) if content else None
            if parts:
                buf = []
                for p in parts:
                    pt = getattr(p, "text", None)
                    if pt:
                        buf.append(pt)
                if buf:
                    return "\n".join(buf)
        return ""
    except Exception:
        return ""

def summarize_transcription(text: str, blocks: list):
    configure()
    cfg = load_prompt()
    candidates = [
        _prefer_models_prefix(cfg["parametros"]["modelo"]) if cfg and cfg.get("parametros") and cfg["parametros"].get("modelo") else None,
        "models/gemini-2.5-flash",
        "models/gemini-2.5-pro",
        "models/gemini-2.0-flash",
    ]
    candidates = [c for c in candidates if c]
    mdl = None
    for name in candidates:
        try:
            gen_conf = None
            if cfg:
                gen_conf = {
                    "temperature": cfg["parametros"].get("temperatura", 0.2),
                    "top_p": cfg["parametros"].get("top_p", 0.9),
                    "candidate_count": cfg["parametros"].get("candidate_count", 1),
                    "max_output_tokens": cfg["parametros"].get("max_tokens", 8192),
                }
            mdl = genai.GenerativeModel(name, generation_config=gen_conf) if gen_conf else genai.GenerativeModel(name)
            break
        except Exception:
            mdl = None
    if mdl is None:
        try:
            models = genai.list_models()
            for m in models:
                if hasattr(m, "name"):
                    try:
                        mdl = genai.GenerativeModel(m.name)
                        break
                    except Exception:
                        continue
        except Exception:
            mdl = None
    if cfg:
        base = cfg["estrutura"]["contexto"] + "\n" + cfg["estrutura"]["formato_saida"] + "\n" + "\n".join(cfg["estrutura"]["diretivas"]) + "\n\n"
        comps = []
        for c in cfg["componentes"]:
            if c.get("ativo"):
                s = c["conteudo"].replace("{texto}", text).replace("{blocos}", serialize_blocks(blocks))
                comps.append(s)
        prompt = base + "\n".join(comps)
    else:
        prompt = (
            "Analise a transcrição em português e produza JSON com campos: "
            "resumo_conciso, pontos_chave[], topicos[], orientacoes[], secoes[{titulo,inicio,fim,conteudo}]. "
            "Foque em clareza, remova redundâncias e mantenha contexto.\n\n"
            f"TRANSCRICAO:\n{text}\n\nBLOCOS:\n{serialize_blocks(blocks)}"
        )
    def _to_json_payload(s: str) -> str:
        try:
            t = s.strip()
            if t.startswith("```"):
                t = re.sub(r"^```[a-zA-Z]*", "", t).strip()
                t = re.sub(r"```$", "", t).strip()
            m = re.search(r"\{[\s\S]*\}", t)
            if m:
                obj = json.loads(m.group(0))
            else:
                obj = json.loads(t)
            obj.setdefault("resumo_conciso", "")
            obj.setdefault("pontos_chave", [])
            obj.setdefault("topicos", [])
            obj.setdefault("orientacoes", [])
            obj.setdefault("secoes", [])
            if isinstance(obj.get("orientacoes"), list) and len(obj.get("orientacoes")) == 0:
                try:
                    from .postprocess import generate_orientacoes
                    obj["orientacoes"] = generate_orientacoes(text, max_itens=5)
                except Exception:
                    pass
            return json.dumps(obj, ensure_ascii=False)
        except Exception:
            return naive_summary(text)
    try:
        if mdl is None:
            raise RuntimeError("Modelo Gemini indisponível")
        to = cfg["parametros"].get("timeout", 60) if cfg else 60
        resp = mdl.generate_content(prompt, request_options={"timeout": to})
        return _to_json_payload(extract_response_text(resp))
    except Exception:
        return naive_summary(text)

def summarize_transcription_full(text: str, blocks: list) -> dict:
    configure()
    cfg = load_prompt()
    candidates = [
        _prefer_models_prefix(cfg["parametros"]["modelo"]) if cfg and cfg.get("parametros") and cfg["parametros"].get("modelo") else None,
        "models/gemini-2.5-pro",
        "models/gemini-2.5-flash",
        "models/gemini-2.0-flash",
    ]
    candidates = [c for c in candidates if c]
    mdl = None
    chosen = None
    last_error = ""
    for name in candidates:
        try:
            gen_conf = None
            if cfg:
                gen_conf = {
                    "temperature": cfg["parametros"].get("temperatura", 0.3),
                    "top_p": cfg["parametros"].get("top_p", 0.9),
                    "candidate_count": cfg["parametros"].get("candidate_count", 1),
                    "max_output_tokens": cfg["parametros"].get("max_tokens", 8192),
                }
            mdl = genai.GenerativeModel(name, generation_config=gen_conf) if gen_conf else genai.GenerativeModel(name)
            chosen = name
            break
        except Exception as e:
            last_error = str(e)
    base = None
    prompt = None
    if cfg:
        extra_directives = [
            "Resumo entre 200 e 300 palavras, cobrindo tópicos principais.",
            "Pontos_chave numerados (1., 2., ...) entre 7 e 15 itens.",
            "Orientacoes com 7 a 15 recomendações acionáveis (orientacoes[{passo,acao,beneficio}]).",
        ]
        base = cfg["estrutura"]["contexto"] + "\n" + cfg["estrutura"]["formato_saida"] + "\n" + "\n".join(cfg["estrutura"]["diretivas"] + extra_directives) + "\n\n"
        comps = []
        for c in cfg["componentes"]:
            if c.get("ativo"):
                s = c["conteudo"].replace("{texto}", text).replace("{blocos}", serialize_blocks(blocks))
                comps.append(s)
        prompt = base + "\n".join(comps)
    else:
        base = (
            "Analise a transcrição em português e produza JSON com campos: "
            "resumo_conciso (200-300 palavras), pontos_chave[] numerados (7-15), "
            "orientacoes[7-15]{passo,acao,beneficio}, secoes[{titulo,inicio,fim,conteudo}]. "
            "Foque em clareza, remova redundâncias e mantenha contexto.\n\n"
        )
        prompt = base + f"TRANSCRICAO:\n{text}\n\nBLOCOS:\n{serialize_blocks(blocks)}"
    
    def _to_obj(s: str) -> dict:
        try:
            t = s.strip()
            if t.startswith("```"):
                t = re.sub(r"^```[a-zA-Z]*", "", t).strip()
            if t.endswith("```"):
                t = re.sub(r"```$", "", t).strip()
            m = re.search(r"\{[\s\S]*\}", t)
            if not m:
                obj = json.loads(t)
            else:
                obj = json.loads(m.group(0))
            obj.setdefault("resumo_conciso", "")
            obj.setdefault("pontos_chave", [])
            obj.setdefault("topicos", [])
            obj.setdefault("orientacoes", [])
            obj.setdefault("secoes", [])
            return obj
        except Exception:
            return json.loads(naive_summary(text))
    
    def _quality(obj: dict) -> dict:
        resumo = (obj.get("resumo_conciso") or "").strip()
        pontos = obj.get("pontos_chave") or []
        orient = obj.get("orientacoes") or []
        words = len([w for w in resumo.split() if w])
        return {
            "resumo_ok": 200 <= words <= 300,
            "pontos_ok": 7 <= len(pontos) <= 15,
            "orient_ok": 7 <= len(orient) <= 15,
            "words": words,
            "pontos": len(pontos),
            "orient": len(orient),
        }
    
    try:
        if mdl is None:
            raise RuntimeError("Modelo Gemini indisponível: " + last_error)
        to = cfg["parametros"].get("timeout", 60) if cfg else 60
        resp = mdl.generate_content(prompt, request_options={"timeout": to})
        raw = extract_response_text(resp)
        obj = _to_obj(raw)
        q = _quality(obj)
        if not (q["resumo_ok"] and q["pontos_ok"] and q["orient_ok"]):
            strict_directives = [
                "ATENÇÃO: Siga estritamente — Resumo entre 200 e 300 palavras.",
                "ATENÇÃO: Pontos_chave numerados, 7 a 15 itens.",
                "ATENÇÃO: Orientacoes 7 a 15, cada com {passo,acao,beneficio}.",
            ]
            base2 = (cfg and cfg["estrutura"]["contexto"] or "") + "\n" + (cfg and cfg["estrutura"]["formato_saida"] or "") + "\n" + "\n".join((cfg and cfg["estrutura"]["diretivas"] or []) + strict_directives) + "\n\n"
            comps2 = [c["conteudo"].replace("{texto}", text).replace("{blocos}", serialize_blocks(blocks)) for c in (cfg and cfg["componentes"] or []) if c.get("ativo")]
            prompt2 = base2 + "\n".join(comps2) if comps2 else prompt
            name2 = "models/gemini-2.5-pro" if (chosen != "models/gemini-2.5-pro") else chosen
            try:
                mdl2 = genai.GenerativeModel(name2)
                resp2 = mdl2.generate_content(prompt2, request_options={"timeout": max(to, 45)})
                raw2 = extract_response_text(resp2) or raw
                obj2 = _to_obj(raw2)
                obj, raw = obj2, raw2
                chosen = name2
            except Exception:
                pass
        return {
            "data": obj,
            "raw": raw,
            "model": chosen or "unknown",
            "prompt": prompt,
            "origin": "gemini",
            "error": "",
        }
    except Exception as e:
        return {
            "data": {"resumo_conciso": "", "pontos_chave": [], "topicos": [], "orientacoes": [], "secoes": []},
            "raw": "",
            "model": "",
            "prompt": prompt if prompt else "",
            "origin": "failed",
            "error": str(e),
        }

def parse_raw_json(raw: str) -> dict:
    try:
        t = (raw or "").strip()
        if t.startswith("```"):
            t = re.sub(r"^```[a-zA-Z]*", "", t).strip()
        if t.endswith("```"):
            t = re.sub(r"```$", "", t).strip()
        m = re.search(r"\{[\s\S]*\}", t)
        obj = json.loads(m.group(0) if m else t)
        obj.setdefault("resumo_conciso", "")
        obj.setdefault("pontos_chave", [])
        obj.setdefault("topicos", [])
        obj.setdefault("orientacoes", [])
        obj.setdefault("secoes", [])
        return obj
    except Exception:
        return {}

def naive_summary(text: str) -> str:
    sents = re.split(r"(?<=[\\.!?])\\s+", text)
    uniq = []
    seen = set()
    for s in sents:
        k = s.strip().lower()
        if not k or k in seen:
            continue
        seen.add(k)
        uniq.append(s.strip())
        if len(uniq) >= 6:
            break
    data = {
        "resumo_conciso": " ".join(uniq[:3]),
        "pontos_chave": uniq,
        "topicos": [],
        "orientacoes": [],
        "secoes": [],
    }
    import json
    return json.dumps(data, ensure_ascii=False)
