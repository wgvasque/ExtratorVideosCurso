## Escopo
- Modificar apenas a interface web (arquivos em `web_interface/`), mantendo intacto todo o código de processamento existente.

## Integração e Caminhos
- Resolver diretórios com base no projeto:
  - `project_root = Path(__file__).parent.parent`
  - `sumarios_dir = project_root / os.getenv('SUMARIOS_DIR','sumarios')`
  - `logs_dir = project_root / os.getenv('LOG_DIR','logs')`
- Aplicar nas rotas `/api/reports` e `/api/report/<domain>/<video_id>` para leitura e envio de arquivos.

## Execução e Cancelamento
- Usar `socketio.start_background_task(process_videos_batch, urls)` no lugar de `threading.Thread` para melhor integração com SocketIO.
- Alterar execução por vídeo para `subprocess.Popen` (em vez de `subprocess.run`) com `cwd=project_root` e registrar o handle do processo atual em `processing_state`.
- Implementar cancelamento real:
  - Em `/api/cancel`, se houver processo em execução (`Popen`), chamar `terminate()`/`kill()` e atualizar estado.
- Suportar escolha lote/individual:
  - Frontend adiciona seletor (radio ou toggle) e, se individual, processa apenas a primeira URL válida.

## Botões e Estados (Frontend)
- `startProcessing()`:
  - Desabilitar “Processar” e habilitar “Cancelar”, mostrar cards de progresso e logs
  - Prevenir múltiplos envios enquanto `is_processing` estiver true
- `cancelProcessing()`:
  - Chamar `/api/cancel`, restaurar UI (habilitar “Processar”, desabilitar “Cancelar”, limpar timer)
- Restaurar estado ao concluir/cancelar:
  - Remover classe `processing`, atualizar badge, reabilitar botões, atualizar relatórios e limpar recursos (timer, estado)

## Logs em Tempo Real
- Backend:
  - Emitir eventos SocketIO com payloads estruturados:
    - `progress`: `{current, total, percent, url, elapsed_sec, eta_sec}`
    - `video_complete`: `{url, current, total, duration_ms}`
    - `video_error`: `{url, error, current, total, stderr_head}`
  - Manter histórico em memória (últimas N execuções) e arquivo `web_interface/logs/web_process.log` com append
- Frontend:
  - `addLog()` usa cores por severidade e mantém pane rolável com histórico
  - Mostrar elapsed e ETA no card de progresso
  - Prevenir ações inválidas durante execução (botões/inputs desabilitados)

## Responsividade e UX
- Tailwind já incluído; garantir comportamento responsivo em todos os cards
- Feedback claro (badges, progress bar, timer, logs) e prevenção de ações inválidas
- Modal de relatório mantém navegação fluida; botão “Atualizar” recarrega lista

## Endpoints adicionais
- `/api/health`: retorna `cwd`, presença de dirs (`sumarios`, `logs`), flags `is_processing`, e variáveis relevantes (`USE_OPENROUTER` set/not set) para diagnóstico rápido
- `/api/process_targets`: inicia processamento lendo `targets.txt` do `project_root`

## Testes
- Cenários:
  - Processamento sucesso (lote e individual)
  - Cancelamento no meio do batch
  - Erro controlado (URL inválida) com exibição do log e erro
  - Execução prolongada: verificar estabilidade dos eventos e UI
- Validações:
  - Precisão dos logs (elapsed/ETA)
  - Relatórios listados e acessíveis

## Documentação
- Adicionar seção “Interface Web” no README:
  - Como iniciar (`python web_interface/app.py`)
  - Endpoints disponíveis
  - Variáveis necessárias
  - Fluxo de execução e cancelamento

Confirma que posso aplicar essas mudanças exclusivamente na interface web e então executar os testes de validação? 