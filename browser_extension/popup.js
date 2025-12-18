// Script do popup - Video Processor Pro Extension

function loadManifests() {
    // Obter URL da aba atual para destacar
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTabUrl = tabs[0]?.url || '';

        chrome.runtime.sendMessage({ action: 'getManifests' }, function (response) {
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
                <div class="manifest-item" style="border-left: 4px solid ${minutesAgo > 1 ? '#ff9800' : '#4CAF50'}">
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
                    <div class="manifest-actions" style="margin-top: 10px;">
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

            // Event listeners para botões de recarregar página
            document.querySelectorAll('.reload-page-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const originalText = this.innerHTML;
                    this.innerHTML = '⏳ Recarregando...';
                    this.disabled = true;

                    // Recarregar a aba ativa
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0]) {
                            chrome.tabs.reload(tabs[0].id);

                            // Mostrar modal informativo e fechar popup
                            setTimeout(() => {
                                showInfoModal(
                                    '✅ Página Recarregada!',
                                    '📌 Aguarde o vídeo carregar e abra o popup novamente para ver o m3u8 capturado.',
                                    () => window.close()
                                );
                            }, 300);
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
async function loadPrompts() {
    const selector = document.getElementById('promptModelSelect');

    // Carregar seleção salva
    const saved = await chrome.storage.local.get(['selectedPrompt']);
    const savedPrompt = saved.selectedPrompt;

    chrome.runtime.sendMessage({ action: 'getPrompts' }, (response) => {
        if (response && response.success && response.prompts) {
            const prompts = response.prompts;

            if (prompts.length === 0) {
                selector.innerHTML = '<option value="">❌ Nenhum prompt disponível</option>';
                return;
            }

            // Popular dropdown
            selector.innerHTML = '';
            prompts.forEach(prompt => {
                const option = document.createElement('option');
                option.value = prompt.name;
                const icon = prompt.valid ? '✅' : '❌';
                option.textContent = `${icon} ${prompt.name}`;
                option.disabled = !prompt.valid;
                if (savedPrompt === prompt.name || (!savedPrompt && prompt.valid)) {
                    option.selected = true;
                }
                selector.appendChild(option);
            });

            // Atualizar listeners
            selector.onchange = async () => {
                const selected = selector.value;
                await chrome.storage.local.set({ selectedPrompt: selected });
                updatePromptInfo(selected);
            };

            // Mostrar info inicial
            updatePromptInfo(selector.value);

        } else {
            console.error('Erro ao carregar prompts:', response?.error);
            selector.innerHTML = '<option value="">❌ Erro de conexão</option>';
        }
    });
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

    // Carregar prompts disponíveis
    loadPrompts();


    // Refresh button - força nova captura da aba ativa
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '⏳ Capturando...';
            refreshBtn.disabled = true;

            // Timeout de 10 segundos
            const timeout = setTimeout(() => {
                refreshBtn.innerHTML = '⏱️ Timeout';
                setTimeout(() => {
                    refreshBtn.innerHTML = originalText;
                    refreshBtn.disabled = false;
                }, 2000);
            }, 10000);

            // Solicitar ao background para forçar nova captura
            chrome.runtime.sendMessage({ action: 'forceRecapture' }, (response) => {
                clearTimeout(timeout);

                if (chrome.runtime.lastError) {
                    console.error('[Popup] Erro ao enviar mensagem:', chrome.runtime.lastError);
                    refreshBtn.innerHTML = '❌ Erro';
                    setTimeout(() => {
                        refreshBtn.innerHTML = originalText;
                        refreshBtn.disabled = false;
                    }, 2000);
                    return;
                }

                if (response && response.success) {
                    refreshBtn.innerHTML = '✅ Capturado!';
                    setTimeout(() => {
                        loadManifests();
                        refreshBtn.innerHTML = originalText;
                        refreshBtn.disabled = false;
                    }, 1000);
                } else {
                    refreshBtn.innerHTML = '❌ Erro';
                    console.error('[Popup] Erro na resposta:', response);
                    setTimeout(() => {
                        refreshBtn.innerHTML = originalText;
                        refreshBtn.disabled = false;
                    }, 2000);
                }
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

