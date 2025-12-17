// Background script para interceptar requests de vídeo

const API_URL = 'http://localhost:5000/api/capture-manifest';
const API_HOSTS = ['http://localhost:5000', 'http://127.0.0.1:5000'];

// Armazenar array de manifests (máximo 10)
let manifests = [];
const MAX_MANIFESTS = 10;

// Debouncing para evitar capturas duplicadas
let lastCaptureKey = '';
let lastCaptureTime = 0;
const DEBOUNCE_MS = 30000; // 30 segundos entre capturas do mesmo vídeo
let pollTimer = null;
let currentSession = null;

// Função para adicionar ou atualizar manifest no array
function addOrUpdateManifest(newManifest) {
  // Procurar manifest existente com mesma pageUrl
  const existingIndex = manifests.findIndex(m => m.pageUrl === newManifest.pageUrl);

  if (existingIndex !== -1) {
    // Atualizar manifest existente
    manifests[existingIndex] = { ...manifests[existingIndex], ...newManifest };
    console.log('[Video Extractor] Manifest atualizado:', newManifest.pageUrl);
  } else {
    // Adicionar novo manifest
    manifests.unshift(newManifest); // Adicionar no início (mais recente primeiro)
    console.log('[Video Extractor] Novo manifest adicionado:', newManifest.pageUrl);

    // Limitar a MAX_MANIFESTS (remover mais antigo)
    if (manifests.length > MAX_MANIFESTS) {
      const removed = manifests.pop();
      console.log('[Video Extractor] Manifest mais antigo removido:', removed.pageUrl);
    }
  }

  // Salvar no storage
  chrome.storage.local.set({ manifests });

  // Atualizar badge com contagem
  chrome.action.setBadgeText({ text: manifests.length.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

  return manifests[existingIndex !== -1 ? existingIndex : 0];
}

// Função para obter manifest por URL
function getManifestByUrl(pageUrl) {
  return manifests.find(m => m.pageUrl === pageUrl) || null;
}


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
        const existingManifest = getManifestByUrl(pageUrl);
        const prevIsQuery = !!(existingManifest && existingManifest.pageUrl === pageUrl &&
          String(existingManifest.manifestUrl || '').includes('?p='));
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
        source: source,
        // Metadados da página (serão preenchidos pelo content script)
        pageTitle: tab.title || '',
        videoTitle: '',
        supportMaterials: []
      };

      // Adicionar ou atualizar manifest no array
      addOrUpdateManifest(capture);

      // Solicitar metadados do content script
      chrome.tabs.sendMessage(tabId, { action: 'extractMetadata' }, (response) => {
        if (response && response.success && response.metadata) {
          // Atualizar capture com metadados
          const updated = {
            ...capture,
            pageTitle: response.metadata.pageTitle || capture.pageTitle,
            videoTitle: response.metadata.videoTitle || '',
            supportMaterials: response.metadata.supportMaterials || []
          };
          addOrUpdateManifest(updated);
          console.log('[Video Extractor] Metadados atualizados:', {
            videoTitle: updated.videoTitle,
            materials: updated.supportMaterials.length
          });

          // Enviar para API após obter metadados completos
          if (isValidManifest) {
            sendToAPI(updated);
          }
        } else {
          // Se não conseguir metadados, enviar mesmo assim
          if (isValidManifest) {
            sendToAPI(capture);
          }
        }
      });

      // Log de captura
      if (isValidManifest) {
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

    console.log('[Video Extractor] 🔍 Auto-process status:', autoProcess);
    console.log('[Video Extractor] 📦 Capture data:', {
      pageUrl: capture.pageUrl,
      manifestUrl: capture.manifestUrl?.slice(0, 50) + '...',
      videoTitle: capture.videoTitle,
      materials: capture.supportMaterials?.length || 0
    });

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

      // Se auto-process está ativado, iniciar processamento automaticamente
      if (autoProcess) {
        console.log('[Video Extractor] 🚀 Auto-processamento ativado! Iniciando...');

        // Iniciar polling (mesmo comportamento do botão "Processar")
        startPolling(capture.pageUrl);

        console.log('[Video Extractor] ✅ Processamento iniciado automaticamente');
      } else if (data.autoProcessStarted) {
        console.log('[Video Extractor] 🚀 Auto-processamento iniciado pela API');
      }
    } else {
      console.warn('[Video Extractor] Falha ao enviar para API:', response.status);
    }
  } catch (error) {
    console.warn('[Video Extractor] API local não disponível:', error.message);
  }
}


// Carregar manifests salvos ao iniciar (com migração de lastManifest antigo)
chrome.storage.local.get(['manifests', 'lastManifest'], function (result) {
  if (result.manifests && Array.isArray(result.manifests)) {
    // Carregar array de manifests
    manifests = result.manifests;
    console.log('[Video Extractor] Carregados', manifests.length, 'manifests');
    chrome.action.setBadgeText({ text: manifests.length > 0 ? manifests.length.toString() : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else if (result.lastManifest) {
    // Migrar lastManifest antigo para array
    console.log('[Video Extractor] Migrando lastManifest antigo para array');
    manifests = [result.lastManifest];
    chrome.storage.local.set({ manifests });
    chrome.storage.local.remove('lastManifest'); // Remover antigo
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
    sendResponse({ manifests: manifests });
  } else if (request.action === 'clearManifests') {
    manifests = [];
    chrome.storage.local.set({ manifests: [] });
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ success: true });
  } else if (request.action === 'startPolling') {
    const pageUrl = request.pageUrl;
    const existingManifest = getManifestByUrl(pageUrl);
    const manifestUrl = request.manifestUrl || (existingManifest && existingManifest.manifestUrl) || '';
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
  } else if (request.action === 'pageMetadataExtracted') {
    // Content script enviou metadados automaticamente
    const pageUrl = request.metadata?.pageUrl;
    if (pageUrl && request.metadata) {
      const existingManifest = getManifestByUrl(pageUrl);
      if (existingManifest) {
        const updated = {
          ...existingManifest,
          pageTitle: request.metadata.pageTitle || existingManifest.pageTitle,
          videoTitle: request.metadata.videoTitle || '',
          supportMaterials: request.metadata.supportMaterials || []
        };
        addOrUpdateManifest(updated);
        console.log('[Video Extractor] Metadados recebidos automaticamente');
      }
    }
  } else if (request.action === 'refreshMetadata') {
    // Popup solicitou atualização de metadados
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        const tabId = tabs[0].id;

        // Tentar enviar mensagem para content script
        chrome.tabs.sendMessage(tabId, { action: 'extractMetadata' }, async (response) => {
          // Se houver erro (content script não carregado), injetar manualmente
          if (chrome.runtime.lastError) {
            console.log('[Video Extractor] Content script não encontrado, injetando...');

            try {
              // Injetar content script manualmente
              await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
              });

              // Aguardar um pouco para o script carregar
              setTimeout(() => {
                // Tentar novamente
                chrome.tabs.sendMessage(tabId, { action: 'extractMetadata' }, (response2) => {
                  if (response2 && response2.success && response2.metadata) {
                    const pageUrl = tabs[0].url;
                    const existingManifest = getManifestByUrl(pageUrl);
                    if (existingManifest) {
                      const updated = {
                        ...existingManifest,
                        pageTitle: response2.metadata.pageTitle || existingManifest.pageTitle,
                        videoTitle: response2.metadata.videoTitle || '',
                        supportMaterials: response2.metadata.supportMaterials || []
                      };
                      addOrUpdateManifest(updated);
                      sendResponse({ success: true, metadata: response2.metadata });
                    } else {
                      sendResponse({ success: false, error: 'Manifest não encontrado' });
                    }
                  } else {
                    sendResponse({ success: false, error: 'Não foi possível extrair metadados' });
                  }
                });
              }, 500);
            } catch (e) {
              console.error('[Video Extractor] Erro ao injetar script:', e);
              sendResponse({ success: false, error: 'Erro ao injetar content script: ' + e.message });
            }
          } else if (response && response.success && response.metadata) {
            // Content script já estava carregado
            const pageUrl = tabs[0].url;
            const existingManifest = getManifestByUrl(pageUrl);
            if (existingManifest) {
              const updated = {
                ...existingManifest,
                pageTitle: response.metadata.pageTitle || existingManifest.pageTitle,
                videoTitle: response.metadata.videoTitle || '',
                supportMaterials: response.metadata.supportMaterials || []
              };
              addOrUpdateManifest(updated);
              sendResponse({ success: true, metadata: response.metadata });
            } else {
              sendResponse({ success: false, error: 'Manifest não encontrado' });
            }
          } else {
            sendResponse({ success: false, error: 'Não foi possível extrair metadados' });
          }
        });
      } else {
        sendResponse({ success: false, error: 'Nenhuma aba ativa' });
      }
    });
    return true; // Manter canal aberto para resposta assíncrona
  } else if (request.action === 'forceRecapture') {
    // Popup solicitou captura forçada da aba ativa
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) {
        sendResponse({ success: false, error: 'Nenhuma aba ativa' });
        return;
      }

      const tab = tabs[0];
      const tabId = tab.id;
      const pageUrl = tab.url;

      // Verificar se é uma página válida (não chrome://, about:, etc)
      if (!pageUrl || pageUrl.startsWith('chrome://') || pageUrl.startsWith('about:') ||
        pageUrl.startsWith('chrome-extension://')) {
        sendResponse({ success: false, error: 'Página não suportada' });
        return;
      }

      try {
        console.log('[Video Extractor] Solicitando metadados da aba:', tabId);

        // Tentar enviar mensagem ao content script
        chrome.tabs.sendMessage(tabId, { action: 'extractMetadata' }, async (metadata) => {
          // Se content script não estiver carregado, injetar manualmente
          if (chrome.runtime.lastError) {
            console.log('[Video Extractor] Content script não carregado, injetando manualmente...');

            try {
              // Injetar content script
              await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
              });

              // Aguardar e tentar novamente
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { action: 'extractMetadata' }, (metadata2) => {
                  if (chrome.runtime.lastError) {
                    console.error('[Video Extractor] Erro após injeção:', chrome.runtime.lastError.message);
                    sendResponse({ success: false, error: 'Content script não respondeu após injeção' });
                    return;
                  }

                  processMetadata(metadata2, tab, pageUrl, sendResponse);
                });
              }, 500);
            } catch (e) {
              console.error('[Video Extractor] Erro ao injetar script:', e);
              sendResponse({ success: false, error: 'Erro ao injetar script: ' + e.message });
            }
            return;
          }

          // Content script já estava carregado
          processMetadata(metadata, tab, pageUrl, sendResponse);
        });
      } catch (e) {
        console.error('[Video Extractor] Erro ao forçar captura:', e);
        sendResponse({ success: false, error: 'Erro: ' + e.message });
      }
    });
    return true;
  }
  return true;
});

// Função auxiliar para processar metadados
function processMetadata(metadata, tab, pageUrl, sendResponse) {
  console.log('[Video Extractor] Resposta recebida:', metadata);

  if (metadata && metadata.success) {
    // Criar novo manifest com metadados
    const capture = {
      pageUrl: pageUrl,
      manifestUrl: '', // Será preenchido quando detectar o manifest
      timestamp: new Date().toISOString(),
      domain: new URL(pageUrl).hostname,
      source: 'manual',
      pageTitle: metadata.metadata.pageTitle || tab.title || '',
      videoTitle: metadata.metadata.videoTitle || '',
      supportMaterials: metadata.metadata.supportMaterials || []
    };

    // Adicionar ou atualizar manifest no array
    addOrUpdateManifest(capture);

    console.log('[Video Extractor] Captura manual realizada:', capture);
    sendResponse({ success: true, manifest: capture });
  } else {
    console.error('[Video Extractor] Metadados inválidos:', metadata);
    sendResponse({ success: false, error: 'Não foi possível extrair metadados' });
  }
}
