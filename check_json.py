import json
import re

# Carregar o JSON
with open(r'd:\Cursor\ExtratorVideosCurso\sumarios\alunos.segueadii.com.br\7033466\resumo.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Verificar o raw
raw = data.get('retorno_literal_gemini', '')
print(f"Raw length: {len(raw)}")
print(f"Raw completo: {'Sim' if raw.strip().endswith('}') else 'Não'}")
print()

# Tentar fazer parse do raw
try:
    # Remover markdown code blocks
    clean_raw = raw.strip()
    if clean_raw.startswith('```'):
        clean_raw = re.sub(r'^```[a-zA-Z]*\n', '', clean_raw)
        clean_raw = re.sub(r'\n```$', '', clean_raw)
    
    # Fazer parse
    parsed = json.loads(clean_raw)
    
    print("=== DADOS DO RAW (Gemini) ===")
    print(f"Resumo: {len(parsed.get('resumo_conciso', '').split())} palavras")
    print(f"Pontos-chave: {len(parsed.get('pontos_chave', []))} itens")
    print(f"Orientações: {len(parsed.get('orientacoes', []))} itens")
    print()
    
    print("=== DADOS DO JSON SALVO ===")
    print(f"Resumo: {len(data.get('resumo_conciso', '').split())} palavras")
    print(f"Pontos-chave: {len(data.get('pontos_chave', []))} itens")
    print(f"Orientações: {len(data.get('orientacoes', []))} itens")
    print()
    
    if len(parsed.get('pontos_chave', [])) > 5:
        print("✅ RAW DO GEMINI ESTÁ CORRETO!")
        print("❌ MAS O JSON SALVO ESTÁ ERRADO!")
    else:
        print("❌ PROBLEMA NO RAW DO GEMINI")
        
except Exception as e:
    print(f"Erro ao fazer parse: {e}")
