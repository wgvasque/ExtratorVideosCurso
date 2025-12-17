# Como Testar Manifests Capturados

## ✅ Método Correto (Sem erro 401)

1. **Clique em "📋 Copiar Manifest"** na extensão
2. **Vá para a aba do Hub.la** (onde você está logado)
3. **Cole a URL na barra de endereços** e pressione Enter
4. **Resultado:** Você verá o conteúdo do manifest HLS!

## 🎯 Por que funciona?

- A aba do Hub.la **tem os cookies de autenticação**
- O Cloudflare Stream valida a sessão
- Você consegue acessar o manifest sem erro 401

## 📋 O que você verá:

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1299467363,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
https://customer-59tox5ldd8eaq4uj.cloudflarestream.com/.../video/1080/...
#EXT-X-STREAM-INF:BANDWIDTH=799467363,RESOLUTION=1280x720,CODECS="avc1.640028,mp4a.40.2"
https://customer-59tox5ldd8eaq4uj.cloudflarestream.com/.../video/720/...
```

Isso significa que o manifest está **válido e acessível**! ✅

## ❌ Método Antigo (Dava erro 401)

~~Abrir em nova aba~~ → Nova aba não tem cookies → 401 Unauthorized

## 🚀 Uso no Sistema

O sistema de processamento **não precisa** dos cookies porque:
- FFmpeg envia headers corretos (Referer, Origin)
- Token está na URL (`?p=...`)
- Funciona mesmo sem cookies do navegador

**Resumo:** Botão agora **copia** ao invés de abrir. Cole na aba do Hub.la para testar sem erro!
