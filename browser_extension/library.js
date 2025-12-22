// Library functionality for Extension
// Fetches reports from API and displays them

const API_HOSTS = ['http://localhost:5000', 'http://127.0.0.1:5000'];

// Initialize library when popup loads
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    loadReports();
    setupSearch();
});

// Setup tab navigation
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

            // Activate clicked tab
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`tab-${tabId}`).classList.add('active');

            // Refresh reports when library tab is clicked
            if (tabId === 'library') {
                loadReports();
            }
        });
    });
}

// Load reports from API
async function loadReports() {
    const reportsList = document.getElementById('reports-list');

    reportsList.innerHTML = `
        <div class="empty-state">
            <div class="icon">⏳</div>
            <p>Carregando relatórios...</p>
        </div>
    `;

    try {
        const response = await tryFetch('/api/reports');
        const reports = await response.json();

        if (!reports || reports.length === 0) {
            reportsList.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📭</div>
                    <p>Nenhum relatório encontrado.<br>Processe vídeos para gerar relatórios!</p>
                </div>
            `;
            return;
        }

        reportsList.innerHTML = reports.map(report => `
            <div class="report-item" data-title="${escapeHtml(report.title.toLowerCase())}">
                <div class="report-title" title="${escapeHtml(report.title)}">
                    ${escapeHtml(report.title)}
                </div>
                <div class="report-meta">
                    📅 ${formatDate(report.created_at)} • 🤖 ${report.model || 'N/A'}
                </div>
                <div class="report-actions">
                    <button class="btn btn-primary btn-sm view-btn" data-domain="${report.domain}" data-id="${report.id}">
                        👁️ Ver
                    </button>
                    <button class="btn btn-secondary btn-sm open-btn" data-url="${report.report_url}">
                        🌐 Abrir
                    </button>
                </div>
            </div>
        `).join('');

        // Adicionar event listeners para botões Ver
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const domain = this.getAttribute('data-domain');
                const id = this.getAttribute('data-id');
                // Abrir página standalone de visualização do relatório
                const viewUrl = `http://127.0.0.1:5000/view/${encodeURIComponent(domain)}/${encodeURIComponent(id)}`;
                chrome.tabs.create({ url: viewUrl });
            });
        });

        // Adicionar event listeners para botões Abrir
        document.querySelectorAll('.open-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                let url = this.getAttribute('data-url');
                if (url.startsWith('/')) {
                    url = 'http://127.0.0.1:5000' + url;
                }
                chrome.tabs.create({ url: url });
            });
        });

    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        reportsList.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <p>Erro ao carregar relatórios.<br>
                <button class="btn btn-secondary btn-sm retry-btn" style="margin-top: 8px;">
                    🔄 Tentar novamente
                </button></p>
            </div>
        `;

        // Event listener para retry
        document.querySelector('.retry-btn')?.addEventListener('click', loadReports);
    }
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('search-reports');
    if (searchInput) {
        searchInput.addEventListener('input', filterReports);
    }
}

// Filter reports by search term
function filterReports() {
    const searchTerm = document.getElementById('search-reports').value.toLowerCase();
    const reports = document.querySelectorAll('#reports-list .report-item');

    reports.forEach(report => {
        const title = report.getAttribute('data-title') || '';
        if (title.includes(searchTerm)) {
            report.style.display = '';
        } else {
            report.style.display = 'none';
        }
    });
}

// View report in standalone visualization page (consistent across extension)
function viewReport(domain, videoId) {
    const viewUrl = `http://127.0.0.1:5000/view/${encodeURIComponent(domain)}/${encodeURIComponent(videoId)}`;
    chrome.tabs.create({ url: viewUrl });
}

// Open URL in browser
function openInBrowser(url) {
    if (url.startsWith('/')) {
        url = 'http://127.0.0.1:5000' + url;
    }
    window.open(url, '_blank');
}

// Try fetch with multiple hosts
async function tryFetch(path, opts = {}) {
    let lastErr = null;
    let firstNonOk = null;

    for (const host of API_HOSTS) {
        try {
            const response = await fetch(host + path, {
                ...opts,
                cache: 'no-store'
            });
            if (response.ok) return response;
            if (!firstNonOk) firstNonOk = response;
        } catch (e) {
            lastErr = e;
        }
    }

    if (firstNonOk) return firstNonOk;
    if (lastErr) throw lastErr;
    throw new Error('API indisponível');
}

// Format date
function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateStr;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Refresh reports button handler (can be called from popup)
window.refreshLibrary = loadReports;

// Expor funções globalmente para onclick handlers
window.viewReport = viewReport;
window.openInBrowser = openInBrowser;
window.loadReports = loadReports;
window.filterReports = filterReports;
