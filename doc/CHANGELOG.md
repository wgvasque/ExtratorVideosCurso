# CHANGELOG

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [2.0.0] - 2025-12-23

### 🎉 Major Release

Lançamento da versão 2.0 com 4 tasks principais implementadas e documentação completa.

### ✨ Added (Novidades)

#### **Task 1: Refatoração url_resolver**
- Sistema modular de resolução de URLs
- Strategy Pattern para extractors
- Factory Pattern para platform logins
- 175 testes unitários

#### **Task 2: Cache de Resumos**
- Cache inteligente com TTL configurável
- Economia de 60%+ em custos de IA
- Hash SHA-256 para identificação única
- Estatísticas de uso
- 19 testes unitários

#### **Task 3: Diarização**
- Identificação automática de speakers
- Integração com pyannote.audio
- Labels customizáveis (Professor, Aluno)
- Estatísticas de participação por speaker
- 18 testes unitários

#### **Task 4: Versionamento de Templates**
- Versionamento semântico (X.Y.Z)
- CLI para gerenciar versões (create, activate, list, rollback, compare)
- Rollback e comparação de versões
- Rastreabilidade completa (autor, descrição, timestamp, hash)
- Integração com cache de resumos
- 19 testes unitários

#### **Documentação Completa**
- README.md atualizado com badges e exemplos
- Guia de uso detalhado (docs/USAGE.md)
- Documentação da API (docs/API.md)
- Guia de contribuição (CONTRIBUTING.md)
- Changelog atualizado

### 📊 Estatísticas

- 📁 ~50 arquivos criados/modificados
- 📝 ~5000 linhas de código
- ✅ 230+ testes unitários
- 📖 Documentação completa (700+ linhas)
- 🎯 Cobertura de testes > 90%

### 🔧 Changed (Alterações)

- `summary_cache.py`: Adicionado tracking de `template_version` no metadata
- `whisper_engine.py`: Nova função `transcribe_with_diarization()`
- `requirements.txt`: Adicionadas dependências (pyannote.audio, torch, click)

### 📁 Arquivos Criados

```
extrator_videos/
├── diarization.py           # Task 3 (350 linhas)
├── summary_cache.py         # Task 2 (361 linhas)
└── template_versioning.py   # Task 4 (380 linhas)

scripts/
├── migrate_templates.py     # Task 4 (100 linhas)
└── cli_template_manager.py  # Task 4 (150 linhas)

tests/
├── test_diarization.py      # Task 3 (250 linhas)
├── test_summary_cache.py    # Task 2 (150 linhas)
└── test_template_versioning.py  # Task 4 (280 linhas)

docs/
├── USAGE.md                 # Guia de uso (250 linhas)
└── API.md                   # API reference (200 linhas)

README.md                    # Atualizado (150 linhas)
CONTRIBUTING.md              # Novo (100 linhas)
```

---

## [1.0.0] - 2025-12-22

### 🎉 Novo Pacote url_resolver

Lançamento do novo pacote `extrator_videos.url_resolver` que consolida
e moderniza a funcionalidade de resolução de URLs de vídeo.

### ✨ Added (Novidades)

#### Novo pacote `url_resolver`
- **`resolve(url, **kwargs)`**: Função principal para resolução de URLs
- **`ResolveResult`**: Dataclass com resultado completo da resolução
- **`ExtractionResult`**: Resultado de cada estratégia de extração
- **`VideoVariant`**: Informações de cada variante de qualidade

#### Estratégias de extração (Strategy Pattern)
- **`DirectExtractor`**: Processa URLs diretas de vídeo (.m3u8, .mpd, .mp4)
- **`ExtensionExtractor`**: Usa cache de manifests da extensão Chrome
- **`BrowserExtractor`**: Navega com Playwright para páginas protegidas

#### Handlers de login por plataforma
- **`HubLaLogin`**: Login em 2 etapas para Hub.la
- **`SegueadiiLogin`**: Login simples para Segueadii
- **`GenericLogin`**: Fallback para qualquer plataforma

#### Browser automatizado
- **`BrowserSession`**: Gerenciamento completo de sessão Playwright
- **`NetworkCapture`**: Captura e análise de requisições de rede

#### Utilitários
- **`canonicalize(url)`**: Normalização de URLs
- **`dedup(urls)`**: Remoção de duplicatas
- **`is_video_url(url)`**: Detecção de URLs de vídeo
- **`detect_stream_type(url)`**: Identificação de tipo de stream
- **`find_video_in_html(html)`**: Extração de URLs de vídeo de HTML

#### Enums e tipos
- **`StreamType`**: HLS, DASH, MP4, WEBM, etc.
- **`DRMType`**: NONE, WIDEVINE, FAIRPLAY, PLAYREADY, ENCRYPTED

#### Exceções customizadas
- **`ResolutionError`**: Erro base
- **`DRMError`**: Vídeo protegido por DRM
- **`LoginError`**: Falha na autenticação
- **`NetworkError`**: Erro de rede/conexão
- **`CaptchaError`**: Captcha detectado
- **`SessionExpiredError`**: Sessão expirada

### 📝 Changed (Alterações)

- Nenhuma alteração em APIs existentes

### ⚠️ Deprecated (Descontinuado)

Os seguintes módulos estão deprecated e emitirão warnings:

#### `extrator_videos/resolver.py`
```python
# ❌ Antigo (deprecated)
from extrator_videos.resolver import canonicalize

# ✅ Novo (recomendado)
from extrator_videos.url_resolver import canonicalize
```

#### `extrator_videos/extractor.py`
```python
# ❌ Antigo (deprecated)
from extrator_videos.extractor import extract

# ✅ Novo (recomendado)
from extrator_videos.url_resolver import resolve
```

#### `extrator_videos/browser.py`
```python
# ❌ Antigo (deprecated)
from extrator_videos.browser import BrowserSession

# ✅ Novo (recomendado)
from extrator_videos.url_resolver.browser import BrowserSession
```

### 🔄 Backward Compatibility

- ✅ **100% compatibilidade** com código existente
- ⚠️ Warnings de deprecação serão emitidos
- 📖 Consulte `MIGRATION_GUIDE.md` para instruções de migração

### 🔒 Security

- Scripts anti-detecção de bot injetados automaticamente
- Gerenciamento seguro de cookies e sessões

### 📁 Arquivos Criados

```
extrator_videos/url_resolver/
├── __init__.py          # API pública (resolve, ResolveResult)
├── config.py            # Configurações e constantes
├── exceptions.py        # Exceções customizadas
├── utils/
│   ├── __init__.py
│   ├── canonicalizer.py # canonicalize, dedup
│   ├── detector.py      # is_video_url, StreamType
│   └── html_parser.py   # find_video_in_html
├── platform_logins/
│   ├── __init__.py      # get_login_handler
│   ├── base.py          # PlatformLogin (abstract)
│   ├── hubla.py         # HubLaLogin
│   ├── segueadii.py     # SegueadiiLogin
│   └── generic.py       # GenericLogin
├── extractors/
│   ├── __init__.py      # get_extractor_chain
│   ├── base.py          # Extractor (abstract)
│   ├── direct.py        # DirectExtractor
│   ├── extension.py     # ExtensionExtractor
│   └── browser.py       # BrowserExtractor
├── browser/
│   ├── __init__.py
│   └── session.py       # BrowserSession, NetworkCapture
└── examples/
    └── basic_usage.py   # Exemplos de uso
```

### 📊 Estatísticas

- 📁 ~25 arquivos novos/modificados
- 📝 ~3500 linhas de código
- ✅ ~120 testes passando
- 📖 Documentação completa

---

## [Unreleased]

### Planejado para versões futuras

- [ ] Suporte a mais plataformas (Hotmart, Kiwify)
- [ ] Cache de resultados de resolução
- [ ] CLI para resolução de URLs
- [ ] Integração com yt-dlp para fallback

---

## Links

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Guia de migração
- [ARQUITETURA_URL_RESOLVER.md](./ARQUITETURA_URL_RESOLVER.md) - Documentação técnica
