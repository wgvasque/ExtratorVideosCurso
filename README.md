# Extrator, Transcrição e Resumo

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
