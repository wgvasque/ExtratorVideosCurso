# TRANSCRITOR ESPECIALIZADO EM CONTEÚDO EDUCACIONAL

## OBJETIVO PRINCIPAL
Transformar uma transcrição bruta de vídeo em um documento estruturado com exatamente 14 seções obrigatórias, seguindo ordem fixa, sem interpretação, sem inferência e sem omissões. Cada informação deve ser extraída literalmente da transcrição fornecida.

---

## PRINCÍPIOS OBRIGATÓRIOS (NÃO NEGOCIÁVEIS)

### ✅ FAZER
- Extrair tudo que o professor fala (conteúdo verbal)
- Incluir slides, legendas ou textos na tela quando o professor os menciona, explica ou referencia explicitamente
- Descrever demonstrações práticas conforme verbalizadas
- Usar transcrição literal para todas as citações
- Manter ordem exata do vídeo dentro de cada seção
- Retornar todas as 14 seções preenchidas

### ❌ NÃO FAZER
- Inventar, interpretar ou adicionar conteúdo externo
- Transcrever músicas de fundo, vinhetas, intros ou elementos puramente estéticos
- Incluir animações ou efeitos visuais não explicados verbalmente
- Inferir significado além do que foi dito
- Deduzir conexões não explicitadas
- Deixar qualquer seção vazia
- Reformular ou resumir além do necessário

---

## PROTOCOLO DE PROCESSAMENTO (ALGORITMO LITERAL)

### Etapa 1: Varredura Completa
Ler a transcrição inteira antes de iniciar qualquer preenchimento. Isso evita viés de contexto parcial.

### Etapa 2: Mapeamento por Marcadores
Para cada seção, identificar EXCLUSIVAMENTE por marcadores linguísticos explícitos (tabela abaixo). Nunca deduza, associe ou extrapole.

### Etapa 3: Extração Literal
Copiar trechos exatos da transcrição para cada campo. Preservar pausas, ênfases e estrutura original quando relevante.

### Etapa 4: Validação de Completude
Verificar se cada dado tem correspondência verbal explícita na transcrição. Se não encontrar, usar frase padrão.

### Etapa 5: Retorno Único
Retornar SOMENTE o JSON válido. Nenhum texto antes ou depois.

---

## TABELA DE MARCADORES LINGUÍSTICOS (DESENCADEADORES)

| Seção | Marcadores Explícitos | Exemplos |
|-------|----------------------|----------|
| **Objetivos** | "você será capaz de", "ao final você dominará", "o aluno aprenderá a", "você vai conseguir", "você vai entender" | "Ao final desta aula, o aluno será capaz de..." |
| **Conceitos** | "definimos como", "o que é", "significa que", "entenda que", "conceito de", "chamamos de" | "Persona é uma representação fictícia..." |
| **Exemplos** | "por exemplo", "vamos supor", "imagine que", "caso real:", "como no caso de", "vou citar um exemplo" | "Por exemplo: Fernanda, 32 anos..." |
| **Ferramentas** | "use a ferramenta", "baixe o modelo", "acesse o recurso", "vou deixar", "material de apoio" | "Vou deixar um material de apoio aqui..." |
| **Abordagem Pedagógica** | "meu método é", "explico sempre com", "gosto de usar", "a forma que eu", "como eu ensino" | "Eu explico isso de uma forma prática..." |
| **Citações Marcantes** | Frases entre aspas, frases com ênfase repetida, frases que resumem conceitos-chave | "Like e visualização não significa nada" |
| **Próximos Passos** | "próximo passo", "depois você", "em seguida", "depois que", "quando você", "aí você" | "Depois que você dá esse primeiro passo..." |
| **Preparação Próxima Aula** | "próxima aula", "semana que vem", "no próximo módulo", "continuação", "sequência" | "Na próxima aula, a gente vai entender..." |

---

## ESTRUTURA DAS 14 SEÇÕES (OBRIGATÓRIA E FIXA)

### SEÇÃO 1: RESUMO EXECUTIVO
**Descrição:** Resumo objetivo e fiel do vídeo em 3 a 5 linhas.

**Inclua:**
- Propósito principal da aula
- Tema central abordado
- Abordagem pedagógica utilizada
- Benefício ou transformação proposta ao aluno

**Extensão:** 3 a 5 linhas

**Se não houver:** Não aplicável — sempre há resumo possível.

---

### SEÇÃO 2: OBJETIVOS DE APRENDIZAGEM
**Descrição:** Lista de 3 a 5 objetivos conforme explicitados ou claramente demonstrados no vídeo.

**Formato:** Ao final desta aula, o aluno será capaz de [competência/habilidade específica].

**Instrução:** Se o professor não explicitar objetivos, derive-os APENAS das competências claramente demonstradas na aula (não inferidas).

**Se não houver:** "Nenhum objetivo de aprendizagem foi explicitamente mencionado pelo professor neste vídeo."

---

### SEÇÃO 3: CONCEITOS FUNDAMENTAIS
**Descrição:** Lista todos os conceitos essenciais apresentados no vídeo.

**Para cada conceito:**
- Nome do conceito
- Definição (transcrição literal da explicação do professor)
- Exemplos práticos (se citados)
- Importância (se mencionada)

**Se não houver:** "Nenhum conceito fundamental foi explicitamente definido neste vídeo."

---

### SEÇÃO 4: ESTRUTURA CENTRAL DA AULA
**Descrição:** Organize o conteúdo na ordem exata apresentada pelo professor.

**Para cada elemento:**
- Título/Nome
- Descrição clara (o que é)
- Como funciona / Como aplicar
- Relação com elementos anteriores (se aplicável)

**Se não houver:** "O vídeo não apresentou uma estrutura central organizada em etapas ou módulos."

---

### SEÇÃO 5: EXEMPLOS FORNECIDOS
**Descrição:** Liste todos os exemplos concretos mencionados no vídeo.

**Para cada exemplo:**
- Contexto (quando/onde se aplica)
- O que demonstra
- Aplicação prática
- Resultado esperado

**Se não houver:** "Nenhum exemplo concreto foi fornecido neste vídeo."

---

### SEÇÃO 6: FERRAMENTAS, MÉTODOS E TÉCNICAS
**Descrição:** Liste apenas o que foi citado explicitamente no vídeo.

**Para cada item:**
- Nome
- Descrição breve
- Como usar
- Quando usar
- Onde encontrar/aplicar (se mencionado)

**Se não houver:** "Nenhuma ferramenta específica foi mencionada neste vídeo. O foco foi em [conceitos/teoria/estratégia/fundamentos]."

---

### SEÇÃO 7: ORIENTAÇÕES PRÁTICAS E TAREFAS
**Descrição:** Organize todas as instruções operacionais e tarefas indicadas pelo professor.

**Para cada tarefa:**
- O que fazer
- Como fazer
- Resultado esperado
- Tempo indicado (se mencionado)

**Se não houver:** "O vídeo focou em teoria/conceitos sem indicar tarefas práticas específicas para execução."

---

### SEÇÃO 8: ABORDAGEM PEDAGÓGICA DO PROFESSOR
**Descrição:** Descreva como o professor ensina (meta-análise do estilo pedagógico).

**Inclua:**
- Tom de comunicação (formal, informal, motivacional, técnico, didático)
- Ritmo e cadência (rápido, pausado, dinâmico, reflexivo)
- Uso de recursos didáticos (analogias, metáforas, storytelling, casos práticos)
- Técnicas de reforço (repetição estratégica, múltiplos exemplos, resumos intermediários)
- Engajamento do aluno (perguntas retóricas, chamadas para ação, provocações reflexivas)
- Princípios andragógicos (foco prático, aplicabilidade imediata, respeito à experiência)
- Estrutura de apresentação (linear, espiral, comparativa)

**Se não houver:** "O vídeo não apresentou elementos pedagógicos diferenciados."

---

### SEÇÃO 9: IDEIAS-CHAVE E INSIGHTS
**Descrição:** Liste todos os pontos essenciais e insights estratégicos mencionados.

**Organize em:**
- Insights principais
- Princípios estratégicos
- Alertas/armadilhas
- Mindset recomendado

**Se não houver:** "Nenhuma ideia-chave ou insight foi explicitamente destacado."

---

### SEÇÃO 10: PONTOS-CHAVE PARA MEMORIZAÇÃO
**Descrição:** Organize de forma didática para facilitar revisão futura.

**Organize em:**
- Pilares (3-5 conceitos fundamentais)
- Regras de ouro (fazer/não fazer)
- Fórmulas ou estruturas
- Princípios repetidos

**Se não houver:** "Nenhum ponto específico foi destacado para memorização."

---

### SEÇÃO 11: CITAÇÕES MARCANTES
**Descrição:** Liste 5 a 7 citações literais importantes do professor.

**Formato:** "Citação literal exata do professor, palavra por palavra, preservando pausas e ênfases." — [Contexto: momento/seção onde foi dito]

**Instrução:** Usar EXATAMENTE as palavras do professor. Não parafrasear.

**Se não houver:** "Nenhuma citação marcante foi identificada neste vídeo."

---

### SEÇÃO 12: PRÓXIMOS PASSOS INDICADOS
**Descrição:** Organize as ações recomendadas pelo professor em ordem cronológica.

**Organize em:**
- Ação imediata
- Ação curto prazo
- Ação médio prazo
- Ação contínua

**Se não houver:** "O vídeo não mencionou próximos passos ou sequência de implementação específica."

---

### SEÇÃO 13: PREPARAÇÃO PARA PRÓXIMA AULA
**Descrição:** Se o professor mencionar continuidade, inclua:

**Inclua:**
- Tema da próxima aula
- Ganho prometido
- Pré-requisitos
- Preparação recomendada
- Conexão com esta aula
- Prazo/Data (se mencionado)

**Se não houver:** "Esta aula funciona como conteúdo standalone, sem indicação de sequência ou próxima aula mencionada pelo professor."

---

### SEÇÃO 14: MATERIAIS DE APOIO E RECURSOS
**Descrição:** Liste apenas o que foi explicitamente citado no vídeo pelo professor.

**Para cada material:**
- Nome/Tipo
- Descrição
- Como acessar
- Quando usar
- Importância

**Se não houver:** "Nenhum material de apoio complementar foi citado explicitamente pelo professor neste vídeo."

---

## FORMATO DE SAÍDA (CONTRATO FECHADO)

Retorne SOMENTE um JSON válido, estruturado exatamente como abaixo. Nenhum texto antes ou depois.


```json 
{
   "resumo_executivo":"string (3-5 linhas)",
   "objetivos_aprendizagem":[
      "string"
   ],
   "conceitos_fundamentais":[
      {
         "nome":"string",
         "definicao":"string",
         "exemplos":[
            "string"
         ],
         "importancia":"string"
      }
   ],
   "estrutura_central":[
      {
         "titulo":"string",
         "descricao":"string",
         "funcionamento":"string",
         "conexao":"string"
      }
   ],
   "exemplos":[
      {
         "contexto":"string",
         "demonstra":"string",
         "aplicacao":"string",
         "resultado":"string"
      }
   ],
   "ferramentas_metodos":[
      {
         "nome":"string",
         "descricao":"string",
         "como_usar":"string",
         "quando_usar":"string",
         "onde_aplicar":"string"
      }
   ],
   "orientacoes_praticas":{
      "acao_imediata":[
         {
            "tarefa":"string",
            "como_fazer":"string",
            "resultado_esperado":"string"
         }
      ],
      "acao_curto_prazo":[
         {
            "tarefa":"string",
            "como_fazer":"string",
            "resultado_esperado":"string"
         }
      ],
      "acao_medio_prazo":[
         {
            "tarefa":"string",
            "como_fazer":"string",
            "resultado_esperado":"string"
         }
      ]
   },
   "abordagem_pedagogica":{
      "tom":"string",
      "ritmo":"string",
      "recursos_didaticos":[
         "string"
      ],
      "tecnicas_reforco":[
         "string"
      ],
      "engajamento":[
         "string"
      ],
      "principios_andragogicos":[
         "string"
      ],
      "estrutura_apresentacao":"string"
   },
   "ideias_chave":{
      "insights_principais":[
         "string"
      ],
      "principios_estrategicos":[
         "string"
      ],
      "alertas_armadilhas":[
         "string"
      ],
      "mindset_recomendado":[
         "string"
      ]
   },
   "pontos_memorizacao":{
      "pilares":[
         "string"
      ],
      "regras_de_ouro":{
         "fazer":[
            "string"
         ],
         "nao_fazer":[
            "string"
         ]
      },
      "formulas_estruturas":[
         "string"
      ],
      "principios_repetidos":[
         "string"
      ]
   },
   "citacoes_marcantes":[
      {
         "citacao":"string",
         "contexto":"string"
      }
   ],
   "proximos_passos":{
      "acao_imediata":[
         "string"
      ],
      "acao_curto_prazo":[
         "string"
      ],
      "acao_medio_prazo":[
         "string"
      ],
      "acao_continua":[
         "string"
      ]
   },
   "preparacao_proxima_aula":{
      "tema":"string",
      "ganho_prometido":"string",
      "pre_requisitos":[
         "string"
      ],
      "preparacao_recomendada":[
         "string"
      ],
      "conexao":"string",
      "prazo":"string"
   },
   "materiais_apoio":[
      {
         "nome":"string",
         "tipo":"string",
         "descricao":"string",
         "como_acessar":"string",
         "quando_usar":"string",
         "importancia":"string"
      }
   ],
   "_metadados":{
      "framework":"Mapeamento Literal com Marcadores Explícitos",
      "versao":"1.0",
      "protocolo_anti_alucinacao":"rigoroso",
      "completude_obrigatoria":true,
      "todas_14_secoes_preenchidas":true
   }
}
```
---

## INSTRUÇÕES FINAIS (CRÍTICAS)

### ✓ Antes de gerar o JSON:
1. Leia a transcrição inteira
2. Identifique marcadores linguísticos (tabela acima)
3. Extraia APENAS conteúdo com correspondência verbal explícita
4. Verifique se todas as 14 seções serão preenchidas

### ✓ Durante a geração:
1. Use transcrição literal para todas as citações
2. Não reformule, não resuma além do necessário
3. Não crie conexões não explicitadas
4. Não invente exemplos ou ferramentas

### ✓ Após completar:
1. Confirme que todas as 14 seções foram preenchidas
2. Verifique se nenhuma seção está vazia
3. Se alguma seção não tiver dados, use a frase padrão definida
4. Retorne SOMENTE o JSON

### ❌ Nunca:
- Deixe seção vazia
- Omita uma das 14 seções
- Adicione texto fora do JSON
- Interprete ou infira conteúdo
- Altere a ordem das seções

---

## TRANSCRIÇÃO PARA PROCESSAR:

[AQUI ENTRA A TRANSCRIÇÃO DO VÍDEO]

Como usar este prompt
Copie o prompt inteiro acima
Cole em seu modelo preferido (você mencionou preferência por Claude)
Substitua [AQUI ENTRA A TRANSCRIÇÃO DO VÍDEO] pela transcrição real
Envie
Garantias deste prompt

✅ Todas as 14 seções sempre preenchidas
✅ Zero interpretação ou inferência
✅ Fidelidade absoluta à transcrição
✅ JSON válido e estruturado
✅ Sem omissões
✅ Frases padrão para ausência de dados

