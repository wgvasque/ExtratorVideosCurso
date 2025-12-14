## Objetivos
- Transcrever áudio de vídeos com alta precisão, preservando contexto e identificando tópicos.
- Enviar a transcrição para a API Gemini Pro para análise e geração de resumo estruturado.
- Garantir conformidade, segurança e registro de processamento.
- Entregar resumo claro, pontos-chave e navegação por seções, otimizando tempo de processamento.

## Arquitetura de Fluxo
- Ingestão de mídia: leitura do vídeo/manifest HLS/DASH sem download permanente, convertendo para áudio PCM/Opus on-the-fly.
- Transcrição: motor local de alta qualidade (`faster-whisper`) com timestamps e idioma pt-BR.
- Pós-processamento: limpeza, agregação por tópicos e estruturação em blocos com marcadores temporais.
- Análise LLM (Gemini Pro): prompt seguro para sumarização, seleção de pontos-chave e orientação objetiva.
- Saída: JSON/Markdown com resumo, tópicos e índices de tempo; opcional HTML/CLI.

## Ferramentas
- Extração de áudio: `ffmpeg` pipeline (headers com Referer/User-Agent/Cookie quando necessário) para stream → WAV/Opus.
- Transcrição: `faster-whisper` (modelo medium/large-v3 conforme hardware) com beam search e word-level timestamps.
- Gemini Pro: `google-generativeai` com chave `GEMINI_API_KEY` em `.env`.
- Segurança: `python-dotenv`, logs com `logging` (sem credenciais), armazenamento temporário criptografado/desativável.

## Detalhes de Implementação
- Ingestão segura:
  - Detectar fonte (file/HLS/DASH) e iniciar `ffmpeg -headers` coerentes (Referer/UA/Cookie) para evitar padrões atípicos.
  - Rate-limit opcional com `re` do `ffmpeg` e buffer circular.
- Transcrição:
  - Configurar `faster-whisper` com `language='pt'`, `vad_filter=True`, `word_timestamps=True`.
  - Fragmentar por blocos de 30–60s; paralelizar respeitando CPU/GPU; consolidar com alinhamento de timestamps.
- Tópicos e estrutura:
  - Segmentar a transcrição por mudanças de tópico (heurística por palavras-chave e LLM assistido).
  - Extrair entidades/tópicos principais; construir sumário hierárquico com timestamps.
- Integração Gemini Pro:
  - Prompt: fornecer transcrição completa ou chunks, instruindo a retornar JSON com: `resumo_conciso`, `pontos_chave[]`, `tópicos[]`, `orientações[]`, `seções[{título,inicio,fim,conteúdo}]`.
  - Quando muito longo, usar chunking com `map-reduce` (sumários parciais → sumário final).
  - Configurar segurança: não enviar PII sensível sem consentimento; anonimizar quando necessário.
- Saída e interface:
  - CLI: `transcribe_and_summarize(url|file)` gerando `transcricao.json` + `resumo.json` + `resumo.md`.
  - HTML opcional: viewer com navegação por seções e jump-to-timestamp.
  - API: função `summarize_video(input, auth)` retornando estrutura padronizada.

## Conformidade e Segurança
- Credenciais: `GEMINI_API_KEY` via `.env`; nunca imprimir ou registrar chave.
- Proteção de dados: armazenamento local temporário e opcionalmente desativado; anonimização de nomes na transcrição.
- Direitos autorais: usar transcrição apenas para estudo/análise; não redistribuir conteúdo.
- Privacidade: logs mínimos (sucesso/falha, durações, contagens); sem conteúdo sensível nos logs.
- Registro: arquivo `processing.log` com hash do input, tempos, versão do modelo e decisão de retenção.

## Otimização de Tempo
- Pipeline streaming (sem arquivo intermediário grande), chunking com paralelização controlada.
- Seleção de modelo adaptativa (small/medium/large) conforme duração/hardware.
- Cache opcional por hash do áudio para reprocessamento rápido.

## Entregáveis
- Módulo `transcription` (ffmpeg + faster-whisper), `gemini_client` (envio e prompt), `cli`.
- Esquema JSON da transcrição e resumo.
- README com uso, limites e políticas de conformidade.

## Próximos Passos
- Implementar pipeline de ingestão e transcrição.
- Integrar Gemini Pro e produzir o `resumo.json`.
- Validar com vídeo curto e ajustar desempenho.
- Entregar CLI/API e documentação para uso final.