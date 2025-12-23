# 📖 Guia de Uso — ExtratorVideosCurso

Este guia cobre todos os casos de uso do sistema.

## 📋 Índice

1. [Instalação Detalhada](#1-instalação-detalhada)
2. [Configuração](#2-configuração)
3. [Captura de Vídeos](#3-captura-de-vídeos)
4. [Transcrição](#4-transcrição)
5. [Diarização](#5-diarização)
6. [Geração de Resumo](#6-geração-de-resumo)
7. [Cache](#7-cache)
8. [Versionamento de Templates](#8-versionamento-de-templates)
9. [Interface Web](#9-interface-web)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Instalação Detalhada

### 1.1 Instalar FFmpeg

**Windows:**
```powershell
choco install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

**Mac:**
```bash
brew install ffmpeg
```

### 1.2 Instalar Dependências Python

```bash
pip install -r requirements.txt
```

Se houver erro com `pyannote.audio`, instale torch primeiro:

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install pyannote.audio
```

---

## 2. Configuração

### 2.1 Obter Tokens de API

**OpenAI (Whisper):**
1. Acesse https://platform.openai.com/api-keys
2. Crie nova chave
3. Copie para `.env`: `OPENAI_API_KEY=sk-...`

**Google Gemini:**
1. Acesse https://makersuite.google.com/app/apikey
2. Crie API key
3. Copie para `.env`: `GEMINI_API_KEY=...`

**HuggingFace (Diarização):**
1. Acesse https://huggingface.co/settings/tokens
2. Crie token com permissão de leitura
3. Copie para `.env`: `HUGGINGFACE_TOKEN=hf_...`
4. Aceite termos: https://huggingface.co/pyannote/speaker-diarization-3.1

### 2.2 Configurar .env

```env
# APIs
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...  # Opcional
HUGGINGFACE_TOKEN=hf_...

# Diarização
ENABLE_DIARIZATION=true
SPEAKER_00_LABEL=Professor
SPEAKER_01_LABEL=Aluno

# Cache
SUMMARY_CACHE_TTL_DAYS=30
TRANSCRIPTION_CACHE_TTL_DAYS=90

# Templates
DEFAULT_TEMPLATE=modelo4
```

---

## 3. Captura de Vídeos

### 3.1 Instalar Extensão Chrome

1. Abra Chrome
2. Vá para `chrome://extensions/`
3. Ative "Modo do desenvolvedor"
4. Clique em "Carregar sem compactação"
5. Selecione pasta `browser_extension/`

### 3.2 Capturar Manifest

1. Navegue até página do vídeo
2. Clique no ícone da extensão
3. Manifest será capturado automaticamente
4. Arquivo salvo em `captured_manifests.json`

### 3.3 Usar URL Diretamente (Python)

```python
from extrator_videos.url_resolver import resolve

# URL direta de vídeo
result = resolve("https://cdn.example.com/video.m3u8")
print(result.best_source.download_url)

# Página com login
result = resolve(
    "https://hub.la/video/123",
    credentials={
        "email": "user@example.com",
        "password": "senha123"
    },
    headless=False  # Modo visual para Hub.la
)
```

---

## 4. Transcrição

### 4.1 Transcrição Básica

```python
from extrator_videos.whisper_engine import transcribe_audio

transcription = transcribe_audio("audio.mp3", language="pt")
print(transcription["segments"])
```

### 4.2 Transcrição com Cache

```python
from extrator_videos.transcription_cache import get_cached_transcription, save_transcription

# Verificar cache
cached = get_cached_transcription("audio.mp3")
if cached:
    print("Cache HIT!")
    transcription = cached
else:
    print("Cache MISS - transcrevendo...")
    transcription = transcribe_audio("audio.mp3")
    save_transcription("audio.mp3", transcription)
```

---

## 5. Diarização

### 5.1 Transcrição com Diarização

```python
from extrator_videos.whisper_engine import transcribe_with_diarization

# Transcrever com identificação de speakers
result = transcribe_with_diarization(
    "audio.mp3",
    num_speakers=2,  # Opcional: forçar número de speakers
    enable_diarization=True
)

# Resultado inclui speaker em cada segmento
for segment in result["segments"]:
    speaker = segment["speaker_label"]
    text = segment["text"]
    print(f"[{speaker}] {text}")
```

### 5.2 Estatísticas de Speakers

```python
stats = result["diarization_info"]["speaker_stats"]

for speaker, info in stats.items():
    print(f"{info['label']}: {info['percentage']:.1f}% do tempo")
```

---

## 6. Geração de Resumo

### 6.1 Resumo com Gemini

```python
from extrator_videos.gemini_client import summarize_transcription_full

summary = summarize_transcription_full(
    transcription,
    template_name="modelo4",
    video_title="Aula 01 - Introdução",
    duration=3600
)

# Acessar seções
print(summary["resumo_executivo"])
print(summary["objetivos_aprendizagem"])
print(summary["conceitos_fundamentais"])
```

### 6.2 Resumo com OpenRouter (Claude)

```python
from extrator_videos.openrouter_client import summarize_with_openrouter

summary = summarize_with_openrouter(
    transcription,
    template_name="modelo4",
    model="anthropic/claude-3.5-sonnet"
)
```

### 6.3 Cache de Resumos

O cache é automático. Para forçar regeneração:

```python
from extrator_videos.summary_cache import invalidate_summary, compute_hash

t_hash = compute_hash(transcription["text"])
p_hash = compute_hash(template_content)

invalidate_summary(t_hash, p_hash)
```

---

## 7. Cache

### 7.1 Estatísticas de Cache

```python
from extrator_videos.summary_cache import get_cache_stats

stats = get_cache_stats()
print(f"Total de resumos: {stats['total_summaries']}")
print(f"Tamanho: {stats['total_size_mb']:.2f} MB")
```

### 7.2 Limpar Cache Antigo

```python
from extrator_videos.summary_cache import clean_expired_summaries

removed = clean_expired_summaries(max_age_days=30)
print(f"Removidos {removed} resumos expirados")
```

---

## 8. Versionamento de Templates

### 8.1 Listar Versões

```bash
python scripts/cli_template_manager.py list modelo4
```

### 8.2 Criar Nova Versão

```bash
python scripts/cli_template_manager.py create modelo4 \
  --version 1.1.0 \
  --author "Wellington" \
  --description "Adicionado contexto sobre diarização" \
  --file prompts/novo_prompt.txt
```

### 8.3 Ativar Versão

```bash
python scripts/cli_template_manager.py activate modelo4 1.1.0
```

### 8.4 Comparar Versões

```bash
python scripts/cli_template_manager.py compare modelo4 1.0.0 1.1.0
```

### 8.5 Rollback

```bash
python scripts/cli_template_manager.py rollback modelo4 1.0.0
```

---

## 9. Interface Web

### 9.1 Iniciar Servidor

```bash
cd web_interface
python app.py
```

### 9.2 Acessar Dashboard

Abra navegador em: http://localhost:5000

### 9.3 Processar Vídeo via Web

1. Cole URL do vídeo
2. Preencha credenciais (se necessário)
3. Clique em "Processar"
4. Aguarde conclusão
5. Visualize resumo

---

## 10. Troubleshooting

### Erro: "HUGGINGFACE_TOKEN não configurado"

**Solução:**
1. Obtenha token em https://huggingface.co/settings/tokens
2. Adicione ao `.env`: `HUGGINGFACE_TOKEN=hf_...`
3. Aceite termos: https://huggingface.co/pyannote/speaker-diarization-3.1

### Erro: "FFmpeg not found"

**Solução:** Instale FFmpeg:
- Windows: `choco install ffmpeg`
- Linux: `sudo apt install ffmpeg`
- Mac: `brew install ffmpeg`

### Erro: "DRM detectado"

**Solução:** Vídeo protegido por DRM não pode ser baixado. Use outro método de captura.

### Cache não está funcionando

**Solução:**
1. Verifique se diretório `sumarios_cache/` existe
2. Verifique permissões de escrita
3. Verifique logs: `tail -f logs/app.log`
