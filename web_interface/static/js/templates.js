/**
 * Templates para renderização dinâmica de relatórios
 * Suporta v1 (Modern) e v2 (Solar Pop)
 */

// Função auxiliar para escape HTML
function htmlEscape(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ===== FUNÇÕES GLOBAIS DE REPROCESSAMENTO =====
let reprocessTimer = null;
let reprocessSeconds = 0;
let pollInterval = null;
let currentDomain = '';
let currentVideoId = '';
let currentJsonPath = '';

function setReprocessVars(btn) {
    // Capturar valores dos atributos data-* do botão
    currentDomain = btn.dataset.domain || '';
    currentVideoId = btn.dataset.videoid || '';
    currentJsonPath = 'sumarios/' + currentDomain + '/' + currentVideoId + '/resumo_' + currentVideoId + '.json';
    console.log('setReprocessVars:', { currentDomain, currentVideoId, currentJsonPath });
}

function openReprocessModal() {
    const modal = document.getElementById('reprocess-modal');
    if (modal) {
        modal.style.display = 'flex';
        startReprocess();
    } else {
        alert('Modal de reprocessamento não encontrado');
    }
}

function closeReprocessModal() {
    const modal = document.getElementById('reprocess-modal');
    if (modal) modal.style.display = 'none';
    if (reprocessTimer) clearInterval(reprocessTimer);
    if (pollInterval) clearInterval(pollInterval);
    location.reload();
}

function updateTimer() {
    reprocessSeconds++;
    const mins = Math.floor(reprocessSeconds / 60).toString().padStart(2, '0');
    const secs = (reprocessSeconds % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('modal-timer');
    if (timerEl) timerEl.textContent = mins + ':' + secs;
}

function addLog(message) {
    const log = document.getElementById('modal-log');
    if (log) {
        const time = new Date().toLocaleTimeString('pt-BR');
        log.innerHTML += '\n[' + time + '] ' + message;
        log.scrollTop = log.scrollHeight;
    }
}

function startReprocess() {
    const modelSelect = document.getElementById('reprocess-model-select');
    const status = document.getElementById('modal-status');
    const progress = document.getElementById('modal-progress');
    const closeBtn = document.getElementById('modal-close-btn');

    if (!modelSelect || !status || !progress || !closeBtn) {
        console.error('Elementos do modal não encontrados');
        return;
    }

    // Pegar domain e videoId dos elementos data-* ou variáveis globais
    const domain = currentDomain || document.body.dataset.domain || '';
    const videoId = currentVideoId || document.body.dataset.videoid || '';
    const jsonPath = currentJsonPath || 'sumarios/' + domain + '/' + videoId + '/resumo_' + videoId + '.json';

    reprocessSeconds = 0;
    reprocessTimer = setInterval(updateTimer, 1000);

    addLog('Iniciando com ' + modelSelect.value);
    addLog('JSON: ' + jsonPath);
    status.textContent = '📡 Enviando requisição...';
    progress.style.width = '10%';

    fetch('http://localhost:5000/api/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonPath: jsonPath,
            promptModel: modelSelect.value
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) {
                status.textContent = '❌ Erro: ' + data.error;
                status.style.color = 'red';
                addLog('ERRO: ' + data.error);
                progress.style.background = '#e53e3e';
                progress.style.width = '100%';
                clearInterval(reprocessTimer);
                closeBtn.style.display = 'inline-block';
                closeBtn.textContent = '❌ Fechar';
            } else {
                addLog('✅ Requisição aceita');
                status.textContent = '⏳ Processando...';
                progress.style.width = '30%';

                let pollCount = 0;
                pollInterval = setInterval(() => {
                    pollCount++;
                    progress.style.width = Math.min(30 + pollCount * 5, 90) + '%';
                    if (pollCount % 5 === 0) addLog('⏳ Processando... (' + reprocessSeconds + 's)');
                    if (pollCount >= 15) {
                        clearInterval(pollInterval);
                        clearInterval(reprocessTimer);
                        status.textContent = '✅ CONCLUÍDO!';
                        status.style.color = 'green';
                        progress.style.width = '100%';
                        progress.style.background = '#10b981';
                        addLog('✅ Finalizado em ' + reprocessSeconds + 's');
                        closeBtn.style.display = 'inline-block';
                    }
                }, 2000);
            }
        })
        .catch(err => {
            status.textContent = '❌ Erro de conexão';
            status.style.color = 'red';
            addLog('ERRO: ' + err.message);
            progress.style.background = '#e53e3e';
            progress.style.width = '100%';
            clearInterval(reprocessTimer);
            closeBtn.style.display = 'inline-block';
            closeBtn.textContent = '❌ Fechar';
        });
}
// ===== FIM FUNÇÕES GLOBAIS =====

/**
 * Template v2: Solar Pop (Retro-Brutalist)
 */
function templateV2SolarPop(reportData) {
    const { meta, data, transcription, errors } = reportData;
    const hasErrors = errors && Object.keys(errors).length > 0;

    const css = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap');
        
        :root {
            --base: #FFF8E7;   /* Cosmic Latte */
            --ink: #2D3436;    /* Void Charcoal */
            --accent: #FF6B6B; /* Bittersweet Coral */
            --pop: #4ECDC4;    /* Medium Turquoise */
            --sun: #FFE66D;    /* Maize Yellow */
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: var(--base);
            color: var(--ink);
            line-height: 1.6;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        
        /* Typography */
        h1, h2, h3 { font-family: 'Space Grotesk', sans-serif; font-weight: 700; text-transform: uppercase; }
        
        /* Header */
        .header {
            border: 4px solid var(--ink);
            background: white;
            padding: 30px;
            margin-bottom: 40px;
            box-shadow: 8px 8px 0px 0px var(--ink);
            position: relative;
        }
        .header h1 { font-size: 32px; line-height: 1.2; margin-bottom: 20px; }
        .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; font-size: 14px; font-weight: 500; }
        .meta-item { overflow-wrap: break-word; word-break: break-word; }
        .meta-item strong { display: block; font-size: 12px; text-transform: uppercase; color: var(--accent); margin-bottom: 4px; }
        
        /* Cards */
        .section-card {
            background: white;
            border: 2px solid var(--ink);
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 4px 4px 0px 0px var(--ink);
            transition: transform 0.2s;
        }
        .section-card:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0px 0px var(--accent); }
        
        .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid var(--base); padding-bottom: 10px; }
        .card-title { font-size: 24px; display: flex; align-items: center; gap: 10px; }
        .card-badge { background: var(--sun); border: 2px solid var(--ink); padding: 2px 8px; font-size: 12px; font-weight: 700; box-shadow: 2px 2px 0px 0px var(--ink); }
        
        /* Lists */
        .retro-list { list-style: none; counter-reset: item; }
        .retro-list li {
            position: relative;
            background: var(--base);
            border: 2px solid var(--ink);
            margin-bottom: 10px;
            padding: 15px 15px 15px 50px;
            font-weight: 500;
        }
        .retro-list li::before {
            content: counter(item); counter-increment: item;
            position: absolute; left: 0; top: 0; bottom: 0; width: 35px;
            background: var(--ink); color: var(--sun);
            display: flex; align-items: center; justify-content: center;
            font-family: 'Space Grotesk', sans-serif; font-weight: 700;
        }
        
        /* Timeline */
        .timeline-item {
            border-left: 4px solid var(--ink);
            padding-left: 20px; margin-bottom: 20px; position: relative;
        }
        .timeline-item::before {
            content: ''; position: absolute; left: -10px; top: 0; width: 16px; height: 16px;
            background: var(--accent); border: 2px solid var(--ink); border-radius: 50%;
        }
        .step-title { font-weight: 700; font-size: 18px; color: var(--ink); }
        .step-desc { font-size: 14px; background: #edf2f7; padding: 10px; border-left: 4px solid var(--pop); margin-top: 5px; }
        
        /* Collapsible */
        .collapsible { border: 2px solid var(--ink); margin-bottom: 20px; background: white; }
        .collapsible-header {
            padding: 15px; background: var(--sun); cursor: pointer; font-weight: 700;
            display: flex; justify-content: space-between; border-bottom: 2px solid var(--ink);
        }
        .collapsible-content { display: none; padding: 20px; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
        .collapsible.open .collapsible-content { display: block; }
        
        .footer { text-align: center; font-size: 12px; font-weight: 700; color: var(--ink); margin-top: 50px; text-transform: uppercase; }
        
        /* Error Alert */
        .error-card {
            background: #FFF5F5;
            border: 3px solid #E53E3E;
            padding: 25px;
            margin-bottom: 30px;
            box-shadow: 4px 4px 0px 0px #E53E3E;
        }
        .error-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
            font-size: 20px;
            font-weight: 700;
            color: #C53030;
            font-family: 'Space Grotesk', sans-serif;
        }
        .error-list {
            list-style: none;
        }
        .error-list li {
            background: white;
            border: 2px solid #E53E3E;
            padding: 12px 15px;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .error-list li strong {
            color: #C53030;
            text-transform: uppercase;
            font-size: 12px;
        }
        
        @media print {
            body { background: white; }
            .section-card { box-shadow: none; break-inside: avoid; }
        }
    `;

    const pontos = data.pontos_chave || [];
    const orient = data.orientacoes || [];
    const secoes = data.secoes || [];

    let html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${htmlEscape(meta.title)}</title>
    <style>${css}</style>
</head>
<body>
<div class="container">
    
    <!-- Header -->
    <div class="header">
        <h1>${htmlEscape(meta.title)}</h1>
        ${data.prompt_model_usado || data._modelo ? `
        <div style="position: absolute; top: 15px; right: 15px; background: ${(data.prompt_model_usado || data._modelo) === 'modelo4' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}; color: white; padding: 8px 16px; border: 2px solid var(--ink); border-radius: 8px; font-weight: 700; font-size: 12px; box-shadow: 3px 3px 0px 0px var(--ink);">
            ${(data.prompt_model_usado || data._modelo) === 'modelo4' ? '🎯 P.R.O.M.P.T. (Modelo 4)' : '📊 Padrão (Modelo 2)'}
        </div>
        ` : ''}
        <div class="meta-grid">
            <div class="meta-item"><strong>URL Original</strong> ${htmlEscape(meta.url)}</div>
            <div class="meta-item"><strong>Data</strong> ${htmlEscape(meta.date)}</div>
            <div class="meta-item"><strong>IA Model</strong> ${htmlEscape(meta.model)}</div>
            ${data.prompt_model_usado || data._modelo ? `<div class="meta-item"><strong>Prompt</strong> ${htmlEscape(data.prompt_model_usado || data._modelo)}</div>` : ''}
        </div>
    </div>
    
    <!-- Botão de Reprocessamento -->
    ${transcription ? `
    <div style="background: white; border: 2px solid var(--ink); padding: 20px; margin-bottom: 30px; box-shadow: 4px 4px 0px 0px var(--ink);">
        <button id="reprocess-btn" 
                data-domain="${meta.domain || ''}" 
                data-videoid="${meta.videoId || meta.id || ''}"
                onclick="setReprocessVars(this); openReprocessModal();" 
                style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                       color: white; 
                       padding: 12px 24px; 
                       border: 2px solid var(--ink); 
                       border-radius: 8px; 
                       font-weight: 700; 
                       cursor: pointer; 
                       box-shadow: 3px 3px 0px 0px var(--ink);
                       font-size: 14px;
                       font-family: 'Space Grotesk', sans-serif;
                       transition: all 0.2s;">
            🔄 Reprocessar Resumo
        </button>
        
        <select id="reprocess-model-select" 
                style="margin-left: 10px; 
                       padding: 10px 15px; 
                       border: 2px solid var(--ink); 
                       border-radius: 8px; 
                       font-weight: 600;
                       font-size: 14px;
                       background: white;
                       cursor: pointer;
                        font-family: 'Inter', sans-serif;">
            <option value="">⏳ Carregando prompts...</option>
        </select>
        
        <script>
        // Carregar prompts disponíveis para reprocessamento
        (async function loadReprocessPrompts() {
            const selector = document.getElementById('reprocess-model-select');
            if (!selector) return;
            
            try {
                const response = await fetch('/prompts', { cache: 'no-store' });
                if (!response.ok) throw new Error('API indisponível');
                
                const data = await response.json();
                const prompts = data.prompts || [];
                
                if (prompts.length === 0) {
                    selector.innerHTML = '<option value="">❌ Nenhum prompt disponível</option>';
                    return;
                }
                
                // Popular dropdown
                selector.innerHTML = '';
                prompts.forEach(prompt => {
                    const option = document.createElement('option');
                    option.value = prompt.name;
                    const icon = prompt.valid ? '✅' : '❌';
                    option.textContent = icon + ' ' + prompt.name;
                    option.disabled = !prompt.valid;
                    selector.appendChild(option);
                });
                
                // Selecionar o prompt usado atualmente (passado do Python)
                const currentPrompt = '${htmlEscape(str(data.get("prompt_model_usado") or data.get("_modelo") or ""))}';
                if (currentPrompt) {
                    Array.from(selector.options).forEach(opt => {
                        if (opt.value === currentPrompt) opt.selected = true;
                    });
                }
                
            } catch (error) {
                console.error('Erro ao carregar prompts:', error);
                selector.innerHTML = '<option value="">❌ Erro ao carregar</option>';
            }
        })();
        </script>
    </div>
    
    < !--Modal de Reprocessamento-- >
    <div id="reprocess-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; justify-content: center; align-items: center;">
        <div style="background: white; border: 4px solid var(--ink); padding: 40px; max-width: 500px; width: 90%; box-shadow: 8px 8px 0px 0px var(--ink); text-align: center;">
            <h2 style="font-family: 'Space Grotesk', sans-serif; margin-bottom: 20px;">🔄 REPROCESSANDO</h2>

            <div id="modal-status" style="font-size: 16px; margin-bottom: 20px; color: var(--ink);">
                Iniciando reprocessamento...
            </div>

            <!-- Cronômetro -->
            <div id="modal-timer" style="font-size: 48px; font-weight: bold; font-family: 'Space Grotesk', sans-serif; color: var(--accent); margin: 20px 0;">
                00:00
            </div>

            <!-- Barra de progresso -->
            <div style="background: var(--base); border: 2px solid var(--ink); height: 30px; margin: 20px 0; position: relative;">
                <div id="modal-progress" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100%; width: 0%; transition: width 0.5s;"></div>
            </div>

            <!-- Log de progresso -->
            <div id="modal-log" style="background: var(--ink); color: var(--sun); padding: 15px; font-family: monospace; font-size: 12px; text-align: left; max-height: 150px; overflow-y: auto; margin-bottom: 20px;">
                [INFO] Aguardando início do processamento...
            </div>

            <button id="modal-close-btn" onclick="closeReprocessModal()" style="display: none; background: var(--sun); border: 2px solid var(--ink); padding: 12px 24px; font-weight: bold; cursor: pointer; box-shadow: 3px 3px 0px 0px var(--ink);">
                ✅ Fechar e Recarregar
            </button>
        </div>
    </div>
` : ''}
    `;

    // Seção de Erros (se houver)
    if (hasErrors) {
        html += `
    <div class="error-card">
        <div class="error-header">⚠️ ERROS NO PROCESSAMENTO</div>
        <ul class="error-list">
            ${Object.entries(errors).map(([stage, error]) => `
                <li><strong>${htmlEscape(stage)}:</strong> ${htmlEscape(error)}</li>
            `).join('')}
        </ul>
    </div>
        `;
    }

    // Detectar se é Modelo 2/4 ou formato legado
    const isModelo2 = data.resumo_executivo || data.objetivos_aprendizagem;

    if (isModelo2) {
        // MODELO 2/4: Renderizar 14 seções

        // 1. Resumo Executivo
        const resumo = data.resumo_executivo || '';
        if (resumo) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">⚡ Resumo Executivo</h2>
            <span class="card-badge">${htmlEscape(meta.origin) || 'AI'}</span>
        </div>
        <p>${htmlEscape(resumo)}</p>
    </div>`;
        }

        // 2. Objetivos de Aprendizagem
        const objetivos = data.objetivos_aprendizagem || [];
        if (objetivos.length > 0) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">🎯 Objetivos de Aprendizagem</h2>
            <span class="card-badge">${objetivos.length} OBJETIVOS</span>
        </div>
        <ol class="retro-list">
            ${objetivos.map(obj => `<li>${htmlEscape(obj)}</li>`).join('')}
        </ol>
    </div>`;
        }

        // 3. Conceitos Fundamentais
        const conceitos = data.conceitos_fundamentais || [];
        if (conceitos.length > 0) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">📖 Conceitos Fundamentais</h2>
            <span class="card-badge">${conceitos.length} CONCEITOS</span>
        </div>`;
            conceitos.forEach(c => {
                html += `
        <div style="background: var(--base); border: 2px solid var(--ink); padding: 15px; margin-bottom: 15px; border-radius: 8px;">
            <h3 style="color: var(--accent); margin-bottom: 10px;">${htmlEscape(c.Nome || c.nome || '')}</h3>
            <p><strong>Definição:</strong> ${htmlEscape(c.Definição || c.definicao || '')}</p>
            ${c.Exemplos || c.exemplos ? `<p><strong>Exemplos:</strong> ${htmlEscape(c.Exemplos || c.exemplos || '')}</p>` : ''}
        </div>`;
            });
            html += `</div>`;
        }

        // 4. Estrutura Central
        const estrutura = data.estrutura_central || [];
        if (estrutura.length > 0) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">🏗️ Estrutura Central</h2>
            <span class="card-badge">${estrutura.length} ELEMENTOS</span>
        </div>`;
            estrutura.forEach((e, i) => {
                html += `
        <div class="timeline-item">
            <div class="step-title">${i + 1}. ${htmlEscape(e.Título || e.titulo || '')}</div>
            <div class="step-desc">${htmlEscape(e.Descrição || e.descricao || '')}</div>
        </div>`;
            });
            html += `</div>`;
        }

        // 5. Exemplos
        const exemplos = data.exemplos || [];
        if (exemplos.length > 0) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">💡 Exemplos</h2>
            <span class="card-badge">${exemplos.length} EXEMPLOS</span>
        </div>
        <ol class="retro-list">
            ${exemplos.map(ex => `<li>${htmlEscape(ex.Contexto || ex.contexto || '')}</li>`).join('')}
        </ol>
    </div>`;
        }

        // 6. Ferramentas e Métodos
        const ferramentas = data.ferramentas_metodos || [];
        if (ferramentas.length > 0) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">🔧 Ferramentas e Métodos</h2>
            <span class="card-badge">${ferramentas.length} ITENS</span>
        </div>
        <ol class="retro-list">
            ${ferramentas.map(f => `<li><strong>${htmlEscape(f.Nome || f.nome || '')}</strong>: ${htmlEscape(f.Descrição || f.descricao || '')}</li>`).join('')}
        </ol>
    </div>`;
        }

        // 7. Orientações Práticas
        const orientacoes = data.orientacoes_praticas || {};
        if (Object.keys(orientacoes).length > 0) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">📋 Orientações Práticas</h2>
        </div>`;
            // Ação Imediata pode ser array de objetos ou string
            const acaoImediata = orientacoes.acao_imediata || [];
            if (Array.isArray(acaoImediata) && acaoImediata.length > 0) {
                html += `<h3 style="margin-bottom: 10px;">🚀 Ação Imediata:</h3><ol class="retro-list">`;
                acaoImediata.forEach(a => {
                    const tarefa = typeof a === 'string' ? a : (a.tarefa || a.Tarefa || '');
                    const como = typeof a === 'string' ? '' : (a.como_fazer || a['Como fazer'] || '');
                    html += `<li><strong>${htmlEscape(tarefa)}</strong>${como ? ` - ${htmlEscape(como)}` : ''}</li>`;
                });
                html += `</ol>`;
            } else if (typeof acaoImediata === 'string' && acaoImediata) {
                html += `<p><strong>🚀 Ação Imediata:</strong> ${htmlEscape(acaoImediata)}</p>`;
            }
            // Curto Prazo
            const acaoCurto = orientacoes.acao_curto_prazo || [];
            if (Array.isArray(acaoCurto) && acaoCurto.length > 0) {
                html += `<h3 style="margin: 15px 0 10px 0;">📅 Curto Prazo:</h3><ol class="retro-list">${acaoCurto.map(a => `<li>${htmlEscape(typeof a === 'string' ? a : a.tarefa || a.Tarefa || '')}</li>`).join('')}</ol>`;
            }
            // Médio Prazo
            const acaoMedio = orientacoes.acao_medio_prazo || [];
            if (Array.isArray(acaoMedio) && acaoMedio.length > 0) {
                html += `<h3 style="margin: 15px 0 10px 0;">🎯 Médio Prazo:</h3><ol class="retro-list">${acaoMedio.map(a => `<li>${htmlEscape(typeof a === 'string' ? a : a.tarefa || a.Tarefa || '')}</li>`).join('')}</ol>`;
            }
            html += `</div>`;
        }

        // 8. Abordagem Pedagógica
        const abordagem = data.abordagem_pedagogica || {};
        if (Object.keys(abordagem).length > 0) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">📚 Abordagem Pedagógica</h2>
        </div>`;
            // Suportar tanto maiúsculo quanto minúsculo
            const tom = abordagem.tom || abordagem.Tom || '';
            const ritmo = abordagem.ritmo || abordagem.Ritmo || '';
            const recursos = abordagem.recursos_didaticos || abordagem['Uso de analogias'] || [];
            const engajamento = abordagem.engajamento || [];
            const principios = abordagem.principios_andragogicos || abordagem['Foco prático / andragógico'] || [];
            if (tom) html += `<p><strong>Tom:</strong> ${htmlEscape(tom)}</p>`;
            if (ritmo) html += `<p><strong>Ritmo:</strong> ${htmlEscape(ritmo)}</p>`;
            if (Array.isArray(recursos) && recursos.length > 0) {
                html += `<p><strong>Recursos Didáticos:</strong> ${recursos.map(r => htmlEscape(r)).join(', ')}</p>`;
            }
            if (Array.isArray(engajamento) && engajamento.length > 0) {
                html += `<p><strong>Engajamento:</strong> ${engajamento.map(e => htmlEscape(e)).join(', ')}</p>`;
            }
            if (Array.isArray(principios) && principios.length > 0) {
                html += `<p><strong>Princípios Andragógicos:</strong> ${principios.map(p => htmlEscape(p)).join(', ')}</p>`;
            } else if (typeof principios === 'string' && principios) {
                html += `<p><strong>Foco Prático:</strong> ${htmlEscape(principios)}</p>`;
            }
            html += `</div>`;
        }

        // 9. Ideias-Chave
        const ideias = data.ideias_chave || [];
        if (ideias.length > 0) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">💎 Ideias-Chave</h2>
            <span class="card-badge">${ideias.length} IDEIAS</span>
        </div>
        <ol class="retro-list">
            ${ideias.map(i => `<li>${htmlEscape(i)}</li>`).join('')}
        </ol>
    </div>`;
        }

        // 10. Pontos de Memorização
        const pontos_memo = data.pontos_memorizacao || {};
        if (Object.keys(pontos_memo).length > 0) {
            const pilares = pontos_memo.pilares || [];
            const principios = pontos_memo.principios_repetidos || [];
            if (pilares.length > 0 || principios.length > 0) {
                html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">🧠 Pontos de Memorização</h2>
        </div>`;
                if (pilares.length > 0) {
                    html += `<h3 style="margin-bottom: 10px;">Pilares:</h3><ol class="retro-list">${pilares.map(p => `<li>${htmlEscape(p)}</li>`).join('')}</ol>`;
                }
                if (principios.length > 0) {
                    html += `<h3 style="margin: 20px 0 10px 0;">Princípios Repetidos:</h3><ol class="retro-list">${principios.map(p => `<li>${htmlEscape(p)}</li>`).join('')}</ol>`;
                }
                html += `</div>`;
            }
        }

        // 11. Citações Marcantes
        const citacoes = data.citacoes_marcantes || [];
        if (citacoes.length > 0) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">💬 Citações Marcantes</h2>
            <span class="card-badge">${citacoes.length} CITAÇÕES</span>
        </div>`;
            citacoes.forEach(c => {
                // Suportar tanto string quanto objeto {citacao, contexto}
                const texto = typeof c === 'string' ? c : (c.citacao || c.Citação || c.texto || '');
                const contexto = typeof c === 'object' ? (c.contexto || c.Contexto || '') : '';
                html += `<blockquote style="background: var(--base); border-left: 4px solid var(--accent); padding: 15px; margin-bottom: 15px;">
                    <p style="font-style: italic; margin-bottom: 8px;">"${htmlEscape(texto)}"</p>
                    ${contexto ? `<footer style="font-size: 12px; color: var(--accent);">— ${htmlEscape(contexto)}</footer>` : ''}
                </blockquote>`;
            });
            html += `</div>`;
        }

        // 12. Próximos Passos
        const proximos = data.proximos_passos || {};
        if (Object.keys(proximos).length > 0) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">➡️ Próximos Passos</h2>
        </div>`;
            // Ação Imediata pode ser array ou string
            const proxImediata = proximos.acao_imediata || [];
            if (Array.isArray(proxImediata) && proxImediata.length > 0) {
                html += `<p><strong>🚀 Ação Imediata:</strong> ${proxImediata.map(a => htmlEscape(typeof a === 'string' ? a : a.tarefa || '')).join('; ')}</p>`;
            } else if (typeof proxImediata === 'string' && proxImediata) {
                html += `<p><strong>🚀 Ação Imediata:</strong> ${htmlEscape(proxImediata)}</p>`;
            }
            // Curto Prazo
            const proxCurto = proximos.acao_curto_prazo || [];
            if (Array.isArray(proxCurto) && proxCurto.length > 0) {
                html += `<p><strong>📅 Curto Prazo:</strong> ${proxCurto.map(a => htmlEscape(typeof a === 'string' ? a : a.tarefa || '')).join('; ')}</p>`;
            }
            // Ação Contínua
            const proxContinua = proximos.acao_continua || [];
            if (Array.isArray(proxContinua) && proxContinua.length > 0) {
                html += `<p><strong>🔄 Ação Contínua:</strong> ${proxContinua.map(a => htmlEscape(typeof a === 'string' ? a : a.tarefa || '')).join('; ')}</p>`;
            }
            html += `</div>`;
        }

        // 13. Preparação Próxima Aula
        const preparacao = data.preparacao_proxima_aula || {};
        if (Object.keys(preparacao).length > 0) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">📝 Preparação Próxima Aula</h2>
        </div>`;
            // Suportar múltiplos formatos de chave
            const tema = preparacao.tema || preparacao['Tema mencionado'] || '';
            const ganho = preparacao.ganho_prometido || preparacao['Ganho prometido'] || '';
            const prereqs = preparacao.pre_requisitos || preparacao['Pré-requisitos'] || preparacao.preparacao_recomendada || [];
            const conexao = preparacao.conexao || '';
            const prazo = preparacao.prazo || '';
            if (tema) html += `<p><strong>Tema:</strong> ${htmlEscape(tema)}</p>`;
            if (ganho) html += `<p><strong>Ganho Prometido:</strong> ${htmlEscape(ganho)}</p>`;
            if (Array.isArray(prereqs) && prereqs.length > 0) {
                html += `<p><strong>Pré-requisitos:</strong> ${prereqs.map(p => htmlEscape(p)).join(', ')}</p>`;
            } else if (typeof prereqs === 'string' && prereqs) {
                html += `<p><strong>Pré-requisitos:</strong> ${htmlEscape(prereqs)}</p>`;
            }
            if (conexao) html += `<p><strong>Conexão:</strong> ${htmlEscape(conexao)}</p>`;
            if (prazo) html += `<p><strong>Prazo:</strong> ${htmlEscape(prazo)}</p>`;
            html += `</div>`;
        }

        // 14. Materiais de Apoio
        const materiais = data.materiais_apoio || [];
        if (materiais.length > 0) {
            html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">📎 Materiais de Apoio</h2>
            <span class="card-badge">${materiais.length} MATERIAIS</span>
        </div>
        <ol class="retro-list">
            ${materiais.map(m => `<li><strong>${htmlEscape(m.Nome || m.nome || '')}</strong>: ${htmlEscape(m.Descrição || m.descricao || '')}</li>`).join('')}
        </ol>
    </div>`;
        }

    } else {
        // FORMATO LEGADO: Renderizar seções básicas
        html += `
    <!-- Resumo -->
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">⚡ Resumo Executivo</h2>
            <span class="card-badge">${htmlEscape(meta.origin) || 'AI'}</span>
        </div>
        <p>${htmlEscape(data.resumo_conciso)}</p>
    </div>
    
    <!-- Pontos Chave -->
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">📌 Pontos Chave</h2>
            <span class="card-badge">${pontos.length} ITENS</span>
        </div>
        <ol class="retro-list">
            ${pontos.map(p => `<li>${htmlEscape(p)}</li>`).join('')}
        </ol>
    </div>
    `;
    }

    // Plano de Ação
    if (orient && orient.length > 0) {
        html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">🎯 Plano de Ação</h2>
            <span class="card-badge">${orient.length} PASSOS</span>
        </div>
        <div class="timeline">
            ${orient.map(o => `
                <div class="timeline-item">
                    <div class="step-title">${htmlEscape(o.acao || '')}</div>
                    <div class="step-desc">💡 ${htmlEscape(o.beneficio || '')}</div>
                </div>
            `).join('')}
        </div>
    </div>`;
    }

    // Capítulos
    if (secoes && secoes.length > 0) {
        html += `
    <div class="section-card">
        <div class="card-header">
            <h2 class="card-title">📚 Capítulos</h2>
            <span class="card-badge">${secoes.length} SEÇÕES</span>
        </div>
        <ul class="retro-list" style="list-style: none;">
            ${secoes.map(s => `
                <li>
                    <strong>${htmlEscape(s.titulo)}</strong>
                    <span style="float:right; font-size:12px; font-family:monospace;">${s.inicio}s - ${s.fim}s</span>
                </li>
            `).join('')}
        </ul>
    </div>`;
    }

    // Transcrição
    html += `
    <div class="collapsible">
        <div class="collapsible-header" onclick="this.parentElement.classList.toggle('open')">
            <span>📄 TRANSCRIÇÃO COMPLETA</span><span>+</span>
        </div>
        <div class="collapsible-content">${htmlEscape(transcription) || 'Transcrição não disponível.'}</div>
    </div>
    
    <!-- JSON -->
    <div class="collapsible">
        <div class="collapsible-header" onclick="this.parentElement.classList.toggle('open')">
            <span>🔧 DADOS TÉCNICOS (JSON)</span><span>+</span>
        </div>
        <div class="collapsible-content">${htmlEscape(data.retorno_literal_gemini) || '[Sem dados]'}</div>
    </div>
    
    <div class="footer">Gerado por Video Processor Pro • Solar Pop Edition</div>
</div>
</body>
</html>`;

    return html;
}

