// Extension Manifests Display
// Adiciona funcionalidade para mostrar manifests capturados pela extensão

// Função para carregar e exibir manifests
async function loadExtensionManifests() {
    try {
        const response = await fetch('/api/manifests');
        const manifests = await response.json();

        const container = document.getElementById('manifests-list');
        const section = document.getElementById('extension-manifests');

        if (!manifests || manifests.length === 0) {
            section.classList.add('hidden');
            return;
        }

        section.classList.remove('hidden');

        container.innerHTML = manifests.map(m => {
            const capturedDate = new Date(m.timestamp);
            const now = new Date();
            const minutesAgo = Math.floor((now - capturedDate) / 60000);
            const isExpired = minutesAgo > 2;

            let statusColor, statusText, statusBg;
            if (minutesAgo === 0) {
                statusColor = '#4CAF50';
                statusText = 'VÁLIDO (agora)';
                statusBg = '#E8F5E9';
            } else if (minutesAgo <= 1) {
                statusColor = '#4CAF50';
                statusText = `VÁLIDO (${minutesAgo}min)`;
                statusBg = '#E8F5E9';
            } else if (minutesAgo <= 2) {
                statusColor = '#FF9800';
                statusText = `EXPIRANDO (${minutesAgo}min)`;
                statusBg = '#FFF3E0';
            } else {
                statusColor = '#F44336';
                statusText = `EXPIRADO (${minutesAgo}min)`;
                statusBg = '#FFEBEE';
            }

            return `
                <div class="border-2 border-ink rounded-lg p-4" style="border-left: 4px solid ${statusColor}; background: ${statusBg}">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex-1">
                            <div class="font-mono text-sm font-bold text-ink truncate">
                                ${m.pageUrl}
                            </div>
                            <div class="text-xs text-gray-600 mt-1">
                                ${m.domain} • ${new Date(m.timestamp).toLocaleString('pt-BR')}
                            </div>
                        </div>
                        <div class="ml-4">
                            <span class="px-3 py-1 text-xs font-bold rounded" style="background: ${statusColor}; color: white;">
                                ${statusText}
                            </span>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <button onclick="useManifest('${m.pageUrl}')" 
                                class="btn-retro btn-tertiary text-xs px-3 py-1"
                                ${isExpired ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                            ${isExpired ? '⚠️ RECAPTURAR' : '✅ USAR ESTE'}
                        </button>
                        <button onclick="copyManifest('${m.manifestUrl.replace(/'/g, "\\'")}' )" 
                                class="btn-retro btn-secondary text-xs px-3 py-1">
                            📋 COPIAR URL
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar manifests:', error);
    }
}

// Função para processar vídeo diretamente
async function processVideo(pageUrl) {
    try {
        showToast('🚀 Iniciando processamento...', 'info');

        const response = await fetch('http://localhost:5000/api/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                urls: [pageUrl]
            })
        });

        if (response.ok) {
            showToast('✅ Processamento iniciado! Acompanhe na interface web.', 'success');
            // Abrir interface web
            setTimeout(() => {
                window.open('http://localhost:5000/v2', '_blank');
            }, 1000);
        } else {
            const error = await response.json();
            showToast(`❌ Erro: ${error.error || 'Falha ao processar'}`, 'error');
        }
    } catch (error) {
        console.error('Erro ao processar:', error);
        showToast('❌ Erro ao conectar com a API. Certifique-se que o servidor está rodando.', 'error');
    }
}

// Função para usar um manifest
function useManifest(pageUrl) {
    const textarea = document.getElementById('urls-input');
    const currentUrls = textarea.value.trim();

    if (currentUrls && !currentUrls.includes(pageUrl)) {
        textarea.value = currentUrls + '\n' + pageUrl;
    } else if (!currentUrls) {
        textarea.value = pageUrl;
    }

    // Trigger validation
    if (typeof validateInput === 'function') {
        validateInput();
    }

    showToast('✅ URL adicionada! Processe imediatamente (token expira em 2-5min)', 'success');
}

// Função para copiar manifest
function copyManifest(manifestUrl) {
    navigator.clipboard.writeText(manifestUrl).then(() => {
        showToast('📋 Manifest copiado!', 'success');
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        showToast('❌ Erro ao copiar', 'error');
    });
}

// Função para atualizar manifests
function refreshManifests() {
    loadExtensionManifests();
    showToast('🔄 Manifests atualizados', 'info');
}

// Função auxiliar para toast (se não existir)
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = {
        success: '#4CAF50',
        error: '#F44336',
        info: '#2196F3'
    };

    const toast = document.createElement('div');
    toast.className = 'border-2 border-ink rounded-lg p-4 shadow-retro';
    toast.style.background = colors[type] || colors.info;
    toast.style.color = 'white';
    toast.innerHTML = `<div class="font-bold text-sm">${message}</div>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Carregar manifests ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    loadExtensionManifests();

    // Atualizar a cada 30 segundos
    setInterval(loadExtensionManifests, 30000);
});
