# Sistema de Design - Video Processor (Solar Pop Edition)

## Documentação Completa de Design System v4.1

> **IMPORTANTE:** Este documento reflete fielmente a implementação atual em `index_v2.html` e arquivos relacionados (versão Neo-Brutalista/Retro-Pop).

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

O **Video Processor (Solar Pop Edition)** é uma aplicação web para processamento de vídeos de múltiplas plataformas (YouTube, Vimeo, Cloudflare Stream, Hub.la, etc.) com design system baseado no estilo **Neo-Brutalista/Retro-Pop**.

### 1.1 Princípios de Design

- **Bordas Sólidas**: Todos os elementos possuem bordas de 2-4px sem desfoque
- **Sombras Planas**: Sombras projetadas sem blur (`4px 4px 0px 0px`)
- **Cores Vibrantes**: Paleta curada de cores vivas e contrastantes
- **Feedback Tátil**: Botões "afundam" ao clicar, elevam ao hover
- **Hierarquia Clara**: Tipografia bold com uppercase estratégico

### 1.2 Funcionalidades

- **Processar** vídeos de múltiplas plataformas (URL ou manifests capturados)
- **Transcrever** áudio usando Whisper (IA local)
- **Resumir** conteúdo usando Gemini ou OpenRouter
- **Gerenciar** fila de processamento em tempo real
- **Armazenar** relatórios na biblioteca local
- **Configurar** credenciais, APIs e preferências
- **Editar** templates de prompts para IA

### 1.3 Estrutura da Página Principal

```
┌─────────────────────────────────────────────────┐
│  HEADER (Logo + Botões PROMPTS/CONFIG)          │
├─────────────────────────────────────────────────┤
│  SEÇÃO INPUT                                    │
│  ┌─────────────────────────────────────────┐    │
│  │ Textarea (URLs)                         │    │
│  │ Seletor de Modelo + Validação           │    │
│  │ Botões: ARQUIVO | COLAR | LIMPAR        │    │
│  │ Botão: PROCESSAR                        │    │
│  └─────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│  SEÇÃO PROCESSAMENTO (quando ativo)             │
│  ┌─────────────────────────────────────────┐    │
│  │ Card: PROCESSANDO AGORA                 │    │
│  │ - Barra de progresso                    │    │
│  │ - Timer/ETA                             │    │
│  │ - Indicador de etapas (4 dots)          │    │
│  │ - Terminal de logs                      │    │
│  │ Card: FILA DE PROCESSAMENTO             │    │
│  └─────────────────────────────────────────┘    │
├─────────────────────────────────────────────────┤
│  SEÇÃO MANIFESTS CAPTURADOS (Extensão)          │
├─────────────────────────────────────────────────┤
│  SEÇÃO BIBLIOTECA (Relatórios Salvos)           │
│  ┌─────────────────────────────────────────┐    │
│  │ Campo de busca                          │    │
│  │ Grid de cards de relatórios             │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## 2. Paleta de Cores

### 2.1 Cores Semânticas Principais

| Nome | Variável Tailwind | Hex | Uso Principal |
|------|-------------------|-----|---------------|
| **Base** (Cosmic Latte) | `base` | `#FFF8E7` | Fundo da página, áreas de respiro |
| **Ink** (Void Charcoal) | `ink` | `#2D3436` | Bordas, textos principais, sombras |
| **Accent** (Bittersweet Coral) | `accent` | `#FF6B6B` | Botões primários, destaques, erros |
| **Pop** (Medium Turquoise) | `pop` | `#4ECDC4` | Sucesso, progresso, elementos secundários |
| **Sun** (Maize Yellow) | `sun` | `#FFE66D` | Badges, alertas informativos, destaques |

### 2.2 Implementação Tailwind Config

```javascript
tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Space Grotesk', 'sans-serif'],
            },
            colors: {
                base: '#FFF8E7',      /* Cosmic Latte */
                ink: '#2D3436',       /* Void Charcoal */
                accent: '#FF6B6B',    /* Bittersweet Coral */
                pop: '#4ECDC4',       /* Medium Turquoise */
                sun: '#FFE66D',       /* Maize Yellow */
            },
            boxShadow: {
                'retro': '4px 4px 0px 0px #2D3436',
                'retro-hover': '6px 6px 0px 0px #2D3436',
                'retro-active': '2px 2px 0px 0px #2D3436',
            }
        }
    }
}
```

### 2.3 Cores de Estado

| Estado | Background | Borda | Texto |
|--------|------------|-------|-------|
| Sucesso | `#D4EDDA` | `#28a745` | `#166534` |
| Erro | `#FFEBEE` / `#fef2f2` | `#E53E3E` | `#c53030` |
| Aviso | `#fff3cd` | `#ffc107` | `#856404` |
| Info | `#E3F2FD` | `#2196F3` | `#0369a1` |

### 2.4 Fundo Animado (Solar Blobs)

```css
.solar-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    background-color: #FFF8E7;
    overflow: hidden;
}

.solar-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.6;
    animation: blob 15s infinite alternate;
}

.blob-1 {
    top: -10%;
    left: -10%;
    width: 500px;
    height: 500px;
    background: #FF6B6B;  /* Coral */
}

.blob-2 {
    top: 40%;
    right: -20%;
    width: 400px;
    height: 400px;
    background: #4ECDC4;  /* Turquoise */
    animation-delay: 2s;
}

@keyframes blob {
    0% { transform: scale(1) rotate(0deg); }
    100% { transform: scale(1.1) rotate(5deg); }
}
```

---

## 3. Tipografia

### 3.1 Famílias Tipográficas

| Família | Fonte | Pesos | Uso |
|---------|-------|-------|-----|
| **Display** | `Space Grotesk` | 500, 700, 900 | Títulos, botões, badges |
| **Body** | `Inter` | 400, 500, 600 | Corpo, labels, descrições |
| **Mono** | System monospace | 400 | URLs, logs, código |

### 3.2 Escala Tipográfica

| Elemento | Classe Tailwind | Peso | Transform | Exemplo |
|----------|-----------------|------|-----------|---------|
| Logo Principal | `text-5xl` (48px) | `font-black` (900) | - | `VIDEO` |
| Logo Accent | `text-5xl` (48px) | `font-black` (900) | - | `PROCESSOR` (cor accent) |
| Subtítulo Edição | `text-xs` (12px) | `font-bold` (700) | uppercase, tracking-wider | `SOLAR POP EDITION` |
| Título de Seção | `text-2xl` (24px) | `font-bold` (700) | - | `O QUE VAMOS CRIAR?` |
| Título de Card | `text-xl` (20px) | `font-black` (900) | - | `PROCESSANDO AGORA` |
| Label | `text-sm` (14px) | `font-bold` (700) | - | `MODELO:` |
| Texto de Botão | `text-sm`/`text-base` | `font-bold` (700) | uppercase | `PROCESSAR` |
| Badge | `text-xs` (12px) | `font-bold` (700) | - | `0 na fila` |
| Placeholder | `text-base` | `font-normal` (400) | uppercase | `COLE SUAS URLS...` |

---

## 4. Iconografia

### 4.1 Estilo de Ícones

- **Tipo**: Emojis nativos do sistema
- **Vantagens**: Sem bibliotecas externas, renderização nativa, cores vibrantes

### 4.2 Biblioteca de Ícones

| Ícone | Contexto | Uso |
|-------|----------|-----|
| 📝 | Header | Botão PROMPTS |
| ⚙️ | Header | Botão CONFIG |
| 📂 | Botão | ARQUIVO (upload) |
| 📋 | Botão | COLAR |
| 🗑️ | Botão | LIMPAR, Excluir |
| 🚀 | Botão | PROCESSAR |
| ✖️ | Botão | CANCELAR |
| 🎬 | Card | PROCESSANDO AGORA |
| 📚 | Seção | BIBLIOTECA |
| 🔍 | Input | Buscar |
| 🔗 | Seção | Manifests Capturados |
| 🔄 | Botão | Atualizar |
| ℹ️ | Header | Info do modelo |
| ⚡ | Status | Processando (spinner) |

### 4.3 Ícone de Spinner

```html
<span class="animate-spin">⚡</span>
```

---

## 5. Componentes de Interface

### 5.1 Sistema de Botões

#### 5.1.1 Classe Base `.btn-retro`

```css
.btn-retro {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    border: 2px solid #2D3436;
    border-radius: 0.75rem;  /* 12px */
    padding: 0.5rem 1rem;    /* 8px 16px */
    box-shadow: 4px 4px 0px 0px #2D3436;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}

.btn-retro:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0px 0px #2D3436;
}

.btn-retro:active {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px 0px #2D3436;
}

.btn-retro:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
```

#### 5.1.2 Variantes de Botão

| Classe | Background | Texto | Uso |
|--------|------------|-------|-----|
| `.btn-primary` | `#FF6B6B` (accent) | Branco | `PROCESSAR`, `SALVAR` |
| `.btn-secondary` | Branco | `#2D3436` | `CONFIG`, `COLAR`, `LIMPAR` |
| `.btn-tertiary` | `#FFE66D` (sun) | `#2D3436` | `PROMPTS`, `ARQUIVO`, `TESTAR` |

### 5.2 Campos de Entrada

#### 5.2.1 Input/Textarea Retro

```css
.retro-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.5);
    border: 2px solid #2D3436;
    border-radius: 1rem;  /* 16px */
    padding: 1rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1rem;
    box-shadow: 4px 4px 0px 0px #2D3436;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    color: #2D3436 !important;
}

.retro-input:focus {
    outline: none;
    background: white;
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0px 0px #FF6B6B;  /* Sombra muda para accent */
    border-color: #FF6B6B;
}
```

### 5.3 Cards

#### 5.3.1 Card de Processamento Ativo

```css
.processing-card {
    border: 4px solid #2D3436;
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 6px 6px 0px 0px #2D3436;
}
```

#### 5.3.2 Card de Fila

```css
.queue-card {
    border: 4px solid #2D3436;
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 4px 4px 0px 0px #2D3436;
}
```

#### 5.3.3 Card de Manifest/Biblioteca

```css
.manifest-card {
    background: white;
    border: 2px solid #2D3436;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 4px 4px 0px 0px #2D3436;
    transition: all 0.3s ease;
}

.manifest-card:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0px 0px #FF6B6B;
}
```

### 5.4 Barra de Progresso

```css
.progress-container {
    width: 100%;
    height: 1.5rem;
    background: #FFF8E7;
    border: 2px solid #2D3436;
    border-radius: 9999px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: #4ECDC4;
    border-right: 2px solid #2D3436;
    transition: width 0.3s ease;
}
```

### 5.5 Badges

```css
.badge-retro {
    padding: 0.25rem 0.75rem;
    background: #FFE66D;
    border: 2px solid #2D3436;
    border-radius: 0.5rem;
    box-shadow: 2px 2px 0px 0px #2D3436;
    font-weight: 700;
    font-size: 0.875rem;
}
```

### 5.6 Scrollbar Customizada

```css
::-webkit-scrollbar {
    width: 12px;
}

::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 10px;
}

::-webkit-scrollbar-thumb {
    background: #FF6B6B;
    border: 2px solid #2D3436;
    border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
    background: #ff5252;
}
```

---

## 6. Layout e Espaçamento

### 6.1 Container Principal

```css
.container {
    max-width: 64rem;   /* 1024px (max-w-4xl) */
    margin: 0 auto;
    padding: 2.5rem 1rem;  /* py-10 px-4 */
}
```

### 6.2 Sistema de Espaçamento

| Token | Valor | Uso |
|-------|-------|-----|
| `space-2` | 0.5rem (8px) | Entre elementos inline |
| `space-3` | 0.75rem (12px) | Gap padrão |
| `space-4` | 1rem (16px) | Padding interno de cards pequenos |
| `space-6` | 1.5rem (24px) | Padding de cards médios |
| `space-8` | 2rem (32px) | Padding de cards grandes, margin entre seções |
| `space-12` | 3rem (48px) | Margin entre seções principais |
| `space-16` | 4rem (64px) | Margin de header |

### 6.3 Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded` | 0.25rem (4px) | Badges pequenos |
| `rounded-lg` | 0.5rem (8px) | Botões, inputs pequenos |
| `rounded-xl` | 0.75rem (12px) | Cards, botões grandes |
| `rounded-2xl` | 1rem (16px) | Cards principais |
| `rounded-full` | 9999px | Pills, badges, barra de progresso |

### 6.4 Dimensões Principais

| Elemento | Dimensão |
|----------|----------|
| Container máximo | `max-w-4xl` (64rem / 1024px) |
| Largura sidebar (modais) | `w-64` (16rem / 256px) |
| Altura do header | `60-70px` |

---

## 7. Estados e Interações

### 7.1 Estados de Botão

| Estado | Transform | Sombra |
|--------|-----------|--------|
| Default | `translate(0, 0)` | `4px 4px 0px 0px` |
| Hover | `translate(-2px, -2px)` | `6px 6px 0px 0px` |
| Active/Click | `translate(2px, 2px)` | `2px 2px 0px 0px` |
| Disabled | - | opacity: 0.5, cursor: not-allowed |

### 7.2 Estados de Card

| Estado | Sombra | Cor da Sombra |
|--------|--------|---------------|
| Default | `4px 4px 0px 0px` | `#2D3436` |
| Hover | `6px 6px 0px 0px` | `#FF6B6B` (accent) |

### 7.3 Animações

```css
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-enter {
    animation: fadeIn 0.5s ease-out;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
```

---

## 8. Padrões de Telas

### 8.1 Estado Idle (Entrada de URLs)

**Elementos Visíveis:**
- Header com logo e botões PROMPTS/CONFIG
- Card de input com textarea
- Seletor de modelo de prompt com validação
- Botões de ação: ARQUIVO, COLAR, LIMPAR
- Botão PROCESSAR (primário, coral)
- Seção de Manifests Capturados (se extensão ativa)
- Seção Biblioteca

**Elementos Ocultos:**
- Card de Processamento
- Card de Fila
- Botão Cancelar

### 8.2 Estado Processando

**Elementos Visíveis:**
- Header (igual)
- Card "PROCESSANDO AGORA"
  - Título do vídeo atual
  - Barra de progresso com porcentagem
  - Timer (TEMPO) e ETA (ESTIMATIVA)
  - Indicador de 4 etapas (dots)
  - Botão TERMINAL (expandir logs)
  - Botão CANCELAR
- Card "FILA DE PROCESSAMENTO"
  - Badge com contagem
  - Lista de URLs com botão remover
- Seção Manifests
- Seção Biblioteca

**Elementos Ocultos:**
- Seção de Input (inteira)

---

## 9. Modais e Overlays

### 9.1 Modal Base

```css
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(45, 52, 54, 0.9);  /* ink com 90% opacidade */
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
}

.modal-container {
    background: #FFF8E7;          /* Base color */
    border: 4px solid #2D3436;
    border-radius: 0.75rem;
    max-width: 32rem;             /* 512px */
    width: 100%;
    box-shadow: 8px 8px 0px 0px #2D3436;
    position: relative;
    overflow: hidden;
}

.modal-header {
    background: #FFE66D;          /* Sun color */
    padding: 1rem;
    border-bottom: 4px solid #2D3436;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-close-btn {
    width: 2rem;
    height: 2rem;
    border: 2px solid #2D3436;
    background: white;
    border-radius: 0.25rem;
    font-weight: 700;
    cursor: pointer;
}

.modal-close-btn:hover {
    background: #FF6B6B;
    color: white;
}
```

### 9.2 Toast Notifications

```css
#toast-container {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.toast {
    padding: 1rem 1.5rem;
    border: 2px solid #2D3436;
    border-radius: 0.5rem;
    box-shadow: 4px 4px 0px 0px #2D3436;
    font-weight: 600;
    animation: slideInRight 0.3s ease;
}

.toast-success { background: #D4EDDA; color: #166534; }
.toast-error { background: #FFEBEE; color: #c53030; }
.toast-warning { background: #fff3cd; color: #856404; }
.toast-info { background: #E3F2FD; color: #0369a1; }
```

---

## 10. Responsividade

### 10.1 Breakpoints

| Breakpoint | Largura | Comportamento |
|------------|---------|---------------|
| Mobile | < 640px | Stack vertical, botões full-width |
| Tablet | 640px - 1024px | Grid 2 colunas |
| Desktop | > 1024px | Layout padrão max-w-4xl |

### 10.2 Ajustes Mobile

```css
@media (max-width: 640px) {
    .header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
    }
    
    .header-actions {
        width: 100%;
        flex-direction: column;
    }
    
    .btn-retro {
        width: 100%;
        justify-content: center;
    }
}
```

---

## 11. Acessibilidade

### 11.1 Contraste de Cores (WCAG 2.1 AA)

| Par | Contraste | Status |
|-----|-----------|--------|
| `#2D3436` em `#FFF8E7` | 12.1:1 | ✅ AAA |
| `#2D3436` em `#FFE66D` | 9.2:1 | ✅ AAA |
| `#FFFFFF` em `#FF6B6B` | 4.6:1 | ✅ AA (large text) |
| `#FFFFFF` em `#4ECDC4` | 3.1:1 | ⚠️ AA Large only |

### 11.2 Estados de Foco

```css
*:focus-visible {
    outline: 3px solid #FF6B6B;
    outline-offset: 2px;
}
```

### 11.3 Tamanhos Mínimos

- Botões: mínimo 44x44px (touch target)
- Ícones clicáveis: mínimo 32x32px
- Texto: mínimo 14px (corpo), 12px (small)

### 11.4 Navegação por Teclado

- `Tab`: Navega entre elementos interativos
- `Enter/Space`: Ativa botões
- `Escape`: Fecha modais
- `Arrow Keys`: Navega em listas e selects

### 11.5 ARIA Labels

```html
<button aria-label="Abrir editor de prompts">📝 PROMPTS</button>
<button aria-label="Abrir configurações">⚙️ CONFIG</button>
<input aria-label="Buscar relatórios na biblioteca" />
<div role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100"></div>
```

---

## 12. Tokens de Design

### 12.1 Variáveis CSS

```css
:root {
    /* Cores principais */
    --color-base: #FFF8E7;
    --color-ink: #2D3436;
    --color-accent: #FF6B6B;
    --color-pop: #4ECDC4;
    --color-sun: #FFE66D;
    
    /* Estados */
    --color-success: #16a34a;
    --color-error: #dc2626;
    --color-error-light: #fee2e2;
    --color-info: #0369a1;
    --color-info-light: #E3F2FD;
    
    /* Tipografia */
    --font-display: 'Space Grotesk', sans-serif;
    --font-body: 'Inter', sans-serif;
    
    /* Sombras retro */
    --shadow-retro: 4px 4px 0px 0px #2D3436;
    --shadow-retro-hover: 6px 6px 0px 0px #2D3436;
    --shadow-retro-active: 2px 2px 0px 0px #2D3436;
    
    /* Border radius */
    --radius-sm: 0.25rem;    /* 4px */
    --radius-md: 0.5rem;     /* 8px */
    --radius-lg: 0.75rem;    /* 12px */
    --radius-xl: 1rem;       /* 16px */
    --radius-full: 9999px;
    
    /* Espaçamento */
    --space-1: 0.25rem;      /* 4px */
    --space-2: 0.5rem;       /* 8px */
    --space-3: 0.75rem;      /* 12px */
    --space-4: 1rem;         /* 16px */
    --space-6: 1.5rem;       /* 24px */
    --space-8: 2rem;         /* 32px */
    
    /* Z-index */
    --z-modal: 50;
    --z-toast: 9999;
}
```

### 12.2 Classes Reutilizáveis

| Classe | Uso |
|--------|-----|
| `.btn-retro` | Todos os botões (base) |
| `.btn-primary` | Botões primários (accent bg) |
| `.btn-secondary` | Botões secundários (white bg) |
| `.btn-tertiary` | Botões terciários (sun bg) |
| `.retro-input` | Todos os inputs e selects |
| `.shadow-retro` | Sombra neo-brutalista |
| `.animate-enter` | Animação de entrada |

---

## 13. Dependências Externas

### 13.1 Fontes (Google Fonts)

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
```

### 13.2 Tailwind CSS

```html
<script src="https://cdn.tailwindcss.com"></script>
```

### 13.3 Socket.IO (Real-time)

```html
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
```

---

## 14. Guia de Implementação

### 14.1 Estrutura HTML Mínima

```html
<body class="min-h-screen flex flex-col items-center py-10 px-4 selection:bg-accent selection:text-white">
    
    <!-- Background Animado -->
    <div class="solar-bg">
        <div class="solar-blob blob-1"></div>
        <div class="solar-blob blob-2"></div>
    </div>
    
    <!-- Header -->
    <header class="w-full max-w-4xl flex justify-between items-center mb-16">
        <div>
            <h1 class="font-display font-black text-5xl">
                VIDEO<br><span class="text-accent">PROCESSOR</span>
            </h1>
            <p class="text-xs font-bold text-ink/60 mt-2 tracking-wider">SOLAR POP EDITION</p>
        </div>
        <div class="flex gap-3">
            <button class="btn-retro btn-tertiary">📝 PROMPTS</button>
            <button class="btn-retro btn-secondary">⚙️ CONFIG</button>
        </div>
    </header>
    
    <!-- Main Content -->
    <main class="w-full max-w-4xl space-y-12">
        <!-- Seções aqui -->
    </main>
    
    <!-- Modals -->
    <!-- Toast Container -->
</body>
```

### 14.2 Checklist de Implementação

**Fase 1: Base**
- [ ] Configurar Tailwind com tema customizado
- [ ] Implementar fundo com blobs animados
- [ ] Criar classes `.btn-retro`, `.retro-input`
- [ ] Configurar scrollbar customizada

**Fase 2: Componentes**
- [ ] Header com logo e ações
- [ ] Card de input com textarea
- [ ] Seletor de modelo com validação
- [ ] Card de processamento com progresso
- [ ] Card de fila
- [ ] Cards de biblioteca

**Fase 3: Modais**
- [ ] Modal de configurações
- [ ] Modal de prompts
- [ ] Modal de relatório
- [ ] Sistema de toasts

**Fase 4: Interações**
- [ ] WebSocket para progresso real-time
- [ ] Polling de status como fallback
- [ ] Validação de URLs
- [ ] Timer e ETA

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| v4.1 | 21/12/2025 | Unificação metodológica com outros docs. Adição de seções: Funcionalidades, Tokens de Design, Dependências Externas. |
| v4.0 | 21/12/2025 | Reescrita completa baseada na implementação real. |

---

**FIM DO DOCUMENTO**
