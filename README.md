# Extrator, Transcrição e Resumo

[![CI Tests](https://github.com/wgvasque/ExtratorVideosCurso/workflows/CI%20-%20Testes%20e%20Validação/badge.svg)](https://github.com/wgvasque/ExtratorVideosCurso/actions/workflows/ci.yml)
[![Linting](https://github.com/wgvasque/ExtratorVideosCurso/workflows/Linting%20e%20Formatação/badge.svg)](https://github.com/wgvasque/ExtratorVideosCurso/actions/workflows/lint.yml)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Estrutura de Arquivos
- `logs/` : armazena logs em JSON de cada execução
  - Hierarquia: `logs/<dominio>/<id>/<run_id>.process.log.json`
- `sumarios/` : armazena resumos gerados
  - Hierarquia: `sumarios/<dominio>/<id>/resumo_<id>.json` e `resumo_<id>.md`

## Configuração
- `.env` chaves relevantes:
  - `EMAIL`, `SENHA` (autenticação quando necessário)
  - `GEMINI_API_KEY` (resumo via Gemini)
  - `LOG_LEVEL` (debug|info|warning|error)
  - `LOG_DIR` (default: `logs`)
  - `SUMARIOS_DIR` (default: `sumarios`)
  - `REFERER` (quando aplicável)

## Execução
- Lote: `python -m extrator_videos.batch_cli --file targets.txt --outdir .`
- Único: `python -m extrator_videos.transcribe_cli "<URL>" --referer <referer> --out resumo.json --md resumo.md`

## Logs
- Cada etapa é registrada com descrição, início/fim (ISO 8601), duração (ms), status e detalhes.
- Consolidado inclui tempo total e estatísticas (mais rápida, mais lenta, média).

## Portabilidade e Erros
- Caminhos relativos ao projeto, compatível com Windows/Linux.
- Tratamento para criação de diretórios, permissões e aviso de pouco espaço.

## Otimização
- Cache de resolução e transcrição:
  - `RESOLVE_CACHE_DIR`, `SUMARIOS_CACHE_DIR`, `CACHE_TTL_HOURS`
- Transcrição por chunks:
  - `CHUNK_SECONDS`, `MAX_PARALLEL_CHUNKS`
- Ajustes de Whisper:
  - `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE`
- Recomendações:
  - Usar GPU (`cuda` + `float16`) quando disponível para ganhos de 2–6x
  - Usar modelos menores (`small/base`) para sumarização rápida

## Gerenciamento de Prompts (Gemini)
- Arquivo principal: `prompt_padrao.json` com metadados, parâmetros, estrutura e componentes ativos.
- Versões: snapshots em `extrator_videos/prompt_versions/versao_<N>.json`.
- Módulos:
  - `extrator_videos/prompt_manager.py` para carregar/salvar, editar seções, gerenciar componentes, ajustar parâmetros, versionar e reverter, registrar desempenho.
  - `extrator_videos/prompt_optimizer.py` para otimizações e variantes.
- Integração: `gemini_client.py` lê `prompt_padrao.json` e aplica parâmetros ao modelo e prompt final.
- Variáveis: `PROMPT_PATH` para definir caminho do prompt.
- Logs padronizados
  - Formato: JSON (`*.process.log.json`) com `severity`, `inicio_iso/fim_iso`, `duracao_ms` e `contexto`
  - Níveis: `debug|info|warning|error` conforme `LOG_LEVEL`
  - Timestamps ISO 8601 e salvamento atômico (tmp+rename)
- Resumos amigáveis (HTML/PDF)
  - HTML gerado automaticamente ao lado dos `.json/.md`
  - PDF opcional via `WKHTMLTOPDF_PATH` e `ENABLE_PDF=1`
- Verificações
  - Verifica integridade dos logs e resumos e acessibilidade dos arquivos
  - Resultados anexados ao próprio log em `checks{}`
- Requisitos de armazenamento
  - Estrutura: `logs/<dominio>/<id>/` e `sumarios/<dominio>/<id>/`
  - Nomes consistentes por `id`; domínio padronizado com pontos em `sumarios` e underscores em `logs`
- Instruções de uso
  - Lote: `python -m extrator_videos.batch_cli --file targets.txt --outdir . --loglevel debug --logdir logs`
  - Único: `python -m extrator_videos.transcribe_cli "<URL>" --referer <referer> --out resumo.json --md resumo.md`
  - PDF: defina `ENABLE_PDF=1` e `WKHTMLTOPDF_PATH` com o executável do `wkhtmltopdf`

## Sistema de Seleção Dinâmica de Prompts

### Visão Geral
Sistema que permite selecionar diferentes templates de prompts para processamento de transcrições, com validação automática de estrutura de 14 seções obrigatórias.

### Modelos Disponíveis
- **MODELO 5**: ✅ Válido (14/14 seções) - Transcritor especializado em conteúdo educacional
- **MODELO 4**: Framework P.R.O.M.P.T. híbrido
- **MODELO 3**: Modelo intermediário
- **MODELO 2**: ❌ Inválido (sem bloco JSON)

### Uso na Interface Web
1. Abra `http://localhost:5000`
2. Selecione o modelo de prompt no dropdown "MODELO DE PROMPT"
3. Veja indicadores de validação (✅ válido | ❌ inválido)
4. Clique no "?" para ver detalhes do prompt
5. Processe vídeos normalmente - o prompt selecionado será usado

### Uso via API
```python
from extrator_videos import gemini_client

# Usar prompt específico
result = gemini_client.summarize_transcription_full(
    text=transcricao,
    blocks=blocos,
    prompt_template="MODELO 5 PROMPT - Transcrição Video Aulas"
)

# Usar sistema legado (JSON)
result = gemini_client.summarize_transcription_full(
    text=transcricao,
    blocks=blocos
)
```

### Criar Novo Prompt
1. Copie `modelos_prompts/MODELO 5 PROMPT - Transcrição Video Aulas.md`
2. Personalize instruções mantendo estrutura JSON de 14 seções
3. Salve com nome descritivo em `modelos_prompts/`
4. Valide: `python -m extrator_videos.prompt_validator`

### Estrutura Obrigatória
Todos os prompts devem incluir bloco JSON com 14 seções:
- resumo_executivo, objetivos_aprendizagem, conceitos_fundamentais
- estrutura_central, exemplos, ferramentas_metodos
- orientacoes_praticas, abordagem_pedagogica, ideias_chave
- pontos_memorizacao, citacoes_marcantes, proximos_passos
- preparacao_proxima_aula, materiais_apoio

Ver `modelos_prompts/README.md` para detalhes completos.

### API Endpoints
- `GET /prompts` - Lista todos os prompts com validação
- `GET /prompts/<name>` - Detalhes de prompt específico
- `POST /prompts/validate` - Valida prompt customizado
