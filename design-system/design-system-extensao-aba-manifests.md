# Sistema de Design – Extensão: Aba Manifests

## Documentação Completa v1.0

> **IMPORTANTE:** Este documento reflete a implementação atual da aba Manifests no `popup.html` da extensão de navegador, seguindo o design system **Solar Pop Edition** (Neo-Brutalista/Retro-Pop).

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

A **Aba Manifests** exibe uma lista completa de todos os manifests de vídeo capturados pela extensão. Permite visualizar, gerenciar e processar vídeos individuais ou em lote. Vídeos já processados são destacados visualmente.

### 1.1 Princípios de Design

- **Bordas Sólidas**: Todos os elementos possuem bordas de 2-3px sem desfoque
- **Sombras Planas**: Sombras projetadas sem blur (`3px 3px 0px 0px`)
- **Cores Vibrantes**: Paleta curada Solar Pop Edition
- **Feedback Visual**: Estados different para processado vs pendente
- **Compactação**: UI otimizada para popup de extensão (420px largura)

### 1.2 Funcionalidades

- **Listar** todos os manifests capturados
- **Destacar** vídeos já processados (fundo verde)
- **Processar** vídeos individuais
- **Remover** manifests individuais
- **Limpar** todos os manifests
- **Atualizar** lista de manifests

### 1.3 Estrutura da Aba

```
┌─────────────────────────────────────────────────┐
│ 📋 Manifests Capturados                         │ ← Title
├─────────────────────────────────────────────────┤
│ 💡 Lista de todos os vídeos capturados pela     │ ← Info Box
│    extensão. Vídeos já processados em verde.    │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐   │
│ │ 🟢 cloudflarestream.com          ✓ Proc.  │   │ ← Manifest Item
│ │ https://customer-xxx.cloudflare...        │   │   (processado)
│ │ 14:32:15                                  │   │
│ │ [📊 Ver] [🗑️ Remover]                     │   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ youtube.com                               │   │ ← Manifest Item
│ │ https://www.youtube.com/watch?v=...       │   │   (pendente)
│ │ 15:10:42                                  │   │
│ │ [🚀 Processar] [🗑️ Remover]               │   │
│ └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ [🗑️ Limpar Tudo]       [🔄 Atualizar]           │ ← Action Buttons
└─────────────────────────────────────────────────┘
```

---

## 2. Paleta de Cores

### 2.1 Cores Semânticas Principais

| Nome | Variável CSS | Hex | Uso na Aba |
|------|-------------|-----|------------|
| **Base** | `--base` | `#FFF8E7` | Fundo do popup |
| **Ink** | `--ink` | `#2D3436` | Bordas, texto principal, sombras |
| **Accent** | `--accent` | `#FF6B6B` | Domínios, hover |
| **Pop** | `--pop` | `#4ECDC4` | Botão Atualizar, status processado |
| **Sun** | `--sun` | `#FFE66D` | Tabs ativas |

### 2.2 Cores de Estado

| Contexto | Background | Borda | Texto |
|----------|------------|-------|-------|
| Info Box | `#eff6ff` | `1px solid #bfdbfe` | `#1e40af` |
| Manifest Pendente | `white` | `2px solid var(--ink)` | `var(--ink)` |
| Manifest Processado | `#d1fae5` | `2px solid #10b981` | `var(--ink)` |
| Manifest Hover | - | `var(--accent)` | - |

### 2.3 Cores de Badge

| Estado | Background | Texto |
|--------|------------|-------|
| Processado | `#10b981` | `white` |
| Pendente | `#fbbf24` | `#2D3436` |
| Erro | `#ef4444` | `white` |

---

## 3. Tipografia

### 3.1 Famílias Tipográficas

| Família | Fonte | Pesos | Uso |
|---------|-------|-------|-----|
| **Display** | `Space Grotesk` | 500, 700 | Títulos, domínios |
| **Body** | `Inter` | 400, 500, 600 | Labels, descrições |
| **Mono** | `monospace` | 400 | URLs |

### 3.2 Escala Tipográfica

| Elemento | Tamanho | Peso | Uso |
|----------|---------|------|-----|
| Section Title | 14px | 700 | "📋 Manifests Capturados" |
| Manifest Domain | 12px | 700 | "cloudflarestream.com" |
| Manifest URL | 10px | 400 | URL truncada |
| Manifest Time | 10px | 400 | Timestamp |
| Info Box | 10px | 400 | Texto informativo |
| Button | 11px | 700 | Texto de botões |

---

## 4. Iconografia

### 4.1 Ícones da Aba

| Ícone | Contexto | Uso |
|-------|----------|-----|
| 📋 | Tab/Title | Identificador da aba |
| 💡 | Info | Caixa informativa |
| 🟢 | Status | Vídeo processado |
| 🟡 | Status | Vídeo pendente |
| ✓ | Badge | Processado |
| 🚀 | Button | Processar |
| 📊 | Button | Ver relatório |
| 🗑️ | Button | Remover/Limpar |
| 🔄 | Button | Atualizar |

---

## 5. Componentes de Interface

### 5.1 Info Box

```css
.info-box {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 8px;
    margin-bottom: 12px;
    font-size: 10px;
    color: #1e40af;
}
```

### 5.2 Manifest Item (Base)

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
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.manifest-url {
    font-size: 10px;
    color: #666;
    word-break: break-all;
    margin: 4px 0;
    font-family: monospace;
    max-height: 24px;
    overflow: hidden;
    text-overflow: ellipsis;
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

### 5.3 Manifest Item (Processado)

```css
.manifest-item.processed {
    background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    border-color: #10b981;
}

.manifest-item.processed .manifest-domain {
    color: #047857;
}
```

### 5.4 Status Badge

```css
.status-badge {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 600;
}

.status-badge.processed {
    background: #10b981;
    color: white;
}

.status-badge.pending {
    background: #fbbf24;
    color: #2D3436;
}
```

### 5.5 Botões de Ação

```css
/* Botão Ver Relatório */
.btn-view {
    background: linear-gradient(135deg, #0ea5e9, #06b6d4);
    color: white;
}

/* Botão Processar */
.btn-process {
    background: var(--accent);
    color: white;
}

/* Botão Remover */
.btn-remove {
    background: white;
    color: var(--ink);
}

.btn-remove:hover {
    background: #fee2e2;
    color: #dc2626;
    border-color: #dc2626;
}
```

### 5.6 Empty State

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

### 5.7 Action Buttons Footer

```css
.actions-footer {
    display: flex;
    gap: 8px;
    margin-top: 12px;
}

.actions-footer .btn {
    flex: 1;
}
```

---

## 6. Layout e Espaçamento

### 6.1 Dimensões

| Propriedade | Valor |
|-------------|-------|
| Largura do popup | 420px |
| Padding do conteúdo | 12px |
| Gap entre manifests | 8px |
| Altura máxima por manifest | ~100px |

### 6.2 Sistema de Espaçamento

| Contexto | Valor |
|----------|-------|
| Section title margin | 0 0 8px 0 |
| Info box margin | 0 0 12px 0 |
| Manifest actions margin | 8px 0 0 0 |
| Footer margin | 12px 0 0 0 |

---

## 7. Estados e Interações

### 7.1 Estados do Manifest

| Estado | Visual | Ações Disponíveis |
|--------|--------|-------------------|
| Pendente | Fundo branco | Processar, Remover |
| Processado | Fundo verde, badge | Ver, Remover |
| Hover | Borda accent | Destacar ações |

### 7.2 Estados dos Botões

| Estado | Transform | Sombra |
|--------|-----------|--------|
| Default | - | 3px 3px |
| Hover | -1px, -1px | 4px 4px |
| Active | 1px, 1px | 2px 2px |
| Disabled | - | opacity: 0.5 |

---

## 8. Padrões de Telas

### 8.1 Com Manifests

**Elementos Visíveis:**
- Título da seção
- Info box
- Lista de manifest items
- Botões de ação no footer

### 8.2 Sem Manifests (Empty State)

**Elementos Visíveis:**
- Título da seção
- Info box
- Empty state com ícone 📋
- Mensagem "Carregando manifests..." ou "Nenhum manifest capturado"

---

## 9. Modais e Overlays

A aba Manifests utiliza o modal de confirmação global para ações destrutivas:

- **Limpar Tudo**: Confirma antes de remover todos os manifests
- **Remover Individual**: Pode usar confirmação ou ação direta

---

## 10. Responsividade

Não aplicável - largura fixa de 420px para popup de extensão.

---

## 11. Acessibilidade

### 11.1 Contraste de Cores

| Combinação | Ratio | Status |
|------------|-------|--------|
| Blue-500 em Blue-50 | 6.5:1 | ✅ AAA |
| White em Emerald-500 | 4.5:1 | ✅ AA |
| Ink em Base | 12.1:1 | ✅ AAA |

### 11.2 ARIA Labels

```html
<button aria-label="Processar vídeo">🚀 Processar</button>
<button aria-label="Ver relatório">📊 Ver</button>
<button aria-label="Remover manifest">🗑️ Remover</button>
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
    
    /* Estados específicos */
    --processed-bg: #d1fae5;
    --processed-border: #10b981;
    --info-bg: #eff6ff;
    --info-border: #bfdbfe;
    --info-text: #1e40af;
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
| `/api/reports` | GET | Verificar se manifest foi processado |
| `/api/process` | POST | Processar manifest |

---

## 14. Guia de Implementação

### 14.1 Estrutura HTML

```html
<div id="tab-manifests" class="tab-panel">
    <div class="card-title">📋 Manifests Capturados</div>
    <div class="info-box">
        💡 Lista de todos os vídeos capturados...
    </div>
    
    <div id="manifests-tab-list">
        <!-- Manifest items renderizados dinamicamente -->
    </div>
    
    <div class="actions-footer">
        <button class="btn btn-secondary" id="clearAllManifestsBtn">🗑️ Limpar Tudo</button>
        <button class="btn btn-pop" id="refreshManifestsBtn">🔄 Atualizar</button>
    </div>
</div>
```

### 14.2 Checklist

- [ ] Lista de manifests carregando do storage
- [ ] Verificação de status processado via API
- [ ] Destaque visual para processados
- [ ] Botão Ver abrindo relatório correto
- [ ] Botão Processar iniciando processamento
- [ ] Limpar e Atualizar funcionais

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| v1.0 | 21/12/2025 | Criação inicial do documento |

---

**FIM DO DOCUMENTO**
