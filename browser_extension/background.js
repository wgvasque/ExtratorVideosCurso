// Background script para interceptar requests de vídeo

const API_URL = 'http://localhost:5000/api/capture-manifest';
const API_HOSTS = ['http://localhost:5000', 'http://127.0.0.1:5000'];

// Armazenar somente o último manifest capturado
let lastManifest = null;

// Debouncing para evitar capturas duplicadas
let lastCaptureKey = '';
let lastCaptureTime = 0;
const DEBOUNCE_MS = 30000; // 30 segundos entre capturas do mesmo vídeo
let pollTimer = null;
let currentSession = null;

async function tryFetch(path, opts) {
  let firstNonOk = null;
  let lastErr = null;
  for (const h of API_HOSTS) {
    try {
      const r = await fetch(h + path, Object.assign({ cache: 'no-store' }, opts));
      if (r.ok) return r;
      if (!firstNonOk) firstNonOk = r;
    } catch (e) {
      lastErr = e;
    }
  }
  if (firstNonOk) return firstNonOk;
  if (lastErr) throw lastErr;
  throw new Error('API indisponível');
}

function formatElapsed(startISO, serverStart) {
  try {
    const start = serverStart ? new Date(serverStart) : new Date(startISO);
    const now = new Date();
    const sec = Math.max(0, Math.floor((now - start) / 1000));
    return sec;
  } catch {
    return 0;
  }
}

async function startPolling(pageUrl) {
  try {
    const st = await chrome.storage.local.get(['currentSession']);
    currentSession = st.currentSession || { pageUrl, status: 'processing', startedAtISO: new Date().toISOString() };
    currentSession.pageUrl = pageUrl;
    currentSession.status = 'processing';
    currentSession.startedAtISO = currentSession.startedAtISO || new Date().toISOString();
    await chrome.storage.local.set({ currentSession });
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      try {
        const resp = await tryFetch('/api/status', { method: 'GET' });
        const status = await resp.json();
        const elapsedSec = formatElapsed(currentSession.startedAtISO, status.start_time);
        currentSession.progress = status.progress || 0;
        currentSession.currentStep = status.current_step || 'processing';
        currentSession.processing = !!status.processing;
        currentSession.lastUpdatedISO = new Date().toISOString();
        currentSession.elapsedSec = elapsedSec;
        await chrome.storage.local.set({ currentSession });
        if (!status.processing) {
          currentSession.status = 'completed';
          currentSession.completedAtISO = new Date().toISOString();
          await chrome.storage.local.set({ currentSession });
          clearInterval(pollTimer);
          pollTimer = null;
        }
      } catch (e) {
        // silencioso; mantém o polling
      }
    }, 2000);
  } catch (e) {
    // silencioso
  }
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

// Listener para requests de rede
chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    const url = details.url;

    // PRIORIDADE 1: URLs com JWT assinado no path (formato mais robusto)
    // Exemplo: cloudflarestream.com/eyJhbGciOiJSUzI1Ni.../manifest/video.m3u8
    if (url.includes('cloudflarestream.com') && url.includes('/manifest/video.m3u8')) {
      // Verificar se tem JWT no path (começa com eyJ)
      const jwtMatch = url.match(/cloudflarestream\.com\/(eyJ[^/]+)\/manifest\/video\.m3u8/);
      if (jwtMatch) {
        console.log('[Video Extractor] 🎯 JWT ASSINADO detectado:', url.slice(0, 100) + '...');
        captureManifest(url, details.tabId, 'cloudflare');
        return;
      }
    }

    // PRIORIDADE 2: Qualquer .m3u8 do Cloudflare Stream
    if (url.includes('cloudflarestream.com') && url.includes('.m3u8')) {
      console.log('[Video Extractor] Manifest .m3u8 detectado:', url.slice(0, 100) + '...');
      captureManifest(url, details.tabId, 'cloudflare');
      return;
    }

    // PRIORIDADE 3: Segmentos .ts para extrair manifest
    if (url.includes('cloudflarestream.com') && url.includes('/video/') && url.includes('.ts')) {
      try {
        const baseUrl = url.split('/video/')[0];
        const tokenMatch = url.match(/\?p=([^&]+)/);
        const token = tokenMatch ? tokenMatch[1] : '';
        const manifestUrl = `${baseUrl}/manifest/video.m3u8${token ? '?p=' + token : ''}`;

        console.log('[Video Extractor] Segmento .ts detectado, extraindo manifest:', manifestUrl.slice(0, 100) + '...');
        captureManifest(manifestUrl, details.tabId, 'cloudflare');
      } catch (e) {
        console.error('[Video Extractor] Erro ao extrair manifest:', e);
      }
      return;
    }

    // PRIORIDADE 4: Vimeo - detectar master.json ou .m3u8
    if ((url.includes('vimeo.com') || url.includes('vimeocdn.com')) &&
      (url.includes('master.json') || url.includes('.m3u8'))) {
      console.log('[Video Extractor] 🎬 Vimeo detectado:', url.slice(0, 100) + '...');
      captureManifest(url, details.tabId, 'vimeo');
      return;
    }

    // PRIORIDADE 5: YouTube - detectar googlevideo.com
    if (url.includes('googlevideo.com') && (url.includes('videoplayback') || url.includes('.m3u8'))) {
      console.log('[Video Extractor] 📹 YouTube detectado:', url.slice(0, 100) + '...');
      captureManifest(url, details.tabId, 'youtube');
      return;
    }

    // PRIORIDADE 6: JWPlayer
    if ((url.includes('jwplatform.com') || url.includes('jwpcdn.com')) &&
      (url.includes('.m3u8') || url.includes('.mpd'))) {
      console.log('[Video Extractor] 🎥 JWPlayer detectado:', url.slice(0, 100) + '...');
      captureManifest(url, details.tabId, 'jwplayer');
      return;
    }

    // PRIORIDADE 7: PandaVideo - plataforma brasileira comum
    if (url.includes('pandavideo.com.br') && url.includes('.m3u8')) {
      // Preferir URLs de qualidade específica (720p, 1080p, etc.) sobre playlist.m3u8
      // Ignorar URLs com ?get_qualities=1 pois são apenas para listar qualidades
      if (url.includes('get_qualities=')) {
        console.log('[Video Extractor] 🐼 PandaVideo - ignorando URL de qualidades:', url.slice(0, 80));
        return; // Não capturar, esperar a URL real
      }

      // Preferir /video.m3u8 (stream real) sobre playlist.m3u8
      let cleanUrl = url.split('?')[0]; // Remover query params

      console.log('[Video Extractor] 🐼 PandaVideo detectado:', cleanUrl.slice(0, 100) + '...');
      captureManifest(cleanUrl, details.tabId, 'pandavideo');
      return;
    }

    // PRIORIDADE 8: HLS genérico (.m3u8) de qualquer domínio
    if (url.includes('.m3u8') && !url.includes('localhost')) {
      // Evitar capturar playlists de áudio ou thumbnails
      if (!url.includes('audio') && !url.includes('thumb') && !url.includes('sprite')) {
        console.log('[Video Extractor] 📺 HLS genérico detectado:', url.slice(0, 100) + '...');
        captureManifest(url, details.tabId, 'hls');
        return;
      }
    }

    // PRIORIDADE 9: DASH genérico (.mpd)
    if (url.includes('.mpd') && !url.includes('localhost')) {
      console.log('[Video Extractor] 📺 DASH detectado:', url.slice(0, 100) + '...');
      captureManifest(url, details.tabId, 'dash');
      return;
    }
  },
  {
    urls: [
      "*://*.cloudflarestream.com/*",
      "*://*.pandavideo.com.br/*",
      "*://*.vimeo.com/*",
      "*://*.vimeocdn.com/*",
      "*://*.youtube.com/*",
      "*://*.googlevideo.com/*",
      "*://*.jwplatform.com/*",
      "*://*.jwpcdn.com/*",
      "*://*/*.m3u8*",
      "*://*/*.mpd*",
      "*://*/*"
    ]
  },
  ["requestBody"]
);

// Função para capturar manifest
function captureManifest(manifestUrl, tabId, source = 'unknown') {
  function normalizeManifest(u) {
    try {
      const url = String(u).trim().replace(/`/g, '');
      // Normalização específica para Cloudflare
      if (url.includes('cloudflarestream.com')) {
        const m = url.match(/cloudflarestream\.com\/[^?]+\/manifest\/video\.m3u8\?p=([^&]+)/);
        if (m && m[1]) {
          const token = m[1].trim();
          const isJwt = token.includes('.') && token.split('.').length === 3;
          if (isJwt) {
            const host = url.split('/manifest/')[0].split('/').slice(0, 3).join('/');
            return `${host}/${token}/manifest/video.m3u8`;
          }
          return url;
        }
      }
      return url;
    } catch (e) {
      return String(u || '');
    }
  }

  manifestUrl = normalizeManifest(manifestUrl);

  // Para Cloudflare, verificar se tem JWT
  const isCloudflareJwt = (() => {
    if (!manifestUrl.includes('cloudflarestream.com')) return false;
    try {
      // JWT no path
      const pathMatch = manifestUrl.match(/cloudflarestream\.com\/([^/]+)\/manifest\/video\.m3u8/);
      if (pathMatch && pathMatch[1] && pathMatch[1].split('.').length === 3) return true;
      // JWT no query
      const queryMatch = manifestUrl.match(/\?p=([^&]+)/);
      if (queryMatch && queryMatch[1] && queryMatch[1].split('.').length === 3) return true;
      return false;
    } catch {
      return false;
    }
  })();

  // Para outros players, sempre considerar válido
  const isValidManifest = isCloudflareJwt || source !== 'cloudflare';

  // Pegar a URL da página atual
  chrome.tabs.get(tabId, function (tab) {
    if (tab) {
      const pageUrl = tab.url;

      // Ignorar se a página atual já é um manifest (evita duplicatas ao testar)
      if (pageUrl.includes('.m3u8') || pageUrl.includes('.mpd') ||
        pageUrl.includes('cloudflarestream.com/manifest')) {
        console.log('[Video Extractor] Ignorando captura - página atual é um manifest');
        return;
      }

      // Debouncing - evitar múltiplas capturas do mesmo vídeo
      const captureKey = `${pageUrl}`;
      const now = Date.now();
      if (captureKey === lastCaptureKey && (now - lastCaptureTime) < DEBOUNCE_MS) {
        // Permitir upgrade de query param para JWT path
        const prevIsQuery = !!(lastManifest && lastManifest.pageUrl === pageUrl &&
          String(lastManifest.manifestUrl || '').includes('?p='));
        if (!(isCloudflareJwt && prevIsQuery)) {
          console.log('[Video Extractor] Ignorando captura duplicada (debounce)');
          return;
        }
      }
      lastCaptureKey = captureKey;
      lastCaptureTime = now;

      // Criar objeto de captura
      const capture = {
        pageUrl: pageUrl,
        manifestUrl: manifestUrl,
        timestamp: new Date().toISOString(),
        domain: new URL(pageUrl).hostname,
        source: source
      };

      // Guardar somente o último manifest
      lastManifest = capture;
      chrome.storage.local.set({ lastManifest });

      // Enviar para API local e atualizar badge
      if (isValidManifest) {
        sendToAPI(capture);
        chrome.action.setBadgeText({ text: '1' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        console.log(`[Video Extractor] ✅ Capturado [${source}]:`, manifestUrl.slice(0, 80) + '...');
      } else {
        chrome.action.setBadgeText({ text: '?' });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
      }
    }
  });
}

// Função para enviar para API
async function sendToAPI(capture) {
  try {
    // Verificar se auto-process está ativado
    const result = await chrome.storage.local.get(['autoProcess']);
    const autoProcess = result.autoProcess || false;

    const payload = {
      ...capture,
      autoProcess: autoProcess
    };

    async function tryPost(url) {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    let response = await tryPost(API_URL);
    if (!response.ok) {
      response = await tryPost('http://127.0.0.1:5000/api/capture-manifest');
    }

    if (response.ok) {
      const data = await response.json();
      console.log('[Video Extractor] Enviado para API com sucesso');
      if (data.autoProcessStarted) {
        console.log('[Video Extractor] 🚀 Auto-processamento iniciado!');
      }
    } else {
      console.warn('[Video Extractor] Falha ao enviar para API:', response.status);
    }
  } catch (error) {
    console.warn('[Video Extractor] API local não disponível:', error.message);
  }
}

// Carregar último manifest salvo ao iniciar
chrome.storage.local.get(['lastManifest'], function (result) {
  if (result.lastManifest) {
    lastManifest = result.lastManifest;
    chrome.action.setBadgeText({ text: '1' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
  chrome.storage.local.get(['currentSession']).then((st) => {
    const sess = st.currentSession;
    if (sess && (sess.status === 'processing' || sess.processing)) {
      startPolling(sess.pageUrl);
    }
  });
});

// Listener para mensagens do popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'getManifests') {
    sendResponse({ manifests: lastManifest ? [lastManifest] : [] });
  } else if (request.action === 'clearManifests') {
    lastManifest = null;
    chrome.storage.local.set({ lastManifest: null });
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ success: true });
  } else if (request.action === 'startPolling') {
    const pageUrl = request.pageUrl;
    const manifestUrl = request.manifestUrl || (lastManifest && lastManifest.manifestUrl) || '';
    currentSession = {
      pageUrl,
      manifestUrl,
      status: 'processing',
      progress: 0,
      currentStep: 'processing',
      startedAtISO: new Date().toISOString()
    };
    chrome.storage.local.set({ currentSession }).then(() => {
      startPolling(pageUrl);
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'stopPolling') {
    stopPolling();
    sendResponse({ success: true });
  }
  return true;
});
