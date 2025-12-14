## Objetivos
- Reduzir drasticamente o tempo de transcrição e ingestão mantendo precisão.
- Implementar cache seguro para evitar retrabalho em execuções repetidas.
- Adotar transcrição por chunks com paralelização controlada.
- Ampliar logs para visibilidade de cache/chunks e impacto de performance.

## Alterações Principais
- Cache de transcrição:
  - Módulo `transcription_cache` com hash do input (URL + manifest + headers relevantes + duração aprox.).
  - Diretório `cache/` ou `SUMARIOS_CACHE_DIR` (default: `sumarios_cache`).
  - Salva/recupera JSON de transcrição (segments + idioma + duração). TTL opcional.
  - Logs: etapa “Cache de transcrição” com hit/miss e tamanho.
- Cache de resolução de mídia:
  - Módulo `resolve_cache` com mapeamento `input_url -> manifest/variant`.
  - Diretório `resolve_cache/` (default: `resolve_cache`). TTL opcional.
  - Evita re-chamar extractor para URLs já vistas.
- Transcrição por chunks:
  - Pipeline: split WAV em blocos de `CHUNK_SECONDS` (default: 90s) com timestamps.
  - Paralelização: `MAX_PARALLEL_CHUNKS` controlado (default: 2–3 em CPU; maior em GPU).
  - Consolidação: merge de segmentos preservando ordem e ajustando offsets de tempo.
  - Logs: para cada chunk, etapa própria com duração; sumário de chunks.
- Configuração `.env`:
  - `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE` (já existentes).
  - `CHUNK_SECONDS=90`, `MAX_PARALLEL_CHUNKS=2`.
  - `SUMARIOS_CACHE_DIR=sumarios_cache`, `RESOLVE_CACHE_DIR=resolve_cache`, `CACHE_TTL_HOURS=72`.
- Ingestão FFmpeg:
  - Manter áudio-only com `-map 0:a:0 -ar 16000 -ac 1`.
  - Flag opcional `FFMPEG_PREVIEW_SECONDS` para cenários de pré-visualização.
- Summarização Gemini (map-reduce quando necessário):
  - Se transcrição > N caracteres, dividir texto em blocos e gerar sumários parciais; combinar em sumário final.
  - Logs: contagem de blocos, tempos por bloco.
- Logs detalhados:
  - Novas categorias: `cache` (transcription/resolution) e `chunks`.
  - Detalhes: hit/miss, bytes do cache, contagem de chunks, paralelização aplicada.

## Segurança e Conformidade
- Hash não inclui credenciais; redigir cabeçalhos sensíveis nos detalhes.
- TTL impede retenção indefinida; opção de limpeza segura.

## Implementação por Arquivo
- `extrator_videos/transcription_cache.py`: save/load, TTL, hashing.
- `extrator_videos/resolve_cache.py`: save/load manifest, TTL.
- `extrator_videos/transcribe_cli.py`:
  - Inserir etapas: cache resolve, cache transcrição.
  - Integrar split WAV em chunks e paralelização; merge final.
  - Ajustar escrita para `sumarios/<dominio>/<id>/` (já feito).
  - Logging novo para cache/chunks.
- `extrator_videos/batch_cli.py`:
  - Aplicar mesmas melhorias em lote.
- `README.md`: adicionar seção de otimização com variáveis `.env` e comportamento de cache/chunks.

## Validação
- Rodar com `targets.txt` e comparar tempos nos logs (antes/depois):
  - Esperado: transcribe cai de 181–486s para ~60–180s em CPU; maior ganho com GPU.
  - Em reprocesso com cache: transcribe ~0s; ingest/resolve perto de zero com caches válidos.
- Verificar estatísticas de `summary` e novas categorias.

## Plano de Rollout
- Implementar módulos de cache e hooks no CLI.
- Inserir transcrição por chunks com paralelização limitada.
- Atualizar documentação e `.env.example`.
- Executar lote e anexar resultados de log como evidência de ganho.

## Riscos e Mitigações
- Consistência de timestamps nos merges: ajustar offsets e ordenar por tempo.
- Uso de CPU alto: limitar `MAX_PARALLEL_CHUNKS` e permitir desativar via `.env`.
- Espaço em disco do cache: checagem de espaço, TTL e limpeza periódica.

## Entregáveis
- Código atualizado com cache/chunks.
- README com guia de otimização.
- Logs comparativos de execução em lote mostrando redução de tempo.
