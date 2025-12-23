# 🤝 Guia de Contribuição

Obrigado por considerar contribuir com o ExtratorVideosCurso!

## 📋 Como Contribuir

### 1. Fork o Repositório

```bash
git clone https://github.com/seu-usuario/ExtratorVideosCurso.git
cd ExtratorVideosCurso
```

### 2. Criar Branch

```bash
git checkout -b feature/minha-feature
```

### 3. Fazer Mudanças

- Escreva código limpo e documentado
- Adicione testes para novas funcionalidades
- Siga o estilo de código existente

### 4. Rodar Testes

```bash
pytest tests/ -v
```

### 5. Commit

```bash
git commit -m "feat: adiciona nova funcionalidade X"
```

**Formato de commits:**
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `test:` - Testes
- `refactor:` - Refatoração

### 6. Push e Pull Request

```bash
git push origin feature/minha-feature
```

Abra Pull Request no GitHub.

---

## 📝 Padrões de Código

- Python 3.9+
- Type hints obrigatórios
- Docstrings em todas as funções públicas
- Testes unitários para novas funcionalidades
- Cobertura de testes > 80%

---

## 🧪 Testes

```bash
# Rodar todos os testes
pytest tests/ -v

# Rodar testes específicos
pytest tests/test_summary_cache.py -v

# Cobertura
pytest --cov=extrator_videos tests/
```

---

## 📖 Documentação

Ao adicionar novas funcionalidades, atualize:

- `README.md`
- `docs/USAGE.md`
- `docs/API.md`
- Docstrings no código

---

## 🐛 Reportar Bugs

Ao reportar bugs, inclua:

1. Versão do Python
2. Sistema operacional
3. Passos para reproduzir
4. Comportamento esperado vs atual
5. Logs de erro

---

## 💡 Sugerir Funcionalidades

Ao sugerir funcionalidades:

1. Descreva o problema que resolve
2. Proponha uma solução
3. Considere alternativas
4. Discuta impacto em funcionalidades existentes

---

## 📜 Código de Conduta

- Seja respeitoso e inclusivo
- Aceite críticas construtivas
- Foque no que é melhor para a comunidade
- Mostre empatia com outros membros

---

## 🙏 Agradecimentos

Obrigado por contribuir! Sua ajuda é muito apreciada.
