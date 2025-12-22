# Sistema de Design – Extensão: Aba Captura

## Documentação Completa v1.0

> **IMPORTANTE:** Este documento reflete a implementação atual da aba Captura no `popup.html` da extensão de navegador, seguindo o design system **Solar Pop Edition** (Neo-Brutalista/Retro-Pop).

---

## 📋 Índice

1. [Visão Geral](#1-visão-geral)
2. [Paleta de Cores](#2-paleta-de-cores)
3. [Tipografia](#3-tipografia)
4. [Iconografia](#4-iconografia)
5. [Componentes de Interface](#5-componentes-de-interface)
6. [Layout e Espaçamento](#6-layout-e-espaçamento)
7. [Estados e Interações](#7-estados-e-interações)
8. [Padrões de Telas](#8-padrões-de-telas)
9. [Modais e Overlays](#9-modais-e-overlays)
10. [Responsividade](#10-responsividade)
11. [Acessibilidade](#11-acessibilidade)
12. [Tokens de Design](#12-tokens-de-design)
13. [Dependências Externas](#13-dependências-externas)
14. [Guia de Implementação](#14-guia-de-implementação)

---

## 1. Visão Geral

A **Aba Captura** é a tab principal da extensão Video Processor Pro. Permite capturar manifests de vídeo em páginas web, configurar processamento automático, monitorar o progresso do processamento e gerenciar vídeos capturados.

### 1.1 Princípios de Design

- **Bordas Sólidas**: Todos os elementos possuem bordas de 2-3px sem desfoque
- **Sombras Planas**: Sombras projetadas sem blur (`3px 3px 0px 0px`)
- **Cores Vibrantes**: Paleta curada Solar Pop Edition
- **Feedback Tátil**: Botões "afundam" ao clicar, elevam ao hover
- **Compactação**: UI otimizada para popup de extensão (420px largura)

### 1.2 Funcionalidades

- **Captura Automática**: Toggle para capturar vídeos automaticamente
- **Modelo de Prompt**: Seletor de template para resumos
- **Processamento**: Seção de progresso com timer e terminal
- **Lista de Manifests**: Cards com vídeos capturados
- **Ações**: Botões de processar, limpar e atualizar

### 1.3 Estrutura da Aba

```
┌─────────────────────────────────────────────────┐
│ ☐ Captura Automática - detectar vídeos          │ ← Toggle Container
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐   │
│ │ 🎯 Modelo de Prompt                       │   │ ← Card Select
│ │ [Dropdown de modelos]                     │   │
│ └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ 💡 Use o botão 🔄 Atualizar para recapturar...  │ ← Warning Box
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐   │
│ │ ⏳ Processando...                         │   │ ← Processing Section
│ │ ████████████████████░░░░░░░ 75%           │   │   (quando ativo)
│ │ ⏱ 05:32                                   │   │
│ │ 📹 Processando: [URL]                     │   │
│ │ Status: Gerando resumo...                 │   │
│ │ [🖥️ Mostrar Terminal]                     │   │
│ └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ 📡 Vídeos Capturados                            │ ← Section Title
│ ┌───────────────────────────────────────────┐   │
│ │ cloudflare.com                            │   │ ← Manifest Item
│ │ https://customer-xxx.cloudflare...        │   │
│ │ 14:32:15                                  │   │
│ │ [Processar] [Remover]                     │   │
│ └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ [🗑️ Limpar]           [🔄 Atualizar]            │ ← Action Buttons
└─────────────────────────────────────────────────┘
```

---

## 2. Paleta de Cores

### 2.1 Cores Semânticas Principais

| Nome | Variável CSS | Hex | Uso na Aba |
|------|-------------|-----|------------|
| **Base** | `--base` | `#FFF8E7` | Fundo do popup |
| **Ink** | `--ink` | `#2D3436` | Bordas, texto principal, sombras |
| **Accent** | `--accent` | `#FF6B6B` | Botão Processar, links de domínio |
| **Pop** | `--pop` | `#4ECDC4` | Botão Atualizar, barra de progresso |
| **Sun** | `--sun` | `#FFE66D` | Tabs ativas, badges |

### 2.2 Cores de Estado

| Contexto | Background | Borda | Texto |
|----------|------------|-------|-------|
| Toggle Container | `linear-gradient(135deg, #e8f5e9, #c8e6c9)` | - | `var(--ink)` |
| Warning Box | `#fff3cd` | `#856404` | `#856404` |
| Processing Section | `linear-gradient(135deg, #e3f2fd, #bbdefb)` | `3px solid var(--ink)` | `var(--ink)` |
| Terminal Output | `#1e1e1e` | - | `#d4d4d4` |
| Success Result | `var(--pop)` | `2px solid var(--ink)` | `var(--ink)` |

### 2.3 Cores do Terminal

| Classe | Cor | Uso |
|--------|-----|-----|
| `.log-success` | `#4CAF50` | Mensagens de sucesso |
| `.log-error` | `#f44336` | Mensagens de erro |
| `.log-warning` | `#ff9800` | Avisos |
| `.log-info` | `#2196F3` | Informações |

---

## 3. Tipografia

### 3.1 Famílias Tipográficas

| Família | Fonte | Pesos | Uso |
|---------|-------|-------|-----|
| **Display** | `Space Grotesk` | 500, 700 | Títulos, cards, timer |
| **Body** | `Inter` | 400, 500, 600 | Labels, descrições |
| **Mono** | `Consolas, monospace` | 400 | URLs, terminal |

### 3.2 Escala Tipográfica

| Elemento | Tamanho | Peso | Uso |
|----------|---------|------|-----|
| Processing Title | 16px | 700 | "⏳ Processando..." |
| Processing Timer | 28px | 700 | "⏱ 05:32" |
| Card Title | 14px | 700 | "🎯 Modelo de Prompt" |
| Manifest Domain | 12px | 700 | "cloudflare.com" |
| Manifest URL | 10px | 400 | URL monospace |
| Labels | 11px | 600 | Toggle labels |
| Warning Text | 10px | 400 | Texto de warning |

---

## 4. Iconografia

### 4.1 Ícones da Aba

| Ícone | Contexto | Uso |
|-------|----------|-----|
| 📡 | Tab/Seção | Captura, Vídeos Capturados |
| 🎯 | Card | Modelo de Prompt |
| 💡 | Warning | Dica/Informação |
| ⏳ | Status | Processando |
| ⏱ | Timer | Tempo decorrido |
| 📹 | Info | Vídeo processando |
| 🖥️ | Button | Mostrar Terminal |
| 🗑️ | Button | Limpar |
| 🔄 | Button | Atualizar |
| ✅ | Status | Concluído |
| 📊 | Button | Ver Relatório |

---

## 5. Componentes de Interface

### 5.1 Toggle Container

```css
.toggle-container {
    background: var(--base);
    border: 2px solid var(--ink);
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
}

/* Variante verde para Captura Automática */
.toggle-container.auto-capture {
    background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
}

.toggle-container input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.toggle-container label {
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
}
```

### 5.2 Card Básico

```css
.card {
    background: white;
    border: 2px solid var(--ink);
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 12px;
    box-shadow: 4px 4px 0px 0px var(--ink);
}

.card:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0px 0px var(--accent);
}

.card-title {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
}
```

### 5.3 Warning Box

```css
.warning-box {
    background: #fff3cd;
    border: 2px solid #856404;
    border-radius: 8px;
    padding: 8px;
    font-size: 10px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
}
```

### 5.4 Processing Section

```css
.processing-section {
    background: linear-gradient(135deg, #e3f2fd, #bbdefb);
    border: 3px solid var(--ink);
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 12px;
}

.processing-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.processing-title {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 16px;
}
```

### 5.5 Progress Bar

```css
.progress-bar {
    width: 100%;
    height: 16px;
    background: white;
    border: 2px solid var(--ink);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 8px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--pop), var(--accent));
    width: 0%;
    transition: width 0.3s ease;
}
```

### 5.6 Processing Timer

```css
.processing-timer {
    font-family: 'Space Grotesk', monospace;
    font-size: 28px;
    font-weight: 700;
    color: var(--ink);
    text-align: center;
    padding: 8px;
    background: white;
    border: 2px solid var(--ink);
    border-radius: 8px;
    margin-bottom: 8px;
}
```

### 5.7 Video Info Box

```css
.video-info {
    background: white;
    border: 2px solid var(--ink);
    border-radius: 8px;
    padding: 8px;
    margin-bottom: 8px;
}

.video-info .label {
    font-size: 10px;
    color: #666;
    font-weight: 600;
}

.video-info .url {
    font-size: 10px;
    color: var(--accent);
    word-break: break-all;
    font-family: monospace;
}
```

### 5.8 Terminal Output

```css
.terminal-toggle {
    background: var(--ink);
    color: var(--pop);
    border: none;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 10px;
    font-family: monospace;
    width: 100%;
    margin-top: 8px;
}

.terminal-toggle:hover {
    background: #444;
}

.terminal-output {
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: 'Consolas', monospace;
    font-size: 9px;
    padding: 8px;
    border-radius: 6px;
    max-height: 100px;
    overflow-y: auto;
    margin-top: 8px;
    line-height: 1.4;
}
```

### 5.9 Manifest Item

```css
.manifest-item {
    background: white;
    border: 2px solid var(--ink);
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 8px;
    transition: all 0.2s;
}

.manifest-item:hover {
    border-color: var(--accent);
}

.manifest-domain {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    color: var(--accent);
    font-size: 12px;
}

.manifest-url {
    font-size: 10px;
    color: #666;
    word-break: break-all;
    margin: 4px 0;
    font-family: monospace;
}

.manifest-time {
    font-size: 10px;
    color: #999;
}

.manifest-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
}
```

### 5.10 Botões

```css
.btn {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    border: 2px solid var(--ink);
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 11px;
    box-shadow: 3px 3px 0px 0px var(--ink);
    transition: all 0.1s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0px 0px var(--ink);
}

.btn:active {
    transform: translate(1px, 1px);
    box-shadow: 2px 2px 0px 0px var(--ink);
}

.btn-primary { background: var(--accent); color: white; }
.btn-secondary { background: white; color: var(--ink); }
.btn-pop { background: var(--pop); color: var(--ink); }
.btn-sun { background: var(--sun); color: var(--ink); }
.btn-sm { padding: 4px 8px; font-size: 10px; }
.btn-full { width: 100%; justify-content: center; }
```

### 5.11 Result Success

```css
.result-success {
    background: var(--pop);
    border: 2px solid var(--ink);
    border-radius: 8px;
    padding: 12px;
    margin-top: 12px;
    text-align: center;
}

.result-success h4 {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    margin-bottom: 8px;
}
```

---

## 6. Layout e Espaçamento

### 6.1 Dimensões do Popup

| Propriedade | Valor |
|-------------|-------|
| Largura | 420px |
| Altura mínima | 400px |
| Altura máxima | 600px |
| Padding do conteúdo | 12px |

### 6.2 Sistema de Espaçamento

| Contexto | Valor |
|----------|-------|
| Gap entre cards | 12px |
| Padding de card | 12px |
| Gap em botões | 8px |
| Margin de seção | 12px |

---

## 7. Estados e Interações

### 7.1 Estados do Toggle

| Estado | Visual |
|--------|--------|
| Unchecked | Checkbox vazio |
| Checked | Checkbox preenchido |
| Hover | Cursor pointer |

### 7.2 Estados de Processamento

| Estado | Visual | Elementos |
|--------|--------|-----------|
| Idle | Seção oculta | display: none |
| Processing | Seção visível | Progress bar animado, timer contando |
| Completed | Result success | Botão Ver Relatório visível |
| Error | Toast vermelho | Mensagem de erro |

---

## 8. Padrões de Telas

### 8.1 Estado Idle (Nenhum Processamento)

**Elementos Visíveis:**
- Toggle de Captura Automática
- Card de Modelo de Prompt
- Warning Box
- Lista de Manifests (ou empty state)
- Botões Limpar/Atualizar

**Elementos Ocultos:**
- Processing Section
- Result Success

### 8.2 Estado Processando

**Elementos Visíveis:**
- Processing Section com progresso
- Timer contando
- URL do vídeo sendo processado
- Botão Terminal
- Terminal output (se expandido)

---

## 9. Modais e Overlays

A aba Captura não possui modais próprios. Utiliza o modal de confirmação global da extensão para ações destrutivas (limpar manifests).

---

## 10. Responsividade

Como é uma extensão de navegador com largura fixa de 420px, não há adaptações responsivas. O scroll vertical é habilitado quando o conteúdo excede 600px.

---

## 11. Acessibilidade

### 11.1 Contraste de Cores

| Combinação | Ratio | Status |
|------------|-------|--------|
| Ink em Base | 12.1:1 | ✅ AAA |
| White em Accent | 4.6:1 | ✅ AA Large |
| Ink em Pop | 8.2:1 | ✅ AAA |

### 11.2 Navegação por Teclado

- `Tab`: Navega entre elementos interativos
- `Space`: Ativa toggles/checkboxes
- `Enter`: Ativa botões

---

## 12. Tokens de Design

```css
:root {
    --base: #FFF8E7;
    --ink: #2D3436;
    --accent: #FF6B6B;
    --pop: #4ECDC4;
    --sun: #FFE66D;
}
```

---

## 13. Dependências Externas

### 13.1 Fontes

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
```

### 13.2 Scripts

- `popup.js` - Lógica principal
- `processing_ui.js` - UI de processamento
- `library.js` - Gestão de biblioteca

---

## 14. Guia de Implementação

### 14.1 Checklist

- [ ] Toggle de captura automática funcional
- [ ] Seletor de modelo de prompt carregando da API
- [ ] Processing section com timer real
- [ ] Terminal output coletando logs
- [ ] Lista de manifests atualizada
- [ ] Botões de ação funcionais

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| v1.0 | 21/12/2025 | Criação inicial do documento |

---

**FIM DO DOCUMENTO**
