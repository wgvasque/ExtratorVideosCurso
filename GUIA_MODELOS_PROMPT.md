# Guia de Uso: Modelos de Prompt

## Visão Geral

O sistema agora suporta **dois modelos de prompt** para transcrição de vídeos:

- **Modelo 2** (padrão) - Equilibrado, eficiente, ~12% menos tokens
- **Modelo 4** (híbrido) - Otimizado com framework P.R.O.M.P.T., self-consistency e anti-alucinação rigorosa

---

## Como Selecionar o Modelo

### Opção 1: Variável de Ambiente (Recomendado)

Adicione ao seu arquivo `.env`:

```bash
# Modelo 2 (padrão)
PROMPT_MODEL=modelo2

# OU Modelo 4 (híbrido otimizado)
PROMPT_MODEL=modelo4
```

### Opção 2: Linha de Comando

```bash
# Windows (PowerShell)
$env:PROMPT_MODEL="modelo4"
python -m extrator_videos.transcribe_cli --url "URL_DO_VIDEO"

# Linux/Mac
PROMPT_MODEL=modelo4 python -m extrator_videos.transcribe_cli --url "URL_DO_VIDEO"
```

### Opção 3: Arquivo Específico

```bash
# Usar arquivo customizado
PROMPT_PATH=meu_prompt_custom.json python -m extrator_videos.transcribe_cli --url "URL"
```

---

## Comparação dos Modelos

| Característica | Modelo 2 | Modelo 4 |
|----------------|----------|----------|
| **Versão** | 1.0 | 3.0 Híbrida |
| **Temperatura** | 0.3 | 0.0 (zero criatividade) |
| **Top-p** | 0.9 | 0.1 (mínima aleatoriedade) |
| **Max Tokens** | 16,384 | 100,000 |
| **Timeout** | 120s | 180s |
| **Framework** | Estrutura fixa 14 seções | P.R.O.M.P.T. + 14 seções |
| **Protocolo de Conflito** | Não | ✅ Sim |
| **Self-Consistency** | Não | ✅ Sim (checklist automático) |
| **Anti-Alucinação** | Padrão | ✅ Rigorosa |
| **Chain-of-Thought** | Implícito | ✅ Explícito |
| **Custo de Tokens** | Baseline | +5-10% (mais instruções) |
| **Velocidade** | Rápida | Média (mais validações) |

---

## Quando Usar Cada Modelo

### Use Modelo 2 quando:

✅ Velocidade é prioridade
✅ Custo de tokens é crítico
✅ Vídeos educacionais padrão
✅ Processamento em lote
✅ Conteúdo simples e direto

### Use Modelo 4 quando:

✅ Precisão máxima é essencial
✅ Conteúdo complexo ou técnico
✅ Vídeos com slides/elementos visuais importantes
✅ Necessita protocolo de conflito
✅ Documentação legal/compliance
✅ Treinamentos regulados

---

## Diferenças Técnicas

### Modelo 2 (Equilibrado)

```json
{
  "temperatura": 0.3,
  "top_p": 0.9,
  "max_tokens": 16384,
  "principios_obrigatorios": [
    "Estrutura fixa",
    "Conteúdo fiel",
    "Nada inventado",
    "Ordem preservada",
    "Clara e organizada"
  ]
}
```

### Modelo 4 (Híbrido Otimizado)

```json
{
  "temperatura": 0.0,
  "top_p": 0.1,
  "max_tokens": 100000,
  "framework_prompt": {
    "P": "PERSONA - Transcritor técnico",
    "R": "ROTEIRO - 14 seções fixas",
    "O": "OBJETIVO - Fidelidade 100%",
    "M": "MODELO - JSON estruturado",
    "P2": "PANORAMA - Captura completa",
    "T": "TRANSFORMAR - Protocolo de conflito"
  },
  "protocolo_conflito": {
    "ativo": true,
    "mensagem": "⚠️ CONFLITO DETECTADO..."
  },
  "checklist_auto_validacao": {
    "fidelidade_absoluta": [...],
    "completude": [...],
    "clareza_organizacao": [...]
  }
}
```

---

## Exemplos de Uso

### Exemplo 1: Processamento Rápido (Modelo 2)

```bash
# Configurar
export PROMPT_MODEL=modelo2

# Processar vídeo
python -m extrator_videos.transcribe_cli \
  --url "https://example.com/video.mp4" \
  --output sumarios/aula_rapida.html
```

### Exemplo 2: Máxima Precisão (Modelo 4)

```bash
# Configurar
export PROMPT_MODEL=modelo4

# Processar vídeo técnico complexo
python -m extrator_videos.transcribe_cli \
  --url "https://example.com/video_tecnico.mp4" \
  --output sumarios/aula_tecnica.html
```

### Exemplo 3: Processamento em Lote

```python
import os
from extrator_videos import gemini_client

# Usar Modelo 2 para velocidade
os.environ["PROMPT_MODEL"] = "modelo2"

videos = ["url1", "url2", "url3"]
for url in videos:
    # Processar...
    pass
```

---

## Estrutura de Saída

Ambos os modelos retornam a mesma estrutura JSON com 14 seções:

```json
{
  "resumo_executivo": "...",
  "objetivos_aprendizagem": [...],
  "conceitos_fundamentais": [...],
  "estrutura_central": [...],
  "exemplos": [...],
  "ferramentas_metodos": [...],
  "orientacoes_praticas": {...},
  "abordagem_pedagogica": {...},
  "ideias_chave": {...},
  "pontos_memorizacao": {...},
  "citacoes_marcantes": [...],
  "proximos_passos": {...},
  "preparacao_proxima_aula": "...",
  "materiais_apoio": [...]
}
```

---

## Troubleshooting

### Modelo não está sendo carregado

```bash
# Verificar qual modelo está ativo
python -c "import os; from extrator_videos.gemini_client import load_prompt; cfg = load_prompt(); print(f'Modelo: {cfg[\"metadata\"][\"nome\"]} v{cfg[\"metadata\"][\"versao\"]}')"
```

### Forçar uso de modelo específico

```bash
# Ignorar PROMPT_MODEL e usar arquivo direto
PROMPT_PATH=prompt_modelo4.json python -m extrator_videos.transcribe_cli --url "URL"
```

### Validar JSON do prompt

```bash
# Modelo 2
python -c "import json; json.load(open('prompt_padrao.json')); print('✓ Modelo 2 OK')"

# Modelo 4
python -c "import json; json.load(open('prompt_modelo4.json')); print('✓ Modelo 4 OK')"
```

---

## Migração entre Modelos

Você pode alternar entre modelos a qualquer momento sem quebrar compatibilidade:

1. Ambos usam a mesma estrutura de 14 seções
2. Ambos retornam JSON no mesmo formato
3. Relatórios HTML são compatíveis
4. Retrocompatibilidade total com formato legado

---

## Recomendações

### Para Produção

- **Padrão**: Modelo 2 (velocidade + custo)
- **Crítico**: Modelo 4 (precisão + validação)

### Para Desenvolvimento

- **Testes**: Modelo 2 (iteração rápida)
- **Validação**: Modelo 4 (garantir qualidade)

### Para Casos Específicos

- **Marketing/Negócios**: Modelo 2
- **Técnico/Científico**: Modelo 4
- **Legal/Compliance**: Modelo 4
- **Educacional Geral**: Modelo 2

---

**Última Atualização**: 2025-12-16
**Versões**: Modelo 2 v1.0, Modelo 4 v3.0
