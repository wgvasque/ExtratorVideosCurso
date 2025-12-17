import os
import google.generativeai as genai
import re
import json
from . import prompt_loader

def configure():
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY ausente")
    genai.configure(api_key=key)

def load_prompt():
    """
    Carrega configuração do prompt.
    Suporta seleção via variável de ambiente PROMPT_MODEL:
    - 'modelo2' ou 'model2' -> usa PROMPT_MODELO2_PATH (padrão: prompt_padrao.json)
    - 'modelo4' ou 'model4' -> usa PROMPT_MODELO4_PATH (padrão: prompt_modelo4.json)
    
    PROMPT_PATH sobrescreve tudo se definido.
    """
    # Verificar se há override direto via PROMPT_PATH
    direct_path = os.getenv("PROMPT_PATH")
    if direct_path:
        try:
            with open(direct_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Erro ao carregar PROMPT_PATH={direct_path}: {e}")
    
    # Verificar seleção de modelo
    prompt_model = os.getenv("PROMPT_MODEL", "modelo2").lower()
    
    # Determinar arquivo baseado no modelo
    if prompt_model in ["modelo4", "model4", "4", "hibrido", "hybrid"]:
        default_path = os.getenv("PROMPT_MODELO4_PATH", "prompt_modelo4.json")
    else:
        default_path = os.getenv("PROMPT_MODELO2_PATH", "prompt_padrao.json")
    
    try:
        with open(default_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️ Erro ao carregar {default_path}: {e}")
        # Fallback para prompt_padrao.json
        try:
            fallback = "prompt_padrao.json"
            with open(fallback, "r", encoding="utf-8") as f:
                print(f"✅ Usando fallback: {fallback}")
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

def build_modelo2_prompt(cfg: dict, text: str, blocks: list) -> str:
    """Constrói prompt completo baseado no Modelo 2 (14 seções)"""
    if not cfg or "prompt" not in cfg:
        return build_fallback_prompt(text, blocks)
    
    prompt_cfg = cfg["prompt"]
    parts = []
    
    # Instruções iniciais
    parts.append(prompt_cfg.get("instrucoes_iniciais", ""))
    parts.append("")
    
    # Princípios obrigatórios
    parts.append("### Princípios obrigatórios:")
    parts.append("")
    for principio in prompt_cfg.get("principios_obrigatorios", []):
        parts.append(f"- {principio}")
    parts.append("")
    
    # Tipos de vídeo suportados
    parts.append("### Funciona para qualquer tipo de vídeo:")
    parts.append("")
    for tipo in prompt_cfg.get("tipos_video_suportados", []):
        parts.append(f"✓ {tipo}")
    parts.append("")
    parts.append("---")
    parts.append("")
    
    # Seções (1-14)
    for secao in prompt_cfg.get("secoes", []):
        parts.append(f"## SEÇÃO {secao['id']}: {secao['titulo'].upper()}")
        parts.append("")
        parts.append(secao.get("descricao", ""))
        parts.append("")
        
        # Campos específicos de cada seção
        if "campos" in secao:
            parts.append("**Inclua:**")
            for campo in secao["campos"]:
                parts.append(f"- {campo}")
            parts.append("")
        
        if "campos_por_conceito" in secao:
            parts.append("**Para cada conceito:**")
            for campo in secao["campos_por_conceito"]:
                parts.append(f"- {campo}")
            parts.append("")
        
        if "campos_por_elemento" in secao:
            parts.append("**Para cada elemento:**")
            for campo in secao["campos_por_elemento"]:
                parts.append(f"- {campo}")
            parts.append("")
        
        if "campos_por_exemplo" in secao:
            parts.append("**Para cada exemplo:**")
            for campo in secao["campos_por_exemplo"]:
                parts.append(f"- {campo}")
            parts.append("")
        
        if "campos_por_item" in secao:
            parts.append("**Para cada item:**")
            for campo in secao["campos_por_item"]:
                parts.append(f"- {campo}")
            parts.append("")
        
        if "campos_por_tarefa" in secao:
            parts.append("**Para cada tarefa:**")
            for campo in secao["campos_por_tarefa"]:
                parts.append(f"- {campo}")
            parts.append("")
        
        if "campos_por_material" in secao:
            parts.append("**Para cada material:**")
            for campo in secao["campos_por_material"]:
                parts.append(f"- {campo}")
            parts.append("")
        
        if "extensao" in secao:
            parts.append(f"**Extensão:** {secao['extensao']}")
            parts.append("")
        
        if "formato" in secao:
            parts.append(f"**Formato:** {secao['formato']}")
            parts.append("")
        
        if "nota" in secao:
            parts.append(f"*{secao['nota']}*")
            parts.append("")
        
        if "fallback" in secao:
            parts.append(f"*Se não houver, escreva:* **\"{secao['fallback']}\"**")
            parts.append("")
        
        parts.append("---")
        parts.append("")
    
    # Instruções finais
    parts.append("## INSTRUÇÕES FINAIS")
    parts.append("")
    parts.append("### Ao executar a transcrição, siga estas regras:")
    parts.append("")
    for i, instrucao in enumerate(prompt_cfg.get("instrucoes_finais", []), 1):
        parts.append(f"{i}. {instrucao}")
    parts.append("")
    parts.append("---")
    parts.append("")
    
    # Formato de saída
    parts.append("## FORMATO DE SAÍDA")
    parts.append("")
    parts.append(prompt_cfg.get("formato_saida", "Retorne JSON válido."))
    parts.append("")
    parts.append("---")
    parts.append("")
    
    # Componentes ativos (transcrição/blocos)
    for comp in cfg.get("componentes", []):
        if comp.get("ativo"):
            conteudo = comp["conteudo"]
            conteudo = conteudo.replace("{texto}", text)
            conteudo = conteudo.replace("{blocos}", serialize_blocks(blocks))
            parts.append(conteudo)
            parts.append("")
    
    return "\n".join(parts)

def build_fallback_prompt(text: str, blocks: list) -> str:
    """Prompt de fallback se não houver configuração"""
    return (
        "Analise a transcrição em português e produza JSON com campos: "
        "resumo_conciso, pontos_chave[], topicos[], orientacoes[], secoes[{titulo,inicio,fim,conteudo}]. "
        "Foque em clareza, remova redundâncias e mantenha contexto.\n\n"
        f"TRANSCRICAO:\n{text}\n\nBLOCOS:\n{serialize_blocks(blocks)}"
    )

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

def parse_modelo2_response(raw: str) -> dict:
    """Parse resposta do Modelo 2 (14 seções)"""
    try:
        t = raw.strip()
        if t.startswith("```"):
            t = re.sub(r"^```[a-zA-Z]*", "", t).strip()
            t = re.sub(r"```$", "", t).strip()
        
        m = re.search(r"\{[\s\S]*\}", t)
        if m:
            obj = json.loads(m.group(0))
        else:
            obj = json.loads(t)
        
        # Garantir campos do Modelo 2
        obj.setdefault("resumo_executivo", "")
        obj.setdefault("objetivos_aprendizagem", [])
        obj.setdefault("conceitos_fundamentais", [])
        obj.setdefault("estrutura_central", [])
        obj.setdefault("exemplos", [])
        obj.setdefault("ferramentas_metodos", [])
        obj.setdefault("orientacoes_praticas", {})
        obj.setdefault("abordagem_pedagogica", {})
        obj.setdefault("ideias_chave", [])
        obj.setdefault("pontos_memorizacao", {})
        obj.setdefault("citacoes_marcantes", [])
        obj.setdefault("proximos_passos", {})
        obj.setdefault("preparacao_proxima_aula", "")
        obj.setdefault("materiais_apoio", [])
        
        return obj
    except Exception:
        return {

}

def parse_modelo4_response(raw: str) -> dict:
    """Parse resposta do Modelo 4 (JSON enriquecido com framework P.R.O.M.P.T.)"""
    try:
        t = raw.strip()
        if t.startswith("```"):
            t = re.sub(r"^```[a-zA-Z]*", "", t).strip()
            t = re.sub(r"```$", "", t).strip()
        
        m = re.search(r"\{[\s\S]*\}", t)
        obj = json.loads(m.group(0)) if m else json.loads(t)
        
        # Campos obrigatórios
        obj.setdefault("resumo_executivo", "")
        obj.setdefault("objetivos_aprendizagem", [])
        obj.setdefault("conceitos_fundamentais", [])
        obj.setdefault("estrutura_central", [])
        obj.setdefault("exemplos", [])
        obj.setdefault("ferramentas_metodos", [])
        obj.setdefault("orientacoes_praticas", {"acao_imediata": [], "acao_curto_prazo": [], "acao_medio_prazo": []})
        obj.setdefault("abordagem_pedagogica", {"tom": "", "ritmo": "", "recursos_didaticos": [], "tecnicas_reforco": [], "engajamento": [], "principios_andragogicos": [], "estrutura_apresentacao": ""})
        obj.setdefault("ideias_chave", {"insights_principais": [], "principios_estrategicos": [], "alertas_armadilhas": [], "mindset_recomendado": []})
        obj.setdefault("pontos_memorizacao", {"pilares": [], "regras_de_ouro": {"fazer": [], "nao_fazer": []}, "formulas_estruturas": [], "principios_repetidos": []})
        obj.setdefault("citacoes_marcantes", [])
        obj.setdefault("proximos_passos", {"acao_imediata": [], "acao_curto_prazo": [], "acao_medio_prazo": [], "acao_continua": []})
        obj.setdefault("preparacao_proxima_aula", {})
        obj.setdefault("materiais_apoio", [])
        obj.setdefault("_metadados_modelo4", {"framework": "P.R.O.M.P.T.", "versao": "3.0", "temperatura": 0.0, "self_consistency_executado": True, "protocolo_conflito_ativo": True, "anti_alucinacao": "rigorosa"})
        obj["_modelo"] = "modelo4"
        
        return obj
    except Exception as e:
        print(f"⚠️ Erro ao parsear Modelo 4: {e}")
        return {}

def summarize_transcription(text: str, blocks: list):
    """Versão legada - mantida para retrocompatibilidade"""
    configure()
    cfg = load_prompt()
    
    # Suporta modelo_gemini (novo) ou modelo (legado)
    modelo_cfg = None
    if cfg and cfg.get("parametros"):
        modelo_cfg = cfg["parametros"].get("modelo_gemini") or cfg["parametros"].get("modelo")
    
    candidates = [
        _prefer_models_prefix(modelo_cfg) if modelo_cfg else None,
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
    
    # Construir prompt
    if cfg and "prompt" in cfg:
        prompt = build_modelo2_prompt(cfg, text, blocks)
    else:
        prompt = build_fallback_prompt(text, blocks)
    
    def _to_json_payload(s: str) -> str:
        try:
            obj = parse_modelo2_response(s)
            if not obj:
                return naive_summary(text)
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

def summarize_transcription_full(text: str, blocks: list, prompt_template: str = None) -> dict:
    """
    Gera resumo completo usando Modelo 2 (14 seções)
    
    Args:
        text: Transcrição do vídeo
        blocks: Blocos de metadados
        prompt_template: Nome do template de prompt (opcional). Se fornecido, usa prompt_loader.
                        Se None, usa sistema JSON legado (load_prompt)
    """
    configure()
    
    # Determinar qual sistema de prompt usar
    prompt_text = None
    if prompt_template:
        # Usar novo sistema de prompt_loader
        print(f"📝 Usando template de prompt: {prompt_template}")
        prompt_text = prompt_loader.get_prompt_for_processing(prompt_template, text)
        if not prompt_text:
            print(f"⚠️ Template '{prompt_template}' não encontrado, usando sistema legado")
            prompt_template = None  # Fallback para sistema legado
    
    # Se não usar prompt_template, usar sistema JSON legado
    cfg = None
    if not prompt_template:
        cfg = load_prompt()
    
    # Suporta modelo_gemini (novo) ou modelo (legado)
    modelo_cfg = None
    if cfg and cfg.get("parametros"):
        modelo_cfg = cfg["parametros"].get("modelo_gemini") or cfg["parametros"].get("modelo")
    
    candidates = [
        _prefer_models_prefix(modelo_cfg) if modelo_cfg else None,
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
                    "max_output_tokens": cfg["parametros"].get("max_tokens", 16384),
                }
            mdl = genai.GenerativeModel(name, generation_config=gen_conf) if gen_conf else genai.GenerativeModel(name)
            chosen = name
            break
        except Exception as e:
            last_error = str(e)
    
    # Construir prompt
    if prompt_text:
        # Usar prompt do template (já formatado com transcrição)
        prompt = prompt_text
    elif cfg and "prompt" in cfg:
        # Usar sistema JSON legado
        prompt = build_modelo2_prompt(cfg, text, blocks)
    else:
        prompt = build_fallback_prompt(text, blocks)
    
    try:
        if mdl is None:
            raise RuntimeError("Modelo Gemini indisponível: " + last_error)
        
        to = cfg["parametros"].get("timeout", 120) if cfg else 120
        resp = mdl.generate_content(prompt, request_options={"timeout": to})
        raw = extract_response_text(resp)
        
        # Detectar qual modelo de prompt está sendo usado
        prompt_model = os.getenv("PROMPT_MODEL", "modelo2").lower()
        
        # Usar parser apropriado
        if prompt_model in ["modelo4", "model4", "4", "hibrido", "hybrid"]:
            print(f"🎯 Usando parser do Modelo 4 (framework P.R.O.M.P.T.)")
            obj = parse_modelo4_response(raw)
        else:
            print(f"📊 Usando parser do Modelo 2 (padrão)")
            obj = parse_modelo2_response(raw)
        
        if not obj:
            obj = json.loads(naive_summary(text))
        
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
            "data": {},
            "raw": "",
            "model": "",
            "prompt": prompt if 'prompt' in locals() else "",
            "origin": "failed",
            "error": str(e),
        }

def parse_raw_json(raw: str) -> dict:
    """Parse JSON bruto - suporta Modelo 2 e formato legado"""
    try:
        obj = parse_modelo2_response(raw)
        if obj:
            return obj
        
        # Fallback para formato legado
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
    """Resumo básico quando LLM falha"""
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
    return json.dumps(data, ensure_ascii=False)
