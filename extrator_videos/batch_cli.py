import argparse
import os
import json
import datetime
from dotenv import load_dotenv
from .transcription import ffmpeg_audio_stream
from .whisper_engine import transcribe_audio
from .postprocess import segments_to_topics
from .gemini_client import summarize_transcription_full, parse_raw_json, naive_summary
from .openrouter_client import summarize_with_fallback
from .auth import programmatic_login
from .extractor import extract
from .security import hash_input, write_processing_log
from .logger_json import StepLogger
from .report_renderer import generate_full_report, try_generate_pdf, build_basename
from .verifications import validate_log_json, validate_summary_json, validate_access
from .hls import parse_hls
from .hls_downloader import download_hls_to_wav
from .transcription_cache import cache_key, load_transcription, save_transcription
from .resolve_cache import load as resolve_load, save as resolve_save
from .transcription import split_wav_chunks
from .youtube_downloader import is_supported_platform, download_audio_ytdlp, get_video_info
from .credential_manager import get_credentials
from urllib.parse import urlparse
import shutil

def safe_name(s: str):
    return "".join([c if c.isalnum() else "_" for c in s])

def process_url(u: str, referer: str, outdir: str, email: str, senha: str):
    run_id = f"{hash_input(u)[:12]}_{u.split('/')[-1]}"
    level = (os.getenv("LOG_LEVEL") or "info").lower()
    log_dir = os.getenv("LOG_DIR") or "logs"
    logger = StepLogger(run_id, level=level, log_dir=log_dir)
    logger.set_context({"input_url": u, "referer": referer, "env_flags": {"WHISPER_MODEL": os.getenv("WHISPER_MODEL"), "LOG_LEVEL": level}})
    
    # Resolve credentials specifically for this URL using the manager
    # This checks accounts.json first, then falls back to the provided email/senha arguments (which default to .env)
    c_email, c_pwd = get_credentials(u, email, senha)

    # Dicionário para coletar erros de cada etapa
    errors_by_stage = {
        "resolve": None,
        "ingest": None,
        "transcription": None,
        "postprocess": None,
        "summarize": None,
        "output": None
    }
    
    headers = {}
    # Smart Referer: Se não fornecido ou se o domínio mudar drasticamente, adaptar
    parsed_input = urlparse(u)
    origin = f"{parsed_input.scheme}://{parsed_input.netloc}"
    
    # Se referer foi passado (do env ou arg), usamos. MAS se ele for do .env (fixo) e o site for outro,
    # idealmente deveríamos trocar. Como não sabemos se veio do .env ou arg aqui (já foi resolvido no main),
    # vamos assumir: se o usuário mandou um referer que não bate com o domínio da URL,
    # e a URL é de um site "novo", talvez seja melhor usar o próprio site como referer.
    # Por segurança: Se referer fornecido, usa. Se não, usa o origin da URL.
    # O usuário perguntou "como deixar automático". A resposta é: ignorar o .env se ele atrapalhar.
    
    final_referer = referer
    if not final_referer or (referer and parsed_input.netloc not in referer):
        # Se não tem referer OU o referer fixo é de outro dominio, vamos priorizar o dominio atual
        # Isso corrige o caso de ter segueadii no .env e tentar baixar do hub.la
        final_referer = origin
        
    if final_referer:
        headers["Referer"] = final_referer
        headers["Origin"] = origin
    headers.setdefault("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
    
    # Use resolved credentials here
    cookies = programmatic_login(u, c_email or "", c_pwd or "")
    if cookies:
        ck = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
        headers["Cookie"] = ck
    input_url = u
    manifest = None
    
    # Detectar se é URL de plataforma suportada pelo yt-dlp (YouTube, Vimeo, etc)
    # Se for, pular etapa de resolve (Playwright) e ir direto para yt-dlp na ingestão
    use_ytdlp_direct = is_supported_platform(u)
    
    if use_ytdlp_direct:
        # Pular resolve para YouTube/Vimeo - yt-dlp será usado na ingestão
        print(f"[INFO] URL de plataforma suportada detectada ({u[:50]}...), pulando resolve/Playwright")
        with logger.step("Resolver fonte de mídia", "resolve", level) as st:
            st.details_update({"method": "yt-dlp", "platform_detected": True, "skipped_playwright": True})
    else:
        # Fluxo padrão: usar Playwright para resolver
        with logger.step("Resolver fonte de mídia", "resolve", level) as st:
            try:
                if not (input_url.lower().endswith(".m3u8") or input_url.lower().endswith(".mp4") or input_url.lower().endswith(".mpd")):
                    # NOVO: Verificar primeiro captured_manifests.json (extensão do navegador)
                    from .extractor import check_captured_manifests
                    captured_manifest = check_captured_manifests(input_url)
                    
                    if captured_manifest:
                        # Usar manifest capturado pela extensão - NÃO usar cache!
                        manifest = captured_manifest
                        st.details_update({"method": "browser_extension", "source": "captured_manifests.json"})
                        print(f"[Extension] Usando manifest fresco da extensao (bypass cache)")
                    else:
                        # Cache normal para outras URLs
                        rcdir = os.getenv("RESOLVE_CACHE_DIR") or "resolve_cache"
                        cached = resolve_load(rcdir, input_url, ttl_hours=int(os.getenv("CACHE_TTL_HOURS") or "72"))
                        if cached and cached.get("manifest"):
                            manifest = cached.get("manifest")
                        else:
                            res = extract(input_url, email=c_email, senha=c_pwd)
                            for s in res.sources:
                                if s.type == "hls":
                                    manifest = s.source_url
                                    break
                            if not manifest:
                                for s in res.sources:
                                    if s.variants:
                                        manifest = s.variants[0].url
                                        break
                            resolve_save(rcdir, input_url, {"manifest": manifest})
                if manifest:
                    try:
                        h = parse_hls(manifest)
                        vars = h.get("variants") or []
                        if vars:
                            best = sorted(vars, key=lambda v: v.bitrate_bps or 0, reverse=True)[0]
                            input_url = best.url
                        else:
                            input_url = manifest
                    except Exception:
                        input_url = manifest
                st.details_update({"manifest": input_url})
            except Exception as e:
                errors_by_stage["resolve"] = str(e)
                st.details_update({"error": str(e)})
                print(f"[ERRO] Etapa resolve: {e}")
    
    wav = None
    ytdlp_metadata = {}  # Metadados do vídeo (se baixado via yt-dlp)
    with logger.step("Ingestão de áudio (ffmpeg/yt-dlp)", "ingest", level) as st:
        preview = int(os.getenv("FFMPEG_PREVIEW_SECONDS") or "0")
        ingest_error = None
        
        # Se é plataforma suportada (YouTube, Vimeo, etc), usar yt-dlp diretamente
        if use_ytdlp_direct:
            print(f"[INFO] Usando yt-dlp para baixar áudio...")
            st.details_update({"method": "yt-dlp", "platform": "detected"})
            try:
                wav, ytdlp_metadata = download_audio_ytdlp(u)
                st.details_update({
                    "wav_path": wav, 
                    "method": "yt-dlp",
                    "video_title": ytdlp_metadata.get("title", ""),
                    "platform": ytdlp_metadata.get("platform", "")
                })
                print(f"[OK] Áudio baixado via yt-dlp: {ytdlp_metadata.get('title', 'unknown')}")
            except Exception as ytdlp_err:
                ingest_error = f"yt-dlp falhou: {ytdlp_err}"
                st.details_update({"ytdlp_error": str(ytdlp_err)})
                print(f"[ERRO] yt-dlp falhou: {ytdlp_err}")
        else:
            # Fluxo padrão: FFmpeg direto
            try:
                wav = ffmpeg_audio_stream(input_url, headers=headers, preview_seconds=preview)
                st.details_update({"wav_path": wav, "method": "ffmpeg"})
            except Exception as e1:
                ingest_error = str(e1)
                # Tentar master como fallback (apenas se manifest existe)
                if manifest:
                    try:
                        wav = ffmpeg_audio_stream(manifest, headers=headers, preview_seconds=preview)
                        st.details_update({"wav_path": wav, "fallback": "master"})
                        ingest_error = None  # Fallback funcionou
                    except Exception as e2:
                        ingest_error = f"{e1} | fallback master: {e2}"
                        try:
                            wav = download_hls_to_wav(manifest, headers=headers)
                            if wav:
                                st.details_update({"wav_path": wav, "fallback": "segments"})
                                ingest_error = None  # Fallback funcionou
                            else:
                                st.details_update({"wav_error": True})
                                ingest_error = f"{ingest_error} | fallback segments: sem resultado"
                        except Exception as e3:
                            st.details_update({"wav_error": True})
                            ingest_error = f"{ingest_error} | fallback segments: {e3}"
                else:
                    st.details_update({"wav_error": True, "no_manifest_fallback": True})
                    ingest_error = f"{e1} | Sem manifest HLS para fallback"
        
        if ingest_error:
            errors_by_stage["ingest"] = ingest_error
            print(f"[ERRO] Etapa ingest: {ingest_error}")
    ckdir = os.getenv("SUMARIOS_CACHE_DIR") or "sumarios_cache"
    ttl = int(os.getenv("CACHE_TTL_HOURS") or "72")
    with logger.step("Cache de transcrição", "cache", level) as st:
        key = cache_key(u, input_url, headers)
        cached_tr = load_transcription(ckdir, key, ttl_hours=ttl)
        st.details_update({"cache_hit": bool(cached_tr)})
    tr = None
    transcription_errors = []
    if cached_tr:
        tr = cached_tr
    elif wav:
        chunk_seconds = int(os.getenv("CHUNK_SECONDS") or "90")
        max_parallel = int(os.getenv("MAX_PARALLEL_CHUNKS") or "2")
        chunks = split_wav_chunks(wav, chunk_seconds)
        results = []
        with logger.step("Transcrever áudio em chunks", "chunks", level) as st:
            st.details_update({"chunks": len(chunks), "parallel": max_parallel})
            from concurrent.futures import ThreadPoolExecutor, as_completed
            with ThreadPoolExecutor(max_workers=max_parallel) as ex:
                futs = {ex.submit(transcribe_audio, c["path"], "pt"): c for c in chunks}
                for fut in as_completed(futs):
                    try:
                        r = fut.result()
                        c = futs[fut]
                        off = c["offset"]
                        segs = r.get("segments", [])
                        for s in segs:
                            s["start"] = (s.get("start") or 0) + off
                            s["end"] = (s.get("end") or 0) + off
                        results.extend(segs)
                    except Exception as chunk_err:
                        transcription_errors.append(f"chunk {futs[fut].get('offset', '?')}: {chunk_err}")
        results.sort(key=lambda x: x.get("start", 0))
        tr = {"language": "pt", "duration": None, "segments": results}
        save_transcription(ckdir, key, tr)
        if transcription_errors:
            errors_by_stage["transcription"] = f"{len(transcription_errors)} chunks falharam: " + "; ".join(transcription_errors[:3])
    else:
        try:
            import requests
            from bs4 import BeautifulSoup
            r = requests.get(u, headers=headers, timeout=20)
            soup = BeautifulSoup(r.text, "html.parser")
            txt = " ".join([t.strip() for t in soup.stripped_strings])
            seg = {"start": 0.0, "end": 60.0, "text": txt[:4000]}
            tr = {"language": "pt", "duration": None, "segments": [seg]}
        except Exception as e:
            errors_by_stage["transcription"] = f"Sem áudio, fallback HTML falhou: {e}"
            tr = {"language": "pt", "duration": None, "segments": []}
    with logger.step("Pós-processamento e segmentação", "postprocess", level):
        tp = segments_to_topics(tr["segments"]) if isinstance(tr, dict) else segments_to_topics(tr)
    # Determinar qual serviço usar para resumo
    use_openrouter = os.getenv("USE_OPENROUTER", "false").lower() == "true" and os.getenv("OPENROUTER_API_KEY")
    use_fallback = os.getenv("OPENROUTER_USE_FALLBACK", "true").lower() == "true"
    
    # Inicializar sj para evitar UnboundLocalError
    sj = json.dumps({"resumo_conciso": "", "pontos_chave": [], "topicos": [], "orientacoes": [], "secoes": []}, ensure_ascii=False)
    
    with logger.step(f"Resumo (Gemini → OpenRouter)", "summarize", level) as st:
        use_blocks = (os.getenv("OPENROUTER_USE_BLOCKS") or "").lower() in ("1", "true", "yes")
        max_attempts = int(os.getenv("OPENROUTER_MAX_FALLBACK_ATTEMPTS") or "10")
        
        # Inicializar res para evitar UnboundLocalError
        res = {}
        
        # Variáveis para rastrear erros específicos
        gemini_error_detail = None
        openrouter_error_detail = None
        
        try:
            # PRIMEIRO: Tentar Gemini
            print("[INFO] Tentando Gemini...")
            res = summarize_transcription_full(tp["texto"], tp["blocos"])
            
            # Verificar se Gemini teve sucesso
            # res.get("data") retorna dict vazio {} quando há erro, então verificar se tem conteúdo
            data_ok = res.get("data") and (res.get("data").get("resumo_conciso") or res.get("data").get("resumo_executivo") or res.get("data").get("pontos_chave") or res.get("data").get("objetivos_aprendizagem"))
            
            if res.get("error") or not data_ok:
                # Gravar erro específico do Gemini
                gemini_error_detail = {
                    "error": res.get("error", "Sem dados retornados"),
                    "model": res.get("model", ""),
                    "origin": res.get("origin", "gemini"),
                    "timestamp": datetime.datetime.now().isoformat()
                }
                
                # FALLBACK: Se Gemini falhar, usar OpenRouter
                print(f"[AVISO] Gemini falhou: {res.get('error', 'sem dados')}, tentando OpenRouter...")
                print(f"[DEBUG] use_openrouter={use_openrouter}")
                
                if use_openrouter:
                    print("[DEBUG] Chamando summarize_with_fallback...")
                    res = summarize_with_fallback(tp["texto"], tp["blocos"], use_blocks=use_blocks, max_attempts=max_attempts)
                    print(f"[DEBUG] OpenRouter retornou: origin={res.get('origin')}, error={res.get('error')}")
                    
                    # Verificar se OpenRouter também falhou
                    if res.get("error") or not res.get("data"):
                        # Gravar erro específico do OpenRouter
                        openrouter_error_detail = {
                            "error": res.get("error", "Sem dados retornados"),
                            "model": res.get("model", ""),
                            "origin": res.get("origin", "openrouter"),
                            "fallback_attempts": res.get("fallback_total_attempts", 0),
                            "fallback_model_index": res.get("fallback_model_index", 0),
                            "timestamp": datetime.datetime.now().isoformat()
                        }
                        errors_by_stage["summarize"] = f"Gemini e OpenRouter falharam: {res.get('error', 'sem dados')}"
                else:
                    errors_by_stage["summarize"] = f"Gemini falhou ({res.get('error', 'sem dados')}) e OpenRouter não configurado"
                    print("[ERRO] OpenRouter não configurado, usando dados vazios")
            else:
                print(f"[OK] Gemini funcionou! Modelo: {res.get('model', 'unknown')}")
        except Exception as e:
            # Gravar exceção geral
            gemini_error_detail = {
                "error": f"Exceção: {str(e)}",
                "model": "",
                "origin": "exception",
                "timestamp": datetime.datetime.now().isoformat()
            }
            errors_by_stage["summarize"] = f"Exceção na sumarização: {e}"
            print(f"[ERRO] Exceção na sumarização: {e}")
            res = {"data": {}, "error": str(e), "model": "", "prompt": "", "raw": "", "origin": "error"}
        
        # Processar resultado (comum para ambos os casos)
        gm = res["model"] if isinstance(res, dict) else ""
        gp = res["prompt"] if isinstance(res, dict) else ""
        gr = res["raw"] if isinstance(res, dict) else ""
        ge = res["error"] if isinstance(res, dict) else ""
        go = res.get("origin", "unknown")
        
        # Adicionar informações de fallback se disponível
        fallback_info = {}
        if "fallback_total_attempts" in res:
            fallback_info = {
                "fallback_attempts": res.get("fallback_total_attempts", 0),
                "fallback_model_index": res.get("fallback_model_index", 0),
                "fallback_success": res.get("origin") != "fallback_failed",
            }
            
        st.details_update({
            "model": gm,
            "origin": go,
            "prompt_len": len(gp or ""),
            "resp_len": len(gr or ""),
            "llm_prompt": gp,
            "llm_raw": gr,
            "llm_error": ge,
            **fallback_info
        })
        
        # Usar diretamente os dados já parseados
        data_obj = res.get("data") or {}
        sj = json.dumps(data_obj, ensure_ascii=False)
    # preparar diretórios por dominio/id
    sum_dir = os.getenv("SUMARIOS_DIR") or "sumarios"
    dom = "misc"
    cid = safe_name(u.split("/")[-1]) or hash_input(u)[:12]
    try:
        p = urlparse(u)
        if p.netloc:
            dom = p.netloc
        tail = p.path.strip("/").split("/")
        if tail:
            cid = tail[-1]
    except Exception:
        pass
    sum_base = os.path.join(sum_dir, dom, cid)
    with logger.step("Preparar diretórios de saída", "output", level) as st:
        try:
            os.makedirs(sum_base, exist_ok=True)
            try:
                usage = shutil.disk_usage(sum_base)
                if usage.free < 100 * 1024 * 1024:
                    st.details_update({"free_bytes": usage.free})
            except Exception:
                pass
        except PermissionError as e:
            errors_by_stage["output"] = f"PermissionError ao criar diretório: {e}"
            sum_base = sum_dir
        except OSError as e:
            errors_by_stage["output"] = f"OSError ao criar diretório: {e}"
            sum_base = sum_dir
    
    # Obter título do vídeo
    # Preferir metadados do yt-dlp se disponíveis
    title = None
    if ytdlp_metadata and ytdlp_metadata.get("title"):
        title = ytdlp_metadata.get("title")
        print(f"[INFO] Título obtido via yt-dlp: {title}")
    else:
        try:
            import requests
            from bs4 import BeautifulSoup
            r = requests.get(u, headers=headers, timeout=20)
            soup = BeautifulSoup(r.text, "html.parser")
            tnode = soup.find("title")
            title = (tnode.text if tnode else "video").strip()
        except Exception:
            title = "video"
    
    # Definir caminhos de arquivos
    jpath = os.path.join(sum_base, f"resumo_{cid}.json")
    mpath = os.path.join(sum_base, f"resumo_{cid}.md")
    
    # Preparar dados completos para salvar
    # IMPORTANTE: Sempre salvar transcrição, mesmo se LLM falhar
    try:
        print(f"[DEBUG] Iniciando preparação de dados para {cid}")
        data = json.loads(sj)
        print(f"[DEBUG] JSON parseado com sucesso. Campos: {list(data.keys())}")
        
        # Adicionar metadados essenciais ao JSON
        data["url_video"] = u
        data["titulo_video"] = title
        data["dominio"] = dom
        data["video_id"] = cid
        data["data_processamento"] = datetime.datetime.now().isoformat()
        print(f"[DEBUG] Metadados adicionados")
        
        # SEMPRE adicionar transcrição completa (independente do sucesso da LLM)
        transcricao_texto = tp.get("texto") or ""
        data["transcricao_completa"] = transcricao_texto
        data["transcricao_sucesso"] = len(transcricao_texto) > 0
        data["transcricao_chars"] = len(transcricao_texto)
        print(f"[DEBUG] Transcrição adicionada ({len(transcricao_texto)} chars)")
        
        # Adicionar informações do modelo IA
        data["retorno_literal_gemini"] = (res["raw"] if isinstance(res, dict) and res.get("raw") is not None else "") or ""
        data["origin"] = (res["origin"] if isinstance(res, dict) and res.get("origin") is not None else data.get("origin") or "") or ""
        data["gemini_model"] = (res["model"] if isinstance(res, dict) and res.get("model") is not None else data.get("gemini_model") or "") or ""
        data["gemini_error"] = (res["error"] if isinstance(res, dict) and res.get("error") is not None else data.get("gemini_error") or "") or ""
        print(f"[DEBUG] Informações da IA adicionadas. Modelo: {data.get('gemini_model')}")
        
        # NOVO: Adicionar erros de cada etapa ao JSON
        # Filtrar apenas erros que realmente ocorreram (não None)
        erros_ocorridos = {k: v for k, v in errors_by_stage.items() if v is not None}
        if erros_ocorridos:
            data["erros_por_etapa"] = erros_ocorridos
            data["processamento_completo"] = False
            print(f"[AVISO] Erros detectados em {len(erros_ocorridos)} etapa(s): {list(erros_ocorridos.keys())}")
        else:
            data["erros_por_etapa"] = {}
            data["processamento_completo"] = True
        
        # NOVO: Adicionar erros detalhados de Gemini e OpenRouter
        if gemini_error_detail:
            data["gemini_error_detail"] = gemini_error_detail
            print(f"[INFO] Erro do Gemini gravado: {gemini_error_detail['error'][:100]}")
        
        if openrouter_error_detail:
            data["openrouter_error_detail"] = openrouter_error_detail
            print(f"[INFO] Erro do OpenRouter gravado: {openrouter_error_detail['error'][:100]}")
        
        # Salvar JSON completo
        print(f"[DEBUG] Tentando salvar JSON em: {jpath}")
        with open(jpath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"[OK] JSON completo salvo: {jpath}")
        
        # Salvar Markdown (opcional, para visualização rápida)
        md = ["# Resumo\n", data.get("resumo_conciso") or ""]
        if data.get("pontos_chave"):
            md.append("\n## Pontos-chave\n")
            for idx, p in enumerate(data["pontos_chave"], start=1):
                md.append(f"{idx}. {p}\n")
        if data.get("topicos"):
            md.append("\n## Tópicos\n")
            for t in data["topicos"]:
                md.append(f"- {t}\n")
        if data.get("secoes"):
            md.append("\n## Seções\n")
            for s in data["secoes"]:
                md.append(f"- {s.get('titulo')} ({s.get('inicio')}–{s.get('fim')})\n")
        
        # Adicionar seção de erros ao Markdown se houver
        if erros_ocorridos:
            md.append("\n## ⚠️ Erros no Processamento\n")
            for etapa, erro in erros_ocorridos.items():
                md.append(f"- **{etapa}**: {erro}\n")
        
        with open(mpath, "w", encoding="utf-8") as f:
            f.writelines(md)
        
        print(f"[OK] Markdown salvo: {mpath}")
        
        # REMOVIDO: Geração de HTML (agora feita dinamicamente pela interface web)
        # A interface web renderiza os relatórios em tempo real a partir do JSON
        
    except Exception as e:
        print(f"[ERRO] Erro ao processar dados: {e}")
        import traceback
        traceback.print_exc()
    
    write_processing_log({"input": hash_input(u), "duration": tr.get("duration") if isinstance(tr, dict) else None, "segments": len(tr.get("segments")) if isinstance(tr, dict) else None})
    log_name = f"{safe_name(run_id)}.process.log.json"
    logger.finalize(out_path=log_name)
    # verificações
    log_path = os.path.join(os.getenv("LOG_DIR") or "logs", dom, cid, log_name)
    sum_json_ok = validate_summary_json(jpath)
    from .verifications import validate_gemini_authentic, assess_quality
    gem_ok = validate_gemini_authentic(jpath)
    quality = assess_quality(jpath)
    log_ok = validate_log_json(log_path)
    access_ok = validate_access(jpath) and validate_access(mpath)
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            payload = json.load(f)
        payload.setdefault("checks", {})
        payload["checks"]["summary_json"] = sum_json_ok
        payload["checks"]["log_json"] = log_ok
        payload["checks"]["access_files"] = access_ok
        payload["checks"]["gemini_authentic"] = gem_ok
        payload["checks"]["quality"] = quality
        tmp = log_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False, indent=2))
        os.replace(tmp, log_path)
    except Exception:
        pass

def main():
    load_dotenv()
    import os as _os
    _os.environ.setdefault("CT2_FORCE_CPU", "1")
    if (_os.getenv("WHISPER_DEVICE") or "").lower() == "cuda":
        _os.environ["WHISPER_DEVICE"] = "cpu"
    p = argparse.ArgumentParser()
    p.add_argument("--file", required=True)
    p.add_argument("--referer", default=os.getenv("REFERER"))
    p.add_argument("--outdir", default=".")
    p.add_argument("--loglevel", default=os.getenv("LOG_LEVEL") or "info")
    p.add_argument("--logdir", default=os.getenv("LOG_DIR") or "logs")
    p.add_argument("--email", default=os.getenv("EMAIL"))
    p.add_argument("--senha", default=os.getenv("SENHA"))
    args = p.parse_args()
    with open(args.file, "r", encoding="utf-8") as f:
        urls = [line.strip() for line in f if line.strip()]
    os.makedirs(args.outdir, exist_ok=True)
    for u in urls:
        os.makedirs(args.logdir, exist_ok=True)
        process_url(u, args.referer, args.outdir, args.email, args.senha)

if __name__ == "__main__":
    main()

def reprocess_from_transcription(json_path, prompt_model="modelo2"):
    """Reprocessa apenas sumarização usando transcrição existente"""
    print(f"[INFO] Reprocessando {json_path} com {prompt_model}")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    transcricao_texto = data.get('transcricao_completa', '')
    if not transcricao_texto:
        raise ValueError("Transcrição não encontrada")
    print(f"[OK] Transcrição: {len(transcricao_texto)} chars")
    # Criar segmento com campos start/end para compatibilidade com segments_to_topics
    tp = segments_to_topics([{"text": transcricao_texto, "start": 0, "end": len(transcricao_texto)}])
    os.environ['PROMPT_MODEL'] = prompt_model
    use_openrouter = os.getenv("USE_OPENROUTER", "false").lower() == "true"
    gemini_error_detail = None
    openrouter_error_detail = None
    try:
        print("[INFO] Tentando Gemini...")
        res = summarize_transcription_full(tp["texto"], tp["blocos"])
        data_ok = res.get("data") and (res.get("data").get("resumo_conciso") or res.get("data").get("resumo_executivo") or res.get("data").get("pontos_chave") or res.get("data").get("objetivos_aprendizagem"))
        if res.get("error") or not data_ok:
            gemini_error_detail = {"error": res.get("error", "Sem dados"), "model": res.get("model", ""), "origin": "gemini", "timestamp": datetime.datetime.now().isoformat()}
            print(f"[AVISO] Gemini falhou, tentando OpenRouter...")
            print(f"[DEBUG] PROMPT_MODEL={os.getenv('PROMPT_MODEL')}")
            if use_openrouter:
                from extrator_videos.openrouter_client import get_fallback_models
                fallback_list = get_fallback_models()
                print(f"[DEBUG] Fallback models: {fallback_list[:3]}...")
                res = summarize_with_fallback(tp["texto"], tp["blocos"])
                if res.get("error") or not res.get("data"):
                    openrouter_error_detail = {"error": res.get("error", "Sem dados"), "model": res.get("model", ""), "origin": "openrouter", "fallback_attempts": res.get("fallback_total_attempts", 0), "timestamp": datetime.datetime.now().isoformat()}
        else:
            print(f"[OK] Gemini OK! Modelo: {res.get('model')}")
    except Exception as e:
        gemini_error_detail = {"error": f"Exceção: {str(e)}", "timestamp": datetime.datetime.now().isoformat()}
        res = {"data": {}, "error": str(e), "origin": "error"}
    data_obj = res.get("data") or {}
    data.update(data_obj)
    data["retorno_literal_gemini"] = res.get("raw", "")
    data["origin"] = res.get("origin", "")
    data["gemini_model"] = res.get("model", "")
    data["gemini_error"] = res.get("error", "")
    data["data_reprocessamento"] = datetime.datetime.now().isoformat()
    data["prompt_model_usado"] = prompt_model
    data["_modelo"] = prompt_model
    if gemini_error_detail:
        data["gemini_error_detail"] = gemini_error_detail
    if openrouter_error_detail:
        data["openrouter_error_detail"] = openrouter_error_detail
    if data_obj and (data_obj.get("resumo_executivo") or data_obj.get("resumo_conciso")):
        data["processamento_completo"] = True
        data["erros_por_etapa"] = {}
    else:
        data["processamento_completo"] = False
        data["erros_por_etapa"] = {"summarize": "Falha"}
    
    # Salvar arquivo de debug com transcrição e prompt
    try:
        debug_dir = os.path.dirname(json_path)
        video_id = os.path.basename(json_path).replace("resumo_", "").replace(".json", "")
        debug_path = os.path.join(debug_dir, f"prompt_debug_{video_id}.json")
        debug_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "prompt_model": prompt_model,
            "modelo_usado": res.get("model", ""),
            "origin": res.get("origin", ""),
            "transcricao_completa": transcricao_texto,
            "transcricao_chars": len(transcricao_texto),
            "prompt_enviado": res.get("prompt", ""),
            "prompt_chars": len(res.get("prompt", "")),
            "resposta_bruta": res.get("raw", "")[:5000] if res.get("raw") else "",  # Limitar tamanho
            "resposta_chars": len(res.get("raw", "")),
            "sucesso": bool(data_obj.get("resumo_executivo") or data_obj.get("resumo_conciso")),
            "erro": res.get("error", ""),
        }
        with open(debug_path, 'w', encoding='utf-8') as f:
            json.dump(debug_data, f, ensure_ascii=False, indent=2)
        print(f"[DEBUG] Arquivo de debug salvo: {debug_path}")
    except Exception as e:
        print(f"[AVISO] Não foi possível salvar arquivo de debug: {e}")
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] Reprocessamento concluído")
    return data
