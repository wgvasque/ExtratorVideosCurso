import os
import datetime

def html_escape(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def sanitize_title(t: str) -> str:
    t = t or "video"
    out = []
    for c in t:
        if c.isalnum() or c in [' ', '_', '-', '.']:
            out.append(c)
    return "".join(out).strip()

def build_basename(title: str):
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    base = sanitize_title(title).replace(" ", "_")
    return f"{base}_{ts}"

def generate_full_report(data: dict, transcription_text: str, meta: dict, outfile_html: str, enable_pdf: bool = False, version: str = 'v1'):
    """
    Gera o relatório final em HTML.
    version: 'v1' (Original Moderno) ou 'v2' (Solar Pop Retro)
    Suporta Modelo 2 (14 seções) e formato legado
    """
    title = sanitize_title(meta.get("title") or "Resumo do Vídeo")
    
    # Detectar se é Modelo 2, Modelo 4 ou formato legado
    is_modelo4 = "_modelo" in data and data["_modelo"] == "modelo4"
    is_modelo2 = "resumo_executivo" in data or "objetivos_aprendizagem" in data
    
    # Extrair metadados do Modelo 4 se disponível
    metadados_modelo4 = None
    if is_modelo4:
        metadados_modelo4 = data.get("_metadados_modelo4") or {}
    
    if is_modelo2 or is_modelo4:
        # Modelo 2 ou Modelo 4 (14 seções)
        resumo = html_escape(data.get("resumo_executivo") or "")
        objetivos = data.get("objetivos_aprendizagem") or []
        conceitos = data.get("conceitos_fundamentais") or []
        estrutura = data.get("estrutura_central") or []
        exemplos = data.get("exemplos") or []
        ferramentas = data.get("ferramentas_metodos") or []
        orientacoes_praticas = data.get("orientacoes_praticas") or {}
        abordagem = data.get("abordagem_pedagogica") or {}
        ideias = data.get("ideias_chave") or []
        pontos_memo = data.get("pontos_memorizacao") or {}
        citacoes = data.get("citacoes_marcantes") or []
        proximos = data.get("proximos_passos") or {}
        preparacao = data.get("preparacao_proxima_aula") or ""
        materiais = data.get("materiais_apoio") or []
        
        # Manter compatibilidade com formato legado para renderização
        pontos = data.get("pontos_chave") or []
        topicos = data.get("topicos") or []
        orient = []  # Converter orientacoes_praticas para lista se necessário
        if isinstance(orientacoes_praticas, dict):
            for categoria, items in orientacoes_praticas.items():
                if isinstance(items, list):
                    orient.extend(items)
        secoes = data.get("secoes") or []
    else:
        # Formato legado
        resumo = html_escape(data.get("resumo_conciso") or "")
        pontos = data.get("pontos_chave") or []
        topicos = data.get("topicos") or []
        orient = data.get("orientacoes") or []
        secoes = data.get("secoes") or []
        
        # Campos do Modelo 2 vazios
        objetivos = []
        conceitos = []
        estrutura = []
        exemplos = []
        ferramentas = []
        orientacoes_praticas = {}
        abordagem = {}
        ideias = []
        pontos_memo = {}
        citacoes = []
        proximos = {}
        preparacao = ""
        materiais = []
    
    origem = html_escape(data.get("origin") or "")
    full_text = html_escape(transcription_text or "")
    gem_raw_text = data.get("retorno_literal_gemini") or ""
    gem_raw = html_escape(gem_raw_text)
    gem_model = html_escape(data.get("gemini_model") or "")
    
    # Tentar parsear retorno raw se necessário
    def _try_parse_raw(raw_txt: str):
        try:
            t = (raw_txt or "").strip()
            if t.startswith("```"):
                import re
                t = re.sub(r"^```[a-zA-Z]*", "", t).strip()
            if t.endswith("```"):
                import re
                t = re.sub(r"```$", "", t).strip()
            import json
            i = t.find("{")
            j = t.rfind("}")
            if i == -1 or j == -1 or j <= i:
                return None
            body = t[i:j+1]
            obj = json.loads(body)
            return obj if isinstance(obj, dict) else None
        except Exception:
            return None
            
    parsed = _try_parse_raw(gem_raw_text)
    if parsed and not is_modelo2:
        # Só fazer parse se for formato legado
        resumo = html_escape(parsed.get("resumo_conciso") or resumo)
        pontos = parsed.get("pontos_chave") or pontos
        topicos = parsed.get("topicos") or topicos
        orient = parsed.get("orientacoes") or orient
        secoes = parsed.get("secoes") or secoes
        
    ts_iso = datetime.datetime.now().replace(microsecond=0).isoformat()
    header_data = {
        "url": meta.get("url"),
        "dominio": meta.get("dominio"),
        "id": meta.get("id"),
        "video_id": meta.get("video_id") or meta.get("id"),  # Para botão de reprocessamento
        "gerado_em": ts_iso,
    }
    
    # Criar estrutura de dados para renderização
    render_data = {
        "is_modelo2": is_modelo2,
        "resumo": resumo,
        "pontos": pontos,
        "topicos": topicos,
        "orient": orient,
        "secoes": secoes,
        "objetivos": objetivos,
        "conceitos": conceitos,
        "estrutura": estrutura,
        "exemplos": exemplos,
        "ferramentas": ferramentas,
        "orientacoes_praticas": orientacoes_praticas,
        "abordagem": abordagem,
        "ideias": ideias,
        "pontos_memo": pontos_memo,
        "citacoes": citacoes,
        "proximos": proximos,
        "preparacao": preparacao,
        "materiais": materiais,
        "is_modelo4": is_modelo4,
        "metadados_modelo4": metadados_modelo4 or {},
        # Campos necessários para botão de reprocessamento
        "transcricao_completa": data.get("transcricao_completa", ""),
        "transcricao_sucesso": data.get("transcricao_sucesso", False),
    }

    if version == 'v2':
        html_content = _generate_v2_solar_pop_modelo2(title, render_data, full_text, gem_raw, gem_model, header_data, origem)
    else:
        # Padrão v1 (Modern Gradient)
        html_content = _generate_v1_modern_modelo2(title, render_data, full_text, gem_raw, gem_model, header_data, origem)

    os.makedirs(os.path.dirname(outfile_html), exist_ok=True)
    with open(outfile_html, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    if enable_pdf:
        try_generate_pdf(outfile_html, os.path.splitext(outfile_html)[0] + ".pdf")
    return outfile_html


def _generate_v2_solar_pop(title, resumo, pontos, orient, secoes, full_text, gem_raw, gem_model, header, origem):
    """Gera HTML no estilo Solar Pop (Retro-Brutalista)"""
    css = """
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap');
        
        :root {
            --base: #FFF8E7;   /* Cosmic Latte */
            --ink: #2D3436;    /* Void Charcoal */
            --accent: #FF6B6B; /* Bittersweet Coral */
            --pop: #4ECDC4;    /* Medium Turquoise */
            --sun: #FFE66D;    /* Maize Yellow */
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            background-color: var(--base);
            color: var(--ink);
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            padding: 40px 20px;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        
        /* Typography */
        h1, h2, h3 { font-family: 'Space Grotesk', sans-serif; font-weight: 700; text-transform: uppercase; }
        
        /* Header */
        .header {
            border: 4px solid var(--ink);
            background: white;
            padding: 30px;
            margin-bottom: 40px;
            box-shadow: 8px 8px 0px 0px var(--ink);
            position: relative;
        }
        .header h1 { font-size: 32px; line-height: 1.2; margin-bottom: 20px; }
        .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; font-size: 14px; font-weight: 500; }
        .meta-item { overflow-wrap: break-word; word-break: break-word; }
        .meta-item strong { display: block; font-size: 12px; text-transform: uppercase; color: var(--accent); margin-bottom: 4px; }
        
        /* Cards */
        .section-card {
            background: white;
            border: 2px solid var(--ink);
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 4px 4px 0px 0px var(--ink);
            transition: transform 0.2s;
        }
        .section-card:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0px 0px var(--accent); }
        
        .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid var(--base); padding-bottom: 10px; }
        .card-title { font-size: 24px; display: flex; align-items: center; gap: 10px; }
        .card-badge { background: var(--sun); border: 2px solid var(--ink); padding: 2px 8px; font-size: 12px; font-weight: 700; box-shadow: 2px 2px 0px 0px var(--ink); }
        
        /* Lists */
        .retro-list { list-style: none; counter-reset: item; }
        .retro-list li {
            position: relative;
            background: var(--base);
            border: 2px solid var(--ink);
            margin-bottom: 10px;
            padding: 15px 15px 15px 50px;
            font-weight: 500;
        }
        .retro-list li::before {
            content: counter(item); counter-increment: item;
            position: absolute; left: 0; top: 0; bottom: 0; width: 35px;
            background: var(--ink); color: var(--sun);
            display: flex; align-items: center; justify-content: center;
            font-family: 'Space Grotesk', sans-serif; font-weight: 700;
        }
        
        /* Timeline */
        .timeline-item {
            border-left: 4px solid var(--ink);
            padding-left: 20px; margin-bottom: 20px; position: relative;
        }
        .timeline-item::before {
            content: ''; position: absolute; left: -10px; top: 0; width: 16px; height: 16px;
            background: var(--accent); border: 2px solid var(--ink); border-radius: 50%;
        }
        .step-title { font-weight: 700; font-size: 18px; color: var(--ink); }
        .step-desc { font-size: 14px; background: #edf2f7; padding: 10px; border-left: 4px solid var(--pop); margin-top: 5px; }
        
        /* Collapsible */
        .collapsible { border: 2px solid var(--ink); margin-bottom: 20px; background: white; }
        .collapsible-header {
            padding: 15px; background: var(--sun); cursor: pointer; font-weight: 700;
            display: flex; justify-content: space-between; border-bottom: 2px solid var(--ink);
        }
        .collapsible-content { display: none; padding: 20px; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
        .collapsible.open .collapsible-content { display: block; }
        
        .footer { text-align: center; font-size: 12px; font-weight: 700; color: var(--ink); margin-top: 50px; text-transform: uppercase; }
        
        @media print {
            body { background: white; }
            .section-card { box-shadow: none; break-inside: avoid; }
        }
    """
    
    html = [
        "<!DOCTYPE html>",
        "<html lang='pt-BR'>",
        "<head>",
        "<meta charset='utf-8'>",
        "<meta name='viewport' content='width=device-width, initial-scale=1.0'>",
        f"<title>{html_escape(title)}</title>",
        f"<style>{css}</style>",
        "</head>",
        "<body>",
        "<div class='container'>",
        
        # Header
        "<div class='header'>",
        f"<h1>{title}</h1>",
    ]
    
    # Badge do modelo de prompt
    if render_data.get('is_modelo4'):
        metadados = render_data.get('metadados_modelo4', {})
        framework = metadados.get('framework', 'P.R.O.M.P.T.')
        html.append(f"<div style='display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border: 2px solid var(--ink); border-radius: 8px; font-weight: 700; font-size: 14px; margin-bottom: 20px; box-shadow: 3px 3px 0px 0px var(--ink);'>🎯 MODELO 4 - Framework {framework}</div>")
    else:
        html.append("<div style='display: inline-block; background: var(--pop); color: var(--ink); padding: 8px 16px; border: 2px solid var(--ink); border-radius: 8px; font-weight: 700; font-size: 14px; margin-bottom: 20px; box-shadow: 3px 3px 0px 0px var(--ink);'>📊 MODELO 2 - Padrão</div>")
    
    # Botão de reprocessamento (só mostrar se tiver transcrição)
    if render_data.get('transcricao_completa') or render_data.get('transcricao_sucesso'):
        # Construir caminho relativo do JSON
        dom = header.get('dominio', 'misc')
        cid = header.get('video_id', 'video')
        json_rel_path = f"sumarios/{dom}/{cid}/resumo_{cid}.json"
        
        html.append(f"""
        <div style='margin-top: 15px; margin-bottom: 20px;'>
            <button id='reprocess-btn' onclick='openReprocessModal()' 
                    style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                           color: white; 
                           padding: 12px 24px; 
                           border: 2px solid var(--ink); 
                           border-radius: 8px; 
                           font-weight: 700; 
                           cursor: pointer; 
                           box-shadow: 3px 3px 0px 0px var(--ink);
                           font-size: 14px;
                           transition: all 0.2s;'>
                🔄 Reprocessar Resumo
            </button>
            
            <select id='reprocess-model-select' 
                    style='margin-left: 10px; 
                           padding: 10px 15px; 
                           border: 2px solid var(--ink); 
                           border-radius: 8px; 
                           font-weight: 600;
                           font-size: 14px;
                           background: white;
                           cursor: pointer;'>
                <option value='modelo2'>📊 Modelo 2 (Padrão)</option>
                <option value='modelo4'>🎯 Modelo 4 (P.R.O.M.P.T.)</option>
            </select>
        </div>
        
        <!-- Modal de Reprocessamento -->
        <div id='reprocess-modal' style='display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; justify-content: center; align-items: center;'>
            <div style='background: white; border: 4px solid var(--ink); padding: 40px; max-width: 500px; width: 90%; box-shadow: 8px 8px 0px 0px var(--ink); text-align: center;'>
                <h2 style='margin-bottom: 20px;'>🔄 REPROCESSANDO</h2>
                <div id='modal-status' style='font-size: 16px; margin-bottom: 20px;'>Iniciando reprocessamento...</div>
                <div id='modal-timer' style='font-size: 48px; font-weight: bold; color: var(--accent); margin: 20px 0;'>00:00</div>
                <div style='background: var(--base); border: 2px solid var(--ink); height: 30px; margin: 20px 0;'>
                    <div id='modal-progress' style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100%; width: 0%; transition: width 0.5s;'></div>
                </div>
                <div id='modal-log' style='background: var(--ink); color: var(--sun); padding: 15px; font-family: monospace; font-size: 12px; text-align: left; max-height: 150px; overflow-y: auto; margin-bottom: 20px;'>
                    [INFO] Aguardando início do processamento...
                </div>
                <button id='modal-close-btn' onclick='closeReprocessModal()' style='display: none; background: var(--sun); border: 2px solid var(--ink); padding: 12px 24px; font-weight: bold; cursor: pointer; box-shadow: 3px 3px 0px 0px var(--ink);'>
                    ✅ Fechar e Recarregar
                </button>
            </div>
        </div>
        
        <script>
        let reprocessTimer = null;
        let reprocessSeconds = 0;
        let pollInterval = null;
        
        function openReprocessModal() {{
            const modal = document.getElementById('reprocess-modal');
            modal.style.display = 'flex';
            startReprocess();
        }}
        
        function closeReprocessModal() {{
            const modal = document.getElementById('reprocess-modal');
            modal.style.display = 'none';
            if (reprocessTimer) clearInterval(reprocessTimer);
            if (pollInterval) clearInterval(pollInterval);
            location.reload();
        }}
        
        function updateTimer() {{
            reprocessSeconds++;
            const mins = Math.floor(reprocessSeconds / 60).toString().padStart(2, '0');
            const secs = (reprocessSeconds % 60).toString().padStart(2, '0');
            document.getElementById('modal-timer').textContent = mins + ':' + secs;
        }}
        
        function addLog(message) {{
            const log = document.getElementById('modal-log');
            const time = new Date().toLocaleTimeString('pt-BR');
            log.innerHTML += '\\n[' + time + '] ' + message;
            log.scrollTop = log.scrollHeight;
        }}
        
        function startReprocess() {{
            const modelSelect = document.getElementById('reprocess-model-select');
            const status = document.getElementById('modal-status');
            const progress = document.getElementById('modal-progress');
            const closeBtn = document.getElementById('modal-close-btn');
            
            reprocessSeconds = 0;
            reprocessTimer = setInterval(updateTimer, 1000);
            
            addLog('Iniciando com ' + modelSelect.value);
            status.textContent = '📡 Enviando requisição...';
            progress.style.width = '10%';
            
            fetch('http://localhost:5000/api/reprocess', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{
                    jsonPath: '{json_rel_path}',
                    promptModel: modelSelect.value
                }})
            }})
            .then(res => res.json())
            .then(data => {{
                if (data.error) {{
                    status.textContent = '❌ Erro: ' + data.error;
                    status.style.color = 'red';
                    addLog('ERRO: ' + data.error);
                    progress.style.background = '#e53e3e';
                    progress.style.width = '100%';
                    clearInterval(reprocessTimer);
                    closeBtn.style.display = 'inline-block';
                    closeBtn.textContent = '❌ Fechar';
                }} else {{
                    addLog('✅ Requisição aceita');
                    status.textContent = '⏳ Processando...';
                    progress.style.width = '30%';
                    
                    let pollCount = 0;
                    pollInterval = setInterval(() => {{
                        pollCount++;
                        progress.style.width = Math.min(30 + pollCount * 5, 90) + '%';
                        if (pollCount % 5 === 0) addLog('⏳ Processando... (' + reprocessSeconds + 's)');
                        if (pollCount >= 15) {{
                            clearInterval(pollInterval);
                            clearInterval(reprocessTimer);
                            status.textContent = '✅ CONCLUÍDO!';
                            status.style.color = 'green';
                            progress.style.width = '100%';
                            progress.style.background = '#10b981';
                            addLog('✅ Finalizado em ' + reprocessSeconds + 's');
                            closeBtn.style.display = 'inline-block';
                        }}
                    }}, 2000);
                }}
            }})
            .catch(err => {{
                status.textContent = '❌ Erro de conexão';
                status.style.color = 'red';
                addLog('ERRO: ' + err.message);
                progress.style.background = '#e53e3e';
                progress.style.width = '100%';
                clearInterval(reprocessTimer);
                closeBtn.style.display = 'inline-block';
                closeBtn.textContent = '❌ Fechar';
            }});
        }}
        </script>
        """)
    
    html.extend([
        "<div class='meta-grid'>",
        f"<div class='meta-item'><strong>URL Original</strong> {html_escape(header['url'] or 'N/A')}</div>",
        f"<div class='meta-item'><strong>Data</strong> {html_escape(header['gerado_em'])}</div>",
        f"<div class='meta-item'><strong>IA Model</strong> {gem_model}</div>",
        "</div>",
        "</div>",
    ])
    
    
    # Resumo Executivo (Seção 1)
    html.extend([
        "<div class='section-card'>",
        "<div class='card-header'><h2 class='card-title'>⚡ Resumo Executivo</h2><span class='card-badge'>" + (html_escape(origem) or 'AI') + "</span></div>",
        f"<p>{resumo}</p>",
        "</div>",
    ])
    
    # Objetivos de Aprendizagem (Seção 2)
    objetivos = render_data.get('objetivos', [])
    if objetivos:
        html.extend([
            "<div class='section-card'>",
            f"<div class='card-header'><h2 class='card-title'>🎯 Objetivos de Aprendizagem</h2><span class='card-badge'>{len(objetivos)} OBJETIVOS</span></div>",
            "<ol class='retro-list'>",
        ])
        for obj in objetivos:
            html.append(f"<li>{html_escape(obj)}</li>")
        html.extend(["</ol>", "</div>"])
    
    # Conceitos Fundamentais (Seção 3)
    conceitos = render_data.get('conceitos', [])
    if conceitos:
        html.extend([
            "<div class='section-card'>",
            f"<div class='card-header'><h2 class='card-title'>📖 Conceitos Fundamentais</h2><span class='card-badge'>{len(conceitos)} CONCEITOS</span></div>",
        ])
        for conceito in conceitos:
            if isinstance(conceito, dict):
                html.append("<div style='background: var(--base); border: 2px solid var(--ink); padding: 15px; margin-bottom: 15px; border-radius: 8px;'>")
                html.append(f"<h3 style='color: var(--accent); margin-bottom: 10px;'>{html_escape(conceito.get('nome', ''))}</h3>")
                html.append(f"<p><strong>Definição:</strong> {html_escape(conceito.get('definicao', ''))}</p>")
                if conceito.get('exemplos'):
                    html.append("<p><strong>Exemplos:</strong></p><ul>")
                    for ex in conceito['exemplos']:
                        html.append(f"<li>{html_escape(ex)}</li>")
                    html.append("</ul>")
                if conceito.get('importancia'):
                    html.append(f"<p><strong>Importância:</strong> {html_escape(conceito['importancia'])}</p>")
                html.append("</div>")
        html.append("</div>")
    
    # Estrutura Central (Seção 4)
    estrutura = render_data.get('estrutura', [])
    if estrutura:
        html.extend([
            "<div class='section-card'>",
            f"<div class='card-header'><h2 class='card-title'>🏗️ Estrutura Central da Aula</h2><span class='card-badge'>{len(estrutura)} ELEMENTOS</span></div>",
            "<div class='timeline'>",
        ])
        for i, elem in enumerate(estrutura, 1):
            if isinstance(elem, dict):
                html.append("<div class='timeline-item'>")
                html.append(f"<div style='position: absolute; left: -40px; width: 30px; height: 30px; background: var(--accent); border: 2px solid var(--ink); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white;'>{i}</div>")
                html.append("<div style='padding-left: 10px;'>")
                html.append(f"<h3 style='color: var(--accent);'>{html_escape(elem.get('titulo', ''))}</h3>")
                html.append(f"<p>{html_escape(elem.get('descricao', ''))}</p>")
                if elem.get('funcionamento'):
                    html.append(f"<p><strong>Funcionamento:</strong> {html_escape(elem['funcionamento'])}</p>")
                if elem.get('conexao'):
                    html.append(f"<p><strong>Conexão:</strong> {html_escape(elem['conexao'])}</p>")
                html.append("</div></div>")
        html.extend(["</div>", "</div>"])
    
    # Exemplos Fornecidos (Seção 5)
    exemplos = render_data.get('exemplos', [])
    if exemplos:
        html.extend([
            "<div class='section-card'>",
            f"<div class='card-header'><h2 class='card-title'>💡 Exemplos Fornecidos</h2><span class='card-badge'>{len(exemplos)} EXEMPLOS</span></div>",
        ])
        for exemplo in exemplos:
            if isinstance(exemplo, dict):
                html.append("<div style='background: var(--sun); border: 2px solid var(--ink); padding: 15px; margin-bottom: 15px; border-radius: 8px;'>")
                html.append(f"<p><strong>Contexto:</strong> {html_escape(exemplo.get('contexto', ''))}</p>")
                html.append(f"<p><strong>Demonstra:</strong> {html_escape(exemplo.get('demonstra', ''))}</p>")
                html.append(f"<p><strong>Aplicação:</strong> {html_escape(exemplo.get('aplicacao', ''))}</p>")
                if exemplo.get('resultado'):
                    html.append(f"<p><strong>Resultado:</strong> {html_escape(exemplo['resultado'])}</p>")
                html.append("</div>")
        html.append("</div>")
    
    # Ferramentas e Métodos (Seção 6)
    ferramentas = render_data.get('ferramentas', [])
    if ferramentas:
        html.extend([
            "<div class='section-card'>",
            f"<div class='card-header'><h2 class='card-title'>🔧 Ferramentas, Métodos e Técnicas</h2><span class='card-badge'>{len(ferramentas)} ITENS</span></div>",
        ])
        for ferramenta in ferramentas:
            if isinstance(ferramenta, dict):
                html.append("<div style='background: white; border-left: 4px solid var(--pop); padding: 15px; margin-bottom: 15px;'>")
                html.append(f"<h3 style='color: var(--pop);'>{html_escape(ferramenta.get('nome', ''))}</h3>")
                html.append(f"<p>{html_escape(ferramenta.get('descricao', ''))}</p>")
                if ferramenta.get('como_usar'):
                    html.append(f"<p><strong>Como usar:</strong> {html_escape(ferramenta['como_usar'])}</p>")
                if ferramenta.get('quando_usar'):
                    html.append(f"<p><strong>Quando usar:</strong> {html_escape(ferramenta['quando_usar'])}</p>")
                if ferramenta.get('onde_aplicar'):
                    html.append(f"<p><strong>Onde aplicar:</strong> {html_escape(ferramenta['onde_aplicar'])}</p>")
                html.append("</div>")
        html.append("</div>")
    
    # Orientações Práticas (Seção 7)
    orientacoes_praticas = render_data.get('orientacoes_praticas', {})
    if orientacoes_praticas and isinstance(orientacoes_praticas, dict):
        total_acoes = sum(len(v) if isinstance(v, list) else 0 for v in orientacoes_praticas.values())
        if total_acoes > 0:
            html.extend([
                "<div class='section-card'>",
                f"<div class='card-header'><h2 class='card-title'>📋 Orientações Práticas e Tarefas</h2><span class='card-badge'>{total_acoes} AÇÕES</span></div>",
            ])
            for categoria, acoes in [('acao_imediata', '🔥 Ação Imediata'), ('acao_curto_prazo', '📅 Curto Prazo'), ('acao_medio_prazo', '📆 Médio Prazo')]:
                items = orientacoes_praticas.get(categoria, [])
                if items:
                    html.append(f"<h3 style='color: var(--accent); margin-top: 20px;'>{acoes}</h3>")
                    html.append("<ol class='retro-list'>")
                    for item in items:
                        if isinstance(item, dict):
                            html.append(f"<li><strong>{html_escape(item.get('tarefa', ''))}</strong><br>")
                            if item.get('como_fazer'):
                                html.append(f"<em>Como:</em> {html_escape(item['como_fazer'])}<br>")
                            if item.get('resultado'):
                                html.append(f"<em>Resultado:</em> {html_escape(item['resultado'])}")
                            html.append("</li>")
                        elif isinstance(item, str):
                            html.append(f"<li>{html_escape(item)}</li>")
                    html.append("</ol>")
            html.append("</div>")
    
    # Abordagem Pedagógica (Seção 8)
    abordagem = render_data.get('abordagem', {})
    if abordagem and isinstance(abordagem, dict):
        html.extend([
            "<div class='section-card'>",
            "<div class='card-header'><h2 class='card-title'>👨‍🏫 Abordagem Pedagógica do Professor</h2></div>",
            "<div style='display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;'>",
        ])
        for campo, icone in [('tom', '🎭'), ('ritmo', '⏱️'), ('recursos_didaticos', '📚'), ('tecnicas_reforco', '🔄'), ('engajamento', '💬'), ('principios_andragogicos', '🎓'), ('estrutura_apresentacao', '📊')]:
            valor = abordagem.get(campo)
            if valor:
                html.append("<div style='background: var(--base); border: 2px solid var(--ink); padding: 10px; border-radius: 8px;'>")
                html.append(f"<div style='font-weight: 700; color: var(--accent); margin-bottom: 5px;'>{icone} {campo.replace('_', ' ').title()}</div>")
                if isinstance(valor, list):
                    html.append("<ul style='margin: 0; padding-left: 20px;'>")
                    for v in valor:
                        html.append(f"<li>{html_escape(v)}</li>")
                    html.append("</ul>")
                else:
                    html.append(f"<div>{html_escape(valor)}</div>")
                html.append("</div>")
        html.extend(["</div>", "</div>"])
    
    # Ideias-Chave (Seção 9)
    ideias = render_data.get('ideias', {})
    if ideias:
        if isinstance(ideias, dict):
            total_ideias = sum(len(v) if isinstance(v, list) else 0 for v in ideias.values())
            if total_ideias > 0:
                html.extend([
                    "<div class='section-card'>",
                    f"<div class='card-header'><h2 class='card-title'>💎 Ideias-Chave e Insights</h2><span class='card-badge'>{total_ideias} INSIGHTS</span></div>",
                ])
                for categoria, titulo in [('insights_principais', '✨ Insights Principais'), ('principios_estrategicos', '🎯 Princípios Estratégicos'), ('alertas_armadilhas', '⚠️ Alertas e Armadilhas'), ('mindset_recomendado', '🧠 Mindset Recomendado')]:
                    items = ideias.get(categoria, [])
                    if items:
                        html.append(f"<h3 style='color: var(--accent); margin-top: 15px;'>{titulo}</h3>")
                        html.append("<ul class='retro-list'>")
                        for item in items:
                            html.append(f"<li>{html_escape(item)}</li>")
                        html.append("</ul>")
                html.append("</div>")
        elif isinstance(ideias, list):
            html.extend([
                "<div class='section-card'>",
                f"<div class='card-header'><h2 class='card-title'>💎 Ideias-Chave e Insights</h2><span class='card-badge'>{len(ideias)} IDEIAS</span></div>",
                "<ul class='retro-list'>",
            ])
            for ideia in ideias:
                html.append(f"<li>{html_escape(ideia)}</li>")
            html.extend(["</ul>", "</div>"])
    
    # Pontos de Memorização (Seção 10)
    pontos_memo = render_data.get('pontos_memo', {})
    if pontos_memo and isinstance(pontos_memo, dict):
        html.extend([
            "<div class='section-card'>",
            "<div class='card-header'><h2 class='card-title'>🧠 Pontos-Chave para Memorização</h2></div>",
        ])
        if pontos_memo.get('pilares'):
            html.append("<h3 style='color: var(--accent);'>🏛️ Pilares</h3>")
            html.append("<ul class='retro-list'>")
            for pilar in pontos_memo['pilares']:
                html.append(f"<li>{html_escape(pilar)}</li>")
            html.append("</ul>")
        regras = pontos_memo.get('regras_de_ouro', {})
        if regras:
            html.append("<h3 style='color: var(--accent); margin-top: 15px;'>⚖️ Regras de Ouro</h3>")
            html.append("<div style='display: grid; grid-template-columns: 1fr 1fr; gap: 15px;'>")
            if regras.get('fazer'):
                html.append("<div style='background: #d4edda; border: 2px solid #28a745; padding: 15px; border-radius: 8px;'>")
                html.append("<h4 style='color: #28a745;'>✅ O que fazer</h4><ul>")
                for item in regras['fazer']:
                    html.append(f"<li>{html_escape(item)}</li>")
                html.append("</ul></div>")
            if regras.get('nao_fazer'):
                html.append("<div style='background: #f8d7da; border: 2px solid #dc3545; padding: 15px; border-radius: 8px;'>")
                html.append("<h4 style='color: #dc3545;'>❌ O que não fazer</h4><ul>")
                for item in regras['nao_fazer']:
                    html.append(f"<li>{html_escape(item)}</li>")
                html.append("</ul></div>")
            html.append("</div>")
        if pontos_memo.get('formulas_estruturas'):
            html.append("<h3 style='color: var(--accent); margin-top: 15px;'>📐 Fórmulas e Estruturas</h3>")
            html.append("<ul class='retro-list'>")
            for formula in pontos_memo['formulas_estruturas']:
                html.append(f"<li>{html_escape(formula)}</li>")
            html.append("</ul>")
        if pontos_memo.get('principios_repetidos'):
            html.append("<h3 style='color: var(--accent); margin-top: 15px;'>🔁 Princípios Repetidos</h3>")
            html.append("<ul class='retro-list'>")
            for principio in pontos_memo['principios_repetidos']:
                html.append(f"<li>{html_escape(principio)}</li>")
            html.append("</ul>")
        html.append("</div>")
    
    # Citações Marcantes (Seção 11)
    citacoes = render_data.get('citacoes', [])
    if citacoes:
        html.extend([
            "<div class='section-card'>",
            f"<div class='card-header'><h2 class='card-title'>💬 Citações Marcantes</h2><span class='card-badge'>{len(citacoes)} CITAÇÕES</span></div>",
        ])
        for citacao in citacoes:
            if isinstance(citacao, dict):
                html.append("<div style='background: var(--base); border-left: 4px solid var(--accent); padding: 15px; margin-bottom: 15px; font-style: italic;'>")
                html.append(f"<p style='font-size: 18px; margin-bottom: 10px;'>&quot;{html_escape(citacao.get('citacao', ''))}&quot;</p>")
                if citacao.get('contexto'):
                    html.append(f"<p style='font-size: 12px; color: #666;'>— {html_escape(citacao['contexto'])}</p>")
                html.append("</div>")
            elif isinstance(citacao, str):
                html.append(f"<div style='background: var(--base); border-left: 4px solid var(--accent); padding: 15px; margin-bottom: 15px; font-style: italic;'><p style='font-size: 18px;'>&quot;{html_escape(citacao)}&quot;</p></div>")
        html.append("</div>")
    
    # Próximos Passos (Seção 12)
    proximos = render_data.get('proximos', {})
    if proximos and isinstance(proximos, dict):
        total_passos = sum(len(v) if isinstance(v, list) else 0 for v in proximos.values())
        if total_passos > 0:
            html.extend([
                "<div class='section-card'>",
                f"<div class='card-header'><h2 class='card-title'>🚀 Próximos Passos Indicados</h2><span class='card-badge'>{total_passos} AÇÕES</span></div>",
            ])
            for categoria, icone, titulo in [('acao_imediata', '⚡', 'Ação Imediata'), ('acao_curto_prazo', '📅', 'Curto Prazo'), ('acao_medio_prazo', '📆', 'Médio Prazo'), ('acao_continua', '🔄', 'Ação Contínua')]:
                items = proximos.get(categoria, [])
                if items:
                    html.append(f"<h3 style='color: var(--accent); margin-top: 15px;'>{icone} {titulo}</h3>")
                    html.append("<ol class='retro-list'>")
                    for item in items:
                        html.append(f"<li>{html_escape(item)}</li>")
                    html.append("</ol>")
            html.append("</div>")
    
    # Preparação Próxima Aula (Seção 13)
    preparacao = render_data.get('preparacao', {})
    if preparacao:
        if isinstance(preparacao, dict) and any(preparacao.values()):
            html.extend([
                "<div class='section-card'>",
                "<div class='card-header'><h2 class='card-title'>📚 Preparação para Próxima Aula</h2></div>",
            ])
            if preparacao.get('tema'):
                html.append(f"<p><strong>Tema:</strong> {html_escape(preparacao['tema'])}</p>")
            if preparacao.get('ganho_prometido'):
                html.append(f"<p><strong>Ganho Prometido:</strong> {html_escape(preparacao['ganho_prometido'])}</p>")
            if preparacao.get('pre_requisitos'):
                html.append("<p><strong>Pré-requisitos:</strong></p><ul>")
                for req in preparacao['pre_requisitos']:
                    html.append(f"<li>{html_escape(req)}</li>")
                html.append("</ul>")
            if preparacao.get('preparacao_recomendada'):
                html.append("<p><strong>Preparação Recomendada:</strong></p><ul>")
                for prep in preparacao['preparacao_recomendada']:
                    html.append(f"<li>{html_escape(prep)}</li>")
                html.append("</ul>")
            if preparacao.get('conexao'):
                html.append(f"<p><strong>Conexão:</strong> {html_escape(preparacao['conexao'])}</p>")
            if preparacao.get('prazo'):
                html.append(f"<p><strong>Prazo:</strong> {html_escape(preparacao['prazo'])}</p>")
            html.append("</div>")
        elif isinstance(preparacao, str) and preparacao.strip():
            html.extend([
                "<div class='section-card'>",
                "<div class='card-header'><h2 class='card-title'>📚 Preparação para Próxima Aula</h2></div>",
                f"<p>{html_escape(preparacao)}</p>",
                "</div>",
            ])
    
    # Materiais de Apoio (Seção 14)
    materiais = render_data.get('materiais', [])
    if materiais:
        if isinstance(materiais, list) and materiais:
            html.extend([
                "<div class='section-card'>",
                f"<div class='card-header'><h2 class='card-title'>📎 Materiais de Apoio</h2><span class='card-badge'>{len(materiais)} MATERIAIS</span></div>",
            ])
            for material in materiais:
                if isinstance(material, dict):
                    html.append("<div style='background: var(--base); border: 2px solid var(--ink); padding: 15px; margin-bottom: 15px; border-radius: 8px;'>")
                    html.append(f"<h3 style='color: var(--pop);'>{html_escape(material.get('nome', ''))}</h3>")
                    if material.get('tipo'):
                        html.append(f"<p><strong>Tipo:</strong> {html_escape(material['tipo'])}</p>")
                    if material.get('descricao'):
                        html.append(f"<p>{html_escape(material['descricao'])}</p>")
                    if material.get('como_acessar'):
                        html.append(f"<p><strong>Como acessar:</strong> {html_escape(material['como_acessar'])}</p>")
                    if material.get('quando_usar'):
                        html.append(f"<p><strong>Quando usar:</strong> {html_escape(material['quando_usar'])}</p>")
                    if material.get('importancia'):
                        html.append(f"<p><strong>Importância:</strong> {html_escape(material['importancia'])}</p>")
                    html.append("</div>")
                elif isinstance(material, str):
                    html.append(f"<div style='background: var(--base); border: 2px solid var(--ink); padding: 15px; margin-bottom: 15px; border-radius: 8px;'><p>{html_escape(material)}</p></div>")
            html.append("</div>")
        elif isinstance(materiais, str) and materiais.strip():
            html.extend([
                "<div class='section-card'>",
                "<div class='card-header'><h2 class='card-title'>📎 Materiais de Apoio</h2></div>",
                f"<p>{html_escape(materiais)}</p>",
                "</div>",
            ])
    
    # Seções legadas (para compatibilidade)
    if secoes:
        html.extend([
            "<div class='section-card'>",
            f"<div class='card-header'><h2 class='card-title'>📚 Capítulos</h2><span class='card-badge'>{len(secoes)} SEÇÕES</span></div>",
            "<ul class='retro-list' style='list-style: none;'>", 
        ])
        for s in secoes:
            html.append(f"<li><strong>{html_escape(s.get('titulo'))}</strong> <span style='float:right; font-size:12px; font-family:monospace;'>{s.get('inicio')}s - {s.get('fim')}s</span></li>")
        html.append("</ul></div>")

    # Transcrição
    html.extend([
        "<div class='collapsible'>",
        "<div class='collapsible-header' onclick='this.parentElement.classList.toggle(\"open\")'><span>📄 TRANSCRIÇÃO COMPLETA</span><span>+</span></div>",
        f"<div class='collapsible-content'>{full_text or 'Transcrição não disponível.'}</div>",
        "</div>",
        
        # JSON (Novo)
        "<div class='collapsible'>",
        "<div class='collapsible-header' onclick='this.parentElement.classList.toggle(\"open\")'><span>🔧 DADOS TÉCNICOS (JSON)</span><span>+</span></div>",
        f"<div class='collapsible-content'>{gem_raw if gem_raw else '[Sem dados]'}</div>",
        "</div>",

        "<div class='footer'>Gerado por Video Processor Pro • Solar Pop Edition</div>",
        "</div></body></html>"
    ])
    
    return "\n".join(html)

def _generate_v1_modern(title, resumo, pontos, topicos, orient, secoes, full_text, gem_raw, gem_model, header, origem):
    # CSS Moderno com formatação de texto profissional
    css = """
        :root {
            --primary: #6366f1;
            --secondary: #8b5cf6;
            --accent: #ec4899;
            --success: #10b981;
            --warning: #f59e0b;
            --bg-light: #f8fafc;
            --text-dark: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.7;
            color: var(--text-dark);
            background: var(--bg-light);
            padding: 0;
            margin: 0;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        
        /* Header com gradiente */
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            margin-bottom: 30px;
            box-shadow: var(--shadow);
        }
        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 15px;
            line-height: 1.3;
        }
        .header-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            font-size: 14px;
            opacity: 0.95;
        }
        .header-meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        /* Navegação */
        .nav {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: var(--shadow);
            margin-bottom: 30px;
            position: sticky;
            top: 20px;
            z-index: 100;
        }
        .nav h3 {
            font-size: 16px;
            margin-bottom: 15px;
            color: var(--text-dark);
        }
        .nav-links {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            list-style: none;
        }
        .nav-link {
            padding: 8px 16px;
            background: var(--bg-light);
            border-radius: 6px;
            text-decoration: none;
            color: var(--primary);
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        .nav-link:hover {
            background: var(--primary);
            color: white;
            transform: translateY(-2px);
        }
        
        /* Cards */
        .card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 25px;
            box-shadow: var(--shadow);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
        }
        .card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--border);
        }
        .card-icon {
            font-size: 28px;
            line-height: 1;
        }
        .card-title {
            font-size: 22px;
            font-weight: 700;
            color: var(--text-dark);
            margin: 0;
        }
        .card-badge {
            background: var(--primary);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-left: auto;
        }
        
        /* Formatação de texto profissional */
        .text-content {
            font-size: 16px;
            line-height: 1.8;
            color: var(--text-dark);
            text-align: justify;
        }
        .text-content p {
            margin-bottom: 16px;
        }
        .text-content p:last-child {
            margin-bottom: 0;
        }
        
        /* Listas estilizadas */
        .styled-list {
            list-style: none;
            counter-reset: item;
        }
        .styled-list li {
            counter-increment: item;
            padding: 16px 20px;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-left: 4px solid var(--primary);
            border-radius: 8px;
            position: relative;
            padding-left: 60px;
            line-height: 1.6;
            text-align: left;
        }
        .styled-list li:nth-child(even) {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left-color: var(--warning);
        }
        .styled-list li:nth-child(3n) {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border-left-color: #3b82f6;
        }
        .styled-list li::before {
            content: counter(item);
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            background: var(--primary);
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
        }
        .styled-list li:nth-child(even)::before {
            background: var(--warning);
        }
        .styled-list li:nth-child(3n)::before {
            background: #3b82f6;
        }
        
        /* Timeline para orientações */
        .timeline {
            position: relative;
            padding-left: 40px;
        }
        .timeline::before {
            content: '';
            position: absolute;
            left: 14px;
            top: 0;
            bottom: 0;
            width: 3px;
            background: linear-gradient(180deg, var(--primary) 0%, var(--accent) 100%);
        }
        .timeline-item {
            position: relative;
            padding: 20px;
            margin-bottom: 20px;
            background: white;
            border-radius: 8px;
            border: 2px solid var(--border);
            margin-left: 20px;
        }
        .timeline-item::before {
            content: attr(data-step);
            position: absolute;
            left: -48px;
            top: 20px;
            width: 32px;
            height: 32px;
            background: var(--primary);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            box-shadow: 0 0 0 4px var(--bg-light);
        }
        .timeline-action {
            font-size: 17px;
            font-weight: 600;
            color: var(--text-dark);
            margin-bottom: 8px;
            line-height: 1.5;
        }
        .timeline-benefit {
            font-size: 15px;
            color: var(--text-muted);
            padding: 12px;
            background: var(--bg-light);
            border-radius: 6px;
            border-left: 3px solid var(--success);
            line-height: 1.6;
        }
        .timeline-benefit::before {
            content: '💡 ';
            margin-right: 6px;
        }
        
        /* Seções colapsáveis */
        .collapsible {
            background: white;
            border-radius: 12px;
            margin-bottom: 15px;
            overflow: hidden;
            box-shadow: var(--shadow);
        }
        .collapsible-header {
            padding: 20px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            font-size: 16px;
            transition: background 0.2s;
        }
        .collapsible-header:hover {
            background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
        }
        .collapsible-header::after {
            content: '▼';
            margin-left: auto;
            transition: transform 0.3s;
        }
        .collapsible.open .collapsible-header::after {
            transform: rotate(180deg);
        }
        .collapsible-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }
        .collapsible.open .collapsible-content {
            max-height: 5000px;
            transition: max-height 0.5s ease-in;
        }
        .collapsible-body {
            padding: 20px;
            font-size: 14px;
            line-height: 1.8;
            color: var(--text-dark);
            white-space: pre-wrap;
            word-wrap: break-word;
            text-align: left;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            padding: 30px 20px;
            color: var(--text-muted);
            font-size: 14px;
            border-top: 2px solid var(--border);
            margin-top: 40px;
        }
        .back-to-top {
            display: inline-block;
            margin-top: 15px;
            padding: 10px 20px;
            background: var(--primary);
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            transition: all 0.2s;
        }
        .back-to-top:hover {
            background: var(--secondary);
            transform: translateY(-2px);
        }
        
        /* Responsivo */
        @media (max-width: 768px) {
            .container { padding: 15px; }
            .header { padding: 30px 15px; }
            .header h1 { font-size: 22px; }
            .card { padding: 20px; }
            .styled-list li { padding-left: 50px; }
            .timeline { padding-left: 30px; }
        }
        
        /* Print styles */
        @media print {
            body { background: white; }
            .nav, .back-to-top { display: none; }
            .card { box-shadow: none; border: 1px solid #ddd; }
        }
    """
    
    # Construir HTML moderno (Código Original extraído)
    html = [
        "<!DOCTYPE html>",
        "<html lang=\"pt-BR\">",
        "<head>",
        "<meta charset=\"utf-8\">",
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
        f"<title>{html_escape(title)}</title>",
        f"<style>{css}</style>",
        "</head>",
        "<body>",
        
        # Header com gradiente
        "<div class=\"header\">",
        "<div class=\"container\">",
        f"<h1>📚 {html_escape(title)}</h1>",
        "<div class=\"header-meta\">",
        f"<div class=\"header-meta-item\">🔗 <strong>URL:</strong> {html_escape(header['url'] or '')}</div>",
        f"<div class=\"header-meta-item\">📅 <strong>Gerado:</strong> {html_escape(header['gerado_em'])}</div>",
        f"<div class=\"header-meta-item\">🤖 <strong>Modelo:</strong> {html_escape(gem_model or 'N/A')}</div>",
        "</div>",
        "</div>",
        "</div>",
        
        "<div class=\"container\">",
        
        # Navegação rápida
        "<nav class=\"nav\" id=\"nav\">",
        "<h3>📑 Navegação Rápida</h3>",
        "<div class=\"nav-links\">",
        "<a href=\"#resumo\" class=\"nav-link\">📝 Resumo</a>",
        "<a href=\"#pontos\" class=\"nav-link\">✨ Pontos-Chave</a>",
        "<a href=\"#orientacoes\" class=\"nav-link\">🎯 Orientações</a>",
        "<a href=\"#secoes\" class=\"nav-link\">📚 Seções</a>",
        "<a href=\"#transcricao\" class=\"nav-link\">📄 Transcrição</a>",
        "</div>",
        "</nav>",
        
        # Resumo
        "<div class=\"card\" id=\"resumo\">",
        "<div class=\"card-header\">",
        "<span class=\"card-icon\">📝</span>",
        "<h2 class=\"card-title\">Resumo do Vídeo</h2>",
        f"<span class=\"card-badge\">{html_escape(origem or 'AI')}</span>",
        "</div>",
        f"<div class=\"text-content\"><p>{resumo}</p></div>",
        "</div>",
        
        # Pontos-chave
        "<div class=\"card\" id=\"pontos\">",
        "<div class=\"card-header\">",
        "<span class=\"card-icon\">✨</span>",
        "<h2 class=\"card-title\">Pontos-Chave</h2>",
        f"<span class=\"card-badge\">{len(pontos)} itens</span>",
        "</div>",
        "<ol class=\"styled-list\">",
    ]
    
    for p in pontos:
        html.append(f"<li>{html_escape(p)}</li>")
    
    html.extend([
        "</ol>",
        "</div>",
        
        # Orientações com timeline
        "<div class=\"card\" id=\"orientacoes\">",
        "<div class=\"card-header\">",
        "<span class=\"card-icon\">🎯</span>",
        "<h2 class=\"card-title\">Orientações Práticas</h2>",
        f"<span class=\"card-badge\">{len(orient)} passos</span>",
        "</div>",
        "<div class=\"timeline\">",
    ])
    
    for o in orient:
        passo = o.get("passo")
        acao = html_escape(o.get("acao") or "")
        beneficio = html_escape(o.get("beneficio") or "")
        html.append(f"<div class=\"timeline-item\" data-step=\"{passo}\">")
        html.append(f"<div class=\"timeline-action\">{acao}</div>")
        html.append(f"<div class=\"timeline-benefit\">{beneficio}</div>")
        html.append("</div>")
    
    html.extend([
        "</div>",
        "</div>",
    ])
    
    # Seções
    if secoes:
        html.extend([
            "<div class=\"card\" id=\"secoes\">",
            "<div class=\"card-header\">",
            "<span class=\"card-icon\">📚</span>",
            "<h2 class=\"card-title\">Seções do Vídeo</h2>",
            f"<span class=\"card-badge\">{len(secoes)} seções</span>",
            "</div>",
            "<ol class=\"styled-list\">",
        ])
        for s in secoes:
            t = html_escape(s.get("titulo") or "")
            i = s.get("inicio")
            f = s.get("fim")
            html.append(f"<li><strong>{t}</strong> ({i}s – {f}s)</li>")
        html.extend([
            "</ol>",
            "</div>",
        ])
    
    # Transcrição (colapsável)
    html.extend([
        "<div class=\"collapsible\" id=\"transcricao\">",
        "<div class=\"collapsible-header\" onclick=\"this.parentElement.classList.toggle('open')\">",
        "<span>📄</span>",
        "<span>Transcrição Completa</span>",
        "</div>",
        "<div class=\"collapsible-content\">",
        f"<div class=\"collapsible-body\">{full_text}</div>",
        "</div>",
        "</div>",
        
        # JSON (colapsável)
        "<div class=\"collapsible\">",
        "<div class=\"collapsible-header\" onclick=\"this.parentElement.classList.toggle('open')\">",
        "<span>🔧</span>",
        "<span>Dados Técnicos (JSON)</span>",
        "</div>",
        "<div class=\"collapsible-content\">",
        f"<div class=\"collapsible-body\">{gem_raw if gem_raw else '[Sem dados]'}</div>",
        "</div>",
        "</div>",
        
        # Footer
        "</div>",
        "<div class=\"footer\">",
        f"<div>Relatório gerado automaticamente • {html_escape(header['gerado_em'])}</div>",
        "<a href=\"#top\" class=\"back-to-top\">⬆️ Voltar ao Topo</a>",
        "</div>",
        
        # JavaScript para smooth scroll com offset
        "<script>",
        "document.querySelectorAll('a[href^=\"#\"]').forEach(anchor => {",
        "  anchor.addEventListener('click', function (e) {",
        "    e.preventDefault();",
        "    const href = this.getAttribute('href');",
        "    if (href === '#nav' || href === '#top') {",
        "      window.scrollTo({ top: 0, behavior: 'smooth' });",
        "    } else {",
        "      const target = document.querySelector(href);",
        "      if (target) {",
        "        const navHeight = document.querySelector('.nav').offsetHeight;",
        "        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;",
        "        const offsetPosition = targetPosition - navHeight - 20;",
        "        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });",
        "      }",
        "    }",
        "  });",
        "});",
        "</script>",
        "</body>",
        "</html>",
    ])
    
    return "\n".join(html)

def try_generate_pdf(html_path: str, pdf_path: str):
    wk = os.getenv("WKHTMLTOPDF_PATH")
    if not wk:
        return False
    try:
        import subprocess
        subprocess.run([wk, html_path, pdf_path], check=True)
        return True
    except Exception:
        return False

# Funções wrapper para suportar Modelo 2 (14 seções)

def _generate_v2_solar_pop_modelo2(title, render_data, full_text, gem_raw, gem_model, header, origem):
    '''Wrapper que chama _generate_v2_solar_pop com retrocompatibilidade'''
    return _generate_v2_solar_pop(
        title,
        render_data['resumo'],
        render_data['pontos'],
        render_data['orient'],
        render_data['secoes'],
        full_text,
        gem_raw,
        gem_model,
        header,
        origem
    )

def _generate_v1_modern_modelo2(title, render_data, full_text, gem_raw, gem_model, header, origem):
    '''Wrapper que chama _generate_v1_modern com retrocompatibilidade'''
    return _generate_v1_modern(
        title,
        render_data['resumo'],
        render_data['pontos'],
        render_data['topicos'],
        render_data['orient'],
        render_data['secoes'],
        full_text,
        gem_raw,
        gem_model,
        header,
        origem
    )
