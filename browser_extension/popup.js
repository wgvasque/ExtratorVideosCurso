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

            return `
                <div class="manifest-item" style="border-left: 4px solid ${isExpired ? '#f44336' : (minutesAgo > 1 ? '#ff9800' : '#4CAF50')}">
                    <div class="manifest-domain">🌐 ${m.domain}</div>
                    <div class="manifest-url">${truncateUrl(m.manifestUrl)}</div>
                    <div class="manifest-time" style="color: ${isExpired ? '#f44336' : '#666'}">
                        📅 ${formatTime(m.timestamp)} (${timeText})
                        ${isExpired ? ' ⚠️ EXPIRADO' : ''}
                    </div>
                    <div class="manifest-actions">
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

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadManifests);
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
