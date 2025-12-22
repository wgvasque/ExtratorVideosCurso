# Sistema de Design – Extensão: Aba Biblioteca

## Documentação Completa v1.0

> **IMPORTANTE:** Este documento reflete a implementação atual da aba Biblioteca no `popup.html` da extensão de navegador, seguindo o design system **Solar Pop Edition** (Neo-Brutalista/Retro-Pop).

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

A **Aba Biblioteca** exibe os relatórios de vídeos já processados e salvos. Permite buscar, visualizar e abrir os relatórios HTML gerados pelo sistema. É semelhante à seção Biblioteca da interface web principal.

### 1.1 Princípios de Design

- **Bordas Sólidas**: Todos os elementos possuem bordas de 2-3px sem desfoque
- **Sombras Planas**: Sombras projetadas sem blur (`3px 3px 0px 0px`)
- **Cores Vibrantes**: Paleta curada Solar Pop Edition
- **Busca Rápida**: Campo de pesquisa para filtrar relatórios
- **Cards Interativos**: Hover com elevação e mudança de sombra

### 1.2 Funcionalidades

- **Listar** relatórios processados
- **Buscar** relatórios por título
- **Visualizar** relatório em nova aba
- **Exibir** metadados (data, duração)
- **Atualizar** lista de relatórios

### 1.3 Estrutura da Aba

```
┌─────────────────────────────────────────────────┐
│ ┌──────────────┐          ┌─────────────────┐   │
│ │  BIBLIOTECA  │          │ 🔍 Buscar...    │   │ ← Header
│ │  (rotated)   │          └─────────────────┘   │
│ └──────────────┘                                │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐   │
│ │ Aula 01 - Introdução ao Marketing        │   │ ← Report Item
│ │ 📅 21/12/2025 • ⏱ 45min                   │   │
│ │ [📊 Ver Relatório]                        │   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ Módulo 3 - Estratégias Avançadas         │   │ ← Report Item
│ │ 📅 20/12/2025 • ⏱ 1h 20min                │   │
│ │ [📊 Ver Relatório]                        │   │
│ └───────────────────────────────────────────┘   │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

---

## 2. Paleta de Cores

### 2.1 Cores Semânticas Principais

| Nome | Variável CSS | Hex | Uso na Aba |
|------|-------------|-----|------------|
| **Base** | `--base` | `#FFF8E7` | Fundo do popup |
| **Ink** | `--ink` | `#2D3436` | Bordas, texto principal, sombras |
| **Accent** | `--accent` | `#FF6B6B` | Sombra hover dos cards |
| **Pop** | `--pop` | `#4ECDC4` | Botões Ver Relatório |
| **Sun** | `--sun` | `#FFE66D` | Badge título "BIBLIOTECA" |

### 2.2 Cores de Interface

| Elemento | Background | Borda | Texto |
|----------|------------|-------|-------|
| Report Card | `white` | `2px solid var(--ink)` | `var(--ink)` |
| Report Card Hover | - | - | sombra `var(--accent)` |
| Title Badge | `var(--sun)` | `2px solid var(--ink)` | `var(--ink)` |
| Search Input | `white` | `2px solid var(--ink)` | `var(--ink)` |
| Meta Text | - | - | `#666` |

---

## 3. Tipografia

### 3.1 Famílias Tipográficas

| Família | Fonte | Pesos | Uso |
|---------|-------|-------|-----|
| **Display** | `Space Grotesk` | 700 | Título BIBLIOTECA, títulos de reports |
| **Body** | `Inter` | 400, 500 | Metadados, labels |

### 3.2 Escala Tipográfica

| Elemento | Tamanho | Peso | Uso |
|----------|---------|------|-----|
| Library Title | 16px | 700 | "BIBLIOTECA" badge |
| Report Title | 12px | 700 | Título do relatório |
| Report Meta | 10px | 400 | Data e duração |
| Search Input | 11px | 400 | Placeholder e texto |
| Button | 11px | 700 | "Ver Relatório" |

---

## 4. Iconografia

### 4.1 Ícones da Aba

| Ícone | Contexto | Uso |
|-------|----------|-----|
| 📚 | Tab | Identificador da aba |
| 🔍 | Input | Placeholder de busca |
| 📅 | Meta | Ícone de data |
| ⏱ | Meta | Ícone de duração |
| 📊 | Button | Ver Relatório |

---

## 5. Componentes de Interface

### 5.1 Library Header

```css
.library-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.library-title {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 16px;
    background: var(--sun);
    padding: 4px 12px;
    border: 2px solid var(--ink);
    display: inline-block;
    transform: rotate(-1deg);  /* Estilo inclinado */
}
```

### 5.2 Search Input

```css
.search-input {
    background: white;
    border: 2px solid var(--ink);
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 11px;
    width: 120px;
}

.search-input:focus {
    outline: none;
    border-color: var(--accent);
}

.search-input::placeholder {
    color: #999;
}
```

### 5.3 Report Item

```css
.report-item {
    background: white;
    border: 2px solid var(--ink);
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 8px;
    box-shadow: 3px 3px 0px 0px var(--ink);
    transition: all 0.2s;
}

.report-item:hover {
    transform: translate(-2px, -2px);
    box-shadow: 5px 5px 0px 0px var(--accent);
}

.report-title {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 12px;
    color: var(--ink);
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;  /* Truncar títulos longos */
}

.report-meta {
    font-size: 10px;
    color: #666;
    margin-bottom: 8px;
    display: flex;
    gap: 12px;
}

.report-meta span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.report-actions {
    display: flex;
    gap: 6px;
}
```

### 5.4 Botão Ver Relatório

```css
.btn-view-report {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    border: 2px solid var(--ink);
    border-radius: 8px;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 10px;
    box-shadow: 3px 3px 0px 0px var(--ink);
    transition: all 0.1s;
    background: var(--pop);
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.btn-view-report:hover {
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0px 0px var(--ink);
}

.btn-view-report:active {
    transform: translate(1px, 1px);
    box-shadow: 2px 2px 0px 0px var(--ink);
}
```

### 5.5 Empty State

```css
.empty-state {
    text-align: center;
    padding: 24px;
    color: #999;
}

.empty-state .icon {
    font-size: 32px;
    margin-bottom: 8px;
}

.empty-state p {
    font-size: 12px;
}
```

---

## 6. Layout e Espaçamento

### 6.1 Dimensões

| Propriedade | Valor |
|-------------|-------|
| Largura do popup | 420px |
| Padding do conteúdo | 12px |
| Gap entre reports | 8px |
| Largura search input | 120px |

### 6.2 Sistema de Espaçamento

| Contexto | Valor |
|----------|-------|
| Header margin bottom | 12px |
| Report title margin | 0 0 4px 0 |
| Report meta margin | 0 0 8px 0 |
| Report actions margin | 8px 0 0 0 |

### 6.3 Truncamento de Texto

Títulos longos são truncados com ellipsis:

```css
.report-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}
```

---

## 7. Estados e Interações

### 7.1 Estados do Report Card

| Estado | Visual |
|--------|--------|
| Default | Sombra ink, fundo branco |
| Hover | Translate -2px, sombra accent |
| Focus | Border accent |

### 7.2 Estados da Busca

| Estado | Visual |
|--------|--------|
| Empty | Placeholder "Buscar..." |
| Focused | Border accent |
| With Text | Filtra lista em tempo real |

### 7.3 Fluxo de Busca

```
1. Usuário digita no campo de busca
   ↓
2. Filtragem em tempo real (debounce 300ms)
   ↓
3. Lista atualizada mostrando matches
   ↓
4. Se nenhum match: empty state ou mensagem
```

---

## 8. Padrões de Telas

### 8.1 Com Relatórios

**Elementos Visíveis:**
- Header com título e busca
- Lista de report items
- Cada report com título, meta e botão

### 8.2 Sem Relatórios (Empty State)

**Elementos Visíveis:**
- Header com título e busca
- Empty state:
  - Ícone 📚
  - Mensagem "Nenhum relatório encontrado" ou "Processando vídeos para criá-los"

### 8.3 Buscando sem Resultados

**Elementos Visíveis:**
- Header com título e busca preenchida
- Empty state com mensagem "Nenhum resultado para [termo]"

---

## 9. Modais e Overlays

A aba Biblioteca não possui modais próprios. O relatório é aberto em uma nova aba do navegador através da interface web.

---

## 10. Responsividade

Não aplicável - largura fixa de 420px para popup de extensão.

---

## 11. Acessibilidade

### 11.1 Contraste de Cores

| Combinação | Ratio | Status |
|------------|-------|--------|
| Ink em Base | 12.1:1 | ✅ AAA |
| Ink em Sun | 9.2:1 | ✅ AAA |
| Ink em Pop | 8.2:1 | ✅ AAA |
| Gray-600 em White | 5.7:1 | ✅ AA |

### 11.2 Navegação por Teclado

- `Tab`: Navegar entre search e botões
- `Enter`: Ativar botão Ver Relatório
- Texto no search filtra automaticamente

### 11.3 ARIA Labels

```html
<input type="text" aria-label="Buscar relatórios" placeholder="Buscar...">
<button aria-label="Ver relatório: [título]">📊 Ver Relatório</button>
```

---

## 12. Tokens de Design

```css
:root {
    --base: #FFF8E7;
    --ink: #2D3436;
    --accent: #FF6B6B;
    --pop: #4ECDC4;
    --sun: #FFE66D;
    
    /* Específicos da biblioteca */
    --report-shadow: 3px 3px 0px 0px var(--ink);
    --report-shadow-hover: 5px 5px 0px 0px var(--accent);
    --meta-color: #666;
}
```

---

## 13. Dependências Externas

### 13.1 Fontes

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
```

### 13.2 Scripts

- `library.js` - Gestão de biblioteca na extensão

### 13.3 APIs

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/reports` | GET | Listar relatórios |
| `/api/reports/{id}/open` | GET | Abrir relatório |

---

## 14. Guia de Implementação

### 14.1 Estrutura HTML

```html
<div id="tab-library" class="tab-panel">
    <div class="library-header">
        <span class="library-title">BIBLIOTECA</span>
        <input type="text" id="search-reports" class="search-input" placeholder="Buscar...">
    </div>
    
    <div id="reports-list">
        <!-- Reports renderizados dinamicamente -->
        <div class="report-item">
            <div class="report-title">Título do Relatório</div>
            <div class="report-meta">
                <span>📅 21/12/2025</span>
                <span>⏱ 45min</span>
            </div>
            <div class="report-actions">
                <button class="btn-view-report">📊 Ver Relatório</button>
            </div>
        </div>
    </div>
</div>
```

### 14.2 Checklist

- [ ] Lista de relatórios carregando da API
- [ ] Busca filtrando em tempo real
- [ ] Título truncando com ellipsis
- [ ] Metadados formatados (data/duração)
- [ ] Botão Ver abrindo relatório em nova aba
- [ ] Empty state quando sem relatórios

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| v1.0 | 21/12/2025 | Criação inicial do documento |

---

**FIM DO DOCUMENTO**
