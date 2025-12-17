## Causa Provável
- O popup da extensão faz `POST http://localhost:5000/api/process` e recebe `TypeError: Failed to fetch` — típico de CORS/OPTIONS não atendido ou servidor indisponível.
- O backend não expõe CORS para `/api/process` e `/api/status`; a extensão (MV3) exige CORS válido em `fetch` mesmo com `host_permissions`.
- A extensão faz polling em `/api/status` lendo `status.processing`/`progress`, mas o backend retorna `is_processing` e não possui `progress/current_step` — causando UI inconsistente mesmo quando a requisição passa.
- O parâmetro `manifestUrl` (JWT capturado) não é aproveitado de forma consistente pelo backend para forçar o uso do manifest correto.

## Objetivos
- Permitir chamadas da extensão (MV3) ao backend via `fetch` sem erros de CORS.
- Alinhar contrato `/api/status` com o que o popup espera (ou ajustar o popup para consumir o contrato correto).
- Persistir e reutilizar `manifestUrl` capturado pela extensão antes de invocar o pipeline (colocar no `resolve_cache`).

## Alterações no Backend (somente web_interface)
1) CORS básico por endpoint
- Adicionar suporte a OPTIONS/CORS em:
  - `POST /api/process`: responder preflight e incluir `Access-Control-Allow-Origin: *` + `Allow-Headers: Content-Type` + `Allow-Methods: POST, OPTIONS`.
  - `GET /api/status`: incluir `Access-Control-Allow-Origin: *`.
  - Opcional: `/api/reports`, `/api/report*`, `/api/capture-manifest`.

2) Contrato de status compatível com a extensão
- Mapear saída:
  - `processing` ← `is_processing`
  - `progress` ← percentual estimado (quando disponível)
  - `current_step` ← string simples (ex.: "processing" ou etapa atual)
- Manter campos atuais para UI web e adicionar os esperados pela extensão.

3) Uso de `manifestUrl`
- Em `POST /api/process`, se `manifestUrl` vier:
  - Gravar em `captured_manifests.json` (último por `pageUrl`).
  - Salvar a dica no `resolve_cache` (`resolve_cache.save(dir, pageUrl, {manifest: manifestUrl})`), antes de invocar o CLI.
- Adicionar `POST /api/capture-manifest` com CORS para receber capturas diretas da extensão.

## Alterações na Extensão (processing_ui.js)
- `processVideoWithUI`:
  - Fallback para `http://127.0.0.1:5000` se `localhost` falhar.
  - Mensagens claras e spinner durante envio.
- `startProgressPolling`:
  - Usar `is_processing` (ou `processing`) e exibir `current_url`/`percent`/ETA conforme respostas.
  - Tratar erros de rede com retry exponencial curto.

## Testes
- Extensão → backend:
  - `fetch POST /api/process` com `pageUrl`+`manifestUrl`: deve retornar 200.
  - Polling `GET /api/status`: sem erro; exibir progresso e concluir.
- Backend:
  - Inspecionar `logs/<domínio>/<id>/resumo_*.process.log.json` "Resolver fonte de mídia" para confirmar uso do `manifestUrl`.

## Entregáveis
- Endpoints com CORS e contrato compatível.
- Persistência e reaproveitamento do `manifestUrl` no `resolve_cache`.
- Ajustes mínimos no JS da extensão para robustez de rede e leitura de status.

Confirma que posso aplicar essas correções e validar o funcionamento ponta a ponta (extensão → backend → transcrição/relatório)?