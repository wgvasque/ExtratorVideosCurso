# 🚀 Como Subir o Projeto para o GitHub

## ✅ Passo 1: Criar Repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique no botão **"+"** no canto superior direito
3. Selecione **"New repository"**
4. Configure:
   - **Repository name**: `ExtratorVideosCurso` (ou outro nome de sua escolha)
   - **Description**: "Sistema de extração, transcrição e resumo de vídeos educacionais"
   - **Visibility**: Público ou Privado (sua escolha)
   - ⚠️ **NÃO** marque "Initialize with README" (já temos arquivos)
5. Clique em **"Create repository"**

## ✅ Passo 2: Conectar Repositório Local ao GitHub

Após criar o repositório, o GitHub mostrará comandos. Use estes comandos no PowerShell:

### Se o repositório está vazio (recomendado):

```powershell
# Adicionar remote (substitua SEU-USUARIO pelo seu usuário do GitHub)
git remote add origin https://github.com/SEU-USUARIO/ExtratorVideosCurso.git

# Verificar remote
git remote -v

# Fazer push
git branch -M main
git push -u origin main
```

### Exemplo completo:

```powershell
# Se seu usuário for "wgvasque"
git remote add origin https://github.com/wgvasque/ExtratorVideosCurso.git
git branch -M main
git push -u origin main
```

## ✅ Passo 3: Autenticação

Se solicitado, você precisará autenticar:

### Opção 1: Personal Access Token (Recomendado)
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Selecione escopo: `repo` (acesso completo)
4. Copie o token
5. Use o token como senha quando solicitado

### Opção 2: GitHub CLI (Mais fácil)
```powershell
# Instalar GitHub CLI (se não tiver)
winget install GitHub.cli

# Autenticar
gh auth login

# Configurar remote
gh repo create ExtratorVideosCurso --public --source=. --remote=origin --push
```

## ✅ Passo 4: Verificar

Após o push, verifique:

1. Acesse seu repositório no GitHub
2. Você deve ver todos os arquivos
3. Vá em **"Actions"** → Os workflows começarão a executar automaticamente!

## 🔧 Comandos Úteis

### Ver status
```powershell
git status
```

### Ver commits
```powershell
git log --oneline
```

### Fazer alterações futuras
```powershell
git add .
git commit -m "sua mensagem"
git push
```

### Ver remote configurado
```powershell
git remote -v
```

## ⚠️ Troubleshooting

### Erro: "remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/SEU-USUARIO/ExtratorVideosCurso.git
```

### Erro: "failed to push some refs"
```powershell
# Se o repositório GitHub tem arquivos (README, .gitignore, etc.)
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### Erro de autenticação
- Use Personal Access Token ao invés de senha
- Ou configure SSH keys (mais avançado)

### Mudar URL do remote
```powershell
git remote set-url origin https://github.com/SEU-USUARIO/ExtratorVideosCurso.git
```

## 📋 Checklist Final

- [ ] Repositório criado no GitHub
- [ ] Remote adicionado localmente
- [ ] Push realizado com sucesso
- [ ] Arquivos visíveis no GitHub
- [ ] Workflows executando em Actions

## 🎉 Próximos Passos

Após subir para o GitHub:

1. ✅ Configure **CODEOWNERS** em `.github/CODEOWNERS` (substitua `@seu-usuario`)
2. ✅ Ative **Branch Protection** em Settings → Branches
3. ✅ Adicione **badges** ao README.md (opcional)
4. ✅ Configure **Secrets** se necessário (Settings → Secrets → Actions)

---

**Dúvidas?** Consulte:
- [GITHUB_SETUP.md](./GITHUB_SETUP.md) - Guia completo de workflows
- [INTEGRACAO_GITHUB.md](./INTEGRACAO_GITHUB.md) - Resumo da integração

