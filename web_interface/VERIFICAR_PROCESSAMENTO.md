# 🔍 Como Verificar se o Processamento Está Funcionando

## 1️⃣ Verificar Processos Python Rodando

```powershell
Get-Process python | Select-Object Id, CPU, WorkingSet, StartTime | Sort-Object CPU -Descending
```

**O que procurar**:
- ✅ Múltiplos processos Python
- ✅ CPU crescente (indica processamento ativo)
- ✅ Processo iniciado recentemente

## 2️⃣ Verificar Logs do Servidor

**No terminal onde o servidor está rodando**, procure por:
```
🔍 [DEBUG] Processando vídeo 1/1: https://...
🔍 [DEBUG] Referer: https://...
🔍 [DEBUG] Comando: python -m extrator_videos.transcribe_cli ...
🔍 [DEBUG] Processo iniciado, PID: 12345
```

## 3️⃣ Verificar Arquivo de Log

```powershell
Get-Content "d:\Cursor\ExtratorVideosCurso\web_interface\logs\web_process.log" -Tail 20
```

**O que procurar**:
- Data/hora recente
- URL sendo processada
- Return code (RC)

## 4️⃣ Verificar Pastas de Saída

```powershell
Get-ChildItem "d:\Cursor\ExtratorVideosCurso\sumarios\alunos.segueadii.com.br" -Directory | 
    Select-Object Name, LastWriteTime | 
    Sort-Object LastWriteTime -Descending
```

**O que procurar**:
- Pastas com data/hora recente
- Pasta com ID do vídeo sendo processado

## 5️⃣ Verificar Interface Web

**No navegador**, observe:
- Barra de progresso apareceu?
- Status mudou para "Processando..."?
- Logs aparecem na seção de logs?
- Contador de tempo está rodando?

## 6️⃣ Verificar Uso de CPU

**Gerenciador de Tarefas** (Ctrl+Shift+Esc):
- Procure por processos "Python"
- CPU deve estar entre 20-50% (indica processamento ativo)
- Se CPU = 0%, pode estar travado

## 🚨 Sinais de Problema

❌ **Nenhum processo Python além do servidor**
- Processamento não iniciou

❌ **CPU = 0% por mais de 1 minuto**
- Processo pode estar travado

❌ **Memória crescendo rapidamente (>2GB)**
- Possível vazamento de memória

❌ **Nenhum log novo em web_process.log**
- Processamento não está sendo registrado

## ✅ Sinais de Sucesso

✅ **2+ processos Python rodando**
✅ **CPU entre 20-50%**
✅ **Logs sendo atualizados**
✅ **Pasta do vídeo sendo criada**
✅ **Interface mostra progresso**

## 🔧 Comandos Úteis

### Matar processo travado
```powershell
# Encontrar PID
Get-Process python | Select-Object Id, CPU

# Matar processo específico
Stop-Process -Id PID_AQUI -Force
```

### Ver logs em tempo real
```powershell
Get-Content "d:\Cursor\ExtratorVideosCurso\web_interface\logs\web_process.log" -Wait -Tail 10
```

### Verificar se arquivo está sendo criado
```powershell
Get-ChildItem "d:\Cursor\ExtratorVideosCurso\sumarios" -Recurse -File | 
    Where-Object {$_.LastWriteTime -gt (Get-Date).AddMinutes(-5)} |
    Select-Object FullName, LastWriteTime
```

## 📊 Status Atual

Com base nos comandos executados:

**Processos Python**: ✅ 6 processos encontrados
- PID 42844: CPU 4.36, iniciado 22:47:46 (SERVIDOR)
- PID 14240: CPU 1.69, iniciado 22:46:23
- PID 10424: CPU 1.06, iniciado 22:45:55

**Logs**: ⚠️ Últimos logs são de 12/12 (ontem)
- Nenhum log novo hoje

**Conclusão**: Servidor está rodando, mas processamento pode não ter iniciado ou não está gerando logs.

## 🎯 Próximos Passos

1. Verificar console do navegador (F12)
2. Verificar se há erros no terminal do servidor
3. Tentar processar novamente
4. Verificar se WebSocket está conectado
