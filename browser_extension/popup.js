// Script do popup - Video Processor Pro Extension

function loadManifests() {
    chrome.runtime.sendMessage({ action: 'getManifests' }, function (response) {
        const manifests = response.manifests || [];
        const listDiv = document.getElementById('manifestList');

        if (manifests.length === 0) {
            listDiv.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🎬</div>
                    <p>Nenhum vídeo capturado ainda.<br>Acesse uma página com vídeo!</p>
                </div>
            `;
            return;
        }

        listDiv.innerHTML = manifests.map((m, index) => {
            const capturedDate = new Date(m.timestamp);
            const now = new Date();
            const minutesAgo = Math.floor((now - capturedDate) / 60000);
            const isExpired = minutesAgo > 2;
            const statusClass = isExpired ? 'expired' : (minutesAgo > 1 ? 'warning' : 'fresh');
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
                <div class="manifest-item" style="border-left: 4px solid ${isExpired ? '#f44336' : (minutesAgo > 1 ? '#ff9800' : '#4CAF50')}">
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
                    <div class="manifest-time" style="color: ${isExpired ? '#f44336' : '#666'}">
                        📅 ${formatTime(m.timestamp)} (${timeText})
                        ${isExpired ? ' ⚠️ EXPIRADO' : ''}
                    </div>
                    ${materialsHtml}
                    <div class="manifest-actions" style="margin-top: 10px;">
                        <button class="btn btn-info btn-sm refresh-btn" 
                                title="Recarregar informações da página (título, materiais)">
                            🔄 Recarregar Info
                        </button>
                        <button class="btn ${isExpired ? 'btn-secondary' : 'btn-primary'} btn-sm process-btn" 
                                data-url="${m.pageUrl}" 
                                data-manifest="${m.manifestUrl}"
                                title="Processar vídeo agora"
                                ${isExpired ? 'disabled' : ''}>
                            ${isExpired ? '⚠️ Expirado' : '▶️ Processar'}
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
                navigator.clipboard.writeText(url).then(() => {
                    const originalText = this.innerHTML;
                    this.innerHTML = '✅ Copiado!';
                    setTimeout(() => {
                        this.innerHTML = originalText;
                    }, 2000);
                }).catch(err => {
                    console.error('Erro ao copiar:', err);
                    this.innerHTML = '❌ Erro';
                });
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
                        chrome.tabs.reload(tabs[0].id, {}, () => {
                            // Aguardar 2 segundos e recarregar manifests
                            setTimeout(() => {
                                loadManifests();
                            }, 2000);
                        });
                    }
                });
            });
        });
    });
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
async function loadPrompts() {
    const hosts = ['http://localhost:5000', 'http://127.0.0.1:5000'];
    const selector = document.getElementById('promptModelSelect');
    const promptInfo = document.getElementById('promptInfo');

    try {
        let prompts = null;
        for (const host of hosts) {
            try {
                const response = await fetch(`${host}/prompts`, { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    prompts = data.prompts;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!prompts || prompts.length === 0) {
            selector.innerHTML = '<option value="">❌ Erro ao carregar prompts</option>';
            return;
        }

        // Carregar seleção salva
        const saved = await chrome.storage.local.get(['selectedPrompt']);
        const savedPrompt = saved.selectedPrompt;

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

        // Atualizar info do prompt selecionado
        selector.addEventListener('change', async () => {
            const selected = selector.value;
            await chrome.storage.local.set({ selectedPrompt: selected });
            updatePromptInfo(selected);
        });

        // Mostrar info inicial
        updatePromptInfo(selector.value);

    } catch (error) {
        console.error('Erro ao carregar prompts:', error);
        selector.innerHTML = '<option value="">❌ Erro de conexão</option>';
    }
}

// Atualizar informações do prompt selecionado
async function updatePromptInfo(promptName) {
    const promptInfo = document.getElementById('promptInfo');

    if (!promptName) {
        promptInfo.style.display = 'none';
        return;
    }

    const hosts = ['http://localhost:5000', 'http://127.0.0.1:5000'];

    try {
        for (const host of hosts) {
            try {
                const response = await fetch(`${host}/prompts/${encodeURIComponent(promptName)}`, { cache: 'no-store' });
                if (response.ok) {
                    const details = await response.json();
                    promptInfo.style.display = 'block';
                    promptInfo.innerHTML = `
                        <strong>${details.validation.valid ? '✅' : '❌'} ${details.name}</strong><br>
                        ${details.metadata.description || 'Sem descrição'}
                        ${details.validation.valid ? '' : '<br><span style="color: #f44336;">⚠️ Prompt inválido</span>'}
                    `;
                    return;
                }
            } catch (e) {
                continue;
            }
        }
        promptInfo.style.display = 'none';
    } catch (error) {
        console.error('Erro ao carregar info do prompt:', error);
        promptInfo.style.display = 'none';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Carregar prompts disponíveis
    loadPrompts();


    // Refresh button - força nova captura da aba ativa
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '⏳ Capturando...';
            refreshBtn.disabled = true;

            // Solicitar ao background para forçar nova captura
            chrome.runtime.sendMessage({ action: 'forceRecapture' }, (response) => {
                if (response && response.success) {
                    refreshBtn.innerHTML = '✅ Capturado!';
                    setTimeout(() => {
                        loadManifests();
                        refreshBtn.innerHTML = originalText;
                        refreshBtn.disabled = false;
                    }, 1000);
                } else {
                    refreshBtn.innerHTML = '❌ Erro';
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
            if (confirm('Limpar todos os manifests capturados?')) {
                chrome.runtime.sendMessage({ action: 'clearManifests' }, function () {
                    loadManifests();
                });
            }
        });
    }

    // Load manifests on popup open
    loadManifests();
});
