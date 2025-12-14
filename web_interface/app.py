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
from flask import Flask, render_template, request, jsonify, send_file
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv

# Adicionar diretório pai ao path para importar módulos
sys.path.insert(0, str(Path(__file__).parent.parent))

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'video-processor-secret-key-2024'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Estado global do processamento
processing_state = {
    'is_processing': False,
    'current_video': 0,
    'total_videos': 0,
    'current_url': '',
    'current_title': '',
    'status': 'idle',
    'start_time': None,
    'logs': [],
    'current_proc': None
}

@app.route('/')
def index():
    """Página principal"""
    return render_template('index.html')

@app.route('/api/process', methods=['POST'])
def start_processing():
    """Iniciar processamento de vídeos"""
    global processing_state
    
    if processing_state['is_processing']:
        return jsonify({'error': 'Processamento já em andamento'}), 400
    
    data = request.json
    urls = data.get('urls', [])
    
    if not urls:
        return jsonify({'error': 'Nenhuma URL fornecida'}), 400
    
    # Validar URLs
    valid_urls = [url.strip() for url in urls if url.strip().startswith('http')]
    
    if not valid_urls:
        return jsonify({'error': 'Nenhuma URL válida'}), 400
    
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
        'total': len(valid_urls)
    })

@app.route('/api/status')
def get_status():
    """Obter status atual do processamento"""
    safe = dict(processing_state)
    if 'current_proc' in safe:
        safe['has_current_proc'] = bool(safe['current_proc'])
        del safe['current_proc']
    return jsonify(safe)

@app.route('/api/reports')
def list_reports():
    """Listar todos os relatórios gerados"""
    project_root = Path(__file__).parent.parent
    sumarios_dir = project_root / Path(os.getenv('SUMARIOS_DIR', 'sumarios'))
    reports = []
    
    if not sumarios_dir.exists():
        return jsonify([])
    
    # Buscar todos os HTMLs gerados
    for html_file in sumarios_dir.rglob('render/*.html'):
        try:
            # Extrair informações do caminho
            parts = html_file.parts
            domain_idx = parts.index('sumarios') + 1
            domain = parts[domain_idx] if domain_idx < len(parts) else 'unknown'
            video_id = parts[domain_idx + 1] if domain_idx + 1 < len(parts) else 'unknown'
            
            # Ler JSON correspondente
            json_file = html_file.parent.parent / f'resumo_{video_id}.json'
            title = html_file.stem
            model = 'N/A'
            origin = 'N/A'
            
            if json_file.exists():
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    model = data.get('gemini_model', 'N/A')
                    origin = data.get('origin', 'N/A')
            
            reports.append({
                'id': video_id,
                'title': title,
                'domain': domain,
                'html_path': str(html_file.relative_to(sumarios_dir)),
                'html_url': f'/api/report/{domain}/{video_id}',
                'created_at': datetime.fromtimestamp(html_file.stat().st_mtime).isoformat(),
                'model': model,
                'origin': origin
            })
        except Exception as e:
            print(f"Erro ao processar {html_file}: {e}")
            continue
    
    # Ordenar por data (mais recente primeiro)
    reports.sort(key=lambda x: x['created_at'], reverse=True)
    
    return jsonify(reports)

@app.route('/api/report/<domain>/<video_id>')
def get_report(domain, video_id):
    """Obter HTML de um relatório específico"""
    project_root = Path(__file__).parent.parent
    sumarios_dir = project_root / Path(os.getenv('SUMARIOS_DIR', 'sumarios'))
    render_dir = sumarios_dir / domain / video_id / 'render'
    
    if not render_dir.exists():
        return jsonify({'error': 'Relatório não encontrado'}), 404
    
    # Pegar o HTML mais recente
    html_files = list(render_dir.glob('*.html'))
    if not html_files:
        return jsonify({'error': 'HTML não encontrado'}), 404
    
    latest_html = max(html_files, key=lambda x: x.stat().st_mtime)
    
    return send_file(latest_html, mimetype='text/html')

def process_videos_batch(urls):
    """Processar lista de URLs em batch"""
    global processing_state
    
    referer = os.getenv('REFERER', '')
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
            
            print(f"🔍 [DEBUG] Processando vídeo {i}/{len(urls)}: {url}")
            print(f"🔍 [DEBUG] Referer: {referer}")
            
            # Criar arquivo temporário com URL para batch_cli
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
                f.write(url + '\n')
                temp_file = f.name
            
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
            
            print(f"🔍 [DEBUG] Processo iniciado, PID: {proc.pid}")
            
            try:
                proc.wait(timeout=600)
                print(f"🔍 [DEBUG] Processo finalizado, RC: {proc.returncode}")
            except subprocess.TimeoutExpired:
                print(f"❌ [DEBUG] Timeout!")
                proc.kill()
                proc.wait()
                raise Exception('Timeout: processamento demorou mais de 10 minutos')
            
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

if __name__ == '__main__':
    print("🚀 Iniciando Video Processor Web Interface...")
    print("📍 Acesse: http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
