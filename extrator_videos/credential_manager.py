import json
import os
import logging
from typing import Tuple, Optional, Dict
from urllib.parse import urlparse

# Caminho para o arquivo de contas relativo à raiz do projeto
ACCOUNTS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "accounts.json")

def load_accounts() -> Dict:
    """Carrega o arquivo accounts.json se existir."""
    if not os.path.exists(ACCOUNTS_FILE):
        return {}
    
    try:
        with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Erro ao carregar accounts.json: {e}")
        return {}

def get_credentials(url: str, default_email: str = None, default_pass: str = None) -> Tuple[Optional[str], Optional[str]]:
    """
    Retorna (email, senha) para um dado domínio.
    Prioridade:
    1. accounts.json (correspondência exata de domínio)
    2. accounts.json (correspondência parcial de domínio - experimental)
    3. Variáveis de ambiente / Argumentos passados (fallback)
    """
    accounts = load_accounts()
    
    if not url:
        return default_email, default_pass

    try:
        parsed = urlparse(url)
        domain = parsed.netloc
        
        # 1. Correspondência exata
        if domain in accounts:
            logging.info(f"Usando credenciais específicas para: {domain}")
            creds = accounts[domain]
            return creds.get("email"), creds.get("password")
            
        # 2. Busca por subdomínio (ex: se accounts tem 'hub.la' e url é 'app.hub.la')
        # ou vice-versa, busca simples
        for registered_domain, creds in accounts.items():
            if registered_domain in domain or domain in registered_domain:
                 logging.info(f"Usando credenciais correspondentes para: {registered_domain} (URL: {domain})")
                 return creds.get("email"), creds.get("password")
                 
    except Exception as e:
        logging.error(f"Erro ao resolver credenciais: {e}")
        
    # 3. Fallback para o padrão (.env ou args)
    return default_email, default_pass
