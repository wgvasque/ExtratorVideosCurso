"""
Interface Web para Processamento de Vídeos
Flask + SocketIO + Background Processing
"""
import os
import sys
import json
import threading
from datetime import datetime
from pathlib import Path
# Garantir que módulos do projeto sejam visíveis antes de qualquer import relativo
sys.path.insert(0, str(Path(__file__).parent.parent))
from flask import Flask, render_template, request, jsonify, send_file
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
from extrator_videos import resolve_cache as rc
from extrator_videos import prompt_loader

# Adicionar diretório pai ao path para importar módulos
sys.path.insert(0, str(Path(__file__).parent.parent))

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'video-processor-secret-key-2024'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
PROJECT_ROOT = Path(__file__).parent.parent

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

# Estado global do processamento
processing_state = {
    'is_processing': False,
    'current_video': 0,
    'total_videos': 0,
    'current_url': '',
    'current_title': '',
    'current_step': 'idle',
    'status': 'idle',
    'start_time': None,
    'logs': [],
    'current_proc': None
}

@app.route('/')
def index():
    """Página principal"""
    return render_template('index_v2.html')

@app.route('/view/<domain>/<video_id>')
def view_report_standalone(domain, video_id):
    """Página standalone para visualizar relatório - igual ao modal da interface web"""
    import time
    timestamp = int(time.time())
    # Retornar página HTML que carrega JSON e renderiza com templates.js
    html = f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carregando Relatório...</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
    <style>
        body {{ font-family: 'Inter', sans-serif; margin: 0; padding: 20px; background: #FFF8E7; }}
        .loading {{ text-align: center; padding: 50px; font-size: 18px; color: #666; }}
        .error {{ text-align: center; padding: 50px; color: #e53e3e; }}
    </style>
</head>
<body>
    <div id="report-container">
        <div class="loading">⏳ Carregando relatório...</div>
    </div>
    
    <script src="/static/js/templates.js?v={timestamp}"></script>
    <script>
        const domain = "{domain}";
        const videoId = "{video_id}";
        
        
        async function loadReport() {{
            try {{
                // Tentar múltiplos hosts para funcionar da extensão
                const hosts = ['http://localhost:5000', 'http://127.0.0.1:5000'];
                let reportData = null;
                
                for (const host of hosts) {{
                    try {{
                        const response = await fetch(host + '/api/report-data/' + domain + '/' + videoId);
                        if (response.ok) {{
                            reportData = await response.json();
                            break;
                        }}
                    }} catch (e) {{
                        continue;
                    }}
                }}
                
                if (!reportData) {{
                    throw new Error('Relatório não encontrado');
                }}
                
                // Atualizar título da página
                document.title = reportData.meta?.title || 'Relatório';
                
                // Renderizar usando template Solar Pop (v2)
                const html = templateV2SolarPop(reportData);
                document.getElementById('report-container').innerHTML = html;
                
                // Carregar prompts no seletor (executar após renderização)
                setTimeout(loadPromptsInSelector, 100);
                
            }} catch (error) {{
                document.getElementById('report-container').innerHTML = `
                    <div class="error">
                        <h2>❌ Erro ao carregar relatório</h2>
                        <p>${{error.message}}</p>
                        <p><a href="/">← Voltar para a interface</a></p>
                    </div>
                `;
            }}
        }}
        
        async function loadPromptsInSelector() {{
            const selector = document.getElementById('reprocess-model-select');
            if (!selector) return;
            
            try {{
                const hosts = ['http://localhost:5000', 'http://127.0.0.1:5000'];
                let data = null;
                
                for (const host of hosts) {{
                    try {{
                        const response = await fetch(host + '/prompts', {{ cache: 'no-store' }});
                        if (response.ok) {{
                            data = await response.json();
                            break;
                        }}
                    }} catch (e) {{
                        continue;
                    }}
                }}
                
                if (!data) throw new Error('API indisponível');
                
                const prompts = data.prompts || [];
                
                if (prompts.length === 0) {{
                    selector.innerHTML = '<option value="">❌ Nenhum prompt disponível</option>';
                    return;
                }}
                
                selector.innerHTML = '';
                prompts.forEach(prompt => {{
                    const option = document.createElement('option');
                    option.value = prompt.name;
                    const icon = prompt.valid ? '✅' : '❌';
                    option.textContent = icon + ' ' + prompt.name;
                    option.disabled = !prompt.valid;
                    selector.appendChild(option);
                }});
                
            }} catch (error) {{
                console.error('Erro ao carregar prompts:', error);
                selector.innerHTML = '<option value="">❌ Erro ao carregar</option>';
            }}
        }}
        
        loadReport();
    </script>
</body>
</html>'''
    from flask import Response
    return Response(html, status=200, mimetype='text/html; charset=utf-8')

@app.route('/api/process', methods=['POST'])
def start_processing():
    """Iniciar processamento de vídeos"""
    global processing_state
    
    if processing_state['is_processing']:
        cur = dict(processing_state)
        if 'current_proc' in cur:
            cur['has_current_proc'] = bool(cur['current_proc'])
            del cur['current_proc']
        total = cur.get('total_videos') or 0
        current = cur.get('current_video') or 0
        pct = int((current / total) * 100) if total > 0 else 0
        return jsonify({
            'status': 'already_in_progress',
            'processing': True,
            'progress': pct,
            'current_url': cur.get('current_url'),
            'current_step': 'processing',
            'total': total,
            'current': current
        })
    
    data = request.json
    urls = data.get('urls', [])
    prompt_model = data.get('promptModel', 'modelo2')  # Capturar modelo selecionado
    manifest_url = (data.get('manifestUrl') or '').strip().replace('`','')
    if manifest_url and '?p=' in manifest_url and 'cloudflarestream.com' in manifest_url and '/manifest/video.m3u8' in manifest_url:
        from urllib.parse import urlparse, parse_qs
        pu = urlparse(manifest_url)
        qs = parse_qs(pu.query or '')
        token = (qs.get('p') or [''])[0].strip()
        if token and ('.' in token) and (len(token.split('.')) == 3):
            manifest_url = f"{pu.scheme}://{pu.netloc}/{token}/manifest/video.m3u8"
    
    if not urls:
        return jsonify({'error': 'Nenhuma URL fornecida'}), 400
    
    # Validar URLs
    valid_urls = [url.strip() for url in urls if url.strip().startswith('http')]
    
    if not valid_urls:
        return jsonify({'error': 'Nenhuma URL válida'}), 400
    
    # Definir modelo de prompt como variável de ambiente para os subprocessos
    os.environ['PROMPT_MODEL'] = prompt_model
    print(f"🎯 [API] Modelo de prompt selecionado: {prompt_model}")
    
    # Se recebeu manifestUrl JWT, salvar no captured_manifests.json
    if manifest_url and manifest_url.startswith('http'):
        project_root = Path(__file__).parent.parent
        manifests_file = project_root / 'captured_manifests.json'
        
        try:
            import json
            manifests = {}
            if manifests_file.exists():
                with open(manifests_file, 'r', encoding='utf-8') as f:
                    manifests = json.load(f)
            
            # Atualizar com o manifest JWT
            page_url = valid_urls[0]
            from urllib.parse import urlparse
            parsed = urlparse(page_url)
            domain = parsed.netloc
            
            manifests[page_url] = {
                'manifestUrl': manifest_url,
                'domain': domain,
                'timestamp': datetime.now().isoformat() + 'Z',
                'captured_at': datetime.now().isoformat()
            }
            
            with open(manifests_file, 'w', encoding='utf-8') as f:
                json.dump(manifests, f, ensure_ascii=False, indent=2)
            
            print(f"🎯 [API] Manifest JWT salvo para: {domain}")
            print(f"   URL: {manifest_url[:80]}...")
        except Exception as e:
            print(f"❌ [API] Erro ao salvar manifest JWT: {e}")
    
    # Resetar estado
    processing_state.update({
        'is_processing': True,
        'current_video': 0,
        'total_videos': len(valid_urls),
        'status': 'processing',
        'start_time': datetime.now(),
        'logs': []
    })
    
    # Iniciar processamento em thread separada
    thread = threading.Thread(
        target=process_videos_batch,
        args=(valid_urls,),
        daemon=True
    )
    thread.start()
    
    print(f"✅ [API] Thread de processamento iniciada!")
    print(f"✅ [API] Thread ID: {thread.ident}")
    print(f"✅ [API] Thread alive: {thread.is_alive()}")
    
    return jsonify({
        'status': 'started',
        'total': len(valid_urls),
        'has_jwt_manifest': bool(manifest_url)
    })

@app.route('/api/process', methods=['OPTIONS'])
def process_options():
    return jsonify({'status': 'ok'})

@app.route('/api/reprocess', methods=['POST', 'OPTIONS'])
def reprocess_summary():
    """
    Reprocessa apenas a sumarização, reaproveitando transcrição existente
    """
    # Responder OPTIONS para CORS
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    try:
        data = request.get_json()
        json_path = data.get('jsonPath')
        prompt_model = data.get('promptModel', 'modelo2')
        
        print(f"[API] Reprocessamento solicitado: {json_path} com {prompt_model}")
        
        # Validar caminho - converter para caminho absoluto
        if not json_path:
            return jsonify({'error': 'jsonPath não fornecido'}), 400
        
        # Construir caminho absoluto
        full_path = os.path.join(PROJECT_ROOT, json_path)
        
        if not os.path.exists(full_path):
            print(f"[ERRO] JSON não encontrado: {full_path}")
            return jsonify({'error': f'JSON não encontrado: {json_path}'}), 404
        
        # Carregar JSON existente para validar
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
        except Exception as e:
            print(f"[ERRO] Erro ao ler JSON: {e}")
            return jsonify({'error': f'Erro ao ler JSON: {str(e)}'}), 500
        
        # Verificar se tem transcrição
        if not existing_data.get('transcricao_completa'):
            return jsonify({'error': 'Transcrição não encontrada no JSON. Não é possível reprocessar.'}), 400
        
        print(f"[OK] JSON válido com transcrição ({len(existing_data.get('transcricao_completa', ''))} chars)")
        
        # Definir modelo de prompt
        os.environ['PROMPT_MODEL'] = prompt_model
        
        # Executar reprocessamento em background
        def run_reprocess():
            try:
                print(f"[Thread] Iniciando reprocessamento...")
                from extrator_videos.batch_cli import reprocess_from_transcription
                reprocess_from_transcription(full_path, prompt_model)
                print(f"[Thread] Reprocessamento concluído!")
            except Exception as e:
                print(f"[ERRO] Reprocessamento falhou: {e}")
                import traceback
                traceback.print_exc()
        
        thread = threading.Thread(target=run_reprocess)
        thread.daemon = True
        thread.start()
        
        print(f"[OK] Thread de reprocessamento iniciada")
        
        return jsonify({
            'status': 'started',
            'message': 'Reprocessamento iniciado em background',
            'jsonPath': json_path,
            'promptModel': prompt_model
        })
        
    except Exception as e:
        print(f"[ERRO] Exceção no endpoint /api/reprocess: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/status')
def get_status():
    """Obter status atual do processamento"""
    safe = dict(processing_state)
    if 'current_proc' in safe:
        safe['has_current_proc'] = bool(safe['current_proc'])
        del safe['current_proc']
    total = safe.get('total_videos') or 0
    cur = safe.get('current_video') or 0
    pct = int((cur / total) * 100) if total > 0 else 0
    safe['processing'] = bool(safe.get('is_processing'))
    safe['progress'] = pct
    # Retornar step detalhado se disponível
    if safe.get('is_processing'):
        safe['current_step'] = safe.get('current_step') or 'Processando...'
    else:
        safe['current_step'] = 'idle'
    return jsonify(safe)

@app.route('/api/reports')
def list_reports():
    """Listar todos os relatórios gerados (baseado em arquivos JSON)"""
    project_root = Path(__file__).parent.parent
    sumarios_dir = project_root / Path(os.getenv('SUMARIOS_DIR', 'sumarios'))
    reports = []
    
    if not sumarios_dir.exists():
        return jsonify([])
    
    # Buscar todos os JSONs de resumo
    for json_file in sumarios_dir.rglob('resumo_*.json'):
        try:
            # Extrair informações do caminho
            parts = json_file.parts
            domain_idx = parts.index('sumarios') + 1
            domain = parts[domain_idx] if domain_idx < len(parts) else 'unknown'
            video_id = parts[domain_idx + 1] if domain_idx + 1 < len(parts) else 'unknown'
            
            # Ler dados do JSON
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extrair informações
            title = data.get('titulo_video') or data.get('titulo') or f'Video {video_id}'
            model = data.get('gemini_model', 'N/A')
            origin = data.get('origin', 'N/A')
            
            # Data de processamento
            from datetime import datetime
            proc_date = data.get('data_processamento')
            if proc_date:
                try:
                    created_at = datetime.fromisoformat(proc_date).isoformat()
                except:
                    created_at = datetime.fromtimestamp(json_file.stat().st_mtime).isoformat()
            else:
                created_at = datetime.fromtimestamp(json_file.stat().st_mtime).isoformat()
            
            # Verificar se tem HTML (para compatibilidade)
            render_dir = json_file.parent / 'render'
            has_html_v1 = False
            has_html_v2 = False
            
            if render_dir.exists():
                html_files = list(render_dir.glob('*.html'))
                has_html_v2 = any('_v2.html' in f.name for f in html_files)
                has_html_v1 = any('_v2.html' not in f.name for f in html_files)
            
            reports.append({
                'id': video_id,
                'title': title,
                'domain': domain,
                'json_path': str(json_file.relative_to(sumarios_dir)),
                'report_url': f'/api/report/{domain}/{video_id}',
                'data_url': f'/api/report-data/{domain}/{video_id}',
                'created_at': created_at,
                'model': model,
                'origin': origin,
                'has_html_v1': has_html_v1,
                'has_html_v2': has_html_v2
            })
        except Exception as e:
            print(f"Erro ao processar {json_file}: {e}")
            continue
    
    # Ordenar por data (mais recente primeiro)
    reports.sort(key=lambda x: x['created_at'], reverse=True)
    
    return jsonify(reports)


@app.route('/api/report/<domain>/<video_id>')
def get_report(domain, video_id):
    """Obter HTML de um relatório específico"""
    project_root = Path(__file__).parent.parent
    sumarios_dir = project_root / Path(os.getenv('SUMARIOS_DIR', 'sumarios'))
    video_dir = sumarios_dir / domain / video_id
    render_dir = video_dir / 'render'
    
    # Verificar se existe pasta render
    if not render_dir.exists():
        # Fallback: verificar se existe JSON e gerar HTML dinamicamente
        json_path = video_dir / f'resumo_{video_id}.json'
        if json_path.exists():
            try:
                import json
                from extrator_videos import report_renderer
                
                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Gerar HTML completo usando report_renderer (inclui botão de reprocessamento)
                title = data.get('titulo_video') or data.get('titulo') or 'Relatório'
                transcricao = data.get('transcricao_completa', '')
                
                # Preparar metadados
                meta = {
                    'url': data.get('url_video', ''),
                    'gerado_em': data.get('data_processamento', ''),
                    'dominio': domain,
                    'video_id': video_id
                }
                
                # Gerar HTML usando a função completa
                html_content = report_renderer.generate_full_report(
                    data=data,
                    transcription_text=transcricao,
                    meta=meta,
                    outfile_html=None,  # Não salvar em arquivo
                    enable_pdf=False,
                    version='v2'
                )
                
                return html_content, 200, {'Content-Type': 'text/html; charset=utf-8'}
            except Exception as e:
                import traceback
                traceback.print_exc()
                return jsonify({'error': f'Erro ao processar JSON: {str(e)}'}), 500
        return jsonify({'error': 'Relatório não encontrado'}), 404
    
    # Check for specific version request
    version = request.args.get('version')
    html_files = list(render_dir.glob('*.html'))
    
    if not html_files:
        return jsonify({'error': 'HTML não encontrado'}), 404

    if version == 'v2':
        v2_file = render_dir / f"{video_id}_v2.html"
        if v2_file.exists():
            return send_file(v2_file, mimetype='text/html')
    
    elif version == 'v1':
        # Filter out v2 files to find the latest "original"
        v1_files = [f for f in html_files if '_v2.html' not in f.name]
        if v1_files:
            latest_v1 = max(v1_files, key=lambda x: x.stat().st_mtime)
            return send_file(latest_v1, mimetype='text/html')
            
    # Default behavior: Return latest file (could be v2 if it's the newest)
    latest_html = max(html_files, key=lambda x: x.stat().st_mtime)
    
    return send_file(latest_html, mimetype='text/html')

@app.route('/api/report-data/<domain>/<video_id>')
def get_report_data(domain, video_id):
    """Obter dados completos do relatório em JSON para renderização dinâmica"""
    project_root = Path(__file__).parent.parent
    sumarios_dir = project_root / Path(os.getenv('SUMARIOS_DIR', 'sumarios'))
    video_dir = sumarios_dir / domain / video_id
    
    if not video_dir.exists():
        return jsonify({'error': 'Relatório não encontrado'}), 404
    
    # Carregar JSON principal
    json_path = video_dir / f'resumo_{video_id}.json'
    if not json_path.exists():
        return jsonify({'error': 'Dados do relatório não encontrados'}), 404
    
    try:
        import json
        with open(json_path, 'r', encoding='utf-8') as f:
            report_data = json.load(f)
        
        # Carregar transcrição (prioridade: arquivo > JSON)
        transcricao = ""
        transcricao_path = video_dir / 'transcricao_completa.txt'
        if transcricao_path.exists():
            with open(transcricao_path, 'r', encoding='utf-8') as f:
                transcricao = f.read()
        
        # Fallback para transcrição simples
        if not transcricao:
            transcricao_simple = video_dir / 'transcricao.txt'
            if transcricao_simple.exists():
                with open(transcricao_simple, 'r', encoding='utf-8') as f:
                    transcricao = f.read()
        
        # Fallback final: transcrição do JSON (adicionado pelo batch_cli)
        if not transcricao:
            transcricao = report_data.get('transcricao_completa') or ''
        
        # Fallback: scraping de HTML v1 se dados faltarem
        if not transcricao or not report_data.get('gemini_model'):
            try:
                render_dir = video_dir / 'render'
                if render_dir.exists():
                    html_files = list(render_dir.glob('*.html'))
                    v1_files = [f for f in html_files if '_v2.html' not in f.name]
                    
                    if v1_files:
                        latest_v1 = max(v1_files, key=lambda x: x.stat().st_mtime)
                        with open(latest_v1, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        import re
                        
                        # Scrape Model se faltando
                        if not report_data.get('gemini_model'):
                            m = re.search(r'<strong>Modelo:</strong>\s*(.*?)</div>', content, re.IGNORECASE)
                            if m:
                                report_data['gemini_model'] = m.group(1).strip()
                        
                        # Scrape Transcrição se faltando
                        if not transcricao and "Transcrição" in content:
                            parts = content.split('Transcrição')
                            if len(parts) > 1:
                                sub = parts[-1]
                                m = re.search(r'class=["\']collapsible-body["\'][^>]*>(.*?)</div>', sub, re.DOTALL)
                                if m:
                                    raw_html = m.group(1)
                                    transcricao = re.sub(r'<[^>]+>', '', raw_html).strip()
            except Exception as e:
                print(f"Erro no scraping fallback: {e}")
        
        # Processar data
        from datetime import datetime
        proc_date = report_data.get('data_processamento')
        date_str = None
        if proc_date:
            try:
                dt = datetime.fromisoformat(proc_date)
                date_str = dt.strftime("%d/%m/%Y %H:%M")
            except:
                date_str = str(proc_date)
        
        # Montar resposta completa
        response = {
            'meta': {
                'title': report_data.get('titulo_video') or report_data.get('titulo') or f"Video {video_id}",
                'url': report_data.get('url_video') or report_data.get('url') or 'N/A',
                'domain': domain,
                'videoId': video_id,
                'id': video_id,
                'date': date_str or datetime.now().strftime("%d/%m/%Y %H:%M"),
                'model': report_data.get('gemini_model') or 'N/A',
                'origin': report_data.get('origin') or '',
                # NOVO: Informações de processamento
                'processamento_completo': report_data.get('processamento_completo', True),
                'transcricao_sucesso': report_data.get('transcricao_sucesso', bool(transcricao)),
                'transcricao_chars': report_data.get('transcricao_chars', len(transcricao))
            },
            'data': {
                # Campos legados
                'resumo_conciso': report_data.get('resumo_conciso') or '',
                'pontos_chave': report_data.get('pontos_chave') or [],
                'topicos': report_data.get('topicos') or [],
                'orientacoes': report_data.get('orientacoes') or [],
                'secoes': report_data.get('secoes') or [],
                'retorno_literal_gemini': report_data.get('retorno_literal_gemini') or json.dumps(report_data, indent=2, ensure_ascii=False),
                # Campos Modelo 2/4 (14 seções)
                'resumo_executivo': report_data.get('resumo_executivo') or '',
                'objetivos_aprendizagem': report_data.get('objetivos_aprendizagem') or [],
                'conceitos_fundamentais': report_data.get('conceitos_fundamentais') or [],
                'estrutura_central': report_data.get('estrutura_central') or [],
                'exemplos': report_data.get('exemplos') or [],
                'ferramentas_metodos': report_data.get('ferramentas_metodos') or [],
                'orientacoes_praticas': report_data.get('orientacoes_praticas') or {},
                'abordagem_pedagogica': report_data.get('abordagem_pedagogica') or {},
                'ideias_chave': report_data.get('ideias_chave') or [],
                'pontos_memorizacao': report_data.get('pontos_memorizacao') or {},
                'citacoes_marcantes': report_data.get('citacoes_marcantes') or [],
                'proximos_passos': report_data.get('proximos_passos') or {},
                'preparacao_proxima_aula': report_data.get('preparacao_proxima_aula') or {},
                'materiais_apoio': report_data.get('materiais_apoio') or [],
                # Modelo de prompt usado
                'prompt_model_usado': report_data.get('prompt_model_usado') or report_data.get('_modelo') or '',
                '_modelo': report_data.get('_modelo') or report_data.get('prompt_model_usado') or ''
            },
            'transcription': transcricao,
            # NOVO: Erros por etapa
            'errors': report_data.get('erros_por_etapa') or {}
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Erro ao carregar dados do relatório: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erro ao processar dados: {str(e)}'}), 500

@app.route('/prompts')
def list_prompts():
    """Listar prompts disponíveis com validação"""
    try:
        prompts = prompt_loader.list_available_prompts()
        return jsonify({
            'prompts': prompts,
            'total': len(prompts),
            'valid_count': sum(1 for p in prompts if p['valid'])
        })
    except Exception as e:
        print(f"Erro ao listar prompts: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/prompts/<prompt_name>')
def get_prompt_details(prompt_name):
    """Obter detalhes de um prompt específico"""
    try:
        # Obter metadados
        metadata = prompt_loader.get_prompt_metadata(prompt_name)
        
        # Validar prompt
        validation = prompt_loader.validate_prompt(prompt_name)
        
        # Carregar conteúdo (primeiras 500 caracteres)
        content = prompt_loader.load_prompt_template(prompt_name)
        preview = content[:500] + "..." if content and len(content) > 500 else content
        
        return jsonify({
            'name': prompt_name,
            'metadata': metadata,
            'validation': validation,
            'preview': preview,
            'available': content is not None
        })
    except Exception as e:
        print(f"Erro ao obter detalhes do prompt: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/prompts/validate', methods=['POST'])
def validate_prompt_endpoint():
    """Validar um prompt (para testes)"""
    try:
        data = request.get_json()
        prompt_name = data.get('prompt_name')
        
        if not prompt_name:
            return jsonify({'error': 'prompt_name é obrigatório'}), 400
        
        validation = prompt_loader.validate_prompt(prompt_name)
        
        return jsonify(validation)
    except Exception as e:
        print(f"Erro ao validar prompt: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/report/<path:domain>/<path:video_id>')
def view_report(domain, video_id):
    """
    Rota para visualizar relatório standalone (usado pela extensão)
    """
    import time
    timestamp = int(time.time())
    return render_template('report_standalone.html', domain=domain, video_id=video_id, timestamp=timestamp)

def process_videos_batch(urls):
    """Processar lista de URLs em batch"""
    global processing_state
    
    from urllib.parse import urlparse
    project_root = Path(__file__).parent.parent
    log_file = project_root / 'web_interface' / 'logs' / 'web_process.log'
    try:
        log_file.parent.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    
    for i, url in enumerate(urls, 1):
        if not processing_state['is_processing']:
            break
        
        processing_state['current_video'] = i
        processing_state['current_url'] = url
        pu = urlparse(url)
        referer = f"{pu.scheme}://{pu.netloc}"
        
        # Emitir progresso via WebSocket
        elapsed = (datetime.now() - processing_state['start_time']).total_seconds() if processing_state['start_time'] else 0
        percent = int((i / len(urls)) * 100)
        eta = int((elapsed / i) * (len(urls) - i)) if i > 0 else 0
        socketio.emit('progress', {
            'current': i,
            'total': len(urls),
            'percent': percent,
            'url': url,
            'status': 'processing',
            'elapsed_sec': int(elapsed),
            'eta_sec': eta
        })
        
        try:
            # Processar vídeo usando subprocess (isolado)
            import subprocess
            # Dica de manifest: se existir, salvar no resolve_cache antes de invocar o CLI
            try:
                manifests_file = project_root / 'captured_manifests.json'
                hint_manifest = None
                if manifests_file.exists():
                    with open(manifests_file, 'r', encoding='utf-8') as f:
                        manifests = json.load(f)
                        rec = manifests.get(url)
                        if isinstance(rec, dict):
                            hint_manifest = rec.get('manifestUrl')
                # Normalizar hint para token em path se vier com ?p=
                if hint_manifest and hint_manifest.startswith('http'):
                    try:
                        from urllib.parse import urlparse, parse_qs
                        pu = urlparse(hint_manifest)
                        if ('cloudflarestream.com' in pu.netloc) and ('/manifest/video.m3u8' in pu.path) and (pu.query and 'p=' in pu.query):
                            qs = parse_qs(pu.query or '')
                            token = (qs.get('p') or [''])[0].strip()
                            if token and ('.' in token) and (len(token.split('.')) == 3):
                                hint_manifest = f"{pu.scheme}://{pu.netloc}/{token}/manifest/video.m3u8"
                    except Exception:
                        pass
                    rc_dir = project_root / Path(os.getenv('RESOLVE_CACHE_DIR', 'resolve_cache'))
                    rc.save(str(rc_dir), url, {'manifest': hint_manifest})
                    print(f"🔗 [DEBUG] Manifest hint salvo em resolve_cache para {url}")
            except Exception as e:
                print(f"⚠️ [DEBUG] Falha ao salvar hint de manifest: {e}")
            
            # Atualizar step: Preparando
            processing_state['current_step'] = f"📋 Preparando vídeo {i}/{len(urls)}..."
            print(f"🔍 [DEBUG] Processando vídeo {i}/{len(urls)}: {url}")
            print(f"🔍 [DEBUG] Referer: {referer}")
            
            # Criar arquivo temporário com URL para batch_cli (preferir manifest capturado)
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
                input_for_cli = hint_manifest if (hint_manifest and hint_manifest.startswith('http')) else url
                f.write(input_for_cli + '\n')
                temp_file = f.name
            
            # Atualizar step: Iniciando processamento
            processing_state['current_step'] = f"🚀 Iniciando processamento {i}/{len(urls)}..."
            print(f"🔍 [DEBUG] Arquivo temporário: {temp_file}")
            
            cmd = [
                sys.executable,
                '-m', 'extrator_videos.batch_cli',
                '--file', temp_file,
                '--referer', referer
            ]
            
            print(f"🔍 [DEBUG] Comando: {' '.join(cmd)}")
            
            # Criar arquivo temporário para capturar output
            temp_output = project_root / 'web_interface' / 'logs' / f'output_{i}.log'
            temp_output.parent.mkdir(parents=True, exist_ok=True)
            
            # Executar capturando output em arquivo
            with open(temp_output, 'w', encoding='utf-8') as f:
                proc = subprocess.Popen(
                    cmd,
                    cwd=str(project_root),
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    text=True
                )
            processing_state['current_proc'] = proc
            
            # Atualizar step: Executando
            processing_state['current_step'] = f"⚙️ Processando {i}/{len(urls)} - Extraindo áudio..."
            print(f"🔍 [DEBUG] Processo iniciado, PID: {proc.pid}")
            
            # Monitorar o processo e atualizar steps baseado no output
            import time
            start_wait = time.time()
            while proc.poll() is None:
                # Verificar timeout
                if time.time() - start_wait > 1200:
                    print(f"❌ [DEBUG] Timeout!")
                    proc.kill()
                    proc.wait()
                    raise Exception('Timeout: processamento demorou mais de 10 minutos')
                
                # Tentar ler output parcial para detectar fase atual
                try:
                    with open(temp_output, 'r', encoding='utf-8') as f:
                        partial_output = f.read()
                    
                    # Detectar fase baseado no output
                    lower_output = partial_output.lower()
                    if 'whisper' in lower_output or 'transcrição' in lower_output or 'transcri' in lower_output:
                        processing_state['current_step'] = f"🎤 Transcrevendo áudio {i}/{len(urls)}..."
                    elif 'gemini' in lower_output or 'openrouter' in lower_output or 'resumo' in lower_output:
                        processing_state['current_step'] = f"🤖 Gerando resumo {i}/{len(urls)}..."
                    elif 'ffmpeg' in lower_output or 'download' in lower_output:
                        processing_state['current_step'] = f"📥 Baixando áudio {i}/{len(urls)}..."
                    elif 'relatório' in lower_output or 'html' in lower_output:
                        processing_state['current_step'] = f"📝 Gerando relatório {i}/{len(urls)}..."
                except:
                    pass
                
                time.sleep(2)  # Checar a cada 2 segundos
            
            print(f"🔍 [DEBUG] Processo finalizado, RC: {proc.returncode}")
            
            # Registrar logs em arquivo
            try:
                # Ler output do arquivo temporário
                output_text = ""
                try:
                    with open(temp_output, 'r', encoding='utf-8') as f:
                        output_text = f.read()
                except Exception:
                    output_text = "(não foi possível ler output)"
                
                with open(log_file, 'a', encoding='utf-8') as lf:
                    lf.write(f"\n{'='*80}\n")
                    lf.write(f"[{datetime.now().isoformat()}] URL={url} RC={proc.returncode}\n")
                    lf.write(f"COMANDO: {' '.join(cmd)}\n")
                    lf.write(f"\n--- OUTPUT ---\n{output_text[-2000:]}\n")  # Últimas 2000 chars
                    lf.write(f"{'='*80}\n")
            except Exception as e:
                print(f"⚠️ [DEBUG] Erro ao salvar log: {e}")
            
            if proc.returncode == 0:
                processing_state['current_step'] = f"✅ Vídeo {i}/{len(urls)} concluído!"
                print(f"✅ [DEBUG] Vídeo processado com sucesso!")
                socketio.emit('video_complete', {
                    'url': url,
                    'status': 'success',
                    'current': i,
                    'total': len(urls)
                })
            else:
                # Ler output para mostrar erro
                error_msg = f"Return code: {proc.returncode}"
                try:
                    with open(temp_output, 'r', encoding='utf-8') as f:
                        output_text = f.read()
                        # Pegar últimas linhas que geralmente contêm o erro
                        error_lines = output_text.split('\n')[-10:]
                        error_msg = '\n'.join(error_lines)
                except Exception:
                    pass
                print(f"❌ [DEBUG] Erro no processamento: {error_msg}")
                raise Exception(f"Erro no processamento: {error_msg}")
                
        except subprocess.TimeoutExpired:
            socketio.emit('video_error', {
                'url': url,
                'error': 'Timeout: processamento demorou mais de 10 minutos',
                'current': i,
                'total': len(urls)
            })
        except Exception as e:
            socketio.emit('video_error', {
                'url': url,
                'error': str(e),
                'current': i,
                'total': len(urls)
            })
    
    # Finalizar processamento
    processing_state.update({
        'is_processing': False,
        'status': 'completed',
        'current_video': len(urls)
    })
    
    socketio.emit('batch_complete', {
        'total': len(urls),
        'status': 'completed'
    })

@app.route('/api/cancel', methods=['POST'])
def cancel_processing():
    """Cancelar processamento em andamento"""
    global processing_state
    
    if not processing_state['is_processing']:
        return jsonify({'error': 'Nenhum processamento em andamento'}), 400
    
    # Tentar cancelar processo atual
    proc = processing_state.get('current_proc')
    if proc:
        try:
            proc.terminate()
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
        processing_state['current_proc'] = None
    processing_state['is_processing'] = False
    processing_state['status'] = 'cancelled'
    
    socketio.emit('batch_cancelled', {
        'message': 'Processamento cancelado pelo usuário'
    })
    
    return jsonify({'status': 'cancelled'})

@app.route('/api/health')
def health():
    project_root = Path(__file__).parent.parent
    sumarios_dir = project_root / Path(os.getenv('SUMARIOS_DIR', 'sumarios'))
    logs_dir = project_root / Path(os.getenv('LOG_DIR', 'logs'))
    return jsonify({
        'cwd': str(project_root),
        'sumarios_exists': sumarios_dir.exists(),
        'logs_exists': logs_dir.exists(),
        'is_processing': processing_state['is_processing'],
        'env': {
            'USE_OPENROUTER': os.getenv('USE_OPENROUTER'),
            'OPENROUTER_API_KEY_set': bool(os.getenv('OPENROUTER_API_KEY')),
            'REFERER': os.getenv('REFERER')
        }
    })

@app.route('/api/capture-manifest', methods=['POST', 'OPTIONS'])
def capture_manifest():
    """Receber manifests capturados pela extensão do navegador"""
    # CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
    
    try:
        data = request.json
        page_url = (data.get('pageUrl') or '').strip()
        manifest_url = (data.get('manifestUrl') or '').strip().replace('`','')
        if manifest_url and '?p=' in manifest_url and 'cloudflarestream.com' in manifest_url and '/manifest/video.m3u8' in manifest_url:
            from urllib.parse import urlparse, parse_qs
            pu = urlparse(manifest_url)
            qs = parse_qs(pu.query or '')
            token = (qs.get('p') or [''])[0].strip()
            if token and ('.' in token) and (len(token.split('.')) == 3):
                manifest_url = f"{pu.scheme}://{pu.netloc}/{token}/manifest/video.m3u8"
        domain = data.get('domain')
        timestamp = data.get('timestamp')
        
        if not page_url or not manifest_url:
            return jsonify({'error': 'Dados incompletos'}), 400
        
        # Salvar em arquivo de mapeamento
        manifests_file = PROJECT_ROOT / 'captured_manifests.json'
        
        # Carregar manifests existentes
        manifests = {}
        if manifests_file.exists():
            try:
                with open(manifests_file, 'r', encoding='utf-8') as f:
                    manifests = json.load(f)
            except:
                manifests = {}
        
        # Adicionar novo manifest
        manifests[page_url] = {
            'manifestUrl': manifest_url,
            'domain': domain,
            'timestamp': timestamp,
            'captured_at': datetime.now().isoformat()
        }
        
        # Salvar
        with open(manifests_file, 'w', encoding='utf-8') as f:
            json.dump(manifests, f, indent=2, ensure_ascii=False)
        
        print(f"✅ [Extension] Manifest capturado: {domain}")
        print(f"   Page: {page_url}")
        print(f"   Manifest: {manifest_url[:80]}...")
        
        # NOVO: Auto-processar se solicitado
        auto_process = data.get('autoProcess', False)
        if auto_process:
            print(f"🚀 [Extension] Iniciando processamento automático...")
            # Iniciar processamento em thread separada
            import threading
            import subprocess
            import tempfile
            def auto_process_video():
                try:
                    # Criar arquivo temporário com a URL
                    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
                        f.write(page_url + '\n')
                        temp_file = f.name
                    
                    # Usar batch_cli com --file para processamento COMPLETO
                    result = subprocess.run(
                        ['python', '-m', 'extrator_videos.batch_cli', '--file', temp_file],
                        cwd=str(project_root),
                        capture_output=True,
                        text=True,
                        timeout=600  # 10 minutos timeout
                    )
                    
                    # Limpar arquivo temporário
                    import os
                    os.unlink(temp_file)
                    
                    if result.returncode == 0:
                        print(f"✅ [Extension] Auto-processamento COMPLETO!")
                        print(f"   Verifique os relatórios em: sumarios/")
                    else:
                        print(f"❌ [Extension] Erro no processamento: {result.stderr[:300] if result.stderr else 'sem detalhes'}")
                except subprocess.TimeoutExpired:
                    print(f"⏰ [Extension] Timeout no processamento (10min)")
                except Exception as e:
                    print(f"❌ [Extension] Erro no auto-processamento: {e}")
            
            thread = threading.Thread(target=auto_process_video, daemon=True)
            thread.start()
        
        response = jsonify({
            'status': 'success',
            'message': 'Manifest salvo com sucesso',
            'autoProcessStarted': auto_process
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        print(f"❌ [Extension] Erro ao salvar manifest: {e}")
        response = jsonify({'error': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

@app.route('/api/manifests')
def list_manifests():
    """Listar todos os manifests capturados"""
    project_root = Path(__file__).parent.parent
    manifests_file = project_root / 'captured_manifests.json'
    
    if not manifests_file.exists():
        return jsonify([])
    
    try:
        with open(manifests_file, 'r', encoding='utf-8') as f:
            manifests = json.load(f)
        
        # Converter para lista
        result = []
        for page_url, data in manifests.items():
            result.append({
                'pageUrl': page_url,
                'manifestUrl': data['manifestUrl'],
                'domain': data.get('domain', ''),
                'timestamp': data.get('timestamp', ''),
                'captured_at': data.get('captured_at', '')
            })
        
        # Ordenar por data de captura (mais recente primeiro)
        result.sort(key=lambda x: x.get('captured_at', ''), reverse=True)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/process_targets', methods=['POST'])
def process_targets():
    if processing_state['is_processing']:
        return jsonify({'error': 'Processamento já em andamento'}), 400
    project_root = Path(__file__).parent.parent
    targets_file = project_root / 'targets.txt'
    if not targets_file.exists():
        return jsonify({'error': 'targets.txt não encontrado'}), 404
    with open(targets_file, 'r', encoding='utf-8') as f:
        urls = [ln.strip() for ln in f.readlines() if ln.strip().startswith('http')]
    if not urls:
        return jsonify({'error': 'Nenhuma URL válida no targets.txt'}), 400
    processing_state.update({
        'is_processing': True,
        'current_video': 0,
        'total_videos': len(urls),
        'status': 'processing',
        'start_time': datetime.now(),
        'logs': [],
        'current_proc': None
    })
    socketio.start_background_task(process_videos_batch, urls)
    return jsonify({'status': 'started', 'total': len(urls)})

@socketio.on('connect')
def handle_connect():
    """Cliente conectado via WebSocket"""
    emit('connected', {'status': 'ok', 'message': 'Conectado ao servidor'})

@socketio.on('disconnect')
def handle_disconnect():
    """Cliente desconectado"""
    print('Cliente desconectado')

@app.route('/api/convert-report-v2', methods=['POST'])
def convert_report_v2():
    """Converter um relatório existente para v2 (Solar Pop)"""
    data = request.json
    domain = data.get('domain')
    video_id = data.get('video_id')
    
    if not domain or not video_id:
        return jsonify({'error': 'Parâmetros inválidos'}), 400
        
    project_root = Path(__file__).parent.parent
    sumarios_dir = project_root / Path(os.getenv('SUMARIOS_DIR', 'sumarios'))
    video_dir = sumarios_dir / domain / video_id
    
    if not video_dir.exists():
        return jsonify({'error': 'Diretório do vídeo não encontrado'}), 404
        
    # Arquivos necessários
    json_path = video_dir / f'resumo_{video_id}.json'
    transcricao_path = video_dir / 'transcricao_completa.txt'
    
    if not json_path.exists():
        return jsonify({'error': 'JSON de dados não encontrado'}), 404
        
    try:
        # Carregar dados
        import json
        with open(json_path, 'r', encoding='utf-8') as f:
            report_data = json.load(f)
            
        transcricao = ""
        # Tentar transcrição completa
        if transcricao_path.exists():
            with open(transcricao_path, 'r', encoding='utf-8') as f:
                transcricao = f.read()
        # Fallback para transcrição simples se completa não existir ou estiver vazia
        if not transcricao:
            transcricao_simple = video_dir / 'transcricao.txt'
            if transcricao_simple.exists():
                with open(transcricao_simple, 'r', encoding='utf-8') as f:
                    transcricao = f.read()
                
        # Processar Data Original
        from datetime import datetime
        proc_date = report_data.get('data_processamento')
        date_str = None
        if proc_date:
            try:
                # Tentar parsing se for ISO
                dt = datetime.fromisoformat(proc_date)
                date_str = dt.strftime("%d/%m/%Y %H:%M")
            except:
                date_str = str(proc_date)

        # Reconstruir metadados mais completos e robustos
        meta = {
            "title": report_data.get('titulo_video') or report_data.get('titulo') or f"Video {video_id}",
            "url": report_data.get('url_video') or report_data.get('url') or "N/A",
            "dominio": domain,
            "id": video_id,
            "gerado_em": date_str # Se None, report_renderer usará a data atual
        }
        
        # Scrape Fallback para dados faltantes (URL, Modelo, Transcrição) se houver HTML v1
        if meta['url'] == "N/A" or not report_data.get('gemini_model') or not transcricao:
            try:
                render_dir = video_dir / 'render'
                if render_dir.exists():
                    html_files = list(render_dir.glob('*.html'))
                    # Filtrar v1 (sem _v2)
                    v1_files = [f for f in html_files if '_v2.html' not in f.name]
                    
                    if v1_files:
                        latest_v1 = max(v1_files, key=lambda x: x.stat().st_mtime)
                        with open(latest_v1, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        import re
                        
                        # Fallback URL
                        if meta['url'] == "N/A":
                            # Padrão V1 Moderno: <strong>URL:</strong> URL</div>
                            m = re.search(r'<strong>URL:</strong>\s*(.*?)</div>', content, re.IGNORECASE)
                            if m: 
                                meta['url'] = m.group(1).strip()
                            else:
                                # Tenta href se for link
                                m = re.search(r'URL.*?href=["\'](.*?)["\']', content, re.IGNORECASE)
                                if m: meta['url'] = m.group(1).strip()
                        
                        # Fallback Model
                        if not report_data.get('gemini_model'):
                            # Padrão V1 Moderno: <strong>Modelo:</strong> MODELO</div>
                            m = re.search(r'<strong>Modelo:</strong>\s*(.*?)</div>', content, re.IGNORECASE)
                            if m: 
                                report_data['gemini_model'] = m.group(1).strip()
                            
                        # Fallback Transcrição
                        if not transcricao:
                            # V1 usa "Transcrição" no título, e .collapsible-body para o conteúdo
                            if "Transcrição" in content:
                                try:
                                    # Pegar o bloco da transcrição
                                    # Divide para achar a última ocorrência (título da seção)
                                    parts = content.split('Transcrição')
                                    if len(parts) > 1:
                                        sub = parts[-1] # Conteúdo após o título
                                        # Procura a div do corpo (class="collapsible-body")
                                        m = re.search(r'class=["\']collapsible-body["\'][^>]*>(.*?)</div>', sub, re.DOTALL)
                                        if m:
                                            # Limpar HTML tags
                                            raw_html = m.group(1)
                                            # decodificar entities se precisar, ou strip tags
                                            clean_text = re.sub(r'<[^>]+>', '', raw_html).strip()
                                            transcricao = clean_text
                                            print(f"Transcrição recuperada via scraping ({len(transcricao)} chars)")
                                except Exception as e:
                                    print(f"Erro parseando transcrição HTML: {e}")
            except Exception as e:
                print(f"Erro no scraping fallback: {e}")
        
        # Correção JSON Vazio: Se raw não existir, cria um dump do report_data atual
        if not report_data.get('retorno_literal_gemini'):
            import json
            # Dump bonito para exibir na seção técnica
            report_data['retorno_literal_gemini'] = json.dumps(report_data, indent=2, ensure_ascii=False)
        
        # Garantir que o Modelo IA seja passado (já que está no report_data json, renderer deve pegá-lo de lá)
        # report_data é passado como 'data' para generate_full_report
        
        # Output V2
        output_dir = video_dir / 'render'
        output_dir.mkdir(exist_ok=True)
        # Manter nome original mas adicionar sufixo se quiser, ou sobrescrever?
        # User disse "cópia... para a versão 2". Vamos criar um arquivo novo.
        outfile = output_dir / f"{video_id}_v2.html"
        
        # Importar renderer
        from extrator_videos import report_renderer
        
        report_renderer.generate_full_report(
            data=report_data,
            transcription_text=transcricao,
            meta=meta,
            outfile_html=str(outfile),
            enable_pdf=False,
            version='v2'
        )
        
        return jsonify({
            'status': 'success',
            'html_path': f"/api/report/{domain}/{video_id}?version=v2"
        })
        
    except Exception as e:
        print(f"Erro na conversão v2: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Iniciando Video Processor Web Interface...")
    print("📍 Acesse: http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
