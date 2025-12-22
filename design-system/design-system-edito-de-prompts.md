# Sistema de Design – Editor de Prompts

## Documentação Completa v2.1

> **IMPORTANTE:** Este documento reflete a implementação atual do Editor de Prompts em `index_v2.html`, seguindo o design system **Solar Pop Edition** (Neo-Brutalista/Retro-Pop).

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

O **Editor de Prompts** é um modal da interface web Video Processor (Solar Pop Edition) que permite criar, editar, validar e gerenciar prompts de IA para processamento de vídeos. O design segue o mesmo sistema visual da aplicação principal.

### 1.1 Princípios de Design

- **Bordas Sólidas**: Todos os elementos possuem bordas de 2-4px sem desfoque
- **Sombras Planas**: Sombras projetadas sem blur (`4px 4px 0px 0px`)
- **Cores Vibrantes**: Paleta curada de cores vivas e contrastantes
- **Feedback Tátil**: Botões "afundam" ao clicar, elevam ao hover
- **Hierarquia Clara**: Tipografia bold com uppercase estratégico

### 1.2 Funcionalidades

- **Criar** novos templates de prompt para IA
- **Editar** prompts existentes com syntax highlighting Markdown
- **Validar** automaticamente a estrutura (14 seções obrigatórias + JSON)
- **Gerenciar** múltiplos prompts na sidebar
- **Salvar** e **Excluir** prompts com feedback visual

### 1.3 Estrutura do Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ 📝 EDITOR DE PROMPTS                                       [X] │ ← Header (bg-pop)
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌─────────────────────────────────────────┐  │
│ │ [+ NOVO]      │ │ [nome_input] [⚠️ VER ERROS] [SALVAR]    │  │
│ ├───────────────┤ │              [EXCLUIR]                  │  │
│ │ ▸ modelo1     │ ├─────────────────────────────────────────┤  │
│ │   modelo2     │ │ ┌─────────────────────────────────────┐ │  │
│ │   modelo3     │ │ │ B I H " ≡ 1. 🔗 </> 👁️ 📖 ⊞ ↔       │ │  │ ← Toolbar EasyMDE
│ │   modelo4 ✓   │ │ ├─────────────────────────────────────┤ │  │
│ │               │ │ │                                     │ │  │
│ │               │ │ │   # PROMPT UNIVERSAL...             │ │  │ ← Editor Markdown
│ │               │ │ │   ---                               │ │  │
│ │               │ │ │   ## INSTRUÇÕES INICIAIS            │ │  │
│ │               │ │ │                                     │ │  │
│ │               │ │ └─────────────────────────────────────┘ │  │
│ └───────────────┘ │ lines: 274 | words: 2156 | cursor: 1:0 │  │ ← Statusbar
│     (Sidebar)     └─────────────────────────────────────────┘  │
│                              (Editor)                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Paleta de Cores

O Editor de Prompts segue a paleta **Solar Pop Edition** da aplicação principal.

### 2.1 Cores Semânticas Principais

| Nome | Variável Tailwind | Hex | Uso no Editor |
|------|-------------------|-----|---------------|
| **Base** (Cosmic Latte) | `base` | `#FFF8E7` | Fundo do modal |
| **Ink** (Void Charcoal) | `ink` | `#2D3436` | Bordas, texto principal |
| **Accent** (Bittersweet Coral) | `accent` | `#FF6B6B` | Botão SALVAR, botões primários |
| **Pop** (Medium Turquoise) | `pop` | `#4ECDC4` | Header do modal |
| **Sun** (Maize Yellow) | `sun` | `#FFE66D` | Botão EXCLUIR, destaques |

### 2.2 Cores de Estado

| Estado | Background | Borda | Texto | Uso |
|--------|------------|-------|-------|-----|
| Sucesso/Válido | `#D4EDDA` | `#28a745` | `#166534` | Badge "✅ Válido" |
| Erro | `#fee2e2` | `#dc2626` | `#991b1b` | Badge "⚠️ VER ERROS" |
| Hover (primário) | `#ff5252` | - | `#fff` | Hover em botões accent |
| Hover (perigo) | `#ef4444` | `#dc2626` | `#fff` | Botão X, exclusão |

### 2.3 Cores de Interface

| Elemento | Cor | Código |
|----------|-----|--------|
| Fundo modal | Base | `#FFF8E7` |
| Header modal | Pop | `#4ECDC4` |
| Sidebar fundo | Branco | `#FFFFFF` |
| Sidebar header | Cinza claro | `bg-gray-50` |
| Editor fundo | Branco | `#FFFFFF` |
| Placeholder fundo | Cinza claro | `bg-gray-50` |
| Overlay | Ink 90% | `bg-ink/90` |

---

## 3. Tipografia

### 3.1 Famílias Tipográficas

| Família | Fonte | Pesos | Uso |
|---------|-------|-------|-----|
| **Display** | `Space Grotesk` | 500, 700, 900 | Títulos do modal, títulos de seção |
| **Body** | `Inter` | 400, 500, 600 | Corpo, labels, descrições |
| **Mono** | `CodeMirror default` | 400 | Editor de código Markdown |

### 3.2 Escala Tipográfica

| Elemento | Classe Tailwind | Peso | Uso |
|----------|-----------------|------|-----|
| Título do Modal | `text-xl` (20px) | `font-black` (900) | "📝 EDITOR DE PROMPTS" |
| Input Nome | `text-lg` (18px) | `font-bold` (700) | Campo de nome do prompt |
| Lista Items | `text-sm` (14px) | `font-medium` (500) | Items na sidebar |
| Placeholder | `text-lg/sm` | `font-normal` (400) | Mensagem quando vazio |
| Badges | `text-xs` (12px) | `font-semibold` (600) | "✅ Válido", "⚠️ VER ERROS" |
| Botões | `text-sm` (14px) | `font-bold` (700) | SALVAR, EXCLUIR, NOVO PROMPT |

---

## 4. Iconografia

### 4.1 Estilo de Ícones

- **Tipo**: Emojis nativos do sistema
- **Vantagens**: Sem bibliotecas externas, renderização nativa, cores vibrantes

### 4.2 Ícones Funcionais (Emojis)

| Ícone | Contexto | Uso |
|-------|----------|-----|
| 📝 | Header | Identificador do modal |
| ➕ | Botão | NOVO PROMPT |
| 💾 | Botão | SALVAR |
| 🗑️ | Botão | EXCLUIR |
| ⚠️ | Badge | VER ERROS (validação) |
| ✅ | Badge | Válido |
| 📄 | Placeholder | Estado vazio do editor |
| ❌ | Botão | Fechar/Cancelar (em modais de confirmação) |

### 4.3 Ícones da Toolbar EasyMDE

| Ícone | Função | Atalho |
|-------|--------|--------|
| **B** | Negrito | Ctrl+B |
| *I* | Itálico | Ctrl+I |
| H | Heading | - |
| " | Citação | - |
| ≡ | Lista não ordenada | - |
| 1. | Lista ordenada | - |
| 🔗 | Link | Ctrl+K |
| `</>` | Código | - |
| 👁️ | Preview | - |
| ⇆ | Side-by-side | - |
| ⛶ | Fullscreen | F11 |
| ↔ | Word Wrap | - |
| ? | Ajuda | - |

---

## 5. Componentes de Interface

### 5.1 Modal Container

```css
/* Modal Overlay */
#prompts-modal {
    position: fixed;
    inset: 0;
    background: rgba(45, 52, 54, 0.9);  /* bg-ink/90 */
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
}

/* Modal Content */
.prompts-modal-content {
    background: #FFF8E7;           /* bg-base */
    border: 4px solid #2D3436;     /* border-4 border-ink */
    border-radius: 0.75rem;        /* rounded-xl */
    width: 100%;
    max-width: 64rem;              /* max-w-5xl */
    max-height: 95vh;
    overflow: hidden;
    box-shadow: 4px 4px 0px 0px #2D3436;  /* shadow-retro */
    display: flex;
    flex-direction: column;
}
```

### 5.2 Header do Modal

```css
.prompts-modal-header {
    padding: 1rem;                 /* p-4 */
    border-bottom: 4px solid #2D3436;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #4ECDC4;           /* bg-pop */
    position: sticky;
    top: 0;
}

.prompts-modal-title {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 900;              /* font-black */
    font-size: 1.25rem;            /* text-xl */
}
```

### 5.3 Botão Fechar (X)

```css
.btn-close {
    width: 2rem;                   /* w-8 */
    height: 2rem;                  /* h-8 */
    border: 2px solid #2D3436;
    background: white;
    border-radius: 0.25rem;        /* rounded */
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
}

.btn-close:hover {
    background: #ef4444;           /* bg-red-500 */
    color: white;
}
```

### 5.4 Sidebar (Lista de Prompts)

```css
.sidebar {
    width: 16rem;                  /* w-64 */
    border-right: 4px solid #2D3436;
    background: white;
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    padding: 0.75rem;              /* p-3 */
    border-bottom: 2px solid #2D3436;
    background: #f9fafb;           /* bg-gray-50 */
}

.sidebar-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;               /* p-2 */
    display: flex;
    flex-direction: column;
    gap: 0.5rem;                   /* space-y-2 */
}
```

### 5.5 Item da Lista (Prompt Card na Sidebar)

```css
.prompt-item {
    padding: 0.75rem;              /* p-3 */
    border: 2px solid #e5e7eb;     /* border-gray-200 */
    border-radius: 0.5rem;         /* rounded-lg */
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.prompt-item:hover {
    background: #f3f4f6;           /* bg-gray-100 */
    border-color: #9ca3af;
}

.prompt-item.selected {
    background: #fef3c7;           /* bg-amber-100 */
    border-color: #4ECDC4;         /* border-pop */
    border-width: 2px;
}
```

### 5.6 Header do Editor

```css
.editor-header {
    padding: 1rem;                 /* p-4 */
    border-bottom: 2px solid #2D3436;
    background: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* Input de Nome */
.prompt-name-input {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 1.125rem;           /* text-lg */
    border: 2px solid #2D3436;
    border-radius: 0.25rem;        /* rounded */
    padding: 0.25rem 0.5rem;       /* px-2 py-1 */
    width: 16rem;                  /* w-64 */
}

.prompt-name-input:focus {
    outline: none;
    border-color: #4ECDC4;
    box-shadow: 0 0 0 2px rgba(78, 205, 196, 0.3);
}
```

### 5.7 Badge de Validação

```css
/* Badge de Erro (Clicável) */
.validation-error-badge {
    padding: 0.375rem 0.75rem;     /* px-3 py-1.5 */
    border: 2px solid #dc2626;     /* border-red-600 */
    background: #ef4444;           /* bg-red-500 */
    color: white;
    font-weight: 700;
    border-radius: 0.5rem;         /* rounded-lg */
    font-size: 0.75rem;            /* text-xs */
    display: flex;
    align-items: center;
    gap: 0.375rem;                 /* gap-1.5 */
    cursor: pointer;
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Badge de Sucesso */
.validation-success-badge {
    font-size: 0.875rem;           /* text-sm */
    color: #16a34a;                /* text-green-600 */
    font-weight: 600;
}
```

### 5.8 Botões de Ação (Salvar/Excluir)

```css
/* Botão SALVAR (btn-retro btn-primary) */
.btn-salvar {
    background: #FF6B6B;
    color: white;
    /* Herda estilos btn-retro */
}

/* Botão EXCLUIR (btn-retro btn-tertiary) */
.btn-excluir {
    background: #FFE66D;           /* bg-sun */
    color: #2D3436;
    /* Herda estilos btn-retro */
}

.btn-excluir:hover {
    background: #ffd93d;
}
```

### 5.9 Área do Editor (EasyMDE)

```css
#editor-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;                 /* p-4 */
    background: white;
    display: flex;
    flex-direction: column;
}

/* Container EasyMDE */
#editor-container .EasyMDEContainer {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

/* Toolbar fixa */
#editor-container .editor-toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #f8f9fa;
    border-bottom: 1px solid #ddd;
    flex-shrink: 0;
}

/* Área de edição CodeMirror */
#editor-container .CodeMirror {
    flex: 1;
    min-height: 0;
    height: auto !important;
}

#editor-container .CodeMirror-scroll {
    overflow-y: scroll !important;
    overflow-x: scroll !important;
}

/* Scrollbar customizada */
#editor-container .CodeMirror-scroll::-webkit-scrollbar {
    width: 12px;
    height: 12px;
}

#editor-container .CodeMirror-scroll::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 6px;
}

#editor-container .CodeMirror-scroll::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 6px;
}
```

### 5.10 Placeholder (Estado Vazio)

```css
.editor-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f9fafb;           /* bg-gray-50 */
}

.editor-placeholder-content {
    text-align: center;
    color: #9ca3af;                /* text-gray-400 */
}

.editor-placeholder-icon {
    font-size: 3.75rem;            /* text-6xl */
    margin-bottom: 1rem;
}
```

---

## 6. Layout e Espaçamento

### 6.1 Dimensões do Modal

| Elemento | Dimensão |
|----------|----------|
| Modal largura máxima | `max-w-5xl` (64rem / 1024px) |
| Modal altura máxima | `max-h-[95vh]` |
| Sidebar largura | `w-64` (16rem / 256px) |
| Input nome largura | `w-64` (16rem / 256px) |

### 6.2 Sistema de Espaçamento

| Contexto | Classe Tailwind | Valor |
|----------|-----------------|-------|
| Padding do header | `p-4` | 1rem (16px) |
| Padding da sidebar header | `p-3` | 0.75rem (12px) |
| Padding lista prompts | `p-2` | 0.5rem (8px) |
| Gap entre prompts | `space-y-2` | 0.5rem (8px) |
| Padding do editor | `p-4` | 1rem (16px) |

### 6.3 Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded` | 0.25rem (4px) | Botão X, inputs pequenos |
| `rounded-lg` | 0.5rem (8px) | Badges, items da lista |
| `rounded-xl` | 0.75rem (12px) | Modal container |

---

## 7. Estados e Interações

### 7.1 Estados do Prompt na Lista

| Estado | Visual | Indicador |
|--------|--------|-----------|
| Normal | Borda cinza, fundo branco | - |
| Selecionado | Borda pop (#4ECDC4), fundo amber-100 | - |
| Hover | Fundo gray-100, borda mais escura | - |
| Válido | Normal + | ✅ (no header do editor) |
| Inválido | Normal + | Texto cinza ou vermelho na lista |

### 7.2 Estados do Botão SALVAR

| Estado | Visual | Comportamento |
|--------|--------|---------------|
| Normal | bg-accent (#FF6B6B), texto branco | Clicável |
| Hover | bg-accent mais escuro | Elevação (+shadow) |
| Active | Sombra inset | - |
| Disabled | Opacidade 50% | cursor: not-allowed |
| Carregando | Spinner interno | Não clicável |

### 7.3 Feedback de Validação

#### Prompt Válido
- Badge verde "✅ Válido" visível
- Badge de erro oculto
- Prompt pode ser usado no processamento

#### Prompt Inválido
- Badge vermelho "⚠️ VER ERROS" visível (com animação pulse)
- Clicável para abrir modal de detalhes
- Lista todos os campos/seções faltantes

### 7.4 Seções Obrigatórias (14)
1. resumo_executivo
2. objetivos_aprendizagem
3. conceitos_fundamentais
4. estrutura_central
5. exemplos
6. ferramentas_metodos
7. orientacoes_praticas
8. abordagem_pedagogica
9. ideias_chave
10. pontos_memorizacao
11. citacoes_marcantes
12. proximos_passos
13. preparacao_proxima_aula
14. materiais_apoio

---

## 8. Padrões de Telas

### 8.1 Estado Inicial (Nenhum Prompt Selecionado)

**Elementos Visíveis:**
- Header do modal com título e botão X
- Sidebar com lista de prompts
- Botão "+ NOVO PROMPT" na sidebar
- Placeholder no editor ("Selecione um prompt para editar")

**Elementos Ocultos:**
- Header do editor (nome, badges, botões)
- Área de edição EasyMDE

### 8.2 Estado Editando

**Elementos Visíveis:**
- Header do modal
- Sidebar com prompt selecionado (destacado)
- Header do editor com:
  - Input de nome
  - Badge de validação (válido ou ver erros)
  - Botões SALVAR e EXCLUIR
- EasyMDE com conteúdo do prompt
- Statusbar (lines, words, cursor)

**Elementos Ocultos:**
- Placeholder

---

## 9. Modais e Overlays

### 9.1 Modal de Validação (Erros)

```css
#validation-modal {
    position: fixed;
    inset: 0;
    background: rgba(45, 52, 54, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.validation-modal-content {
    background: white;
    border: 4px solid #2D3436;
    border-radius: 0.75rem;
    width: 100%;
    max-width: 42rem;              /* max-w-2xl */
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 4px 4px 0px 0px #2D3436;
}

.validation-modal-header {
    padding: 1rem;
    border-bottom: 4px solid #2D3436;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fee2e2;           /* bg-red-100 */
    position: sticky;
    top: 0;
}

.validation-modal-title {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 900;
    font-size: 1.25rem;
    color: #b91c1c;                /* text-red-700 */
}

.validation-modal-body {
    padding: 1.5rem;               /* p-6 */
}
```

### 9.2 Conteúdo do Modal de Validação

O modal de erros exibe:
1. **Alerta principal**: "Este prompt não pode ser usado para processamento"
2. **Lista de campos faltantes**: As 14 seções obrigatórias que estão ausentes
3. **Erro específico**: Ex: "Prompt não contém bloco JSON com estrutura de saída"
4. **Como corrigir**: Instruções passo-a-passo

---

## 10. Responsividade

### 10.1 Breakpoints

| Breakpoint | Largura | Comportamento |
|------------|---------|---------------|
| Mobile | < 768px | Sidebar oculta ou sobreposta |
| Tablet | 768px - 1024px | Layout comprimido |
| Desktop | > 1024px | Layout padrão (sidebar + editor) |

### 10.2 Ajustes Mobile

```css
@media (max-width: 768px) {
    .prompts-modal-content {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
    }
    
    .sidebar {
        position: absolute;
        z-index: 10;
        width: 80%;
        height: 100%;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
    }
    
    .sidebar.open {
        transform: translateX(0);
    }
}
```

---

## 11. Acessibilidade

### 11.1 Contraste de Cores

| Combinação | Ratio | Status |
|------------|-------|--------|
| Ink (#2D3436) em Base (#FFF8E7) | 12.1:1 | ✅ AAA |
| Branco em Pop (#4ECDC4) | 3.1:1 | ✅ AA Large |
| Branco em Accent (#FF6B6B) | 4.6:1 | ✅ AA Large |
| Red-700 em Red-100 | 7.3:1 | ✅ AAA |

### 11.2 Focus Visible

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

| Atalho | Ação |
|--------|------|
| `Tab` | Navega entre elementos interativos |
| `Enter/Space` | Ativa botões |
| `Escape` | Fecha modais |
| `Arrow Keys` | Navega em listas (se implementado) |
| `Ctrl + B` | Negrito (EasyMDE) |
| `Ctrl + I` | Itálico (EasyMDE) |
| `Ctrl + K` | Inserir link (EasyMDE) |
| `F11` | Fullscreen editor (EasyMDE) |

### 11.5 ARIA Labels

```html
<button aria-label="Criar novo prompt">➕ NOVO PROMPT</button>
<button aria-label="Fechar modal">X</button>
<button aria-label="Ver erros de validação">⚠️ VER ERROS</button>
<input aria-label="Nome do prompt" placeholder="Nome do prompt (ex: modelo6)">
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
    
    /* Espaçamento */
    --space-2: 0.5rem;       /* 8px */
    --space-3: 0.75rem;      /* 12px */
    --space-4: 1rem;         /* 16px */
    --space-6: 1.5rem;       /* 24px */
    
    /* Z-index */
    --z-modal: 50;
    --z-validation-modal: 9999;
}
```

### 12.2 Classes Reutilizáveis

| Classe | Uso |
|--------|-----|
| `.btn-retro` | Todos os botões (base) |
| `.btn-primary` | Botão SALVAR (accent bg) |
| `.btn-tertiary` | Botões EXCLUIR, NOVO PROMPT |
| `.retro-input` | Inputs e selects |
| `.shadow-retro` | Sombra neo-brutalista |

---

## 13. Dependências Externas

### 13.1 EasyMDE (Editor Markdown)

```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css">

<!-- JS -->
<script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>
```

### 13.2 Configuração EasyMDE

```javascript
const easyMDE = new EasyMDE({
    element: document.getElementById('prompt-editor'),
    spellChecker: false,
    autosave: {
        enabled: false
    },
    toolbar: [
        'bold', 'italic', 'heading', '|',
        'quote', 'unordered-list', 'ordered-list', '|',
        'link', 'code', '|',
        'preview', 'side-by-side', 'fullscreen', '|',
        {
            name: 'wordwrap',
            action: toggleWordWrap,
            className: 'fa fa-text-width',
            title: 'Word Wrap'
        },
        'guide'
    ],
    status: ['lines', 'words', 'cursor']
});
```

### 13.3 Fontes (Google Fonts)

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700;900&display=swap" rel="stylesheet">
```

---

## 14. Guia de Implementação

### 14.1 Estrutura HTML Mínima

```html
<div id="prompts-modal" class="fixed inset-0 bg-ink/90 hidden items-center justify-center z-50">
    <div class="bg-base border-4 border-ink rounded-xl w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-retro flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b-4 border-ink flex justify-between items-center bg-pop sticky top-0">
            <h3 class="font-display font-black text-xl">📝 EDITOR DE PROMPTS</h3>
            <button class="btn-close">X</button>
        </div>
        
        <!-- Content -->
        <div class="flex flex-1 overflow-hidden">
            <!-- Sidebar -->
            <div class="w-64 border-r-4 border-ink bg-white flex flex-col">
                <div class="p-3 border-b-2 border-ink bg-gray-50">
                    <button class="btn-retro btn-primary w-full text-sm py-2">➕ NOVO PROMPT</button>
                </div>
                <div id="prompts-list" class="flex-1 overflow-y-auto p-2 space-y-2">
                    <!-- Lista de prompts -->
                </div>
            </div>
            
            <!-- Editor -->
            <div class="flex-1 flex flex-col overflow-hidden">
                <div id="editor-header" class="p-4 border-b-2 border-ink bg-white hidden">
                    <!-- Header do editor -->
                </div>
                <div id="editor-container" class="flex-1 overflow-y-auto p-4 bg-white hidden">
                    <textarea id="prompt-editor"></textarea>
                </div>
                <div id="editor-placeholder" class="flex-1 flex items-center justify-center bg-gray-50">
                    <!-- Placeholder -->
                </div>
            </div>
        </div>
    </div>
</div>
```

### 14.2 Checklist de Implementação

**Fase 1: Base**
- [ ] Criar estrutura HTML do modal
- [ ] Implementar estilos CSS base
- [ ] Configurar EasyMDE

**Fase 2: Funcionalidades**
- [ ] Carregar lista de prompts do backend
- [ ] Implementar seleção de prompt
- [ ] Implementar edição com EasyMDE
- [ ] Implementar validação automática
- [ ] Implementar salvar/excluir

**Fase 3: Feedback**
- [ ] Badges de validação
- [ ] Modal de erros
- [ ] Toasts de sucesso/erro
- [ ] Estados de loading

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| v2.1 | 21/12/2025 | Unificação metodológica. Adição de seções: Layout e Espaçamento, Padrões de Telas, Responsividade, Guia de Implementação. |
| v2.0 | 21/12/2025 | Reescrita completa baseada na implementação real. |
| v1.0 | Dez/2025 | Versão inicial (parcialmente incorreta) |

---

**FIM DO DOCUMENTO**
