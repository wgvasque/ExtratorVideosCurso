## Diagnóstico
- O erro `'NoneType' object has no attribute 'get'` acontece durante a etapa “Resumo (Gemini)” quando a resposta da API não é extraída corretamente (ex.: `resp.text` ausente) e o objeto retornado fica inválido.
- Modelos antigos (`gemini-1.5-*`) não são suportados; a lista de modelos disponíveis retorna `models/gemini-2.5-flash` e `models/gemini-2.5-pro`.
- Prompts muito longos (registrados com ~23k caracteres) podem provocar timeouts/silently-failed responses.

## Correções no Cliente Gemini
- Seleção de modelo: priorizar `models/gemini-2.5-flash` e fallback para `models/gemini-2.5-pro`.
- Extração robusta da resposta:
  - Implementar `extract_response_text(resp)`:
    - Se `resp.text` existir e não for vazio, usar.
    - Senão, juntar `candidates[0].content.parts` (concatenando partes de texto).
    - Se ainda vazio, converter em string segura ou lançar exceção com motivo.
- Retentativas e fallback:
  - Tentar novamente com `models/gemini-2.5-pro` em caso de conteúdo insuficiente ou exceção.
  - Aumentar `timeout` e `max_output_tokens` conforme `prompt_padrao_orientacoes.json`.
- Controle de tamanho do prompt:
  - Se `prompt_len` exceder limiar (ex.: 15k caracteres), truncar a serialização de `blocks` (manter últimos N blocos) e compactar a transcrição para caber.
- Estrita conformidade de saída:
  - Validar JSON retornado (campos obrigatórios), caso inválido, solicitar segunda tentativa com diretivas estritas.
  - Definir `origin: 'gemini'` apenas quando houver resposta válida; caso contrário, `origin: 'failed'` e `gemini_error` com mensagem detalhada.

## Ajustes nas CLIs
- `transcribe_cli.py` e `batch_cli.py`:
  - Usar sempre o JSON literal do Gemini para construir `data` (via `parse_raw_json`).
  - Em erro, não popular campos (ficam vazios) e registrar `gemini_error` e `origin: 'failed'`.
  - Registrar no log `gemini_prompt`, `prompt_len`, `gemini_raw` e `gemini_error`.

## Renderer
- `report_renderer.py`:
  - As seções do topo devem refletir estritamente o JSON literal.
  - Em “Retorno Literal do Gemini”, exibir `Modelo`, `Origem` e `Erro` quando houver.

## Validação
- Executar `targets.txt` e verificar:
  - Em sucesso: seções preenchidas e `gemini_authentic: true`.
  - Em falha: campos vazios e `Erro` visível no HTML/PDF.
  - Qualidade: resumo 200–300 palavras; pontos 7–15 numerados; orientações 7–15.

## Entregáveis
- Código atualizado no cliente Gemini (extração e retentativas).
- CLIs ajustadas para usar apenas conteúdo do Gemini e registrar erros.
- Renderer com erro visível quando `origin: failed`.
- Logs com métricas e motivo de erro.

Confirma continuar com essas alterações e reprocessar os links para validar? 