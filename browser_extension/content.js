// Content Script - Extração de Metadados da Página
// Executado no contexto da página para extrair informações

console.log('[Video Extractor] Content script carregado');

// Função para extrair título do vídeo
function extractVideoTitle() {
    // Tentar várias estratégias para encontrar o título
    const strategies = [
        // 1. Kiwify - título da aula (h3) + curso (h2)
        () => {
            if (window.location.hostname.includes('kiwify.com')) {
                const lessonTitle = document.querySelector('article#lesson__metadata h3')?.textContent?.trim();
                const courseTitle = document.querySelector('article#lesson__metadata h2')?.textContent?.trim();

                if (lessonTitle && courseTitle) {
                    console.log('[Video Extractor] Kiwify:', courseTitle, '-', lessonTitle);
                    return `${courseTitle} - ${lessonTitle}`;
                } else if (lessonTitle) {
                    return lessonTitle;
                }
            }
            return null;
        },
        // 2. Hub.la - título abaixo do vídeo
        () => {
            if (window.location.hostname.includes('hub.la')) {
                const h1 = document.querySelector('h1');
                const h1Text = h1?.textContent?.trim() || '';
                // Só retornar se não for vazio e não for 'Hubla'
                if (h1Text && h1Text !== 'Hubla' && h1Text.length > 3) {
                    console.log('[Video Extractor] Hub.la H1:', h1Text);
                    return h1Text;
                }
            }
            return null;
        },
        // 3. Meta tag Open Graph
        () => document.querySelector('meta[property="og:title"]')?.content,
        // 4. Meta tag Twitter
        () => document.querySelector('meta[name="twitter:title"]')?.content,
        // 5. Primeiro H1 da página
        () => document.querySelector('h1')?.textContent?.trim(),
        // 6. Título da página
        () => document.title,
        // 7. Seletores comuns de plataformas de curso
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

    // Kiwify - buscar na seção de descrição da aula
    if (window.location.hostname.includes('kiwify.com')) {
        const descriptionSection = document.querySelector('article#lesson__tab__content__description .lesson__description__container');
        if (descriptionSection) {
            const links = descriptionSection.querySelectorAll('a[href]');
            links.forEach(link => {
                const href = link.href;
                const text = link.textContent?.trim() || '';

                if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                    materials.push({
                        url: href,
                        text: text || 'Material de Apoio',
                        type: 'Kiwify Material'
                    });
                    console.log('[Video Extractor] Kiwify material encontrado:', text, href);
                }
            });
        }
    }

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

        // Verificar se está dentro de um editor de conteúdo (BlockNote, etc)
        const isInContentEditor = link.closest('.bn-editor, .custom-blocknote-editor, .content-editor, .editor-content, [class*="editor"]');

        // Verificar se é link externo (domínio diferente)
        const currentDomain = window.location.hostname;
        let isExternal = false;
        try {
            const linkUrl = new URL(href);
            isExternal = linkUrl.hostname !== currentDomain;
        } catch (e) {
            // URL inválida, ignorar
        }

        // Adicionar se: tem keyword OU tem extensão OU (está em editor E é externo)
        if (hasKeyword || hasExtension || (isInContentEditor && isExternal)) {
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

        // Aguardar editor de conteúdo carregar links (BlockNote, etc)
        let editorAttempts = 0;
        while (editorAttempts < 4) {
            const editorLinks = document.querySelectorAll('.bn-editor a, .custom-blocknote-editor a');
            if (editorLinks.length > 0) {
                console.log('[Video Extractor] Hub.la - Editor com', editorLinks.length, 'links após', editorAttempts * 500, 'ms');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            editorAttempts++;
        }
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
    // Para outras mensagens, NÃO retornar true se não for responder
    return false;
});

// Listen for messages from injected script (for Kiwify and other blob URL platforms)
window.addEventListener('message', (event) => {
    // Only accept messages from same origin
    if (event.source !== window) return;

    if (event.data.type === 'VIDEO_MANIFEST_DETECTED') {
        console.log('[Video Extractor] Manifest detected from injected script:', event.data);

        // Send to background script
        chrome.runtime.sendMessage({
            action: 'manifestDetected',
            manifestUrl: event.data.manifestUrl,
            pageUrl: event.data.pageUrl,
            domain: event.data.domain,
            platform: event.data.platform || 'unknown'
        });
    }
});

// Inject script for platforms that use blob URLs (Kiwify, etc)
function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}

// Inject on Kiwify and other blob URL platforms
if (window.location.hostname.includes('kiwify.com')) {
    console.log('[Video Extractor] Kiwify detected, injecting fetch interceptor');
    injectScript();
}

// Extrair metadados automaticamente quando a página carregar
const autoExtract = async () => {
    try {
        const metadata = await extractPageMetadata();
        chrome.runtime.sendMessage({
            action: 'pageMetadataExtracted',
            metadata
        });
    } catch (e) {
        console.error('[Video Extractor] Erro na extração automática:', e);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoExtract);
} else {
    autoExtract();
}
