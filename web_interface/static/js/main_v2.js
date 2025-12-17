// Video Processor Pro - Frontend Logic (Versão Melhorada v2)
// WebSocket + API Integration com melhorias de UX/UI

// Conectar ao WebSocket
const socket = io();

// Estado global
let startTime = null;
let timerInterval = null;
let validationTimeout = null;
let currentStep = null;

// Constantes
const AVG_TIME_PER_VIDEO = 5 * 60; // 5 minutos por vídeo em segundos
const TOAST_DURATION = 4000;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Video Processor Pro v2 inicializado');
    loadAvailablePrompts(); // Carregar prompts disponíveis
    refreshReports();
    setupEventListeners();
    setupWebSocket();

    // Mostrar modal "O que há de novo" na primeira visita
    showWhatsNewIfFirstVisit();
});

// ===== GERENCIAMENTO DE PROMPTS =====
let availablePrompts = [];
let selectedPrompt = null;

async function loadAvailablePrompts() {
    try {
        const response = await fetch('/prompts');
        const data = await response.json();

        availablePrompts = data.prompts;
        populatePromptSelector();

        // Restaurar seleção do localStorage
        const savedPrompt = localStorage.getItem('selectedPrompt');
        if (savedPrompt) {
            const selector = document.getElementById('prompt-model-select');
            if (selector) {
                selector.value = savedPrompt;
                await updatePromptInfo(savedPrompt);
            }
        } else if (availablePrompts.length > 0) {
            // Selecionar primeiro prompt válido por padrão
            const firstValid = availablePrompts.find(p => p.valid);
            if (firstValid) {
                document.getElementById('prompt-model-select').value = firstValid.name;
                await updatePromptInfo(firstValid.name);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar prompts:', error);
        showToast('Erro ao carregar modelos de prompt', 'error');
    }
}

function populatePromptSelector() {
    const selector = document.getElementById('prompt-model-select');
    if (!selector) return;

    selector.innerHTML = '';

    if (availablePrompts.length === 0) {
        selector.innerHTML = '<option value="">❌ Nenhum prompt disponível</option>';
        return;
    }

    availablePrompts.forEach(prompt => {
        const option = document.createElement('option');
        option.value = prompt.name;

        // Ícone de status
        const icon = prompt.valid ? '✅' : '❌';
        const sections = `(${prompt.sections}/14)`;

        option.textContent = `${icon} ${prompt.name} ${sections}`;
        option.disabled = !prompt.valid;

        selector.appendChild(option);
    });

    // Event listener para mudança de seleção
    selector.addEventListener('change', async (e) => {
        const promptName = e.target.value;
        await updatePromptInfo(promptName);
        localStorage.setItem('selectedPrompt', promptName);
    });
}

async function updatePromptInfo(promptName) {
    selectedPrompt = promptName;

    const prompt = availablePrompts.find(p => p.name === promptName);
    if (!prompt) return;

    // Atualizar ícone de status
    const statusIcon = document.getElementById('prompt-status-icon');
    if (statusIcon) {
        if (prompt.valid) {
            statusIcon.textContent = '✅';
            statusIcon.title = `Válido - ${prompt.sections}/14 seções`;
        } else {
            statusIcon.textContent = '❌';
            statusIcon.title = 'Prompt inválido - faltam seções obrigatórias';
        }
    }

    // Carregar detalhes completos
    try {
        const response = await fetch(`/prompts/${encodeURIComponent(promptName)}`);
        const details = await response.json();

        // Atualizar descrição
        const descEl = document.getElementById('prompt-description');
        if (descEl && details.metadata) {
            descEl.innerHTML = `<strong>${details.metadata.name}</strong><br>${details.metadata.description}`;
        }

        // Atualizar detalhes de validação
        const validationEl = document.getElementById('prompt-validation-details');
        if (validationEl && details.validation) {
            let html = '';
            if (!details.validation.valid) {
                html += '<div class="text-red-600 font-bold">⚠️ Prompt Inválido</div>';
                if (details.validation.missing_sections && details.validation.missing_sections.length > 0) {
                    html += `<div class="mt-1">Faltam ${details.validation.missing_sections.length} seções:</div>`;
                    html += '<ul class="list-disc list-inside">';
                    details.validation.missing_sections.slice(0, 3).forEach(section => {
                        html += `<li>${section}</li>`;
                    });
                    if (details.validation.missing_sections.length > 3) {
                        html += `<li>... e mais ${details.validation.missing_sections.length - 3}</li>`;
                    }
                    html += '</ul>';
                }
            } else {
                html += '<div class="text-green-600 font-bold">✅ Prompt Válido</div>';
                if (details.validation.warnings && details.validation.warnings.length > 0) {
                    html += `<div class="mt-1 text-yellow-600">${details.validation.warnings.length} avisos</div>`;
                }
            }
            validationEl.innerHTML = html;
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes do prompt:', error);
    }
}

function showPromptInfo() {
    const infoDiv = document.getElementById('prompt-info');
    if (infoDiv) {
        infoDiv.classList.toggle('hidden');
    }
}


// Setup de event listeners
function setupEventListeners() {
    const urlsInput = document.getElementById('urls-input');

    // Validação em tempo real
    urlsInput.addEventListener('input', () => {
        updateURLCount();
        validateURLs();
    });

    // Enter para adicionar linha (não processar)
    urlsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey) {
            // Permitir Enter normal (nova linha)
            return;
        }
    });

    // Busca de relatórios
    const searchInput = document.getElementById('search-reports');
    if (searchInput) {
        searchInput.addEventListener('input', filterReports);
    }

    // Upload de Arquivo (Restaurado)
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
        fileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                const content = e.target.result;
                const urlsInput = document.getElementById('urls-input');
                if (urlsInput.value.trim() !== '') {
                    urlsInput.value += '\n' + content;
                } else {
                    urlsInput.value = content;
                }
                updateURLCount();
                validateURLs(); // Trigger validation
                showToast('Arquivo carregado com sucesso!', 'success');
            };
            reader.readAsText(file);
            // Reset input so same file can be selected again
            this.value = '';
        });
    }
}

// Setup WebSocket
function setupWebSocket() {
    socket.on('connected', (data) => {
        console.log('✅ Conectado ao servidor:', data);
        addLog('Conectado ao servidor', 'success');
    });

    socket.on('progress', (data) => {
        updateProgress(data);
        updateStepIndicator(data.step || 'extraction');
        const eta = (data.eta_sec ?? 0);
        const elapsed = (data.elapsed_sec ?? 0);
        addLog(`Processando ${data.current}/${data.total}: ${data.url} | ${elapsed}s | ETA ${eta}s`);
    });

    socket.on('video_complete', (data) => {
        addLog(`✅ Vídeo processado: ${data.url}`, 'success');
        updateStepIndicator('report');
        refreshReports();
        showToast('Vídeo concluído: ' + data.url, 'success');
    });

    socket.on('video_error', (data) => {
        addLog(`❌ Erro: ${data.url} - ${data.error}`, 'error');
        showToast('Erro: ' + data.error, 'error');
    });

    socket.on('batch_complete', (data) => {
        addLog(`🎉 Processamento concluído! Total: ${data.total} vídeos`, 'success');
        onProcessingComplete();
        showToast(`Processamento concluído: ${data.total} vídeo(s)`, 'success');
    });

    socket.on('batch_cancelled', (data) => {
        addLog(`⚠️ ${data.message}`, 'warning');
        onProcessingComplete();
        showToast('Processamento cancelado', 'warning');
    });

    // Eventos de etapa (se implementados no backend)
    socket.on('step_update', (data) => {
        updateStepIndicator(data.step);
        addLog(`📌 Etapa: ${data.step} - ${data.message || ''}`, 'info');
    });
}

// Validação de URLs em tempo real
function validateURLs() {
    clearTimeout(validationTimeout);

    validationTimeout = setTimeout(() => {
        const urls = getURLsFromInput();
        const validationResults = urls.map(url => ({
            url,
            valid: isValidURL(url)
        }));

        const invalidUrls = validationResults.filter(r => !r.valid);
        const validCount = validationResults.length - invalidUrls.length;

        updateValidationUI(invalidUrls, validCount, urls.length);
    }, 300); // Debounce de 300ms
}

// Validar se URL é válida
function isValidURL(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Atualizar UI de validação
function updateValidationUI(invalidUrls, validCount, total) {
    const input = document.getElementById('urls-input');
    const badge = document.getElementById('url-validation-badge');
    const messages = document.getElementById('validation-messages');
    const counter = document.getElementById('validation-counter');
    const counterIcon = document.getElementById('validation-icon');
    const counterText = document.getElementById('validation-count');

    // Limpar estados anteriores
    input.classList.remove('url-valid', 'url-invalid');
    badge.classList.add('hidden');
    messages.classList.add('hidden');
    messages.innerHTML = '';

    if (total === 0) {
        counter.classList.add('hidden');
        return; // Campo vazio, não mostrar validação
    }

    // Mostrar contador proeminente
    counter.classList.remove('hidden');
    counterText.textContent = `${validCount}/${total}`;

    if (invalidUrls.length > 0) {
        input.classList.add('url-invalid');
        counterIcon.textContent = '⚠️';
        counterText.className = 'text-2xl font-bold text-red-600';

        badge.classList.remove('hidden');
        badge.textContent = `⚠️ ${invalidUrls.length} inválida(s)`;
        badge.className = 'text-xs px-2 py-1 rounded bg-red-100 text-red-700';

        messages.classList.remove('hidden');
        invalidUrls.forEach(({ url }) => {
            const div = document.createElement('div');
            div.className = 'text-sm text-red-600 flex items-center gap-2';
            div.innerHTML = `❌ <span class="font-mono text-xs">${url.substring(0, 50)}${url.length > 50 ? '...' : ''}</span>`;
            messages.appendChild(div);
        });
    } else {
        input.classList.add('url-valid');
        counterIcon.textContent = '✅';
        counterText.className = 'text-2xl font-bold text-green-600';

        badge.classList.remove('hidden');
        badge.textContent = `✅ ${validCount} válida(s)`;
        badge.className = 'text-xs px-2 py-1 rounded bg-green-100 text-green-700';
    }
}

// Atualizar contagem de URLs
function updateURLCount() {
    const urls = getURLsFromInput();
    const count = urls.length;
    const countEl = document.getElementById('url-count');
    countEl.textContent = `${count} URL${count !== 1 ? 's' : ''}`;
    countEl.setAttribute('aria-label', `${count} URL${count !== 1 ? 's' : ''} válida${count !== 1 ? 's' : ''}`);
}

// Obter URLs do input
function getURLsFromInput() {
    const input = document.getElementById('urls-input').value;
    return input
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.startsWith('http'));
}

// Atualizar indicador de etapas
function updateStepIndicator(step) {
    const steps = ['extraction', 'transcription', 'summary', 'report'];
    const stepIndex = steps.indexOf(step);

    if (stepIndex === -1) return;

    const indicator = document.getElementById('steps-indicator');
    indicator?.classList.remove('hidden');

    steps.forEach((s, index) => {
        const stepEl = document.getElementById(`step-${s}`);
        if (!stepEl) return;

        if (index <= stepIndex) {
            stepEl.className = 'w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold';
        } else {
            stepEl.className = 'w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold';
        }
    });

    currentStep = step;
}

// Colar da área de transferência
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        const input = document.getElementById('urls-input');
        input.value = text;
        updateURLCount();
        validateURLs();
        addLog('URLs coladas da área de transferência', 'success');
        showToast('URLs coladas com sucesso', 'success');
    } catch (err) {
        showToast('Erro ao colar: ' + err.message, 'error');
        console.error('Erro ao colar:', err);
    }
}

// Limpar input
function clearInput() {
    const input = document.getElementById('urls-input');
    input.value = '';
    input.classList.remove('url-valid', 'url-invalid');
    document.getElementById('validation-messages').classList.add('hidden');
    document.getElementById('url-validation-badge').classList.add('hidden');
    updateURLCount();
    addLog('Input limpo', 'info');
}

// Carregar targets.txt
async function loadTargetsFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.style.display = 'none';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            document.getElementById('urls-input').value = text;
            updateURLCount();
            validateURLs();
            addLog(`Arquivo carregado: ${file.name}`, 'success');
            showToast(`Arquivo ${file.name} carregado`, 'success');
        } catch (error) {
            showToast('Erro ao carregar arquivo: ' + error.message, 'error');
        }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
}

// Estimar tempo total
function estimateTime(urlCount) {
    const totalSeconds = urlCount * AVG_TIME_PER_VIDEO;
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
}

// Iniciar processamento
async function startProcessing() {
    console.log('🔍 [DEBUG] startProcessing() chamada');

    let urls = getURLsFromInput();

    // Validar URLs
    const invalidUrls = urls.filter(url => !isValidURL(url));
    if (invalidUrls.length > 0) {
        showToast(`Por favor, corrija ${invalidUrls.length} URL(s) inválida(s)`, 'error');
        validateURLs(); // Mostrar erros
        return;
    }

    if (urls.length === 0) {
        showToast('Por favor, adicione pelo menos uma URL válida', 'error');
        return;
    }

    const modeEl = document.querySelector('input[name="mode"]:checked');
    const mode = modeEl ? modeEl.value : 'batch';

    if (mode === 'single' && urls.length > 0) {
        urls = [urls[0]];
    }

    // Capturar modelo de prompt selecionado
    const promptModelSelect = document.getElementById('prompt-model-select');
    const promptModel = promptModelSelect ? promptModelSelect.value : 'modelo2';

    // Mostrar confirmação elegante
    const estimatedTime = estimateTime(urls.length);
    const modelName = promptModel === 'modelo4' ? 'Modelo 4 (Híbrido)' : 'Modelo 2 (Padrão)';
    const confirmed = await showConfirmDialog(
        `Processar ${urls.length} vídeo(s)?`,
        `Tempo estimado: ${estimatedTime}\nModelo: ${modelName}`
    );

    if (!confirmed) {
        return;
    }

    console.log('🔍 [DEBUG] Enviando requisição para /api/process');
    console.log('🔍 [DEBUG] Modelo selecionado:', promptModel);

    try {
        const response = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                urls: urls,
                promptModel: promptModel  // Enviar modelo selecionado
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ [DEBUG] Processamento iniciado com sucesso');
            onProcessingStarted(data.total);
            showToast(`Processamento iniciado: ${data.total} vídeo(s) com ${modelName}`, 'success');
        } else {
            showToast('Erro: ' + (data.error || 'Falha ao iniciar'), 'error');
        }
    } catch (error) {
        console.error('❌ [DEBUG] Exceção capturada:', error);
        showToast('Erro ao iniciar processamento: ' + error.message, 'error');
    }
}

// Mostrar informações sobre os modelos
function showModelInfo() {
    const modal = document.getElementById('model-info-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

// Fechar modal de informações
function closeModelInfo() {
    const modal = document.getElementById('model-info-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Dialog de confirmação customizado
function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
        dialog.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-11/12">
                <h3 class="text-lg font-bold mb-2">${title}</h3>
                <p class="text-gray-600 mb-4">${message}</p>
                <div class="flex gap-3 justify-end">
                    <button class="confirm-btn px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button class="confirm-btn px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                        Confirmar
                    </button>
                </div>
            </div>
        `;

        const buttons = dialog.querySelectorAll('.confirm-btn');
        buttons[0].onclick = () => {
            document.body.removeChild(dialog);
            resolve(false);
        };
        buttons[1].onclick = () => {
            document.body.removeChild(dialog);
            resolve(true);
        };

        document.body.appendChild(dialog);
    });
}

// Cancelar processamento
async function cancelProcessing() {
    const confirmed = await showConfirmDialog(
        'Cancelar processamento?',
        'O processamento em andamento será interrompido.'
    );

    if (!confirmed) return;

    try {
        const response = await fetch('/api/cancel', { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            addLog('Processamento cancelado', 'warning');
            showToast('Processamento cancelado', 'warning');
        }
    } catch (error) {
        showToast('Erro ao cancelar: ' + error.message, 'error');
    }
}

// Callback: processamento iniciado
function onProcessingStarted(total) {
    // Atualizar UI
    document.getElementById('btn-process').disabled = true;
    document.getElementById('btn-cancel').disabled = false;
    document.getElementById('urls-input').disabled = true;

    // Hide Input Zone for Focus Mode
    const inputZone = document.getElementById('input-zone');
    if (inputZone) {
        inputZone.classList.add('hidden');
    }

    const spinner = document.getElementById('btn-process-spinner');
    if (spinner) spinner.classList.remove('hidden');

    document.getElementById('progress-card').classList.remove('hidden');

    // Logs card optional visibility handled by toggle, but ensure container is ready
    document.getElementById('logs-card').classList.remove('hidden');

    // Reset steps
    updateStepIndicator('extraction');

    const statusBadge = document.getElementById('status-badge');
    statusBadge.innerHTML = '<span class="w-3 h-3 border border-ink rounded-full bg-sun animate-spin"></span> TRABALHANDO';
    statusBadge.className = 'px-3 py-1 bg-accent border-2 border-ink rounded-full text-xs font-black text-white shadow-retro flex items-center gap-2';

    // Mostrar ETA inicial
    const estimatedTime = estimateTime(total);
    const etaContainer = document.getElementById('eta-container');
    if (etaContainer) {
        etaContainer.classList.remove('hidden');
        document.getElementById('eta-time').textContent = estimatedTime;
    }

    // Iniciar timer
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);

    addLog(`🚀 INICIADO: ${total} vids | ${estimatedTime}`, 'success');
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

    // Show Input Zone again
    const inputZone = document.getElementById('input-zone');
    if (inputZone) {
        inputZone.classList.remove('hidden');
        inputZone.classList.add('animate-enter'); // Re-animate entry
    }

    // Hide Progress Card
    document.getElementById('progress-card').classList.add('hidden');

    const spinner = document.getElementById('btn-process-spinner');
    if (spinner) spinner.classList.add('hidden');

    const statusBadge = document.getElementById('status-badge');
    statusBadge.innerHTML = '<span class="w-3 h-3 border border-ink rounded-full bg-pop"></span> PRONTO';
    statusBadge.className = 'px-3 py-1 bg-white border-2 border-ink rounded-full text-xs font-black text-ink shadow-retro flex items-center gap-2';

    // Output logs can stay visible if user toggled them, but card might be hidden by parent section

    // Atualizar relatórios
    setTimeout(refreshReports, 1000);
}

// Atualizar progresso
function updateProgress(data) {
    const percent = data.percent || 0;
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progressPercent = document.getElementById('progress-percent');
    const currentUrl = document.getElementById('current-url');

    progressBar.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', percent);
    progressText.textContent = `${data.current}/${data.total} vídeos`;
    progressPercent.textContent = `${percent}%`;
    currentUrl.textContent = data.url || '-';

    const elapsed = data.elapsed_sec ?? 0;
    const eta = data.eta_sec ?? 0;

    document.getElementById('elapsed-time').textContent = formatTime(elapsed);

    if (eta > 0) {
        const etaEl = document.getElementById('eta-time');
        if (etaEl) {
            etaEl.textContent = formatTime(eta);
        }
    }
}

// Formatar tempo
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
}

// Toast Retro Pop
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Mapping for Retro Aesthetic
    const styles = {
        info: 'bg-white border-ink text-ink',
        success: 'bg-pop border-ink text-ink',
        error: 'bg-accent border-ink text-white',
        warning: 'bg-sun border-ink text-ink'
    };

    const icons = {
        info: 'ℹ️',
        success: '✨',
        error: '💣',
        warning: '⚡'
    };

    const div = document.createElement('div');
    // Using hard shadows and borders
    div.className = `${styles[type] || styles.info} px-4 py-3 rounded-lg shadow-retro border-2 flex items-center gap-3 min-w-[300px] animate-enter transform transition-all`;
    div.setAttribute('role', 'alert');

    div.innerHTML = `
        <span class="text-xl border-2 border-ink bg-white p-1 rounded shadow-sm">${icons[type] || icons.info}</span>
        <span class="text-sm font-black font-display uppercase tracking-wide">${message}</span>
    `;

    container.appendChild(div);

    // Auto-dismiss
    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transform = 'translateY(10px) rotate(5deg)';
        setTimeout(() => div.remove(), 300);
    }, TOAST_DURATION);
}

// Atualizar timer
function updateTimer() {
    if (!startTime) return;

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('elapsed-time').textContent = formatTime(elapsed);
}

// Adicionar log
function addLog(message, type = 'info') {
    const logsList = document.getElementById('logs-list');
    if (!logsList) return;

    const timestamp = new Date().toLocaleTimeString('pt-BR');

    const colors = {
        info: 'text-green-400',
        success: 'text-blue-400',
        error: 'text-red-400',
        warning: 'text-yellow-400'
    };

    const color = colors[type] || colors.info;

    const logEntry = document.createElement('div');
    logEntry.className = `${color} mb-1`;
    logEntry.textContent = `[${timestamp}] ${message}`;

    logsList.appendChild(logEntry);
    logsList.scrollTop = logsList.scrollHeight;
}

// Limpar logs
function clearLogs() {
    const logsList = document.getElementById('logs-list');
    if (logsList) {
        logsList.innerHTML = '';
        addLog('Logs limpos', 'info');
    }
}

// Toggle logs
function toggleLogs() {
    const content = document.getElementById('logs-content');
    const toggle = document.getElementById('logs-toggle');
    const toggleBtn = document.getElementById('logs-toggle-btn');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        toggle.textContent = '▲';
        toggleBtn.setAttribute('aria-expanded', 'true');
    } else {
        content.classList.add('hidden');
        toggle.textContent = '▼';
        toggleBtn.setAttribute('aria-expanded', 'false');
    }
}

// Filtrar relatórios
function filterReports() {
    const searchTerm = document.getElementById('search-reports').value.toLowerCase();
    const reports = document.querySelectorAll('#reports-list > div');

    reports.forEach(report => {
        const title = report.querySelector('h3')?.textContent.toLowerCase() || '';
        if (title.includes(searchTerm)) {
            report.style.display = '';
        } else {
            report.style.display = 'none';
        }
    });
}

// Atualizar lista de relatórios (com skeleton loading)
async function refreshReports() {
    const reportsList = document.getElementById('reports-list');
    const loadingEl = document.getElementById('reports-loading');

    // Mostrar skeleton
    if (loadingEl) {
        loadingEl.classList.remove('hidden');
    }

    try {
        const response = await fetch('/api/reports');
        const reports = await response.json();

        // Ocultar skeleton
        if (loadingEl) {
            loadingEl.classList.add('hidden');
        }

        if (reports.length === 0) {
            reportsList.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <p class="text-sm">Nenhum relatório gerado ainda</p>
                    <p class="text-xs mt-2">Processe vídeos para gerar relatórios</p>
                </div>
            `;
            return;
        }

        reportsList.innerHTML = reports.map(report => `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow" role="listitem">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-sm text-gray-800 line-clamp-2 truncate" title="${report.title}">
                            ${report.title}
                        </h3>
                        <p class="text-xs text-gray-500 mt-1">
                            📅 ${new Date(report.created_at).toLocaleString('pt-BR')}
                        </p>
                        <p class="text-xs text-gray-500">
                            🤖 ${report.model || 'N/A'}
                        </p>
                    </div>
                </div>
                <div class="flex gap-2 mt-3">
                    <button 
                        onclick="viewReport('${report.report_url}', '${report.title.replace(/'/g, "\\'")}')"
                        aria-label="Visualizar relatório ${report.title}"
                        class="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors focus:ring-2 focus:ring-indigo-500 border-2 border-transparent hover:border-ink hover:shadow-retro font-bold uppercase tracking-wider">
                        👁️ Ver
                    </button>
                    ${report.has_html_v1 && !report.has_html_v2 ? `
                    <button 
                        onclick="convertToV2('${report.domain}', '${report.id}')"
                        title="Gerar Versão Solar Pop v2"
                        class="px-3 py-1.5 bg-pop text-ink text-xs rounded border-2 border-transparent hover:border-ink hover:shadow-retro transition-all font-bold uppercase flex items-center gap-1">
                        ✨ v2
                    </button>
                    ` : ''}
                    <a 
                        href="${report.data_url}" 
                        download="${report.id}.json"
                        aria-label="Download JSON do relatório ${report.title}"
                        class="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded transition-colors focus:ring-2 focus:ring-indigo-500 border-2 border-transparent hover:border-ink hover:shadow-retro"
                        title="Download JSON">
                        📥
                    </a>
                </div>
            </div>
        `).join('');


        addLog(`Relatórios atualizados: ${reports.length} encontrado(s)`, 'success');
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        if (loadingEl) {
            loadingEl.classList.add('hidden');
        }
        reportsList.innerHTML = `
            <div class="text-center text-red-400 py-8">
                <p class="text-sm">Erro ao carregar relatórios</p>
                <button onclick="refreshReports()" class="text-xs text-indigo-600 hover:underline mt-2">
                    Tentar novamente
                </button>
            </div>
        `;
        addLog('Erro ao carregar relatórios', 'error');
    }
}

// Converter para v2
async function convertToV2(domain, videoId) {
    try {
        showToast('Gerando versão Solar Pop v2...', 'info');

        const response = await fetch('/api/convert-report-v2', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ domain, video_id: videoId })
        });

        const result = await response.json();

        if (response.ok) {
            showToast('Relatório v2 gerado com sucesso!', 'success');
            // Abrir direto
            viewReport(result.html_path, `[v2] Relatório`);
        } else {
            showToast(`Erro: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Erro na conversão:', error);
        showToast('Erro ao conectar com servidor', 'error');
    }
}

// Visualizar relatório (com renderização dinâmica)
let currentReportBaseUrl = '';
let currentReportTitle = '';
let currentReportData = null; // Cache dos dados JSON

async function viewReport(url, title) {
    const modal = document.getElementById('report-modal');
    currentReportTitle = title;

    // Determinar base URL e initial version
    const urlObj = new URL(url, window.location.origin);
    const versionParam = urlObj.searchParams.get('version');

    currentReportBaseUrl = urlObj.pathname; // /api/report/domain/id

    // Carregar dados JSON para renderização dinâmica
    const dataUrl = currentReportBaseUrl.replace('/api/report/', '/api/report-data/');

    try {
        const response = await fetch(dataUrl);
        if (response.ok) {
            currentReportData = await response.json();
            console.log('Dados do relatório carregados:', currentReportData);
        } else {
            console.warn('Não foi possível carregar dados JSON, usando HTML estático');
            currentReportData = null;
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        currentReportData = null;
    }

    // Load v2 template (v1 discontinued)
    loadReportV2();

    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) modalTitle.textContent = title;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function loadReportV2() {
    const iframe = document.getElementById('report-iframe');

    // Renderizar dinamicamente se dados disponíveis
    if (currentReportData) {
        console.log('Renderizando relatório v2 dinamicamente');
        const html = templateV2SolarPop(currentReportData);

        // Usar srcdoc para renderizar HTML diretamente
        iframe.srcdoc = html;
        iframe.src = ''; // Limpar src
    } else {
        // Fallback: usar HTML estático v2
        console.log('Usando HTML estático v2');
        iframe.srcdoc = ''; // Limpar srcdoc
        iframe.src = `${currentReportBaseUrl}?version=v2`;
    }
}


// Fechar modal
function closeModal(event) {
    if (event && event.target !== event.currentTarget) return;

    const modal = document.getElementById('report-modal');
    const iframe = document.getElementById('report-iframe');

    modal.classList.add('hidden');
    modal.classList.remove('flex');
    iframe.src = '';
    document.body.style.overflow = ''; // Restaurar scroll
}

// Atalhos de teclado
document.addEventListener('keydown', (e) => {
    // ESC para fechar modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('report-modal');
        if (!modal.classList.contains('hidden')) {
            closeModal();
        }
    }

    // Ctrl+Enter para processar (apenas se não estiver em textarea)
    if (e.ctrlKey && e.key === 'Enter') {
        const activeEl = document.activeElement;
        if (activeEl.tagName !== 'TEXTAREA' && activeEl.tagName !== 'INPUT') {
            const btnProcess = document.getElementById('btn-process');
            if (!btnProcess.disabled) {
                startProcessing();
            }
        }
    }
});

// Mostrar modal "O que há de novo" na primeira visita
function showWhatsNewIfFirstVisit() {
    const hasSeenWhatsNew = localStorage.getItem('v2-whats-new-seen');

    if (!hasSeenWhatsNew) {
        setTimeout(() => {
            const modal = document.getElementById('whats-new-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                document.body.style.overflow = 'hidden';
            }
        }, 500); // Pequeno delay para melhor UX
    }
}

// Fechar modal "O que há de novo"
function closeWhatsNew() {
    const modal = document.getElementById('whats-new-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
        localStorage.setItem('v2-whats-new-seen', 'true');
        showToast('Bem-vindo à versão 2! 🎉', 'success');
    }
}

