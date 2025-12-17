// Content Script - Extração de Metadados da Página
// Executado no contexto da página para extrair informações

console.log('[Video Extractor] Content script carregado');

// Função para extrair título do vídeo
function extractVideoTitle() {
    // Tentar várias estratégias para encontrar o título
    const strategies = [
        // 1. Meta tag Open Graph
        () => document.querySelector('meta[property="og:title"]')?.content,
        // 2. Meta tag Twitter
        () => document.querySelector('meta[name="twitter:title"]')?.content,
        // 3. Primeiro H1 da página
        () => document.querySelector('h1')?.textContent?.trim(),
        // 4. Título da página
        () => document.title,
        // 5. Seletores comuns de plataformas de curso
        () => document.querySelector('.video-title')?.textContent?.trim(),
        () => document.querySelector('.lesson-title')?.textContent?.trim(),
        () => document.querySelector('.course-title')?.textContent?.trim(),
        () => document.querySelector('[class*="title"]')?.textContent?.trim(),
    ];

    for (const strategy of strategies) {
        try {
            const title = strategy();
            if (title && title.length > 0 && title.length < 200) {
                return title;
            }
        } catch (e) {
            continue;
        }
    }

    return 'Título não encontrado';
}

// Função para extrair links de material de apoio
function extractSupportMaterials() {
    const materials = [];
    const keywords = ['material', 'apoio', 'download', 'pdf', 'arquivo', 'recurso', 'anexo', 'documento'];
    const extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.ppt', '.pptx'];

    // Buscar todos os links da página
    const links = document.querySelectorAll('a[href]');

    links.forEach(link => {
        const href = link.href;
        const text = link.textContent?.trim().toLowerCase() || '';
        const title = link.title?.toLowerCase() || '';

        // Verificar se é um link de material de apoio
        const hasKeyword = keywords.some(keyword =>
            text.includes(keyword) || title.includes(keyword) || href.toLowerCase().includes(keyword)
        );

        const hasExtension = extensions.some(ext => href.toLowerCase().endsWith(ext));

        if (hasKeyword || hasExtension) {
            materials.push({
                url: href,
                text: link.textContent?.trim() || 'Material de Apoio',
                type: hasExtension ? href.split('.').pop().toUpperCase() : 'LINK'
            });
        }
    });

    // Remover duplicatas
    const uniqueMaterials = materials.filter((material, index, self) =>
        index === self.findIndex(m => m.url === material.url)
    );

    return uniqueMaterials;
}

// Função principal para extrair todos os metadados
function extractPageMetadata() {
    const metadata = {
        pageUrl: window.location.href,
        pageTitle: document.title,
        videoTitle: extractVideoTitle(),
        supportMaterials: extractSupportMaterials(),
        timestamp: Date.now()
    };

    console.log('[Video Extractor] Metadados extraídos:', metadata);
    return metadata;
}

// Listener para mensagens do background/popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractMetadata') {
        const metadata = extractPageMetadata();
        sendResponse({ success: true, metadata });
    }
    return true; // Manter canal aberto para resposta assíncrona
});

// Extrair metadados automaticamente quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const metadata = extractPageMetadata();
        chrome.runtime.sendMessage({
            action: 'pageMetadataExtracted',
            metadata
        });
    });
} else {
    const metadata = extractPageMetadata();
    chrome.runtime.sendMessage({
        action: 'pageMetadataExtracted',
        metadata
    });
}
