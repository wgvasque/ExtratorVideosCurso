#!/bin/bash
# Script para configurar Branch Protection via GitHub CLI
# Requer: gh auth login (já autenticado)

REPO="wgvasque/ExtratorVideosCurso"
BRANCH="main"

echo "🔒 Configurando Branch Protection para $BRANCH..."

# Configurar branch protection
gh api repos/$REPO/branches/$BRANCH/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["CI - Testes e Validação","Linting e Formatação"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false

if [ $? -eq 0 ]; then
  echo "✅ Branch protection configurado com sucesso!"
else
  echo "❌ Erro ao configurar branch protection"
  echo "💡 Alternativa: Configure manualmente em Settings → Branches → Add rule"
fi

