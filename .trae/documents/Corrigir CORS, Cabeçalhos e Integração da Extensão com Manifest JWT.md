## Problemas Identificados
- Falha de CORS/OPTIONS no `/api/process` e `/api/status`, causando `TypeError: Failed to fetch` no popup.
- Cabeçalhos do `ffmpeg` mal formatados (crases/\r\n indevidos) e `Origin/Referer` incorretos (`app.hub.la`), resultando em `401` na CDN.
- `manifestUrl` (JWT) capturado pela extensão não é sempre persistido/consumido pelo backend antes do ingest.
- Popup espera campos `processing/progress/current_step` no `/api/status` que não existem.

## Ajustes na Interface Web
### CORS e Preflight
- Adicionar suporte a `OPTIONS` e `Access-Control-Allow-Origin: *` para `/api/process` e `/api/status` (e `/api/capture-manifest`).

### Status Compatível com Popup
- Mapear `processing` ← `is_processing`, `progress` ← percentual estimado, `current_step` ← etapa atual.

### Uso de Manifest JWT
- Em `POST /api/process`: aceitar `manifestUrl`, salvar em `captured_manifests.json` por `pageUrl` e escrever no `resolve_cache` (`{manifest: jwt_m3u8}`) antes de iniciar o pipeline.
- Adicionar `POST /api/capture-manifest` (com CORS) para receber capturas diretas da extensão e opcionalmente iniciar processamento.

## Ajustes no Ingest
- Sanitizar cabeçalhos e URL: remover crases/espaços indevidos em `-headers` e `-i` do `ffmpeg`.
- Garantir `Origin/Referer` de `alunos.segueadii.com.br` (domínio do conteúdo) quando processar itens; manter compatibilidade se o conteúdo realmente vier de `app.hub.la`.

## Extensão (processing_ui.js)
- Fallback para `http://127.0.0.1:5000` se `localhost` falhar.
- Ler campos `processing/progress/current_step` do `/api/status` alinhados ao novo contrato.

## Testes e Validação
- Popup → `/api/process` com `pageUrl` + `manifestUrl` deve retornar 200; polling em `/api/status` sem erro.
- Logs do pipeline: “Resolver fonte de mídia” deve usar o `manifestUrl` JWT capturado; “Ingestão” deve salvar `wav_path` sem `401`.
- Confirmar geração de `sumarios/<domínio>/<id>/` e visualização pela UI.
- Garantir que funções para `alunos.segueadii.com.br` continuam intactas e compatíveis; validar com URLs do `targets.txt`.

## Entregáveis
- Web API com CORS e status compatível.
- Persistência do `manifestUrl` e uso via `resolve_cache`.
- Sanitização de cabeçalhos/URL no ingest.
- Ajustes mínimos no popup para robustez.

Posso aplicar essas correções e executar testes ponta a ponta para validar o botão Processar e a compatibilidade com ambos os sites?