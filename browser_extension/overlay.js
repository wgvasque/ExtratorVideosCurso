// Overlay Content Script
if (!window.hasOverlayScript) {
    window.hasOverlayScript = true;
    console.log('[Video Processor] Overlay script injected');

    let overlayContainer = null;
    let overlayIframe = null;
    let isMinimized = false;
    let isDragging = false;
    let dragStartX, dragStartY;
    let initialLeft, initialTop;

    // Listen for messages from Background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'TOGGLE_OVERLAY') {
            toggleOverlay();
        }
    });

    // Listen for messages from Iframe
    window.addEventListener('message', (event) => {
        // Basic security check, though chrome-extension:// scheme is usually safe
        // if (event.origin !== chrome.runtime.getURL('').slice(0, -1)) return; 

        // Ignore messages if overlay is not active
        if (!overlayContainer) return;

        if (event.data.action === 'DRAG_START') {
            startDrag(event);
        } else if (event.data.action === 'MINIMIZE') {
            minimizeOverlay();
        } else if (event.data.action === 'CLOSE') {
            closeOverlay();
        } else if (event.data.action === 'EXPAND') {
            expandOverlay();
        }
    });

    function createOverlay() {
        if (overlayContainer) return;

        // Create Container
        overlayContainer = document.createElement('div');
        overlayContainer.id = 'video-processor-overlay-container';
        Object.assign(overlayContainer.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '420px',
            height: '600px', // Max height
            zIndex: '2147483647', // Max z-index
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            borderRadius: '12px',
            overflow: 'hidden',
            transition: 'height 0.3s ease, width 0.3s ease, opacity 0.3s ease',
            background: 'transparent'
        });

        // Create Iframe
        overlayIframe = document.createElement('iframe');
        overlayIframe.src = chrome.runtime.getURL('popup.html');
        Object.assign(overlayIframe.style, {
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'transparent'
        });

        overlayContainer.appendChild(overlayIframe);
        document.body.appendChild(overlayContainer);

        // Initial State
    }

    function toggleOverlay() {
        if (!overlayContainer) {
            createOverlay();
        } else {
            if (overlayContainer.style.display === 'none') {
                overlayContainer.style.display = 'block';
            } else {
                overlayContainer.style.display = 'none';
            }
        }
    }

    function closeOverlay() {
        // Force stop any active drag before closing
        if (isDragging) {
            onDragEnd();
        }

        if (overlayContainer) {
            overlayContainer.remove();
            overlayContainer = null;
            overlayIframe = null;
        }

        // Remove tooltip if exists
        const tooltip = document.getElementById('video-processor-tooltip');
        if (tooltip) {
            tooltip.remove();
        }

        // Remove dragCover if exists (ensure clean state for next open)
        const dragCover = document.getElementById('drag-cover');
        if (dragCover) {
            dragCover.remove();
        }
    }

    function minimizeOverlay() {
        if (!overlayContainer) return;

        // Force stop any active drag before minimizing
        if (isDragging) {
            onDragEnd();
        }

        // Force hide dragCover (prevent dark overlay on icon)
        const dragCover = document.getElementById('drag-cover');
        if (dragCover) {
            dragCover.style.display = 'none';
        }

        isMinimized = true;

        // Get current position before resizing
        const rect = overlayContainer.getBoundingClientRect();
        const currentRight = window.innerWidth - rect.right;

        // Create minimized icon view
        overlayContainer.style.height = '60px';
        overlayContainer.style.width = '60px';
        overlayContainer.style.overflow = 'hidden';
        overlayContainer.style.borderRadius = '12px';

        // Maintain right alignment
        overlayContainer.style.right = currentRight + 'px';
        overlayContainer.style.left = 'auto';

        // Hide the iframe
        if (overlayIframe) {
            overlayIframe.style.display = 'none';
        }

        // Create or update minimized icon overlay
        let iconOverlay = document.getElementById('video-processor-icon-overlay');
        if (!iconOverlay) {
            iconOverlay = document.createElement('div');
            iconOverlay.id = 'video-processor-icon-overlay';
            Object.assign(iconOverlay.style, {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #FF6B6B, #ff8a80)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: '10'
            });

            // Add icon image
            const iconImg = document.createElement('img');
            iconImg.src = chrome.runtime.getURL('icon48.png');
            iconImg.style.width = '40px';
            iconImg.style.height = '40px';
            iconImg.style.pointerEvents = 'none';
            iconOverlay.appendChild(iconImg);

            // Track for double-click detection
            let clickCount = 0;
            let clickTimer = null;
            let dragStartPos = { x: 0, y: 0 };
            let hasDragged = false;

            // Mousedown - track position
            iconOverlay.addEventListener('mousedown', (e) => {
                dragStartPos = { x: e.screenX, y: e.screenY };
                hasDragged = false;

                // Hide tooltip when starting to drag
                const tooltip = document.getElementById('video-processor-tooltip');
                if (tooltip) {
                    tooltip.style.opacity = '0';
                }

                // Start drag (will create and activate dragCover)
                const dragEvent = {
                    data: {
                        screenX: e.screenX,
                        screenY: e.screenY
                    }
                };
                startDrag(dragEvent);
            });

            // Mousemove - detect if dragging
            iconOverlay.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    const deltaX = Math.abs(e.screenX - dragStartPos.x);
                    const deltaY = Math.abs(e.screenY - dragStartPos.y);
                    if (deltaX > 5 || deltaY > 5) {
                        hasDragged = true;
                    }
                }
            });

            // Mouseup - stop drag and detect clicks
            iconOverlay.addEventListener('mouseup', (e) => {
                // Calculate movement
                const deltaX = Math.abs(e.screenX - dragStartPos.x);
                const deltaY = Math.abs(e.screenY - dragStartPos.y);

                if (isDragging) {
                    onDragEnd();
                }

                // If mouse moved less than 5 pixels, it's a click
                if (deltaX < 5 && deltaY < 5) {
                    clickCount++;

                    if (clickCount === 1) {
                        clickTimer = setTimeout(() => {
                            clickCount = 0;
                        }, 300);
                    } else if (clickCount === 2) {
                        clearTimeout(clickTimer);
                        clickCount = 0;
                        expandOverlay();
                    }
                } else {
                    clickCount = 0;
                    if (clickTimer) {
                        clearTimeout(clickTimer);
                    }
                }
            });

            // Create custom tooltip
            const tooltip = document.createElement('div');
            tooltip.id = 'video-processor-tooltip';
            Object.assign(tooltip.style, {
                position: 'fixed',
                background: 'rgba(45, 52, 54, 0.95)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: '2147483648',
                opacity: '0',
                transition: 'opacity 0.2s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                border: '2px solid #FFE66D'
            });
            tooltip.textContent = '💡 Arraste para mover • Duplo clique para expandir';

            // Create arrow element
            const arrow = document.createElement('div');
            arrow.id = 'video-processor-tooltip-arrow';
            Object.assign(arrow.style, {
                position: 'absolute',
                width: '0',
                height: '0',
                borderStyle: 'solid',
                borderWidth: '8px',
                borderColor: 'transparent'
            });
            tooltip.appendChild(arrow);

            document.body.appendChild(tooltip);

            // Show tooltip on hover
            iconOverlay.addEventListener('mouseenter', (e) => {
                const rect = iconOverlay.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // Calcular distância até as bordas
                const distanceToLeft = rect.left;
                const distanceToRight = viewportWidth - rect.right;
                const distanceToTop = rect.top;
                const distanceToBottom = viewportHeight - rect.bottom;

                // Resetar transform antes de calcular posição
                tooltip.style.transform = 'none';

                // Determinar posicionamento horizontal
                if (distanceToRight < distanceToLeft) {
                    // Mais próximo da borda direita -> tooltip à esquerda
                    tooltip.style.left = 'auto';
                    tooltip.style.right = (viewportWidth - rect.left + 10) + 'px';
                    tooltip.style.top = (rect.top + rect.height / 2) + 'px';
                    tooltip.style.transform = 'translateY(-50%)';

                    // Posicionar seta apontando para a direita
                    arrow.style.right = '-14px';
                    arrow.style.left = 'auto';
                    arrow.style.top = '50%';
                    arrow.style.transform = 'translateY(-50%)';
                    arrow.style.borderLeftColor = '#FFE66D';
                    arrow.style.borderRightColor = 'transparent';
                    arrow.style.borderTopColor = 'transparent';
                    arrow.style.borderBottomColor = 'transparent';
                } else {
                    // Mais próximo da borda esquerda -> tooltip à direita
                    tooltip.style.left = (rect.right + 10) + 'px';
                    tooltip.style.right = 'auto';
                    tooltip.style.top = (rect.top + rect.height / 2) + 'px';
                    tooltip.style.transform = 'translateY(-50%)';

                    // Posicionar seta apontando para a esquerda
                    arrow.style.left = '-14px';
                    arrow.style.right = 'auto';
                    arrow.style.top = '50%';
                    arrow.style.transform = 'translateY(-50%)';
                    arrow.style.borderRightColor = '#FFE66D';
                    arrow.style.borderLeftColor = 'transparent';
                    arrow.style.borderTopColor = 'transparent';
                    arrow.style.borderBottomColor = 'transparent';
                }

                tooltip.style.opacity = '1';
            });

            // Hide tooltip on mouse leave
            iconOverlay.addEventListener('mouseleave', () => {
                tooltip.style.opacity = '0';
            });

            overlayContainer.appendChild(iconOverlay);
        }
        iconOverlay.style.display = 'flex';

        // Send message to iframe
        if (overlayIframe && overlayIframe.contentWindow) {
            overlayIframe.contentWindow.postMessage({ action: 'MINIMIZED_STATE', isMinimized: true }, '*');
        }
    }

    function expandOverlay() {
        if (!overlayContainer) return;

        // Force stop any active drag before expanding
        if (isDragging) {
            onDragEnd();
        }

        // Force hide dragCover (in case it's stuck visible)
        const dragCover = document.getElementById('drag-cover');
        if (dragCover) {
            dragCover.style.display = 'none';
        }

        isMinimized = false;

        overlayContainer.style.height = '600px'; // Restore max height
        overlayContainer.style.width = '420px';
        overlayContainer.style.borderRadius = '12px';

        // Reset positioning to default (top-right)
        overlayContainer.style.top = '20px';
        overlayContainer.style.right = '20px';
        overlayContainer.style.left = 'auto';
        overlayContainer.style.bottom = 'auto';

        // Show the iframe again
        if (overlayIframe) {
            overlayIframe.style.display = 'block';
        }

        // Hide the icon overlay
        const iconOverlay = document.getElementById('video-processor-icon-overlay');
        if (iconOverlay) iconOverlay.style.display = 'none';

        // Hide tooltip when expanding
        const tooltip = document.getElementById('video-processor-tooltip');
        if (tooltip) {
            tooltip.style.opacity = '0';
        }

        // Send message to iframe
        if (overlayIframe && overlayIframe.contentWindow) {
            overlayIframe.contentWindow.postMessage({ action: 'MINIMIZED_STATE', isMinimized: false }, '*');
        }
    }

    // Dragging Logic
    function startDrag(event) {
        // Silently ignore if container not available
        if (!overlayContainer) return;

        isDragging = true;
        // We get the initial mouse position from the message or we assume the user is clicking
        // BUT, the event comes from the iframe, so coordinates are relative to the iframe.
        // We need the screen coordinates.
        // Actually, `event` in `window.addEventListener('message', ...)` doesn't have mouse coords.
        // The IFRAME must send the mouse coords relative to the screen or viewport.

        // However, a simpler way for drag is to put a transparent 'overlay' on the entire screen
        // once drag starts, to capture mouse movements.

        // The 'event' passed to startDrag is the message event.
        // We expect `event.data` to contain `startX`, `startY` relative to the iframe? 
        // No, better: The iframe sends "I am being dragged".
        // We immediately check where the mouse is. 
        // Wait, we can't easily check mouse pos in parent from a message purely.

        // Better approach:
        // In `popup.js` (inside iframe), on `mousedown` on header:
        // Send message `DRAG_START` with `clientX`, `clientY` (relative to current viewport of iframe -> same as parent if fixed?).
        // No, iframe clientX is relative to iframe window.

        // Let's use a "Drag Handle" in the Parent (Content Script) that sits ON TOP of the iframe?
        // No, that blocks interaction.

        // Standard iframe drag approach:
        // 1. Iframe Header `mousedown` -> Message `DRAG_START` with { x: e.screenX, y: e.screenY }
        // 2. Parent receives `DRAG_START`.
        // 3. Parent adds `mousemove` and `mouseup` listeners to `window` (Overlay).
        // 4. On `mousemove`: Calculate delta (e.screenX - startX). Update Container `top`/`left`.

        dragStartX = event.data.screenX;
        dragStartY = event.data.screenY;

        const rect = overlayContainer.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        // Cache dimensions for boundary checks (avoid getBoundingClientRect on every move)
        window.overlayDragCache = {
            overlayWidth: rect.width,
            overlayHeight: rect.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight
        };

        // Add transparent cover to ensure iframe doesn't swallow events
        let dragCover = document.getElementById('drag-cover');
        if (!dragCover) {
            dragCover = document.createElement('div');
            dragCover.id = 'drag-cover';
            Object.assign(dragCover.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                cursor: 'move',
                display: 'none',
                background: 'transparent'
            });
            document.body.appendChild(dragCover);
        }

        // Set z-index based on minimized state
        // When minimized: lower z-index so icon overlay can receive events
        // When maximized: higher z-index to capture events over iframe
        dragCover.style.zIndex = isMinimized ? '2147483646' : '2147483648';
        dragCover.style.display = 'block';

        // Add event listeners to both window AND dragCover for maximum coverage
        const moveHandler = onDragMove;
        const endHandler = onDragEnd;

        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('mouseup', endHandler);
        window.addEventListener('mouseleave', endHandler);

        dragCover.addEventListener('mousemove', moveHandler);
        dragCover.addEventListener('mouseup', endHandler);
        dragCover.addEventListener('mouseleave', endHandler);
    }

    function onDragMove(e) {
        if (!isDragging || !overlayContainer) return;

        const dx = e.screenX - dragStartX;
        const dy = e.screenY - dragStartY;

        overlayContainer.style.left = (initialLeft + dx) + 'px';
        overlayContainer.style.top = (initialTop + dy) + 'px';
        overlayContainer.style.right = 'auto';
        overlayContainer.style.willChange = 'transform'; // Optimize rendering
    }

    function onDragEnd() {
        if (!isDragging) return; // Already stopped

        isDragging = false;

        // Clean up will-change optimization
        if (overlayContainer) {
            overlayContainer.style.willChange = 'auto';
        }

        const dragCover = document.getElementById('drag-cover');
        if (dragCover) {
            dragCover.style.display = 'none';
            // Remove listeners from dragCover
            dragCover.removeEventListener('mousemove', onDragMove);
            dragCover.removeEventListener('mouseup', onDragEnd);
            dragCover.removeEventListener('mouseleave', onDragEnd);
        }

        // Remove listeners from window
        window.removeEventListener('mousemove', onDragMove);
        window.removeEventListener('mouseup', onDragEnd);
        window.removeEventListener('mouseleave', onDragEnd);
    }
}
