# 🎬 Video Processor Pro - Interface Web

Interface web moderna para processar vídeos com IA, monitoramento em tempo real e visualização de relatórios.

---

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
cd web_interface
pip install -r requirements.txt
```

### 2. Iniciar Servidor

```bash
python app.py
```

### 3. Acessar Interface

Abra o navegador em: **http://localhost:5000**

---

## ✨ Funcionalidades

### 📝 Processar Vídeos
- Cole URLs no campo de texto (uma por linha)
- Ou carregue arquivo `targets.txt`
- Clique em "Processar Agora"

### 📊 Monitoramento em Tempo Real
- Barra de progresso animada
- Vídeo atual sendo processado
- Tempo decorrido
- Logs em tempo real

### 📁 Visualizar Relatórios
- Lista de todos os relatórios gerados
- Visualização inline (modal)
- Download de HTMLs
- Ordenação por data

### 🎯 Controles
- **Processar**: Inicia processamento
- **Cancelar**: Cancela processamento em andamento
- **Atualizar**: Recarrega lista de relatórios

---

## 🔧 Tecnologias

- **Backend**: Flask + SocketIO
- **Frontend**: HTML + Tailwind CSS + JavaScript
- **WebSocket**: Atualizações em tempo real
- **Threading**: Processamento em background

---

## 📊 Arquitetura

```
web_interface/
├── app.py              # Flask app + WebSocket
├── templates/
│   └── index.html      # Interface principal
├── static/
│   └── js/
│       └── main.js     # Lógica frontend
└── requirements.txt    # Dependências
```

---

## 🎨 Interface

### Layout Principal
- **Header**: Título e status
- **Input**: Campo para URLs
- **Controles**: Botões de ação
- **Progresso**: Barra e informações
- **Logs**: Console em tempo real
- **Relatórios**: Lista lateral

### Modal de Visualização
- Iframe com HTML gerado
- Navegação completa
- Botão de fechar

---

## 🔌 API Endpoints

### POST /api/process
Iniciar processamento de vídeos
```json
{
  "urls": ["https://exemplo.com/video/1", "..."]
}
```

### GET /api/status
Obter status atual do processamento

### GET /api/reports
Listar todos os relatórios gerados

### GET /api/report/<domain>/<video_id>
Obter HTML de um relatório específico

### POST /api/cancel
Cancelar processamento em andamento

---

## 🌐 WebSocket Events

### Cliente → Servidor
- `connect`: Conectar ao servidor

### Servidor → Cliente
- `connected`: Confirmação de conexão
- `progress`: Atualização de progresso
- `video_complete`: Vídeo processado com sucesso
- `video_error`: Erro ao processar vídeo
- `batch_complete`: Lote concluído
- `batch_cancelled`: Processamento cancelado

---

## ⌨️ Atalhos de Teclado

- **Ctrl + Enter**: Iniciar processamento
- **ESC**: Fechar modal

---

## 🎯 Próximas Melhorias

- [ ] Autenticação de usuários
- [ ] Histórico em banco de dados
- [ ] Dashboard de estatísticas
- [ ] Tema escuro
- [ ] Notificações desktop
- [ ] Exportar relatórios em PDF

---

## 📝 Notas

- O servidor roda na porta **5000** por padrão
- Usa as mesmas configurações do `.env` do projeto principal
- Relatórios são carregados da pasta `sumarios/`
- WebSocket permite múltiplos clientes simultâneos

---

## 🐛 Troubleshooting

### Porta 5000 em uso
```bash
# Alterar porta no app.py
socketio.run(app, host='0.0.0.0', port=5001)
```

### WebSocket não conecta
- Verificar firewall
- Verificar se `eventlet` está instalado
- Testar em navegador diferente

### Relatórios não aparecem
- Verificar se pasta `sumarios/` existe
- Verificar permissões de leitura
- Clicar em "Atualizar"

---

## 📄 Licença

Mesmo projeto principal - Uso interno
