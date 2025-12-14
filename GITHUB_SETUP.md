# 🚀 Guia de Configuração do GitHub Actions

Este guia explica como usar a integração com GitHub Actions configurada para este projeto.

## 📋 O Que Foi Configurado

### 1. Workflows de CI/CD

#### `.github/workflows/ci.yml` - Testes e Validação
- ✅ Executa testes unitários em múltiplas versões do Python (3.8, 3.9, 3.10, 3.11)
- ✅ Valida instalação do pacote
- ✅ Verifica build e estrutura
- ✅ Gera relatórios de cobertura de testes (com Codecov)

#### `.github/workflows/lint.yml` - Qualidade de Código
- ✅ **Linting**: Valida código com Flake8
- ✅ **Formatação**: Verifica formatação com Black
- ✅ **Type Checking**: Verifica tipos com mypy
- ✅ **Segurança**: Análise de segurança com Bandit e Safety

### 2. Dependabot

#### `.github/dependabot.yml`
- ✅ Atualiza dependências Python semanalmente
- ✅ Atualiza dependências da interface web
- ✅ Atualiza GitHub Actions mensalmente
- ✅ Cria PRs automáticos com limite de 5 abertos simultaneamente

### 3. Templates e Configurações

- ✅ **Pull Request Template**: Template padronizado para PRs
- ✅ **Issue Templates**: Templates para bugs e feature requests
- ✅ **CODEOWNERS**: Define revisores automáticos por área de código

## 🔧 Como Usar

### Executar Workflows Localmente

#### Antes de fazer Push

1. **Executar testes localmente**:
```bash
pip install -r requirements-dev.txt
pytest tests/ -v
```

2. **Verificar linting**:
```bash
flake8 extrator_videos/ tests/
black --check extrator_videos/ tests/
```

3. **Verificar tipos** (opcional):
```bash
mypy extrator_videos/
```

4. **Verificar segurança** (opcional):
```bash
bandit -r extrator_videos/
safety check
```

### No GitHub

Os workflows são executados automaticamente quando:
- Você faz push para `main`, `master` ou `develop`
- Você cria um Pull Request para essas branches
- Você dispara manualmente via "Actions" no GitHub

### Ver Status dos Workflows

1. Acesse a aba **"Actions"** no seu repositório GitHub
2. Veja o status de cada workflow
3. Clique em um workflow para ver detalhes e logs

### Badges de Status (Opcional)

Adicione badges ao README.md para mostrar status dos workflows:

```markdown
![CI Tests](https://github.com/seu-usuario/ExtratorVideosCurso/workflows/CI%20-%20Testes%20e%20Validação/badge.svg)
![Linting](https://github.com/seu-usuario/ExtratorVideosCurso/workflows/Linting%20e%20Formatação/badge.svg)
```

## 📦 Dependências de Desenvolvimento

Todas as dependências de desenvolvimento estão em `requirements-dev.txt`:

- **pytest**: Framework de testes
- **flake8**: Linting
- **black**: Formatação de código
- **mypy**: Verificação de tipos
- **bandit**: Análise de segurança
- **safety**: Verificação de vulnerabilidades em dependências

Instalar:
```bash
pip install -r requirements-dev.txt
```

## 🎯 Próximos Passos

### 1. Configurar Secrets (se necessário)

Se seus testes precisam de credenciais (API keys, etc.), configure Secrets no GitHub:

1. Vá em **Settings** → **Secrets and variables** → **Actions**
2. Adicione secrets como:
   - `GEMINI_API_KEY` (para testes de integração)
   - `OPENROUTER_API_KEY` (para testes de integração)

Depois, use nos workflows:
```yaml
env:
  GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

### 2. Expandir Testes

O workflow está configurado para executar testes. Expanda a cobertura:

- Adicione mais testes em `tests/`
- Marque testes lentos com `@pytest.mark.slow`
- Marque testes que precisam de API com `@pytest.mark.requires_api`

### 3. Integrar Codecov (Opcional)

Para visualizar cobertura de testes:

1. Cadastre-se em [codecov.io](https://codecov.io)
2. Conecte seu repositório GitHub
3. O workflow já está configurado para enviar relatórios

### 4. Configurar Branch Protection

Proteja branches principais:

1. Vá em **Settings** → **Branches**
2. Adicione regra para `main`:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date

## 🔍 Troubleshooting

### Workflow Falhando?

1. **Testes falhando**:
   - Verifique logs na aba "Actions"
   - Execute testes localmente: `pytest tests/ -v`
   - Verifique versões de Python

2. **Linting falhando**:
   - Execute `flake8` localmente
   - Formate código: `black extrator_videos/ tests/`

3. **Build falhando**:
   - Verifique sintaxe Python: `python -m py_compile extrator_videos/*.py`
   - Verifique imports: `python -c "import extrator_videos"`

### Atualizar Workflows

Os workflows estão em `.github/workflows/`. Edite conforme necessário:

- **ci.yml**: Configuração de testes
- **lint.yml**: Configuração de linting/segurança

## 📚 Referências

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [pytest Documentation](https://docs.pytest.org/)
- [Flake8 Documentation](https://flake8.pycqa.org/)

---

**Nota**: Substitua `@seu-usuario` em `.github/CODEOWNERS` pelo seu usuário do GitHub real.

