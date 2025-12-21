// Extension Manifests Display
// Adiciona funcionalidade para mostrar manifests capturados pela extensão

// Função auxiliar para truncar URLs
function truncateUrl(url) {
    if (!url) return '';
    if (url.length > 60) {
        return url.substring(0, 30) + '...' + url.substring(url.length - 25);
    }
    return url;
}

// Rastrear estado de processamento por URL
const processingState = {
    queue: [],           // Array de URLs na fila
    current: null,       // URL sendo processada atualmente
    completed: new Set() // Set de URLs concluídas
};

// Função para carregar e exibir manifests
async function loadExtensionManifests() {
    try {
        const response = await fetch('/api/manifests');
        const manifests = await response.json();

        const container = document.getElementById('manifests-list');
        const section = document.getElementById('extension-manifests-section');

        // Sempre mostrar a seção
        section.classList.remove('hidden');

        if (!manifests || manifests.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-ink/60">
                    <div class="text-4xl mb-3">📭</div>
                    <p class="font-bold">Nenhum manifest capturado</p>
                    <p class="text-sm mt-2">Use a extensão do navegador para capturar vídeos</p>
                </div>
            `;
            return;
        }

        container.innerHTML = manifests.map(m => {
            const capturedDate = new Date(m.timestamp);
            const now = new Date();
            const diffMinutes = Math.floor((now - capturedDate) / (1000 * 60));
            const minutesAgo = diffMinutes;
            const timeText = minutesAgo === 0 ? 'agora' : `${minutesAgo}min atrás`;

            // Metadados adicionais
            const videoTitle = (m.videoTitle && m.videoTitle.trim() !== '')
                ? m.videoTitle
                : (m.pageTitle && m.pageTitle.trim() !== '')
                    ? m.pageTitle
                    : m.domain || 'Título não detectado';
            const hasMaterials = m.supportMaterials && m.supportMaterials.length > 0;
            const materialsHtml = hasMaterials ? `
                <div style="margin-top: 12px; padding: 10px; background: #f0f9ff; border-left: 3px solid #0ea5e9; border-radius: 6px;">
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

            return `
                <div class="border-2 border-ink rounded-lg p-4 shadow-retro" style="border-left: 4px solid #10b981; background: white">
                    <!-- Domain -->
                    <div style="font-family: 'Space Grotesk', sans-serif; font-weight: 700; color: #10b981; font-size: 12px; margin-bottom: 6px;">
                        🌐 ${m.domain}
                    </div>
                    
                    <!-- Video Title -->
                    <div style="font-weight: 600; color: #1e40af; margin: 4px 0; font-size: 14px;">
                        🎬 ${videoTitle}
                    </div>
                    
                    <!-- Page URL -->
                    <div style="font-size: 11px; color: #059669; margin: 6px 0; word-break: break-all;">
                        🔗 <a href="${m.pageUrl}" target="_blank" style="color: #059669; text-decoration: none; font-weight: 500;" title="Abrir página do vídeo">
                            ${truncateUrl(m.pageUrl)}
                        </a>
                    </div>
                    
                    <!-- Manifest URL -->
                    <div style="font-size: 10px; color: #666; font-family: monospace; margin: 6px 0; word-break: break-all;">
                        ${truncateUrl(m.manifestUrl)}
                    </div>
                    
                    <!-- Time -->
                    <div style="color: #666; font-size: 11px; margin: 8px 0;">
                        📅 ${new Date(m.timestamp).toLocaleString('pt-BR')} (${timeText})
                    </div>
                    
                    <!-- Support Materials -->
                    ${materialsHtml}
                    
                    <!-- Action Buttons (condicionais baseados no estado) -->
                    <div class="flex flex-wrap gap-2 pt-3 border-t-2 border-ink/10 mt-3">
                        ${(() => {
                    // Se está processando
                    if (processingState.current === m.pageUrl) {
                        return `
                                    <button onclick="cancelProcessing('${m.pageUrl.replace(/'/g, "\\'")}')" 
                                            class="btn-retro text-xs px-3 py-1.5"
                                            style="background: #ef4444; color: white;"
                                            title="Cancelar processamento">
                                        ❌ Cancelar
                                    </button>
                                `;
                    }
                    // Se está na fila
                    else if (processingState.queue.includes(m.pageUrl)) {
                        const position = processingState.queue.indexOf(m.pageUrl) + 1;
                        return `
                                    <button onclick="removeFromQueue('${m.pageUrl.replace(/'/g, "\\'")}')" 
                                            class="btn-retro text-xs px-3 py-1.5"
                                            style="background: #f59e0b; color: white;"
                                            title="Remover da fila">
                                        🗑️ Remover (Fila ${position})
                                    </button>
                                `;
                    }
                    // Se está idle/completed
                    else {
                        return `
                                    <button onclick="processManifest('${m.pageUrl.replace(/'/g, "\\'")}')" 
                                            class="btn-retro btn-primary text-xs px-3 py-1.5"
                                            title="Processar vídeo agora">
                                        ▶️ Processar
                                    </button>
                                `;
                    }
                })()}
                        <button onclick="copyManifest('${m.manifestUrl.replace(/'/g, "\\'")}')" 
                                class="btn-retro btn-secondary text-xs px-3 py-1.5"
                                title="Copiar manifest URL">
                            📋 Copiar
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
    // Usar window.event para pegar o evento global
    const evt = window.event;
    const button = evt ? evt.target.closest('button') : null;

    if (!button) {
        navigator.clipboard.writeText(manifestUrl).then(() => {
            showToast('📋 Manifest copiado!', 'success');
        });
        return;
    }

    const originalText = button.innerHTML;

    navigator.clipboard.writeText(manifestUrl).then(() => {
        button.innerHTML = '✅ Copiado!';
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        button.innerHTML = '❌ Erro';
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    });
}

// Função para processar manifest (integrada com fila)
async function processManifest(pageUrl) {
    console.log('[Queue] processManifest chamado para:', pageUrl);

    // Verificar se já está processando ou na fila
    if (processingState.current === pageUrl) {
        showToast('⚠️ Este vídeo já está sendo processado', 'warning');
        return;
    }

    if (processingState.queue.includes(pageUrl)) {
        showToast('⚠️ Este vídeo já está na fila', 'warning');
        return;
    }

    // Se não há processamento ativo, iniciar imediatamente
    if (!processingState.current) {
        processingState.current = pageUrl;
        console.log('[Queue] Iniciando processamento imediato:', pageUrl);

        // Adicionar URL ao campo de input
        const urlsInput = document.getElementById('urls-input');
        if (urlsInput) {
            urlsInput.value = pageUrl;
            if (typeof validateInput === 'function') {
                validateInput();
            }
        }

        // Atualizar botão
        updateButtonState(pageUrl, 'processing');

        // Scroll para seção de input
        const inputZone = document.getElementById('input-zone');
        if (inputZone) {
            inputZone.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Aguardar scroll e iniciar processamento
        setTimeout(() => {
            if (typeof startProcessing === 'function') {
                startProcessing();
            } else {
                console.error('[Queue] startProcessing function not found');
                showToast('❌ Erro ao iniciar processamento', 'error');
            }
        }, 800);
    } else {
        // Adicionar à fila (agora é async)
        const added = await addToProcessingQueue(pageUrl);
        if (added) {
            const position = processingState.queue.length;
            showToast(`📋 Adicionado à fila (posição ${position})`, 'info');
        }
    }
}

// Função para atualizar manifests
function refreshManifests() {
    loadExtensionManifests();
    showToast('🔄 Manifests atualizados', 'info');
}

// ===== GERENCIAMENTO DE FILA DE PROCESSAMENTO =====

async function addToProcessingQueue(pageUrl) {
    if (processingState.current === pageUrl || processingState.queue.includes(pageUrl)) {
        console.log('[Queue] URL já está processando ou na fila:', pageUrl);
        return false;
    }

    try {
        // Chamar API do backend para adicionar à fila
        const response = await fetch('/api/queue/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: pageUrl })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Atualizar estado local
            processingState.queue.push(pageUrl);
            console.log('[Queue] Adicionado à fila:', pageUrl, '| Posição:', data.position);
            updateButtonState(pageUrl, 'queued');
            return true;
        } else {
            console.error('[Queue] Erro ao adicionar à fila:', data.error);
            showToast('❌ ' + (data.error || 'Erro ao adicionar à fila'), 'error');
            return false;
        }
    } catch (error) {
        console.error('[Queue] Erro de conexão:', error);
        showToast('❌ Erro ao conectar com o servidor', 'error');
        return false;
    }
}

function startNextInQueue() {
    if (processingState.queue.length === 0) {
        processingState.current = null;
        console.log('[Queue] Fila vazia');
        return;
    }

    const nextUrl = processingState.queue.shift();
    processingState.current = nextUrl;
    console.log('[Queue] Iniciando próximo da fila:', nextUrl);
    updateButtonState(nextUrl, 'processing');

    // Preencher input e iniciar processamento
    const urlsInput = document.getElementById('urls-input');
    if (urlsInput) {
        urlsInput.value = nextUrl;
        if (typeof validateInput === 'function') {
            validateInput();
        }
    }

    // Scroll para seção de input
    const inputSection = document.getElementById('input-zone');
    if (inputSection) {
        inputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setTimeout(() => {
        if (typeof startProcessing === 'function') {
            startProcessing();
        } else {
            console.error('[Queue] startProcessing function not found');
            showToast('❌ Erro ao iniciar processamento', 'error');
        }
    }, 800);
}

function updateButtonState(pageUrl, state) {
    // Recarregar manifests para atualizar botões
    loadExtensionManifests();
}

function onVideoProcessingComplete(pageUrl) {
    console.log('[Queue] Vídeo concluído:', pageUrl);
    processingState.completed.add(pageUrl);
    processingState.current = null;

    // Atualizar botão do vídeo concluído
    updateButtonState(pageUrl, 'completed');

    // Iniciar próximo da fila
    if (processingState.queue.length > 0) {
        console.log('[Queue] Iniciando próximo da fila...');
        setTimeout(() => startNextInQueue(), 1000);
    }
}

async function removeFromQueue(pageUrl) {
    console.log('[Queue] Tentando remover da fila:', pageUrl);

    try {
        // Chamar API do backend para remover da fila
        const response = await fetch('/api/queue/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: pageUrl })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Atualizar estado local
            const index = processingState.queue.indexOf(pageUrl);
            if (index !== -1) {
                processingState.queue.splice(index, 1);
            }
            console.log('[Queue] Removido da fila:', pageUrl);

            // Atualizar todos os botões
            loadExtensionManifests();
            showToast('🗑️ Removido da fila', 'success');
            return true;
        } else {
            console.error('[Queue] Erro ao remover da fila:', data.error);
            showToast('❌ ' + (data.error || 'Erro ao remover da fila'), 'error');
            return false;
        }
    } catch (error) {
        console.error('[Queue] Erro de conexão:', error);
        showToast('❌ Erro ao conectar com o servidor', 'error');
        return false;
    }
}

async function cancelProcessing(pageUrl) {
    if (processingState.current !== pageUrl) {
        console.warn('[Queue] Tentativa de cancelar vídeo que não está processando');
        return false;
    }

    try {
        console.log('[Queue] Cancelando processamento:', pageUrl);

        // Chamar API para cancelar processamento Python
        const response = await fetch('/api/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: pageUrl })
        });

        if (response.ok) {
            processingState.current = null;

            // Esconder UI de progresso
            const progressCard = document.getElementById('progress-card');
            const inputZone = document.getElementById('input-zone');
            if (progressCard) progressCard.classList.add('hidden');
            if (inputZone) inputZone.classList.remove('hidden');

            // Atualizar botões
            loadExtensionManifests();

            showToast('❌ Processamento cancelado', 'warning');

            // Iniciar próximo da fila
            if (processingState.queue.length > 0) {
                setTimeout(() => startNextInQueue(), 1000);
            }
            return true;
        } else {
            const error = await response.json();
            showToast(`❌ Erro ao cancelar: ${error.error || 'Desconhecido'}`, 'error');
        }
    } catch (error) {
        console.error('[Queue] Erro ao cancelar:', error);
        showToast('❌ Erro ao cancelar processamento', 'error');
    }
    return false;
}

// Expor funções globalmente
window.onVideoProcessingComplete = onVideoProcessingComplete;
window.cancelProcessing = cancelProcessing;
window.removeFromQueue = removeFromQueue;

// Variável para callback do modal
let cleanupModalCallback = null;

// Função para mostrar modal de confirmação customizado
function showCleanupModal(title, message, icon, callback) {
    const modal = document.getElementById('cleanup-confirm-modal');
    const titleEl = document.getElementById('cleanup-modal-title');
    const messageEl = document.getElementById('cleanup-modal-message');
    const iconEl = document.getElementById('cleanup-modal-icon');
    const dropdown = document.getElementById('cleanup-dropdown');

    titleEl.textContent = title;
    messageEl.textContent = message;
    iconEl.textContent = icon;

    // Fechar dropdown se estiver aberto
    if (dropdown) {
        dropdown.classList.add('hidden');
    }

    cleanupModalCallback = callback;
    modal.classList.remove('hidden');
}

// Função para fechar modal
function closeCleanupModal(confirmed) {
    const modal = document.getElementById('cleanup-confirm-modal');
    modal.classList.add('hidden');

    if (cleanupModalCallback) {
        // Salvar callback e limpar ANTES de executar para suportar modais aninhados
        const cb = cleanupModalCallback;
        cleanupModalCallback = null;
        cb(confirmed);
    }
}

// Função para limpar manifests antigos
async function cleanupManifests() {
    const hoursInput = document.getElementById('cleanup-hours');
    const hours = parseInt(hoursInput?.value || '24');

    if (hours < 1 || hours > 720) {
        showToast('❌ Horas deve estar entre 1 e 720', 'error');
        return;
    }

    const hoursText = hours === 1 ? '1 hora' : `${hours} horas`;

    showCleanupModal(
        'Limpar Manifests Antigos',
        `Deseja limpar todos os manifests com mais de ${hoursText}?`,
        '🗑️',
        async (confirmed) => {
            if (!confirmed) return;

            try {
                const response = await fetch('/api/manifests/cleanup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ hours: hours })
                });

                const result = await response.json();

                if (response.ok) {
                    showToast(`✅ ${result.removed} manifests removidos! ${result.remaining} restantes.`, 'success');
                    loadExtensionManifests();
                } else {
                    showToast(`❌ Erro: ${result.error}`, 'error');
                }
            } catch (error) {
                console.error('Erro ao limpar manifests:', error);
                showToast('❌ Erro ao limpar manifests', 'error');
            }
        }
    );
}

// Função para limpar TODOS os manifests
async function cleanupAllManifests() {
    showCleanupModal(
        '⚠️ ATENÇÃO: Limpar TUDO',
        'Deseja limpar TODOS os manifests capturados? Esta ação não pode ser desfeita!',
        '🗑️',
        (confirmed) => {
            if (!confirmed) return;

            // Segunda confirmação
            showCleanupModal(
                'Confirmação Final',
                'Tem certeza absoluta? Todos os manifests serão removidos permanentemente.',
                '⚠️',
                async (finalConfirmed) => {
                    if (!finalConfirmed) return;

                    try {
                        const response = await fetch('/api/manifests/cleanup-all', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });

                        const result = await response.json();

                        if (response.ok) {
                            showToast(`✅ Todos os manifests foram removidos! (${result.removed} itens)`, 'success');
                            loadExtensionManifests();
                        } else {
                            showToast(`❌ Erro: ${result.error}`, 'error');
                        }
                    } catch (error) {
                        console.error('Erro ao limpar todos os manifests:', error);
                        showToast('❌ Erro ao limpar manifests', 'error');
                    }
                }
            );
        }
    );
}

// Função para toggle do dropdown de limpeza
function toggleCleanupDropdown() {
    const dropdown = document.getElementById('cleanup-dropdown');
    dropdown.classList.toggle('hidden');
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('cleanup-dropdown');
    const button = document.getElementById('cleanup-dropdown-btn');

    if (dropdown && button && !dropdown.contains(event.target) && !button.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

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

// Sincronizar estado de processamento com o servidor
async function syncProcessingState() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();

        console.log('[Queue] Sincronizando estado com servidor:', status);

        if (status.is_processing || status.processing) {
            // Há processamento ativo
            processingState.current = status.current_url || null;
            processingState.queue = status.queue || [];
            console.log('[Queue] Estado restaurado:', processingState);
        } else {
            // Nenhum processamento ativo
            processingState.current = null;
            processingState.queue = [];
        }
    } catch (error) {
        console.error('[Queue] Erro ao sincronizar estado:', error);
    }
}

// Carregar manifests ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    // Primeiro sincronizar o estado de processamento com o servidor
    await syncProcessingState();

    // Depois carregar os manifests (com botões corretos baseados no estado)
    loadExtensionManifests();

    // Atualizar a cada 30 segundos
    setInterval(async () => {
        await syncProcessingState();
        loadExtensionManifests();
    }, 30000);
});
