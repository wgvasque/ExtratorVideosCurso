## Objetivos
- Registrar cada microetapa do pipeline com descrição, início/fim ISO, duração (ms) e status.
- Gerar consolidado com cronologia, tempo total e estatísticas (min/máx/média), em JSON.
- Tolerar falhas sem perder o log; configurar nível de detalhe.

## Esquema de Log (JSON)
- `run_id`, `started_iso`, `finished_iso`, `total_ms`, `level`.
- `context`: { `input_url`, `referer`, `env_flags` (sem segredos), `versions` }.
- `steps[]`: cada item contém:
  - `id`, `descricao`, `categoria` (auth|resolve|ingest|transcribe|postprocess|summarize|output|system), `inicio_iso`, `fim_iso`, `duracao_ms`, `status` (sucesso|falha), `level`, `detalhes` (campo livre), `erro` (mensagem redigida), `retry_count`.
- `stats`: { `count`, `fastest_ms`, `slowest_ms`, `avg_ms`, `by_category` }.

## Níveis de Log
- `debug`: registra todos os campos e subetapas (HTTP heads redigidos).
- `info`: registra etapas principais e tempos; detalhes limitados.
- `warning`: somente etapas com alertas/falhas leves.
- `error`: apenas falhas.
- Config: `.env LOG_LEVEL`, CLI `--loglevel`.

## Componentes
- `logger_json.py`:
  - `StepLogger(run_id, level, log_dir)`: agrega contexto, cria `steps`, calcula `stats`, escreve JSON atômico (`.tmp` + rename).
  - `StepContext(logger, descricao, categoria, level='info')`: context manager que marca início/fim, mede duração, captura exceções, define status e continua; aceita `details_update(dict)`.
  - `redact(obj)`: remove/mascara `Cookie`, `Authorization`, e e-mails/telefones.
  - `finalize()`: calcula `stats` (min/máx/média; por categoria), `total_ms` e grava.

## Pipeline Detalhado (transcribe_cli)
1. `Carregar .env e argumentos` (system)
   - Ler `EMAIL`, `SENHA`, `GEMINI_API_KEY`, `REFERER`, `LOG_LEVEL`, `LOG_DIR`.
   - Validar presença/formato (e-mail regex, senha não vazia); gravar warnings.
2. `Autenticação programática` (auth)
   - GET `/login`, detectar formulário (inputs email/senha e ocultos).
   - POST credenciais; follow redirects.
   - GET `input_url` e verificar se não redireciona para login.
   - Salvar cookies (redigidos) em `detalhes`.
3. `Resolver fonte de mídia` (resolve)
   - Se `input_url` não for `.m3u8/.mp4/.mpd`, usar `extractor.extract`.
   - Capturar candidato HLS/DASH/MP4; escolher HLS master/variant preferida.
   - Registrar `source_url`, `variants` (contagem/resoluções). 
4. `Construir cabeçalhos de rede` (resolve)
   - Definir `Referer`, `Origin` coerente; montar `Cookie` redigido; `User-Agent`.
   - Registrar o conjunto (redact) no log.
5. `Ingestão de áudio (ffmpeg)` (ingest)
   - Comandos: `ffmpeg -loglevel error -headers <CRLF> -i <manifest> -vn -map 0:a:0 -ac 1 -ar 16000 <tmp.wav>`.
   - Medir tempo de execução; bytes de saída; número de segmentos consumidos (estimado por duração).
6. `Carregar modelo Whisper` (transcribe)
   - Seleção por `.env`: `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE`, `WHISPER_DOWNLOAD_ROOT`.
   - Logar versão/modelo e compute type; tempo de load.
7. `Transcrever áudio` (transcribe)
   - `vad_filter=True`, `word_timestamps=True`, idioma `pt`.
   - Registrar duração do áudio, número de segmentos de texto e tempo total.
8. `Limpeza e segmentação` (postprocess)
   - Scrub PII (e-mails/telefones) do texto.
   - Montar blocos de 10 frases com `inicio/fim/conteudo`; registrar quantidades.
9. `Análise e resumo (Gemini)` (summarize)
   - Tentar modelos em ordem: `models/gemini-1.5-flash-latest`, `models/gemini-1.5-pro-latest`, `models/gemini-1.0-pro`, `models/gemini-pro`.
   - `timeout=30`; em caso de 404/timeouts, registrar falha e cair em `naive_summary`.
   - Logar tamanho da transcrição enviada (caracteres) e tamanho da resposta.
10. `Gravar saídas` (output)
    - Escrever `resumo_<slug>.json` e `resumo_<slug>.md`.
    - Registrar caminhos e tamanhos.
11. `Consolidar e escrever log` (system)
    - Calcular `total_ms`, `min/max/avg`, `by_category`.
    - Gravar `logs/<slug>.process.log.json` com `steps`, `summary`, `context`.

## Pipeline Detalhado (batch_cli)
- Envolver cada URL com novo `StepLogger`; repetir etapas 1–11; consolidar logs por URL.

## Tratamento de Erros
- Cada `StepContext` captura exceções; `status='falha'` com `erro` redigido.
- O pipeline segue para as próximas etapas quando possível; consolidado sempre escrito.

## Saída e Configuração
- `.env`: `LOG_LEVEL`, `LOG_DIR`, `WHISPER_*`, `REFERER`.
- CLI (opcional): `--loglevel`, `--logdir`.
- Logs: `logs/<slug>.process.log.json` por execução.

## Próximos Passos
- Implementar `logger_json.py` com `StepLogger` e `StepContext`.
- Integrar chamadas `with StepContext(...)` em todas as etapas citadas.
- Validar com `targets.txt` e gerar log + resumo; inspecionar estatísticas.
- Documentar níveis de log e variáveis de ambiente.
