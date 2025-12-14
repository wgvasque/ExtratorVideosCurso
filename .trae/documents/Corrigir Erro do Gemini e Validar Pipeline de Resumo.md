## Causa Raiz (Hipótese)
- O erro `'NoneType' object has no attribute 'get'` ocorre na etapa de “Resumo (Gemini)” quando o objeto `res` é `None` ou quando tentamos acessar campos de uma resposta não-extraída (ex.: `resp.text` vazio sem fallback para `candidates`).
- O cliente atual não extrai texto de `candidates/parts` quando `resp.text` está vazio e pode retornar `None` em exceções silenciosas. Além disso, `blocks` muito extensos podem levar a timeouts ou respostas vazias.

## Logs a Verificar
- `logs/<domínio>/<id>/*.process.log.json`: conferir detalhes do passo “summarize” (`gemini_prompt`, `prompt_len`, `gemini_raw`, `gemini_error`).
- Verificar se `gemini_model` está setado e se `resp_len` está zero nas falhas.

## Correções Propostas
### 1) Cliente Gemini
- Implementar `extract_response_text(resp)`:
  - Usar `resp.text` quando disponível
  - Senão, concatenar `candidates[0].content.parts[*].text`
- Controlar tamanho do prompt:
  - Criar `serialize_blocks(blocks, max_chars=15000)` e truncar serialização quando necessário
- Reforçar `summarize_transcription_full`:
  - Primeiro com `models/gemini-2.5-flash`; se qualidade não atende (resumo, pontos, orientações), tentar `models/gemini-2.5-pro`
  - Sempre retornar dict com `{data, raw, model, prompt, origin, error}`; nunca `None`

### 2) CLIs (transcribe_cli/batch_cli)
- Envolver a chamada com `try/except` e, em caso de erro, não preencher campos e setar `origin: failed` + `gemini_error`
- Ao montar `data`, usar sempre `parse_raw_json(res.raw)`; se vazio, manter campos vazios
- Registrar `gemini_prompt`/`gemini_raw` em logs

### 3) Renderer
- As seções devem refletir estritamente o JSON literal
- Em “Retorno Literal do Gemini”, mostrar `Modelo`, `Origem` e `Erro` (quando houver)

### 4) Testes
- Mockar respostas do Gemini:
  - Caso 1: `resp.text` vazio, `candidates.parts` com texto → `extract_response_text` retorna conteúdo
  - Caso 2: resposta insuficiente → disparar segunda tentativa com modelo pro e retornar válido
  - Caso 3: falha geral → saída com `origin: failed` e `error` setado
- Testar `serialize_blocks` para truncar corretamente
- Validar que CLIs não gravam conteúdo quando `origin: failed`

### 5) Validação Final
- Reprocessar `targets.txt`
- Verificar que:
  - Em sucesso: seções preenchidas por Gemini e `gemini_authentic: true`
  - Em falha: campos vazios e “Erro do Gemini” exibido sem regressões

## Entregáveis
- Código do cliente Gemini robusto (extração e retentativa)
- CLIs com tratamento de erro e logs detalhados
- Renderer com exibição de erro
- Testes unitários cobrindo os casos acima
- Documentação breve no README (seção “Resumo com Gemini: comportamento e erros”)

Se aprovado, aplico as correções, rodo os testes e reprocesso os links para validar o fim do erro e ausência de regressões.