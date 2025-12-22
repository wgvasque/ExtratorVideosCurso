# Sistema de Design – Extensão: Aba Config

## Documentação Completa v1.0

> **IMPORTANTE:** Este documento reflete a implementação atual da aba Config no `popup.html` da extensão de navegador, seguindo o design system **Solar Pop Edition** (Neo-Brutalista/Retro-Pop).

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

A **Aba Config** permite configurar credenciais, APIs de IA, e preferências de processamento diretamente na extensão. É uma versão compacta do modal de configurações da interface web, otimizada para o popup.

### 1.1 Princípios de Design

- **Bordas Sólidas**: Todos os elementos possuem bordas de 2-3px sem desfoque
- **Sombras Planas**: Sombras projetadas sem blur (`3px 3px 0px 0px`)
- **Cores Vibrantes**: Paleta curada Solar Pop Edition
- **Organização por Seções**: 3 seções principais (Autenticação, Processamento, Sistema)
- **Cards Informativos**: Caixas 💡 explicando funcionalidades

### 1.2 Funcionalidades

- **Credenciais**: Gerenciar logins por domínio (Hub.la, Hotmart, etc.)
- **APIs**: Configurar Gemini e OpenRouter com teste de conexão
- **Provedor de IA**: Escolher provedor principal e fallback
- **Template de Resumo**: Selecionar modelo de prompt
- **Whisper**: Configurar modelo e dispositivo de transcrição
- **Armazenamento**: Pasta de sumários e TTL de cache

### 1.3 Estrutura da Aba

```
┌─────────────────────────────────────────────────┐
│ 🔒 AUTENTICAÇÃO                                 │ ← Section Title
│ Configure as credenciais...                     │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐   │
│ │ 🔐 CREDENCIAIS POR DOMÍNIO    [➕ Add]    │   │ ← Card
│ │ 💡 Login automático em plataformas...     │   │
│ │ [Lista de credenciais]                    │   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ 🔑 CHAVES DE API                          │   │ ← Card
│ │ 💡 Autenticação com serviços de IA...     │   │
│ │ GEMINI API KEY          [input] [Testar]  │   │
│ │ OPENROUTER API KEY      [input] [Testar]  │   │
│ └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ 🤖 PROCESSAMENTO                                │ ← Section Title
│ Configure transcrição e resumos...              │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐   │
│ │ ⚡ PROVEDOR DE IA                         │   │
│ │ 💡 Define qual serviço processa...        │   │
│ │ [Select: Gemini/OpenRouter/Auto]          │   │
│ │ ☐ Usar fallback automático                │   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ 📝 TEMPLATE DE RESUMO                     │   │
│ │ 💡 Formato e estilo do resumo...          │   │
│ │ [Select de modelos]                       │   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ 🎙️ WHISPER (Transcrição)                  │   │
│ │ 💡 Converte áudio em texto...             │   │
│ │ MODELO [select]  DISPOSITIVO [select]     │   │
│ └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ 💾 SISTEMA                                      │ ← Section Title
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐   │
│ │ 📁 ARMAZENAMENTO E CACHE                  │   │
│ │ 💡 Onde relatórios são salvos...          │   │
│ │ PASTA [input]  CACHE TTL [input]          │   │
│ └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ [💾 SALVAR CONFIGURAÇÕES]                       │ ← Primary Button
└─────────────────────────────────────────────────┘
```

---

## 2. Paleta de Cores

### 2.1 Cores Semânticas Principais

| Nome | Variável CSS | Hex | Uso na Aba |
|------|-------------|-----|------------|
| **Base** | `--base` | `#FFF8E7` | Fundo do popup |
| **Ink** | `--ink` | `#2D3436` | Bordas, texto principal, sombras |
| **Accent** | `--accent` | `#FF6B6B` | Botão Salvar, status erro |
| **Pop** | `--pop` | `#4ECDC4` | Status sucesso (não usado diretamente) |
| **Sun** | `--sun` | `#FFE66D` | Botões Testar, Adicionar |

### 2.2 Cores de Estado

| Contexto | Background | Borda | Texto |
|----------|------------|-------|-------|
| Info Box (💡) | `#eff6ff` | `1px solid #bfdbfe` | `#1e40af` |
| Fallback Container | `#fffbeb` | `1px solid #fde68a` | `#92400e` |
| Status Sucesso | - | - | `#16a34a` (green-600) |
| Status Erro | - | - | `#dc2626` (red-600) |
| Toast Sucesso | `#d1fae5` | - | `#065f46` |
| Toast Erro | `#fee2e2` | - | `#991b1b` |

### 2.3 Cores de Seção

| Seção | Ícone | Cor do Título |
|-------|-------|---------------|
| Autenticação | 🔒 | `#666` (gray-600) |
| Processamento | 🤖 | `#666` |
| Sistema | 💾 | `#666` |

---

## 3. Tipografia

### 3.1 Famílias Tipográficas

| Família | Fonte | Pesos | Uso |
|---------|-------|-------|-----|
| **Display** | `Space Grotesk` | 700 | Títulos de seção, cards |
| **Body** | `Inter` | 400, 500, 600 | Labels, descrições |

### 3.2 Escala Tipográfica

| Elemento | Tamanho | Peso | Uso |
|----------|---------|------|-----|
| Section Title | 14px | 700 | "🔒 Autenticação" |
| Section Description | 10px | 400 | "Configure as credenciais..." |
| Card Title | 14px | 700 | "🔐 CREDENCIAIS POR DOMÍNIO" |
| Info Box | 10px | 400 | "💡 Para que serve:..." |
| Label | 10px | 600 | "GEMINI API KEY" |
| Label Description | 9px | 400 | "Chave da API do Google..." |
| Input Text | 11px | 400 | Texto nos campos |
| Button | 11px | 700 | "Testar", "Salvar" |
| Status Text | 9px | 400 | "✅ API configurada..." |

---

## 4. Iconografia

### 4.1 Ícones de Seção

| Ícone | Seção |
|-------|-------|
| 🔒 | Autenticação |
| 🤖 | Processamento |
| 💾 | Sistema |

### 4.2 Ícones de Card

| Ícone | Card |
|-------|------|
| 🔐 | Credenciais por Domínio |
| 🔑 | Chaves de API |
| ⚡ | Provedor de IA |
| 📝 | Template de Resumo |
| 🎙️ | Whisper |
| 📁 | Armazenamento e Cache |

### 4.3 Ícones de Ação

| Ícone | Ação |
|-------|------|
| ➕ | Adicionar credencial |
| 💾 | Salvar configurações |
| 💡 | Informação/Dica |
| ❌ | Remover credencial |
| ✅ | Status válido |

---

## 5. Componentes de Interface

### 5.1 Section Title

```css
.section-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 2px;
}

.section-description {
    font-size: 10px;
    color: #999;
    margin-bottom: 8px;
}
```

### 5.2 Card Container

```css
.card {
    background: white;
    border: 2px solid var(--ink);
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 12px;
    box-shadow: 4px 4px 0px 0px var(--ink);
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

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}
```

### 5.3 Info Box (💡)

```css
.info-box {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 12px;
    font-size: 10px;
    color: #1e40af;
}

.info-box strong {
    font-weight: 600;
}

.info-box a {
    font-weight: bold;
    text-decoration: underline;
    color: inherit;
}
```

### 5.4 Input Field

```css
.settings-input {
    flex: 1;
    padding: 8px;
    border: 2px solid var(--ink);
    border-radius: 6px;
    font-size: 11px;
}

.settings-input:focus {
    outline: none;
    border-color: var(--accent);
}

.settings-input::placeholder {
    color: #999;
}
```

### 5.5 Select Field

```css
.settings-select {
    width: 100%;
    padding: 8px;
    border: 2px solid var(--ink);
    border-radius: 6px;
    font-size: 11px;
    background: white;
    cursor: pointer;
}

.settings-select:focus {
    outline: none;
    border-color: var(--accent);
}
```

### 5.6 Label com Descrição

```css
.field-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    margin-bottom: 2px;
}

.field-description {
    font-size: 9px;
    color: #999;
    margin-bottom: 6px;
}
```

### 5.7 Input Row (com botão)

```css
.input-row {
    display: flex;
    gap: 6px;
}

.input-row .settings-input {
    flex: 1;
}

.input-row .btn {
    flex-shrink: 0;
}
```

### 5.8 Status Display

```css
.status-display {
    font-size: 9px;
    margin-top: 4px;
}

.status-display.success {
    color: #16a34a;
}

.status-display.error {
    color: #dc2626;
}
```

### 5.9 Fallback Container (Checkbox)

```css
.fallback-container {
    background: #fffbeb;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #fde68a;
    display: flex;
    align-items: flex-start;
    gap: 8px;
}

.fallback-container input[type="checkbox"] {
    margin-top: 2px;
}

.fallback-container label {
    font-weight: bold;
    font-size: 11px;
    display: block;
}

.fallback-container p {
    font-size: 9px;
    color: #92400e;
    margin-top: 2px;
}
```

### 5.10 Grid de Campos (2 colunas)

```css
.fields-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.fields-grid .field {
    display: flex;
    flex-direction: column;
}

.fields-grid .field-description {
    min-height: 20px;  /* Alinhar campos */
}

.fields-grid .settings-select,
.fields-grid .settings-input {
    margin-top: auto;
}
```

### 5.11 Botão Salvar

```css
.btn-save {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    border: 2px solid var(--ink);
    border-radius: 8px;
    padding: 10px 12px;
    cursor: pointer;
    font-size: 11px;
    box-shadow: 3px 3px 0px 0px var(--ink);
    transition: all 0.1s;
    background: var(--accent);
    color: white;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 8px;
}

.btn-save:hover {
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0px 0px var(--ink);
}

.btn-save:active {
    transform: translate(1px, 1px);
    box-shadow: 2px 2px 0px 0px var(--ink);
}
```

### 5.12 Toast

```css
.settings-toast {
    margin-top: 12px;
    padding: 10px;
    border-radius: 8px;
    text-align: center;
    font-weight: 600;
    font-size: 11px;
}

.settings-toast.success {
    background: #d1fae5;
    color: #065f46;
}

.settings-toast.error {
    background: #fee2e2;
    color: #991b1b;
}
```

---

## 6. Layout e Espaçamento

### 6.1 Estrutura de Seções

| Seção | Cards |
|-------|-------|
| Autenticação | Credenciais por Domínio, Chaves de API |
| Processamento | Provedor de IA, Template de Resumo, Whisper |
| Sistema | Armazenamento e Cache |

### 6.2 Sistema de Espaçamento

| Contexto | Valor |
|----------|-------|
| Section margin top | 20px |
| Card margin bottom | 12px |
| Card padding | 12px |
| Info box margin | 0 0 12px 0 |
| Field group margin | 12px |
| Grid gap | 8px |

### 6.3 Dimensões

| Propriedade | Valor |
|-------------|-------|
| Largura popup | 420px |
| Padding conteúdo | 12px |
| Grid columns | 1fr 1fr |
| Button Testar | fit-content |

---

## 7. Estados e Interações

### 7.1 Estados de Input

| Estado | Visual |
|--------|--------|
| Empty | Placeholder cinza |
| Focused | Border accent |
| Filled | Texto ink |
| Error | Border red (após validação) |

### 7.2 Estados de Teste de API

| Estado | Visual |
|--------|--------|
| Idle | Botão "Testar" |
| Testing | Texto "Testando..." + cursor wait |
| Success | "✅ API configurada e funcionando" em verde |
| Error | "❌ Erro: [mensagem]" em vermelho |

### 7.3 Estados de Salvar

| Estado | Visual |
|--------|--------|
| Idle | Botão "💾 SALVAR CONFIGURAÇÕES" |
| Saving | Spinner ou "Salvando..." |
| Success | Toast verde + fechamento opcional |
| Error | Toast vermelho com erro |

---

## 8. Padrões de Telas

### 8.1 Estado Inicial

**Carregar da API:**
- Gemini Key (mascarada)
- OpenRouter Key (mascarada)
- Provedor selecionado
- Status de fallback
- Modelo de prompt
- Configurações Whisper
- Diretório de sumários
- TTL de cache

### 8.2 Fluxo de Teste de API

```
1. Usuário preenche API key
   ↓
2. Clica "Testar"
   ↓
3. Botão muda para "Testando..."
   ↓
4. Requisição ao backend
   ↓
5a. Sucesso → Status verde ✅
5b. Erro → Status vermelho ❌
```

### 8.3 Fluxo de Salvar

```
1. Usuário preenche campos
   ↓
2. Clica "💾 SALVAR CONFIGURAÇÕES"
   ↓
3. Validação frontend
   ↓
4. Requisição POST /api/config
   ↓
5a. Sucesso → Toast verde + valores persistidos
5b. Erro → Toast vermelho + campos mantidos
```

---

## 9. Modais e Overlays

A aba Config não possui modais próprios. Utiliza toasts inline para feedback.

---

## 10. Responsividade

Não aplicável - largura fixa de 420px para popup de extensão.

O grid 2 colunas para Whisper e Armazenamento funciona bem na largura fixa.

---

## 11. Acessibilidade

### 11.1 Contraste de Cores

| Combinação | Ratio | Status |
|------------|-------|--------|
| Ink em Base | 12.1:1 | ✅ AAA |
| Blue-800 em Blue-50 | 7.1:1 | ✅ AAA |
| Amber-800 em Amber-50 | 6.2:1 | ✅ AA |
| White em Accent | 4.6:1 | ✅ AA |

### 11.2 Navegação por Teclado

- `Tab`: Navegar entre campos
- `Space`: Toggle checkbox
- `Enter`: Ativar botões
- `Arrow Up/Down`: Navegar selects

### 11.3 ARIA Labels

```html
<input type="password" aria-label="Chave API do Gemini" id="settings-gemini-key">
<button aria-label="Testar conexão API Gemini">Testar</button>
<select aria-label="Selecionar provedor de IA" id="settings-ia-provider"></select>
<input type="checkbox" aria-label="Ativar fallback automático" id="settings-fallback">
```

### 11.4 Labels Associados

Todos os inputs têm labels explícitos ou implícitos:

```html
<label for="settings-gemini-key">GEMINI API KEY</label>
<input id="settings-gemini-key" type="password">
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
    
    /* Info */
    --info-bg: #eff6ff;
    --info-border: #bfdbfe;
    --info-text: #1e40af;
    
    /* Fallback container */
    --warning-bg: #fffbeb;
    --warning-border: #fde68a;
    --warning-text: #92400e;
    
    /* Status */
    --success-text: #16a34a;
    --error-text: #dc2626;
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
| `/api/config` | GET | Carregar configurações |
| `/api/config` | POST | Salvar configurações |
| `/api/test-api` | POST | Testar API (Gemini/OpenRouter) |
| `/api/prompts` | GET | Listar templates de prompt |

---

## 14. Guia de Implementação

### 14.1 Estrutura HTML

```html
<div id="tab-settings" class="tab-panel">
    <!-- Seção Autenticação -->
    <div class="mb-4">
        <h3 class="section-title">🔒 Autenticação</h3>
        <p class="section-description">Configure as credenciais...</p>
    </div>
    
    <div class="card">
        <div class="card-header">
            <div class="card-title">🔐 CREDENCIAIS POR DOMÍNIO</div>
            <button class="btn btn-sun btn-sm">➕ Adicionar</button>
        </div>
        <div class="info-box">💡 Para que serve:...</div>
        <div id="credentials-list"></div>
    </div>
    
    <div class="card">
        <div class="card-title">🔑 CHAVES DE API</div>
        <div class="info-box">💡 Para que serve:...</div>
        
        <div class="field-group">
            <label class="field-label">GEMINI API KEY</label>
            <p class="field-description">Chave da API do Google Gemini...</p>
            <div class="input-row">
                <input type="password" id="settings-gemini-key" class="settings-input">
                <button id="test-gemini-btn" class="btn btn-sun btn-sm">Testar</button>
            </div>
            <div id="gemini-key-status" class="status-display"></div>
        </div>
    </div>
    
    <!-- Seção Processamento -->
    <!-- ... -->
    
    <!-- Seção Sistema -->
    <!-- ... -->
    
    <button id="save-settings-btn" class="btn-save">
        💾 SALVAR CONFIGURAÇÕES
    </button>
    
    <div id="settings-toast" class="settings-toast" style="display: none;"></div>
</div>
```

### 14.2 Checklist

- [ ] Carregar configurações da API ao abrir aba
- [ ] Salvar configurações no backend
- [ ] Testar APIs com feedback visual
- [ ] Adicionar/remover credenciais
- [ ] Selects carregando opções da API
- [ ] Checkbox de fallback funcional
- [ ] Toast de sucesso/erro
- [ ] Validações de campos

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| v1.0 | 21/12/2025 | Criação inicial do documento |

---

**FIM DO DOCUMENTO**
