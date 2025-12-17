## Objetivo
- Tornar a extensão capaz de iniciar processamento, acompanhar até concluir e recuperar o status mesmo após fechar e reabrir.
- Exibir tempo decorrido em tempo real.

## Armazenamento de Sessão
- Estrutura em `chrome.storage.local`:
  - `currentSession`: `{ pageUrl, manifestUrl, startedAtISO, status, progress, currentStep }`
  - `hosts`: `["http://localhost:5000","http://127.0.0.1:5000"]`
- Atualizado pelo background a cada polling; lido pelo popup ao abrir.

## Fluxo de Início
- Popup `processVideoWithUI`:
  - Envia `POST /api/process` com fallback de host.
  - Normaliza resposta:
    - Se `200` e `status===already_in_progress` → iniciar polling.
    - Se `200` normal → salvar `currentSession` com `startedAtISO = new Date().toISOString()`.
  - Dispara mensagem `startPolling` para background com `{ pageUrl }`.

## Polling Persistente (Background)
- Novo loop no `background.js`:
  - Mantém `setInterval` de 2s para `/api/status` enquanto `currentSession.status===processing`.
  - Atualiza `chrome.storage.local.currentSession` com `progress`, `currentStep`, `elapsedSec` (derivado de `status.start_time` ou `startedAtISO`).
  - Para automaticamente quando `processing=false`, marca `status=completed` e grava `completedAtISO`.
- Ao `onInstalled`/service worker iniciar:
  - Lê `currentSession`; se `status===processing`, reanexa polling.

## UI do Popup
- Ao `DOMContentLoaded`:
  - Carrega `currentSession`; se existir e `status===processing`, exibe seção e inicia um timer local que usa `elapsedSec` do storage (ou calcula a partir de `startedAtISO`).
- Elementos novos:
  - `#processing-timer` mostrando `mm:ss` (ou `hh:mm:ss`).
- Atualizações:
  - Em cada tick de polling, popup lê storage e atualiza `progress`, `status`, `timer`.

## Tratamento de Erros
- `tryFetch` retorna corpo não-ok com JSON/texto; UI exibe mensagem específica.
- Em `POST /api/process` com 400:
  - Se `already_in_progress`, continua.
  - Senão, exibe erro e não inicia polling.

## Normalização do Manifest
- Manter normalização:
  - Somente envia se for JWT válido em path ou `?p=<JWT>` com 3 segmentos.
  - Substitui captura `?p=...` por path assim que aparecer.

## Verificação
- Testar iniciar processamento, fechar e reabrir popup: UI deve recuperar sessão e timer.
- Confirmar que `GET /api/status` continua sendo polled pelo background até `completed`.
- Validar que `currentSession` reflete progresso e que relatório é gerado.

## Entregáveis
- Atualizações em `background.js` (persistência + polling).
- Atualizações em `processing_ui.js` (recuperação, timer, mensagens).
- Nenhuma mudança de backend necessária além da resposta `already_in_progress` já implementada.