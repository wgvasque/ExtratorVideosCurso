# 🎥 Video Extractor Helper - Extensão do Navegador

Extensão para Chrome/Firefox que captura automaticamente URLs de vídeo (manifests `.m3u8`) e envia para o sistema de processamento local.

## 🚀 Como Instalar

### Chrome/Edge

1. **Abra a página de extensões:**
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

2. **Ative o "Modo do desenvolvedor"** (canto superior direito)

3. **Clique em "Carregar sem compactação"**

4. **Selecione a pasta:** `d:\Cursor\ExtratorVideosCurso\browser_extension`

5. **Pronto!** A extensão aparecerá na barra de ferramentas 🎉

### Firefox

1. **Abra:** `about:debugging#/runtime/this-firefox`

2. **Clique em "Carregar extensão temporária..."**

3. **Selecione o arquivo:** `d:\Cursor\ExtratorVideosCurso\browser_extension\manifest.json`

4. **Pronto!** A extensão ficará ativa até fechar o Firefox

## 📖 Como Usar

### Passo 1: Certifique-se que a API está rodando
```bash
cd web_interface
python app.py
```

### Passo 2: Acesse o Hub.la normalmente
1. Faça login no Hub.la como sempre faz
2. Navegue até a página do vídeo
3. Dê play no vídeo

### Passo 3: A extensão captura automaticamente!
- Quando o vídeo carregar, a extensão intercepta o manifest `.m3u8`
- Um badge verde aparece no ícone da extensão mostrando quantos vídeos foram capturados
- O manifest é enviado automaticamente para `http://localhost:5000/api/capture-manifest`

### Passo 4: Visualizar capturas
- Clique no ícone da extensão para ver a lista de vídeos capturados
- Ou acesse: `http://localhost:5000/api/manifests` para ver o JSON completo

## 🔧 Como Funciona

```
┌─────────────────┐
│  Você navega    │
│  no Hub.la      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Vídeo carrega  │
│  Player faz     │
│  request .m3u8  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Extensão       │
│  intercepta     │
│  automaticamente│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Envia para     │
│  localhost:5000 │
│  /api/capture   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sistema salva  │
│  em arquivo     │
│  JSON           │
└─────────────────┘
```

## 📁 Arquivos Criados

- **`captured_manifests.json`** - Mapeamento de URLs capturadas
  ```json
  {
    "https://app.hub.la/m/xxx/p/yyy": {
      "manifestUrl": "https://cloudflarestream.com/.../manifest/video.m3u8",
      "domain": "app.hub.la",
      "timestamp": "2025-12-15T15:00:00Z",
      "captured_at": "2025-12-15T15:00:05Z"
    }
  }
  ```

## 🎯 Vantagens

✅ **Sem detecção de bot** - Roda no navegador real  
✅ **Você faz login normalmente** - Como sempre faz  
✅ **Captura automática** - Não precisa copiar manualmente  
✅ **Funciona com qualquer site** - Não só Hub.la  
✅ **Armazena histórico** - Vê todos os vídeos capturados  

## 🔍 Debugar

### Ver logs da extensão:
1. Clique com botão direito no ícone da extensão
2. "Inspecionar popup" (para ver logs do popup)
3. Ou vá em `chrome://extensions/` → "Detalhes" → "Inspecionar visualizações: service worker"

### Ver se API está recebendo:
```bash
# Logs do Flask mostrarão:
✅ [Extension] Manifest capturado: app.hub.la
   Page: https://app.hub.la/m/xxx/p/yyy
   Manifest: https://cloudflarestream.com/...
```

## 🛠️ Próximos Passos

Depois de capturar os manifests, você pode:

1. **Processar automaticamente:**
   - O sistema lerá `captured_manifests.json`
   - Usará o manifest direto ao invés de tentar extrair

2. **Ver na interface web:**
   - Adicionar seção mostrando vídeos capturados
   - Botão para processar vídeos capturados

## ❓ Problemas Comuns

**Extensão não aparece:**
- Verifique se o "Modo desenvolvedor" está ativado
- Recarregue a extensão em `chrome://extensions/`

**Não captura vídeos:**
- Verifique se a API está rodando (`localhost:5000`)
- Abra o console da extensão para ver erros
- Certifique-se que deu play no vídeo

**Badge não atualiza:**
- Clique no ícone da extensão
- Clique em "Atualizar"

## 📝 Notas

- A extensão funciona apenas enquanto o navegador está aberto
- Os manifests ficam salvos em `captured_manifests.json`
- Você pode limpar a lista clicando em "Limpar Lista" no popup
