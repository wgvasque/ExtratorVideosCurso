import os
import json
import datetime
import uuid

def now_iso():
    return datetime.datetime.now().replace(microsecond=0).isoformat()

def load(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save(data: dict, path: str):
    data["metadata"]["modificado_em"] = now_iso()
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=2))
    os.replace(tmp, path)

def validate(data: dict):
    assert isinstance(data.get("metadata"), dict)
    assert isinstance(data.get("parametros"), dict)
    assert isinstance(data.get("estrutura"), dict)
    assert isinstance(data.get("componentes"), list)
    assert isinstance(data.get("historico"), list)
    assert isinstance(data.get("desempenho"), list)

def edit_section(data: dict, secao: str, novo_conteudo: str):
    data["estrutura"][secao] = novo_conteudo
    return data

def add_component(data: dict, componente: dict):
    data["componentes"].append(componente)
    return data

def remove_component(data: dict, comp_id: str):
    data["componentes"] = [c for c in data["componentes"] if c.get("id") != comp_id]
    return data

def toggle_component(data: dict, comp_id: str, ativo: bool):
    for c in data["componentes"]:
        if c.get("id") == comp_id:
            c["ativo"] = bool(ativo)
    return data

def set_params(data: dict, **kwargs):
    for k, v in kwargs.items():
        data["parametros"][k] = v
    return data

def snapshot_version(data: dict, motivo: str, versions_dir: str):
    v = int(data["metadata"]["versao"]) + 1
    data["metadata"]["versao"] = v
    entry = {"versao": v, "data": now_iso(), "autor": data["metadata"].get("autor"), "alteracoes": motivo, "motivo": motivo}
    data["historico"].append(entry)
    os.makedirs(versions_dir, exist_ok=True)
    p = os.path.join(versions_dir, f"versao_{v}.json")
    with open(p, "w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=2))
    return data

def revert_to(path: str, versions_dir: str, versao: int):
    p = os.path.join(versions_dir, f"versao_{versao}.json")
    base = load(p)
    base["metadata"]["versao"] = int(base["metadata"]["versao"]) + 1
    base["historico"].append({"versao": base["metadata"]["versao"], "data": now_iso(), "autor": base["metadata"].get("autor"), "alteracoes": "revert", "motivo": "revert"})
    save(base, path)
    return base

def record_performance(data: dict, versao: int, metricas: dict, observacoes: str):
    data["desempenho"].append({"versao": versao, "timestamp": now_iso(), "metricas": metricas, "observacoes": observacoes})
    return data
