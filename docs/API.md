# 📡 API Reference — ExtratorVideosCurso

Documentação completa da API pública do sistema.

## 📋 Índice

1. [url_resolver](#1-url_resolver)
2. [whisper_engine](#2-whisper_engine)
3. [diarization](#3-diarization)
4. [gemini_client](#4-gemini_client)
5. [summary_cache](#5-summary_cache)
6. [template_versioning](#6-template_versioning)

---

## 1. url_resolver

### `resolve()`

Resolve uma URL para obter informações de vídeo.

**Assinatura:**
```python
def resolve(
    url: str,
    *,
    cookies_path: Optional[str] = None,
    proxy: Optional[str] = None,
    credentials: Optional[Dict[str, str]] = None,
    use_extension_cache: bool = True,
    headless: bool = False,
    timeout: int = 60000
) -> ResolveResult
```

**Parâmetros:**
- `url` (str): URL da página ou vídeo para resolver
- `cookies_path` (str, opcional): Caminho para arquivo JSON de cookies
- `proxy` (str, opcional): URL do proxy
- `credentials` (dict, opcional): Dict com `{"email": "...", "password": "..."}`
- `use_extension_cache` (bool): Se True, verifica manifests capturados
- `headless` (bool): Se True, usa navegador sem interface gráfica
- `timeout` (int): Timeout em ms para operações de navegação

**Retorna:**
- `ResolveResult`: Objeto com informações do vídeo

**Exceções:**
- `ResolutionError`: Erro genérico de resolução
- `DRMError`: Vídeo protegido por DRM
- `LoginError`: Falha na autenticação
- `NetworkError`: Erro de conexão/timeout

**Exemplo:**
```python
from extrator_videos.url_resolver import resolve

result = resolve(
    "https://hub.la/video/123",
    credentials={"email": "user@test.com", "password": "pass"}
)

if result.has_downloadable:
    print(result.best_source.download_url)
```

---

## 2. whisper_engine

### `transcribe_with_diarization()`

Transcreve áudio com identificação de speakers.

**Assinatura:**
```python
def transcribe_with_diarization(
    audio_path: str,
    num_speakers: int = None,
    enable_diarization: bool = True
) -> Dict
```

**Parâmetros:**
- `audio_path` (str): Caminho para arquivo de áudio
- `num_speakers` (int, opcional): Número de speakers (None = auto-detect)
- `enable_diarization` (bool): Se False, retorna transcrição normal

**Retorna:**
- `Dict`: Transcrição com diarização

**Exemplo:**
```python
from extrator_videos.whisper_engine import transcribe_with_diarization

result = transcribe_with_diarization("audio.mp3", num_speakers=2)

for segment in result["segments"]:
    print(f"[{segment['speaker_label']}] {segment['text']}")
```

---

## 3. diarization

### `SpeakerDiarizer`

Classe para identificação de speakers.

#### `__init__(hf_token: str = None)`

Inicializa o diarizer.

**Parâmetros:**
- `hf_token` (str): Token do HuggingFace

#### `diarize(audio_path: str, num_speakers: int = None) -> List[Dict]`

Executa diarização no áudio.

**Retorna:**
- Lista de segmentos com speaker

**Exemplo:**
```python
from extrator_videos.diarization import SpeakerDiarizer

diarizer = SpeakerDiarizer(hf_token="hf_...")
segments = diarizer.diarize("audio.mp3", num_speakers=2)

for seg in segments:
    print(f"{seg['speaker']}: {seg['start']:.2f}s - {seg['end']:.2f}s")
```

---

## 4. gemini_client

### `summarize_transcription_full()`

Gera resumo estruturado com Gemini.

**Assinatura:**
```python
def summarize_transcription_full(
    transcription: Dict,
    template_name: str = "modelo4",
    video_title: str = "",
    duration: int = 0
) -> Dict
```

**Parâmetros:**
- `transcription` (dict): Transcrição do Whisper
- `template_name` (str): Nome do template de prompt
- `video_title` (str): Título do vídeo
- `duration` (int): Duração em segundos

**Retorna:**
- `Dict`: Resumo com 14 seções

**Exemplo:**
```python
from extrator_videos.gemini_client import summarize_transcription_full

summary = summarize_transcription_full(
    transcription,
    template_name="modelo4",
    video_title="Aula 01"
)

print(summary["resumo_executivo"])
```

---

## 5. summary_cache

### `save_summary()`

Salva resumo no cache.

**Assinatura:**
```python
def save_summary(
    transcription_hash: str,
    template_hash: str,
    summary: Dict,
    metadata: Dict = None
) -> str
```

**Retorna:**
- `str`: Caminho do arquivo salvo

### `get_cached_summary()`

Busca resumo no cache.

**Assinatura:**
```python
def get_cached_summary(
    transcription_hash: str,
    template_hash: str
) -> Optional[Dict]
```

**Retorna:**
- `Dict` ou `None`: Resumo cacheado ou None se não encontrado

---

## 6. template_versioning

### `TemplateVersionManager`

Gerencia versionamento de templates.

#### `create_version()`

Cria nova versão de template.

**Assinatura:**
```python
def create_version(
    template_name: str,
    content: str,
    version: str,
    author: str,
    description: str,
    breaking_changes: bool = False
) -> TemplateVersion
```

**Exemplo:**
```python
from extrator_videos.template_versioning import TemplateVersionManager

manager = TemplateVersionManager()
version = manager.create_version(
    "modelo4",
    "Novo prompt...",
    "1.1.0",
    "Wellington",
    "Melhorias"
)
```

#### `activate_version()`

Ativa uma versão específica.

**Assinatura:**
```python
def activate_version(template_name: str, version: str) -> bool
```

#### `get_active_version()`

Retorna versão ativa.

**Assinatura:**
```python
def get_active_version(template_name: str) -> Optional[str]
```

#### `rollback()`

Faz rollback para versão anterior.

**Assinatura:**
```python
def rollback(template_name: str, target_version: str) -> bool
```
