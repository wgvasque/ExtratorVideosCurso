"""
Sistema de Carregamento Dinâmico de Prompts
Carrega e gerencia templates de prompts da pasta modelos_prompts
"""
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from .prompt_validator import validate_prompt_file, REQUIRED_SECTIONS


class PromptLoader:
    """Gerenciador de prompts dinâmicos"""
    
    def __init__(self, prompts_dir: Optional[Path] = None):
        """
        Inicializar loader
        
        Args:
            prompts_dir: Diretório com prompts (default: modelos_prompts)
        """
        if prompts_dir is None:
            # Usar diretório padrão
            self.prompts_dir = Path(__file__).parent.parent / "modelos_prompts"
        else:
            self.prompts_dir = Path(prompts_dir)
        
        self._cache = {}  # Cache de prompts carregados
        self._validation_cache = {}  # Cache de validações
    
    def list_available_prompts(self) -> List[Dict[str, Any]]:
        """
        Listar prompts disponíveis com informações de validação
        
        Returns:
            Lista de dicts com: name, file, valid, description, validation
        """
        prompts = []
        
        if not self.prompts_dir.exists():
            return prompts
        
        for prompt_file in sorted(self.prompts_dir.glob("*.md")):
            # Ignorar README e outros arquivos que não são prompts
            if prompt_file.stem.lower() in ['readme', 'index', 'template']:
                continue
            # Obter metadados
            metadata = self.get_prompt_metadata(prompt_file.stem)
            
            # Validar prompt
            validation = self.validate_prompt(prompt_file.stem)
            
            prompts.append({
                "name": prompt_file.stem,
                "file": prompt_file.name,
                "valid": validation.get("valid", False),
                "description": metadata.get("description", ""),
                "sections": len(REQUIRED_SECTIONS) - len(validation.get("missing_sections", [])),
                "validation": {
                    "valid": validation.get("valid", False),
                    "missing_sections": validation.get("missing_sections", []),
                    "warnings": validation.get("warnings", [])
                }
            })
        
        return prompts
    
    def load_prompt_template(self, prompt_name: str) -> Optional[str]:
        """
        Carregar template de prompt específico
        
        Args:
            prompt_name: Nome do prompt (sem extensão .md)
        
        Returns:
            Conteúdo do prompt ou None se não encontrado
        """
        # Verificar cache
        if prompt_name in self._cache:
            return self._cache[prompt_name]
        
        # Procurar arquivo
        prompt_file = self.prompts_dir / f"{prompt_name}.md"
        
        if not prompt_file.exists():
            return None
        
        try:
            content = prompt_file.read_text(encoding='utf-8')
            self._cache[prompt_name] = content
            return content
        except Exception as e:
            print(f"Erro ao carregar prompt {prompt_name}: {e}")
            return None
    
    def get_prompt_metadata(self, prompt_name: str) -> Dict[str, str]:
        """
        Extrair metadados do prompt
        
        Args:
            prompt_name: Nome do prompt
        
        Returns:
            Dict com: name, description, version
        """
        content = self.load_prompt_template(prompt_name)
        
        if not content:
            return {
                "name": prompt_name,
                "description": "",
                "version": "1.0"
            }
        
        # Extrair título (primeira linha com #)
        title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        title = title_match.group(1) if title_match else prompt_name
        
        # Extrair descrição (segundo parágrafo ou objetivo principal)
        desc_match = re.search(r'##\s+OBJETIVO PRINCIPAL\s*\n(.+?)(?:\n\n|---)', content, re.DOTALL)
        if not desc_match:
            desc_match = re.search(r'^##\s+.+?\n(.+?)(?:\n\n|---)', content, re.DOTALL | re.MULTILINE)
        
        description = desc_match.group(1).strip() if desc_match else ""
        description = description.replace('\n', ' ')[:200]  # Limitar tamanho
        
        # Extrair versão (se houver)
        version_match = re.search(r'"versao"\s*:\s*"([^"]+)"', content)
        version = version_match.group(1) if version_match else "1.0"
        
        return {
            "name": title,
            "description": description,
            "version": version
        }
    
    def validate_prompt(self, prompt_name: str) -> Dict[str, Any]:
        """
        Validar estrutura do prompt
        
        Args:
            prompt_name: Nome do prompt
        
        Returns:
            Resultado da validação
        """
        # Verificar cache
        if prompt_name in self._validation_cache:
            return self._validation_cache[prompt_name]
        
        # Validar
        prompt_file = self.prompts_dir / f"{prompt_name}.md"
        
        if not prompt_file.exists():
            return {
                "valid": False,
                "error": "Arquivo não encontrado",
                "missing_sections": list(REQUIRED_SECTIONS.keys()),
                "invalid_types": [],
                "warnings": []
            }
        
        validation = validate_prompt_file(prompt_file)
        self._validation_cache[prompt_name] = validation
        
        return validation
    
    def get_prompt_for_processing(self, prompt_name: str, transcription: str) -> Optional[str]:
        """
        Obter prompt formatado para processamento
        
        Args:
            prompt_name: Nome do prompt
            transcription: Transcrição do vídeo
        
        Returns:
            Prompt completo com transcrição inserida
        """
        template = self.load_prompt_template(prompt_name)
        
        if not template:
            return None
        
        # Substituir placeholder da transcrição
        # Procurar por [AQUI ENTRA A TRANSCRIÇÃO DO VÍDEO] ou similar
        placeholders = [
            r'\[AQUI ENTRA A TRANSCRIÇÃO DO VÍDEO\]',
            r'\[TRANSCRIÇÃO\]',
            r'\[TRANSCRICAO\]',
            r'\{transcription\}',
            r'\{TRANSCRIPTION\}'
        ]
        
        prompt = template
        for placeholder in placeholders:
            prompt = re.sub(placeholder, transcription, prompt, flags=re.IGNORECASE)
        
        return prompt
    
    def clear_cache(self):
        """Limpar cache de prompts"""
        self._cache.clear()
        self._validation_cache.clear()


# Instância global
_loader = None

def get_loader() -> PromptLoader:
    """Obter instância global do loader"""
    global _loader
    if _loader is None:
        _loader = PromptLoader()
    return _loader


def list_available_prompts() -> List[Dict[str, Any]]:
    """Atalho para listar prompts"""
    return get_loader().list_available_prompts()


def load_prompt_template(prompt_name: str) -> Optional[str]:
    """Atalho para carregar prompt"""
    return get_loader().load_prompt_template(prompt_name)


def get_prompt_metadata(prompt_name: str) -> Dict[str, str]:
    """Atalho para obter metadados"""
    return get_loader().get_prompt_metadata(prompt_name)


def validate_prompt(prompt_name: str) -> Dict[str, Any]:
    """Atalho para validar prompt"""
    return get_loader().validate_prompt(prompt_name)


def get_prompt_for_processing(prompt_name: str, transcription: str) -> Optional[str]:
    """Atalho para obter prompt formatado"""
    return get_loader().get_prompt_for_processing(prompt_name, transcription)


if __name__ == "__main__":
    # Testar loader
    loader = PromptLoader()
    
    print("Prompts disponíveis:\n")
    prompts = loader.list_available_prompts()
    
    for prompt in prompts:
        status = "✅" if prompt["valid"] else "❌"
        print(f"{status} {prompt['name']}")
        print(f"   Arquivo: {prompt['file']}")
        print(f"   Seções: {prompt['sections']}/14")
        if prompt['description']:
            print(f"   Descrição: {prompt['description'][:100]}...")
        if not prompt['valid']:
            print(f"   ⚠️  Faltam: {', '.join(prompt['validation']['missing_sections'][:3])}")
        print()
