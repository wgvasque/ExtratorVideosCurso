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

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
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
