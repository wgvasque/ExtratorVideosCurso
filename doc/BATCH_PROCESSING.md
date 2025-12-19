# Como Processar Múltiplos Vídeos - targets.txt

## ✅ Sistema Já Automatizado!

O sistema possui um módulo `batch_cli.py` que processa automaticamente todos os vídeos listados no arquivo `targets.txt`.

---

## 📋 Arquivo targets.txt

Atualmente contém 3 vídeos:

```
https://alunos.segueadii.com.br/area/produto/item/7033466
https://alunos.segueadii.com.br/area/produto/item/7081698
https://alunos.segueadii.com.br/area/produto/item/7081701
```

---

## 🚀 Como Usar

### Comando Básico

```bash
python -m extrator_videos.batch_cli --file targets.txt --referer "https://alunos.segueadii.com.br/"
```

### Comando Completo (com todas as opções)

```bash
python -m extrator_videos.batch_cli \
  --file targets.txt \
  --referer "https://alunos.segueadii.com.br/" \
  --email "wgvasque@gmail.com" \
  --senha "152798572230917" \
  --outdir "." \
  --loglevel "info" \
  --logdir "logs"
```

### Usando Variáveis do .env (Recomendado)

Como o `.env` já está configurado, basta:

```bash
python -m extrator_videos.batch_cli --file targets.txt
```

O sistema automaticamente usará:
- `EMAIL` e `SENHA` do `.env`
- `REFERER` do `.env`
- `LOG_LEVEL` e `LOG_DIR` do `.env`
- Todas as configurações do OpenRouter

---

## 🎯 O Que o Batch Faz

Para cada URL no arquivo `targets.txt`, o sistema:

1. ✅ **Autentica** usando credenciais do `.env`
2. ✅ **Extrai** o vídeo da plataforma
3. ✅ **Transcreve** usando Whisper
4. ✅ **Gera resumo** usando OpenRouter (com fallback automático)
5. ✅ **Cria HTML** moderno com novo design
6. ✅ **Salva arquivos**:
   - `resumo.json` - Dados estruturados
   - `resumo.md` - Markdown
   - `render/*.html` - HTML moderno
   - `*.process.log.json` - Logs detalhados

---

## 📂 Estrutura de Saída

```
sumarios/
└── alunos.segueadii.com.br/
    ├── 7033466/
    │   ├── resumo_7033466.json
    │   ├── resumo_7033466.md
    │   └── render/
    │       └── Aula_1__O_Mapa_do_Tesouro_*.html
    ├── 7081698/
    │   ├── resumo_7081698.json
    │   ├── resumo_7081698.md
    │   └── render/
    │       └── Aula_2__O_Alvo_Perfeito_*.html
    └── 7081701/
        ├── resumo_7081701.json
        ├── resumo_7081701.md
        └── render/
            └── Aula_3__A_Fórmula_Secreta_*.html
```

---

## ⚙️ Configurações Importantes

### Cache
- **Transcrições**: Armazenadas em `sumarios_cache/` por 168 horas (7 dias)
- **Resoluções**: Armazenadas em `resolve_cache/` por 72 horas (3 dias)
- Evita reprocessar vídeos já transcritos

### Processamento Paralelo
```env
MAX_PARALLEL_CHUNKS=3  # Processa 3 chunks simultaneamente
CHUNK_SECONDS=60       # Divide áudio em chunks de 60s
```

### OpenRouter com Fallback
```env
OPENROUTER_USE_FALLBACK=true
OPENROUTER_MAX_FALLBACK_ATTEMPTS=10
```

---

## 🎨 Recursos do Novo HTML

Cada vídeo processado gera um HTML moderno com:

- 🎨 **Gradiente roxo** no header
- 📑 **Navegação rápida** sticky
- 📝 **Cards coloridos** para cada seção
- ✨ **Listas estilizadas** com cores alternadas
- 🎯 **Timeline visual** para orientações
- 📄 **Seções colapsáveis** (transcrição e JSON)
- 📱 **Responsivo** (mobile, tablet, desktop)
- ⬆️ **Botão voltar ao topo** funcionando

---

## 📊 Monitoramento

### Logs em Tempo Real

Durante o processamento, você verá:

```
🔄 Tentativa 1/10: google/gemini-2.0-flash-exp:free
   ✅ Sucesso com google/gemini-2.0-flash-exp:free!
```

### Logs Detalhados

Cada vídeo gera um log JSON completo em:
```
logs/alunos.segueadii.com.br/7033466/*.process.log.json
```

Contém:
- Tempo de cada etapa
- Modelo LLM usado
- Tentativas de fallback
- Erros (se houver)
- Validações de qualidade

---

## 🔧 Troubleshooting

### Erro de Autenticação
```bash
# Verificar credenciais no .env
EMAIL=wgvasque@gmail.com
SENHA=152798572230917
```

### Vídeo Não Processa
1. Verificar se URL está correta
2. Verificar se tem acesso ao vídeo
3. Verificar logs em `logs/`

### Resumo Incompleto
- Sistema usa fallback automático
- Tenta 10 modelos diferentes
- Se todos falharem, verifica logs

---

## 💡 Dicas

### Adicionar Mais Vídeos

Edite `targets.txt` e adicione URLs (uma por linha):

```
https://alunos.segueadii.com.br/area/produto/item/7033466
https://alunos.segueadii.com.br/area/produto/item/7081698
https://alunos.segueadii.com.br/area/produto/item/7081701
https://alunos.segueadii.com.br/area/produto/item/NOVO_VIDEO
```

### Processar Apenas Novos

O sistema usa cache! Se um vídeo já foi processado, ele:
- Reutiliza a transcrição (se < 7 dias)
- Gera novo resumo com OpenRouter
- Cria novo HTML

### Limpar Cache

```bash
# Limpar cache de transcrições
Remove-Item -Recurse -Force sumarios_cache/

# Limpar cache de resoluções
Remove-Item -Recurse -Force resolve_cache/
```

---

## ✅ Pronto para Usar!

O sistema está **100% automatizado** e pronto para processar todos os vídeos do `targets.txt`!

Basta executar:

```bash
python -m extrator_videos.batch_cli --file targets.txt
```

E aguardar o processamento completo! 🚀
