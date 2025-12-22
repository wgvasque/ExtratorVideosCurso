# PRODUCT REQUIREMENTS PROMPT (PRP)

## Sistema de Processamento Automatizado de Vídeos Educacionais

**Versão:** 2.0  
**Data:** 22/12/2025  
**Autor:** WELLINGTON  
**Status:** Documento Completo e Atualizado  
**Descrição:** PRP abrangente, multiplataforma e independente de tecnologia para desenvolvimento, evolução e manutenção de sistema completo de captura, processamento, transcrição e resumo de vídeos educacionais.

---

## SUMÁRIO

1. [Contexto do Produto](#1-contexto-do-produto)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Objetivos do Produto](#3-objetivos-do-produto)
4. [Requisitos Funcionais (RF-01 a RF-15)](#4-requisitos-funcionais-rf)
5. [Requisitos Não Funcionais (RNF-01 a RNF-08)](#5-requisitos-não-funcionais-rnf)
6. [Procedimento de Execução (9 Etapas)](#6-procedimento-de-execução-fluxo-completo)
7. [Tecnologias Implementadas](#7-tecnologias-implementadas)
8. [Possíveis Desafios e Soluções (10 Cenários)](#8-possíveis-desafios-e-soluções)
9. [Critérios de Sucesso](#9-critérios-de-sucesso)
10. [Documentação Relacionada](#10-documentação-relacionada)
11. [Prompt Base Universal](#11-prompt-base-universal)

---

## 1. CONTEXTO DO PRODUTO

### 1.1 Identificação do Produto

**Nome:** Video Processor Pro  
**Nome Técnico:** ExtratorVideosCurso  
**Tipo:** Ferramenta híbrida (Extensão Chrome + Backend Python + Interface Web)  
**Propósito Fundamental:** Automatizar e padronizar a captura, transcrição e geração de resumos profissionais de vídeos de cursos online usando inteligência artificial.

### 1.2 Problema Central

Estudantes e profissionais que consomem cursos online enfrentam dificuldades significativas em:
- Revisar conteúdo de vídeos longos
- Extrair conhecimento estruturado
- Organizar informações de múltiplas plataformas
- Produzir documentação consistente

O processo manual é lento, inconsistente, suscetível a erros e inviável em grande escala.

### 1.3 Usuários-Alvo

- **Estudantes:** Consomem cursos em múltiplas plataformas educacionais
- **Profissionais:** Realizam formação continuada e precisam de documentação
- **Pesquisadores:** Analisam conteúdo educacional em volume
- **Equipes de Análise:** Processam materiais educacionais sistematicamente
- **Criadores de Conteúdo:** Necessitam documentar e revisar materiais
- **Usuários Gerais:** Desejam automação e documentação estruturada

### 1.4 Situação Atual (As-Is)

- Usuários assistem vídeos manualmente
- Anotações são fragmentadas e desestruturadas
- Não existe automação para capturar conteúdo multimídia
- Revisão exige reassistir vídeos completos
- Conhecimento fica disperso e não reutilizável
- Cada plataforma exige processo diferente

### 1.5 Oportunidade (To-Be)

Criar sistema completo que:
- Capture automaticamente vídeos de qualquer plataforma
- Processe conteúdo de forma padronizada
- Transcreva com precisão usando Whisper
- Gere resumos estruturados via Gemini/OpenRouter
- Produza documentação profissional e navegável
- Permita produtividade, revisão rápida e aprofundamento
- Garanta rastreabilidade completa

### 1.6 Entradas do Sistema

- URLs ou apontadores para vídeos educacionais
- Manifests de streaming (HLS, DASH, MP4, YouTube)
- Dados capturados automaticamente pela extensão Chrome
- Configurações e preferências do usuário
- Templates de prompt (modelo2, modelo4/P.R.O.M.P.T., etc.)
- Credenciais para acesso autorizado (Hub.la, Hotmart, Kiwify)
- Identificadores de processamento anterior (para cache)

### 1.7 Saídas do Sistema

- Transcrições completas com timestamps (cache em `sumarios_cache/`)
- Relatórios HTML estruturados (Solar Pop Edition)
- Resumos JSON em 14 seções (modelo P.R.O.M.P.T.)
- Visualizações navegáveis e responsivas
- Histórico organizado por domínio/videoId (`sumarios/{domain}/{id}/`)
- Logs estruturados em JSON
- Métricas de processamento (tempo por etapa)

### 1.8 Restrições Conceituais

- Respeitar proteções de direitos autorais (DRM)
- Proibição absoluta de descodificação de conteúdos protegidos
- Armazenamento privado e seguro de credenciais
- Modularidade e portabilidade entre ambientes
- Neutralidade tecnológica (sem dependência de tecnologia específica)
- Escalabilidade sem reestruturação completa
- Conformidade com regulamentações de privacidade

---

## 2. ARQUITETURA DO SISTEMA

### 2.1 Componentes Principais

```
┌─────────────────────────────────────────────────────────────────┐
│                    VIDEO PROCESSOR PRO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ BROWSER EXTENSION │    │  WEB INTERFACE   │                   │
│  │   (Chrome v3)     │◄──►│   (Flask/HTML)   │                   │
│  │                   │    │                   │                   │
│  │ • Captura automát.│    │ • Solar Pop UI    │                   │
│  │ • Detect manifests│    │ • Fila de process.│                   │
│  │ • Overlay/Popup   │    │ • Biblioteca      │                   │
│  │ • 4 Abas UI       │    │ • Configurações   │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                        │                             │
│           └────────────┬───────────┘                             │
│                        ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              CORE PYTHON (extrator_videos/)                 ││
│  │                                                             ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         ││
│  │  │  Download   │  │ Transcrição │  │   Resumo    │         ││
│  │  │ FFmpeg/ytdlp│  │   Whisper   │  │ Gemini/OR   │         ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘         ││
│  │                                                             ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         ││
│  │  │   Cache     │  │   Prompts   │  │  Relatórios │         ││
│  │  │ sumarios_c/ │  │ modelos_pr/ │  │  sumarios/  │         ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Estrutura de Diretórios

| Diretório | Descrição |
|-----------|-----------|
| `browser_extension/` | Extensão Chrome (Manifest v3) |
| `extrator_videos/` | Core Python (35+ módulos) |
| `web_interface/` | Servidor Flask + UI Solar Pop |
| `modelos_prompts/` | Templates de prompt (modelo2, modelo4, etc.) |
| `design-system/` | Documentação visual (8 documentos) |
| `sumarios/` | Relatórios gerados (`{domain}/{videoId}/`) |
| `sumarios_cache/` | Cache de transcrições |
| `resolve_cache/` | Cache de resoluções de URL |
| `doc/` | Documentação técnica |

### 2.3 Plataformas Suportadas

| Plataforma | Tipo | Método |
|------------|------|--------|
| **YouTube** | Público | yt-dlp |
| **Vimeo** | Público | yt-dlp |
| **Cloudflare Stream** | Privado | Manifest HLS + Token |
| **Hub.la** | Privado | Autenticação + HLS |
| **Hotmart** | Privado | Autenticação + HLS |
| **Kiwify** | Privado | Autenticação + HLS |
| **MP4/HLS Direto** | Variado | FFmpeg |

---

## 3. OBJETIVOS DO PRODUTO

### 3.1 Objetivos Primários

- Automatizar 95% do processo de captura, transcrição e sumarização de vídeos educacionais
- Reduzir tempo de documentação de horas para minutos
- Garantir estrutura padronizada e reprodutível em 100% dos processamentos
- Permitir uso contínuo sem perda de qualidade ou consistência
- Possibilitar três modos de operação: manual, semiautomático e batch
- Organizar resultados de forma consultável, durável e reutilizável

### 3.2 Objetivos de Qualidade

- Garantir precisão de transcrição acima de 90% em áudio de boa qualidade
- Manter consistência de estrutura independente da fonte
- Assegurar rastreabilidade completa de cada processamento
- Aplicar validações rigorosas em todas as etapas
- Produzir resumos coerentes com a transcrição original

### 3.3 Objetivos de Experiência do Usuário

- Interface clara, direta e acessível sem necessidade de treinamento
- Feedback visual em tempo real de cada etapa
- Mensagens de erro compreensíveis e acionáveis
- Resultados acessíveis rapidamente sem navegação complexa
- Documentação contextual e integrada à interface

### 3.4 Objetivos de Eficiência

- Evitar repetição através de cache inteligente
- Minimizar custos de processamento através de fallback Gemini/OpenRouter
- Otimizar geração de resumos através de prompts refinados (P.R.O.M.P.T.)
- Permitir escalabilidade sem reestruturação
- Reduzir consumo de recursos através de validações prévias

---

## 4. REQUISITOS FUNCIONAIS (RF)

### RF-01: Captura Automatizada de Streams

**Descrição:** O sistema deve capturar automaticamente informações de streaming de vídeo enquanto o usuário navega em plataformas educacionais.

**Implementação Atual:**
- Extensão Chrome (Manifest v3) com Service Worker
- Interceptação via `chrome.webRequest.onBeforeRequest`
- Detecção de padrões: `.m3u8`, `.mpd`, `/manifest/`, Cloudflare, YouTube, Vimeo
- Armazenamento em `chrome.storage.local`

**Funcionalidades Específicas:**
- Detectar e interceptar requisições de rede relacionadas a vídeo
- Identificar manifests de streaming (HLS, DASH, progressivo)
- Extrair metadados da página (título, duração, instrutor, descrição)
- Registrar histórico de capturas com timestamp e origem
- Exibir indicador visual quando captura estiver ativa
- Permitir envio manual ou automático para processamento
- Armazenar capturas localmente para uso posterior
- Evitar duplicatas recentes no histórico

**Critérios de Aceitação:**
- Captura funciona em 90%+ das plataformas testadas
- Indicador visual aparece em menos de 2 segundos
- Metadados extraídos incluem no mínimo: título, URL, timestamp, duração
- Histórico mantém no mínimo 500 capturas

---

### RF-02: Interface de Gerenciamento

**Descrição:** O sistema deve fornecer interface visual para gerenciar capturas, iniciar processamentos e visualizar resultados.

**Implementação Atual:**
- Interface Web Flask (`index_v2.html`) - Design Solar Pop Edition
- Extensão Popup com 4 abas: Captura, Manifests, Biblioteca, Config
- WebSocket (Socket.IO) para progresso em tempo real

**Funcionalidades Específicas:**
- Exibir lista de vídeos capturados com preview de informações
- Permitir iniciar processamento individual ou em lote
- Mostrar progresso em tempo real com estimativa de conclusão
- Exibir histórico de processamentos anteriores com status
- Permitir reprocessamento com configurações diferentes
- Fornecer acesso rápido a relatórios gerados
- Permitir configuração de parâmetros de processamento
- Exibir estatísticas de uso (tempo, quantidade, sucesso/falha)
- Permitir busca e filtro no histórico

**Critérios de Aceitação:**
- Interface carrega em menos de 3 segundos
- Progresso atualiza a cada 5 segundos ou menos
- Histórico mantém no mínimo 100 processamentos
- Responsivo em desktop e mobile
- Navegação intuitiva sem documentação

---

### RF-03: Resolução e Validação de Fontes

**Descrição:** O sistema deve resolver URLs, validar acessibilidade e identificar possíveis bloqueios antes do processamento.

**Implementação Atual:**
- `resolver.py` + `resolve_cache.py`
- Playwright para navegação automatizada
- Detecção de DRM via `drm.py`

**Funcionalidades Específicas:**
- Resolver URLs de vídeo para endereços diretos de streaming
- Detectar proteções DRM e abortar com mensagem clara
- Validar credenciais quando necessário
- Identificar tipo de streaming (HLS, DASH, progressivo, etc)
- Cachear resoluções bem-sucedidas para reutilização
- Aplicar navegação automatizada quando necessário
- Extrair metadados adicionais da página fonte
- Validar acessibilidade antes de iniciar download
- Registrar tipo de streaming identificado

**Critérios de Aceitação:**
- Resolução completa em menos de 30 segundos
- Detecção de DRM com 100% de precisão (zero falsos negativos)
- Cache reduz tempo de resolução em 80%+ para URLs repetidas
- Mensagem de DRM clara e compreensível

---

### RF-04: Aquisição de Conteúdo de Vídeo

**Descrição:** O sistema deve baixar vídeos de diferentes fontes, adaptando-se ao tipo de streaming detectado.

**Implementação Atual:**
- `youtube_downloader.py` (yt-dlp para YouTube/Vimeo)
- `hls_downloader.py` (FFmpeg para HLS)
- `downloader.py` (download genérico)

**Funcionalidades Específicas:**
- Baixar streams HLS (segmentados)
- Baixar streams DASH (adaptativo)
- Baixar vídeos diretos (MP4, WebM, etc)
- Baixar de plataformas públicas (YouTube, Vimeo, etc) via yt-dlp
- Validar integridade do arquivo baixado
- Exibir progresso de download em tempo real
- Aplicar retry automático em caso de falha parcial
- Limpar arquivos temporários após processamento
- Suportar retomada de downloads interrompidos

**Critérios de Aceitação:**
- Download completa sem corrupção em 95%+ dos casos
- Progresso exibido com precisão de ±5%
- Arquivos temporários removidos automaticamente
- Retry automático resolve 70%+ de falhas temporárias
- Suporta vídeos de até 4 horas sem falha

---

### RF-05: Extração de Áudio

**Descrição:** O sistema deve extrair faixa de áudio do vídeo baixado, otimizando para processamento posterior.

**Implementação Atual:**
- FFmpeg para extração de áudio
- Formato WAV ou MP3 otimizado para Whisper

**Funcionalidades Específicas:**
- Extrair áudio em formato adequado para transcrição
- Normalizar qualidade de áudio quando necessário
- Detectar e remover silêncios longos (opcional)
- Validar integridade do áudio extraído
- Preservar sincronização temporal
- Otimizar taxa de amostragem para melhor custo/benefício
- Detectar qualidade de áudio e alertar usuário
- Aplicar pré-processamento para melhorar transcrição

**Critérios de Aceitação:**
- Extração completa sem perda de conteúdo falado
- Arquivo de áudio 70-90% menor que vídeo original
- Qualidade suficiente para transcrição precisa
- Sincronização preservada com precisão de ±100ms

---

### RF-06: Transcrição de Áudio

**Descrição:** O sistema deve converter áudio em texto estruturado com timestamps.

**Implementação Atual:**
- **Whisper** (OpenAI) via `whisper_engine.py`
- Modelos disponíveis: `small` (500MB), `medium` (1.5GB), `large-v3` (3GB)
- Dispositivos: CPU ou CUDA (GPU)
- Cache em `sumarios_cache/`

**Funcionalidades Específicas:**
- Processar áudio através de Whisper
- Gerar transcrição com marcadores temporais
- Identificar mudanças de falante quando possível
- Detectar idioma automaticamente
- Aplicar pontuação e formatação básica
- Gerar confiança/score de qualidade da transcrição
- Cachear transcrições para evitar reprocessamento
- Permitir escolha de modelo (small/medium/large-v3)
- Validar completude da transcrição

**Critérios de Aceitação:**
- Precisão superior a 90% em áudio de boa qualidade
- Timestamps com precisão de ±2 segundos
- Cache evita 100% de reprocessamentos desnecessários
- Score de confiança acima de 80% em 90%+ dos casos
- Suporta múltiplos idiomas automaticamente

---

### RF-07: Geração de Resumo Estruturado

**Descrição:** O sistema deve processar transcrição através de modelo de IA para gerar resumo estruturado em múltiplas seções.

**Implementação Atual:**
- **Gemini** (`gemini_client.py`) - Provedor primário
- **OpenRouter** (`openrouter_client.py`) - Fallback automático
- Templates em `modelos_prompts/` (modelo2, modelo4/P.R.O.M.P.T., etc.)
- Validação via `prompt_validator.py`

**Seções do Resumo (Modelo P.R.O.M.P.T. - 14 seções):**
1. Resumo Executivo
2. Objetivos de Aprendizagem
3. Conceitos Fundamentais
4. Estrutura Central
5. Exemplos
6. Ferramentas e Métodos
7. Orientações Práticas
8. Abordagem Pedagógica
9. Ideias-Chave
10. Pontos de Memorização
11. Citações Marcantes
12. Próximos Passos
13. Preparação Próxima Aula
14. Materiais de Apoio

**Funcionalidades Específicas:**
- Carregar template de prompt configurável
- Validar estrutura do template antes do envio
- Substituir variáveis dinamicamente (título, duração, etc)
- Enviar transcrição + metadados para modelo de IA
- Aplicar fallback automático Gemini → OpenRouter
- Extrair resumo estruturado em formato JSON padronizado
- Validar completude das seções obrigatórias
- Registrar modelo utilizado e parâmetros aplicados
- Otimizar prompt para reduzir tokens/custos
- Dividir transcrições longas em chunks quando necessário

**Critérios de Aceitação:**
- Resumo gerado contém todas as seções definidas no template
- Fallback ativa automaticamente em menos de 10 segundos
- Estrutura JSON válida em 100% dos casos
- Seções obrigatórias preenchidas em 100% dos processamentos
- Coerência entre resumo e transcrição original

---

### RF-08: Renderização de Relatórios

**Descrição:** O sistema deve transformar dados estruturados em relatórios visuais navegáveis.

**Implementação Atual:**
- `report_renderer.py` (62KB)
- `templates.js` para renderização client-side
- Design System Solar Pop Edition
- Output em `sumarios/{domain}/{videoId}/`

**Funcionalidades Específicas:**
- Renderizar relatório em HTML responsivo (Solar Pop Edition)
- Incluir seções colapsáveis/expansíveis
- Exibir metadados do vídeo (título, duração, data, IA usada)
- Mostrar todas as seções do resumo estruturado
- Incluir transcrição completa com timestamps
- Permitir reprocessamento direto do relatório
- Funcionar offline após geração
- Gerar versão JSON estruturada em paralelo
- Aplicar formatação consistente e profissional

**Critérios de Aceitação:**
- Relatório renderiza em menos de 2 segundos
- Funciona em navegadores modernos sem dependências externas
- Responsivo em desktop e mobile
- Navegação por seções funcional
- Exportação mantém formatação e estrutura

---

### RF-09: Sistema de Cache Inteligente

**Descrição:** O sistema deve cachear resultados intermediários para evitar reprocessamento desnecessário.

**Implementação Atual:**
- `sumarios_cache/` - Cache de transcrições
- `resolve_cache/` - Cache de resoluções de URL
- `transcription_cache.py` - Gerenciador de cache

**Funcionalidades Específicas:**
- Cachear resoluções de URL
- Cachear transcrições completas
- Identificar conteúdo através de hash ou identificador único
- Validar validade do cache antes de reutilizar
- Permitir invalidação manual de cache
- Exibir indicador quando resultado vier de cache
- Limpar cache antigo automaticamente (configurável)
- Manter índice de cache para acesso rápido
- Suportar cache em múltiplos níveis (URL, transcrição, resumo)

**Critérios de Aceitação:**
- Cache reduz tempo total em 60%+ para conteúdo repetido
- Identificação de cache hit em menos de 1 segundo
- Zero falsos positivos em identificação de cache
- Limpeza automática não remove cache válido
- Indicador de cache visível ao usuário

---

### RF-10: Processamento em Lote

**Descrição:** O sistema deve processar múltiplos vídeos sequencialmente sem intervenção manual.

**Implementação Atual:**
- `batch_cli.py` (51KB) - CLI para batch
- Interface web com fila de processamento
- `targets.txt` para lista de URLs

**Funcionalidades Específicas:**
- Aceitar lista de URLs ou identificadores
- Processar sequencialmente respeitando ordem
- Continuar processamento mesmo após falhas individuais
- Gerar relatório consolidado de batch
- Exibir progresso geral e individual
- Permitir pausar/retomar processamento
- Registrar estatísticas de sucesso/falha
- Permitir configuração de limites de tempo/recursos
- Gerar sumário executivo do batch

**Critérios de Aceitação:**
- Processa 10+ vídeos consecutivos sem travar
- Falha em um vídeo não interrompe o batch
- Relatório consolidado gerado automaticamente
- Progresso atualiza em tempo real
- Pausar/retomar funciona sem perda de dados

---

### RF-11: Autenticação em Plataformas

**Descrição:** O sistema deve autenticar em plataformas que exigem login para acessar vídeos.

**Implementação Atual:**
- `auth.py` + `credential_manager.py`
- `accounts.json` para armazenamento de credenciais
- Playwright para navegação automatizada com login
- Suporte: Hub.la, Hotmart, Kiwify, etc.

**Funcionalidades Específicas:**
- Armazenar credenciais de forma segura
- Aplicar autenticação automaticamente quando necessário
- Suportar múltiplas plataformas com credenciais diferentes
- Detectar falha de autenticação e notificar usuário
- Manter sessão ativa durante processamento
- Permitir configuração manual de credenciais
- Validar credenciais antes de iniciar processamento
- Detectar expiração de sessão automaticamente
- Renovar autenticação de forma transparente

**Critérios de Aceitação:**
- Autenticação bem-sucedida em 95%+ dos casos com credenciais válidas
- Credenciais nunca expostas em logs ou interface
- Falha de autenticação detectada em menos de 15 segundos
- Renovação de sessão transparente para usuário
- Suporta múltiplas plataformas simultâneas

---

### RF-12: Sistema de Templates de Prompt

**Descrição:** O sistema deve permitir configuração flexível de templates para geração de resumos.

**Implementação Atual:**
- Diretório `modelos_prompts/`
- `prompt_loader.py` + `prompt_manager.py` + `prompt_validator.py`
- Templates em Markdown: modelo2.md, modelo4.md (P.R.O.M.P.T.), etc.

**Templates Disponíveis:**
| Template | Descrição | Seções |
|----------|-----------|--------|
| `modelo2` | Padrão (notas de estudo) | ~8 seções |
| `modelo4` | **P.R.O.M.P.T.** Premium | 14 seções |
| `modelo5` | Experimental | Variável |

**Funcionalidades Específicas:**
- Carregar templates de diretório configurável
- Validar estrutura e variáveis do template
- Substituir variáveis dinamicamente (título, duração, etc)
- Permitir múltiplos templates para diferentes propósitos
- Exibir preview do prompt antes do envio
- Permitir edição de templates via interface (Editor de Prompts)
- Versionar templates automaticamente
- Permitir rollback para versões anteriores
- Manter biblioteca de templates testados

**Critérios de Aceitação:**
- Templates carregam sem erros de sintaxe
- Variáveis substituídas corretamente em 100% dos casos
- Validação detecta templates inválidos antes do uso
- Preview exato do que será enviado
- Versionamento automático sem perda de histórico

---

### RF-13: Organização e Armazenamento

**Descrição:** O sistema deve organizar resultados de forma estruturada e recuperável.

**Implementação Atual:**
- Estrutura: `sumarios/{domain}/{videoId}/`
- Arquivos: `resumo_{videoId}.html` + `resumo_{videoId}.json`
- Índice navegável na interface web

**Funcionalidades Específicas:**
- Organizar por domínio de origem e identificador único
- Armazenar múltiplos formatos (HTML, JSON)
- Manter histórico completo de processamentos
- Permitir busca por metadados
- Gerar índice navegável automaticamente
- Preservar integridade referencial entre arquivos
- Aplicar nomenclatura consistente
- Suportar organização por tags ou categorias
- Permitir exportação em lote

**Critérios de Aceitação:**
- Estrutura de diretórios consistente em 100% dos casos
- Busca retorna resultados em menos de 3 segundos
- Zero conflitos de nomenclatura
- Índice atualizado automaticamente
- Exportação mantém estrutura original

---

### RF-14: Logging e Rastreabilidade

**Descrição:** O sistema deve registrar todas as operações para auditoria e debugging.

**Implementação Atual:**
- `logger_json.py` - Logger estruturado
- `processing.log` - Log global
- `logs/` - Diretório de logs

**Funcionalidades Específicas:**
- Registrar cada etapa do processamento com timestamp
- Incluir parâmetros utilizados em cada operação
- Registrar erros com stack trace completo
- Gerar identificador único para cada processamento
- Permitir filtrar logs por nível de severidade
- Exportar logs em formato estruturado JSON
- Rotacionar logs automaticamente
- Manter histórico de logs por período configurável
- Permitir busca em logs históricos

**Critérios de Aceitação:**
- Logs permitem reconstruir processamento completo
- Erros incluem contexto suficiente para debugging
- Logs estruturados parseáveis automaticamente
- Retenção de logs configurável
- Busca em logs funciona em menos de 5 segundos

---

### RF-15: Tratamento de Erros e Recuperação

**Descrição:** O sistema deve lidar com falhas de forma graceful e informativa.

**Implementação Atual:**
- Fallback Gemini → OpenRouter automático
- Retry com backoff exponencial
- Mensagens de erro amigáveis via toast

**Funcionalidades Específicas:**
- Detectar erros em cada etapa do fluxo
- Exibir mensagens claras e acionáveis
- Sugerir soluções quando possível
- Aplicar retry automático em falhas temporárias
- Preservar estado parcial para recuperação
- Notificar usuário de falhas críticas
- Registrar contexto completo de falhas
- Permitir retomar de onde parou
- Implementar escalada de erros (retry → fallback → abort)

**Critérios de Aceitação:**
- Mensagens de erro compreensíveis por não-técnicos
- Retry automático resolve 70%+ de falhas temporárias
- Estado preservado permite retomar de onde parou
- Sugestões de solução relevantes em 80%+ dos erros
- Zero perda de dados após falha

---

## 5. REQUISITOS NÃO FUNCIONAIS (RNF)

### RNF-01: Desempenho

**Requisitos de Tempo:**
- Resolução de URL: máximo 30 segundos
- Download de vídeo: velocidade limitada apenas por conexão (com progresso)
- Transcrição: máximo 2x duração do vídeo
- Geração de resumo: máximo 60 segundos
- Renderização de relatório: máximo 2 segundos
- Interface responsiva: interações em menos de 200ms
- Cache hit: menos de 1 segundo
- Busca: menos de 3 segundos

**Requisitos de Throughput:**
- Suportar múltiplos downloads simultâneos
- Processar transcrições em paralelo quando possível
- Renderizar relatórios sem bloquear interface

---

### RNF-02: Escalabilidade

**Capacidade de Dados:**
- Suportar 10.000+ transcrições armazenadas
- Processar vídeos de até 4 horas sem falha
- Batch de até 100 vídeos consecutivos
- Cache suportando 1GB+ de dados
- Interface mantém performance com 500+ itens no histórico

**Capacidade de Usuários:**
- Múltiplos usuários operando simultaneamente
- Sem degradação de performance com crescimento

**Escalabilidade Horizontal:**
- Arquitetura permite distribuição de carga
- Sem dependência de servidor único

---

### RNF-03: Confiabilidade

**Taxa de Sucesso:**
- Taxa de sucesso superior a 90% em vídeos acessíveis
- Cache com 99.9% de precisão (zero falsos positivos)
- Detecção de DRM com 100% de precisão

**Integridade de Dados:**
- Integridade de dados garantida em 100% dos casos
- Zero corrupção de arquivos
- Sincronização preservada

**Recuperabilidade:**
- Sistema recuperável após falha sem perda de dados
- Estado parcial preservado para retomada
- Backup automático de dados críticos

---

### RNF-04: Segurança

**Proteção de Credenciais:**
- Credenciais armazenadas em arquivos separados (accounts.json)
- Credenciais nunca expostas em logs ou interface
- Acesso a credenciais limitado a contexto necessário

**Validação de Entrada:**
- Sanitização de todas as entradas de usuário
- Validação de URLs antes de processamento
- Validação de templates antes do uso

**Isolamento de Processos:**
- Isolamento de processos de navegação automatizada
- Sem execução de código arbitrário de fontes externas
- Sandbox para processamento de conteúdo externo

---

### RNF-05: Usabilidade

**Interface:**
- Interface intuitiva sem necessidade de treinamento
- Feedback visual em todas as operações longas
- Mensagens de erro em linguagem clara
- Documentação acessível diretamente da interface
- Design System Solar Pop Edition consistente

**Acessibilidade:**
- Atalhos para operações frequentes
- Design responsivo em desktop e mobile
- Suporte a navegação por teclado
- Contraste e legibilidade adequados (WCAG AA)

---

### RNF-06: Manutenibilidade

**Código e Arquitetura:**
- Arquitetura modular com responsabilidades claras
- Código documentado em pontos críticos
- Logs estruturados para debugging rápido
- Configurações centralizadas e versionadas

**Testes:**
- Testes automatizados para fluxos principais
- Cobertura de testes em pontos críticos
- Testes de regressão antes de releases

**Versionamento:**
- Versionamento de schemas de dados
- Compatibilidade com versões anteriores
- Migração de dados automática quando possível

---

### RNF-07: Portabilidade

**Compatibilidade de Ambiente:**
- Funciona em Windows, Linux, macOS
- Sem dependências de serviços externos específicos
- Configuração através de arquivos padronizados (.env)

**Portabilidade de Dados:**
- Dados armazenados em formatos abertos (HTML, JSON)
- Interface acessível via navegador padrão
- Exportação em formatos universais

---

### RNF-08: Observabilidade

**Métricas e Monitoramento:**
- Métricas de uso coletadas automaticamente
- Dashboard de estatísticas de processamento
- Tempo por etapa registrado em cada relatório

**Histórico e Auditoria:**
- Histórico completo de operações
- Exportação de métricas para análise externa
- Rastreabilidade de cada processamento

---

## 6. PROCEDIMENTO DE EXECUÇÃO (FLUXO COMPLETO)

### Etapa 1: Identificação da Fonte

**Objetivo:** Capturar ou receber informação sobre o vídeo a ser processado.

**Ações Específicas:**
1. Usuário navega em plataforma educacional OU insere URL manualmente
2. Extensão Chrome detecta automaticamente streams de vídeo
3. Sistema intercepta requisições de rede relacionadas a vídeo
4. Sistema extrai metadados da página (título, instrutor, duração, descrição)
5. Sistema registra captura com timestamp e identificador único
6. Sistema exibe notificação visual de captura bem-sucedida
7. Sistema armazena captura em histórico local
8. Usuário confirma envio para processamento OU sistema armazena para uso posterior

**Validações Aplicadas:**
- URL é válida e acessível
- Metadados mínimos foram extraídos (título, duração)
- Não há duplicata recente no histórico
- Formato de vídeo é suportado

**Saídas Desta Etapa:**
- Captura registrada com metadados
- Identificador único gerado
- Histórico atualizado
- Notificação visual exibida

---

### Etapa 2: Resolução e Validação

**Objetivo:** Transformar URL ou manifest em endereço direto de streaming e validar acessibilidade.

**Ações Específicas:**
1. Sistema verifica cache de resoluções anteriores (`resolve_cache/`)
2. Se há cache válido, reutiliza resultado
3. Se não há cache, sistema inicia navegação automatizada (Playwright)
4. Sistema aplica autenticação se necessário (accounts.json)
5. Sistema intercepta requisições de rede para identificar stream
6. Sistema detecta tipo de streaming (HLS, DASH, direto, YouTube)
7. Sistema verifica presença de proteção DRM
8. Se DRM detectado, processo aborta com mensagem clara
9. Sistema valida acessibilidade do stream
10. Sistema testa conectividade ao stream
11. Sistema armazena resolução em cache para reutilização
12. Sistema registra tipo de streaming identificado

**Validações Aplicadas:**
- Stream é acessível e válido
- Não há proteção DRM (ou aborta explicitamente)
- Credenciais são válidas (se necessário)
- Tipo de streaming é suportado
- Conectividade confirmada

**Saídas Desta Etapa:**
- URL direta do stream
- Tipo de streaming identificado
- Metadados adicionais extraídos
- Registro em cache
- Status de validação

---

### Etapa 3: Aquisição de Conteúdo

**Objetivo:** Baixar vídeo completo ou segmentos de streaming.

**Ações Específicas:**
1. Sistema determina estratégia de download baseado no tipo de stream
2. Para YouTube/Vimeo: usa yt-dlp
3. Para HLS: baixa manifest + todos os segmentos via FFmpeg
4. Para DASH: baixa manifest + segmentos de melhor qualidade
5. Para direto: baixa arquivo completo com retomada
6. Sistema exibe progresso em tempo real (percentual, velocidade, ETA)
7. Sistema valida cada segmento conforme baixado
8. Sistema aplica retry em falhas parciais (máximo 3 tentativas)
9. Sistema preserva estado parcial para retomada
10. Sistema combina segmentos se necessário
11. Sistema valida integridade do conteúdo completo
12. Sistema registra estatísticas de download

**Validações Aplicadas:**
- Download completo sem corrupção
- Tamanho do arquivo coerente com duração
- Formato de vídeo suportado
- Checksum validado (se disponível)

**Saídas Desta Etapa:**
- Arquivo de vídeo completo
- Log de download com estatísticas
- Metadados de qualidade
- Confirmação de integridade

---

### Etapa 4: Extração de Áudio

**Objetivo:** Isolar faixa de áudio otimizada para transcrição Whisper.

**Ações Específicas:**
1. Sistema identifica faixa de áudio no vídeo
2. Sistema extrai faixa de áudio em formato padrão (WAV/MP3)
3. Sistema converte para taxa de amostragem otimizada (16kHz)
4. Sistema normaliza níveis de volume
5. Sistema remove silêncios excessivos (opcional)

**Validações Aplicadas:**
- Áudio extraído sem perda de conteúdo falado
- Sincronização temporal preservada
- Taxa de amostragem adequada ao Whisper
- Arquivo íntegro e sem corrupção
- Duração compatível com o vídeo original

**Saídas Desta Etapa:**
- Arquivo de áudio otimizado para transcrição
- Log de extração com detalhes de processamento
- Metadados atualizados (duração, qualidade, formato)

---

### Etapa 5: Transcrição

**Objetivo:** Converter áudio em texto estruturado com timestamps usando Whisper.

**Ações Específicas:**
1. Sistema verifica cache de transcrições através de hash (`sumarios_cache/`)
2. Se cache válido existir, transcrição é imediatamente reaproveitada
3. Se não houver cache:
   - Sistema carrega Whisper (small/medium/large-v3)
   - Sistema detecta idioma automaticamente
4. Sistema processa áudio em blocos (chunks) se necessário
5. Sistema produz texto com timestamps coerentes e ordenados
6. Sistema aplica pontuação e formatação básica
7. Sistema calcula score de confiança e reporta possível baixa qualidade
8. Sistema salva transcrição final em cache
9. Sistema registra estatísticas de transcrição (tempo, qualidade, idioma)
10. Sistema alerta o usuário sobre trechos com baixa confiança (se houver)

**Validações Aplicadas:**
- Transcrição não está vazia
- Timestamps seguem ordem crescente
- Score de confiança acima de threshold aceitável
- Conteúdo corresponde ao áudio original
- Cache salvo corretamente e de forma íntegra

**Saídas Desta Etapa:**
- Transcrição completa com timestamps
- Score médio de confiança
- Arquivo de transcrição armazenado em cache
- Log de performance e idioma detectado

---

### Etapa 6: Preparação de Prompt

**Objetivo:** Construir prompt estruturado e validado para envio ao modelo de IA.

**Ações Específicas:**
1. Sistema carrega template de prompt selecionado pelo usuário (modelo2, modelo4, etc.)
2. Sistema valida estrutura do template (variáveis, seções, sintaxe)
3. Sistema substitui variáveis dinâmicas:
   - título
   - duração
   - data de captura
   - nome do instrutor (se disponível)
4. Sistema insere transcrição
5. Sistema avalia tamanho final do prompt
6. Sistema reduz ou divide conteúdo caso exceda limites do modelo
7. Sistema apresenta preview do prompt final
8. Sistema registra versão do template utilizado

**Validações Aplicadas:**
- Nenhuma variável ausente
- Estrutura do template respeitada
- Tamanho do prompt dentro dos limites
- Divisão coerente em caso de chunking
- Preview idêntico ao prompt enviado

**Saídas Desta Etapa:**
- Prompt final validado
- Log das variáveis substituídas
- Indicação do template versionado utilizado

---

### Etapa 7: Geração de Resumo

**Objetivo:** Processar transcrição e gerar resumo estruturado via Gemini/OpenRouter.

**Ações Específicas:**
1. Sistema envia prompt para Gemini (provedor primário)
2. Sistema monitora timeout e possíveis falhas
3. Em caso de erro: fallback automático para OpenRouter
4. Sistema recebe resposta e valida:
   - estrutura JSON
   - seções obrigatórias (14 para modelo4)
   - coerência contextual
5. Sistema extrai conteúdo por seção
6. Sistema normaliza texto (títulos, listas, marcadores)
7. Sistema registra qual modelo foi utilizado e tempo gasto
8. Sistema salva resultado intermediário para auditoria

**Validações Aplicadas:**
- Estrutura JSON presente e íntegra
- Seções obrigatórias preenchidas
- Resumo coerente com transcrição
- Nenhuma seção vazia ou duplicada
- Fallback usado corretamente em caso de falha

**Saídas Desta Etapa:**
- Resumo estruturado em formato JSON padronizado
- Log do modelo utilizado (Gemini ou OpenRouter)
- Registro do tempo total e possíveis fallbacks

---

### Etapa 8: Renderização de Relatório

**Objetivo:** Transformar dados estruturados em relatório visual navegável Solar Pop Edition.

**Ações Específicas:**
1. Sistema carrega template de relatório (`templates.js` / `report_renderer.py`)
2. Sistema injeta:
   - metadados
   - resumo estruturado (14 seções)
   - transcrição completa
   - tempo de processamento por etapa
3. Sistema aplica estilos visuais Solar Pop Edition
4. Sistema gera:
   - versão visual (HTML)
   - versão estruturada (JSON)
5. Sistema organiza arquivos em diretórios:
   - `sumarios/{domain}/{videoId}/`
6. Sistema prepara navegação por seções
7. Sistema cria índice interno e histórico
8. Sistema valida funcionamento offline

**Validações Aplicadas:**
- Relatório renderiza sem erros
- Todas as seções presentes
- Navegação por seções funcional
- Histórico atualizado
- Compatibilidade com navegadores modernos

**Saídas Desta Etapa:**
- `resumo_{videoId}.html` - Relatório navegável
- `resumo_{videoId}.json` - Dados estruturados
- Índice da biblioteca atualizado
- Versão final pronta para exibição

---

### Etapa 9: Finalização e Limpeza

**Objetivo:** Encerrar processamento, registrar histórico e limpar arquivos temporários.

**Ações Específicas:**
1. Sistema remove arquivos temporários (vídeo, áudio, segmentos)
2. Sistema atualiza histórico de processamentos
3. Sistema registra métricas:
   - tempo total
   - tempo por etapa
   - sucesso/falha
4. Sistema disponibiliza relatório final ao usuário
5. Sistema exibe mensagem de conclusão
6. Sistema mantém registro para auditoria futura
7. Sistema atualiza estatísticas gerais

**Validações Aplicadas:**
- Nenhum arquivo temporário permanece
- Histórico registrado corretamente
- Relatório acessível e íntegro
- Métricas salvas corretamente

**Saídas Desta Etapa:**
- Processamento concluído
- Histórico atualizado
- Estatísticas globais registradas
- Arquivos finais acessíveis na biblioteca

---

## 7. TECNOLOGIAS IMPLEMENTADAS

### 7.1 Backend (Python)

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| **Python** | 3.11+ | Linguagem principal |
| **Flask** | 3.x | Servidor web |
| **Socket.IO** | 5.x | WebSocket (tempo real) |
| **Playwright** | 1.x | Automação de navegador |
| **Whisper** | OpenAI | Transcrição de áudio |
| **FFmpeg** | 6.x | Processamento de mídia |
| **yt-dlp** | Latest | Download YouTube/Vimeo |

### 7.2 APIs de IA

| API | Uso | Fallback |
|-----|-----|----------|
| **Google Gemini** | Geração de resumos (primário) | - |
| **OpenRouter** | Fallback automático | ✅ |

### 7.3 Frontend

| Tecnologia | Uso |
|------------|-----|
| **HTML5/CSS3/JS** | Interface web |
| **Tailwind CSS** | Framework de estilos |
| **Socket.IO Client** | WebSocket |
| **Google Fonts** | Inter, Space Grotesk |

### 7.4 Extensão Chrome

| Componente | Descrição |
|------------|-----------|
| **Manifest v3** | Padrão atual |
| **Service Worker** | background.js |
| **Content Scripts** | content.js, inject.js |
| **Popup** | 4 abas (Captura, Manifests, Biblioteca, Config) |

### 7.5 Design System

| Nome | Estilo |
|------|--------|
| **Solar Pop Edition** | Neo-Brutalista/Retro-Pop |
| **Paleta** | Base, Ink, Accent, Pop, Sun |
| **Tipografia** | Space Grotesk (display), Inter (body) |

---

## 8. POSSÍVEIS DESAFIOS E SOLUÇÕES

### Desafio 1: Plataformas com Proteção DRM

**Solução:**
- Detectar DRM antes do download (`drm.py`)
- Abortar o processo imediatamente
- Exibir mensagem clara ao usuário
- Registrar evento de forma auditável

---

### Desafio 2: Variações Extremas entre Plataformas

**Solução:**
- Camadas de abstração para extração
- Fallback de metadados
- Seletores genéricos opcionais
- yt-dlp para plataformas públicas

---

### Desafio 3: Falhas de Rede Durante Download

**Solução:**
- Retry automático com backoff exponencial
- Retomada de download (Range requests)
- Validação de integridade por segmento

---

### Desafio 4: Áudio de Baixa Qualidade

**Solução:**
- Normalização pré-transcrição
- Remoção de ruído e silêncios
- Alerta de baixa confiança ao usuário
- Opção de modelo Whisper maior (large-v3)

---

### Desafio 5: Custo de Modelos de IA

**Solução:**
- Cache agressivo de transcrições
- Fallback Gemini → OpenRouter (modelos mais baratos)
- Compressão inteligente de transcrição
- Escolha de modelo de prompt otimizado

---

### Desafio 6: Transcrições Muito Longas

**Solução:**
- Chunking semântico
- Resumo parcial por seção
- Recombinação lógica final
- Limite de tokens por chunk

---

### Desafio 7: Sessões Expiradas

**Solução:**
- Detecção automática
- Renovação silenciosa
- Reautenticação assistida
- Cache de sessão válida

---

### Desafio 8: Templates Inconsistentes

**Solução:**
- Validador de estrutura (`prompt_validator.py`)
- Verificação de variáveis obrigatórias
- Versionamento automático
- Editor de Prompts na interface

---

### Desafio 9: Acúmulo de Armazenamento

**Solução:**
- Limpeza automática de temporários
- Expiração configurável de cache (TTL)
- Compressão de históricos antigos
- Limites de tamanho configuráveis

---

### Desafio 10: Usuários Não Técnicos

**Solução:**
- Mensagens simples e acionáveis
- Progresso visual claro (timer, barra)
- Sugestões de ação em erros
- Documentação integrada na interface
- Design Solar Pop intuitivo

---

## 9. CRITÉRIOS DE SUCESSO

### Critérios Funcionais

- 90%+ de sucesso em vídeos acessíveis
- Detecção de DRM 100% precisa
- Cache funcional em todas as etapas aplicáveis
- Relatórios completos, consistentes e navegáveis

### Critérios de Performance

- Relatório renderizado em até 2s
- Resolução de URL em até 30s
- Transcrição em até 2x a duração
- Resumo em até 60s

### Critérios de Qualidade

- Transcrição > 90% de precisão
- Estrutura de resumo sempre válida (14 seções)
- Zero perda de dados
- Coerência entre resumo e transcrição

### Critérios de Experiência

- Interface intuitiva e clara
- Mensagens compreensíveis
- Fluxo transparente do início ao fim
- Resultados acessíveis imediatamente

### Critérios de Segurança

- Credenciais nunca expostas
- Todas entradas validadas
- Sem execução de conteúdo inseguro

---

## 10. DOCUMENTAÇÃO RELACIONADA

### Design System (8 documentos)

| Documento | Descrição |
|-----------|-----------|
| `design-system-interface-web-video-processor-solar-pop-edition.md` | Design principal |
| `design-system-edito-de-prompts.md` | Editor de Prompts |
| `design-system-configuracoes.md` | Modal de Configurações |
| `design-system-relatorio.md` | Relatório de Vídeo |
| `design-system-extensao-aba-captura.md` | Extensão: Aba Captura |
| `design-system-extensao-aba-manifests.md` | Extensão: Aba Manifests |
| `design-system-extensao-aba-biblioteca.md` | Extensão: Aba Biblioteca |
| `design-system-extensao-aba-config.md` | Extensão: Aba Config |

### Documentação Técnica

| Documento | Descrição |
|-----------|-----------|
| `doc/ESTRUTURA_PROJETO.md` | Estrutura de pastas e arquivos |
| `doc/QUICK_START.md` | Guia de início rápido |
| `doc/BATCH_PROCESSING.md` | Processamento em lote |
| `doc/FALLBACK_SYSTEM.md` | Sistema Gemini/OpenRouter |
| `doc/OPENROUTER_GUIDE.md` | Configuração OpenRouter |

### Prompts

| Documento | Descrição |
|-----------|-----------|
| `modelos_prompts/modelo2.md` | Prompt padrão |
| `modelos_prompts/modelo4.md` | P.R.O.M.P.T. (14 seções) |
| `modelos_prompts/template.md` | Template base |

---

## 11. PROMPT BASE UNIVERSAL

```
Você está operando com base em um PRP universal do Sistema de Processamento Automatizado de Vídeos Educacionais (Video Processor Pro).

Este PRP contém:
- Contexto completo do produto
- Arquitetura do sistema (Extensão Chrome + Backend Python + Web Flask)
- 15 requisitos funcionais
- 8 requisitos não funcionais
- Procedimento em 9 etapas
- Tecnologias implementadas (Whisper, Gemini, OpenRouter, Solar Pop)
- 10 desafios e soluções
- Critérios de sucesso
- Premissas de segurança e qualidade

Sempre que solicitado a gerar, corrigir, explicar ou projetar algo, siga estas diretrizes:

1. Preserve neutralidade tecnológica
2. Respeite modularidade
3. Mantenha rastreabilidade
4. Priorize segurança
5. Mantenha a estrutura
6. Valide entradas
7. Gere saída clara e consistente
8. Siga fielmente o fluxo do PRP
9. Aplique o design Solar Pop Edition quando aplicável
10. Utilize as tecnologias documentadas (Whisper, Gemini, Flask, etc.)

Entregue resultados completos, coerentes e alinhados ao PRP.
```

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| v2.0 | 22/12/2025 | Atualização completa: Arquitetura, Tecnologias, Design System Solar Pop, APIs (Gemini/OpenRouter), Modelos de Prompt (P.R.O.M.P.T.), Estrutura de diretórios real, Documentação relacionada. Formatação Markdown. |
| v1.0 | 21/12/2025 | Versão inicial do documento |

---

**FIM DO DOCUMENTO**
