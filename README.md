# 🎓 ExtratorVideosCurso

Sistema completo para extração, transcrição e resumo de vídeos de cursos online.

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-230%2B-brightgreen.svg)](tests/)

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#️-arquitetura)
- [Instalação](#-instalação)
- [Uso Rápido](#-uso-rápido)
- [Documentação](#-documentação)
- [Contribuindo](#-contribuindo)
- [Licença](#-licença)

---

## 🎯 Visão Geral

O **ExtratorVideosCurso** é um sistema integrado que:

1. 🎥 **Captura** URLs de vídeos de plataformas de cursos (Hub.la, Segueadii, etc.)
2. 🔊 **Transcreve** áudio usando Whisper (OpenAI)
3. 👥 **Identifica** speakers (Professor, Aluno) via diarização
4. 📝 **Gera** resumos estruturados com IA (Gemini, Claude)
5. 💾 **Cacheia** resultados para economia de custos
6. 📊 **Apresenta** relatórios via interface web

---

## ✨ Funcionalidades

### 🎥 Captura de Vídeos

- ✅ Extensão Chrome para captura automática de manifests HLS/DASH
- ✅ Resolução de URLs com login automático
- ✅ Suporte a múltiplas plataformas (Hub.la, Segueadii, genérico)
- ✅ Detecção de DRM

### 🔊 Transcrição

- ✅ Whisper (OpenAI) para transcrição de alta qualidade
- ✅ Diarização de speakers (pyannote.audio)
- ✅ Cache de transcrições (economia de custos)
- ✅ Suporte a múltiplos idiomas

### 📝 Resumo Estruturado

- ✅ 14 seções de resumo (objetivos, conceitos, exemplos, etc.)
- ✅ Múltiplos modelos de IA (Gemini, Claude via OpenRouter)
- ✅ Templates de prompt versionados (semver)
- ✅ Cache de resumos (economia de 60%+)

### 📊 Interface Web

- ✅ Dashboard com histórico de processamentos
- ✅ Visualização de resumos
- ✅ Exportação de relatórios (PDF, JSON)
- ✅ Estatísticas de uso

---

## 🏗️ Arquitetura

```
ExtratorVideosCurso/
├── extrator_videos/           # Core Python
│   ├── url_resolver/          # Resolução de URLs (Task 1)
│   ├── whisper_engine.py      # Transcrição
│   ├── diarization.py         # Diarização (Task 3)
│   ├── summary_cache.py       # Cache de resumos (Task 2)
│   ├── template_versioning.py # Versionamento (Task 4)
│   ├── gemini_client.py       # Cliente Gemini
│   └── openrouter_client.py   # Cliente OpenRouter
├── browser_extension/         # Extensão Chrome
├── web_interface/             # Flask Web App
├── scripts/                   # Scripts utilitários
└── tests/                     # Testes unitários
```

---

## 🚀 Instalação

### Pré-requisitos

- Python 3.9+
- Node.js 16+ (para extensão Chrome)
- FFmpeg (para processamento de áudio)
- Tokens de API:
  - OpenAI (Whisper)
  - Google Gemini
  - Anthropic (opcional, via OpenRouter)
  - HuggingFace (para diarização)

### Passo 1: Clonar Repositório

```bash
git clone https://github.com/seu-usuario/ExtratorVideosCurso.git
cd ExtratorVideosCurso
```

### Passo 2: Criar Ambiente Virtual

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
.\venv\Scripts\Activate.ps1  # Windows
```

### Passo 3: Instalar Dependências

```bash
pip install -r requirements.txt
```

### Passo 4: Configurar Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

Edite `.env`:

```env
# APIs de IA
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
HUGGINGFACE_TOKEN=hf_...

# Configurações
ENABLE_DIARIZATION=true
SUMMARY_CACHE_TTL_DAYS=30
```

### Passo 5: Migrar Templates

```bash
python scripts/migrate_templates.py
```

### Passo 6: Rodar Testes

```bash
pytest tests/ -v
```

---

## 🎬 Uso Rápido

### 1. Capturar Vídeo (Extensão Chrome)

1. Instale a extensão em `browser_extension/`
2. Navegue até a página do vídeo
3. Clique no ícone da extensão
4. Manifest capturado automaticamente

### 2. Processar Vídeo (Python)

```python
from extrator_videos.url_resolver import resolve
from extrator_videos.whisper_engine import transcribe_with_diarization
from extrator_videos.gemini_client import summarize_transcription_full

# 1. Resolver URL
result = resolve(
    "https://hub.la/video/123",
    credentials={"email": "user@test.com", "password": "pass"}
)

# 2. Baixar áudio (usando ffmpeg)
download_url = result.best_source.download_url
# ... baixar áudio ...

# 3. Transcrever com diarização
transcription = transcribe_with_diarization("audio.mp3", num_speakers=2)

# 4. Gerar resumo
summary = summarize_transcription_full(
    transcription,
    template_name="modelo4",
    video_title="Aula 01 - Introdução"
)

print(summary["resumo_executivo"])
```

### 3. Interface Web

```bash
cd web_interface
python app.py
```

Acesse: http://localhost:5000

---

## 📚 Documentação

- [Guia de Uso Detalhado](docs/USAGE.md)
- [Documentação da API](docs/API.md)
- [Guia de Contribuição](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes.

---

## 📄 Licença

Este projeto está licenciado sob a MIT License.

---

## 🙏 Agradecimentos

- [OpenAI](https://openai.com/) (Whisper)
- [Google](https://ai.google.dev/) (Gemini)
- [Anthropic](https://www.anthropic.com/) (Claude)
- [pyannote.audio](https://github.com/pyannote/pyannote-audio) (Diarização)

---

## 📊 Estatísticas do Projeto

- 📁 50+ arquivos de código
- 📝 5000+ linhas de código
- ✅ 230+ testes unitários
- 🎯 Cobertura de testes > 90%
- 🚀 4 tasks principais implementadas
