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

    // Filtrar links internos da mesma plataforma (outras aulas, etc)
    const currentDomain = window.location.hostname;
    const filteredMaterials = materials.filter(material => {
        const materialUrl = new URL(material.url);
        // Manter apenas links externos OU arquivos (PDFs, docs, etc)
        return materialUrl.hostname !== currentDomain || material.type !== 'LINK';
    });

    console.log('[Video Extractor] Materiais após filtrar links internos:', filteredMaterials.length);
    console.log('[Video Extractor] Materiais encontrados antes da deduplicação:', filteredMaterials.map(m => ({ url: m.url, text: m.text })));

    // Remover duplicatas por URL base (ignorando query params)
    // Se mesma URL, manter o texto mais descritivo (mais curto e sem "...")
    const urlMap = new Map();

    filteredMaterials.forEach(material => {
        const normalizedUrl = material.url.split('?')[0].split('#')[0]; // Remove query params e hash

        if (!urlMap.has(normalizedUrl)) {
            // Primeira ocorrência desta URL
            urlMap.set(normalizedUrl, material);
        } else {
            // URL duplicada - manter o texto melhor
            const existing = urlMap.get(normalizedUrl);
            const currentText = material.text;
            const existingText = existing.text;

            // Preferir texto mais curto e sem "..."
            const currentScore = currentText.length + (currentText.includes('...') ? 100 : 0);
            const existingScore = existingText.length + (existingText.includes('...') ? 100 : 0);

            if (currentScore < existingScore) {
                urlMap.set(normalizedUrl, material);
            }
        }
    });

    return Array.from(urlMap.values());
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
