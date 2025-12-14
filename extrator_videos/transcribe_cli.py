import argparse
import os
import json
from dotenv import load_dotenv
from .transcription import ffmpeg_audio_stream
from .whisper_engine import transcribe_audio
from .postprocess import segments_to_topics
from .gemini_client import summarize_transcription_full, parse_raw_json, naive_summary
from .openrouter_client import summarize_with_openrouter, summarize_with_fallback
from .auth import programmatic_login
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
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from .extractor import extract

def main():
    load_dotenv()
    import os
    os.environ.setdefault("CT2_FORCE_CPU", "1")
    if (os.getenv("WHISPER_DEVICE") or "").lower() == "cuda":
        os.environ["WHISPER_DEVICE"] = "cpu"
    p = argparse.ArgumentParser()
    p.add_argument("input")
    p.add_argument("--referer", default=None)
    p.add_argument("--cookies", default=None)
    p.add_argument("--email", default=os.getenv("EMAIL"))
    p.add_argument("--senha", default=os.getenv("SENHA"))
    p.add_argument("--out", default="resumo.json")
    p.add_argument("--md", default="resumo.md")
    p.add_argument("--loglevel", default=os.getenv("LOG_LEVEL") or "info")
    p.add_argument("--logdir", default=os.getenv("LOG_DIR") or "logs")
    args = p.parse_args()
    run_id = f"{hash_input(args.input)[:12]}_{args.input.split('/')[-1]}"
    log_dir = args.logdir
    level = (args.loglevel or "info").lower()
    logger = StepLogger(run_id, level=level, log_dir=log_dir)
    logger.set_context({"input_url": args.input, "referer": args.referer, "env_flags": {"WHISPER_MODEL": os.getenv("WHISPER_MODEL"), "WHISPER_DEVICE": os.getenv("WHISPER_DEVICE"), "LOG_LEVEL": level}})
    headers = {}
    with logger.step("Carregar .env e argumentos", "system", level):
        pass
    if args.referer:
        headers["Referer"] = args.referer
        try:
            from urllib.parse import urlparse
            rp = urlparse(args.referer)
            headers["Origin"] = f"{rp.scheme}://{rp.netloc}"
        except Exception:
            pass
    headers.setdefault("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
    input_url = args.input
    original_url = args.input
    if input_url.startswith("http"):
        with logger.step("Autenticação programática", "auth", level):
            cookies = programmatic_login(input_url, args.email or "", args.senha or "")
            if cookies:
                ck = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
                headers["Cookie"] = ck
    if input_url.startswith("http") and not (input_url.lower().endswith(".m3u8") or input_url.lower().endswith(".mp4") or input_url.lower().endswith(".mpd")):
        with logger.step("Resolver fonte de mídia", "resolve", level) as st:
            rcdir = os.getenv("RESOLVE_CACHE_DIR") or "resolve_cache"
            cached = resolve_load(rcdir, input_url, ttl_hours=int(os.getenv("CACHE_TTL_HOURS") or "72"))
            manifest = None
            if cached and cached.get("manifest"):
                manifest = cached.get("manifest")
            else:
                res = extract(input_url, email=args.email, senha=args.senha)
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
                # preferir áudio rendition; senão, melhor variante por bitrate
                try:
                    h = parse_hls(manifest)
                    auds = h.get("audios") or []
                    if auds:
                        # escolher default ou primeira disponível
                        default = next((a for a in auds if a.get('default')), None)
                        input_url = (default or auds[0]).get('uri')
                    else:
                        vars = h.get("variants") or []
                        if vars:
                            best = sorted(vars, key=lambda v: v.bitrate_bps or 0, reverse=True)[0]
                            input_url = best.url
                        else:
                            input_url = manifest
                except Exception:
                    input_url = manifest
            st.details_update({"manifest": input_url})
    with logger.step("Construir cabeçalhos de rede", "resolve", level) as st:
        st.details_update({"headers": headers})
    wav = None
    if input_url.startswith("http"):
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
                    # baixar segmentos via navegador-sessão (requests) e montar TS -> WAV
                    try:
                        wav = download_hls_to_wav(manifest, headers=headers)
                        if wav:
                            st.details_update({"wav_path": wav, "fallback": "segments"})
                        else:
                            st.details_update({"wav_error": True})
                    except Exception:
                        st.details_update({"wav_error": True})
    else:
        wav = args.input
    ckdir = os.getenv("SUMARIOS_CACHE_DIR") or "sumarios_cache"
    ttl = int(os.getenv("CACHE_TTL_HOURS") or "72")
    with logger.step("Cache de transcrição", "cache", level) as st:
        key = cache_key(args.input, input_url, headers)
        cached_tr = load_transcription(ckdir, key, ttl_hours=ttl)
        st.details_update({"cache_hit": bool(cached_tr)})
    if cached_tr:
        tr = cached_tr
    else:
        if wav:
            chunk_seconds = int(os.getenv("CHUNK_SECONDS") or "90")
            max_parallel = int(os.getenv("MAX_PARALLEL_CHUNKS") or "2")
            chunks = split_wav_chunks(wav, chunk_seconds)
            results = []
            with logger.step("Transcrever áudio em chunks", "chunks", level) as st:
                st.details_update({"chunks": len(chunks), "parallel": max_parallel})
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
            # fallback: obter texto da página e criar pseudo-segmentos
            try:
                import requests
                from bs4 import BeautifulSoup
                resp = requests.get(original_url, headers=headers, timeout=20)
                soup = BeautifulSoup(resp.text, "html.parser")
                txt = " ".join([t.strip() for t in soup.stripped_strings])
                seg = {"start": 0.0, "end": 60.0, "text": txt[:4000]}
                tr = {"language": "pt", "duration": None, "segments": [seg]}
            except Exception:
                tr = {"language": "pt", "duration": None, "segments": []}
    with logger.step("Pós-processamento e segmentação", "postprocess", level):
        tp = segments_to_topics(tr["segments"]) if isinstance(tr, dict) else segments_to_topics(tr)
    # Inicializar res com valor padrão para evitar erro se exceção ocorrer
    res = {"data": {}, "raw": "", "model": "", "prompt": "", "origin": "failed", "error": ""}
    
    # Determinar qual serviço usar para resumo
    use_openrouter = os.getenv("USE_OPENROUTER", "false").lower() == "true" and os.getenv("OPENROUTER_API_KEY")
    use_fallback = os.getenv("OPENROUTER_USE_FALLBACK", "true").lower() == "true"
    service_name = "OpenRouter" if use_openrouter else "Gemini"
    
    with logger.step(f"Resumo ({service_name})", "summarize", level) as st:
        try:
            if use_openrouter:
                # Usar OpenRouter com ou sem fallback
                if use_fallback:
                    # Fallback automático: tenta múltiplos modelos
                    max_attempts = int(os.getenv("OPENROUTER_MAX_FALLBACK_ATTEMPTS", "6"))
                    use_blocks = os.getenv("OPENROUTER_USE_BLOCKS", "false").lower() == "true"
                    res = summarize_with_fallback(tp["texto"], tp["blocos"], use_blocks=use_blocks, max_attempts=max_attempts)
                else:
                    # Modelo único
                    model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
                    use_blocks = os.getenv("OPENROUTER_USE_BLOCKS", "false").lower() == "true"
                    res = summarize_with_openrouter(tp["texto"], tp["blocos"], model=model, use_blocks=use_blocks)
            else:
                # Usar Gemini (fallback)
                res = summarize_transcription_full(tp["texto"], tp["blocos"])
            
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
        except Exception as e:
            st.details_update({"error": str(e)})
            res = {"data": {}, "raw": "", "model": "", "prompt": "", "origin": "failed", "error": str(e)}
            sj = json.dumps({"resumo_conciso": "", "pontos_chave": [], "topicos": [], "orientacoes": [], "secoes": [], "retorno_literal_gemini": "", "origin": "failed", "gemini_model": "", "gemini_error": str(e)}, ensure_ascii=False)
    # preparar diretórios de saída em sumarios/<dominio>/<id>
    sum_dir = os.getenv("SUMARIOS_DIR") or "sumarios"
    dom = "misc"
    cid = "item"
    try:
        p = urlparse(args.input)
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
            # espaço em disco
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
    # salvar arquivos
    out_json = os.path.join(sum_base, args.out)
    out_md = os.path.join(sum_base, args.md)
    with logger.step("Gravar saídas", "output", level):
        try:
            data = json.loads(sj)
            data["retorno_literal_gemini"] = (res["raw"] if isinstance(res, dict) and res.get("raw") is not None else "") or ""
            data["origin"] = (res["origin"] if isinstance(res, dict) and res.get("origin") is not None else data.get("origin") or "") or ""
            data["gemini_model"] = (res["model"] if isinstance(res, dict) and res.get("model") is not None else data.get("gemini_model") or "") or ""
            data["gemini_error"] = (res["error"] if isinstance(res, dict) and res.get("error") is not None else data.get("gemini_error") or "") or ""
            # título e nomeação
            title = None
            try:
                import requests
                from bs4 import BeautifulSoup
                r = requests.get(original_url, headers=headers, timeout=20)
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
            # salvar JSON bruto
            with open(out_json, "w", encoding="utf-8") as f:
                f.write(json.dumps(data, ensure_ascii=False))
            md = ["# Resumo\n", data.get("resumo_conciso") or ""]
            if data.get("pontos_chave"):
                md.append("\n## Pontos-chave\n")
                for p in data["pontos_chave"]:
                    md.append(f"- {p}\n")
            if data.get("topicos"):
                md.append("\n## Tópicos\n")
                for t in data["topicos"]:
                    md.append(f"- {t}\n")
            if data.get("orientacoes"):
                md.append("\n## Orientações práticas\n")
                for o in data["orientacoes"]:
                    md.append(f"- Passo {o.get('passo')}: {o.get('acao')} (Benefício: {o.get('beneficio')})\n")
            if data.get("secoes"):
                md.append("\n## Seções\n")
                for s in data["secoes"]:
                    md.append(f"- {s.get('titulo')} ({s.get('inicio')}–{s.get('fim')})\n")
            with open(out_md, "w", encoding="utf-8") as f:
                f.writelines(md)
            # gerar HTML e tentar PDF
            meta = {"title": title, "url": original_url, "dominio": dom, "id": cid}
            generate_full_report(data, tp.get("texto") or "", meta, html_path, enable_pdf=(os.getenv("ENABLE_PDF") == "1"))
            pdf_enabled = os.getenv("ENABLE_PDF") == "1"
            if pdf_enabled:
                pass
            # sem reaproveitamento de resumos antigos: conteúdo deve ser do Gemini da execução atual
        except Exception:
            with open(out_json, "w", encoding="utf-8") as f:
                f.write(sj)
            pass
    # log consolidado já irá escrever em logs/<dominio>/<id>/
    log_name = f"{args.out.replace('.json','')}.process.log.json"
    logger.finalize(out_path=log_name)
    # verificações
    log_path = os.path.join(os.getenv("LOG_DIR") or "logs", dom, cid, log_name)
    sum_json_ok = validate_summary_json(out_json)
    from .verifications import validate_gemini_authentic, assess_quality
    gem_ok = validate_gemini_authentic(out_json)
    quality = assess_quality(out_json)
    log_ok = validate_log_json(log_path)
    access_ok = validate_access(out_json) and validate_access(out_md)
    # anexar verificação ao log
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
    try:
        os.replace(tmp, log_path)
    except Exception:
        pass

if __name__ == "__main__":
    main()
