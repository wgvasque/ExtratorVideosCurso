# 🔒 Configurar Branch Protection

## Método 1: Via Interface Web (Recomendado - Mais Fácil)

1. Acesse: https://github.com/wgvasque/ExtratorVideosCurso/settings/branches

2. Clique em **"Add rule"** ou **"Add branch protection rule"**

3. Em **"Branch name pattern"**, digite: `main`

4. Marque as seguintes opções:

   ✅ **Require a pull request before merging**
   - [ ] Require approvals: **1**
   - [ ] Dismiss stale pull request approvals when new commits are pushed
   - [ ] Require review from Code Owners

   ✅ **Require status checks to pass before merging**
   - [ ] Require branches to be up to date before merging
   - Selecione os workflows:
     - ✅ CI - Testes e Validação
     - ✅ Linting e Formatação

   ✅ **Include administrators** (aplicar regras para admins também)

5. Opcional:
   - ❌ Do not allow bypassing the above settings
   - ❌ Do not allow force pushes
   - ❌ Do not allow deletions

6. Clique em **"Create"** ou **"Save changes"**

## Método 2: Via GitHub CLI (Avançado)

Se você tem o GitHub CLI instalado e quer automatizar:

```bash
# Criar arquivo de configuração JSON
cat > branch-protection.json << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "CI - Testes e Validação",
      "Linting e Formatação"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

# Aplicar proteção
gh api repos/wgvasque/ExtratorVideosCurso/branches/main/protection \
  --method PUT \
  --input branch-protection.json

# Limpar arquivo temporário
rm branch-protection.json
```

## O Que Isso Faz?

Após configurar, a branch `main` estará protegida:

- ✅ **Pull Requests obrigatórias**: Não é possível fazer push direto
- ✅ **Testes obrigatórios**: Workflows devem passar antes de merge
- ✅ **Revisão de código**: Requer aprovação de pelo menos 1 revisor
- ✅ **Code Owners**: CODEOWNERS será respeitado automaticamente

## Verificar se Está Funcionando

1. Tente fazer push direto para `main` (deve falhar)
2. Crie uma branch nova, faça commit e tente fazer PR
3. O PR deve mostrar que os workflows precisam passar

---

**Recomendação**: Use o Método 1 (Interface Web) - é mais simples e visual.

