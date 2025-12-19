# Modelos Gratuitos OpenRouter.ai - Dezembro 2024

## 🌟 Top 5 Recomendados para Resumos de Vídeos

| Modelo | Descrição | Contexto |
|--------|-----------|----------|
| `google/gemini-2.0-flash-exp:free` | ⭐⭐⭐⭐⭐ Experimental, muito rápido | 1M tokens |
| `meta-llama/llama-3.3-70b-instruct:free` | ⭐⭐⭐⭐⭐ Excelente qualidade, multilíngue | 128K tokens |
| `mistralai/mistral-small-3.1-24b:free` | ⭐⭐⭐⭐ Bom custo-benefício | 32K tokens |
| `deepseek/deepseek-chat-v3:free` | ⭐⭐⭐⭐ Ótimo para conversação | 64K tokens |
| `google/gemma-3-27b:free` | ⭐⭐⭐⭐ Suporta visão + texto | 128K tokens |

## 📋 Lista Completa de Modelos Gratuitos

### Propósito Geral e Conversação
- `google/gemini-2.0-flash-exp:free` - Experimental, muito rápido
- `meta-llama/llama-3.3-70b-instruct:free` - 70B params, multilíngue
- `deepseek/deepseek-chat-v3:free` - Conversação avançada
- `mistralai/mistral-small-3.1-24b:free` - 24B params
- `google/gemma-3-27b:free` - Multimodal (visão + texto)
- `z-ai/glm-4.5-air:free` - Otimizado para agentes
- `amazon/nova-2-lite:free` - Texto, imagens e vídeos
- `openai/gpt-oss-20b:free` - 21B params, Apache 2.0
- `meituan/longcat-flash-chat:free` - Contextos longos

### Código e Desenvolvimento
- `mistralai/devstral-2-2512:free` - ⭐ MELHOR para código (123B params, 256K contexto)
- `qwen/qwen3-coder-480b-a35b:free` - 480B params MoE, coding agentic
- `kwaipilot/kat-coder-pro-v1:free` - 87.5B tokens

### Multimodal (Visão + Texto)
- `nvidia/nemotron-nano-12b-2-vl:free` - Vídeos longos + documentos
- `qwen/qwen2.5-vl-3b-instruct:free` - Compacto e eficiente
- `qwen/qwen3-235b-a22b:free` - 235B params MoE
- `google/gemma-3-27b:free` - Visão + texto

### Raciocínio Avançado
- `tng/deepseek-r1t2-chimera:free` - 671B params, forte raciocínio (95.6B tokens)
- `tng/deepseek-r1t-chimera:free` - Storytelling criativo (15.4B tokens)
- `allenaai/olmo-3-32b-think:free` - 32B params, lógica complexa
- `deepseek/deepseek-v3-base:free` - Base model
- `nex-agi/deepseek-v3.1-nex-n1:free` - Versão otimizada
- `arcee-ai/trinity-mini:free` - 26B params, contextos longos

### Modelos Especiais
- `openai/gpt-4o-mini:free` - ⚠️ Versão free limitada (2024-07-18)
- `cognitivecomputations/dolphin-mistral-24b-venice:free` - Uncensored

## 🎯 Recomendações por Caso de Uso

### Para Resumos de Vídeos (Geral)
```env
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
```
ou
```env
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

### Para Vídeos de Programação
```env
OPENROUTER_MODEL=mistralai/devstral-2-2512:free
```

### Para Vídeos com Conteúdo Visual
```env
OPENROUTER_MODEL=nvidia/nemotron-nano-12b-2-vl:free
```

### Para Vídeos Técnicos/Complexos
```env
OPENROUTER_MODEL=tng/deepseek-r1t2-chimera:free
```

### Para Contextos Muito Longos
```env
OPENROUTER_MODEL=meituan/longcat-flash-chat:free
```

## ⚠️ Notas Importantes

1. **Sufixo `:free`**: Sempre adicione `:free` no final do nome do modelo
2. **Limites**: Modelos gratuitos podem ter rate limits
3. **Experimental**: Alguns modelos (como Gemini 2.0 Flash) são experimentais
4. **Disponibilidade**: Lista atualizada em Dezembro 2024, pode mudar

## 🔗 Links Úteis

- Lista oficial: https://openrouter.ai/models (filtrar por "Free")
- Documentação: https://openrouter.ai/docs/models
- Comparação: https://openrouter.ai/rankings
