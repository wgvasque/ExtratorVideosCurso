# 📚 Contexto Completo do Projeto - ExtratorVideosCurso

## 🎯 Visão Geral

**ExtratorVideosCurso** é um sistema completo de processamento de vídeos que extrai, transcreve e gera resumos estruturados de vídeos de cursos online. O projeto combina tecnologias de web scraping, transcrição de áudio com IA e geração de resumos usando múltiplos modelos de LLM.

### Propósito Principal
- Extrair vídeos de plataformas educacionais (HLS/DASH/MP4)
- Transcrever áudio usando Whisper (faster-whisper)
- Gerar resumos estruturados usando LLMs (Gemini, OpenRouter com fallback)
- Produzir relatórios em múltiplos formatos (JSON, Markdown, HTML, PDF)

---

## 🏗️ Arquitetura do Projeto

### Estrutura de Diretórios

```
ExtratorVideosCurso/
├── extrator_videos/          # Módulo principal Python
│   ├── extractor.py          # Extração de vídeos (HLS/DASH/MP4)
│   ├── browser.py            # Sessão Playwright para captura de rede
│   ├── network_capture.py    # Captura de requisições HTTP
│   ├── hls.py                # Parser de playlists HLS
│   ├── dash.py               # Parser de manifestos DASH
│   ├── drm.py                # Detecção de DRM
│   ├── transcription.py      # Processamento de áudio
│   ├── whisper_engine.py     # Transcrição usando faster-whisper
│   ├── gemini_client.py      # Cliente para API Gemini
│   ├── openrouter_client.py  # Cliente para OpenRouter (múltiplos LLMs)
│   ├── transcribe_cli.py     # CLI para processar 1 vídeo
│   ├── batch_cli.py          # CLI para processar múltiplos vídeos
│   ├── logger_json.py        # Sistema de logs estruturados em JSON
│   ├── report_renderer.py    # Geração de relatórios HTML/PDF
│   ├── postprocess.py        # Pós-processamento de transcrições
│   ├── auth.py               # Autenticação programática
│   ├── security.py           # Funções de segurança (hash, logs)
│   ├── verifications.py      # Validação de integridade
│   ├── transcription_cache.py # Cache de transcrições
│   ├── resolve_cache.py      # Cache de resolução de URLs
│   └── schema.py             # Schemas de dados (dataclasses)
│
├── web_interface/            # Interface web Flask
│   ├── app.py                # Flask app + SocketIO
│   ├── templates/
│   │   └── index.html        # Interface principal
│   ├── static/
│   │   └── js/
│   │       └── main.js       # Lógica frontend
│   └── requirements.txt      # Dependências Flask
│
├── logs/                     # Logs de processamento (JSON)
│   └── <dominio>/<id>/
│       └── *.process.log.json
│
├── sumarios/                 # Resumos gerados
│   └── <dominio>/<id>/
│       ├── resumo_<id>.json
│       ├── resumo_<id>.md
│       └── render/
│           └── *.html
│
├── resolve_cache/            # Cache de resolução de URLs
├── sumarios_cache/           # Cache de transcrições
│
├── requirements.txt          # Dependências principais
├── README.md                 # Documentação principal
├── QUICK_START.md            # Guia rápido
├── FALLBACK_SYSTEM.md        # Documentação do sistema de fallback
├── OPENROUTER_GUIDE.md       # Guia de uso do OpenRouter
├── BATCH_PROCESSING.md       # Processamento em lote
├── MODELS_ANALYSIS.md        # Análise de modelos LLM
└── targets.txt               # Lista de URLs para processar
```

---

## 🔧 Stack Tecnológico

### Backend (Python)
- **Python 3.8+**
- **Playwright** (1.47.0+) - Navegação e captura de rede
- **faster-whisper** (1.0.0+) - Transcrição de áudio
- **google-generativeai** (0.8.3+) - API Gemini
- **requests** (2.32.3+) - Requisições HTTP
- **m3u8** (5.0.0+) - Parser de playlists HLS
- **beautifulsoup4** (4.12.3+) - Parsing HTML
- **python-dotenv** (1.0.1+) - Variáveis de ambiente

### Interface Web (Flask)
- **Flask** (3.0.0) - Framework web
- **Flask-SocketIO** (5.3.5) - WebSockets para atualizações em tempo real
- **eventlet** (0.33.3) - Async I/O
- **Tailwind CSS** - Estilização (via CDN)
- **JavaScript vanilla** - Lógica frontend

### Ferramentas Externas
- **FFmpeg** - Extração e conversão de áudio
- **wkhtmltopdf** (opcional) - Geração de PDFs

---

## 📋 Fluxo de Processamento

### 1. Extração de Vídeo
```
URL da Página → Browser Session (Playwright) 
  → Captura de Rede 
  → Detecção de Vídeos (HLS/DASH/MP4)
  → Parsing de Playlists
  → Seleção de Variante (melhor qualidade/áudio)
```

**Módulos envolvidos:**
- `extractor.py` - Orquestração
- `browser.py` - Sessão Playwright
- `network_capture.py` - Captura de requisições
- `hls.py` / `dash.py` - Parsing de playlists
- `drm.py` - Detecção de proteção DRM

### 2. Ingestão de Áudio
```
Manifest URL → FFmpeg Stream
  → Conversão para WAV (16kHz, mono)
  → Armazenamento temporário
```

**Fallbacks:**
- FFmpeg direto no manifest
- FFmpeg no master playlist
- Download de segmentos HLS manual

### 3. Transcrição
```
WAV → Whisper Engine (faster-whisper)
  → Divisão em chunks (configurável)
  → Processamento paralelo
  → Consolidação de segmentos
  → Cache (se disponível)
```

**Configurações:**
- `WHISPER_MODEL`: modelo a usar (small/medium/large)
- `WHISPER_DEVICE`: cpu/cuda
- `CHUNK_SECONDS`: tamanho dos chunks (default: 60s)
- `MAX_PARALLEL_CHUNKS`: paralelismo (default: 3)

### 4. Pós-processamento
```
Transcrição → Segmentação por Tópicos
  → Estruturação em Blocos Temporais
  → Limpeza e Normalização
```

### 5. Geração de Resumo
```
Transcrição + Blocos → LLM (Gemini ou OpenRouter)
  → Validação de Qualidade
  → Fallback Automático (se OpenRouter)
  → Estruturação JSON
```

**Sistema de Fallback (OpenRouter):**
1. Tenta modelos gratuitos primeiro
2. Valida qualidade (resumo, pontos-chave, orientações)
3. Se falhar, tenta próximo modelo
4. Até 10 tentativas configuráveis

**Modelos Padrão (ordem de tentativa):**
1. `google/gemini-2.0-flash-exp:free`
2. `meta-llama/llama-3.3-70b-instruct:free`
3. `deepseek/deepseek-chat-v3:free`
4. ... (até 10 modelos)

### 6. Geração de Relatórios
```
JSON Resumo → Report Renderer
  → HTML Moderno (gradiente, cards, navegação)
  → Markdown
  → PDF (opcional)
```

---

## 🔑 Configuração (.env)

### Autenticação
```env
EMAIL=seu_email@exemplo.com
SENHA=sua_senha
```

### APIs de IA
```env
# Gemini (Google)
GEMINI_API_KEY=sua_chave_gemini

# OpenRouter (múltiplos modelos)
OPENROUTER_API_KEY=sk-or-v1-sua_chave
USE_OPENROUTER=true
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
OPENROUTER_USE_FALLBACK=true
OPENROUTER_MAX_FALLBACK_ATTEMPTS=10
```

### Whisper (Transcrição)
```env
WHISPER_MODEL=medium          # small/medium/large
WHISPER_DEVICE=cpu            # cpu/cuda
WHISPER_COMPUTE_TYPE=float16  # float16/float32/int8
```

### Cache
```env
SUMARIOS_CACHE_DIR=sumarios_cache
RESOLVE_CACHE_DIR=resolve_cache
CACHE_TTL_HOURS=72            # 3 dias para resolução, 7 dias para transcrição
```

### Processamento
```env
CHUNK_SECONDS=60              # Tamanho dos chunks de áudio
MAX_PARALLEL_CHUNKS=3         # Paralelismo de transcrição
FFMPEG_PREVIEW_SECONDS=0      # Preview (0 = completo)
```

### Logs
```env
LOG_LEVEL=info                # debug/info/warning/error
LOG_DIR=logs
```

### Relatórios
```env
ENABLE_PDF=0                  # 1 para habilitar PDF
WKHTMLTOPDF_PATH=C:/path/to/wkhtmltopdf.exe
```

### Referência
```env
REFERER=https://alunos.segueadii.com.br/
```

---

## 🚀 Formas de Uso

### 1. Interface Web (Recomendado)
```bash
cd web_interface
python app.py
# Acesse http://localhost:5000
```

**Funcionalidades:**
- Interface visual moderna
- Processamento em tempo real (WebSocket)
- Visualização de relatórios
- Download de HTMLs

### 2. CLI - Processar 1 Vídeo
```bash
python -m extrator_videos.transcribe_cli \
  "https://alunos.segueadii.com.br/area/produto/item/7033466" \
  --referer "https://alunos.segueadii.com.br/" \
  --out resumo.json \
  --md resumo.md
```

### 3. CLI - Processar Múltiplos Vídeos
```bash
python -m extrator_videos.batch_cli \
  --file targets.txt \
  --outdir .
```

### 4. CLI - Extrair URL de Vídeo (sem transcrição)
```bash
python -m extrator_videos.cli \
  "https://alunos.segueadii.com.br/area/produto/item/7033466" \
  --download best
```

---

## 💾 Sistema de Cache

### Cache de Transcrição
- **Localização**: `sumarios_cache/`
- **Chave**: Hash de (URL original + manifest URL + headers relevantes)
- **TTL**: 168 horas (7 dias) - configurável
- **Conteúdo**: JSON com segments, idioma, duração
- **Benefício**: Evita reprocessar áudio já transcrito

### Cache de Resolução
- **Localização**: `resolve_cache/`
- **Chave**: Hash SHA256 da URL original
- **TTL**: 72 horas (3 dias) - configurável
- **Conteúdo**: Manifest URL/variant selecionado
- **Benefício**: Evita re-extrair vídeo da página

---

## 📊 Estrutura de Saída

### Logs (`logs/<dominio>/<id>/`)
```json
{
  "run_id": "abc123_7033466",
  "inicio_iso": "2024-01-01T12:00:00Z",
  "fim_iso": "2024-01-01T12:05:00Z",
  "duracao_total_ms": 300000,
  "steps": [
    {
      "descricao": "Resolver fonte de mídia",
      "categoria": "resolve",
      "inicio_iso": "...",
      "fim_iso": "...",
      "duracao_ms": 5000,
      "status": "success",
      "details": { ... }
    },
    ...
  ],
  "checks": { ... }
}
```

### Resumos (`sumarios/<dominio>/<id>/`)

**resumo_<id>.json:**
```json
{
  "resumo_conciso": "...",
  "pontos_chave": ["1. ...", "2. ..."],
  "topicos": ["Tópico 1", "Tópico 2"],
  "orientacoes": [
    {
      "passo": 1,
      "acao": "...",
      "beneficio": "..."
    }
  ],
  "secoes": [
    {
      "titulo": "...",
      "inicio": 0.0,
      "fim": 120.0,
      "conteudo": "..."
    }
  ]
}
```

**resumo_<id>.md:** Markdown formatado

**render/*.html:** HTML moderno com:
- Gradiente roxo no header
- Navegação sticky
- Cards coloridos
- Timeline visual
- Seções colapsáveis
- Responsivo

---

## 🔄 Sistema de Fallback (OpenRouter)

### Funcionamento
1. Tenta modelos na ordem configurada
2. Valida qualidade de cada resposta:
   - Resumo: 50-500 palavras
   - Pontos-chave: mínimo 3 itens
   - Orientações: mínimo 3 itens com campo `acao`
3. Se validação falhar, tenta próximo modelo
4. Registra todas as tentativas nos logs

### Taxa de Sucesso Estimada
- **3 modelos gratuitos**: ~85% (custo $0.00)
- **6 modelos gratuitos**: ~95% (custo $0.00)
- **6 gratuitos + 2 pagos**: ~99% (custo ~$0.005/vídeo)
- **6 gratuitos + 4 pagos**: ~99.9% (custo ~$0.01/vídeo)

---

## 🎨 Características Técnicas

### Segurança
- Hash de inputs para identificação única
- Logs sem credenciais
- Cache com TTL configurável
- Validação de integridade de arquivos

### Performance
- Transcrição paralela por chunks
- Cache inteligente (transcrição + resolução)
- Seleção automática de melhor variante de vídeo
- Processamento assíncrono na interface web

### Portabilidade
- Caminhos relativos (Windows/Linux compatível)
- Configuração via variáveis de ambiente
- Sem dependências de sistema (exceto FFmpeg)
- Logs estruturados em JSON

### Robustez
- Múltiplos fallbacks (ingestão, transcrição, resumo)
- Validação de qualidade automática
- Logs detalhados para debug
- Tratamento de erros em todas as etapas

---

## 📝 Módulos Principais

### `extractor.py`
Extrai URLs de vídeo de páginas web usando Playwright e análise de rede.

### `transcribe_cli.py`
CLI principal para processar um vídeo completo (extração → transcrição → resumo → relatório).

### `batch_cli.py`
Processa múltiplos vídeos em sequência a partir de arquivo de texto.

### `openrouter_client.py`
Cliente para OpenRouter com sistema de fallback automático e validação de qualidade.

### `gemini_client.py`
Cliente para API Gemini direta (fallback quando OpenRouter não disponível).

### `whisper_engine.py`
Wrapper para faster-whisper com suporte a chunks paralelos.

### `report_renderer.py`
Gera relatórios HTML modernos e PDFs (opcional).

### `logger_json.py`
Sistema de logs estruturados em JSON com timestamps ISO 8601.

---

## 🔍 Detalhes de Implementação

### Detecção de Vídeos
- Captura de requisições HTTP (Content-Type: video/*, application/vnd.apple.mpegurl, etc.)
- Instrumentação JavaScript (MediaSource, EME)
- Parsing de playlists HLS/DASH
- Detecção de DRM (Widevine, FairPlay, PlayReady)

### Autenticação
- Login programático via Playwright
- Cookies persistidos
- Headers customizados (Referer, User-Agent, Cookie)

### Transcrição
- faster-whisper com modelo configurável
- Divisão em chunks para paralelização
- Consolidação com alinhamento de timestamps
- Cache para evitar reprocessamento

### Resumo
- Prompt estruturado (via `prompt_padrao.json` ou padrão OpenRouter)
- Validação automática de qualidade
- Fallback automático em caso de falha
- Suporte a blocos temporais

---

## 📈 Estatísticas e Métricas

### Tempo de Processamento (estimado)
- **Extração**: 5-15 segundos
- **Ingestão**: 10-30 segundos (depende do tamanho)
- **Transcrição**: 1-5 minutos (depende do modelo Whisper e hardware)
- **Resumo**: 10-60 segundos (depende do modelo LLM)
- **Relatório**: 1-5 segundos

**Total**: ~3-8 minutos por vídeo de 1 hora (com GPU)

### Custos (OpenRouter)
- **Modelos gratuitos**: $0.00
- **GPT-4o-mini**: ~$0.01/vídeo
- **Claude 3.5 Sonnet**: ~$0.15/vídeo

### Taxa de Sucesso
- **Com fallback (10 modelos)**: ~99.9%
- **Sem fallback (1 modelo)**: ~85-90%

---

## 🛠️ Manutenção e Extensibilidade

### Adicionar Novo Modelo LLM
Editar `openrouter_client.py` e adicionar à lista `DEFAULT_FALLBACK_MODELS`.

### Modificar Formato de Resumo
Editar `prompt_padrao.json` (Gemini) ou prompt em `openrouter_client.py`.

### Alterar Interface Web
Modificar `web_interface/templates/index.html` e `web_interface/static/js/main.js`.

### Adicionar Novo Formato de Saída
Estender `report_renderer.py` com nova função de renderização.

---

## 📚 Documentação Adicional

- **QUICK_START.md**: Guia rápido de início
- **FALLBACK_SYSTEM.md**: Documentação completa do sistema de fallback
- **OPENROUTER_GUIDE.md**: Guia de uso do OpenRouter
- **BATCH_PROCESSING.md**: Processamento em lote
- **MODELS_ANALYSIS.md**: Análise detalhada de modelos LLM
- **README.md**: Documentação principal do projeto

---

## 🎯 Casos de Uso

1. **Processamento de Cursos Online**
   - Extrair vídeos de plataformas educacionais
   - Gerar resumos estruturados para revisão

2. **Análise de Conteúdo**
   - Transcrever vídeos para busca textual
   - Extrair tópicos principais

3. **Criação de Material de Estudo**
   - Gerar resumos em múltiplos formatos
   - Criar índices navegáveis por tempo

---

**Última atualização**: 2024-12-XX
**Versão do projeto**: 1.0.0
