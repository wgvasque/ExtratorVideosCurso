// Script do popup - Video Processor Pro Extension

// Função reutilizável para lidar com clique de copiar
function handleCopyClick(event) {
    const btn = event.currentTarget;
    const url = btn.getAttribute('data-url');

    if (!url) return;

    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✅ Copiado!';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.warn('Clipboard API failed, trying fallback:', err);
            copyToClipboardFallback(url, btn);
        });
    } else {
        copyToClipboardFallback(url, btn);
    }
}

// Função de confirmação com modal customizado (estilo do sistema)
function showPopupConfirmModal(title, message) {
    return new Promise((resolve) => {
        // Criar overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;

        overlay.innerHTML = `
            <div style="
                background: white;
                border: 3px solid #2D3436;
                border-radius: 12px;
                padding: 0;
                max-width: 320px;
                width: 90%;
                box-shadow: 6px 6px 0px 0px #2D3436;
                overflow: hidden;
            ">
                <div style="
                    background: linear-gradient(135deg, #FF6B6B, #ff8a80);
                    padding: 12px 16px;
                    border-bottom: 3px solid #2D3436;
                ">
                    <h3 style="
                        font-family: 'Space Grotesk', sans-serif;
                        font-weight: 700;
                        color: white;
                        margin: 0;
                        font-size: 14px;
                        text-shadow: 1px 1px 0 #2D3436;
                    ">${title}</h3>
                </div>
                <div style="padding: 16px;">
                    <p style="
                        font-size: 12px;
                        color: #2D3436;
                        margin: 0 0 16px 0;
                        line-height: 1.5;
                    ">${message}</p>
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button id="modal-cancel-btn" style="
                            padding: 8px 16px;
                            border: 2px solid #2D3436;
                            border-radius: 6px;
                            background: #e0e0e0;
                            color: #2D3436;
                            font-weight: 600;
                            font-size: 11px;
                            cursor: pointer;
                            box-shadow: 2px 2px 0px 0px #2D3436;
                        ">Cancelar</button>
                        <button id="modal-confirm-btn" style="
                            padding: 8px 16px;
                            border: 2px solid #2D3436;
                            border-radius: 6px;
                            background: #FF6B6B;
                            color: white;
                            font-weight: 600;
                            font-size: 11px;
                            cursor: pointer;
                            box-shadow: 2px 2px 0px 0px #2D3436;
                        ">Confirmar</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(false);
        });

        overlay.querySelector('#modal-confirm-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
        });
    });
}

// Função para abrir o relatório (consistente com library.js)
window.viewReport = function (domain, id) {
    const viewUrl = `http://127.0.0.1:5000/view/${encodeURIComponent(domain)}/${encodeURIComponent(id)}`;
    chrome.tabs.create({ url: viewUrl });
};

// Funções para cancelar/remover da fila na aba Captura
async function cancelProcessingFromCapture(url) {
    const confirmed = await showPopupConfirmModal(
        '❌ Cancelar Processamento?',
        'Tem certeza que deseja cancelar o processamento deste vídeo?'
    );
    if (!confirmed) return;

    try {
        const API_HOSTS = ['http://localhost:5000', 'http://127.0.0.1:5000'];
        for (const host of API_HOSTS) {
            try {
                const response = await fetch(`${host}/api/cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (response.ok) {
                    showToast('Processamento cancelado!', 'success');
                    loadManifests(); // Recarregar aba Captura
                    break;
                }
            } catch (e) {
                continue;
            }
        }
    } catch (e) {
        console.error('Erro ao cancelar:', e);
        showToast('Erro ao cancelar processamento', 'error');
    }
}

async function removeFromQueueCapture(url) {
    const confirmed = await showPopupConfirmModal(
        '🗑️ Remover da Fila?',
        'Tem certeza que deseja remover este vídeo da fila de processamento?'
    );
    if (!confirmed) return;

    try {
        const API_HOSTS = ['http://localhost:5000', 'http://127.0.0.1:5000'];
        for (const host of API_HOSTS) {
            try {
                const response = await fetch(`${host}/api/queue/remove`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                if (response.ok) {
                    showToast('Removido da fila!', 'success');
                    loadManifests(); // Recarregar aba Captura
                    if (currentActiveTab === 'manifests') loadAllManifestsTab();
                    break;
                }
            } catch (e) {
                continue;
            }
        }
    } catch (e) {
        console.error('Erro ao remover da fila:', e);
        showToast('Erro ao remover da fila', 'error');
    }
}

// Funções para aba Manifests (reutilizáveis e compatíveis com delegação)
async function deleteManifestAction(pageUrl) {
    const confirmed = await showPopupConfirmModal(
        '🗑️ Excluir Manifest?',
        'Tem certeza que deseja excluir este manifest capturado?'
    );
    if (confirmed) {
        chrome.runtime.sendMessage({ action: 'removeManifest', pageUrl }, () => {
            if (chrome.runtime.lastError) console.warn('Port closed during removeManifest:', chrome.runtime.lastError.message);
            loadAllManifestsTab();
            if (currentActiveTab === 'capture') loadManifests();
        });
    }
}

async function processManifestAction(pageUrl, btnElement) {
    if (btnElement) {
        btnElement.disabled = true;
        btnElement.innerHTML = '⏳ Iniciando...';
    }

    try {
        const API_HOSTS = ['http://localhost:5000', 'http://127.0.0.1:5000'];
        for (const host of API_HOSTS) {
            try {
                const response = await fetch(`${host}/api/process`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls: [pageUrl] })
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.added_to_queue) {
                        showToast(`Adicionado à fila (posição ${result.queue_position || '?'})`, 'info');
                    } else {
                        showToast('Processamento iniciado!', 'success');
                    }
                    setTimeout(() => loadAllManifestsTab(), 500);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
    } catch (e) {
        console.error('Erro ao iniciar processamento:', e);
        showToast('Erro ao iniciar processamento', 'error');
        loadAllManifestsTab();
    }
}

async function cancelProcessingAction(pageUrl) {
    const confirmed = await showPopupConfirmModal(
        '❌ Cancelar Processamento?',
        'Tem certeza que deseja cancelar o processamento deste vídeo?'
    );
    if (confirmed) {
        try {
            const API_HOSTS = ['http://localhost:5000', 'http://127.0.0.1:5000'];
            for (const host of API_HOSTS) {
                try {
                    const response = await fetch(`${host}/api/cancel`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (response.ok) {
                        showToast('Processamento cancelado!', 'success');
                        loadAllManifestsTab();
                        if (currentActiveTab === 'capture') loadManifests();
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
        } catch (e) {
            console.error('Erro ao cancelar:', e);
            showToast('Erro ao cancelar processamento', 'error');
        }
    }
}

function loadManifests() {
    // Obter URL da aba atual para destacar
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTabUrl = tabs[0]?.url || '';

        chrome.runtime.sendMessage({ action: 'getManifests' }, function (response) {
            if (chrome.runtime.lastError) {
                console.warn('[Video Extractor] Falha ao obter manifests:', chrome.runtime.lastError.message);
                return;
            }
            const allManifests = response.manifests || [];
            const listDiv = document.getElementById('manifestList');

            // Filtrar apenas manifest da aba atual
            const currentTabManifest = allManifests.find(m => m.pageUrl === currentTabUrl);
            const otherTabsCount = allManifests.length - (currentTabManifest ? 1 : 0);

            // Mostrar badge se houver vídeos em outras abas
            const otherTabsBadge = otherTabsCount > 0 ? `
                <div style="margin-bottom: 12px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 6px;">
                    <div style="font-size: 12px; color: #856404; font-weight: 600;">
                        📚 ${otherTabsCount} vídeo${otherTabsCount > 1 ? 's' : ''} capturado${otherTabsCount > 1 ? 's' : ''} em outra${otherTabsCount > 1 ? 's' : ''} aba${otherTabsCount > 1 ? 's' : ''}
                    </div>
                    <div style="font-size: 10px; color: #856404; margin-top: 4px;">
                        Troque de aba para ver ${otherTabsCount > 1 ? 'os outros vídeos' : 'o outro vídeo'}
                    </div>
                </div>
            ` : '';

            if (!currentTabManifest) {
                listDiv.innerHTML = otherTabsBadge + `
                <div class="empty-state">
                    <div class="icon">🎬</div>
                    <p>Nenhum vídeo capturado nesta aba.<br>Acesse uma página com vídeo!</p>
                </div>
            `;
                return;
            }

            // Mostrar apenas manifest da aba atual
            const manifests = [currentTabManifest];

            listDiv.innerHTML = otherTabsBadge + manifests.map((m, index) => {
                const capturedDate = new Date(m.timestamp);
                const now = new Date();
                const minutesAgo = Math.floor((now - capturedDate) / 60000);
                const timeText = minutesAgo === 0 ? 'agora' : `${minutesAgo}min atrás`;

                // Metadados adicionais
                const videoTitle = m.videoTitle || m.pageTitle || m.domain || 'Título não detectado';
                const hasMaterials = m.supportMaterials && m.supportMaterials.length > 0;
                const materialsHtml = hasMaterials ? `
                <div class="manifest-materials" style="margin-top: 8px; padding: 8px; background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 4px;">
                    <strong style="font-size: 11px; color: #0369a1;">📎 Material de Apoio (${m.supportMaterials.length}):</strong>
                    ${m.supportMaterials.slice(0, 3).map(mat => `
                        <div style="font-size: 10px; margin-top: 4px;">
                            <a href="${mat.url}" target="_blank" style="color: #0284c7; text-decoration: none;">
                                ${mat.type} - ${mat.text.substring(0, 40)}${mat.text.length > 40 ? '...' : ''}
                            </a>
                        </div>
                    `).join('')}
                    ${m.supportMaterials.length > 3 ? `<div style="font-size: 10px; color: #666; margin-top: 4px;">+${m.supportMaterials.length - 3} mais...</div>` : ''}
                </div>
            ` : '';

                // Verificar se tem manifestUrl (m3u8)
                const hasManifestUrl = m.manifestUrl && m.manifestUrl.trim() !== '';

                // Se não tem m3u8, mostrar aviso
                if (!hasManifestUrl) {
                    return `
                    <div class="manifest-item" style="border-left: 4px solid #ff9800; background: #fff3e0;">
                        <div class="manifest-domain">🌐 ${m.domain}</div>
                        <div class="manifest-video-title" style="font-weight: 600; color: #1e40af; margin: 4px 0; font-size: 13px;">
                            🎬 ${videoTitle}
                        </div>
                        <div class="manifest-page-url" style="font-size: 11px; color: #059669; margin: 4px 0; word-break: break-all;">
                            🔗 <a href="${m.pageUrl}" target="_blank" style="color: #059669; text-decoration: none;" title="Abrir página do vídeo">
                                ${truncateUrl(m.pageUrl)}
                            </a>
                        </div>
                        <div style="margin: 12px 0; padding: 10px; background: #fff; border-radius: 6px; border: 1px solid #ff9800;">
                            <div style="font-size: 12px; color: #e65100; font-weight: 600; margin-bottom: 6px;">⚠️ Vídeo não capturado</div>
                            <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
                                O link do vídeo (m3u8) ainda não foi detectado. Isso pode acontecer se:
                                <ul style="margin: 4px 0 4px 16px; padding: 0;">
                                    <li>O vídeo não foi reproduzido ainda</li>
                                    <li>A página carregou após a extensão</li>
                                </ul>
                            </div>
                            <button class="btn btn-warning btn-sm reload-page-btn" 
                                    data-index="${index}"
                                    style="width: 100%; background: #ff9800; color: white; border: none;">
                                🔄 Recarregar Página e Capturar
                            </button>
                        </div>
                        ${materialsHtml}
                        <div class="manifest-time" style="color: #666; font-size: 11px;">
                            📅 ${formatTime(m.timestamp)} (${timeText})
                        </div>
                    </div>
                `;
                }



                return `
                <div class="manifest-item" style="border-left: 4px solid ${minutesAgo > 1 ? '#ff9800' : '#4CAF50'}" data-page-url="${m.pageUrl}">
                    <div class="manifest-domain">🌐 ${m.domain}</div>
                    <div class="manifest-video-title" style="font-weight: 600; color: #1e40af; margin: 4px 0; font-size: 13px;">
                        🎬 ${videoTitle}
                    </div>
                    <div class="manifest-page-url" style="font-size: 11px; color: #059669; margin: 4px 0; word-break: break-all;">
                        🔗 <a href="${m.pageUrl}" target="_blank" style="color: #059669; text-decoration: none;" title="Abrir página do vídeo">
                            ${truncateUrl(m.pageUrl)}
                        </a>
                    </div>
                    <div class="manifest-url">${truncateUrl(m.manifestUrl)}</div>
                    <div class="manifest-time" style="color: #666">
                        📅 ${formatTime(m.timestamp)} (${timeText})
                    </div>
                    ${materialsHtml}
                    
                    <!-- Área de ações - será atualizada após verificar relatório -->
                    <div class="manifest-actions" style="margin-top: 10px;" data-actions-for="${m.pageUrl}">
                        <button class="btn btn-info btn-sm refresh-btn" 
                                title="Recarregar informações da página (título, materiais)">
                            🔄 Recarregar Info
                        </button>
                        <button class="btn btn-primary btn-sm process-btn" 
                                data-url="${m.pageUrl}" 
                                data-manifest="${m.manifestUrl}"
                                title="Processar vídeo agora">
                            ▶️ Processar
                        </button>
                        <button class="btn btn-secondary btn-sm test-btn" 
                                data-url="${m.manifestUrl}" 
                                title="Copiar manifest">
                            📋 Copiar
                        </button>
                    </div>
                </div>
            `;
            }).join('');

            // Verificar relatórios existentes para todos os manifests
            const manifestUrls = manifests.map(m => m.pageUrl);
            chrome.runtime.sendMessage({ action: 'checkReports', urls: manifestUrls }, async (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('[Video Extractor] Falha ao verificar relatórios:', chrome.runtime.lastError.message);
                    return;
                }
                if (response && response.success && response.reports) {
                    // Atualizar ações para cada manifest com relatório existente
                    for (const [url, reportInfo] of Object.entries(response.reports)) {
                        if (reportInfo.has_report) {
                            const actionsDiv = document.querySelector(`[data-actions-for="${url}"]`);
                            if (actionsDiv) {
                                actionsDiv.innerHTML = `
                                    <div style="padding: 10px; background: #e8f5e9; border-radius: 6px; border: 1px solid #4CAF50; margin-bottom: 8px;">
                                        <div style="font-size: 11px; color: #2e7d32; font-weight: 600;">
                                            ✅ Este vídeo já foi processado.
                                        </div>
                                        <div style="font-size: 10px; color: #666; margin-top: 4px;">
                                            Para reprocessar, utilize a tela de relatório ou exclua-o da biblioteca.
                                        </div>
                                    </div>
                                    <button class="btn btn-pop btn-sm view-report-btn" style="flex: 1;" data-domain="${reportInfo.domain}" data-video-id="${reportInfo.video_id}">
                                        📊 Ver Relatório
                                    </button>
                                    <button class="btn btn-secondary btn-sm test-btn" 
                                            data-url="${document.querySelector(`[data-page-url="${url}"] .manifest-url`)?.textContent || ''}" 
                                            title="Copiar manifest">
                                        📋 Copiar
                                    </button>
                                `;
                            }
                        }
                    }

                    // Re-adicionar event listeners para botões de copiar (os novos)
                    document.querySelectorAll('.test-btn').forEach(btn => {
                        btn.removeEventListener('click', handleCopyClick);
                        btn.addEventListener('click', handleCopyClick);
                    });
                }

                // Verificar status de processamento para atualizar botões
                try {
                    const API_HOSTS = ['http://localhost:5000', 'http://127.0.0.1:5000'];
                    for (const host of API_HOSTS) {
                        try {
                            const statusResponse = await fetch(`${host}/api/status`, { cache: 'no-store' });
                            if (statusResponse.ok) {
                                const processingStatus = await statusResponse.json();

                                // Atualizar botões para URLs em processamento ou fila
                                for (const url of manifestUrls) {
                                    const actionsDiv = document.querySelector(`[data-actions-for="${url}"]`);
                                    if (!actionsDiv) continue;

                                    // Não sobrescrever se já tem relatório
                                    if (actionsDiv.querySelector('.btn-pop[href*="localhost"]')) continue;

                                    const isProcessing = processingStatus.is_processing && processingStatus.current_url === url;
                                    const isInQueue = processingStatus.queue && processingStatus.queue.includes(url);
                                    const queuePosition = isInQueue ? processingStatus.queue.indexOf(url) + 1 : 0;

                                    if (isProcessing) {
                                        actionsDiv.innerHTML = `
                                            <div style="padding: 10px; background: #fff3cd; border-radius: 6px; border: 1px solid #f59e0b; margin-bottom: 8px;">
                                                <div style="font-size: 11px; color: #92400e; font-weight: 600;">
                                                    ⏳ Este vídeo está sendo processado...
                                                </div>
                                            </div>
                                            <button class="btn btn-sm btn-cancel-cap" style="background: #ef4444; color: white;" data-url="${url}">
                                                ❌ Cancelar
                                            </button>
                                            <button class="btn btn-secondary btn-sm test-btn" 
                                                    data-url="${document.querySelector(`[data-page-url="${url}"] .manifest-url`)?.textContent || ''}" 
                                                    title="Copiar manifest">
                                                📋 Copiar
                                            </button>
                                        `;
                                    } else if (isInQueue) {
                                        actionsDiv.innerHTML = `
                                            <div style="padding: 10px; background: #dbeafe; border-radius: 6px; border: 1px solid #3b82f6; margin-bottom: 8px;">
                                                <div style="font-size: 11px; color: #1e40af; font-weight: 600;">
                                                    🔄 Na fila de processamento (posição ${queuePosition})
                                                </div>
                                            </div>
                                            <button class="btn btn-sm btn-remove-queue-cap" style="background: #f59e0b; color: white;" data-url="${url}">
                                                🗑️ Remover (Fila ${queuePosition})
                                            </button>
                                            <button class="btn btn-secondary btn-sm test-btn" 
                                                    data-url="${document.querySelector(`[data-page-url="${url}"] .manifest-url`)?.textContent || ''}" 
                                                    title="Copiar manifest">
                                                📋 Copiar
                                            </button>
                                        `;
                                    }
                                }

                                // Re-adicionar event listeners
                                document.querySelectorAll('.test-btn').forEach(btn => {
                                    btn.removeEventListener('click', handleCopyClick);
                                    btn.addEventListener('click', handleCopyClick);
                                });
                                break;
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                } catch (e) {
                    console.warn('Erro ao verificar status de processamento:', e);
                }
            });

            // Event listeners para botões de atualizar
            document.querySelectorAll('.refresh-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    refreshMetadata(this);
                });
            });

            // Event listeners para botões de copiar
            document.querySelectorAll('.test-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const url = this.getAttribute('data-url');

                    // Try modern clipboard API first
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(url).then(() => {
                            const originalText = this.innerHTML;
                            this.innerHTML = '✅ Copiado!';
                            setTimeout(() => {
                                this.innerHTML = originalText;
                            }, 2000);
                        }).catch(err => {
                            console.warn('Clipboard API failed, trying fallback:', err);
                            // Fallback to execCommand
                            copyToClipboardFallback(url, this);
                        });
                    } else {
                        // Use fallback directly
                        copyToClipboardFallback(url, this);
                    }
                });
            });

            // Event listeners para botões de processar
            document.querySelectorAll('.process-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    if (this.disabled) return;

                    const pageUrl = this.getAttribute('data-url');
                    const manifestUrl = this.getAttribute('data-manifest');

                    if (typeof processVideoWithUI === 'function') {
                        processVideoWithUI(pageUrl, manifestUrl, this);
                    } else {
                        console.error('processVideoWithUI não está definida');
                    }
                });
            });

            // Reaplicar estado dos botões baseado no prompt selecionado
            const selector = document.getElementById('promptModelSelect');
            if (selector && selector.value) {
                updateProcessButtonStateExtension(selector.value);
            }

            // Event listeners para botões de recarregar página
            document.querySelectorAll('.reload-page-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const originalText = this.innerHTML;
                    this.innerHTML = '⏳ Recarregando...';
                    this.disabled = true;

                    // Recarregar a aba ativa
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0]) {
                            // Avisar background que vamos recarregar manualmente e queremos capturar
                            console.log('Enviando expectManualCapture para tab:', tabs[0].id);
                            chrome.runtime.sendMessage({
                                action: 'expectManualCapture',
                                tabId: tabs[0].id
                            }, () => {
                                if (chrome.runtime.lastError) console.warn('Expected lastError on manual capture:', chrome.runtime.lastError.message);
                            });

                            // Delay maior para garantir que a mensagem foi processada
                            setTimeout(() => {
                                console.log('Recarregando tab:', tabs[0].id);
                                chrome.tabs.reload(tabs[0].id);

                                // Mostrar modal informativo e fechar popup
                                setTimeout(() => {
                                    showInfoModal(
                                        '✅ Página Recarregada!',
                                        '📌 A captura foi autorizada manualmente.\nAguarde o vídeo carregar.',
                                        () => window.close()
                                    );
                                }, 300);
                            }, 200);
                        }
                    });
                });
            });
        });
    });
}

// Fallback function for copying to clipboard using execCommand
function copyToClipboardFallback(text, button) {
    try {
        // Create temporary textarea
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);

        // Select and copy
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile

        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (successful) {
            const originalText = button.innerHTML;
            button.innerHTML = '✅ Copiado!';
            setTimeout(() => {
                button.innerHTML = originalText;
            }, 2000);
        } else {
            button.innerHTML = '❌ Erro';
            console.error('execCommand copy failed');
        }
    } catch (err) {
        button.innerHTML = '❌ Erro';
        console.error('Fallback copy error:', err);
    }
}

// Função para atualizar metadados
function refreshMetadata(button) {
    const originalText = button.innerHTML;
    button.innerHTML = '⏳ Atualizando...';
    button.disabled = true;

    chrome.runtime.sendMessage({ action: 'refreshMetadata' }, (response) => {
        if (chrome.runtime.lastError) {
            button.innerHTML = '❌ Erro';
            console.error('Erro de porta fechada ao atualizar:', chrome.runtime.lastError.message);
            button.disabled = false;
            return;
        }
        if (response && response.success) {
            button.innerHTML = '✅ Atualizado!';
            setTimeout(() => {
                loadManifests(); // Recarregar lista
            }, 500);
        } else {
            button.innerHTML = '❌ Erro';
            console.error('Erro ao atualizar:', response?.error);
        }

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 2000);
    });
}

function truncateUrl(url) {
    if (url.length > 60) {
        return url.substring(0, 30) + '...' + url.substring(url.length - 25);
    }
    return url;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR');
}

// Carregar prompts disponíveis da API
// Carregar prompts disponíveis da API via Background (evita Mixed Content)
// Variável global para rastrear prompts disponíveis
let availablePromptsData = [];

async function loadPrompts() {
    const selector = document.getElementById('promptModelSelect');

    // Carregar seleção salva
    const saved = await chrome.storage.local.get(['selectedPrompt']);
    const savedPrompt = saved.selectedPrompt;

    chrome.runtime.sendMessage({ action: 'getPrompts' }, (response) => {
        if (response && response.success && response.prompts) {
            const prompts = response.prompts;
            availablePromptsData = prompts; // Guardar para uso posterior

            const defaultTemplate = response.default_template || 'modelo2';
            const defaultValid = response.default_valid;

            if (prompts.length === 0) {
                selector.innerHTML = '<option value="">❌ Nenhum prompt disponível</option>';
                return;
            }

            // Popular dropdown - permitir selecionar todos
            selector.innerHTML = '';
            let selectedValue = null;

            prompts.forEach(prompt => {
                const option = document.createElement('option');
                option.value = prompt.name;
                const icon = prompt.valid ? '✅' : '❌';
                option.textContent = `${icon} ${prompt.name}`;
                option.disabled = false; // Permitir selecionar todos

                // Prioridade: salvo > padrão válido > primeiro válido
                if (savedPrompt === prompt.name) {
                    option.selected = true;
                    selectedValue = prompt.name;
                } else if (!selectedValue && defaultValid && prompt.name === defaultTemplate) {
                    option.selected = true;
                    selectedValue = prompt.name;
                } else if (!selectedValue && prompt.valid) {
                    option.selected = true;
                    selectedValue = prompt.name;
                }
                selector.appendChild(option);
            });

            // Atualizar listeners
            selector.onchange = async () => {
                const selected = selector.value;
                await chrome.storage.local.set({ selectedPrompt: selected });
                updatePromptInfo(selected);
                updateProcessButtonStateExtension(selected);
            };

            // Mostrar info inicial e verificar estado do botão
            updatePromptInfo(selector.value);
            updateProcessButtonStateExtension(selector.value);

        } else {
            console.error('Erro ao carregar prompts:', response?.error);
            selector.innerHTML = '<option value="">❌ Erro de conexão</option>';
        }
    });
}

// Atualizar estado do botão de processamento na extensão
function updateProcessButtonStateExtension(promptName) {
    // Buscar todos os botões de processar (criados dinamicamente)
    const processButtons = document.querySelectorAll('.process-btn');
    const promptInfo = document.getElementById('promptInfo');

    const prompt = availablePromptsData.find(p => p.name === promptName);

    if (!prompt) return;

    // Aplicar estado a todos os botões de processar
    processButtons.forEach(btn => {
        if (prompt.valid) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.title = 'Processar vídeo capturado';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.title = `Prompt "${prompt.name}" é inválido - selecione um prompt válido`;
        }
    });

    // Mostrar info automaticamente quando inválido
    if (!prompt.valid && promptInfo) {
        promptInfo.style.display = 'block';
    }
}

// Atualizar informações do prompt selecionado
async function updatePromptInfo(promptName) {
    const promptInfo = document.getElementById('promptInfo');

    if (!promptName) {
        promptInfo.style.display = 'none';
        return;
    }

    chrome.runtime.sendMessage({ action: 'getPromptDetails', promptName: promptName }, (response) => {
        if (response && response.success && response.details) {
            const details = response.details;
            promptInfo.style.display = 'block';
            promptInfo.innerHTML = `
                <strong>${details.validation.valid ? '✅' : '❌'} ${details.name}</strong><br>
                ${details.metadata.description || 'Sem descrição'}
                ${details.validation.valid ? '' : '<br><span style="color: #f44336;">⚠️ Prompt inválido</span>'}
            `;
        } else {
            console.error('Erro ao carregar info do prompt:', response?.error);
            promptInfo.style.display = 'none';
        }
    });
}

// Track API status and monitoring interval
let currentApiStatus = null;
let apiMonitorInterval = null;

// Check API connection and show/hide UI accordingly
async function checkApiConnection() {
    const apiErrorContainer = document.getElementById('api-error-container');
    const mainContent = document.getElementById('main-content');
    const tabs = document.querySelector('.tabs');

    // Try to reach the API health endpoint
    return new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage({ action: 'checkApiHealth' }, (response) => {
                // Check if extension context is still valid
                if (chrome.runtime.lastError) {
                    console.warn('[Video Processor] Extension context lost, stopping monitoring');
                    stopApiMonitoring();
                    resolve(false);
                    return;
                }

                const isConnected = response && response.success;

                // Only update UI if status changed
                if (currentApiStatus !== isConnected) {
                    currentApiStatus = isConnected;

                    if (isConnected) {
                        // API is reachable
                        apiErrorContainer.style.display = 'none';
                        mainContent.style.display = 'block';
                        tabs.style.display = 'flex';

                        // Reload content when API comes back online
                        if (typeof loadPrompts === 'function') loadPrompts();
                        if (typeof loadManifests === 'function') loadManifests();
                    } else {
                        // API is unreachable
                        apiErrorContainer.style.display = 'block';
                        mainContent.style.display = 'none';
                        tabs.style.display = 'none';
                    }
                }

                resolve(isConnected);
            });
        } catch (error) {
            console.warn('[Video Processor] Error checking API:', error);
            stopApiMonitoring();
            resolve(false);
        }
    });
}

// Start periodic API monitoring
function startApiMonitoring() {
    // Clear any existing interval
    if (apiMonitorInterval) {
        clearInterval(apiMonitorInterval);
    }

    // Check every 5 seconds
    apiMonitorInterval = setInterval(async () => {
        await checkApiConnection();
    }, 5000);
}

// Stop API monitoring
function stopApiMonitoring() {
    if (apiMonitorInterval) {
        clearInterval(apiMonitorInterval);
        apiMonitorInterval = null;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    // Window Controls (Overlay Mode) - Setup FIRST, before API check
    const btnMinimize = document.getElementById('btn-minimize');
    const btnClose = document.getElementById('btn-close');
    const header = document.querySelector('.header');

    if (btnMinimize) {
        btnMinimize.addEventListener('click', (e) => {
            e.stopPropagation();
            window.parent.postMessage({ action: 'MINIMIZE' }, '*');
        });
    }

    if (btnClose) {
        btnClose.addEventListener('click', (e) => {
            e.stopPropagation();
            window.parent.postMessage({ action: 'CLOSE' }, '*');
        });
    }

    if (header) {
        header.style.cursor = 'move';
        header.addEventListener('mousedown', (e) => {
            // Prevent drag if clicking buttons
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

            e.preventDefault(); // Prevent text selection
            window.parent.postMessage({
                action: 'DRAG_START',
                screenX: e.screenX,
                screenY: e.screenY
            }, '*');
        });
    }

    // Check API connection
    const apiAvailable = await checkApiConnection();

    // Start periodic monitoring
    startApiMonitoring();

    // Setup retry button
    const retryBtn = document.getElementById('retry-connection-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
            retryBtn.innerHTML = '⏳ Verificando...';
            retryBtn.disabled = true;

            const connected = await checkApiConnection();

            if (connected) {
                // Connection restored - monitoring will handle UI updates
                retryBtn.innerHTML = '✅ Conectado!';
                setTimeout(() => {
                    retryBtn.innerHTML = '🔄 Tentar Novamente';
                    retryBtn.disabled = false;
                }, 1500);
            } else {
                retryBtn.innerHTML = '❌ Ainda indisponível';
                setTimeout(() => {
                    retryBtn.innerHTML = '🔄 Tentar Novamente';
                    retryBtn.disabled = false;
                }, 2000);
            }
        });
    }

    // Only load content if API is available
    if (!apiAvailable) {
        return;
    }

    // Auto-Capture Toggle - carregar estado salvo e configurar listener
    const autoCaptureCheckbox = document.getElementById('autoCaptureCheckbox');
    if (autoCaptureCheckbox) {
        // Carregar estado salvo (padrão: ativado)
        const savedState = await chrome.storage.local.get(['autoCapture']);
        const isEnabled = savedState.autoCapture !== false; // padrão true se não definido
        autoCaptureCheckbox.checked = isEnabled;

        // Listener para salvar mudanças
        autoCaptureCheckbox.addEventListener('change', async () => {
            const enabled = autoCaptureCheckbox.checked;
            await chrome.storage.local.set({ autoCapture: enabled });
            console.log('[Video Processor] Auto-captura:', enabled ? 'ativada' : 'desativada');

            // Notificar background script
            chrome.runtime.sendMessage({ action: 'setAutoCapture', enabled });
        });
    }

    // Carregar prompts disponíveis
    loadPrompts();



    // Refresh button - força nova captura da aba ativa
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '⏳ Verificando...';
            refreshBtn.disabled = true;

            // Primeiro verificar se já existe manifest para esta aba
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const currentTabUrl = tabs[0]?.url || '';

                chrome.runtime.sendMessage({ action: 'getManifests' }, (manifestResponse) => {
                    const manifests = manifestResponse?.manifests || [];
                    const existingManifest = manifests.find(m => m.pageUrl === currentTabUrl);

                    // Se já tem manifest com manifestUrl, apenas atualiza metadados
                    if (existingManifest && existingManifest.manifestUrl) {
                        refreshBtn.innerHTML = '⏳ Atualizando...';

                        chrome.runtime.sendMessage({ action: 'forceRecapture' }, (response) => {
                            if (response && response.success) {
                                refreshBtn.innerHTML = '✅ Atualizado!';
                                setTimeout(() => {
                                    loadManifests();
                                    refreshBtn.innerHTML = originalText;
                                    refreshBtn.disabled = false;
                                }, 1000);
                            } else {
                                refreshBtn.innerHTML = originalText;
                                refreshBtn.disabled = false;
                            }
                        });
                    } else {
                        // Não tem manifest ou não tem manifestUrl - perguntar antes de recarregar
                        refreshBtn.innerHTML = originalText;
                        refreshBtn.disabled = false;

                        if (tabs[0]) {
                            const tabId = tabs[0].id;

                            // Mostrar modal informativo ANTES de recarregar
                            showInfoModal(
                                '🔄 Recarregar Página?',
                                '📌 Para capturar o vídeo, a página precisa ser recarregada. Após recarregar, aguarde o vídeo carregar e clique no ícone da extensão novamente.',
                                () => {
                                    // IMPORTANTE: Enviar mensagem de captura manual ANTES de recarregar
                                    // Isso permite capturar mesmo se auto-capture estiver desativado
                                    chrome.runtime.sendMessage({
                                        action: 'expectManualCapture',
                                        tabId: tabId
                                    });

                                    // Pequeno delay para garantir que a mensagem foi processada
                                    setTimeout(() => {
                                        chrome.tabs.reload(tabId);
                                        window.close();
                                    }, 100);
                                }
                            );
                        } else {
                            refreshBtn.innerHTML = '❌ Erro';
                            setTimeout(() => {
                                refreshBtn.innerHTML = originalText;
                                refreshBtn.disabled = false;
                            }, 2000);
                        }
                    }
                });
            });
        });
    }

    // Clear button
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            showConfirmModal('Limpar todos os manifests capturados?', () => {
                chrome.runtime.sendMessage({ action: 'clearManifests' }, function () {
                    loadManifests();
                });
            });
        });
    }

    // Load manifests on popup open
    loadManifests();
});

// Função para mostrar modal de confirmação customizado
function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');

    modalMessage.textContent = message;
    modal.style.display = 'flex';

    // Handler para confirmar
    const handleConfirm = () => {
        modal.style.display = 'none';
        onConfirm();
        cleanup();
    };

    // Handler para cancelar
    const handleCancel = () => {
        modal.style.display = 'none';
        cleanup();
    };

    // Cleanup listeners
    const cleanup = () => {
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        modal.removeEventListener('click', handleOverlayClick);
    };

    // Handler para clicar fora do modal
    const handleOverlayClick = (e) => {
        if (e.target === modal) {
            handleCancel();
        }
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    modal.addEventListener('click', handleOverlayClick);
}

// Função para mostrar modal informativo (sem botão cancelar)
function showInfoModal(title, message, onOk) {
    const modal = document.getElementById('confirmModal');
    const modalTitle = document.querySelector('.modal-title');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmBtn.textContent = '✅ OK';
    cancelBtn.style.display = 'none'; // Esconder botão cancelar
    modal.style.display = 'flex';

    // Handler para OK
    const handleOk = () => {
        modal.style.display = 'none';
        cancelBtn.style.display = ''; // Restaurar botão cancelar
        confirmBtn.textContent = '✅ Confirmar'; // Restaurar texto
        modalTitle.textContent = 'Confirmar Ação'; // Restaurar título
        if (onOk) onOk();
        cleanup();
    };

    // Cleanup listeners
    const cleanup = () => {
        confirmBtn.removeEventListener('click', handleOk);
        modal.removeEventListener('click', handleOverlayClick);
    };

    // Handler para clicar fora do modal
    const handleOverlayClick = (e) => {
        if (e.target === modal) {
            handleOk();
        }
    };

    confirmBtn.addEventListener('click', handleOk);
    modal.addEventListener('click', handleOverlayClick);
}

// ============================================
// FUNÇÕES DE CONFIGURAÇÕES
// ============================================

// Variáveis globais para configurações e credenciais
let credentialsData = {};

// Carregar configurações da API
async function loadSettingsFromApi() {
    // Valores padrão
    const defaults = {
        ia_provider: 'gemini',
        use_fallback: true,
        whisper_model: 'small',
        whisper_device: 'cpu',
        sumarios_dir: 'sumarios',
        cache_ttl: 168
    };

    try {
        const response = await fetch('http://localhost:5000/api/settings');
        if (response.ok) {
            const data = await response.json();

            // API Keys e Status
            if (data.gemini_api_key) {
                document.getElementById('settings-gemini-key').value = data.gemini_api_key;
                document.getElementById('gemini-key-status').innerHTML = '<span style="color: #22c55e; font-weight: bold;">✅ Configurada</span>';
            } else {
                document.getElementById('gemini-key-status').innerHTML = '<span style="color: #f59e0b;">⚠️ Não configurada</span>';
            }

            if (data.openrouter_api_key) {
                document.getElementById('settings-openrouter-key').value = data.openrouter_api_key;
                document.getElementById('openrouter-key-status').innerHTML = '<span style="color: #22c55e; font-weight: bold;">✅ Configurada</span>';
            } else {
                document.getElementById('openrouter-key-status').innerHTML = '<span style="color: #666;">Opcional - não configurada</span>';
            }

            // Campos de IA e Whisper
            document.getElementById('settings-ia-provider').value = data.ia_provider || defaults.ia_provider;
            document.getElementById('settings-fallback').checked = data.use_fallback !== false;
            document.getElementById('settings-whisper-model').value = data.whisper_model || defaults.whisper_model;
            document.getElementById('settings-whisper-device').value = data.whisper_device || defaults.whisper_device;

            // Sistema
            document.getElementById('settings-sumarios-dir').value = data.sumarios_dir || defaults.sumarios_dir;
            document.getElementById('settings-cache-ttl').value = data.cache_ttl || defaults.cache_ttl;

            // Popular select de prompts e definir valor nas configurações
            await populateConfigPromptSelector(data.prompt_model || 'modelo2');

            // Carregar credenciais por domínio
            await loadCredentials();
        }
    } catch (e) {
        console.error('Erro ao carregar configurações:', e);
        document.getElementById('gemini-key-status').innerHTML = '<span style="color: #ef4444;">❌ Erro ao carregar</span>';
    }
}

// Popular o select de prompts na aba de configurações
async function populateConfigPromptSelector(currentValue) {
    const selector = document.getElementById('settings-prompt-model');
    const statusDiv = document.getElementById('settings-prompt-status');
    if (!selector) return;

    try {
        const response = await fetch('http://localhost:5000/prompts');
        const data = await response.json();

        selector.innerHTML = '';

        if (!data.prompts || data.prompts.length === 0) {
            selector.innerHTML = '<option value="">❌ Nenhum prompt disponível</option>';
            return;
        }

        data.prompts.forEach(prompt => {
            const option = document.createElement('option');
            option.value = prompt.name;
            const icon = prompt.valid ? '✅' : '❌';
            const sections = `(${prompt.sections}/14 seções)`;
            option.textContent = `${icon} ${prompt.name} ${sections}`;
            selector.appendChild(option);
        });

        selector.onchange = () => {
            const selected = data.prompts.find(p => p.name === selector.value);
            updateConfigPromptStatus(selected, statusDiv);
        };

        if (currentValue && data.prompts.find(p => p.name === currentValue)) {
            selector.value = currentValue;
        } else {
            const firstValid = data.prompts.find(p => p.valid);
            selector.value = firstValid ? firstValid.name : data.prompts[0].name;
        }

        const initial = data.prompts.find(p => p.name === selector.value);
        updateConfigPromptStatus(initial, statusDiv);

    } catch (e) {
        console.error('Erro ao popular prompts:', e);
    }
}

function updateConfigPromptStatus(prompt, statusDiv) {
    if (!statusDiv || !prompt) return;
    if (prompt.valid) {
        statusDiv.innerHTML = `<div style="background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 8px; padding: 8px; margin-top: 8px; font-size: 10px; color: #047857;">✅ <strong>Prompt válido</strong> - ${prompt.sections}/14 seções</div>`;
    } else {
        statusDiv.innerHTML = `<div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 8px; margin-top: 8px; font-size: 10px; color: #b91c1c;">❌ <strong>Prompt inválido</strong> - Faltam seções obrigatórias</div>`;
    }
}

// Lógica de Credenciais por Domínio
async function loadCredentials() {
    try {
        const response = await fetch('http://localhost:5000/api/credentials');
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
        container.innerHTML = '<div style="text-align: center; color: #999; font-size: 10px; padding: 10px;">Nenhuma credencial configurada.</div>';
        return;
    }

    container.innerHTML = domains.map((domain, index) => `
        <div class="credential-item" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; margin-bottom: 8px;" data-domain="${domain}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <input type="text" value="${domain}" 
                    class="domain-input"
                    style="flex: 1; padding: 4px 6px; border: 1px solid var(--ink); border-radius: 4px; font-size: 10px; font-family: monospace;">
                <button class="remove-credential-btn" style="color: #ef4444; border: none; background: none; cursor: pointer; font-size: 12px; margin-left: 6px;">✕</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <input type="text" value="${credentialsData[domain].email || ''}" 
                    placeholder="Email/Login" 
                    class="email-input"
                    style="padding: 4px; border: 1px solid var(--ink); border-radius: 4px; font-size: 9px;">
                <input type="password" value="${credentialsData[domain].senha || ''}" 
                    placeholder="Senha" 
                    class="password-input"
                    style="padding: 4px; border: 1px solid var(--ink); border-radius: 4px; font-size: 9px;">
            </div>
        </div>
    `).join('');

    // Adicionar listeners para os elementos criados dinamicamente
    container.querySelectorAll('.credential-item').forEach(item => {
        const domain = item.getAttribute('data-domain');
        const domainInput = item.querySelector('.domain-input');
        const removeBtn = item.querySelector('.remove-credential-btn');
        const emailInput = item.querySelector('.email-input');
        const passInput = item.querySelector('.password-input');

        domainInput.onchange = (e) => updateCredentialDomain(domain, e.target.value);
        removeBtn.onclick = () => removeCredential(domain);
        emailInput.onchange = (e) => {
            credentialsData[domain].email = e.target.value;
            markSettingsChanged();
        };
        passInput.onchange = (e) => {
            credentialsData[domain].senha = e.target.value;
            markSettingsChanged();
        };
    });
}

function addCredential() {
    const domain = prompt('Domínio plataforma (ex: alunos.segueadii.com.br):');
    if (domain && domain.trim()) {
        const d = domain.trim();
        if (!credentialsData[d]) {
            credentialsData[d] = { email: '', senha: '' };
            renderCredentialsList();
        }
    }
}

function removeCredential(domain) {
    if (confirm(`Remover credenciais de ${domain}?`)) {
        delete credentialsData[domain];
        renderCredentialsList();
    }
}

function updateCredentialDomain(oldDomain, newDomain) {
    if (newDomain && newDomain !== oldDomain) {
        credentialsData[newDomain] = credentialsData[oldDomain];
        delete credentialsData[oldDomain];
        renderCredentialsList();
    }
}

// Salvar tudo
async function saveSettings() {
    const btn = document.getElementById('save-settings-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Salvando...';
    btn.disabled = true;

    const settings = {
        gemini_api_key: document.getElementById('settings-gemini-key').value,
        openrouter_api_key: document.getElementById('settings-openrouter-key').value,
        ia_provider: document.getElementById('settings-ia-provider').value,
        use_fallback: document.getElementById('settings-fallback').checked,
        whisper_model: document.getElementById('settings-whisper-model').value,
        whisper_device: document.getElementById('settings-whisper-device').value,
        prompt_model: document.getElementById('settings-prompt-model').value,
        sumarios_dir: document.getElementById('settings-sumarios-dir').value,
        cache_ttl: parseInt(document.getElementById('settings-cache-ttl').value) || 168,
        openrouter_model: 'google/gemini-2.0-flash-exp:free'
    };

    try {
        // 1. Salvar configurações gerais
        const resp1 = await fetch('http://localhost:5000/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        // 2. Salvar credenciais
        const resp2 = await fetch('http://localhost:5000/api/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentialsData)
        });

        if (resp1.ok && resp2.ok) {
            showToast('✅ Configurações salvas!', 'success');
            extensionSettingsChanged = false; // Resetar flag de alterações
            setTimeout(() => loadSettingsFromApi(), 500);
        } else {
            showToast('❌ Erro ao salvar', 'error');
        }
    } catch (e) {
        showToast('❌ Erro de conexão', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function showToast(message, type) {
    const toast = document.getElementById('settings-toast');
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.background = type === 'success' ? '#def7ec' : '#fde2e2';
    toast.style.color = type === 'success' ? '#03543f' : '#9b1c1c';
    toast.style.border = `1px solid ${type === 'success' ? '#84e1bc' : '#f8b4b4'}`;

    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// Função para testar chaves (mantendo as existentes)
async function testGeminiKey() {
    const key = document.getElementById('settings-gemini-key').value;
    const status = document.getElementById('gemini-key-status');
    if (!key) { status.innerHTML = '<span style="color: #ef4444;">❌ Informe a chave</span>'; return; }
    status.innerHTML = '<span style="color: #f59e0b;">⏳ Testando...</span>';
    try {
        const resp = await fetch('http://localhost:5000/api/test_gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
        });
        const data = await resp.json();
        if (data.success) {
            status.innerHTML = '<span style="color: #22c55e;">✅ Válida!</span>';
        } else {
            status.innerHTML = `<span style="color: #ef4444;">❌ Inválida: ${data.error || 'Erro'}</span>`;
        }
    } catch (e) { status.innerHTML = '<span style="color: #ef4444;">❌ Erro de conexão</span>'; }
}

async function testOpenRouterKey() {
    const key = document.getElementById('settings-openrouter-key').value;
    const status = document.getElementById('openrouter-key-status');
    if (!key) { status.innerHTML = '<span style="color: #ef4444;">❌ Informe a chave</span>'; return; }
    status.innerHTML = '<span style="color: #f59e0b;">⏳ Testando...</span>';
    try {
        const resp = await fetch('http://localhost:5000/api/test_openrouter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
        });
        const data = await resp.json();
        if (data.success) {
            status.innerHTML = '<span style="color: #22c55e;">✅ Válida!</span>';
        } else {
            status.innerHTML = `<span style="color: #ef4444;">❌ Inválida: ${data.error || 'Erro'}</span>`;
        }
    } catch (e) { status.innerHTML = '<span style="color: #ef4444;">❌ Erro de conexão</span>'; }
}

// Flag para rastrear alterações nas configurações da extensão
let extensionSettingsChanged = false;
let currentActiveTab = 'capture';

// Configurar listeners para detectar alterações nas configurações
function setupExtensionSettingsChangeListeners() {
    const settingsInputs = document.querySelectorAll('#tab-settings input, #tab-settings select, #credentials-list input');
    settingsInputs.forEach(input => {
        input.removeEventListener('change', markSettingsChanged);
        input.removeEventListener('input', markSettingsChanged);
        input.addEventListener('change', markSettingsChanged);
        input.addEventListener('input', markSettingsChanged);
    });

    // Botão de Salvar
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.removeEventListener('click', saveSettings);
        saveBtn.addEventListener('click', saveSettings);
    }

    // Botão de Adicionar Credencial
    const addCredBtn = document.getElementById('add-credential-btn');
    if (addCredBtn) {
        addCredBtn.removeEventListener('click', addCredential);
        addCredBtn.addEventListener('click', addCredential);
    }

    // Botões de Teste
    const testGeminiBtn = document.getElementById('test-gemini-btn');
    if (testGeminiBtn) {
        testGeminiBtn.removeEventListener('click', testGeminiKey);
        testGeminiBtn.addEventListener('click', testGeminiKey);
    }
    const testOpenRouterBtn = document.getElementById('test-openrouter-btn');
    if (testOpenRouterBtn) {
        testOpenRouterBtn.removeEventListener('click', testOpenRouterKey);
        testOpenRouterBtn.addEventListener('click', testOpenRouterKey);
    }
}

function markSettingsChanged() {
    extensionSettingsChanged = true;
}

// Função para trocar de aba (usada após confirmação do modal)
function switchToTab(tabName, tabElement) {
    // Update active tab
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tabElement.classList.add('active');

    // Show corresponding panel
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('tab-' + tabName);
    if (panel) panel.classList.add('active');

    currentActiveTab = tabName;

    // Load settings when tab is opened
    if (tabName === 'settings') {
        loadSettingsFromApi();
        extensionSettingsChanged = false;
        setTimeout(setupExtensionSettingsChangeListeners, 500);
    }

    // Load manifests when manifests tab is opened
    if (tabName === 'manifests') {
        loadAllManifestsTab();
    }
}

// Função para carregar TODOS os manifests na aba Manifests (do arquivo captured_manifests.json)
async function loadAllManifestsTab() {
    const listDiv = document.getElementById('manifests-tab-list');
    if (!listDiv) return;

    // Mostrar loading
    listDiv.innerHTML = `
        <div class="empty-state">
            <div class="icon">⏳</div>
            <p>Carregando manifests...</p>
        </div>
    `;

    try {
        // Buscar manifests da API (captured_manifests.json)
        const API_HOSTS = ['http://localhost:5000', 'http://127.0.0.1:5000'];
        let manifests = [];

        for (const host of API_HOSTS) {
            try {
                const response = await fetch(`${host}/api/manifests`, { cache: 'no-store' });
                if (response.ok) {
                    manifests = await response.json();
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!manifests || manifests.length === 0) {
            listDiv.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📋</div>
                    <p>Nenhum manifest capturado.<br>Acesse páginas com vídeos!</p>
                </div>
            `;
            return;
        }

        // Verificar quais já têm relatório
        let reportInfo = {};
        try {
            const urls = manifests.map(m => m.pageUrl);
            const checkResult = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'checkReports', urls }, resolve);
            });
            if (checkResult && checkResult.success) {
                reportInfo = checkResult.reports || {};
            }
        } catch (e) {
            console.warn('Erro ao verificar relatórios:', e);
        }

        // Verificar status de processamento atual
        let processingStatus = { is_processing: false, current_url: '', queue: [] };
        try {
            const API_HOSTS = ['http://localhost:5000', 'http://127.0.0.1:5000'];
            for (const host of API_HOSTS) {
                try {
                    const statusResponse = await fetch(`${host}/api/status`, { cache: 'no-store' });
                    if (statusResponse.ok) {
                        processingStatus = await statusResponse.json();
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
        } catch (e) {
            console.warn('Erro ao verificar status:', e);
        }

        listDiv.innerHTML = manifests.map(m => {
            const capturedDate = new Date(m.timestamp);
            const now = new Date();
            const minutesAgo = Math.floor((now - capturedDate) / 60000);
            const timeText = minutesAgo === 0 ? 'agora' : `${minutesAgo}min atrás`;

            const videoTitle = m.videoTitle || m.pageTitle || m.domain || 'Título não detectado';
            const truncatedUrl = m.pageUrl.length > 50 ? m.pageUrl.substring(0, 50) + '...' : m.pageUrl;

            const hasReport = reportInfo[m.pageUrl] && reportInfo[m.pageUrl].has_report;
            const report = reportInfo[m.pageUrl] || {};

            // Verificar estados de processamento
            const isProcessing = processingStatus.is_processing && processingStatus.current_url === m.pageUrl;
            const isInQueue = processingStatus.queue && processingStatus.queue.includes(m.pageUrl);
            const queuePosition = isInQueue ? processingStatus.queue.indexOf(m.pageUrl) + 1 : 0;

            let borderColor = hasReport ? '#4CAF50' : (isProcessing ? '#f59e0b' : (isInQueue ? '#3b82f6' : '#FF6B6B'));

            let actionButtons = '';
            if (hasReport) {
                actionButtons = `
                    <div style="width: 100%; padding: 8px; background: #e8f5e9; border-radius: 6px; border: 1px solid #4CAF50; margin-bottom: 8px;">
                        <div style="font-size: 10px; color: #2e7d32; font-weight: 600;">
                            ✅ Este vídeo já foi processado.
                        </div>
                        <div style="font-size: 9px; color: #666; margin-top: 4px;">
                            Para reprocessar, utilize a tela de relatório ou exclua-o da biblioteca.
                        </div>
                    </div>
                    <button class="btn btn-pop btn-sm view-report-btn" style="flex: 1;" data-domain="${report.domain}" data-video-id="${report.video_id}">
                        📊 Ver Relatório
                    </button>
                `;
            } else if (isProcessing) {
                actionButtons = `
                    <div style="width: 100%; padding: 8px; background: #fff3cd; border-radius: 6px; border: 1px solid #f59e0b; margin-bottom: 8px;">
                        <div style="font-size: 10px; color: #92400e; font-weight: 600;">
                            ⏳ Processando agora...
                        </div>
                    </div>
                    <button class="btn btn-sm cancel-processing-btn" style="flex: 1; background: #ef4444; color: white;" data-url="${m.pageUrl.replace(/"/g, '&quot;')}">
                        ❌ Cancelar
                    </button>
                `;
            } else if (isInQueue) {
                actionButtons = `
                    <div style="width: 100%; padding: 8px; background: #dbeafe; border-radius: 6px; border: 1px solid #3b82f6; margin-bottom: 8px;">
                        <div style="font-size: 10px; color: #1e40af; font-weight: 600;">
                            🔄 Na fila (posição ${queuePosition})
                        </div>
                    </div>
                    <button class="btn btn-sm remove-from-queue-btn" style="flex: 1; background: #f59e0b; color: white;" data-url="${m.pageUrl.replace(/"/g, '&quot;')}">
                        🗑️ Remover (Fila ${queuePosition})
                    </button>
                `;
            } else {
                actionButtons = `
                    <button class="btn btn-primary btn-sm process-manifest-btn" style="flex: 1;" data-url="${m.pageUrl.replace(/"/g, '&quot;')}" data-manifest="${(m.manifestUrl || '').replace(/"/g, '&quot;')}">
                        ▶️ Processar
                    </button>
                `;
            }

            return `
                <div class="manifest-item" style="border-left: 4px solid ${borderColor};">
                    <div class="manifest-domain">🌐 ${m.domain}</div>
                    <div style="font-weight: 600; color: #1e40af; margin: 4px 0; font-size: 12px;">
                        🎬 ${videoTitle}
                    </div>
                    <div style="font-size: 10px; color: #059669; margin: 4px 0;">
                        🔗 <a href="${m.pageUrl}" target="_blank" style="color: #059669; text-decoration: none;">${truncatedUrl}</a>
                    </div>
                    <div style="font-size: 9px; color: #666; margin-top: 4px;">
                        📅 ${capturedDate.toLocaleString('pt-BR')} (${timeText})
                    </div>
                    <div style="display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap;">
                        ${actionButtons}
                        <button class="btn btn-secondary btn-sm copy-manifest-btn" data-url="${(m.manifestUrl || m.pageUrl).replace(/"/g, '&quot;')}">
                            📋 Copiar
                        </button>
                        <button class="btn btn-sm delete-manifest-btn" style="background: #ef4444; color: white;" data-url="${m.pageUrl.replace(/"/g, '&quot;')}">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // All listeners are now handled via global event delegation for CSP compliance
    } catch (error) {
        console.error('Erro ao carregar manifests:', error);
        listDiv.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <p>Erro ao carregar manifests.<br>Verifique se a API está rodando.</p>
            </div>
        `;
    }
}

// Event listeners para botões da aba Manifests e Captura
document.addEventListener('DOMContentLoaded', () => {
    // Aba Manifests
    const refreshMBtn = document.getElementById('refreshManifestsBtn');
    if (refreshMBtn) {
        refreshMBtn.addEventListener('click', loadAllManifestsTab);
    }

    const clearManifestsBtn = document.getElementById('clearAllManifestsBtn');
    if (clearManifestsBtn) {
        clearManifestsBtn.addEventListener('click', async () => {
            const confirmed = await showPopupConfirmModal(
                '🗑️ Limpar Todos?',
                'Tem certeza que deseja limpar TODOS os manifests capturados? Esta ação é irreversível.'
            );
            if (confirmed) {
                chrome.runtime.sendMessage({ action: 'clearManifests' }, () => {
                    if (chrome.runtime.lastError) console.warn('Port closed during clearManifests:', chrome.runtime.lastError.message);
                    loadAllManifestsTab();
                });
            }
        });
    }

    // Aba Captura
    const refreshCBtn = document.getElementById('refreshBtn');
    if (refreshCBtn) {
        refreshCBtn.addEventListener('click', () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.runtime.sendMessage({
                        action: 'expectManualCapture',
                        tabId: tabs[0].id
                    }, (resp1) => {
                        if (chrome.runtime.lastError) console.warn('Expected lastError:', chrome.runtime.lastError.message);

                        chrome.runtime.sendMessage({ action: 'forceRecapture' }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error('Erro ao forçar captura:', chrome.runtime.lastError.message);
                                loadManifests();
                                return;
                            }

                            if (response && response.success) {
                                showToast('🔄 Recaptura solicitada!', 'success');
                                loadManifests();
                            } else {
                                console.error('Erro ao forçar captura:', response?.error);
                                loadManifests();
                            }
                        });
                    });
                }
            });
        });
    }

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            const confirmed = await showPopupConfirmModal(
                '🗑️ Limpar Captura?',
                'Deseja limpar os vídeos capturados nesta sessão?'
            );
            if (confirmed) {
                chrome.runtime.sendMessage({ action: 'clearManifests' }, () => {
                    if (chrome.runtime.lastError) console.warn('Port closed during clearManifests (Capture):', chrome.runtime.lastError.message);
                    loadManifests();
                });
            }
        });
    }
});

// Inicializar tabs (incluindo settings)
document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');
            const targetTab = this;

            // Se estiver saindo da aba de settings com alterações, mostrar modal
            if (currentActiveTab === 'settings' && tabName !== 'settings' && extensionSettingsChanged) {
                showConfirmModal('⚠️ Você tem alterações não salvas nas configurações.\n\nDeseja sair sem salvar?', () => {
                    extensionSettingsChanged = false;
                    switchToTab(tabName, targetTab);
                });
                return;
            }

            // Troca normal de aba
            switchToTab(tabName, this);
        });
    });

    // Avisar ao fechar popup com alterações não salvas
    window.addEventListener('beforeunload', (e) => {
        if (extensionSettingsChanged) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // Delegação de evento global para botões dinâmicos (CSP Compliance)
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        // Ação: Ver Relatório
        if (target.classList.contains('view-report-btn')) {
            const domain = target.getAttribute('data-domain');
            const videoId = target.getAttribute('data-video-id');
            if (domain && videoId && typeof window.viewReport === 'function') {
                window.viewReport(domain, videoId);
            }
        }

        // Ação: Processar Manifest (Aba Manifests)
        if (target.classList.contains('process-manifest-btn')) {
            const url = target.getAttribute('data-url');
            if (url) {
                processManifestAction(url, target);
            }
        }

        // Ação: Copiar Manifest (Aba Manifests/Captura)
        if (target.classList.contains('copy-manifest-btn')) {
            handleCopyClick({ currentTarget: target });
        }

        // Ação: Excluir Manifest (Aba Manifests/Captura)
        if (target.classList.contains('delete-manifest-btn')) {
            const url = target.getAttribute('data-url');
            if (url) {
                deleteManifestAction(url);
            }
        }

        // Ação: Cancelar Processamento (Aba Manifests/Captura)
        if (target.classList.contains('cancel-processing-btn') || target.classList.contains('btn-cancel-cap')) {
            const url = target.getAttribute('data-url');
            if (url) {
                if (target.classList.contains('btn-cancel-cap')) {
                    cancelProcessingFromCapture(url);
                } else {
                    cancelProcessingAction(url);
                }
            }
        }

        // Ação: Remover da Fila (Aba Manifests/Captura)
        if (target.classList.contains('remove-from-queue-btn') || target.classList.contains('btn-remove-queue-cap')) {
            const url = target.getAttribute('data-url');
            if (url) {
                if (target.classList.contains('btn-remove-queue-cap')) {
                    removeFromQueueCapture(url);
                } else {
                    // Para Manifests tab, podemos usar a mesma função ou criar uma nova se o reload for diferente
                    removeFromQueueCapture(url);
                }
            }
        }
    });
});
