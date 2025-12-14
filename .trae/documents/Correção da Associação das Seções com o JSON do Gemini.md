## Objetivos

* Criar um sistema modular para gerenciamento contínuo de prompts do Gemini.

* Permitir ajustes finos (seções, componentes, parâmetros), versionamento e registro de desempenho.

* Garantir integridade do JSON e compatibilidade com a API.

## Estrutura de Arquivos

* `prompt_padrao.json`: repositório principal do prompt e metadados.

* `extrator_videos/prompt_manager.py`: API para carregar/salvar, editar seções, versionar e reverter.

* `extrator_videos/prompt_optimizer.py`: operações de otimização (adição/remoção de componentes, ajuste de parâmetros, criação de variações).

* `extrator_videos/prompt_versions/`: diretório para armazenar versões alternativas (JSON) e snapshots.

* `tests/test_prompt_manager.py`: testes de integridade, compatibilidade e desempenho básico.

* Integração: `extrator_videos/gemini_client.py` lê `prompt_padrao.json` e aplica parâmetros.

## Esquema do `prompt_padrao.json`

* `metadata`: { `nome`, `versao`, `criado_em` (ISO), `modificado_em` (ISO), `autor` }

* `parametros`: { `modelo`, `temperatura`, `top_p`, `max_tokens`, `candidate_count`, `timeout` }

* `estrutura`: {

  * `contexto`: texto base (regras, objetivos)

  * `formato_saida`: instruções de estrutura (JSON/Markdown)

  * `diretivas`: lista de diretivas (claridade, concisão, foco)

  * `pos_processamento`: dicas para evitar redundância/PII
    }

* `componentes`: \[ { `id`, `descricao`, `conteudo`, `ativo` } ]

* `historico`: \[ { `versao`, `data`, `autor`, `alteracoes` (diff/resumo), `motivo` } ]

* `desempenho`: \[ { `versao`, `timestamp`, `metricas`: { `tempo_ms`, `tokens_out`, `coerencia`, `fidelidade`, `utilidade` }, `observacoes` } ]

## Funcionalidades do `prompt_manager.py`

* `load(path)`, `save(data, path)`: IO seguro com validação de esquema.

* `edit_section(secao, novo_conteudo)`: altera `estrutura.contexto`, `formato_saida` etc.

* `add_component(componente)`, `remove_component(id)`, `toggle_component(id, ativo)`.

* `set_params(**kwargs)`: ajusta `temperatura`, `max_tokens`, etc., com limites.

* `snapshot_version(motivo)`: incrementa `versao`, atualiza timestamps e adiciona ao `historico`.

* `revert_to(versao)`: carrega versão anterior de `prompt_versions/` e salva como atual.

* `record_performance(versao, metricas, observacoes)`: adiciona entrada em `desempenho`.

* `validate(data)`: checagem de integridade (campos obrigatórios, tipos).

## Funcionalidades do `prompt_optimizer.py`

* `optimize_for_summary(data)`: aplica heurísticas para sumarização (reduz temperatura, reforça diretivas de concisão, ajusta `formato_saida`).

* `create_variant(data, nome, ajustes)`: gera versão alternativa com parâmetros/estruturas diferentes.

* `diff_versions(v1, v2)`: gera resumo/patch textual das diferenças para histórico.

## Versionamento

* Pasta `prompt_versions/versao_<N>.json` com snapshot completo.

* `historico` interno registra mudanças (quem, quando, o quê).

* Reversões: recupera snapshot pelo número de versão, atualiza `prompt_padrao.json` e incrementa `versao` com `motivo: revert`.

## Integração com `gemini_client.py`

* Ler `prompt_padrao.json` em `configure()`:

  * Carregar `parametros` (modelo, temperatura, etc.) no client.

  * Montar `prompt` concatenando `estrutura` + `componentes ativos`.

* Compatibilidade: validar que `modelo` existe; fallback para candidatos conhecidos.

## Testes (`tests/test_prompt_manager.py`)

* Integridade JSON: criar/editar/salvar e reabrir, validar esquema.

* Compatibilidade Gemini: simular `configure()` com dados do JSON, verificar parâmetros aplicados.

* Desempenho: mock de chamadas que registram `tempo_ms` e avaliar registro em `desempenho`.

* Versionamento: criar 2 versões, verificar `historico`, salvar snapshot e reverter.

* Edição: adicionar/remover/toggle componentes, garantir id unicidade.

## Segurança e Robustez

* IO atômico (tmp + rename) ao salvar.

* Sem registro de chaves (`GEMINI_API_KEY`) no JSON.

* Validação de limites: `temperatura` (0–1), `top_p` (0–1), `max_tokens` (>=1).

* Tratamento de erros: exceções claras e não destrutivas.

## Documentação

* Atualizar `README.md`:

  * Estrutura do `prompt_padrao.json`.

  * Como criar variantes e reverter versões.

  * Como registrar desempenho e interpretar métricas.

## Passos de Implementação

1. Criar `prompt_padrao.json` inicial com estrutura e parâmetros padrão.
2. Implementar `prompt_manager.py` com API descrita e validação.
3. Implementar `prompt_optimizer.py` com heurísticas e criação de variantes.
4. Integrar leitura do prompt em `gemini_client.py`.
5. Criar testes em `tests/test_prompt_manager.py` cobrindo integridade, compatibilidade e versionamento.
6. Atualizar `README.md` com guia de uso e manutenção.

## Validação

* Rodar testes unitários.

* Testar uma execução real do resumo, registrando desempenho no JSON.

## Confirmação

* Se aprovado, iniciarei a implementação e os testes conforme descrito.

