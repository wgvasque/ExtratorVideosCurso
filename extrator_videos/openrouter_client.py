"""
Cliente para integração com OpenRouter.ai
Permite usar múltiplos modelos LLM através de uma única API
Agora utiliza configuração unificada do prompt_padrao.json
"""
import os
import requests
import json
import re
from typing import Dict, List, Optional
from . import prompt_loader

# Importar load_prompt do gemini_client para configuração unificada
def _load_prompt_config():
    """
    Carrega configuração do prompt JSON (mesmo usado pelo Gemini)
    Usa PROMPT_PATH, PROMPT_MODEL, PROMPT_MODELO2_PATH e PROMPT_MODELO4_PATH
    """
    # Verificar override direto
    direct_path = os.getenv("PROMPT_PATH")
    if direct_path:
        try:
            with open(direct_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    
    # Verificar seleção de modelo
    prompt_model = os.getenv("PROMPT_MODEL", "modelo2").lower()
    
    if prompt_model in ["modelo4", "model4", "4", "hibrido", "hybrid"]:
        default_path = os.getenv("PROMPT_MODELO4_PATH", "prompt_modelo4.json")
    else:
        default_path = os.getenv("PROMPT_MODELO2_PATH", "prompt_padrao.json")
    
    try:
        with open(default_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        # Fallback
        try:
            with open("prompt_padrao.json", "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

def _build_prompt_from_config(cfg: dict, text: str, blocks: List[dict], use_blocks: bool) -> str:
    """Constrói prompt a partir da configuração JSON unificada"""
    if not cfg:
        # Fallback para prompt hardcoded se não houver config
        return _build_fallback_prompt(text, blocks, use_blocks)
    
    # Usar mesma função do gemini_client para garantir consistência
    try:
        from .gemini_client import build_modelo2_prompt
        return build_modelo2_prompt(cfg, text, blocks)
    except Exception:
        # Fallback se importação falhar
        return _build_fallback_prompt(text, blocks, use_blocks)


def _build_fallback_prompt(text: str, blocks: List[dict], use_blocks: bool) -> str:
    """Prompt de fallback se não houver configuração JSON"""
    prompt_parts = [
        "Analise a transcrição em português e produza um resumo estruturado.",
        "",
        "Retorne APENAS um objeto JSON válido com os seguintes campos:",
        "- resumo_conciso: string com 200-300 palavras resumindo os principais tópicos",
        "- pontos_chave: array com 7-15 strings, cada uma sendo um ponto-chave numerado",
        "- topicos: array com 3-7 strings representando os tópicos principais",
        "- orientacoes: array com 7-15 objetos, cada um com {passo, acao, beneficio}",
        "- secoes: array com objetos {titulo, inicio, fim, conteudo}",
        "",
        "IMPORTANTE:",
        "- Mantenha fidelidade ao conteúdo original",
        "- Evite redundâncias e jargões",
        "- Priorize recomendações práticas e acionáveis",
        "",
        "TRANSCRIÇÃO:",
        text,
    ]
    return "\n".join(prompt_parts)

def summarize_with_openrouter(
    text: str, 
    blocks: List[dict], 
    model: Optional[str] = None,
    use_blocks: bool = False,
    prompt_template: str = None
) -> Dict:
    """
    Gera resumo estruturado usando OpenRouter.ai
    
    Args:
        text: Texto da transcrição
        blocks: Blocos segmentados com timestamps (opcional)
        model: Modelo a usar (padrão: variável de ambiente ou gpt-4o-mini)
        use_blocks: Se True, inclui blocos no prompt (aumenta tamanho)
        prompt_template: Nome do template de prompt (opcional). Se fornecido, usa prompt_loader.
    
    Returns:
        Dict com: data, raw, model, prompt, origin, error
    
    Modelos recomendados:
        - openai/gpt-4o-mini: Rápido e barato ($0.15/1M tokens)
        - anthropic/claude-3.5-sonnet: Melhor qualidade ($3/1M tokens)
        - google/gemini-2.0-flash-exp: Gratuito (experimental)
        - meta-llama/llama-3.1-70b-instruct: Open source, bom custo-benefício
    """
    # Obter configurações
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY não configurada no arquivo .env")
    
    # Determinar qual sistema de prompt usar
    prompt = None
    cfg = None
    
    if prompt_template:
        # Usar novo sistema de prompt_loader
        print(f"📝 Usando template de prompt: {prompt_template}")
        prompt = prompt_loader.get_prompt_for_processing(prompt_template, text)
        if not prompt:
            print(f"⚠️ Template '{prompt_template}' não encontrado, usando sistema legado")
            prompt_template = None  # Fallback para sistema legado
    
    # Se não usar prompt_template, usar sistema JSON legado
    if not prompt_template:
        cfg = _load_prompt_config()
        parametros = cfg.get("parametros", {}) if cfg else {}
        
        # Determinar modelo (prioridade: argumento > JSON > .env > padrão)
        if model is None:
            model = parametros.get("modelo_openrouter") or os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
        
        # Construir prompt usando configuração unificada
        prompt = _build_prompt_from_config(cfg, text, blocks, use_blocks)
        
        # Obter parâmetros (prioridade: JSON > .env > padrão)
        temperatura = parametros.get("temperatura") or float(os.getenv("OPENROUTER_TEMPERATURE", "0.3"))
        max_tokens = parametros.get("max_tokens") or int(os.getenv("OPENROUTER_MAX_TOKENS", "4096"))
        timeout = parametros.get("timeout") or int(os.getenv("OPENROUTER_TIMEOUT", "60"))
    else:
        # Usar valores padrão quando usar prompt_template
        if model is None:
            model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
        temperatura = float(os.getenv("OPENROUTER_TEMPERATURE", "0.3"))
        max_tokens = int(os.getenv("OPENROUTER_MAX_TOKENS", "4096"))
        timeout = int(os.getenv("OPENROUTER_TIMEOUT", "60"))
    
    # Preparar requisição
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "https://github.com/video-transcription"),
        "X-Title": "Video Transcription Summarizer",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "Você é um assistente especializado em criar resumos estruturados de transcrições de vídeos em português. Sempre retorne JSON válido."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": temperatura,
        "max_tokens": max_tokens,
    }
    
    # Adicionar response_format se o modelo suportar
    if "gpt" in model.lower() or "claude" in model.lower():
        payload["response_format"] = {"type": "json_object"}
    
    # Fazer requisição
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=int(os.getenv("OPENROUTER_TIMEOUT", "60"))
        )
        
        if response.status_code != 200:
            error_msg = f"OpenRouter API error {response.status_code}: {response.text}"
            return {
                "data": {},
                "raw": "",
                "model": model,
                "prompt": prompt,
                "origin": "openrouter_failed",
                "error": error_msg,
            }
        
        result = response.json()
        raw_text = result["choices"][0]["message"]["content"]
        
        # Parse JSON da resposta
        try:
            # Usar mesma função de parse do gemini_client
            # Detectar modelo e usar parser apropriado
            prompt_model = os.getenv("PROMPT_MODEL", "modelo2").lower()
            
            if prompt_model in ["modelo4", "model4", "4", "hibrido", "hybrid"]:
                from .gemini_client import parse_modelo4_response
                data = parse_modelo4_response(raw_text)
            else:
                from .gemini_client import parse_modelo2_response
                data = parse_modelo2_response(raw_text)
            
            if not data:
                # Fallback para parse manual
                clean_text = raw_text.strip()
                if clean_text.startswith("```"):
                    clean_text = re.sub(r"^```[a-zA-Z]*\n", "", clean_text)
                    clean_text = re.sub(r"\n```$", "", clean_text)
                
                try:
                    data = json.loads(clean_text)
                except json.JSONDecodeError:
                    match = re.search(r'\{[\s\S]*\}', clean_text)
                    if match:
                        data = json.loads(match.group(0))
                    else:
                        raise ValueError("Não foi possível extrair JSON da resposta")
            
            # Garantir campos obrigatórios do Modelo 2
            data.setdefault("resumo_executivo", data.get("resumo_conciso", ""))
            data.setdefault("objetivos_aprendizagem", [])
            data.setdefault("conceitos_fundamentais", [])
            data.setdefault("estrutura_central", [])
            data.setdefault("exemplos", [])
            data.setdefault("ferramentas_metodos", [])
            data.setdefault("orientacoes_praticas", data.get("orientacoes", {}))
            data.setdefault("abordagem_pedagogica", {})
            data.setdefault("ideias_chave", [])
            data.setdefault("pontos_memorizacao", {})
            data.setdefault("citacoes_marcantes", [])
            data.setdefault("proximos_passos", {})
            data.setdefault("preparacao_proxima_aula", "")
            data.setdefault("materiais_apoio", [])
            
            # Manter campos legados para retrocompatibilidade
            data.setdefault("resumo_conciso", data.get("resumo_executivo", ""))
            data.setdefault("pontos_chave", [])
            data.setdefault("topicos", [])
            data.setdefault("secoes", [])

            
            return {
                "data": data,
                "raw": raw_text,
                "model": model,
                "prompt": prompt,
                "origin": "openrouter",
                "error": "",
            }
            
        except Exception as e:
            return {
                "data": {},
                "raw": raw_text,
                "model": model,
                "prompt": prompt,
                "origin": "openrouter_parse_failed",
                "error": f"Erro ao fazer parse do JSON: {str(e)}",
            }
    
    except requests.exceptions.Timeout:
        return {
            "data": {},
            "raw": "",
            "model": model,
            "prompt": prompt,
            "origin": "openrouter_timeout",
            "error": "Timeout na requisição para OpenRouter",
        }
    except Exception as e:
        return {
            "data": {},
            "raw": "",
            "model": model,
            "prompt": prompt,
            "origin": "openrouter_error",
            "error": f"Erro na requisição: {str(e)}",
        }


def list_available_models() -> List[str]:
    """
    Lista modelos disponíveis no OpenRouter
    
    Returns:
        Lista de IDs de modelos recomendados
    """
    return [
        "openai/gpt-4o-mini",  # Rápido e barato
        "openai/gpt-4o",  # Melhor da OpenAI
        "anthropic/claude-3.5-sonnet",  # Excelente qualidade
        "anthropic/claude-3-haiku",  # Rápido e barato (Anthropic)
        "google/gemini-2.0-flash-exp",  # Gratuito (experimental)
        "meta-llama/llama-3.1-70b-instruct",  # Open source
        "mistralai/mistral-large",  # Europeu, bom custo-benefício
    ]


def get_model_info(model: str) -> Dict:
    """
    Retorna informações sobre um modelo
    
    Args:
        model: ID do modelo
    
    Returns:
        Dict com informações do modelo
    """
    models_info = {
        "openai/gpt-4o-mini": {
            "name": "GPT-4o Mini",
            "provider": "OpenAI",
            "cost_input": 0.15,  # USD per 1M tokens
            "cost_output": 0.60,
            "speed": "very_fast",
            "quality": "excellent",
        },
        "openai/gpt-4o": {
            "name": "GPT-4o",
            "provider": "OpenAI",
            "cost_input": 2.50,
            "cost_output": 10.00,
            "speed": "fast",
            "quality": "superior",
        },
        "anthropic/claude-3.5-sonnet": {
            "name": "Claude 3.5 Sonnet",
            "provider": "Anthropic",
            "cost_input": 3.00,
            "cost_output": 15.00,
            "speed": "fast",
            "quality": "superior",
        },
        "anthropic/claude-3-haiku": {
            "name": "Claude 3 Haiku",
            "provider": "Anthropic",
            "cost_input": 0.25,
            "cost_output": 1.25,
            "speed": "very_fast",
            "quality": "good",
        },
        "google/gemini-2.0-flash-exp": {
            "name": "Gemini 2.0 Flash (Experimental)",
            "provider": "Google",
            "cost_input": 0.00,
            "cost_output": 0.00,
            "speed": "very_fast",
            "quality": "good",
        },
    }
    
    return models_info.get(model, {
        "name": model,
        "provider": "Unknown",
        "cost_input": 0,
        "cost_output": 0,
        "speed": "unknown",
        "quality": "unknown",
    })


def validate_summary_quality(data: Dict) -> tuple[bool, str]:
    """
    Valida se o resumo gerado tem qualidade mínima aceitável
    Suporta Modelo 2 (14 seções) e formato legado
    
    Args:
        data: Dicionário com dados do resumo
    
    Returns:
        Tupla (is_valid, reason)
    """
    # Verificar campos obrigatórios
    if not data:
        return False, "Dados vazios"
    
    # Suportar Modelo 2/4 e formato legado
    resumo = data.get("resumo_executivo") or data.get("resumo_conciso", "")
    pontos = data.get("pontos_chave", [])
    objetivos = data.get("objetivos_aprendizagem", [])  # Modelo 2/4
    orientacoes = data.get("orientacoes_praticas") or data.get("orientacoes", [])
    
    # Validar resumo
    resumo_words = len(resumo.split())
    if resumo_words < 20:  # Reduzido de 30 para 20
        return False, f"Resumo muito curto ({resumo_words} palavras, mínimo 20)"
    
    if resumo_words > 1000:  # Aumentado de 500 para 1000 (Modelo 4 pode ser mais longo)
        return False, f"Resumo muito longo ({resumo_words} palavras, máximo 1000)"
    
    # Validar pontos-chave OU objetivos (mais flexível para Modelo 2/4)
    # Aceitar se tiver pelo menos 1 ponto-chave OU 1 objetivo
    total_pontos = len(pontos) + len(objetivos)
    if total_pontos < 1:  # Reduzido de 2 para 1
        return False, f"Sem pontos-chave ou objetivos ({total_pontos}, mínimo 1)"
    
    # Validar orientações (mais flexível para Modelo 2)
    if isinstance(orientacoes, dict):
        # Modelo 2: orientacoes_praticas é um objeto
        total_orientacoes = 0
        for key in ["acao_imediata", "acao_curto_prazo", "acao_medio_prazo"]:
            if key in orientacoes:
                items = orientacoes[key]
                if isinstance(items, list):
                    total_orientacoes += len(items)
        
        # Orientações são opcionais - não falhar se não houver
        # (alguns vídeos podem não ter orientações práticas)
    elif isinstance(orientacoes, list):
        # Formato legado: orientacoes é uma lista
        # Também tornar opcional
        if len(orientacoes) > 0:
            # Validar estrutura das orientações apenas se houver
            for i, orient in enumerate(orientacoes):
                if not isinstance(orient, dict):
                    return False, f"Orientação {i+1} não é um objeto"
                
                if "acao" not in orient or not orient["acao"]:
                    return False, f"Orientação {i+1} sem ação"
    
    return True, "OK"



def get_fallback_models() -> List[str]:
    """
    Retorna lista de modelos em ordem de prioridade para fallback
    
    Detecta automaticamente se o prompt é complexo (modelo4) e usa
    modelos premium mais capazes quando necessário.
    
    Prioridade:
    1. modelos_fallback_premium (se prompt complexo + usar_premium_automaticamente)
    2. modelos_fallback do prompt JSON
    3. OPENROUTER_FALLBACK_MODELS do .env
    4. Lista padrão hardcoded
    
    Returns:
        Lista de IDs de modelos
    """
    cfg = _load_prompt_config()
    
    # Detectar se é prompt complexo (modelo4 ou modelo3)
    prompt_model = os.getenv("PROMPT_MODEL", "modelo2").lower()
    is_complex_prompt = prompt_model in ["modelo4", "modelo3", "modelo_4", "modelo_3"]
    
    # Verificar se deve usar premium automaticamente para prompts complexos
    if cfg and cfg.get("parametros"):
        params = cfg["parametros"]
        usar_premium = params.get("usar_premium_automaticamente", False)
        
        # Se é prompt complexo E deve usar premium automaticamente
        if is_complex_prompt and usar_premium:
            modelos_premium = params.get("modelos_fallback_premium")
            if isinstance(modelos_premium, list) and len(modelos_premium) > 0:
                print(f"[INFO] Prompt complexo ({prompt_model}) detectado - usando modelos premium")
                return modelos_premium
        
        # Fallback normal: modelos_fallback do JSON
        modelos_json = params.get("modelos_fallback")
        if isinstance(modelos_json, list) and len(modelos_json) > 0:
            return modelos_json
    
    # 2. Fallback: Configuração do .env
    custom_models = os.getenv("OPENROUTER_FALLBACK_MODELS", "")
    if custom_models:
        return [m.strip() for m in custom_models.split(",") if m.strip()]
    
    # 3. Lista padrão: gratuitos primeiro, depois pagos
    return [
        # Tier 1: Gratuitos de alta qualidade
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-v3-0324:free",
        
        # Tier 2: Pagos baratos
        "openai/gpt-4o-mini",
        "anthropic/claude-3-haiku",
        
        # Tier 3: Pagos premium
        "anthropic/claude-3.5-sonnet",
        "openai/gpt-4o",
    ]


def summarize_with_fallback(
    text: str,
    blocks: List[dict],
    use_blocks: bool = False,
    max_attempts: int = None
) -> Dict:
    """
    Tenta gerar resumo com múltiplos modelos até obter sucesso
    
    Args:
        text: Texto da transcrição
        blocks: Blocos segmentados
        use_blocks: Se True, inclui blocos no prompt
        max_attempts: Máximo de modelos a tentar (None = todos)
    
    Returns:
        Dict com resultado do primeiro modelo que teve sucesso
    """
    print("[DEBUG] summarize_with_fallback INICIADO")
    print(f"[DEBUG] text length: {len(text)}, blocks: {len(blocks)}, use_blocks: {use_blocks}, max_attempts: {max_attempts}")
    
    models = get_fallback_models()
    print(f"[DEBUG] Modelos carregados: {len(models)} modelos")
    
    if max_attempts:
        models = models[:max_attempts]
        print(f"[DEBUG] Limitado a {max_attempts} tentativas")
    
    attempts = []
    last_error = None
    
    print(f"[DEBUG] Iniciando loop...")
    for i, model in enumerate(models):
        try:
            print(f"\n[INFO] Tentativa {i+1}/{len(models)}: {model}")
            
            # Tentar gerar resumo
            result = summarize_with_openrouter(text, blocks, model=model, use_blocks=use_blocks)
            
            # Verificar se houve erro
            if result.get("origin", "").endswith("_failed") or result.get("error"):
                error_msg = result.get("error", "Erro desconhecido")
                print(f"   [AVISO] Falhou: {error_msg}")
                attempts.append({
                    "model": model,
                    "success": False,
                    "error": error_msg,
                })
                last_error = error_msg
                continue
            
            # Validar qualidade
            is_valid, reason = validate_summary_quality(result.get("data", {}))
            
            if not is_valid:
                print(f"   [AVISO] Qualidade insuficiente: {reason}")
                attempts.append({
                    "model": model,
                    "success": False,
                    "error": f"Qualidade insuficiente: {reason}",
                })
                last_error = reason
                continue
            
            # Sucesso!
            print(f"   [OK] Sucesso com {model}!")
            
            # Adicionar metadados de fallback
            result["fallback_attempts"] = attempts + [{
                "model": model,
                "success": True,
                "error": None,
            }]
            result["fallback_model_index"] = i
            result["fallback_total_attempts"] = i + 1
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            print(f"   [ERRO] Exceção: {error_msg}")
            attempts.append({
                "model": model,
                "success": False,
                "error": error_msg,
            })
            last_error = error_msg
            continue
    
    # Todos os modelos falharam
    print(f"\n[ERRO] Todos os {len(models)} modelos falharam!")
    
    return {
        "data": {},
        "raw": "",
        "model": "fallback_exhausted",
        "prompt": "",
        "origin": "fallback_failed",
        "error": f"Todos os modelos falharam. Último erro: {last_error}",
        "fallback_attempts": attempts,
        "fallback_total_attempts": len(attempts),
    }

