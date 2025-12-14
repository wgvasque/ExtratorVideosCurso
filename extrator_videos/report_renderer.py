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

def generate_full_report(data: dict, transcription_text: str, meta: dict, outfile_html: str, enable_pdf: bool = False):
    title = sanitize_title(meta.get("title") or "Resumo do Vídeo")
    resumo = html_escape(data.get("resumo_conciso") or "")
    pontos = data.get("pontos_chave") or []
    topicos = data.get("topicos") or []
    orient = data.get("orientacoes") or []
    secoes = data.get("secoes") or []
    origem = html_escape(data.get("origin") or "")
    full_text = html_escape(transcription_text or "")
    gem_raw_text = data.get("retorno_literal_gemini") or ""
    gem_raw = html_escape(gem_raw_text)
    gem_model = html_escape(data.get("gemini_model") or "")
    gem_origin = html_escape(data.get("origin") or "")
    gem_err = html_escape(data.get("gemini_error") or "")

    # Preferir campos diretamente do retorno literal do Gemini quando disponível
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
    if parsed:
        resumo = html_escape(parsed.get("resumo_conciso") or resumo)
        pontos = parsed.get("pontos_chave") or pontos
        topicos = parsed.get("topicos") or topicos
        orient = parsed.get("orientacoes") or orient
        secoes = parsed.get("secoes") or secoes
    ts_iso = datetime.datetime.now().replace(microsecond=0).isoformat()
    header = {
        "url": meta.get("url"),
        "dominio": meta.get("dominio"),
        "id": meta.get("id"),
        "gerado_em": ts_iso,
    }
    
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
    
    # Construir HTML moderno
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
        f"<div>Relatório gerado automaticamente • {html_escape(ts_iso)}</div>",
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
    os.makedirs(os.path.dirname(outfile_html), exist_ok=True)
    with open(outfile_html, "w", encoding="utf-8") as f:
        f.write("\n".join(html))
    if enable_pdf:
        try_generate_pdf(outfile_html, os.path.splitext(outfile_html)[0] + ".pdf")
    return outfile_html

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
