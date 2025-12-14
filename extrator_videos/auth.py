import re
import logging
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"

def validate_credentials(email: str, senha: str) -> bool:
    if not email or not senha:
        return False
    if len(email) > 256 or len(senha) > 512:
        return False
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return False
    return True

def programmatic_login(target_url: str, email: str, senha: str):
    try:
        if not validate_credentials(email, senha):
            logging.error("Credenciais inválidas")
            return None
        parsed = urlparse(target_url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        login_url = urljoin(base, "/login")
        sess = requests.Session()
        sess.headers.update({"User-Agent": UA, "Referer": base})
        r = sess.get(login_url, timeout=20)
        if r.status_code >= 400:
            logging.error("Falha ao carregar página de login")
            return None
        soup = BeautifulSoup(r.text, "html.parser")
        form = None
        for f in soup.find_all("form"):
            inputs = f.find_all("input")
            has_email = any((i.get("type") == "email") or (i.get("name") and "email" in i.get("name").lower()) for i in inputs)
            has_pass = any((i.get("type") == "password") or (i.get("name") and "pass" in i.get("name").lower()) for i in inputs)
            if has_email and has_pass:
                form = f
                break
        if not form:
            logging.error("Formulário de login não encontrado")
            return None
        action = form.get("action") or "/login"
        post_url = urljoin(base, action)
        payload = {}
        for i in form.find_all("input"):
            name = i.get("name")
            if not name:
                continue
            val = i.get("value") or ""
            t = i.get("type") or "text"
            nlow = name.lower()
            if t == "email" or "email" in nlow:
                payload[name] = email
            elif t == "password" or "pass" in nlow:
                payload[name] = senha
            else:
                payload[name] = val
        pr = sess.post(post_url, data=payload, timeout=20, allow_redirects=True)
        if pr.status_code >= 400:
            logging.error("Falha na autenticação")
            return None
        test = sess.get(target_url, timeout=20, allow_redirects=True)
        if test.status_code >= 400 or ("login" in test.url.lower()):
            logging.error("Sessão não autenticada")
            return None
        cookies = []
        host = parsed.hostname
        for c in sess.cookies:
            cookies.append({
                "name": c.name,
                "value": c.value,
                "domain": c.domain or host,
                "path": c.path or "/",
                "httpOnly": False,
                "secure": True,
            })
        logging.info("Autenticação programática bem-sucedida")
        return cookies
    except Exception:
        logging.error("Erro durante autenticação programática")
        return None
