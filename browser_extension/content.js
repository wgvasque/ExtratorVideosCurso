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
        // 3. Hub.la - título abaixo do vídeo
        () => {
            if (window.location.hostname.includes('hub.la')) {
                // Procurar por h1, h2, ou elementos comuns após o player
                const selectors = [
                    'h1',  // H1 genérico primeiro
                    'h1.lesson-title',
                    'h2.lesson-title',
                    '.video-info h1',
                    '.video-info h2',
                    '.lesson-info h1',
                    '.lesson-info h2',
                    'div[class*="title"] h1',
                    'div[class*="title"] h2'
                ];
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el) return el.textContent?.trim();
                }
            }
            return null;
        },
        // 4. Primeiro H1 da página
        () => document.querySelector('h1')?.textContent?.trim(),
        // 5. Título da página
        () => document.title,
        // 6. Seletores comuns de plataformas de curso
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
async function extractPageMetadata() {
    // Para hub.la, aguardar H1 carregar (SPA com carregamento dinâmico)
    if (window.location.hostname.includes('hub.la')) {
        // Aguardar até 3 segundos para o H1 ter conteúdo real (não vazio e não "Hubla")
        let attempts = 0;
        let h1 = document.querySelector('h1');

        while (attempts < 6) {
            h1 = document.querySelector('h1');
            const h1Text = h1?.textContent?.trim() || '';

            // Parar se H1 tem conteúdo válido (não vazio e não é o título padrão da página)
            if (h1Text && h1Text !== 'Hubla' && h1Text.length > 3) {
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        const finalH1 = h1?.textContent?.trim() || 'não encontrado';
        console.log('[Video Extractor] Hub.la - H1 após', attempts * 500, 'ms:', finalH1);
    }

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
        // Usar async/await para aguardar extração
        extractPageMetadata().then(metadata => {
            sendResponse({ success: true, metadata });
        }).catch(error => {
            console.error('[Video Extractor] Erro ao extrair metadados:', error);
            sendResponse({ success: false, error: error.message });
        });

        // Retornar true para indicar resposta assíncrona
        return true;
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
