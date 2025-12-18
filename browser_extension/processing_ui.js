// Processing UI Logic for Extension (sem SocketIO - usa polling)
let currentProcessingUrl = null;
let reportData = null;
let pollingInterval = null;
let timerInterval = null;
let processingStartTime = null;

// Função para processar vídeo com UI completa
// manifestUrl é o URL JWT assinado capturado pela extensão
async function processVideoWithUI(pageUrl, manifestUrl, button) {
    const hosts = ['http://localhost:5000', 'http://127.0.0.1:5000'];
    async function tryFetch(path, opts) {
        let lastErr = null;
        let firstNonOk = null;
        for (const h of hosts) {
            try {
                const r = await fetch(h + path, Object.assign({ cache: 'no-store' }, opts));
                if (r.ok) return r;
                if (!firstNonOk) firstNonOk = r;
            } catch (e) {
                lastErr = e;
            }
        }
        if (firstNonOk) return firstNonOk;
        if (lastErr) throw lastErr;
        throw new Error('Falha ao conectar com API');
    }
    async function getErrorMessage(response) {
        try {
            const data = await response.json();
            if (data && (data.error || data.status)) {
                return String(data.error || data.status);
            }
        } catch { }
        try {
            const txt = await response.text();
            if (txt) return txt.slice(0, 200);
        } catch { }
        return `HTTP ${response.status}`;
    }
    // Verificar se tem um manifest válido (qualquer URL com .m3u8, .mpd, ou outros formatos)
    const isValidManifest = (() => {
        try {
            const url = String(manifestUrl || '');
            // Cloudflare JWT
            if (url.includes('cloudflarestream.com')) {
                const jwtPath = url.match(/cloudflarestream\.com\/([^/]+)\/manifest\/video\.m3u8/);
                if (jwtPath && jwtPath[1] && jwtPath[1].split('.').length === 3) return true;
                const jwtQuery = url.match(/\?p=([^&]+)/);
                if (jwtQuery && jwtQuery[1] && jwtQuery[1].split('.').length === 3) return true;
                return false; // Cloudflare sem JWT não é válido
            }
            // PandaVideo, Vimeo, HLS, DASH - sempre válido se tem URL
            if (url.includes('.m3u8') || url.includes('.mpd') ||
                url.includes('master.json') || url.includes('videoplayback')) {
                return true;
            }
            return url.length > 10; // Qualquer URL razoável
        } catch {
            return false;
        }
    })();

    if (!isValidManifest) {
        showError(button, 'Manifest inválido. Aguarde o player carregar o vídeo.');
        return;
    }
    chrome.runtime.sendMessage({ action: 'startPolling', pageUrl, manifestUrl });
    currentProcessingUrl = pageUrl;

    // Mostrar seção de processamento
    const processingSection = document.getElementById('processing-section');
    const processingTitle = document.getElementById('processing-title');
    const processingStatus = document.getElementById('processing-status');
    const progressFill = document.getElementById('progress-fill');
    const processingResult = document.getElementById('processing-result');
    const processingTimer = document.getElementById('processing-timer');
    const videoUrlEl = document.getElementById('video-url');
    const terminalOutput = document.getElementById('terminal-output');

    processingSection.style.display = 'block';
    processingResult.style.display = 'none';
    processingTitle.textContent = '⏳ Processando...';
    processingStatus.textContent = 'Enviando para API...';
    progressFill.style.width = '10%';

    // Mostrar URL do vídeo sendo processado
    if (videoUrlEl) {
        videoUrlEl.textContent = pageUrl;
    }

    // Limpar terminal e adicionar log inicial
    if (terminalOutput) {
        terminalOutput.innerHTML = '';
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        terminalOutput.innerHTML = `
            <div class="log-line log-info"><span style="color: #888;">[${timestamp}]</span> 🚀 Iniciando processamento...</div>
            <div class="log-line log-info"><span style="color: #888;">[${timestamp}]</span> 📤 Enviando para API...</div>
        `;
    }
    // Resetar variáveis de log para permitir novas entradas
    lastLogMessage = '';
    lastStepType = '';

    // Iniciar timer local
    processingStartTime = Date.now();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        const hours = Math.floor(mins / 60);
        const displayMins = mins % 60;
        if (processingTimer) {
            if (hours > 0) {
                processingTimer.textContent = `⏱ ${String(hours).padStart(2, '0')}:${String(displayMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            } else {
                processingTimer.textContent = `⏱ ${String(displayMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            }
        }
    }, 1000);

    // Desabilitar botão
    button.disabled = true;
    button.textContent = '⏳ Processando...';

    try {
        // Capturar modelo de prompt selecionado (do select ou do storage)
        const promptModelSelect = document.getElementById('promptModelSelect');
        let promptModel = promptModelSelect ? promptModelSelect.value : '';

        // Se não tiver valor no select, tentar pegar do storage
        if (!promptModel) {
            const saved = await chrome.storage.local.get(['selectedPrompt']);
            promptModel = saved.selectedPrompt || '';
        }

        console.log('[Extension] Modelo de prompt selecionado:', promptModel);

        // Buscar metadados do manifest em memória via background script
        let videoTitle = '';
        let supportMaterials = [];
        try {
            const manifestData = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'getManifests' }, (response) => {
                    const manifests = response?.manifests || [];
                    const found = manifests.find(m => m.pageUrl === pageUrl);
                    resolve(found || {});
                });
            });
            videoTitle = manifestData.videoTitle || manifestData.pageTitle || '';
            supportMaterials = manifestData.supportMaterials || [];
            console.log('[Extension] Metadados encontrados:', { videoTitle, materials: supportMaterials.length });
        } catch (e) {
            console.warn('[Extension] Não foi possível buscar metadados:', e);
        }

        // Enviar para API com manifestUrl direto (JWT assinado) e metadados
        const response = await tryFetch('/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                urls: [pageUrl],
                manifestUrl: manifestUrl,  // Passa o JWT manifest diretamente
                prompt_template: promptModel || undefined,  // Envia prompt selecionado (nome completo do arquivo)
                videoTitle: videoTitle,  // Título do vídeo capturado pela extensão
                supportMaterials: supportMaterials  // Materiais de apoio capturados
            })
        });

        if (!response.ok) {
            const msg = await getErrorMessage(response);
            if (msg && msg.toLowerCase().includes('já em andamento')) {
                processingStatus.textContent = 'Processamento já em andamento...';
                progressFill.style.width = '30%';
                startProgressPolling(pageUrl, button, tryFetch);
                return;
            }
            showError(button, `Erro: ${msg}`);
            return;
        }

        progressFill.style.width = '30%';
        try {
            const data = await response.json();
            if (data && data.status === 'already_in_progress') {
                processingStatus.textContent = 'Processamento já em andamento...';
            } else {
                processingStatus.textContent = 'Processamento iniciado com JWT...';
            }
        } catch {
            processingStatus.textContent = 'Processamento iniciado...';
        }

        // Iniciar polling para acompanhar progresso
        startProgressPolling(pageUrl, button, tryFetch);

    } catch (error) {
        console.error('Erro:', error);
        showError(button, 'Erro ao conectar com API');
    }
}

// Polling de progresso
async function startProgressPolling(pageUrl, button, tryFetch) {
    let lastProgress = 0;
    let uiInterval = null;

    pollingInterval = setInterval(async () => {
        try {
            const response = await tryFetch('/api/status', { method: 'GET' });
            const status = await response.json();

            const progressFill = document.getElementById('progress-fill');
            const processingStatus = document.getElementById('processing-status');
            const processingTitle = document.getElementById('processing-title');
            const processingResult = document.getElementById('processing-result');

            if (status.processing) {
                // Atualizar progresso
                const percent = status.progress || lastProgress;
                progressFill.style.width = `${Math.min(percent, 90)}%`;
                const stepText = status.current_step || 'Processando...';
                processingStatus.textContent = stepText;
                lastProgress = percent;

                // Atualizar terminal
                updateTerminalLog(stepText, 'info');
            } else {
                // Processamento concluído
                clearInterval(pollingInterval);
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }

                progressFill.style.width = '100%';
                processingTitle.textContent = '✅ Concluído!';
                processingStatus.textContent = 'Processamento finalizado com sucesso!';
                processingResult.style.display = 'block';

                // Salvar dados do relatório
                const videoId = pageUrl.split('/').pop();
                reportData = {
                    domain: new URL(pageUrl).hostname,
                    videoId: videoId
                };

                // Reabilitar botão
                button.disabled = false;
                button.textContent = '✅ Processado';
                button.style.background = '#4CAF50';
            }
        } catch (error) {
            console.error('Erro no polling:', error);
        }
    }, 2000); // Poll a cada 2 segundos

    // UI refresh from storage (persiste ao fechar/abrir popup) - NÃO atualiza timer aqui para evitar flickering
    const timerEl = document.getElementById('processing-timer');
    uiInterval = setInterval(async () => {
        try {
            const st = await chrome.storage.local.get(['currentSession']);
            const sess = st.currentSession;
            if (sess && sess.status === 'processing') {
                const percent = sess.progress || lastProgress;
                document.getElementById('progress-fill').style.width = `${Math.min(percent, 90)}%`;
                document.getElementById('processing-status').textContent = sess.currentStep || 'Processando...';
                // Timer é atualizado pelo timerInterval local, não aqui (evita flickering)
            } else if (sess && sess.status === 'completed') {
                clearInterval(uiInterval);
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
                document.getElementById('progress-fill').style.width = '100%';
                document.getElementById('processing-title').textContent = '✅ Concluído!';
                document.getElementById('processing-status').textContent = 'Processamento finalizado com sucesso!';
                document.getElementById('processing-result').style.display = 'block';
                // botão
                button.disabled = false;
                button.textContent = '✅ Processado';
                button.style.background = '#4CAF50';
            }
        } catch (e) {
            // silencioso
        }
    }, 1000);
}

function showError(button, message) {
    const processingTitle = document.getElementById('processing-title');
    const processingStatus = document.getElementById('processing-status');
    const progressFill = document.getElementById('progress-fill');

    processingTitle.textContent = '❌ Erro';
    processingStatus.textContent = message;
    progressFill.style.width = '0%';
    progressFill.style.background = '#f44336';

    button.disabled = false;
    button.textContent = '▶️ PROCESSAR';
    button.style.background = '#4CAF50';

    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    setTimeout(() => {
        document.getElementById('processing-section').style.display = 'none';
    }, 3000);
}

// Variável para evitar duplicação de logs e rastrear etapa atual
let lastLogMessage = '';
let lastStepType = '';

// Função para atualizar o terminal com logs
function updateTerminalLog(message, type = 'info') {
    const terminalOutput = document.getElementById('terminal-output');
    if (!terminalOutput) return;

    // Detectar tipo de etapa baseado na mensagem
    let stepType = 'default';
    let icon = '▶';
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('resolvendo') || lowerMsg.includes('manifest') || lowerMsg.includes('fonte')) {
        stepType = 'resolve';
        icon = '🔍';
    } else if (lowerMsg.includes('baixando') || lowerMsg.includes('download') || lowerMsg.includes('ffmpeg') || lowerMsg.includes('áudio')) {
        stepType = 'download';
        icon = '📥';
    } else if (lowerMsg.includes('transcrev') || lowerMsg.includes('whisper') || lowerMsg.includes('🎤')) {
        stepType = 'transcription';
        icon = '🎤';
    } else if (lowerMsg.includes('resumo') || lowerMsg.includes('gemini') || lowerMsg.includes('openrouter') || lowerMsg.includes('ia') || lowerMsg.includes('🤖')) {
        stepType = 'summarize';
        icon = '🤖';
    } else if (lowerMsg.includes('salvando') || lowerMsg.includes('relatório') || lowerMsg.includes('json') || lowerMsg.includes('📝')) {
        stepType = 'output';
        icon = '📝';
    } else if (lowerMsg.includes('sucesso') || lowerMsg.includes('concluído') || lowerMsg.includes('✅')) {
        stepType = 'success';
        icon = '✅';
        type = 'success';
    } else if (lowerMsg.includes('erro') || lowerMsg.includes('falha') || lowerMsg.includes('❌')) {
        stepType = 'error';
        icon = '❌';
        type = 'error';
    } else if (lowerMsg.includes('aviso') || lowerMsg.includes('warning') || lowerMsg.includes('⚠️')) {
        stepType = 'warning';
        icon = '⚠️';
        type = 'warning';
    } else if (lowerMsg.includes('processando')) {
        stepType = 'processing';
        icon = '⏳';
    }

    // Evitar duplicação: log apenas se mudou de etapa ou mensagem é diferente
    if (stepType === lastStepType && message === lastLogMessage) return;

    // Se mudou de etapa, sempre logar
    if (stepType !== lastStepType || message !== lastLogMessage) {
        lastLogMessage = message;
        lastStepType = stepType;

        const timestamp = new Date().toLocaleTimeString('pt-BR');

        const logLine = document.createElement('div');
        logLine.className = `log-line log-${type}`;
        logLine.innerHTML = `<span style="color: #888;">[${timestamp}]</span> ${icon} ${message}`;

        terminalOutput.appendChild(logLine);

        // Auto-scroll para o final
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
}

// Event listener para botão de ver relatório e checkbox de auto-process
document.addEventListener('DOMContentLoaded', () => {
    const viewReportBtn = document.getElementById('view-report-btn');
    if (viewReportBtn) {
        viewReportBtn.addEventListener('click', async () => {
            if (reportData && reportData.domain && reportData.videoId) {
                // Usar a mesma URL do botão "Ver" na biblioteca: /view/{domain}/{videoId}
                // Remover query string do videoId se houver
                const cleanVideoId = reportData.videoId.split('?')[0];
                const reportUrl = `http://127.0.0.1:5000/view/${reportData.domain}/${cleanVideoId}`;
                window.open(reportUrl, '_blank');
            } else if (currentProcessingUrl) {
                // Fallback: extrair domínio e videoId da URL de processamento
                try {
                    const url = new URL(currentProcessingUrl);
                    const domain = url.hostname;
                    const pathParts = url.pathname.split('/');
                    // Pegar último segmento e remover query string
                    const videoId = (pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2]).split('?')[0];
                    if (domain && videoId) {
                        const reportUrl = `http://127.0.0.1:5000/view/${domain}/${videoId}`;
                        window.open(reportUrl, '_blank');
                    } else {
                        window.open('http://127.0.0.1:5000/v2', '_blank');
                    }
                } catch (e) {
                    window.open('http://127.0.0.1:5000/v2', '_blank');
                }
            } else {
                window.open('http://127.0.0.1:5000/v2', '_blank');
            }
        });
    }

    // Checkbox de auto-process
    const checkbox = document.getElementById('autoProcessCheckbox');
    if (checkbox) {
        // Carregar estado salvo
        chrome.storage.local.get(['autoProcess'], function (result) {
            checkbox.checked = result.autoProcess || false;
        });

        // Salvar estado quando alterado
        checkbox.addEventListener('change', function () {
            chrome.storage.local.set({ autoProcess: this.checked });
            console.log('[Video Extractor] Auto-process:', this.checked ? 'ATIVADO' : 'desativado');
        });
    }

    // Toggle do terminal
    const terminalToggle = document.getElementById('terminal-toggle');
    const terminalOutput = document.getElementById('terminal-output');
    if (terminalToggle && terminalOutput) {
        terminalToggle.addEventListener('click', () => {
            const isVisible = terminalOutput.style.display !== 'none';
            terminalOutput.style.display = isVisible ? 'none' : 'block';
            terminalToggle.textContent = isVisible ? '🖥️ Mostrar Terminal' : '🖥️ Ocultar Terminal';
        });
    }

    // Recuperar sessão ao abrir popup e ouvir mudanças
    function checkAndRestoreSession() {
        chrome.storage.local.get(['currentSession']).then((st) => {
            const sess = st.currentSession;
            if (sess && (sess.status === 'processing' || sess.processing)) {

                // Se UI já estiver visível, não fazer nada (evitar reset)
                if (document.getElementById('processing-section').style.display === 'block') {
                    return;
                }

                const processingSection = document.getElementById('processing-section');
                const processingTitle = document.getElementById('processing-title');
                const processingStatus = document.getElementById('processing-status');
                const progressFill = document.getElementById('progress-fill');
                const processingResult = document.getElementById('processing-result');
                const processingTimer = document.getElementById('processing-timer');
                const videoUrlEl = document.getElementById('video-url');

                processingSection.style.display = 'block';
                processingResult.style.display = 'none';
                processingTitle.textContent = '⏳ Processando...';
                processingStatus.textContent = sess.currentStep || 'Retomando sessão...';
                progressFill.style.width = (sess.progress || 0) + '%';

                // Restaurar URL do vídeo
                if (videoUrlEl && sess.pageUrl) {
                    videoUrlEl.textContent = sess.pageUrl;
                }

                // Restaurar timer baseado no startedAtISO da sessão
                if (sess.startedAtISO) {
                    processingStartTime = new Date(sess.startedAtISO).getTime();
                } else {
                    processingStartTime = Date.now();
                }

                if (timerInterval) clearInterval(timerInterval);
                timerInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
                    const mins = Math.floor(elapsed / 60);
                    const secs = elapsed % 60;
                    const hours = Math.floor(mins / 60);
                    const displayMins = mins % 60;
                    if (processingTimer) {
                        if (hours > 0) {
                            processingTimer.textContent = `⏱ ${String(hours).padStart(2, '0')}:${String(displayMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                        } else {
                            processingTimer.textContent = `⏱ ${String(displayMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                        }
                    }
                }, 1000);

                // iniciar polling de status
                const mockButton = { disabled: true, textContent: '⏳ Processando...', style: {} };
                startProgressPolling(sess.pageUrl, mockButton, async (path, opts) => {
                    return await fetch('http://localhost:5000' + path, { method: 'GET', cache: 'no-store' });
                });
            }
        });
    }

    // Verificar ao carregar
    checkAndRestoreSession();

    // Ouvir mudanças no storage (para reagir ao auto-process com popup aberto)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.currentSession) {
            const newValue = changes.currentSession.newValue;
            if (newValue && newValue.status === 'processing') {
                checkAndRestoreSession();
            }
        }
    });

});
