## Objetivos
- Extrair URLs de vídeo (.mp4, .m3u8, .ts, .mov, .webm, .ogg) a partir de páginas web.
- Capturar e analisar tráfego de rede do navegador para detectar vídeos, inclusive via players e service workers.
- Processar HLS/DASH, calcular qualidade e tamanho estimado, e fornecer link direto de download quando possível.
- Detectar e reportar DRM sem burlar proteções; coletar metadados seguros.
- Entregar módulo reutilizável, integrável em futuros projetos.

## Tecnologia
- Navegação e captura de rede: Playwright (Python) com contexto persistente e interceptação de requests/responses.
- Parsing de playlists: `m3u8` (HLS) e `mpd-parser`/equivalente Python para DASH.
- Metadados: `ffprobe` (FFmpeg) quando disponível; fallback por cabeçalhos HTTP e playlists.
- Anti-bot: fingerprinting controlado, cabeça real (headful) opcional, delays humanos, rotação de proxies.
- Alternativa ao Playwright: `mitmproxy` em modo proxy para captura passiva; combinável para páginas com service workers complexos.

## Arquitetura do Módulo
- `browser`: gerencia contexto Playwright, user-agent, proxies, cookies e eventos de rede.
- `network_capture`: coleta requests/responses, filtra por `Content-Type` e extensões alvo, normaliza URLs.
- `instrumentation`: hooks de `fetch`, `XMLHttpRequest`, `HTMLMediaElement.src`, `MediaSource`, e EME para detectar fontes geradas dinamicamente.
- `hls`: parser de master/variant playlists, cálculo de variantes (resolução/bitrate), lista de segmentos, estimativa de tamanho.
- `dash`: parser de MPD, mapeamento de AdaptationSets/Representations e estimativas.
- `drm`: detecção (Widevine/FairPlay/PlayReady) via EME e chaves em playlists (`#EXT-X-KEY`/PSSH), marcação de impossibilidade de download direto.
- `metadata`: extração com `ffprobe` e fallback por cabeçalhos/playlist.
- `resolver`: gerenciamento de redirecionamentos, canonicalização, validação de alcance.
- `antibot`: heurísticas para diminuir bloqueios sem disfarces ilícitos.
- `schema`: classes de saída (dataclasses) definindo JSON estruturado.
- `cli`/`api`: interface simples para uso direto e integração.

## Detecção de Recursos de Vídeo
- Filtro por extensões e `Content-Type` (`video/*`, `application/vnd.apple.mpegurl`, `application/dash+xml`).
- Observação de `response.url` e cabeçalhos (`Location`, `Content-Length`, `Accept-Ranges`) para redirecionamentos e tamanho.
- Logging de service worker e `media` requests via CDP e instrumentação.

## Captura e Decodificação HTTP/HTTPS
- Interceptação de requests/responses com Playwright; suporte a gzip/br/deflate.
- Opção de execução por proxy (`mitmproxy`) para inspeção TLS quando necessário (com certificados locais confiáveis).
- Decodificação de corpo quando essencial (p. ex., playlists e manifests).

## DRM e Conformidade
- Detecção de DRM (chaves/EME) e marcação clara no resultado.
- Não realizar decriptação ou bypass; fornecer somente metadados e links de manifest quando protegido.
- Mensagens e flags de conformidade para uso responsável.

## Streams HLS/DASH
- HLS: parse master, variantes com `resolution`, `FRAME-RATE`, `BANDWIDTH`; soma de durações de segmentos; estimativa de tamanho por `BANDWIDTH * duração` e/ou soma `Content-Length` quando disponível.
- DASH: parse MPD, extração de `Representation` (codecs, width/height, bandwidth); estimativa por `SegmentTemplate`/`SegmentList`.
- Comandos sugeridos de download (ex.: `ffmpeg -i <manifest> -c copy`), apenas quando sem DRM.

## Metadados de Vídeo
- `ffprobe`: duração, codecs, bitrate, resolução.
- Fallback: informações de playlists/manifests e cabeçalhos HTTP.
- Consolidação por variante e fonte.

## Confiabilidade e Anti-Bot
- Headful com delays humanos; rotação de `userAgent`, `viewport`, timezone e idioma.
- Retentativas exponenciais, `wait_for_selector`, controle de navegação (network idle).
- Proxies opcionais; isolamento por contexto.

## Redirecionamentos
- Follow automático de 3xx com histórico; resolução para URL final canônica.
- Normalização e deduplicação de URLs com querystrings equivalentes.

## Saída Estruturada
- Para cada vídeo: `source_url`, `type` (mp4/m3u8/mpd/ts/etc.), `drm` (bool/tipo), `variants` (resolução/bitrate/frame-rate), `duration`, `codec`, `estimated_size_bytes`, `download_url` (quando aplicável), `notes`.
- JSON e opcional CSV.

## Integração
- API: `extract(url, auth=None, cookies=None, proxy=None) -> VideoExtractionResult`.
- Módulo reutilizável; configuração via env/args; fácil acoplamento em outros projetos.

## Autenticação (caso do link fornecido)
- Suporte a login por formulário da plataforma (segueadi) e importação de cookies.
- Navegação ao item indicado, espera por player e captura de tráfego gerado.

## Testes e Validação
- Teste com páginas públicas (mp4 direto, HLS, DASH) e com login.
- Casos de DRM para verificação de detecção correta.
- Comparação de metadados via `ffprobe` onde possível.

## Entregáveis
- Pacote Python com módulos descritos, README, exemplos e CLI.
- Esquema JSON documentado e tipado.
- Scripts de teste e instruções para uso com/sem proxy.

## Próximos Passos
- Implementar o módulo conforme arquitetura.
- Rodar em `https://alunos.segueadii.com.br/area/produto/item/7033464` com suporte a login/cookies.
- Entregar resultados estruturados e comandos de download quando permitido.