"""
Sistema de Validação de Prompts
Valida se prompts seguem a estrutura de 14 seções obrigatórias
"""
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any


# Estrutura obrigatória de 14 seções
REQUIRED_SECTIONS = {
    "resumo_executivo": str,
    "objetivos_aprendizagem": list,
    "conceitos_fundamentais": list,
    "estrutura_central": list,
    "exemplos": list,
    "ferramentas_metodos": list,
    "orientacoes_praticas": dict,
    "abordagem_pedagogica": dict,
    "ideias_chave": dict,
    "pontos_memorizacao": dict,
    "citacoes_marcantes": list,
    "proximos_passos": dict,
    "preparacao_proxima_aula": dict,
    "materiais_apoio": list
}

# Subestruturas obrigatórias
REQUIRED_SUBSTRUCTURES = {
    "orientacoes_praticas": ["acao_imediata", "acao_curto_prazo", "acao_medio_prazo"],
    "abordagem_pedagogica": ["tom", "ritmo", "recursos_didaticos", "tecnicas_reforco", 
                              "engajamento", "principios_andragogicos", "estrutura_apresentacao"],
    "ideias_chave": ["insights_principais", "principios_estrategicos", 
                     "alertas_armadilhas", "mindset_recomendado"],
    "pontos_memorizacao": ["pilares", "regras_de_ouro", "formulas_estruturas", "principios_repetidos"],
    "proximos_passos": ["acao_imediata", "acao_curto_prazo", "acao_medio_prazo", "acao_continua"],
    "preparacao_proxima_aula": ["tema", "ganho_prometido", "pre_requisitos", 
                                  "preparacao_recomendada", "conexao", "prazo"]
}


def validate_prompt_file(filepath: Path) -> Dict[str, Any]:
    """
    Valida arquivo de prompt completo
    
    Returns:
        Dict com: valid, missing_sections, invalid_types, warnings, schema
    """
    try:
        content = filepath.read_text(encoding='utf-8')
    except Exception as e:
        return {
            "valid": False,
            "error": f"Erro ao ler arquivo: {str(e)}",
            "missing_sections": [],
            "invalid_types": [],
            "warnings": []
        }
    
    # Verificar se existe bloco JSON
    json_block = check_json_block(content)
    if not json_block:
        return {
            "valid": False,
            "error": "Prompt não contém bloco JSON com estrutura de saída",
            "missing_sections": list(REQUIRED_SECTIONS.keys()),
            "invalid_types": [],
            "warnings": ["Adicione um bloco ```json com a estrutura esperada"]
        }
    
    # Parsear schema JSON
    schema = parse_json_schema(json_block)
    if not schema:
        return {
            "valid": False,
            "error": "Não foi possível parsear o schema JSON do prompt",
            "missing_sections": list(REQUIRED_SECTIONS.keys()),
            "invalid_types": [],
            "warnings": ["Verifique se o JSON está válido"]
        }
    
    # Comparar com estrutura obrigatória
    return compare_with_required(schema)


def check_json_block(content: str) -> Optional[str]:
    """
    Verifica se existe bloco JSON no prompt
    
    Returns:
        String com conteúdo do bloco JSON ou None
    """
    # Procurar por bloco ```json
    pattern = r'```json\s*\n(.*?)\n```'
    matches = re.findall(pattern, content, re.DOTALL)
    
    if matches:
        return matches[0]  # Retornar primeiro bloco JSON encontrado
    
    return None


def parse_json_schema(json_block: str) -> Optional[Dict]:
    """
    Parsear schema JSON do prompt
    
    Returns:
        Dict com schema ou None se inválido
    """
    try:
        # Tentar parsear como JSON
        schema = json.loads(json_block)
        return schema
    except json.JSONDecodeError:
        # Se falhar, tentar limpar comentários e parsear novamente
        try:
            # Remover comentários // e /* */
            cleaned = re.sub(r'//.*?\n', '\n', json_block)
            cleaned = re.sub(r'/\*.*?\*/', '', cleaned, flags=re.DOTALL)
            schema = json.loads(cleaned)
            return schema
        except:
            return None


def compare_with_required(schema: Dict) -> Dict[str, Any]:
    """
    Comparar schema com estrutura obrigatória
    
    Returns:
        Dict com resultado da validação
    """
    missing_sections = []
    invalid_types = []
    warnings = []
    
    # Verificar seções obrigatórias
    for section, expected_type in REQUIRED_SECTIONS.items():
        if section not in schema:
            missing_sections.append(section)
        else:
            # Verificar tipo (aproximado, baseado em valor de exemplo)
            value = schema[section]
            if expected_type == str and not isinstance(value, str):
                invalid_types.append(f"{section}: esperado string, encontrado {type(value).__name__}")
            elif expected_type == list and not isinstance(value, list):
                invalid_types.append(f"{section}: esperado array, encontrado {type(value).__name__}")
            elif expected_type == dict and not isinstance(value, dict):
                invalid_types.append(f"{section}: esperado object, encontrado {type(value).__name__}")
    
    # Verificar subestruturas
    for section, required_keys in REQUIRED_SUBSTRUCTURES.items():
        if section in schema and isinstance(schema[section], dict):
            for key in required_keys:
                if key not in schema[section]:
                    warnings.append(f"{section}.{key} não encontrado (recomendado)")
    
    # Determinar se é válido
    valid = len(missing_sections) == 0 and len(invalid_types) == 0
    
    return {
        "valid": valid,
        "missing_sections": missing_sections,
        "invalid_types": invalid_types,
        "warnings": warnings,
        "schema": schema
    }


def generate_validation_report(prompt_name: str, validation_result: Dict) -> str:
    """
    Gerar relatório de validação formatado
    
    Returns:
        String com relatório formatado
    """
    report = []
    report.append(f"=== Relatório de Validação: {prompt_name} ===\n")
    
    if validation_result.get("error"):
        report.append(f"❌ ERRO: {validation_result['error']}\n")
        return "\n".join(report)
    
    if validation_result["valid"]:
        report.append("✅ VÁLIDO - Prompt atende todos os requisitos\n")
    else:
        report.append("❌ INVÁLIDO - Prompt não atende os requisitos\n")
    
    # Seções ausentes
    if validation_result["missing_sections"]:
        report.append("\n🔴 Seções Ausentes:")
        for section in validation_result["missing_sections"]:
            report.append(f"  - {section}")
    
    # Tipos inválidos
    if validation_result["invalid_types"]:
        report.append("\n🔴 Tipos Inválidos:")
        for error in validation_result["invalid_types"]:
            report.append(f"  - {error}")
    
    # Avisos
    if validation_result["warnings"]:
        report.append("\n⚠️  Avisos:")
        for warning in validation_result["warnings"]:
            report.append(f"  - {warning}")
    
    # Resumo
    total_sections = len(REQUIRED_SECTIONS)
    found_sections = total_sections - len(validation_result["missing_sections"])
    report.append(f"\n📊 Resumo: {found_sections}/{total_sections} seções encontradas")
    
    return "\n".join(report)


def validate_all_prompts(prompts_dir: Path) -> Dict[str, Dict]:
    """
    Validar todos os prompts em um diretório
    
    Returns:
        Dict com nome do prompt e resultado da validação
    """
    results = {}
    
    for prompt_file in prompts_dir.glob("*.md"):
        validation = validate_prompt_file(prompt_file)
        results[prompt_file.stem] = validation
    
    return results


if __name__ == "__main__":
    # Testar validação
    from pathlib import Path
    
    prompts_dir = Path(__file__).parent.parent / "modelos_prompts"
    
    if prompts_dir.exists():
        print("Validando prompts...\n")
        results = validate_all_prompts(prompts_dir)
        
        for prompt_name, validation in results.items():
            report = generate_validation_report(prompt_name, validation)
            print(report)
            print("\n" + "="*60 + "\n")
    else:
        print(f"Diretório não encontrado: {prompts_dir}")
