# Sistema de Extração de Vídeos - Modos de Operação

## 🎯 Dois Modos Disponíveis

### Modo 1: Extensão do Navegador (Recomendado para Hub.la)
✅ **Vantagens:**
- Sem detecção de bot
- Login manual (mais confiável)
- Captura automática
- Funciona com sites protegidos

**Como usar:**
1. Instale a extensão (veja `browser_extension/README.md`)
2. Acesse o site normalmente e faça login
3. Dê play no vídeo
4. A extensão captura automaticamente
5. Processe normalmente com `batch_cli` ou interface web

### Modo 2: Automação Tradicional (Para sites sem proteção anti-bot)
✅ **Vantagens:**
- Totalmente automatizado
- Não precisa interação manual
- Funciona para YouTube, Vimeo, etc.

**Como usar:**
1. Configure credenciais em `accounts.json` (se necessário)
2. Execute: `python -m extrator_videos.cli URL`
3. O sistema tenta extrair automaticamente

## 🔄 Funcionamento Inteligente

O sistema **automaticamente escolhe** o melhor método:

```
1. Verifica se existe manifest capturado pela extensão
   ├─ SIM → Usa manifest capturado ✅
   └─ NÃO → Tenta automação tradicional 🤖
```

**Exemplo prático:**

```bash
# Hub.la com extensão
# 1. Você acessa Hub.la no navegador e dá play
# 2. Extensão captura manifest
# 3. Depois você processa:
python -m extrator_videos.batch_cli --file targets.txt

# Sistema detecta manifest capturado e usa ele!
# ✅ [Extension] Usando manifest capturado pela extensão
```

## 📁 Arquivo de Manifests Capturados

Local: `captured_manifests.json`

```json
{
  "https://app.hub.la/m/xxx/p/yyy": {
    "manifestUrl": "https://cloudflarestream.com/.../video.m3u8",
    "domain": "app.hub.la",
    "timestamp": "2025-12-15T15:00:00Z",
    "captured_at": "2025-12-15T15:00:05Z"
  }
}
```

## 🎮 Fluxo Completo

### Para Hub.la (com extensão):
1. **Captura** (manual):
   - Abra Hub.la no navegador
   - Faça login
   - Dê play no vídeo
   - Extensão captura automaticamente

2. **Processamento** (automático):
   ```bash
   python -m extrator_videos.batch_cli --file targets.txt
   ```
   - Sistema detecta manifest capturado
   - Usa manifest direto
   - Processa normalmente

### Para outros sites (automação):
```bash
python -m extrator_videos.cli https://youtube.com/watch?v=xxx
```
- Sistema tenta extração automática
- Se falhar, você pode usar a extensão

## ⚙️ Variáveis de Ambiente

Adicione no `.env` se quiser forçar um modo:

```bash
# Forçar uso apenas de manifests capturados (ignora automação)
USE_EXTENSION_ONLY=true

# Desabilitar verificação de manifests capturados
DISABLE_EXTENSION_CHECK=false
```

## 🔍 Debug

Ver se manifest foi capturado:
```bash
# Ver arquivo JSON
cat captured_manifests.json

# Ou via API
curl http://localhost:5000/api/manifests
```

Ver logs durante processamento:
```
✅ [Extension] Usando manifest capturado pela extensão
   Page: https://app.hub.la/m/xxx/p/yyy
   Manifest: https://cloudflarestream.com/...
🔄 [Extension] Processando com manifest capturado
```

## 💡 Dicas

1. **Hub.la sempre falha?** → Use a extensão
2. **YouTube/Vimeo?** → Automação funciona bem
3. **Site novo?** → Tente automação primeiro, se falhar use extensão
4. **Quer garantir?** → Use extensão para todos os sites

## 🚀 Resumo

- ✅ **Extensão instalada** → Captura automática + processamento normal
- ❌ **Sem extensão** → Apenas automação tradicional
- 🔄 **Sistema escolhe automaticamente** o melhor método
- 📦 **Nada quebra** → Tudo continua funcionando como antes
