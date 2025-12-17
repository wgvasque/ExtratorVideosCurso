## Problema
- A extensão captura o `manifest.m3u8` correto (com JWT), mas a interface web não possui o endpoint `/api/capture-manifest` para recebê-lo.
- O popup envia opcionalmente `manifestUrl` em `/api/process`, porém o backend ignora esse parâmetro, processando apenas `pageUrl`.
- Consequência: o pipeline resolve o vídeo a partir da página, podendo falhar ou não usar o link mais confiável da extensão.

## Objetivos
- Persistir o último `manifestUrl` capturado por página.
- Usar o `manifestUrl` capturado como fonte primária na etapa “Resolver fonte de mídia”.
- Manter o comportamento atual quando não houver `manifestUrl` (fallback para resolução tradicional).

## Alterações na Interface Web (Flask)
1) Adicionar endpoint `POST /api/capture-manifest`:
- Request body: `{ pageUrl, manifestUrl, domain, autoProcess }`
- Persistir em `captured_manifests.json` (no raiz do projeto) o último par `{pageUrl, manifestUrl, timestamp, domain}`.
- Se `autoProcess` for `true`, iniciar `process_videos_batch([pageUrl])` e associar o `manifestUrl` à URL processada.

2) Atualizar `POST /api/process`:
- Aceitar opcionalmente `manifestUrl` no JSON.
- Persistir a associação `pageUrl → manifestUrl` em `captured_manifests.json` (sobrescrevendo o último para a página).
- Antes de invocar `transcribe_cli`, salvar o manifest no cache de resolução usando `extrator_videos.resolve_cache.save(hash(pageUrl), { manifest: manifestUrl })` para o domínio/id correspondente.

3) Resolver caminhos e status:
- Garantir que `captured_manifests.json` é lido/escrito com caminho absoluto `project_root`.
- `GET /api/status` já não serializa objetos `Popen`. Manter indicador `has_current_proc`.

## Ajuste do Pipeline (sem alterar o processador)
- O `resolve_cache.save` habilita `transcribe_cli`/`batch_cli` a reutilizar um manifest pré-resolvido.
- Ordem de preferência: `manifestUrl` (extensão) → resolução dinâmica via `resolver` → fallback HLS.

## Alterações na Extensão (opcionais)
- Confirmar que `background.js` envia `pageUrl/manifestUrl` para `/api/capture-manifest` e que o popup, ao clicar “Processar”, chama `/api/process` incluindo `manifestUrl`.
- Badge mostra somente 1 (último item), já ajustado.

## Persistência
- `captured_manifests.json`:
  - Estrutura simples: `{ "pageUrl": string, "manifestUrl": string, "domain": string, "timestamp": ISO }` (último por página, chave única por `pageUrl`).
  - Funções utilitárias na interface web: `load_captured()`, `save_captured()`.

## Testes e Validação
- Fluxo extensão → API:
  - POST `/api/capture-manifest` grava o último manifest; validar arquivo `captured_manifests.json`.
  - POST `/api/process` com `pageUrl` + `manifestUrl`: verificar logs “Resolver fonte de mídia” com `detalhes.manifest` igual ao enviado.
- Fluxo UI Web:
  - Botão “Processar Agora” com URL do `targets.txt` e `manifestUrl`: confirmar que relatório e transcrição foram gerados.
- Logs:
  - Inspecionar `logs/<domínio>/<id>/resumo_<id>.process.log.json` nas etapas `resolve` e `ingest`.

## Riscos e Mitigações
- Manifest expirado: se ingestão falhar, cair para resolução tradicional pela página.
- Várias páginas: manter último manifest por `pageUrl` para evitar confusão.

## Entregáveis
- Novos endpoints na interface web com persistência e associação de `manifestUrl`.
- Uso do `resolve_cache.save` antes de chamar o CLI.
- Documentação rápida no README da UI para a integração com a extensão.

## Próximo Passo
- Implementar endpoints e persistência na interface web.
- Testar com um `pageUrl` capturado pela extensão e validar que a transcrição usa o `manifest.m3u8` correto.