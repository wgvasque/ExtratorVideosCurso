import copy

def optimize_for_summary(data: dict):
    d = copy.deepcopy(data)
    d["parametros"]["temperatura"] = 0.2
    d["parametros"]["top_p"] = 0.9
    d["estrutura"]["diretivas"] = ["Remova redundâncias", "Mantenha contexto e fidelidade", "Seja claro e direto"]
    return d

def create_variant(data: dict, nome: str, ajustes: dict):
    d = copy.deepcopy(data)
    for k, v in (ajustes or {}).items():
        if k in d["parametros"]:
            d["parametros"][k] = v
        elif k in d["estrutura"]:
            d["estrutura"][k] = v
    d["metadata"]["nome"] = nome
    return d

def diff_versions(v1: dict, v2: dict):
    out = {}
    for k in ["parametros", "estrutura"]:
        out[k] = {}
        a = v1.get(k) or {}
        b = v2.get(k) or {}
        keys = set(list(a.keys()) + list(b.keys()))
        for kk in keys:
            if a.get(kk) != b.get(kk):
                out[k][kk] = {"from": a.get(kk), "to": b.get(kk)}
    return out
