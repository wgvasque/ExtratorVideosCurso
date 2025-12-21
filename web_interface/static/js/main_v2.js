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

    // Verificar se há processamento ativo e restaurar estado
    checkProcessingOnLoad();

    // Mostrar modal "O que há de novo" na primeira visita
    showWhatsNewIfFirstVisit();
});

// ===== RECUPERAÇÃO DE ESTADO DE PROCESSAMENTO =====
async function checkProcessingOnLoad() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();

        console.log('🔍 Verificando estado de processamento:', status);

        if (status.is_processing || status.processing) {
            console.log('✅ Processamento ativo detectado - restaurando UI');

            // Desabilitar botões e inputs
            const btnProcess = document.getElementById('btn-process');
            const btnCancel = document.getElementById('btn-cancel');
            const urlsInput = document.getElementById('urls-input');

            if (btnProcess) {
                btnProcess.disabled = true;
                btnProcess.classList.add('opacity-50', 'cursor-not-allowed');
            }
            if (btnCancel) {
                btnCancel.disabled = false;
                btnCancel.classList.remove('hidden');
            }
            if (urlsInput) {
                urlsInput.disabled = true;
            }

            // Mostrar seção de progresso e terminal
            const progressCard = document.getElementById('progress-card');
            const inputSection = document.getElementById('input-zone');
            const logsCard = document.getElementById('logs-card');

            if (progressCard && inputSection) {
                progressCard.classList.remove('hidden');
                inputSection.classList.add('hidden');
            }

            // Mostrar terminal de logs
            if (logsCard) {
                logsCard.classList.remove('hidden');
                // Também mostrar o conteúdo dos logs se estiver colapsado
                const logsContent = document.getElementById('logs-content');
                if (logsContent) {
                    logsContent.classList.remove('hidden');
                }
            }

            // Atualizar UI com estado atual (inclui fila)
            updateProgressFromStatus(status);

            // Iniciar timer se houver tempo decorrido
            if (!startTime && !timerInterval) {
                startTime = Date.now() - (status.elapsed_time || 0) * 1000;
                timerInterval = setInterval(updateTimer, 1000);
            }

            // Iniciar polling de status
            startStatusPolling();
        } else {
            // Garantir que botões estejam habilitados quando não está processando
            const btnProcess = document.getElementById('btn-process');
            const btnCancel = document.getElementById('btn-cancel');
            const urlsInput = document.getElementById('urls-input');

            if (btnProcess) {
                btnProcess.disabled = false;
                btnProcess.classList.remove('opacity-50', 'cursor-not-allowed');
            }
            if (btnCancel) {
                btnCancel.classList.add('hidden');
            }
            if (urlsInput) {
                urlsInput.disabled = false;
            }
        }
    } catch (error) {
        console.error('❌ Erro ao verificar estado de processamento:', error);
    }
}

function updateProgressFromStatus(status) {
    // Atualizar porcentagem
    const progressPercent = document.getElementById('progress-percent');
    const progressBar = document.getElementById('progress-bar');
    if (progressPercent && progressBar) {
        const percent = status.progress || 0;
        progressPercent.textContent = `${percent}%`;
        progressBar.style.width = `${percent}%`;
    }

    // Atualizar URL atual
    const currentUrl = document.getElementById('current-url');
    if (currentUrl && status.current_url) {
        currentUrl.textContent = status.current_url;
    }

    // Atualizar step atual
    const currentStep = document.getElementById('current-step');
    if (currentStep && status.current_step && status.current_step !== 'idle') {
        currentStep.textContent = status.current_step;
    }

    // Atualizar estatísticas
    const processedCount = document.getElementById('processed-count');
    const failedCount = document.getElementById('failed-count');
    const totalCount = document.getElementById('total-count');

    if (processedCount) processedCount.textContent = status.current_video || 0;
    if (failedCount) failedCount.textContent = status.failed_videos || 0;
    if (totalCount) totalCount.textContent = status.total_videos || 0;

    // Atualizar terminal se houver step atual
    if (status.current_step && status.current_step !== 'idle') {
        addLog(`📌 ${status.current_step}`, 'info');
    }

    // Atualizar fila se disponível
    if (status.queue) {
        updateQueueDisplay(status.queue, status.current_url);
    }
}

let statusPollingInterval = null;

function startStatusPolling() {
    // Limpar polling anterior se existir
    if (statusPollingInterval) {
        clearInterval(statusPollingInterval);
    }

    // Polling a cada 2 segundos
    statusPollingInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();

            if (status.is_processing || status.processing) {
                updateProgressFromStatus(status);
            } else {
                // Processamento concluído
                clearInterval(statusPollingInterval);
                statusPollingInterval = null;
            }
        } catch (error) {
            console.error('Erro no polling de status:', error);
        }
    }, 2000);
}

// ===== GERENCIAMENTO DE PROMPTS =====
let availablePrompts = [];
let selectedPrompt = null;

async function loadAvailablePrompts() {
    try {
        const response = await fetch('/prompts');
        const data = await response.json();

        availablePrompts = data.prompts;
        const defaultTemplate = data.default_template || 'modelo2';
        const defaultValid = data.default_valid;

        populatePromptSelector();

        // Restaurar seleção: localStorage > default_template > primeiro válido
        const savedPrompt = localStorage.getItem('selectedPrompt');
        let promptToUse = null;

        if (savedPrompt && availablePrompts.find(p => p.name === savedPrompt && p.valid)) {
            // Usar do localStorage se existir e for válido
            promptToUse = savedPrompt;
        } else if (defaultValid) {
            // Usar o padrão do .env se for válido
            promptToUse = defaultTemplate;
        } else {
            // Fallback para primeiro válido
            const firstValid = availablePrompts.find(p => p.valid);
            if (firstValid) {
                promptToUse = firstValid.name;
            }

            // Mostrar alerta se o padrão configurado não é válido
            if (!defaultValid && defaultTemplate) {
                showToast(`⚠️ Template padrão "${defaultTemplate}" está inválido. Usando "${promptToUse || 'nenhum'}" como alternativa.`, 'warning');
            }
        }

        if (promptToUse) {
            const selector = document.getElementById('prompt-model-select');
            if (selector) {
                selector.value = promptToUse;
                await updatePromptInfo(promptToUse);
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
        // Permitir selecionar todos, inclusive inválidos
        option.disabled = false;

        selector.appendChild(option);
    });

    // Event listener para mudança de seleção
    selector.addEventListener('change', async (e) => {
        const promptName = e.target.value;
        await updatePromptInfo(promptName);
        localStorage.setItem('selectedPrompt', promptName);

        // Verificar se é válido e ajustar botão de processamento
        const prompt = availablePrompts.find(p => p.name === promptName);
        updateProcessButtonState(prompt);

        // Se for inválido, abrir automaticamente o painel de info
        if (prompt && !prompt.valid) {
            togglePromptInfo();
        }
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

function updateProcessButtonState(prompt) {
    // Atualizar estado do botão de processamento baseado na validade do prompt
    const processBtn = document.getElementById('btn-process');
    const invalidWarning = document.getElementById('invalid-prompt-warning');

    if (!prompt) return;

    if (processBtn) {
        if (prompt.valid) {
            processBtn.disabled = false;
            processBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            processBtn.title = 'Processar vídeos';
        } else {
            processBtn.disabled = true;
            processBtn.classList.add('opacity-50', 'cursor-not-allowed');
            processBtn.title = `Prompt "${prompt.name}" é inválido - selecione um prompt válido`;
        }
    }

    // Mostrar/ocultar aviso de prompt inválido
    if (invalidWarning) {
        if (prompt.valid) {
            invalidWarning.classList.add('hidden');
        } else {
            invalidWarning.classList.remove('hidden');
            invalidWarning.textContent = `⚠️ Prompt "${prompt.name}" é inválido. Selecione um prompt válido para processar.`;
        }
    }
}

function togglePromptInfo() {
    const infoDiv = document.getElementById('prompt-info');
    if (infoDiv) {
        infoDiv.classList.remove('hidden');
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

    socket.on('queue_updated', (data) => {
        console.log('📋 Fila atualizada:', data);
        updateQueueDisplay(data.queue, data.current);
    });

    // Eventos de etapa (se implementados no backend)
    socket.on('step_update', (data) => {
        updateStepIndicator(data.step);
        addLog(`📌 Etapa: ${data.step} - ${data.message || ''}`, 'info');
    });
}

// Atualizar display da fila
function updateQueueDisplay(queue, currentUrl) {
    console.log('🔍 updateQueueDisplay chamada:', { queue, currentUrl, queueLength: queue?.length });

    const queueList = document.getElementById('queue-list');
    const queueCount = document.getElementById('queue-count');

    if (!queueList || !queueCount) {
        console.warn('⚠️ Elementos queue-list ou queue-count não encontrados');
        return;
    }

    // Atualizar contador
    const count = queue ? queue.length : 0;
    queueCount.textContent = count === 0 ? 'Fila vazia' : `${count} na fila`;

    console.log(`📊 Atualizando fila: ${count} itens`);

    // Limpar lista
    queueList.innerHTML = '';

    if (count === 0) {
        queueList.innerHTML = '<p class="text-sm text-ink/50 text-center py-4">Nenhum vídeo na fila</p>';
        return;
    }

    // Adicionar itens da fila
    queue.forEach((url, index) => {
        console.log(`  ${index + 1}. ${url}`);
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-base/50 border-2 border-ink rounded-lg hover:bg-base transition-colors';
        item.innerHTML = `
            <div class="flex-1 min-w-0">
                <span class="font-bold text-sm mr-2">${index + 1}.</span>
                <span class="font-mono text-xs truncate">${url}</span>
            </div>
            <button onclick="removeFromQueue('${url.replace(/'/g, "\\'")}')\" 
                class="btn-retro btn-secondary text-xs px-2 py-1 ml-2 hover:bg-red-100 hover:text-red-600 hover:border-red-600 flex-shrink-0">
                🗑️ REMOVER
            </button>
        `;
        queueList.appendChild(item);
    });
}

// Remover item da fila
async function removeFromQueue(url) {
    try {
        const response = await fetch('/api/queue/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Removido da fila', 'success');
            addLog(`🗑️ Removido da fila: ${url}`, 'info');
        } else {
            showToast('Erro ao remover: ' + data.error, 'error');
        }
    } catch (error) {
        showToast('Erro ao remover da fila: ' + error.message, 'error');
    }
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

    // Obter nome do modelo selecionado
    let modelName = 'Modelo 2 (Padrão)';
    if (promptModelSelect) {
        const selectedOption = promptModelSelect.options[promptModelSelect.selectedIndex];
        modelName = selectedOption ? selectedOption.text : modelName;
    }

    // Mostrar confirmação elegante
    const estimatedTime = estimateTime(urls.length);
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

    // Notificar sistema de fila (extension_manifests.js)
    if (typeof window.onVideoProcessingComplete === 'function') {
        const urlsInput = document.getElementById('urls-input');
        const processedUrl = urlsInput ? urlsInput.value : null;
        if (processedUrl) {
            console.log('[Main] Notificando conclusão para fila:', processedUrl);
            window.onVideoProcessingComplete(processedUrl);
        }
    }
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

// ============================================
// MODAL DE CONFIGURAÇÕES 
// ============================================

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
        loadConfigSettings();

        // Resetar flag de alterações e adicionar listeners
        settingsChanged = false;
        setupSettingsChangeListeners();
    }
}

// Flag para rastrear se configurações foram alteradas
let settingsChanged = false;

// Configurar listeners para detectar alterações
function setupSettingsChangeListeners() {
    const settingsInputs = document.querySelectorAll('#settings-modal input, #settings-modal select, #settings-modal textarea');
    settingsInputs.forEach(input => {
        input.addEventListener('change', () => { settingsChanged = true; });
        input.addEventListener('input', () => { settingsChanged = true; });
    });
}

// Modal de confirmação customizado para a web
function showConfirmDialog(title, message, onConfirm, onCancel) {
    // Se chamado com apenas 2 argumentos (title, message), retornar Promise
    if (arguments.length === 2) {
        return new Promise((resolve) => {
            // Criar overlay do modal
            const overlay = document.createElement('div');
            overlay.id = 'confirm-dialog-overlay';
            overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';

            overlay.innerHTML = `
                <div class="bg-white border-4 border-ink rounded-2xl p-6 max-w-md mx-4 shadow-retro transform scale-100">
                    <h3 class="font-display font-bold text-xl mb-3">${title}</h3>
                    <p class="text-ink mb-6 whitespace-pre-line">${message}</p>
                    <div class="flex gap-3 justify-end">
                        <button id="confirm-dialog-cancel" class="btn-retro btn-secondary px-4 py-2">Não</button>
                        <button id="confirm-dialog-ok" class="btn-retro btn-primary px-4 py-2">Sim</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const handleConfirm = () => {
                overlay.remove();
                resolve(true);
            };

            const handleCancel = () => {
                overlay.remove();
                resolve(false);
            };

            document.getElementById('confirm-dialog-ok').addEventListener('click', handleConfirm);
            document.getElementById('confirm-dialog-cancel').addEventListener('click', handleCancel);

            // Fechar ao clicar fora
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) handleCancel();
            });
        });
    }

    // Modo legado com callbacks (para compatibilidade)
    const overlay = document.createElement('div');
    overlay.id = 'confirm-dialog-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]';

    overlay.innerHTML = `
        <div class="bg-white border-4 border-ink rounded-2xl p-6 max-w-md mx-4 shadow-retro transform scale-100">
            <h3 class="font-display font-bold text-xl mb-3">${title}</h3>
            <p class="text-ink mb-6 whitespace-pre-line">${message}</p>
            <div class="flex gap-3 justify-end">
                <button id="confirm-dialog-cancel" class="btn-retro btn-secondary px-4 py-2">Não</button>
                <button id="confirm-dialog-ok" class="btn-retro btn-primary px-4 py-2">Sim</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const handleConfirm = () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    };

    const handleCancel = () => {
        overlay.remove();
        if (onCancel) onCancel();
    };

    document.getElementById('confirm-dialog-ok').addEventListener('click', handleConfirm);
    document.getElementById('confirm-dialog-cancel').addEventListener('click', handleCancel);

    // Fechar ao clicar fora
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) handleCancel();
    });
}

function closeSettingsModal(forceClose = false) {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        // Verificar se há alterações não salvas
        if (settingsChanged && !forceClose) {
            showConfirmDialog(
                '⚠️ Alterações não salvas',
                'Você tem alterações não salvas nas configurações.\n\nDeseja salvar antes de fechar?',
                () => {
                    // Usuário quer salvar
                    saveConfigSettings();
                },
                () => {
                    // Usuário não quer salvar - fechar sem salvar
                    settingsChanged = false;
                    modal.classList.add('hidden');
                    modal.classList.remove('flex');
                    document.body.style.overflow = '';
                }
            );
            return;
        }

        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
        settingsChanged = false; // Resetar flag
    }
}

async function populateConfigPromptSelector(currentValue) {
    // Popular o select de prompts nas configurações - mostra todos (válidos e inválidos)
    const selector = document.getElementById('cfg-prompt-model');
    const statusDiv = document.getElementById('cfg-prompt-status');
    if (!selector) return;

    try {
        const response = await fetch('/prompts');
        const data = await response.json();

        selector.innerHTML = '';

        if (data.prompts.length === 0) {
            selector.innerHTML = '<option value="">❌ Nenhum prompt disponível</option>';
            return;
        }

        // Mostrar TODOS os prompts (válidos e inválidos) como na tela principal
        data.prompts.forEach(prompt => {
            const option = document.createElement('option');
            option.value = prompt.name;

            // Ícone de status igual à tela principal
            const icon = prompt.valid ? '✅' : '❌';
            const sections = `(${prompt.sections}/14 seções)`;

            option.textContent = `${icon} ${prompt.name} ${sections}`;
            selector.appendChild(option);
        });

        // Event listener para mostrar aviso quando selecionar inválido
        selector.addEventListener('change', () => {
            const selectedName = selector.value;
            const selectedPrompt = data.prompts.find(p => p.name === selectedName);
            updateConfigPromptStatus(selectedPrompt, statusDiv);
        });

        // Definir valor atual
        if (currentValue && data.prompts.find(p => p.name === currentValue)) {
            selector.value = currentValue;
        } else if (data.prompts.length > 0) {
            // Selecionar primeiro válido ou primeiro disponível
            const firstValid = data.prompts.find(p => p.valid);
            selector.value = firstValid ? firstValid.name : data.prompts[0].name;
        }

        // Mostrar status inicial
        const initialPrompt = data.prompts.find(p => p.name === selector.value);
        updateConfigPromptStatus(initialPrompt, statusDiv);

    } catch (e) {
        console.error('Erro ao carregar prompts para config:', e);
        selector.innerHTML = '<option value="modelo2">modelo2</option>';
    }
}

// Função para atualizar status do prompt selecionado nas configurações
function updateConfigPromptStatus(prompt, statusDiv) {
    if (!statusDiv) return;

    if (!prompt) {
        statusDiv.innerHTML = '';
        return;
    }

    if (prompt.valid) {
        statusDiv.innerHTML = `
            <div class="bg-green-50 border border-green-300 rounded-lg p-2 mt-2 text-xs text-green-700">
                ✅ <strong>Prompt válido</strong> - ${prompt.sections}/14 seções configuradas
            </div>`;
    } else {
        statusDiv.innerHTML = `
            <div class="bg-red-50 border border-red-300 rounded-lg p-2 mt-2 text-xs text-red-700">
                ❌ <strong>Prompt inválido</strong> - Apenas ${prompt.sections}/14 seções. 
                Este prompt não funcionará corretamente para processamento.
            </div>`;
    }
}

async function loadConfigSettings() {
    // Valores padrão
    const defaults = {
        ia_provider: 'gemini',
        use_fallback: true,
        whisper_model: 'small',
        whisper_device: 'cpu'
    };

    // Aplicar padrões imediatamente
    document.getElementById('cfg-ia-provider').value = defaults.ia_provider;
    document.getElementById('cfg-fallback').checked = defaults.use_fallback;
    document.getElementById('cfg-whisper-model').value = defaults.whisper_model;
    document.getElementById('cfg-whisper-device').value = defaults.whisper_device;

    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            const data = await response.json();

            // API Keys
            if (data.gemini_api_key) {
                document.getElementById('cfg-gemini-key').value = data.gemini_api_key;
                document.getElementById('cfg-gemini-status').innerHTML = '<span class="text-green-600 font-bold">✅ Configurada</span>';
            } else {
                document.getElementById('cfg-gemini-status').innerHTML = '<span class="text-amber-600">⚠️ Não configurada</span>';
            }

            if (data.openrouter_api_key) {
                document.getElementById('cfg-openrouter-key').value = data.openrouter_api_key;
                document.getElementById('cfg-openrouter-status').innerHTML = '<span class="text-green-600 font-bold">✅ Configurada</span>';
            } else {
                document.getElementById('cfg-openrouter-status').innerHTML = '<span class="text-gray-500">Opcional - não configurada</span>';
            }

            // Sobrescrever padrões com valores do servidor
            document.getElementById('cfg-ia-provider').value = data.ia_provider || defaults.ia_provider;
            document.getElementById('cfg-fallback').checked = data.use_fallback !== false;
            document.getElementById('cfg-whisper-model').value = data.whisper_model || defaults.whisper_model;
            document.getElementById('cfg-whisper-device').value = data.whisper_device || defaults.whisper_device;

            // Popular select de prompts e definir valor atual
            await populateConfigPromptSelector(data.prompt_model || 'modelo2');

            // Campos restantes
            document.getElementById('cfg-sumarios-dir').value = data.sumarios_dir || 'sumarios';
            document.getElementById('cfg-cache-ttl').value = data.cache_ttl || 72;
        }

        // Carregar credenciais por domínio separadamente
        await loadCredentials();

    } catch (e) {
        console.error('Erro ao carregar configurações:', e);
        document.getElementById('cfg-gemini-status').innerHTML = '<span class="text-red-600">❌ Erro ao carregar</span>';
    }
}

async function saveConfigSettings() {
    const settings = {
        gemini_api_key: document.getElementById('cfg-gemini-key').value,
        openrouter_api_key: document.getElementById('cfg-openrouter-key').value,
        ia_provider: document.getElementById('cfg-ia-provider').value,
        use_fallback: document.getElementById('cfg-fallback').checked,
        whisper_model: document.getElementById('cfg-whisper-model').value,
        whisper_device: document.getElementById('cfg-whisper-device').value,
        openrouter_model: 'google/gemini-2.0-flash-exp:free',
        prompt_model: document.getElementById('cfg-prompt-model').value,
        sumarios_dir: document.getElementById('cfg-sumarios-dir').value,
        cache_ttl: parseInt(document.getElementById('cfg-cache-ttl').value) || 72
    };

    try {
        // Salvar configurações gerais
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        // Salvar credenciais por domínio
        await saveCredentials();

        if (response.ok) {
            showToast('Configurações salvas!', 'success');
            settingsChanged = false; // Resetar flag antes de fechar
            closeSettingsModal(true); // Forçar fechamento
        } else {
            const err = await response.json();
            showToast('Erro: ' + (err.error || 'Falha ao salvar'), 'error');
        }
    } catch (e) {
        showToast('Erro de conexão', 'error');
    }
}

// ============================================
// CREDENCIAIS POR DOMÍNIO
// ============================================
let credentialsData = {};

async function loadCredentials() {
    try {
        const response = await fetch('/api/credentials');
        if (response.ok) {
            credentialsData = await response.json();
            renderCredentialsList();
        }
    } catch (e) {
        console.error('Erro ao carregar credenciais:', e);
    }
}

function renderCredentialsList() {
    const container = document.getElementById('credentials-list');
    if (!container) return;

    const domains = Object.keys(credentialsData);

    if (domains.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-4 text-sm">
                Nenhuma credencial configurada.<br>
                Clique em "➕ Adicionar" para começar.
            </div>
        `;
        return;
    }

    container.innerHTML = domains.map((domain, index) => `
        <div class="border-2 border-gray-200 rounded-lg p-3 bg-gray-50" data-domain="${domain}">
            <div class="flex justify-between items-center mb-2">
                <input type="text" value="${domain}" 
                    class="retro-input p-1 text-sm flex-1 mr-2 font-mono"
                    placeholder="dominio.com.br"
                    onchange="updateCredentialDomain(${index}, this.value)">
                <button onclick="removeCredential('${domain}')" 
                    class="text-red-500 hover:text-red-700 font-bold px-2">✕</button>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <input type="email" value="${credentialsData[domain].email || ''}" 
                    class="retro-input p-1 text-sm"
                    placeholder="email@exemplo.com"
                    onchange="credentialsData['${domain}'].email = this.value">
                <input type="password" value="${credentialsData[domain].senha || ''}" 
                    class="retro-input p-1 text-sm"
                    placeholder="Senha"
                    onchange="credentialsData['${domain}'].senha = this.value">
            </div>
        </div>
    `).join('');
}

function addCredential() {
    const domain = prompt('Digite o domínio da plataforma (ex: alunos.segueadii.com.br):');
    if (domain && domain.trim()) {
        credentialsData[domain.trim()] = { email: '', senha: '' };
        renderCredentialsList();
    }
}

function removeCredential(domain) {
    if (confirm(`Remover credenciais de "${domain}"?`)) {
        delete credentialsData[domain];
        renderCredentialsList();
    }
}

function updateCredentialDomain(index, newDomain) {
    const domains = Object.keys(credentialsData);
    const oldDomain = domains[index];
    if (oldDomain && newDomain && oldDomain !== newDomain) {
        credentialsData[newDomain] = credentialsData[oldDomain];
        delete credentialsData[oldDomain];
        renderCredentialsList();
    }
}

async function saveCredentials() {
    try {
        await fetch('/api/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentialsData)
        });
    } catch (e) {
        console.error('Erro ao salvar credenciais:', e);
    }
}

async function testGeminiApi() {
    const key = document.getElementById('cfg-gemini-key').value;
    const statusEl = document.getElementById('cfg-gemini-status');

    if (!key) {
        statusEl.innerHTML = '<span class="text-red-600">❌ Informe a chave</span>';
        return;
    }

    statusEl.innerHTML = '<span class="text-yellow-600">⏳ Testando...</span>';

    try {
        const response = await fetch('/api/settings/test-gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: key })
        });
        const data = await response.json();

        if (data.success) {
            statusEl.innerHTML = '<span class="text-green-600">✅ ' + data.message + '</span>';
        } else {
            statusEl.innerHTML = '<span class="text-red-600">❌ ' + data.message + '</span>';
        }
    } catch (e) {
        statusEl.innerHTML = '<span class="text-red-600">❌ Erro de conexão</span>';
    }
}

async function testOpenRouterApi() {
    const key = document.getElementById('cfg-openrouter-key').value;
    const statusEl = document.getElementById('cfg-openrouter-status');

    if (!key) {
        statusEl.innerHTML = '<span class="text-red-600">❌ Informe a chave</span>';
        return;
    }

    statusEl.innerHTML = '<span class="text-yellow-600">⏳ Testando...</span>';

    try {
        const response = await fetch('/api/settings/test-openrouter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: key })
        });
        const data = await response.json();

        if (data.success) {
            statusEl.innerHTML = '<span class="text-green-600">✅ ' + data.message + '</span>';
        } else {
            statusEl.innerHTML = '<span class="text-red-600">❌ ' + data.message + '</span>';
        }
    } catch (e) {
        statusEl.innerHTML = '<span class="text-red-600">❌ Erro de conexão</span>';
    }
}

// Fechar modal de configurações com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal && !settingsModal.classList.contains('hidden')) {
            closeSettingsModal();
        }
        const promptsModal = document.getElementById('prompts-modal');
        if (promptsModal && !promptsModal.classList.contains('hidden')) {
            closePromptsModal();
        }
    }
});

// ===== EDITOR DE PROMPTS =====
let easyMDE = null;
let currentEditingPrompt = null;
let isNewPrompt = false;

function openPromptsModal() {
    const modal = document.getElementById('prompts-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden'; // Bloquear scroll da página
    loadPromptsList();
}

function closePromptsModal() {
    const modal = document.getElementById('prompts-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = ''; // Restaurar scroll da página

    // Limpar estado
    currentEditingPrompt = null;
    isNewPrompt = false;

    // Destruir EasyMDE se existir
    if (easyMDE) {
        easyMDE.toTextArea();
        easyMDE = null;
    }

    // Limpar textarea para evitar conteúdo persistente
    const textarea = document.getElementById('prompt-editor');
    if (textarea) {
        textarea.value = '';
    }

    // Resetar UI
    document.getElementById('editor-header').classList.add('hidden');
    document.getElementById('editor-container').classList.add('hidden');
    document.getElementById('editor-placeholder').classList.remove('hidden');
}

async function loadPromptsList() {
    const listEl = document.getElementById('prompts-list');

    // Salvar posição do scroll antes de atualizar
    const scrollPosition = listEl.scrollTop;

    // Só mostrar loading se a lista estiver vazia
    if (!listEl.children.length || listEl.querySelector('.text-gray-500')) {
        listEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">⏳ Carregando...</p>';
    }

    try {
        const response = await fetch('/prompts');
        const data = await response.json();

        if (!data.prompts || data.prompts.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">Nenhum prompt encontrado</p>';
            return;
        }

        // Filtrar README
        const prompts = data.prompts.filter(p => p.name.toLowerCase() !== 'readme');

        listEl.innerHTML = prompts.map(p => `
            <div class="prompt-item border-2 border-ink rounded-lg p-3 cursor-pointer hover:bg-sun/20 transition-colors ${currentEditingPrompt === p.name ? 'bg-sun/30 border-pop' : 'bg-white'}"
                 onclick="editPrompt('${p.name}')">
                <div class="flex items-center justify-between">
                    <span class="font-bold text-sm">${p.name}</span>
                    <span class="text-lg">${p.valid ? '✅' : '❌'}</span>
                </div>
                <div class="text-xs text-gray-500 mt-1">${p.sections}/14 seções</div>
            </div>
        `).join('');

        // Restaurar posição do scroll
        listEl.scrollTop = scrollPosition;
    } catch (e) {
        console.error('Erro ao carregar prompts:', e);
        listEl.innerHTML = '<p class="text-sm text-red-500 text-center py-4">❌ Erro ao carregar</p>';
    }
}

async function createNewPrompt() {
    currentEditingPrompt = null;
    isNewPrompt = true;

    // Mostrar editor
    document.getElementById('editor-placeholder').classList.add('hidden');
    document.getElementById('editor-header').classList.remove('hidden');
    document.getElementById('editor-container').classList.remove('hidden');

    // Configurar campos
    const nameInput = document.getElementById('prompt-name-input');
    nameInput.value = 'meu_prompt';
    nameInput.disabled = false;
    nameInput.select(); // Selecionar o texto para facilitar substituição

    document.getElementById('prompt-status-badge').innerHTML = '<span class="text-blue-600">🆕 Novo prompt</span>';
    document.getElementById('prompt-info').textContent = '⏳ Carregando template...';
    document.getElementById('delete-prompt-btn').classList.add('hidden');

    // Carregar template do servidor
    try {
        const response = await fetch('/api/prompt/template');
        const data = await response.json();

        if (data.error) {
            // Fallback: template vazio se não encontrar
            console.warn('Template não encontrado, usando vazio');
            initEasyMDE('');
            document.getElementById('prompt-info').textContent = 'Preencha o nome e conteúdo do novo prompt';
        } else {
            // Inicializar editor com template
            initEasyMDE(data.content);
            document.getElementById('prompt-info').textContent = `📄 Template carregado (${data.size} caracteres)`;
        }
    } catch (e) {
        console.error('Erro ao carregar template:', e);
        // Fallback: template vazio em caso de erro
        initEasyMDE('');
        document.getElementById('prompt-info').textContent = 'Preencha o nome e conteúdo do novo prompt';
        showToast('Aviso: Template não pôde ser carregado', 'warning');
    }

    // Atualizar lista visual
    loadPromptsList();
}

async function editPrompt(name) {
    currentEditingPrompt = name;
    isNewPrompt = false;

    // Mostrar loading
    document.getElementById('editor-placeholder').classList.add('hidden');
    document.getElementById('editor-header').classList.remove('hidden');
    document.getElementById('editor-container').classList.remove('hidden');
    document.getElementById('prompt-info').textContent = '⏳ Carregando...';

    try {
        const response = await fetch(`/api/prompt/${name}/content`);
        const data = await response.json();

        if (data.error) {
            showToast('Erro ao carregar prompt: ' + data.error, 'error');
            return;
        }

        // Configurar campos
        const nameInput = document.getElementById('prompt-name-input');
        nameInput.value = name;
        nameInput.disabled = true; // Não permite renomear

        // Buscar status de validação
        const validationResp = await fetch(`/prompts/${name}`);
        const validationData = await validationResp.json();

        const validationInfoBtn = document.getElementById('validation-info-btn');
        const validationErrorText = document.getElementById('validation-error-text');
        const validationSuccessBadge = document.getElementById('validation-success-badge');

        if (validationData.validation?.valid) {
            validationInfoBtn.classList.add('hidden');
            validationSuccessBadge.classList.remove('hidden');
            window.currentValidationData = null;
        } else {
            // Mostrar botão de erro com contagem
            const sectionsFound = validationData.validation?.sections_found || 0;
            validationErrorText.textContent = `${14 - sectionsFound} ERROS`;
            validationInfoBtn.classList.remove('hidden');
            validationSuccessBadge.classList.add('hidden');

            // Armazenar dados de validação para o modal
            window.currentValidationData = validationData.validation;
        }

        document.getElementById('delete-prompt-btn').classList.remove('hidden');

        // Inicializar editor com conteúdo
        initEasyMDE(data.content);

        // Atualizar lista visual
        loadPromptsList();
    } catch (e) {
        console.error('Erro ao carregar prompt:', e);
        showToast('Erro ao carregar prompt', 'error');
    }
}

// Abrir modal de validação
function openValidationModal() {
    if (!window.currentValidationData) return;

    const modal = document.getElementById('validation-modal');
    const content = document.getElementById('validation-modal-content');
    const data = window.currentValidationData;

    // Construir mensagem de ajuda detalhada
    let helpMessage = `<div class="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">`;
    helpMessage += `<div class="font-bold text-red-700 mb-3 text-lg">⚠️ Este prompt não pode ser usado para processamento</div>`;

    // Mostrar seções faltantes
    if (data.missing_sections?.length > 0) {
        helpMessage += `<div class="mb-3"><strong class="text-base">Seções faltantes (${data.missing_sections.length}/14):</strong></div>`;
        helpMessage += `<ul class="list-disc list-inside mb-3 text-red-600 space-y-1">`;
        data.missing_sections.forEach(section => {
            helpMessage += `<li>${section}</li>`;
        });
        helpMessage += `</ul>`;
    }

    // Mostrar erro geral se houver
    if (data.error) {
        helpMessage += `<div class="mb-3 p-3 bg-red-200 border border-red-400 rounded"><strong>Erro:</strong> ${data.error}</div>`;
    }

    // Mostrar tipos inválidos se houver
    if (data.invalid_types?.length > 0) {
        helpMessage += `<div class="mb-3"><strong>Tipos inválidos:</strong></div>`;
        helpMessage += `<ul class="list-disc list-inside mb-3 text-red-600">`;
        data.invalid_types.forEach(error => {
            helpMessage += `<li>${error}</li>`;
        });
        helpMessage += `</ul>`;
    }

    helpMessage += `</div>`;

    // Orientação de como corrigir
    helpMessage += `<div class="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">`;
    helpMessage += `<div class="font-bold text-blue-700 mb-3 text-lg">💡 Como corrigir:</div>`;
    helpMessage += `<ol class="list-decimal list-inside space-y-2 text-blue-900">`;
    helpMessage += `<li>Adicione um bloco <code class="bg-blue-200 px-2 py-1 rounded">\`\`\`json</code> com a estrutura de saída esperada</li>`;
    helpMessage += `<li>Certifique-se de incluir todas as 14 seções obrigatórias no JSON</li>`;
    helpMessage += `<li>Use o template como referência (clique em "➕ NOVO PROMPT" para ver o exemplo completo)</li>`;
    helpMessage += `</ol>`;
    helpMessage += `</div>`;

    content.innerHTML = helpMessage;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Fechar modal de validação
function closeValidationModal() {
    const modal = document.getElementById('validation-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function initEasyMDE(content) {
    // Destruir instância anterior se existir
    if (easyMDE) {
        easyMDE.toTextArea();
        easyMDE = null;
    }

    const textarea = document.getElementById('prompt-editor');
    textarea.value = content;

    // Estado inicial do word wrap
    let wordWrapEnabled = true;

    easyMDE = new EasyMDE({
        element: textarea,
        spellChecker: false,
        autosave: { enabled: false },
        status: ['lines', 'words', 'cursor'],
        toolbar: [
            { name: 'bold', action: EasyMDE.toggleBold, className: 'fa fa-bold', title: 'Negrito' },
            { name: 'italic', action: EasyMDE.toggleItalic, className: 'fa fa-italic', title: 'Itálico' },
            { name: 'heading', action: EasyMDE.toggleHeadingSmaller, className: 'fa fa-header', title: 'Título' },
            '|',
            { name: 'quote', action: EasyMDE.toggleBlockquote, className: 'fa fa-quote-left', title: 'Citação' },
            { name: 'unordered-list', action: EasyMDE.toggleUnorderedList, className: 'fa fa-list-ul', title: 'Lista não ordenada' },
            { name: 'ordered-list', action: EasyMDE.toggleOrderedList, className: 'fa fa-list-ol', title: 'Lista ordenada' },
            '|',
            { name: 'link', action: EasyMDE.drawLink, className: 'fa fa-link', title: 'Inserir link' },
            { name: 'code', action: EasyMDE.toggleCodeBlock, className: 'fa fa-code', title: 'Código' },
            '|',
            { name: 'preview', action: EasyMDE.togglePreview, className: 'fa fa-eye no-disable', title: 'Visualizar' },
            { name: 'side-by-side', action: EasyMDE.toggleSideBySide, className: 'fa fa-columns no-disable no-mobile', title: 'Lado a lado' },
            { name: 'fullscreen', action: EasyMDE.toggleFullScreen, className: 'fa fa-arrows-alt no-disable no-mobile', title: 'Tela cheia' },
            '|',
            {
                name: 'word-wrap',
                action: function (editor) {
                    wordWrapEnabled = !wordWrapEnabled;
                    editor.codemirror.setOption('lineWrapping', wordWrapEnabled);

                    // Atualizar aparência do botão
                    const btn = document.querySelector('.editor-toolbar button[title="Quebra de linha"]');
                    if (btn) {
                        btn.classList.toggle('active', wordWrapEnabled);
                        btn.style.background = wordWrapEnabled ? '#4ECDC4' : '';
                        btn.style.color = wordWrapEnabled ? 'white' : '';
                    }
                },
                className: 'fa fa-text-width',
                title: 'Quebra de linha',
            },
            '|',
            { name: 'guide', action: 'https://www.markdownguide.org/basic-syntax/', className: 'fa fa-question-circle', title: 'Guia Markdown' }
        ],
        minHeight: '400px',
        placeholder: 'Digite o conteúdo do prompt em Markdown...',
        lineWrapping: wordWrapEnabled,
        previewRender: (plainText) => {
            // Renderização básica de Markdown
            return plainText
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*(.*)\*/gim, '<em>$1</em>')
                .replace(/`([^`]+)`/gim, '<code>$1</code>')
                .replace(/\n/gim, '<br>');
        }
    });

    // Marcar botão como ativo inicialmente
    setTimeout(() => {
        const btn = document.querySelector('.editor-toolbar button[title="Quebra de linha"]');
        if (btn && wordWrapEnabled) {
            btn.style.background = '#4ECDC4';
            btn.style.color = 'white';
        }
    }, 100);
}

function toggleWordWrap() {
    // Função mantida para compatibilidade, mas agora o toggle é feito pelo botão da toolbar
    if (!easyMDE || !easyMDE.codemirror) return;
    const current = easyMDE.codemirror.getOption('lineWrapping');
    easyMDE.codemirror.setOption('lineWrapping', !current);
}

async function saveCurrentPrompt() {
    const nameInput = document.getElementById('prompt-name-input');
    const name = nameInput.value.trim();
    const content = easyMDE ? easyMDE.value() : '';

    if (!name) {
        showToast('Nome do prompt é obrigatório', 'error');
        nameInput.focus();
        return;
    }

    if (!content) {
        showToast('Conteúdo do prompt não pode estar vazio', 'error');
        return;
    }

    try {
        let response;
        if (isNewPrompt) {
            // Criar novo
            response = await fetch('/api/prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, content })
            });
        } else {
            // Atualizar existente
            response = await fetch(`/api/prompt/${currentEditingPrompt}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
        }

        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');

            // Se era novo, atualizar estado
            if (isNewPrompt) {
                currentEditingPrompt = data.name;
                isNewPrompt = false;
                nameInput.disabled = true;
                document.getElementById('delete-prompt-btn').classList.remove('hidden');
            }

            // Recarregar lista
            loadPromptsList();

            // Atualizar seletor de prompts nas configurações (se modal estiver aberto)
            if (typeof populateConfigPromptSelector === 'function') {
                populateConfigPromptSelector();
            }
        } else {
            showToast(data.error || 'Erro ao salvar', 'error');
        }
    } catch (e) {
        console.error('Erro ao salvar prompt:', e);
        showToast('Erro de conexão ao salvar', 'error');
    }
}

async function deleteCurrentPrompt() {
    if (!currentEditingPrompt || isNewPrompt) return;

    const confirmed = await showConfirmDialog(
        '🗑️ Excluir Prompt',
        `Tem certeza que deseja excluir o prompt "${currentEditingPrompt}"? Esta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`/api/prompt/${currentEditingPrompt}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');

            // Resetar estado
            currentEditingPrompt = null;
            isNewPrompt = false;

            // Limpar editor
            if (easyMDE) {
                easyMDE.toTextArea();
                easyMDE = null;
            }

            // Limpar textarea para evitar conteúdo persistente
            const textarea = document.getElementById('prompt-editor');
            if (textarea) {
                textarea.value = '';
            }

            // Mostrar placeholder
            document.getElementById('editor-header').classList.add('hidden');
            document.getElementById('editor-container').classList.add('hidden');
            document.getElementById('editor-placeholder').classList.remove('hidden');

            // Recarregar lista
            loadPromptsList();
        } else {
            showToast(data.error || 'Erro ao excluir', 'error');
        }
    } catch (e) {
        console.error('Erro ao excluir prompt:', e);
        showToast('Erro de conexão ao excluir', 'error');
    }
}
