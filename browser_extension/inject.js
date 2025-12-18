// Injected script to intercept fetch/XHR for Kiwify M3U8 detection
(function () {
    'use strict';

    console.log('[Video Extractor] Kiwify interceptor loaded');

    // Store original fetch
    const originalFetch = window.fetch;

    // Intercept fetch
    window.fetch = async function (...args) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;

        // Check if it's an M3U8 request
        if (url && (url.includes('.m3u8') || url.includes('master.json') || url.includes('playlist'))) {
            console.log('[Video Extractor] M3U8 detected via fetch:', url);

            // Send to content script
            window.postMessage({
                type: 'VIDEO_MANIFEST_DETECTED',
                manifestUrl: url,
                pageUrl: window.location.href,
                domain: window.location.hostname,
                platform: 'kiwify'
            }, '*');
        }

        // Call original fetch
        return originalFetch.apply(this, args);
    };

    // Intercept XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._url = url;
        return originalOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        const url = this._url;

        if (url && (url.includes('.m3u8') || url.includes('master.json') || url.includes('playlist'))) {
            console.log('[Video Extractor] M3U8 detected via XHR:', url);

            window.postMessage({
                type: 'VIDEO_MANIFEST_DETECTED',
                manifestUrl: url,
                pageUrl: window.location.href,
                domain: window.location.hostname,
                platform: 'kiwify'
            }, '*');
        }

        return originalSend.apply(this, args);
    };

    console.log('[Video Extractor] Fetch/XHR interceptors installed');
})();
