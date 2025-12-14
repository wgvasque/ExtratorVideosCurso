// Video Processor Pro - Frontend Logic
// WebSocket + API Integration

// Conectar ao WebSocket
const socket = io();

// Estado global
let startTime = null;
let timerInterval = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Video Processor Pro inicializado');
    refreshReports();
    setupEventListeners();
    setupWebSocket();
});

// Setup de event listeners
function setupEventListeners() {
    const urlsInput = document.getElementById('urls-input');
    urlsInput.addEventListener('input', updateURLCount);
}

// Setup WebSocket
function setupWebSocket() {
    socket.on('connected', (data) => {
        console.log('✅ Conectado ao servidor:', data);
        addLog('Conectado ao servidor');
    });

    socket.on('progress', (data) => {
        updateProgress(data);
        const eta = (data.eta_sec ?? 0);
        const elapsed = (data.elapsed_sec ?? 0);
        addLog(`Processando ${data.current}/${data.total}: ${data.url} | Elapsed ${elapsed}s | ETA ${eta}s`);
    });

    socket.on('video_complete', (data) => {
        addLog(`✅ Vídeo processado com sucesso: ${data.url}`, 'success');
        refreshReports();
        showToast('Vídeo concluído: ' + data.url, 'success');
    });

    socket.on('video_error', (data) => {
        addLog(`❌ Erro ao processar: ${data.url} - ${data.error}`, 'error');
        showToast('Erro: ' + data.error, 'error');
    });

    socket.on('batch_complete', (data) => {
        addLog(`🎉 Processamento concluído! Total: ${data.total} vídeos`, 'success');
        onProcessingComplete();
        showToast('Processamento concluído', 'success');
    });

    socket.on('batch_cancelled', (data) => {
        addLog(`⚠️ ${data.message}`, 'warning');
        onProcessingComplete();
    });
}

// Atualizar contagem de URLs
function updateURLCount() {
    const urls = getURLsFromInput();
    const count = urls.length;
    document.getElementById('url-count').textContent = `${count} URL${count !== 1 ? 's' : ''}`;
}

// Obter URLs do input
function getURLsFromInput() {
    const input = document.getElementById('urls-input').value;
    return input
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.startsWith('http'));
}

// Colar da área de transferência
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('urls-input').value = text;
        updateURLCount();
        addLog('URLs coladas da área de transferência');
    } catch (err) {
        alert('Erro ao colar: ' + err.message);
    }
}

// Limpar input
function clearInput() {
    document.getElementById('urls-input').value = '';
    updateURLCount();
    addLog('Input limpo');
}

// Carregar targets.txt
async function loadTargetsFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        document.getElementById('urls-input').value = text;
        updateURLCount();
        addLog(`Arquivo carregado: ${file.name}`);
    };

    input.click();
}

// Iniciar processamento
async function startProcessing() {
    console.log('🔍 [DEBUG] startProcessing() chamada');

    let urls = getURLsFromInput();
    console.log('🔍 [DEBUG] URLs obtidas:', urls);

    const modeEl = document.querySelector('input[name="mode"]:checked');
    const mode = modeEl ? modeEl.value : 'batch';
    console.log('🔍 [DEBUG] Modo selecionado:', mode);

    if (mode === 'single' && urls.length > 0) {
        urls = [urls[0]];
        console.log('🔍 [DEBUG] Modo single - usando apenas primeira URL');
    }

    if (urls.length === 0) {
        console.log('❌ [DEBUG] Nenhuma URL válida');
        alert('❌ Por favor, adicione pelo menos uma URL válida');
        return;
    }

    if (!confirm(`Processar ${urls.length} vídeo(s)?`)) {
        console.log('🔍 [DEBUG] Usuário cancelou confirmação');
        return;
    }

    console.log('🔍 [DEBUG] Enviando requisição para /api/process');

    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: urls })
        });

        console.log('🔍 [DEBUG] Resposta recebida:', response.status);

        const data = await response.json();
        console.log('🔍 [DEBUG] Dados da resposta:', data);

        if (response.ok) {
            console.log('✅ [DEBUG] Processamento iniciado com sucesso');
            onProcessingStarted(data.total);
            showToast(`Processamento iniciado (${data.total})`, 'success');
        } else {
            console.log('❌ [DEBUG] Erro na resposta:', data.error);
            showToast('Erro: ' + (data.error || 'Falha ao iniciar'), 'error');
        }
    } catch (error) {
        console.log('❌ [DEBUG] Exceção capturada:', error);
        showToast('Erro ao iniciar processamento: ' + error.message, 'error');
    }
}

// Cancelar processamento
async function cancelProcessing() {
    if (!confirm('Cancelar processamento em andamento?')) {
        return;
    }

    try {
        const response = await fetch('/api/cancel', { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            addLog('Processamento cancelado', 'warning');
        }
    } catch (error) {
        alert('Erro ao cancelar: ' + error.message);
    }
}

// Callback: processamento iniciado
function onProcessingStarted(total) {
    // Atualizar UI
    document.getElementById('btn-process').disabled = true;
    document.getElementById('btn-cancel').disabled = false;
    document.getElementById('urls-input').disabled = true;
    const spinner = document.getElementById('btn-process-spinner');
    if (spinner) spinner.classList.remove('hidden');
    document.getElementById('progress-card').classList.remove('hidden');
    document.getElementById('logs-card').classList.remove('hidden');
    document.getElementById('status-badge').textContent = '⚡ Processando...';
    document.getElementById('status-badge').classList.add('processing');

    // Iniciar timer
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);

    addLog(`🚀 Processamento iniciado: ${total} vídeo(s)`, 'success');
}

// Callback: processamento concluído
function onProcessingComplete() {
    // Parar timer
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // Atualizar UI
    document.getElementById('btn-process').disabled = false;
    document.getElementById('btn-cancel').disabled = true;
    document.getElementById('urls-input').disabled = false;
    const spinner = document.getElementById('btn-process-spinner');
    if (spinner) spinner.classList.add('hidden');
    document.getElementById('status-badge').textContent = '✅ Concluído';
    document.getElementById('status-badge').classList.remove('processing');

    // Atualizar relatórios
    setTimeout(refreshReports, 1000);
}

// Atualizar progresso
function updateProgress(data) {
    const percent = data.percent || 0;
    document.getElementById('progress-bar').style.width = `${percent}%`;
    document.getElementById('progress-text').textContent = `${data.current}/${data.total} vídeos`;
    document.getElementById('progress-percent').textContent = `${percent}%`;
    document.getElementById('current-url').textContent = data.url || '-';
    const elapsed = data.elapsed_sec ?? 0;
    const eta = data.eta_sec ?? 0;
    document.getElementById('elapsed-time').textContent = `${Math.floor(elapsed / 60)}m ${elapsed % 60}s (ETA ${Math.floor(eta / 60)}m ${eta % 60}s)`;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const colors = {
        info: 'bg-gray-900 text-white',
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        warning: 'bg-yellow-500 text-black'
    };
    const div = document.createElement('div');
    div.className = `${colors[type] || colors.info} px-4 py-2 rounded shadow-lg`;
    div.textContent = message;
    container.appendChild(div);
    setTimeout(() => {
        div.remove();
    }, 4000);
}

// Atualizar timer
function updateTimer() {
    if (!startTime) return;

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    document.getElementById('elapsed-time').textContent =
        `${minutes}m ${seconds}s`;
}

// Adicionar log
function addLog(message, type = 'info') {
    const logsList = document.getElementById('logs-list');
    const timestamp = new Date().toLocaleTimeString();

    const colors = {
        info: 'text-green-400',
        success: 'text-blue-400',
        error: 'text-red-400',
        warning: 'text-yellow-400'
    };

    const color = colors[type] || colors.info;

    const logEntry = document.createElement('div');
    logEntry.className = color;
    logEntry.textContent = `[${timestamp}] ${message}`;

    logsList.appendChild(logEntry);
    logsList.scrollTop = logsList.scrollHeight;
}

// Toggle logs
function toggleLogs() {
    const content = document.getElementById('logs-content');
    const toggle = document.getElementById('logs-toggle');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        toggle.textContent = '▲';
    } else {
        content.classList.add('hidden');
        toggle.textContent = '▼';
    }
}

// Atualizar lista de relatórios
async function refreshReports() {
    try {
        const response = await fetch('/api/reports');
        const reports = await response.json();

        const reportsList = document.getElementById('reports-list');

        if (reports.length === 0) {
            reportsList.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    Nenhum relatório gerado ainda
                </div>
            `;
            return;
        }

        reportsList.innerHTML = reports.map(report => `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                        <h3 class="font-semibold text-sm text-gray-800 line-clamp-2" title="${report.title}">
                            ${report.title}
                        </h3>
                        <p class="text-xs text-gray-500 mt-1">
                            📅 ${new Date(report.created_at).toLocaleString('pt-BR')}
                        </p>
                        <p class="text-xs text-gray-500">
                            🤖 ${report.model}
                        </p>
                    </div>
                </div>
                <div class="flex gap-2 mt-3">
                    <button 
                        onclick="viewReport('${report.html_url}', '${report.title}')"
                        class="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
                    >
                        👁️ Ver
                    </button>
                    <a 
                        href="${report.html_url}" 
                        download
                        class="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded transition-colors"
                    >
                        📥
                    </a>
                </div>
            </div>
        `).join('');

        addLog(`Relatórios atualizados: ${reports.length} encontrado(s)`);
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        addLog('Erro ao carregar relatórios', 'error');
    }
}

// Visualizar relatório
function viewReport(url, title) {
    const modal = document.getElementById('report-modal');
    const iframe = document.getElementById('report-iframe');
    const modalTitle = document.getElementById('modal-title');

    modalTitle.textContent = title;
    iframe.src = url;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Fechar modal
function closeModal(event) {
    if (event && event.target !== event.currentTarget) return;

    const modal = document.getElementById('report-modal');
    const iframe = document.getElementById('report-iframe');

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    iframe.src = '';
}

// Atalhos de teclado
document.addEventListener('keydown', (e) => {
    // ESC para fechar modal
    if (e.key === 'Escape') {
        closeModal();
    }

    // Ctrl+Enter para processar
    if (e.ctrlKey && e.key === 'Enter') {
        startProcessing();
    }
});
