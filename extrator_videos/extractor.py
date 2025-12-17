from typing import Optional, List
from .schema import VideoExtractionResult, VideoSource, VideoVariant
from .browser import BrowserSession
from .auth import programmatic_login
from .network_capture import NetworkCapture, is_video_url
import requests
from .resolver import canonicalize
from .hls import parse_hls
from .dash import parse_dash
from .metadata import enrich_metadata
from .drm import detect_drm_playlist, detect_drm_eme_flag
import os
import json
from pathlib import Path

def check_captured_manifests(url: str) -> Optional[str]:
    """
    Verifica se existe manifest capturado pela extensão para esta URL.
    Retorna o manifest URL se encontrado, None caso contrário.
    """
    try:
        # Procurar arquivo de manifests capturados
        project_root = Path(__file__).parent.parent
        manifests_file = project_root / 'captured_manifests.json'
        
        if not manifests_file.exists():
            return None
        
        with open(manifests_file, 'r', encoding='utf-8') as f:
            manifests = json.load(f)
        
        # Verificar se a URL está no mapeamento
        if url in manifests:
            manifest_data = manifests[url]
            manifest_url = manifest_data.get('manifestUrl')
            if manifest_url:
                print(f"[Extension] Usando manifest capturado pela extensao")
                print(f"   Page: {url}")
                print(f"   Manifest: {manifest_url[:80]}...")
                return manifest_url
        
        return None
    except Exception as e:
        print(f"[Extension] Erro ao verificar manifests capturados: {e}")
        return None

def extract(url: str, cookies_path: Optional[str] = None, proxy: Optional[str] = None, email: Optional[str] = None, senha: Optional[str] = None) -> VideoExtractionResult:
    sources: List[VideoSource] = []
    
    # NOVO: Verificar primeiro se existe manifest capturado pela extensão
    captured_manifest = check_captured_manifests(url)
    if captured_manifest:
        # Usar manifest capturado diretamente
        url = captured_manifest
        print(f"[Extension] Processando com manifest capturado")
    
    if is_video_url(url):
        ct = None
        try:
            r = requests.head(url, timeout=15, allow_redirects=True)
            ct = r.headers.get("content-type")
        except Exception:
            ct = None
        u = canonicalize(url)
        if (ct and "mpegurl" in ct) or u.lower().endswith(".m3u8"):
            hls = parse_hls(u)
            drm = detect_drm_playlist(hls.get("raw"))
            vs = hls.get("variants", [])
            for v in vs:
                v.download_url = v.url if not drm else None
            note = None if drm else f"ffmpeg -i {u} -c copy output.mp4"
            sources.append(VideoSource(source_url=u, type="hls", drm=drm, variants=vs, notes=note))
        elif (ct and "dash+xml" in ct) or u.lower().endswith(".mpd"):
            dash = parse_dash(u)
            ddrm = dash.get("drm")
            vs = dash.get("variants", [])
            for v in vs:
                v.download_url = u if not ddrm else None
            note = None if ddrm else f"ffmpeg -i {u} -c copy output.mp4"
            sources.append(VideoSource(source_url=u, type="dash", drm=ddrm, variants=vs, notes=note))
        else:
            t = infer_type_from_ext(u)
            v = VideoVariant(url=u, type=t, download_url=u)
            sources.append(VideoSource(source_url=u, type="file", variants=[v]))
        result = VideoExtractionResult(url=url, sources=sources)
        enrich_metadata(result)
        return result
    
    # Se não encontrou manifest capturado, usa método tradicional (browser automation)
    initial_cookies = None
    try:
        initial_cookies = programmatic_login(url, email or "", senha or "") if (email and senha) else None
    except Exception:
        initial_cookies = None
    
    # Ler variável HEADLESS do ambiente
    import os
    headless = os.getenv("HEADLESS", "false").lower() in ("true", "1", "yes")
    
    # Detectar Hub.la e forçar headless=False para evitar bloqueios/carregamento incompleto
    if "hub.la" in url:
        headless = False
        print(f"[INFO] Hub.la detectado: Forçando modo VISUAL (headless=False) para garantir carregamento.")

    session = BrowserSession(proxy=proxy, cookies_path=cookies_path, email=email, senha=senha, initial_cookies=initial_cookies, headless=headless)
    capture = session.collect(url)
    candidates = capture.video_candidates()
    eme_drm = detect_drm_eme_flag(capture)
    # Fallback: Se não achou nada na rede, tentar achar no HTML (ex: Cloudflare Stream link escondido)
    if not candidates:
        try:
            content = session.page.content()
            import re
            # Regex priorities
            # 1. Cloudflare Stream (Specific, handles escaped slashes like https:\/\/...)
            # 2. Generic .m3u8 (Fallback)
            regexes = [
                r'https?:\\?/\\?/[a-zA-Z0-9-]+\.cloudflarestream\.com\\?/.+?\\?/manifest\\?/video\.m3u8',
                r'https?:\\?/\\?/[^"\'\s<>)]+\.m3u8'
            ]
            
            cf_matches = []
            
            # Helper to search content with multiple regexes
            def find_video_url(text):
                for rx in regexes:
                    ms = re.findall(rx, text)
                    if ms:
                         # Clean escaped slashes if present
                         return [m.replace("\\/", "/") for m in ms]
                return []

            # 1. Busca na página principal
            cf_matches = find_video_url(content)
            
            # 2. Se não achar, busca nos iframes
            if not cf_matches:
                print(f"[DEBUG] Vídeo não encontrado no HTML principal. Buscando em {len(session.page.frames)} frames...")
                for frame in session.page.frames:
                    try:
                        fc = frame.content()
                        matches = find_video_url(fc)
                        if matches:
                            print(f"[INFO] Link de vídeo encontrado no FRAME: {frame.url}")
                            cf_matches = matches
                            break
                    except Exception as e:
                        print(f"[DEBUG] Erro ao ler frame: {e}")

            if cf_matches:
                video_url = cf_matches[0]
                print(f"[INFO] Link de vídeo encontrado (Regex): {video_url}")
                # Criar um objeto de resposta fake para compatibilidade
                # Add basic headers to avoid 403
                headers = {
                    "User-Agent": session.user_agent() or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                    "Referer": url
                }
                candidates.append({
                    "url": video_url,
                    "type": "application/x-mpegURL",
                    "headers": headers
                })
            else:
                print(f"[DEBUG] Fallback HTML falhou. Comprimento do conteúdo: {len(content)}")
                # print(f"[DEBUG] Snippet do conteúdo (início): {content[:500]}")
        except Exception as e:
            print(f"[AVISO] Erro ao buscar fallback no HTML: {e}")

    for c in candidates:
        t = c.get("type") or ""
        u = canonicalize(c.get("url"))
        vs: List[VideoVariant] = []
        drm = None
        if t in ["application/vnd.apple.mpegurl", "application/x-mpegURL"] or (u and u.lower().endswith(".m3u8")):
            hls = parse_hls(u)
            drm = detect_drm_playlist(hls.get("raw"))
            vs = hls.get("variants", [])
            for v in vs:
                v.download_url = v.url if not drm else None
        elif t in ["application/dash+xml"] or (u and u.lower().endswith(".mpd")):
            dash = parse_dash(u)
            drm = dash.get("drm")
            vs = dash.get("variants", [])
            for v in vs:
                v.download_url = u if not drm else None
        elif u and is_video_url(u):
            tpe = infer_type_from_ext(u)
            vs = [VideoVariant(url=u, type=tpe, download_url=u)]
        src = VideoSource(source_url=u, type=("hls" if u.endswith(".m3u8") else ("dash" if u.endswith(".mpd") else "file")), drm=drm or eme_drm, variants=vs)
        sources.append(src)
    result = VideoExtractionResult(url=url, sources=sources)
    enrich_metadata(result)
    session.close()
    return result

def infer_type_from_ext(u: str) -> str:
    l = u.lower()
    if l.endswith('.mp4'):
        return 'mp4'
    if l.endswith('.mov'):
        return 'mov'
    if l.endswith('.webm'):
        return 'webm'
    if l.endswith('.ogg') or l.endswith('.ogv'):
        return 'ogg'
    if l.endswith('.ts'):
        return 'ts'
    return 'file'
