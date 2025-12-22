# Sistema de Design - Modal de Configurações

## Documentação Completa v2.1

> **IMPORTANTE:** Este documento reflete a implementação atual do Modal de Configurações em `index_v2.html`, seguindo o design system **Solar Pop Edition** (Neo-Brutalista/Retro-Pop).

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

O **Modal de Configurações** é um overlay que permite aos usuários configurar credenciais, APIs de IA, e preferências de processamento de vídeos. Segue o design system **Solar Pop Edition**.

### 1.1 Princípios de Design

- **Bordas Sólidas**: Todos os elementos possuem bordas de 2-4px sem desfoque
- **Sombras Planas**: Sombras projetadas sem blur (`4px 4px 0px 0px`)
- **Cores Vibrantes**: Paleta curada de cores vivas e contrastantes
- **Feedback Tátil**: Botões "afundam" ao clicar, elevam ao hover
- **Hierarquia Clara**: Tipografia bold com uppercase estratégico

### 1.2 Funcionalidades

- Configurar **credenciais de acesso** a plataformas de cursos (Hub.la, Hotmart, etc.)
- Gerenciar **chaves de API** para serviços de IA (Gemini e OpenRouter)
- Definir **provedor de IA** principal e configurar fallback automático
- Personalizar **template de prompt** para resumos
- Configurar **Whisper** (modelo e dispositivo de transcrição)
- Gerenciar **armazenamento e cache** de dados

### 1.3 Estrutura do Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚙️ CONFIGURAÇÕES                                           [X] │ ← Header (bg-sun)
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   🔒 AUTENTICAÇÃO                                               │ ← Seção
│   Configure as credenciais...                                   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 🔐 CREDENCIAIS POR DOMÍNIO          [➕ Adicionar]      │   │ ← Card
│   │ 💡 Para que serve: Login automático...                  │   │
│   │ [Lista de credenciais]                                  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 🔑 CHAVES DE API                                        │   │
│   │ 💡 Para que serve: Autenticação com serviços de IA...   │   │
│   │ GEMINI API KEY                           [TESTAR]       │   │
│   │ OPENROUTER API KEY (opcional)            [TESTAR]       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   🤖 PROCESSAMENTO                                              │ ← Seção
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ ⚡ PROVEDOR DE IA                                       │   │
│   │ 📝 TEMPLATE DE RESUMO                                   │   │
│   │ 🎙️ WHISPER (Transcrição)                                │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   💾 SISTEMA                                                    │ ← Seção
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 📁 ARMAZENAMENTO E CACHE                                │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ 💾 SALVAR CONFIGURAÇÕES                                 │   │ ← Botão Full Width
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Paleta de Cores

O Modal de Configurações segue a paleta **Solar Pop Edition**.

### 2.1 Cores Semânticas Principais

| Nome | Variável Tailwind | Hex | Uso no Modal |
|------|-------------------|-----|--------------|
| **Base** (Cosmic Latte) | `base` | `#FFF8E7` | Fundo do modal |
| **Ink** (Void Charcoal) | `ink` | `#2D3436` | Bordas, texto principal |
| **Accent** (Bittersweet Coral) | `accent` | `#FF6B6B` | Botão SALVAR (primário) |
| **Pop** (Medium Turquoise) | `pop` | `#4ECDC4` | Não usado diretamente neste modal |
| **Sun** (Maize Yellow) | `sun` | `#FFE66D` | Header do modal, botões TESTAR (terciário) |

### 2.2 Cores de Estado e Contexto

| Contexto | Background | Borda | Texto |
|----------|------------|-------|-------|
| Caixa Informativa (💡) | `bg-blue-50` | `border-blue-200` | `text-blue-700` |
| Checkbox Ativo | `bg-amber-50` | `border-amber-300` | `text-gray-600` |
| Sucesso (API testada) | - | - | `text-green-600` |
| Erro (API falhou) | - | - | `text-red-600` |
| Cards | `bg-white` | `border-ink` | `text-ink` |

### 2.3 Cores de Seção

| Seção | Ícone | Cor do Título |
|-------|-------|---------------|
| Autenticação | 🔒 | `text-gray-600` |
| Processamento | 🤖 | `text-gray-600` |
| Sistema | 💾 | `text-gray-600` |

---

## 3. Tipografia

### 3.1 Famílias Tipográficas

| Família | Fonte | Pesos | Uso |
|---------|-------|-------|-----|
| **Display** | `Space Grotesk` | 500, 700, 900 | Títulos do modal, títulos de seção, títulos de cards |
| **Body** | `Inter` | 400, 500, 600 | Descrições, labels, textos auxiliares |

### 3.2 Escala Tipográfica

| Elemento | Classes Tailwind | Exemplo |
|----------|------------------|---------|
| Título do Modal | `font-display font-black text-xl` | "⚙️ CONFIGURAÇÕES" |
| Título de Seção | `font-display font-black text-base text-gray-600 uppercase tracking-wide` | "🔒 Autenticação" |
| Descrição de Seção | `text-xs text-gray-400 mt-1` | "Configure as credenciais..." |
| Título de Card | `font-display font-bold text-lg` | "🔐 CREDENCIAIS POR DOMÍNIO" |
| Caixa Informativa | `text-xs text-blue-700` | "💡 Para que serve:..." |
| Label de Campo | `font-bold text-sm` | "GEMINI API KEY" |
| Descrição de Campo | `text-xs text-gray-500 mb-2` | "Chave da API do Google Gemini..." |
| Texto de Botão | `text-sm` ou `text-lg` | "TESTAR", "SALVAR CONFIGURAÇÕES" |

---

## 4. Iconografia

### 4.1 Estilo de Ícones

- **Tipo**: Emojis nativos do sistema
- **Vantagens**: Sem bibliotecas externas, renderização nativa, cores vibrantes

### 4.2 Ícones de Seção

| Ícone | Seção |
|-------|-------|
| 🔒 | Autenticação |
| 🤖 | Processamento |
| 💾 | Sistema |

### 4.3 Ícones de Card

| Ícone | Card |
|-------|------|
| 🔐 | Credenciais por Domínio |
| 🔑 | Chaves de API |
| ⚡ | Provedor de IA |
| 📝 | Template de Resumo |
| 🎙️ | Whisper (Transcrição) |
| 📁 | Armazenamento e Cache |

### 4.4 Ícones de Ação

| Ícone | Ação |
|-------|------|
| ➕ | Adicionar credencial |
| 💾 | Salvar configurações |
| 💡 | Informação/Dica |
| ❌ | Remover credencial |
| ✅ | Status configurado/válido |

---

## 5. Componentes de Interface

### 5.1 Modal Container

```html
<div id="settings-modal" class="fixed inset-0 bg-ink/90 hidden items-center justify-center z-50">
    <div class="bg-base border-4 border-ink rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-retro">
        <!-- Header -->
        <!-- Content -->
    </div>
</div>
```

**Especificações:**
- Overlay: `bg-ink/90` (rgba(45, 52, 54, 0.9))
- Fundo: `bg-base` (#FFF8E7)
- Borda: `border-4 border-ink` (#2D3436)
- Border-radius: `rounded-xl` (0.75rem)
- Largura máxima: `max-w-2xl` (42rem / 672px)
- Altura máxima: `max-h-[90vh]`
- Sombra: `shadow-retro` (4px 4px 0px 0px #2D3436)
- Z-index: 50

### 5.2 Header do Modal

```html
<div class="p-4 border-b-4 border-ink flex justify-between items-center bg-sun sticky top-0">
    <h3 class="font-display font-black text-xl">⚙️ CONFIGURAÇÕES</h3>
    <button onclick="closeSettingsModal()"
        class="w-8 h-8 border-2 border-ink bg-white hover:bg-red-500 hover:text-white font-bold rounded flex items-center justify-center">
        X
    </button>
</div>
```

**Especificações:**
- Background: `bg-sun` (#FFE66D)
- Padding: `p-4` (1rem)
- Borda inferior: `border-b-4 border-ink`
- Posição: `sticky top-0` (fixo ao scrollar)
- Título: `font-display font-black text-xl`

**Botão Fechar:**
- Tamanho: `w-8 h-8` (32x32px)
- Borda: `border-2 border-ink`
- Background: `bg-white` → hover: `bg-red-500`
- Texto: "X", `font-bold`
- Border-radius: `rounded` (0.25rem)

### 5.3 Título de Seção

```html
<div class="mb-2 mt-8">
    <h3 class="font-display font-black text-base text-gray-600 uppercase tracking-wide">
        🔒 Autenticação
    </h3>
    <p class="text-xs text-gray-400 mt-1">
        Configure as credenciais para acessar plataformas de cursos e APIs de IA
    </p>
</div>
```

### 5.4 Card Container

```html
<div class="bg-white border-2 border-ink rounded-xl p-4 shadow-retro">
    <div class="flex justify-between items-center mb-2">
        <h4 class="font-display font-bold text-lg">🔐 TÍTULO DO CARD</h4>
        <button class="btn-retro btn-tertiary text-xs px-2 py-1">➕ Adicionar</button>
    </div>
    <!-- Caixa Informativa -->
    <!-- Conteúdo -->
</div>
```

### 5.5 Caixa Informativa (💡)

```html
<div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-700">
    💡 <strong>Para que serve:</strong> Descrição da funcionalidade...
</div>
```

### 5.6 Campo de Input (retro-input)

```html
<div>
    <label class="block font-bold text-sm mb-1">GEMINI API KEY</label>
    <p class="text-xs text-gray-500 mb-2">Descrição do campo...</p>
    <div class="flex gap-2">
        <input type="password" id="cfg-gemini-key" class="retro-input flex-1 p-2" placeholder="AIzaSy...">
        <button onclick="testGeminiApi()" class="btn-retro btn-tertiary text-sm">TESTAR</button>
    </div>
    <div id="cfg-gemini-status" class="text-sm mt-2"></div>
</div>
```

**Classe `.retro-input`:**
```css
.retro-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.5);
    border: 2px solid #2D3436;
    border-radius: 1rem;
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
    box-shadow: 6px 6px 0px 0px #FF6B6B;
    border-color: #FF6B6B;
}
```

### 5.7 Select (Dropdown)

```html
<select id="cfg-ia-provider" class="retro-input p-2">
    <option value="gemini">Gemini (Recomendado)</option>
    <option value="openrouter">OpenRouter</option>
    <option value="auto">Automático (fallback)</option>
</select>
```

### 5.8 Checkbox com Container

```html
<div class="flex items-center gap-3 bg-amber-50 p-3 rounded-lg border-2 border-amber-300">
    <input type="checkbox" id="cfg-fallback" class="w-5 h-5" checked>
    <div>
        <label for="cfg-fallback" class="font-bold text-sm">Usar fallback automático</label>
        <p class="text-xs text-gray-600">Se o provedor principal falhar, tenta automaticamente o outro</p>
    </div>
</div>
```

### 5.9 Grid de Campos (2 colunas)

```html
<div class="grid grid-cols-2 gap-4">
    <div class="flex flex-col">
        <label class="block font-bold text-sm mb-1">MODELO</label>
        <p class="text-xs text-gray-500 mb-2 min-h-[32px]">Descrição...</p>
        <select id="cfg-whisper-model" class="retro-input p-2 mt-auto">
            <!-- options -->
        </select>
    </div>
    <div class="flex flex-col">
        <label class="block font-bold text-sm mb-1">DISPOSITIVO</label>
        <p class="text-xs text-gray-500 mb-2 min-h-[32px]">Descrição...</p>
        <select id="cfg-whisper-device" class="retro-input p-2 mt-auto">
            <!-- options -->
        </select>
    </div>
</div>
```

### 5.10 Botões

#### Botão Primário (SALVAR)

```html
<button onclick="saveConfigSettings()" class="btn-retro btn-primary w-full justify-center text-lg py-3">
    💾 SALVAR CONFIGURAÇÕES
</button>
```

#### Botão Terciário (TESTAR, Adicionar)

```html
<button class="btn-retro btn-tertiary text-sm">TESTAR</button>
<button class="btn-retro btn-tertiary text-xs px-2 py-1">➕ Adicionar</button>
```

---

## 6. Layout e Espaçamento

### 6.1 Estrutura de Seções

O modal de configurações é dividido em **3 seções principais**:

| Seção | Ícone | Cards Incluídos |
|-------|-------|-----------------|
| Autenticação | 🔒 | Credenciais por Domínio, Chaves de API |
| Processamento | 🤖 | Provedor de IA, Template de Resumo, Whisper |
| Sistema | 💾 | Armazenamento e Cache |

### 6.2 Sistema de Espaçamento

| Contexto | Classe Tailwind | Valor |
|----------|-----------------|-------|
| Padding do modal | `p-6` | 1.5rem (24px) |
| Gap entre cards | `space-y-6` | 1.5rem (24px) |
| Padding de card | `p-4` | 1rem (16px) |
| Gap em grid | `gap-4` | 1rem (16px) |
| Margin entre seções | `mt-8` | 2rem (32px) |

### 6.3 Dimensões do Modal

| Propriedade | Valor |
|-------------|-------|
| Largura máxima | `max-w-2xl` (42rem / 672px) |
| Altura máxima | `max-h-[90vh]` |
| Overflow | `overflow-y-auto` |

### 6.4 Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded` | 0.25rem (4px) | Botão X |
| `rounded-lg` | 0.5rem (8px) | Caixas informativas, checkboxes |
| `rounded-xl` | 0.75rem (12px) | Cards, modal container |

---

## 7. Estados e Interações

### 7.1 Estados de Botão

| Estado | Transform | Sombra |
|--------|-----------|--------|
| Default | `translate(0, 0)` | `4px 4px 0px 0px` |
| Hover | `translate(-2px, -2px)` | `6px 6px 0px 0px` |
| Active/Click | `translate(2px, 2px)` | `2px 2px 0px 0px` |
| Disabled | - | opacity: 0.5, cursor: not-allowed |

### 7.2 Status de API

#### API Configurada (Sucesso)

```html
<div id="cfg-gemini-status" class="text-sm mt-2 text-green-600">
    ✅ API configurada e funcionando
</div>
```

#### API Falhou (Erro)

```html
<div id="cfg-gemini-status" class="text-sm mt-2 text-red-600">
    ❌ Erro ao testar API: mensagem de erro
</div>
```

### 7.3 Status de Prompt

```html
<div id="cfg-prompt-status" class="text-sm mt-2 text-green-600">
    ✅ Prompt válido - 14/14 seções configuradas
</div>
```

### 7.4 Estados de Botão TESTAR

| Estado | Visual |
|--------|--------|
| Normal | `btn-retro btn-tertiary` |
| Carregando | Texto "TESTANDO..." + cursor wait |
| Sucesso | Normal + status verde abaixo |
| Erro | Normal + status vermelho abaixo |

---

## 8. Padrões de Telas

### 8.1 Estado Inicial (Modal Aberto)

**Elementos Visíveis:**
- Header do modal com título e botão X
- Seção Autenticação (expandida por padrão)
- Seção Processamento
- Seção Sistema
- Botão SALVAR CONFIGURAÇÕES

**Valores Pré-preenchidos:**
- Campos carregam valores salvos (localStorage ou backend)
- Checkboxes refletem estado atual
- Selects mostram opção selecionada

### 8.2 Fluxo: Testar API

```
1. Usuário preenche campo de API key
   ↓
2. Clica "TESTAR"
   ↓
3. Botão mostra "TESTANDO..." (estado loading)
   ↓
4. Requisição ao backend /api/test-api
   ↓
5a. Sucesso → Mostra ✅ verde abaixo do campo
5b. Erro → Mostra ❌ vermelho + mensagem abaixo do campo
```

### 8.3 Fluxo: Salvar Configurações

```
1. Usuário preenche todos os campos
   ↓
2. Clica "💾 SALVAR CONFIGURAÇÕES"
   ↓
3. Botão mostra estado loading
   ↓
4. Requisição ao backend /api/config
   ↓
5a. Sucesso → Toast verde + modal fecha
5b. Erro → Toast vermelho + modal permanece aberto
```

---

## 9. Modais e Overlays

### 9.1 Toast Notifications

O modal de configurações utiliza o sistema de toasts padrão:

```css
.toast-success { background: #D4EDDA; color: #166534; }
.toast-error { background: #FFEBEE; color: #c53030; }
```

### 9.2 Mensagens de Feedback Inline

Os feedbacks de teste de API são exibidos inline, abaixo dos campos:

```html
<div id="cfg-gemini-status" class="text-sm mt-2">
    <!-- ✅ Sucesso ou ❌ Erro -->
</div>
```

---

## 10. Responsividade

### 10.1 Breakpoints

| Breakpoint | Largura | Comportamento |
|------------|---------|---------------|
| Mobile | < 640px | Modal full-width, campos empilhados |
| Tablet | 640px - 1024px | Layout normal, grid 2 colunas |
| Desktop | > 1024px | Layout padrão max-w-2xl |

### 10.2 Ajustes Mobile

```css
@media (max-width: 640px) {
    .settings-modal-content {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
    }
    
    .grid-cols-2 {
        grid-template-columns: 1fr;
    }
    
    .p-6 {
        padding: 1rem;
    }
}
```

---

## 11. Acessibilidade

### 11.1 Contraste de Cores

| Combinação | Ratio | Status |
|------------|-------|--------|
| Ink (#2D3436) em Base (#FFF8E7) | 12.1:1 | ✅ AAA |
| Ink (#2D3436) em Sun (#FFE66D) | 9.2:1 | ✅ AAA |
| Branco em Accent (#FF6B6B) | 4.6:1 | ✅ AA Large |
| Blue-700 em Blue-50 | 6.5:1 | ✅ AAA |

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
| `Tab` | Navega entre campos |
| `Enter/Space` | Ativa botões |
| `Escape` | Fecha modal |
| `Arrow Up/Down` | Navega em selects |

### 11.5 ARIA Labels

```html
<button aria-label="Fechar configurações">X</button>
<button aria-label="Testar conexão com API Gemini">TESTAR</button>
<input aria-label="Chave da API Gemini" type="password" id="cfg-gemini-key">
<select aria-label="Selecionar provedor de IA" id="cfg-ia-provider"></select>
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
    --color-info: #0369a1;
    --color-info-light: #E3F2FD;
    
    /* Sombras retro */
    --shadow-retro: 4px 4px 0px 0px #2D3436;
    --shadow-retro-hover: 6px 6px 0px 0px #2D3436;
    --shadow-retro-active: 2px 2px 0px 0px #2D3436;
    
    /* Tipografia */
    --font-display: 'Space Grotesk', sans-serif;
    --font-body: 'Inter', sans-serif;
    
    /* Border radius */
    --radius-sm: 0.25rem;    /* 4px */
    --radius-md: 0.5rem;     /* 8px */
    --radius-lg: 0.75rem;    /* 12px */
    --radius-xl: 1rem;       /* 16px */
    
    /* Espaçamento */
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
| `.btn-primary` | Botão SALVAR (accent bg) |
| `.btn-tertiary` | Botões TESTAR, Adicionar (sun bg) |
| `.retro-input` | Todos os inputs e selects |
| `.shadow-retro` | Sombra neo-brutalista |

---

## 13. Dependências Externas

### 13.1 Fontes (Google Fonts)

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700;900&display=swap" rel="stylesheet">
```

### 13.2 Tailwind CSS

```html
<script src="https://cdn.tailwindcss.com"></script>
```

### 13.3 Backend API

O modal interage com os seguintes endpoints:

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/config` | GET | Carregar configurações |
| `/api/config` | POST | Salvar configurações |
| `/api/test-api` | POST | Testar API (Gemini/OpenRouter) |
| `/api/prompts` | GET | Listar templates de prompt |

---

## 14. Guia de Implementação

### 14.1 Estrutura HTML Mínima

```html
<div id="settings-modal" class="fixed inset-0 bg-ink/90 hidden items-center justify-center z-50">
    <div class="bg-base border-4 border-ink rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-retro">
        <!-- Header -->
        <div class="p-4 border-b-4 border-ink flex justify-between items-center bg-sun sticky top-0">
            <h3 class="font-display font-black text-xl">⚙️ CONFIGURAÇÕES</h3>
            <button onclick="closeSettingsModal()" class="btn-close">X</button>
        </div>
        
        <div class="p-6 space-y-6">
            <!-- Seção Autenticação -->
            <div class="mb-2">
                <h3 class="font-display font-black text-base text-gray-600 uppercase tracking-wide">
                    🔒 Autenticação
                </h3>
                <p class="text-xs text-gray-400 mt-1">Configure as credenciais...</p>
            </div>
            
            <!-- Cards de Autenticação -->
            <!-- ... -->
            
            <!-- Seção Processamento -->
            <!-- ... -->
            
            <!-- Seção Sistema -->
            <!-- ... -->
            
            <!-- Botão Salvar -->
            <button onclick="saveConfigSettings()" class="btn-retro btn-primary w-full justify-center text-lg py-3">
                💾 SALVAR CONFIGURAÇÕES
            </button>
        </div>
    </div>
</div>
```

### 14.2 Checklist de Implementação

**Fase 1: Base**
- [ ] Criar estrutura HTML do modal
- [ ] Implementar estilos CSS base
- [ ] Configurar Tailwind theme

**Fase 2: Funcionalidades**
- [ ] Carregar configurações do backend
- [ ] Implementar teste de APIs
- [ ] Implementar adicionar/remover credenciais
- [ ] Implementar salvar configurações

**Fase 3: Feedback**
- [ ] Status de teste de API
- [ ] Status de validação de prompt
- [ ] Toasts de sucesso/erro
- [ ] Estados de loading

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| v2.1 | 21/12/2025 | Unificação metodológica. Adição de seções: Princípios de Design, Padrões de Telas, Dependências Externas, Guia de Implementação. |
| v2.0 | 21/12/2025 | Reescrita completa baseada na implementação real. |
| v1.0 | Dez/2025 | Versão inicial (design genérico, não implementado) |

---

**FIM DO DOCUMENTO**
