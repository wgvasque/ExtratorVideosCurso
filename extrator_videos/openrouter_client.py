"""
Cliente para integração com OpenRouter.ai
Permite usar múltiplos modelos LLM através de uma única API
"""
import os
import requests
import json
import re
from typing import Dict, List, Optional

def summarize_with_openrouter(
    text: str, 
    blocks: List[dict], 
    model: Optional[str] = None,
    use_blocks: bool = False
) -> Dict:
    """
    Gera resumo estruturado usando OpenRouter.ai
    
    Args:
        text: Texto da transcrição
        blocks: Blocos segmentados com timestamps (opcional)
        model: Modelo a usar (padrão: variável de ambiente ou gpt-4o-mini)
        use_blocks: Se True, inclui blocos no prompt (aumenta tamanho)
    
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
    
    # Determinar modelo
    if model is None:
        model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    
    # Construir prompt
    prompt_parts = [
        "Analise a transcrição em português e produza um resumo estruturado.",
        "",
        "Retorne APENAS um objeto JSON válido com os seguintes campos:",
        "- resumo_conciso: string com 200-300 palavras resumindo os principais tópicos",
        "- pontos_chave: array com 7-15 strings, cada uma sendo um ponto-chave numerado (ex: '1. Primeiro ponto')",
        "- topicos: array com 3-7 strings representando os tópicos principais",
        "- orientacoes: array com 7-15 objetos, cada um com {passo: number, acao: string, beneficio: string}",
        "- secoes: array com objetos {titulo: string, inicio: number, fim: number, conteudo: string}",
        "",
        "IMPORTANTE:",
        "- Mantenha fidelidade ao conteúdo original",
        "- Evite redundâncias e jargões",
        "- Priorize recomendações práticas e acionáveis",
        "- Evidencie benefícios e resultados esperados",
        "",
    ]
    
    # Adicionar blocos se solicitado
    if use_blocks and blocks:
        prompt_parts.append("BLOCOS SEGMENTADOS:")
        # Limitar a 10 blocos para não exceder tamanho
        limited_blocks = blocks[:10] if len(blocks) > 10 else blocks
        for block in limited_blocks:
            prompt_parts.append(f"[{block.get('inicio', 0):.1f}s - {block.get('fim', 0):.1f}s]: {block.get('conteudo', '')[:200]}")
        prompt_parts.append("")
    
    prompt_parts.extend([
        "TRANSCRIÇÃO COMPLETA:",
        text,
    ])
    
    prompt = "\n".join(prompt_parts)
    
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
        "temperature": float(os.getenv("OPENROUTER_TEMPERATURE", "0.3")),
        "max_tokens": int(os.getenv("OPENROUTER_MAX_TOKENS", "4096")),
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
            # Limpar markdown code blocks se existirem
            clean_text = raw_text.strip()
            if clean_text.startswith("```"):
                clean_text = re.sub(r"^```[a-zA-Z]*\n", "", clean_text)
                clean_text = re.sub(r"\n```$", "", clean_text)
            
            # Tentar parse direto
            try:
                data = json.loads(clean_text)
            except json.JSONDecodeError:
                # Tentar extrair JSON do texto
                match = re.search(r'\{[\s\S]*\}', clean_text)
                if match:
                    data = json.loads(match.group(0))
                else:
                    raise ValueError("Não foi possível extrair JSON da resposta")
            
            # Garantir campos obrigatórios
            data.setdefault("resumo_conciso", "")
            data.setdefault("pontos_chave", [])
            data.setdefault("topicos", [])
            data.setdefault("orientacoes", [])
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
    
    Args:
        data: Dicionário com dados do resumo
    
    Returns:
        Tupla (is_valid, reason)
    """
    # Verificar campos obrigatórios
    if not data:
        return False, "Dados vazios"
    
    resumo = data.get("resumo_conciso", "")
    pontos = data.get("pontos_chave", [])
    orientacoes = data.get("orientacoes", [])
    
    # Validar resumo
    resumo_words = len(resumo.split())
    if resumo_words < 50:
        return False, f"Resumo muito curto ({resumo_words} palavras, mínimo 50)"
    
    if resumo_words > 500:
        return False, f"Resumo muito longo ({resumo_words} palavras, máximo 500)"
    
    # Validar pontos-chave
    if len(pontos) < 3:
        return False, f"Poucos pontos-chave ({len(pontos)}, mínimo 3)"
    
    # Validar orientações
    if len(orientacoes) < 3:
        return False, f"Poucas orientações ({len(orientacoes)}, mínimo 3)"
    
    # Validar estrutura das orientações
    for i, orient in enumerate(orientacoes):
        if not isinstance(orient, dict):
            return False, f"Orientação {i+1} não é um objeto"
        
        if "acao" not in orient or not orient["acao"]:
            return False, f"Orientação {i+1} sem ação"
    
    return True, "OK"


def get_fallback_models() -> List[str]:
    """
    Retorna lista de modelos em ordem de prioridade para fallback
    
    Ordem:
    1. Modelos gratuitos (melhor qualidade primeiro)
    2. Modelos pagos baratos
    3. Modelos pagos premium
    
    Returns:
        Lista de IDs de modelos
    """
    # Configuração customizada do usuário
    custom_models = os.getenv("OPENROUTER_FALLBACK_MODELS", "")
    if custom_models:
        return [m.strip() for m in custom_models.split(",") if m.strip()]
    
    # Lista padrão: gratuitos especializados primeiro, depois pagos
    return [
        # Tier 1: Gratuitos de alta qualidade (especializados para resumos)
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-v3-0324:free",  # Especializado em sumarização
        
        # Tier 2: Gratuitos eficientes e novos
        "meta-llama/llama-3.2-3b-instruct:free",  # Eficiente, 9T tokens
        "cohere/command-r7b-12-2024:free",  # Novo (Dez 2024), RAG
        "google/gemma-3-27b:free",  # Multimodal
        
        # Tier 3: Gratuitos especializados
        "amazon/nova-2-lite:free",  # Multimodal, processa vídeos
        "allenaai/olmo-3-32b-think:free",  # Raciocínio profundo
        
        # Tier 4: Pagos baratos (fallback se gratuitos falharem)
        "openai/gpt-4o-mini",
        "anthropic/claude-3-haiku",
        
        # Tier 5: Pagos premium (último recurso)
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

