## Objetivos
- Criar estrutura de diretórios dedicada: `logs/` e `sumarios/`.
- Salvar arquivos de log e resumos automaticamente nas pastas correspondentes.
- Manter hierarquia por origem (domínio/ID) e gerar caminhos dinâmicos, relativos ao projeto.
- Tratar erros de criação de diretórios, permissão e espaço em disco.
- Atualizar documentação para refletir a nova estrutura.

## Estrutura de Diretórios
- Base do projeto (raiz):
  - `logs/` → arquivos `.process.log.json`
  - `sumarios/` → `resumo_<slug>.json` e `resumo_<slug>.md`
- Hierarquia opcional por URL: `/<dominio>/<id>/`.
  - Ex.: `logs/alunos.segueadii.com.br/7033466/96dda19280fb_7033466.process.log.json`
  - Ex.: `sumarios/alunos.segueadii.com.br/7033466/resumo_7033466.json` e `.md`

## Variáveis de Ambiente
- Adicionar `SUMARIOS_DIR` (default: `sumarios`) e usar já existente `LOG_DIR` (default: `logs`).
- Caminhos sempre relativos ao diretório de trabalho do projeto (portabilidade).

## Mudanças de Código
- `extrator_videos/logger_json.py`:
  - `finalize(out_path)` passa a compor caminho: `os.path.join(LOG_DIR, dominio, id, out_path)`.
  - `os.makedirs(..., exist_ok=True)` com try/except; se falhar, fallback para `LOG_DIR` plano.
  - Verificar espaço com `shutil.disk_usage(LOG_DIR)` e registrar aviso em `steps`.
- `extrator_videos/transcribe_cli.py`:
  - Obter `SUMARIOS_DIR` e `LOG_DIR` do `.env`/CLI.
  - Derivar `dominio` (via `urlparse`) e `id` (último segmento da URL); montar destinos:
    - `sumarios/<dominio>/<id>/resumo_<id>.json|.md`
    - Log consolidado já escrito via `StepLogger.finalize` em `logs/<dominio>/<id>/...`.
  - Garantir criação dos diretórios com tratamento de erros:
    - `OSError` (permissão), fallback para `sumarios/` plano.
    - Mensagens registradas no `StepLogger`.
- `extrator_videos/batch_cli.py`:
  - Replicar a mesma lógica para múltiplas URLs.
  - Criar diretórios por URL antes de escrever.
- `extrator_videos/cli.py` (se necessário):
  - Quando for saída de extração (não transcrição), ajustar destino se houver geração de arquivos.

## Tratamento de Erros
- Criação de diretórios: try/except, registrar no log e fallback para diretório base.
- Permissões: capturar `PermissionError`, registrar e fallback.
- Espaço em disco: checar `shutil.disk_usage(path).free`; se insuficiente, registrar falha da etapa e abortar apenas a escrita, mantendo log.

## Compatibilidade
- Usar `os.path.join` e `pathlib` para compatibilidade Windows/Linux.
- Caminhos relativos à raiz do projeto; não usar caminhos absolutos hardcoded.

## Documentação
- Atualizar `README.md` com seção "Estrutura de Arquivos":
  - Descrever `logs/` e `sumarios/`.
  - Mostrar exemplos por domínio/ID.
  - Explicar `SUMARIOS_DIR` e `LOG_DIR`.
  - Notas sobre portabilidade e permissões.

## Validação
- Rodar com `targets.txt` contendo um link e verificar:
  - `sumarios/<dominio>/<id>/resumo_*.json|.md`
  - `logs/<dominio>/<id>/*.process.log.json`
- Checar que erros são registrados e que fallback funciona.

## Entregáveis
- Código ajustado, variáveis `.env` suportadas.
- Documentação atualizada.
- Execução demonstrada com geração organizada de arquivos.