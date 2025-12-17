
import os
import sys
import time
from playwright.sync_api import sync_playwright

sys.path.append(os.getcwd())
try:
    from extrator_videos.credential_manager import get_credentials
except ImportError:
    def get_credentials(url):
        return "mock@email.com", "mockpass"

TARGET_URL = "https://app.hub.la/m/rewBz3XuYUIFLxXbGazK/p/4y1Pl3qi"
LOG_DIR = "logs/screenshots"

def debug_login():
    print("=== Iniciando Debug de Login Hub.la (Direct Email Page) ===")
    
    # 1. Verificar Credenciais
    print("1. Buscando credenciais...")
    email, senha = get_credentials(TARGET_URL)
    
    if not email or not senha:
        print("[ERRO] Credenciais não encontradas! Verifique o accounts.json")
        return
    
    print(f"[OK] Credenciais encontradas: Email={email[:3]}***")
    
    # 2. Iniciar Browser
    print("2. Iniciando Browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        
        try:
            # Setup Detailed Network Logging
            network_log = open(f"{LOG_DIR}/network_requests.log", "w", encoding="utf-8")
            
            def on_request(request):
                try:
                    network_log.write(f"{request.method} {request.url}\n")
                    if "cloudflarestream" in request.url:
                        print(f"   [NETWORK MATCH] Found Cloudflare request: {request.url}")
                except:
                    pass
            
            page.on("request", on_request)

            # 3. Navegar para Login Direto
            LOGIN_URL = "https://app.hub.la/signin/email"
            print(f"3. Navegando para LOGIN: {LOGIN_URL}")
            page.goto(LOGIN_URL, wait_until="domcontentloaded")
            time.sleep(5)
            
            print(f"   Título atual: {page.title()}")
            print(f"   URL atual: {page.url}")
            page.screenshot(path=f"{LOG_DIR}/1_login_page.png")
            
            # 4. Tentar Login
            print("4. Procurando campos de login...")
            
            if page.locator('input[type="email"], input[name="email"]').count() > 0:
                print("   [OK] Email encontrado na página de login.")
                page.locator('input[type="email"], input[name="email"]').first.fill(email)
                page.screenshot(path=f"{LOG_DIR}/2_email_filled.png")
                
                # Check password field logic (if not present, click 'Next')
                if page.locator('input[type="password"], input[name="password"]').count() == 0:
                     btns = page.locator('button[type="submit"], button:has-text("Continuar"), button:has-text("Next")')
                     if btns.count() > 0:
                         btns.first.click()
                         # Wait for password field to appear
                         try:
                             page.wait_for_selector('input[type="password"], input[name="password"]', timeout=5000)
                         except:
                             print("   [AVISO] Timeout esperando campo de senha.")
                
                if page.locator('input[type="password"], input[name="password"]').count() > 0:
                    page.locator('input[type="password"], input[name="password"]').first.fill(senha)
                    page.screenshot(path=f"{LOG_DIR}/3_password_filled.png")
                    
                    page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first.click()
                    
                    print("   Submetendo login... Aguardando navegação.")
                    try:
                        page.wait_for_load_state("networkidle", timeout=15000)
                    except:
                        pass
                    time.sleep(3)
                        
                    print(f"   URL Após login: {page.url}")
                    
                    # 5. Navegar para ALVO
                    print(f"5. Navegando para o ALVO: {TARGET_URL}")
                    page.goto(TARGET_URL, wait_until="domcontentloaded")
                    time.sleep(5)
                    print(f"   URL Final: {page.url}")
                    print(f"   Título Final: {page.title()}")
                    page.screenshot(path=f"{LOG_DIR}/5_target_page.png")
                    
                    content = page.content()
                    found_cf = False
                    
                    # Dump main page
                    with open(f"{LOG_DIR}/main_page.html", "w", encoding="utf-8") as f:
                        f.write(content)
                        
                    if "cloudflarestream" in content:
                         print("   [SUCESSO] Cloudflare found in MAIN FRAME!")
                         found_cf = True
                    else:
                         print(f"   [AVISO] Cloudflare link não visível na MAIN FRAME. Verificando {len(page.frames)} frames...")
                         for i, frame in enumerate(page.frames):
                             try:
                                 fc = frame.content()
                                 # Dump frame
                                 with open(f"{LOG_DIR}/frame_{i}.html", "w", encoding="utf-8") as f:
                                     f.write(fc)
                                     
                                 if "cloudflarestream" in fc:
                                     print(f"   [SUCESSO] Cloudflare found in FRAME {i}: {frame.url}")
                                     found_cf = True
                                     import re
                                     matches = re.findall(r'https://[a-zA-Z0-9-]+\.cloudflarestream\.com/.+/manifest/video\.m3u8', fc)
                                     if matches:
                                         print(f"   [MATCH] {matches[0]}")
                                     break
                             except Exception as e:
                                 print(f"   Erro frame {i}: {e}")
                    
                    if not found_cf:
                        print("   [FALHA] Link Cloudflare não encontrado em nenhum lugar.")
                else:
                    print("   [ERRO] Senha não encontrada.")
            else:
                print("   [ERRO] Email não encontrado na página de login direto.")
                print(f"   DUMPING HTML para: {LOG_DIR}/login_dump.html")
                with open(f"{LOG_DIR}/login_dump.html", "w", encoding="utf-8") as f:
                    f.write(page.content())

        except Exception as e:
            print(f"[EXCEPTION] Erro fatal durante debug: {e}")
            page.screenshot(path=f"{LOG_DIR}/99_exception.png")
        
        finally:
            browser.close()

if __name__ == "__main__":
    debug_login()
