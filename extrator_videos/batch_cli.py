import argparse
import os
import json
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
    headers = {}
    if referer:
        headers["Referer"] = referer
    headers.setdefault("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
    cookies = programmatic_login(u, email or "", senha or "")
    if cookies:
        ck = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
        headers["Cookie"] = ck
    input_url = u
    with logger.step("Resolver fonte de mídia", "resolve", level) as st:
        if not (input_url.lower().endswith(".m3u8") or input_url.lower().endswith(".mp4") or input_url.lower().endswith(".mpd")):
            rcdir = os.getenv("RESOLVE_CACHE_DIR") or "resolve_cache"
            cached = resolve_load(rcdir, input_url, ttl_hours=int(os.getenv("CACHE_TTL_HOURS") or "72"))
            manifest = None
            if cached and cached.get("manifest"):
                manifest = cached.get("manifest")
            else:
                res = extract(input_url, email=email, senha=senha)
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
    wav = None
    with logger.step("Ingestão de áudio (ffmpeg)", "ingest", level) as st:
        preview = int(os.getenv("FFMPEG_PREVIEW_SECONDS") or "0")
        try:
            wav = ffmpeg_audio_stream(input_url, headers=headers, preview_seconds=preview)
            st.details_update({"wav_path": wav})
        except Exception:
            # tentar master como fallback
            try:
                wav = ffmpeg_audio_stream(manifest, headers=headers, preview_seconds=preview)
                st.details_update({"wav_path": wav, "fallback": "master"})
            except Exception:
                try:
                    wav = download_hls_to_wav(manifest, headers=headers)
                    if wav:
                        st.details_update({"wav_path": wav, "fallback": "segments"})
                    else:
                        st.details_update({"wav_error": True})
                except Exception:
                    st.details_update({"wav_error": True})
    ckdir = os.getenv("SUMARIOS_CACHE_DIR") or "sumarios_cache"
    ttl = int(os.getenv("CACHE_TTL_HOURS") or "72")
    with logger.step("Cache de transcrição", "cache", level) as st:
        key = cache_key(u, input_url, headers)
        cached_tr = load_transcription(ckdir, key, ttl_hours=ttl)
        st.details_update({"cache_hit": bool(cached_tr)})
    tr = None
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
                    except Exception:
                        pass
        results.sort(key=lambda x: x.get("start", 0))
        tr = {"language": "pt", "duration": None, "segments": results}
        save_transcription(ckdir, key, tr)
    else:
        try:
            import requests
            from bs4 import BeautifulSoup
            r = requests.get(u, headers=headers, timeout=20)
            soup = BeautifulSoup(r.text, "html.parser")
            txt = " ".join([t.strip() for t in soup.stripped_strings])
            seg = {"start": 0.0, "end": 60.0, "text": txt[:4000]}
            tr = {"language": "pt", "duration": None, "segments": [seg]}
        except Exception:
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
        
        # PRIMEIRO: Tentar Gemini
        print("[INFO] Tentando Gemini...")
        res = summarize_transcription_full(tp["texto"], tp["blocos"])
        
        # Verificar se Gemini teve sucesso
        # res.get("data") retorna dict vazio {} quando há erro, então verificar se tem conteúdo
        data_ok = res.get("data") and (res.get("data").get("resumo_conciso") or res.get("data").get("pontos_chave"))
        
        if res.get("error") or not data_ok:
            # FALLBACK: Se Gemini falhar, usar OpenRouter
            print(f"[AVISO] Gemini falhou: {res.get('error', 'sem dados')}, tentando OpenRouter...")
            print(f"[DEBUG] use_openrouter={use_openrouter}")
            
            if use_openrouter:
                print("[DEBUG] Chamando summarize_with_fallback...")
                res = summarize_with_fallback(tp["texto"], tp["blocos"], use_blocks=use_blocks, max_attempts=max_attempts)
                print(f"[DEBUG] OpenRouter retornou: origin={res.get('origin')}, error={res.get('error')}")
            else:
                print("[ERRO] OpenRouter não configurado, usando dados vazios")
        else:
            print(f"[OK] Gemini funcionou! Modelo: {res.get('model', 'unknown')}")
        
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
        except PermissionError:
            sum_base = sum_dir
        except OSError:
            sum_base = sum_dir
    jpath = os.path.join(sum_base, f"resumo_{cid}.json")
    mpath = os.path.join(sum_base, f"resumo_{cid}.md")
    with logger.step("Gravar saídas", "output", level):
        with open(jpath, "w", encoding="utf-8") as f:
            f.write(sj)
    try:
        data = json.loads(sj)
        # título e diretório de renderização
        title = None
        try:
            import requests
            from bs4 import BeautifulSoup
            r = requests.get(u, headers=headers, timeout=20)
            soup = BeautifulSoup(r.text, "html.parser")
            tnode = soup.find("title")
            title = (tnode.text if tnode else "video").strip()
        except Exception:
            title = "video"
        from .report_renderer import build_basename, generate_full_report
        base = build_basename(title)
        render_dir = os.path.join(sum_dir, dom, cid, "render")
        os.makedirs(render_dir, exist_ok=True)
        html_path = os.path.join(render_dir, base + ".html")
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
        data["retorno_literal_gemini"] = (res["raw"] if isinstance(res, dict) and res.get("raw") is not None else "") or ""
        data["origin"] = (res["origin"] if isinstance(res, dict) and res.get("origin") is not None else data.get("origin") or "") or ""
        data["gemini_model"] = (res["model"] if isinstance(res, dict) and res.get("model") is not None else data.get("gemini_model") or "") or ""
        data["gemini_error"] = (res["error"] if isinstance(res, dict) and res.get("error") is not None else data.get("gemini_error") or "") or ""
        with open(mpath, "w", encoding="utf-8") as f:
            f.writelines(md)
        # gerar HTML e tentar PDF
        meta = {"title": title, "url": u, "dominio": dom, "id": cid}
        try:
            generate_full_report(data, tp.get("texto") or "", meta, html_path, enable_pdf=(os.getenv("ENABLE_PDF") == "1"))
            print(f"[OK] HTML gerado com sucesso: {html_path}")
        except Exception as e:
            print(f"[ERRO] Erro ao gerar HTML: {e}")
            import traceback
            traceback.print_exc()
        # sem reaproveitamento: garantir que conteúdo é da execução Gemini atual
    except Exception as e:
        print(f"[ERRO] Erro geral no processamento: {e}")
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
