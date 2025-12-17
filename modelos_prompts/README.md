# Guia de Modelos de Prompts

## Visão Geral

Este diretório contém templates de prompts para processamento de transcrições de vídeos. O sistema valida automaticamente que cada prompt segue a estrutura obrigatória de 14 seções.

## Estrutura Obrigatória

Todos os prompts **DEVEM** incluir um bloco JSON com esta estrutura exata:

```json
{
  "resumo_executivo": "string",
  "objetivos_aprendizagem": ["string"],
  "conceitos_fundamentais": [{
    "nome": "string",
    "definicao": "string",
    "exemplos": ["string"],
    "importancia": "string"
  }],
  "estrutura_central": [{
    "titulo": "string",
    "descricao": "string",
    "funcionamento": "string",
    "conexao": "string"
  }],
  "exemplos": [{
    "contexto": "string",
    "demonstra": "string",
    "aplicacao": "string",
    "resultado": "string"
  }],
  "ferramentas_metodos": [{
    "nome": "string",
    "descricao": "string",
    "como_usar": "string",
    "quando_usar": "string",
    "onde_aplicar": "string"
  }],
  "orientacoes_praticas": {
    "acao_imediata": [],
    "acao_curto_prazo": [],
    "acao_medio_prazo": []
  },
  "abordagem_pedagogica": {
    "tom": "string",
    "ritmo": "string",
    "recursos_didaticos": [],
    "tecnicas_reforco": [],
    "engajamento": [],
    "principios_andragogicos": [],
    "estrutura_apresentacao": "string"
  },
  "ideias_chave": {
    "insights_principais": [],
    "principios_estrategicos": [],
    "alertas_armadilhas": [],
    "mindset_recomendado": []
  },
  "pontos_memorizacao": {
    "pilares": [],
    "regras_de_ouro": {"fazer": [], "nao_fazer": []},
    "formulas_estruturas": [],
    "principios_repetidos": []
  },
  "citacoes_marcantes": [{
    "citacao": "string",
    "contexto": "string"
  }],
  "proximos_passos": {
    "acao_imediata": [],
    "acao_curto_prazo": [],
    "acao_medio_prazo": [],
    "acao_continua": []
  },
  "preparacao_proxima_aula": {
    "tema": "string",
    "ganho_prometido": "string",
    "pre_requisitos": [],
    "preparacao_recomendada": [],
    "conexao": "string",
    "prazo": "string"
  },
  "materiais_apoio": [{
    "nome": "string",
    "tipo": "string",
    "descricao": "string",
    "como_acessar": "string",
    "quando_usar": "string",
    "importancia": "string"
  }]
}
```

## Como Criar um Novo Prompt

1. **Copie o MODELO 5** como base (é o modelo de referência validado)
2. **Personalize as instruções** mantendo a estrutura JSON
3. **Adicione o bloco JSON** no formato exato acima
4. **Inclua placeholder** para transcrição: `[AQUI ENTRA A TRANSCRIÇÃO DO VÍDEO]`
5. **Salve** com nome descritivo: `MODELO X PROMPT - Descrição.md`

## Validação

O sistema valida automaticamente:
- ✅ Presença de todas as 14 seções
- ✅ Tipos de dados corretos (string, array, object)
- ✅ Subestruturas obrigatórias
- ⚠️ Campos recomendados (avisos)

### Testar Validação

```bash
python -m extrator_videos.prompt_validator
```

## Modelos Disponíveis

| Modelo | Status | Seções | Descrição |
|--------|--------|--------|-----------|
| MODELO 5 | ✅ Válido | 14/14 | Transcritor especializado (referência) |
| MODELO 4 | ⚠️ Verificar | - | Framework P.R.O.M.P.T. |
| MODELO 3 | ⚠️ Verificar | - | Modelo híbrido |
| MODELO 2 | ❌ Inválido | 0/14 | Sem bloco JSON |

## Mensagens Padrão

Se o LLM não retornar dados para uma seção, use estas mensagens:

```python
"objetivos_aprendizagem": "Nenhum objetivo de aprendizagem foi explicitamente mencionado pelo professor neste vídeo."
"conceitos_fundamentais": "Nenhum conceito fundamental foi explicitamente definido neste vídeo."
"estrutura_central": "O vídeo não apresentou uma estrutura central organizada em etapas ou módulos."
"exemplos": "Nenhum exemplo concreto foi fornecido neste vídeo."
"ferramentas_metodos": "Nenhuma ferramenta específica foi mencionada neste vídeo."
"orientacoes_praticas": "O vídeo focou em teoria/conceitos sem indicar tarefas práticas específicas."
"proximos_passos": "O vídeo não mencionou próximos passos ou sequência de implementação específica."
"preparacao_proxima_aula": "Esta aula funciona como conteúdo standalone, sem indicação de sequência."
"materiais_apoio": "Nenhum material de apoio complementar foi citado explicitamente."
```

## Solução de Problemas

### Prompt Marcado como Inválido

**Problema**: Prompt não aparece como válido na interface

**Soluções**:
1. Verifique se tem bloco ```json no arquivo
2. Confirme que todas as 14 seções estão presentes
3. Valide o JSON em https://jsonlint.com
4. Execute `python -m extrator_videos.prompt_validator` para detalhes

### Seções Ausentes

**Problema**: Validação reporta seções faltando

**Solução**: Adicione todas as seções ao bloco JSON, mesmo que vazias:
```json
{
  "secao_ausente": [],
  // ou
  "secao_ausente": {},
  // ou
  "secao_ausente": ""
}
```

### Tipos Incorretos

**Problema**: Validação reporta tipos inválidos

**Solução**: Verifique os tipos:
- `resumo_executivo`: string
- `objetivos_aprendizagem`: array
- `orientacoes_praticas`: object
- etc.

## Referência Rápida

**Arquivo de Referência**: `MODELO 5 PROMPT - Transcrição Video Aulas.md`

**Validador**: `extrator_videos/prompt_validator.py`

**Loader**: `extrator_videos/prompt_loader.py`

**API**: 
- `GET /prompts` - Lista prompts
- `GET /prompts/<name>` - Detalhes
- `POST /prompts/validate` - Validar

## Contribuindo

1. Crie novo prompt baseado no MODELO 5
2. Teste com `prompt_validator`
3. Verifique na interface web
4. Documente diferenças e casos de uso
