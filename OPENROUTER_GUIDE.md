# Guia de Uso do OpenRouter.ai

## Configuração Inicial

### 1. Obter API Key

1. Acesse https://openrouter.ai
2. Crie uma conta (pode usar Google/GitHub)
3. Vá em https://openrouter.ai/keys
4. Clique em "Create Key"
5. Copie a chave gerada (começa com `sk-or-v1-...`)

### 2. Configurar .env

Edite o arquivo `.env` e adicione sua chave:

```env
OPENROUTER_API_KEY=sk-or-v1-sua-chave-aqui
USE_OPENROUTER=true
```

### 3. Escolher Modelo (Opcional)

Por padrão, usa `openai/gpt-4o-mini`. Para mudar:

```env
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

## Modelos Disponíveis

### Recomendados para Resumos

| Modelo | Custo/Vídeo* | Velocidade | Qualidade | Uso Recomendado |
|--------|--------------|------------|-----------|-----------------|
| `openai/gpt-4o-mini` | ~$0.01 | ⚡⚡⚡ | ⭐⭐⭐⭐ | **Padrão** - Melhor custo-benefício |
| `anthropic/claude-3-haiku` | ~$0.02 | ⚡⚡⚡ | ⭐⭐⭐⭐ | Alternativa rápida |
| `google/gemini-2.0-flash-exp` | **Grátis** | ⚡⚡⚡ | ⭐⭐⭐ | Experimental, pode ter instabilidade |
| `anthropic/claude-3.5-sonnet` | ~$0.15 | ⚡⚡ | ⭐⭐⭐⭐⭐ | Máxima qualidade |
| `openai/gpt-4o` | ~$0.10 | ⚡⚡ | ⭐⭐⭐⭐⭐ | Alta qualidade |

*Estimativa para vídeo de 1 hora

### Modelos Open Source

| Modelo | Custo/Vídeo* | Velocidade | Qualidade |
|--------|--------------|------------|-----------|
| `meta-llama/llama-3.1-70b-instruct` | ~$0.03 | ⚡⚡ | ⭐⭐⭐⭐ |
| `mistralai/mistral-large` | ~$0.04 | ⚡⚡ | ⭐⭐⭐⭐ |

## Uso

### Processar um Vídeo

```bash
python -m extrator_videos.transcribe_cli "URL_DO_VIDEO" --referer "URL_REFERER"
```

O sistema automaticamente usará OpenRouter se configurado.

### Processar Múltiplos Vídeos

```bash
# Processar todos os vídeos do targets.txt
for /F "tokens=*" %i in (targets.txt) do python -m extrator_videos.transcribe_cli "%i" --referer "https://alunos.segueadii.com.br/"
```

## Configurações Avançadas

### Usar Blocos Temporais

Por padrão, apenas a transcrição completa é enviada. Para incluir blocos com timestamps:

```env
OPENROUTER_USE_BLOCKS=true
```

⚠️ **Atenção**: Isso aumenta o tamanho do prompt e pode aumentar custos.

### Ajustar Temperatura

Controla a criatividade do modelo (0.0 = determinístico, 1.0 = criativo):

```env
OPENROUTER_TEMPERATURE=0.3
```

### Aumentar Tokens de Saída

Para resumos mais longos:

```env
OPENROUTER_MAX_TOKENS=8192
```

### Aumentar Timeout

Para vídeos muito longos:

```env
OPENROUTER_TIMEOUT=120
```

## Fallback para Gemini

Se OpenRouter falhar ou não estiver configurado, o sistema automaticamente usa Gemini:

```env
USE_OPENROUTER=false
```

## Monitoramento de Custos

### Ver Uso no OpenRouter

1. Acesse https://openrouter.ai/activity
2. Veja histórico de requisições e custos
3. Configure limites de gastos em https://openrouter.ai/settings

### Estimativa de Custos

Para 10 vídeos de 1 hora cada com GPT-4o-mini:
- Custo total: ~$0.10
- Tempo total: ~10 minutos

## Solução de Problemas

### Erro: "OPENROUTER_API_KEY não configurada"

Verifique se adicionou a chave no `.env`:
```env
OPENROUTER_API_KEY=sk-or-v1-...
```

### Erro: "429 Rate Limit"

Você excedeu o limite de requisições. Aguarde alguns segundos ou:
1. Configure um limite de gastos maior em https://openrouter.ai/settings
2. Adicione créditos na conta

### Erro: "Invalid API Key"

Verifique se a chave está correta e não expirou.

### Resumo Incompleto

Tente aumentar `OPENROUTER_MAX_TOKENS`:
```env
OPENROUTER_MAX_TOKENS=8192
```

## Comparação: OpenRouter vs Gemini

| Aspecto | OpenRouter | Gemini (Direto) |
|---------|------------|-----------------|
| **Quota** | Pay-as-you-go | Limitada (tier gratuito) |
| **Modelos** | 100+ opções | Apenas Gemini |
| **Custo** | ~$0.01/vídeo | Grátis (com limites) |
| **Confiabilidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ (quota pode exceder) |
| **Qualidade** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Truncamento** | Raro | Comum com prompts longos |

## Recomendação

**Para uso pessoal/testes**: Use `google/gemini-2.0-flash-exp` (gratuito)

**Para produção**: Use `openai/gpt-4o-mini` (melhor custo-benefício)

**Para máxima qualidade**: Use `anthropic/claude-3.5-sonnet`
