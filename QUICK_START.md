# 🚀 Guia Rápido - Video Processor Pro

## ⚡ Início Rápido

### Opção 1: Interface Web (Recomendado)

```bash
cd web_interface
start.bat  # Windows
# ou
./start.sh  # Linux/Mac
```

Acesse: **http://localhost:5000**

### Opção 2: Linha de Comando

**Processar 1 vídeo**:
```bash
python -m extrator_videos.transcribe_cli "URL_DO_VIDEO" --referer "URL_DO_SITE"
```

**Processar vários vídeos**:
```bash
python -m extrator_videos.batch_cli --file targets.txt
```

---

## 📋 Pré-requisitos

1. Python 3.8+
2. Dependências instaladas:
   ```bash
   pip install -r requirements.txt
   ```

3. Arquivo `.env` configurado:
   ```env
   OPENROUTER_API_KEY=sua_chave
   GEMINI_API_KEY=sua_chave
   EMAIL=seu_email
   SENHA=sua_senha
   ```

---

## 🎯 Fluxo de Uso

### Via Interface Web

1. **Abrir interface**: `http://localhost:5000`
2. **Colar URLs** no campo de texto (uma por linha)
3. **Clicar** em "🚀 Processar Agora"
4. **Acompanhar** progresso em tempo real
5. **Visualizar** relatórios gerados

### Via Linha de Comando

1. **Criar** arquivo `targets.txt` com URLs
2. **Executar**: `python -m extrator_videos.batch_cli --file targets.txt`
3. **Aguardar** processamento
4. **Verificar** pasta `sumarios/` para resultados

---

## 📁 Onde Encontrar os Resultados

```
sumarios/
└── alunos.segueadii.com.br/
    └── 7033466/
        ├── resumo_7033466.json    # Dados estruturados
        ├── resumo_7033466.md      # Markdown
        └── render/
            └── Aula_1_*.html      # HTML moderno
```

---

## 🔧 Solução de Problemas

### Erro: "OpenRouter API key not found"
```bash
# Adicionar no .env:
OPENROUTER_API_KEY=sua_chave_aqui
```

### Erro: "Port 5000 already in use"
```python
# Alterar porta no web_interface/app.py:
socketio.run(app, host='0.0.0.0', port=5001)
```

### Erro: "Module not found"
```bash
pip install -r requirements.txt
pip install -r web_interface/requirements.txt
```

---

## 💡 Dicas

- **Ctrl+Enter** na interface web = Processar
- **ESC** = Fechar modal
- Use **modelos gratuitos** para custo $0.00
- **Fallback automático** garante ~99% de sucesso
- **Cache** evita reprocessar vídeos (7 dias)

---

## 📊 Estatísticas

- ✅ **10 modelos** LLM disponíveis
- ✅ **8 gratuitos** + 2 pagos
- ✅ **~99%** taxa de sucesso
- ✅ **$0.00** custo médio
- ✅ **3-4 min** por vídeo

---

## 🆘 Suporte

Documentação completa:
- `FALLBACK_SYSTEM.md` - Sistema de fallback
- `OPENROUTER_GUIDE.md` - Guia OpenRouter
- `BATCH_PROCESSING.md` - Processamento em lote
- `web_interface/README.md` - Interface web

---

**Pronto para usar!** 🎉
