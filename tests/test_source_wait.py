import os
import sys
import time
from playwright.sync_api import sync_playwright

sys.path.append(os.getcwd())
from extrator_videos.credential_manager import get_credentials

TARGET_URL = "https://app.hub.la/m/rewBz3XuYUIFLxXbGazK/p/4y1Pl3qi"
LOG_DIR = "logs/screenshots"
os.makedirs(LOG_DIR, exist_ok=True)

def test_wait():
    print("=== TESTE: Aguardar elemento <source> ===")
    
    email, senha = get_credentials(TARGET_URL)
    if not email:
        print("[ERRO] Sem credenciais.")
        return

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
             user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        # Login
        print("1. Fazendo login...")
        page.goto("https://app.hub.la/signin/email")
        page.wait_for_timeout(2000)
        
        if page.locator('input[type="email"]').count() > 0:
            page.locator('input[type="email"]').first.fill(email)
            next_btn = page.locator('button[type="submit"], button:has-text("Continuar")')
            if next_btn.count() > 0:
                 next_btn.first.click()
                 page.wait_for_timeout(2000)
            
            if page.locator('input[type="password"]').count() > 0:
                page.locator('input[type="password"]').first.fill(senha)
                page.locator('button[type="submit"], button:has-text("Entrar")').first.click()
                print("   Login enviado. Aguardando...")
                
                # Aguardar sair do login
                try:
                    page.wait_for_url(lambda u: "/signin" not in u, timeout=15000)
                    print(f"   Saiu do login. URL: {page.url}")
                except:
                    print(f"   Timeout. URL atual: {page.url}")
                
                page.wait_for_timeout(3000)

        # Navegar para vídeo
        print(f"2. Navegando para: {TARGET_URL}")
        page.goto(TARGET_URL, wait_until="domcontentloaded")
        page.wait_for_timeout(3000)
        
        print(f"   URL final: {page.url}")
        print(f"   Título: {page.title()}")
        
        # Tentar encontrar o elemento source
        print("3. Procurando elemento <source>...")
        try:
            page.wait_for_selector('source[src*="cloudflarestream"]', timeout=15000)
            print("   [SUCESSO] Elemento <source> encontrado!")
            
            # Pegar o src
            src = page.locator('source[src*="cloudflarestream"]').first.get_attribute('src')
            print(f"   SRC: {src}")
            
        except Exception as e:
            print(f"   [FALHA] Não encontrou: {e}")
            
            # Verificar se há algum source
            all_sources = page.locator('source').count()
            print(f"   Total de elementos <source>: {all_sources}")
            
            if all_sources > 0:
                for i in range(all_sources):
                    src = page.locator('source').nth(i).get_attribute('src')
                    print(f"   Source {i}: {src}")
        
        page.screenshot(path=f"{LOG_DIR}/test_final.png")
        time.sleep(2)
        browser.close()

if __name__ == "__main__":
    test_wait()
