# Sistema de Design – Relatório de Vídeo (Solar Pop Edition)

## Documentação Completa v1.0

> **IMPORTANTE:** Este documento reflete a implementação atual da página de Relatório de Vídeo em `templates.js`, seguindo o design system **Solar Pop Edition** (Neo-Brutalista/Retro-Pop).

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

O **Relatório de Vídeo** é o output final do processo de transcrição e análise por IA. Apresenta de forma estruturada o conteúdo extraído do vídeo, organizado em seções temáticas com visual Neo-Brutalista.

### 1.1 Princípios de Design

- **Legibilidade Máxima**: Foco na clareza do conteúdo gerado por IA
- **Estruturação por Blocos**: Cada seção do relatório é um card distinto com sombra
- **Bordas Sólidas**: Cards com bordas de 2-4px sem desfoque
- **Sombras Planas**: Sombras projetadas sem blur (`4px 4px 0px 0px` a `8px 8px 0px 0px`)
- **Hierarquia Visual**: Ícones emoji + títulos uppercase identificam seções rapidamente
- **Feedback Tátil**: Cards elevam no hover

### 1.2 Funcionalidades

- **Header**: Título do vídeo, badge do modelo usado, metadados
- **Metadados**: URL original, data, modelo de IA, prompt utilizado
- **Estatísticas de Tempo**: Breakdown do tempo gasto em cada etapa (Download, Transcrição, IA, etc.)
- **Materiais de Apoio**: Links e recursos complementares extraídos do vídeo
- **Reprocessamento**: Botão para gerar novo resumo com outro modelo de prompt
- **14 Seções de Conteúdo**: Resumo Executivo, Objetivos, Conceitos, Ferramentas, Citações, etc.
- **Transcrição Colapsável**: Texto original da transcrição do vídeo

### 1.3 Estrutura da Página

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ HEADER                                    [🎯 P.R.O.M.P.T]│   │ ← Badge modelo
│ │ Título do Vídeo                                           │   │
│ │ 🔗 URL Original  📅 Data  🤖 IA  📝 Prompt                │   │ ← Meta Grid
│ │                                                           │   │
│ │ ⏱️ Tempo Total: 2min 45s                                  │   │ ← Stats Bar
│ │ [📥 Download: 5s] [🎤 Transcrição: 1min] [🤖 IA: 45s]     │   │   (verde)
│ │                                                           │   │
│ │ 📎 Materiais de Apoio (3)                                 │   │ ← Materiais
│ │ [Links...]                                                │   │   (azul)
│ └───────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ [🔄 Reprocessar Resumo]  [Select: modelo1 ▼]                    │ ← Reprocess Bar
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ ⚡ RESUMO EXECUTIVO                            [AI Badge] │   │ ← Section Card
│ │ Texto do resumo...                                        │   │
│ └───────────────────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 🎯 OBJETIVOS DE APRENDIZAGEM                [4 OBJETIVOS] │   │
│ │ 1. Objetivo 1                                             │   │
│ │ 2. Objetivo 2                                             │   │
│ │ ...                                                       │   │
│ └───────────────────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📖 CONCEITOS FUNDAMENTAIS                    [3 CONCEITOS]│   │
│ │ ┌─ Conceito 1 ──────────────────────────────────────────┐ │   │
│ │ │ Definição: ...                                        │ │   │
│ │ │ Exemplos: ...                                         │ │   │
│ │ └───────────────────────────────────────────────────────┘ │   │
│ └───────────────────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 🏗️ ESTRUTURA CENTRAL                        [5 ELEMENTOS] │   │ ← Timeline
│ │ ● 1. Elemento 1                                           │   │
│ │ │   Descrição...                                          │   │
│ │ ● 2. Elemento 2                                           │   │
│ │ ...                                                       │   │
│ └───────────────────────────────────────────────────────────┘   │
│ ...                                                             │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 💬 CITAÇÕES MARCANTES                        [2 CITAÇÕES] │   │
│ │ > "Citação importante..."                                 │   │ ← Blockquote
│ │   — Contexto                                              │   │
│ └───────────────────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📜 TRANSCRIÇÃO ORIGINAL                        [▼ Expandir]│   │ ← Collapsible
│ │ Texto completo da transcrição...                          │   │
│ └───────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ VIDEO PROCESSOR • SOLAR POP EDITION                             │ ← Footer
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Paleta de Cores

### 2.1 Cores Semânticas Principais

| Nome | Variável CSS | Hex | Uso no Relatório |
|------|-------------|-----|------------------|
| **Base** | `--base` | `#FFF8E7` | Fundo da página, fundo de listas |
| **Ink** | `--ink` | `#2D3436` | Bordas, texto principal, sombras |
| **Accent** | `--accent` | `#FF6B6B` | Títulos de conceitos, sombra hover, citações |
| **Pop** | `--pop` | `#4ECDC4` | Badges de modelo P.R.O.M.P.T., timeline |
| **Sun** | `--sun` | `#FFE66D` | Badges de contagem, collapsible headers |

### 2.2 Cores de Contexto

| Contexto | Background | Borda | Texto |
|----------|------------|-------|-------|
| Header Card | `white` | `4px solid var(--ink)` | `var(--ink)` |
| Section Card | `white` | `2px solid var(--ink)` | `var(--ink)` |
| Stats Bar (Tempo) | `linear-gradient(#f0fdf4, #dcfce7)` | `1px solid #86efac` | `#166534` |
| Materiais de Apoio | `linear-gradient(#f0f9ff, #e0f2fe)` | `2px solid #0ea5e9` | `#0369a1` |
| Error Card | `#FFF5F5` | `3px solid #E53E3E` | `#C53030` |
| Conceito Item | `var(--base)` | `2px solid var(--ink)` | `var(--ink)` |
| Collapsible Header | `var(--sun)` | `2px solid var(--ink)` | `var(--ink)` |

### 2.3 Cores de Badge de Modelo

| Modelo | Background | Cor |
|--------|------------|-----|
| Modelo 4 (P.R.O.M.P.T.) | `linear-gradient(135deg, #10b981 0%, #059669 100%)` | `white` |
| Modelo 2 (Padrão) | `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` | `white` |

---

## 3. Tipografia

### 3.1 Famílias Tipográficas

| Família | Fonte | Pesos | Uso |
|---------|-------|-------|-----|
| **Display** | `Space Grotesk` | 500, 700 | Títulos, badges, botões |
| **Body** | `Inter` | 400, 500, 600 | Corpo de texto, metadados |
| **Mono** | `monospace` | 400 | Transcrição, URLs |

### 3.2 Escala Tipográfica

| Elemento | Tamanho | Peso | Transform | Uso |
|----------|---------|------|-----------|-----|
| Título Principal | 32px | 700 | uppercase | Título do vídeo |
| Título de Seção | 24px | 700 | uppercase | "⚡ RESUMO EXECUTIVO" |
| Subtítulo Conceito | - | 700 | - | Nome do conceito |
| Meta Label | 12px | 700 | uppercase | "🔗 URL ORIGINAL" |
| Corpo de Texto | 14-16px | 400-500 | - | Conteúdo das seções |
| Badge | 12px | 700 | - | "4 OBJETIVOS" |
| Footer | 12px | 700 | uppercase | Créditos |

---

## 4. Iconografia

### 4.1 Ícones de Seção (Emojis)

| Ícone | Seção |
|-------|-------|
| ⚡ | Resumo Executivo |
| 🎯 | Objetivos de Aprendizagem |
| 📖 | Conceitos Fundamentais |
| 🏗️ | Estrutura Central |
| 💡 | Exemplos |
| 🔧 | Ferramentas e Métodos |
| 📋 | Orientações Práticas |
| 📚 | Abordagem Pedagógica |
| 💎 | Ideias-Chave |
| 🧠 | Pontos de Memorização |
| 💬 | Citações Marcantes |
| ➡️ | Próximos Passos |
| 📝 | Preparação Próxima Aula |
| 📎 | Materiais de Apoio |
| 📜 | Transcrição Original |

### 4.2 Ícones de Metadados

| Ícone | Uso |
|-------|-----|
| 🔗 | URL Original |
| 📅 | Data de Processamento |
| 🤖 | Modelo de IA |
| 📝 | Modelo de Prompt |
| 📺 | Manifest URL |
| ⏱️ | Tempo Total |
| 📥 | Download |
| 🎤 | Transcrição |
| 💾 | Salvamento |

### 4.3 Ícones de Ação

| Ícone | Uso |
|-------|-----|
| 🔄 | Reprocessar |
| 🎯 | Badge P.R.O.M.P.T. |
| 📊 | Badge Padrão |
| ⚠️ | Erro |
| ✅ | Sucesso |

---

## 5. Componentes de Interface

### 5.1 Header Card

```css
.header {
    border: 4px solid var(--ink);
    background: white;
    padding: 30px;
    margin-bottom: 40px;
    box-shadow: 8px 8px 0px 0px var(--ink);
    position: relative;
}

.header h1 {
    font-size: 32px;
    line-height: 1.2;
    margin-bottom: 20px;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
}
```

### 5.2 Meta Grid

```css
.meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    font-size: 14px;
    font-weight: 500;
}

.meta-item {
    overflow-wrap: break-word;
    word-break: break-word;
}

.meta-item strong {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 4px;
}
```

### 5.3 Badge de Modelo

```css
.model-badge {
    position: absolute;
    top: 15px;
    right: 15px;
    padding: 8px 16px;
    border: 2px solid var(--ink);
    border-radius: 8px;
    font-weight: 700;
    font-size: 12px;
    box-shadow: 3px 3px 0px 0px var(--ink);
}

.model-badge.prompt {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
}

.model-badge.default {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}
```

### 5.4 Stats Bar (Tempo de Processamento)

```css
.stats-bar {
    margin-top: 10px;
    padding: 12px;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border: 1px solid #86efac;
    border-radius: 8px;
}

.stats-bar strong {
    color: #166534;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
    margin-top: 8px;
}

.stats-item {
    background: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
}
```

### 5.5 Section Card

```css
.section-card {
    background: white;
    border: 2px solid var(--ink);
    padding: 30px;
    margin-bottom: 30px;
    box-shadow: 4px 4px 0px 0px var(--ink);
    transition: transform 0.2s;
}

.section-card:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0px 0px var(--accent);
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    border-bottom: 2px solid var(--base);
    padding-bottom: 10px;
}

.card-title {
    font-size: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
}

.card-badge {
    background: var(--sun);
    border: 2px solid var(--ink);
    padding: 2px 8px;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 2px 2px 0px 0px var(--ink);
}
```

### 5.6 Retro List (Listas Numeradas)

```css
.retro-list {
    list-style: none;
    counter-reset: item;
}

.retro-list li {
    position: relative;
    background: var(--base);
    border: 2px solid var(--ink);
    margin-bottom: 10px;
    padding: 15px 15px 15px 50px;
    font-weight: 500;
}

.retro-list li::before {
    content: counter(item);
    counter-increment: item;
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 35px;
    background: var(--ink);
    color: var(--sun);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
}
```

### 5.7 Timeline (Estrutura Central)

```css
.timeline-item {
    border-left: 4px solid var(--ink);
    padding-left: 20px;
    margin-bottom: 20px;
    position: relative;
}

.timeline-item::before {
    content: '';
    position: absolute;
    left: -10px;
    top: 0;
    width: 16px;
    height: 16px;
    background: var(--accent);
    border: 2px solid var(--ink);
    border-radius: 50%;
}

.step-title {
    font-weight: 700;
    font-size: 18px;
    color: var(--ink);
}

.step-desc {
    font-size: 14px;
    background: #edf2f7;
    padding: 10px;
    border-left: 4px solid var(--pop);
    margin-top: 5px;
}
```

### 5.8 Citação (Blockquote)

```css
.citacao {
    background: var(--base);
    border-left: 4px solid var(--accent);
    padding: 15px;
    margin-bottom: 15px;
}

.citacao p {
    font-style: italic;
    margin-bottom: 8px;
}

.citacao footer {
    font-size: 12px;
    color: var(--accent);
}
```

### 5.9 Collapsible (Transcrição)

```css
.collapsible {
    border: 2px solid var(--ink);
    margin-bottom: 20px;
    background: white;
}

.collapsible-header {
    padding: 15px;
    background: var(--sun);
    cursor: pointer;
    font-weight: 700;
    display: flex;
    justify-content: space-between;
    border-bottom: 2px solid var(--ink);
}

.collapsible-content {
    display: none;
    padding: 20px;
    font-family: monospace;
    font-size: 12px;
    white-space: pre-wrap;
}

.collapsible.open .collapsible-content {
    display: block;
}
```

### 5.10 Botão Reprocessar

```css
.btn-reprocess {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 24px;
    border: 2px solid var(--ink);
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 3px 3px 0px 0px var(--ink);
    font-size: 14px;
    font-family: 'Space Grotesk', sans-serif;
    transition: all 0.2s;
}

.btn-reprocess:hover {
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0px 0px var(--ink);
}

.btn-reprocess:active {
    transform: translate(1px, 1px);
    box-shadow: 2px 2px 0px 0px var(--ink);
}
```

### 5.11 Select de Modelo

```css
.model-select {
    margin-left: 10px;
    padding: 10px 15px;
    border: 2px solid var(--ink);
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    background: white;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
}
```

### 5.12 Error Card

```css
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
```

---

## 6. Layout e Espaçamento

### 6.1 Container Principal

```css
.container {
    max-width: 1200px;  /* Mais largo para leitura confortável */
    margin: 0 auto;
    padding: 20px;
}
```

### 6.2 Sistema de Espaçamento

| Contexto | Valor |
|----------|-------|
| Padding do container | 20px |
| Header margin-bottom | 40px |
| Section card margin-bottom | 30px |
| Card padding | 30px |
| Card header padding-bottom | 10px |
| Meta grid gap | 20px |
| Retro list item margin-bottom | 10px |
| Timeline item margin-bottom | 20px |

### 6.3 Sombras

| Componente | Sombra |
|------------|--------|
| Header Card | `8px 8px 0px 0px var(--ink)` |
| Section Card | `4px 4px 0px 0px var(--ink)` |
| Section Card Hover | `6px 6px 0px 0px var(--accent)` |
| Badges | `2px 2px 0px 0px var(--ink)` |
| Botões | `3px 3px 0px 0px var(--ink)` |

---

## 7. Estados e Interações

### 7.1 Estados de Card

| Estado | Visual |
|--------|--------|
| Default | Sombra ink `4px 4px` |
| Hover | Translate `-2px, -2px`, sombra accent `6px 6px` |

### 7.2 Estados do Collapsible

| Estado | Visual |
|--------|--------|
| Collapsed | Conteúdo `display: none` |
| Expanded | Conteúdo `display: block` |

### 7.3 Estados de Reprocessamento

| Estado | Visual |
|--------|--------|
| Idle | Botão normal |
| Processing | Modal aberto com timer e progress bar |
| Success | "✅ CONCLUÍDO!" em verde |
| Error | Status vermelho com mensagem |

---

## 8. Padrões de Telas

### 8.1 Relatório Completo (Modelo 4)

Exibe todas as 14 seções geradas pelo prompt P.R.O.M.P.T.:
1. Resumo Executivo
2. Objetivos de Aprendizagem
3. Conceitos Fundamentais
4. Estrutura Central
5. Exemplos
6. Ferramentas e Métodos
7. Orientações Práticas
8. Abordagem Pedagógica
9. Ideias-Chave
10. Pontos de Memorização
11. Citações Marcantes
12. Próximos Passos
13. Preparação Próxima Aula
14. Materiais de Apoio

### 8.2 Relatório Legado

Suporta formato antigo com seções diferentes (pontos_chave, secoes, orient).

### 8.3 Estado de Erro

Quando há erros no processamento, exibe Error Card no topo listando os problemas por etapa.

---

## 9. Modais e Overlays

### 9.1 Modal de Reprocessamento

```css
.reprocess-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
}

.reprocess-modal-content {
    background: white;
    border: 4px solid var(--ink);
    padding: 40px;
    max-width: 500px;
    width: 90%;
    box-shadow: 8px 8px 0px 0px var(--ink);
    text-align: center;
}

.modal-timer {
    font-size: 48px;
    font-weight: bold;
    font-family: 'Space Grotesk', sans-serif;
    color: var(--accent);
    margin: 20px 0;
}

.modal-progress-bar {
    background: var(--base);
    border: 2px solid var(--ink);
    height: 30px;
    margin: 20px 0;
    position: relative;
}

.modal-progress-fill {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    height: 100%;
    width: 0%;
    transition: width 0.5s;
}

.modal-log {
    background: var(--ink);
    color: var(--sun);
    padding: 15px;
    font-family: monospace;
    font-size: 12px;
    text-align: left;
    max-height: 150px;
    overflow-y: auto;
    margin-bottom: 20px;
}
```

---

## 10. Responsividade

### 10.1 Breakpoints

| Breakpoint | Comportamento |
|------------|---------------|
| Desktop (> 1024px) | Layout padrão `max-w-[1200px]` |
| Tablet (768-1024px) | Grids adaptam para menos colunas |
| Mobile (< 768px) | Meta grid empilha verticalmente |

### 10.2 Print Styles

```css
@media print {
    body {
        background: white;
    }
    .section-card {
        box-shadow: none;
        break-inside: avoid;
    }
}
```

---

## 11. Acessibilidade

### 11.1 Contraste de Cores

| Combinação | Ratio | Status |
|------------|-------|--------|
| Ink (#2D3436) em Base (#FFF8E7) | 12.1:1 | ✅ AAA |
| Ink (#2D3436) em Base Sun (#FFE66D) | 9.2:1 | ✅ AAA |
| White em Accent (#FF6B6B) | 4.6:1 | ✅ AA Large |
| Green-800 em Green-50 | 7.2:1 | ✅ AAA |

### 11.2 Hierarquia H1-H6

- `h1`: Título do vídeo
- `h2`: Títulos de seção (Resumo Executivo, Objetivos, etc.)
- `h3`: Subtítulos (nomes de conceitos, etc.)

### 11.3 Links Acessíveis

```html
<a href="..." target="_blank" title="URL completa do vídeo">
    Texto visível truncado...
</a>
```

---

## 12. Tokens de Design

```css
:root {
    /* Cores principais */
    --base: #FFF8E7;   /* Cosmic Latte */
    --ink: #2D3436;    /* Void Charcoal */
    --accent: #FF6B6B; /* Bittersweet Coral */
    --pop: #4ECDC4;    /* Medium Turquoise */
    --sun: #FFE66D;    /* Maize Yellow */
    
    /* Tipografia */
    --font-display: 'Space Grotesk', sans-serif;
    --font-body: 'Inter', sans-serif;
    
    /* Sombras */
    --shadow-small: 2px 2px 0px 0px var(--ink);
    --shadow-medium: 4px 4px 0px 0px var(--ink);
    --shadow-large: 8px 8px 0px 0px var(--ink);
    --shadow-accent: 6px 6px 0px 0px var(--accent);
    
    /* Border radius */
    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
}
```

---

## 13. Dependências Externas

### 13.1 Fontes

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
```

### 13.2 APIs

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/report-data/{domain}/{videoId}` | GET | Carregar dados do relatório |
| `/api/reprocess` | POST | Reprocessar resumo com outro modelo |
| `/prompts` | GET | Listar modelos de prompt disponíveis |

### 13.3 Scripts

- `templates.js` - Geração do HTML do relatório

---

## 14. Guia de Implementação

### 14.1 Estrutura de Dados

O relatório é renderizado a partir de um JSON com a seguinte estrutura:

```javascript
{
    meta: {
        title: "Título do vídeo",
        url: "URL original",
        date: "DD/MM/YYYY",
        model: "gemini-2.0-flash-exp",
        origin: "Gemini",
        domain: "youtube.com",
        videoId: "xxx"
    },
    data: {
        resumo_executivo: "...",
        objetivos_aprendizagem: ["..."],
        conceitos_fundamentais: [{Nome, Definição, Exemplos}],
        estrutura_central: [{Título, Descrição}],
        exemplos: [{Contexto}],
        ferramentas_metodos: [{Nome, Descrição}],
        orientacoes_praticas: {acao_imediata, acao_curto_prazo, acao_medio_prazo},
        abordagem_pedagogica: {tom, ritmo, recursos_didaticos},
        ideias_chave: ["..."],
        pontos_memorizacao: {pilares, principios_repetidos},
        citacoes_marcantes: [{citacao, contexto}],
        proximos_passos: {acao_imediata, acao_curto_prazo, acao_continua},
        preparacao_proxima_aula: {tema, ganho_prometido, pre_requisitos},
        materiais_apoio: [{text, url}],
        tempo_processamento: {total_formatado, etapas: {...}},
        prompt_model_usado: "modelo4"
    },
    transcription: "Texto completo da transcrição...",
    errors: null  // ou {stage: "mensagem de erro"}
}
```

### 14.2 Checklist de Implementação

**Fase 1: Base**
- [ ] Carregar dados do JSON via API
- [ ] Renderizar header com metadados
- [ ] Exibir badge do modelo usado

**Fase 2: Conteúdo**
- [ ] Renderizar todas as 14 seções
- [ ] Suportar formato legado
- [ ] Exibir transcrição colapsável

**Fase 3: Reprocessamento**
- [ ] Botão reprocessar funcional
- [ ] Modal com timer e progress
- [ ] Carregar modelos disponíveis
- [ ] Recarregar após sucesso

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| v1.0 | 21/12/2025 | Criação inicial do documento seguindo a metodologia unificada de 14 seções. |

---

**FIM DO DOCUMENTO**
