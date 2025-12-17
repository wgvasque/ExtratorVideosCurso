import json
import os
import time
from typing import Optional, List
from playwright.sync_api import sync_playwright, Page
from .network_capture import NetworkCapture
from .instrumentation import init_scripts
from .antibot import context_args

class BrowserSession:
    def __init__(self, proxy: Optional[str] = None, cookies_path: Optional[str] = None, email: Optional[str] = None, senha: Optional[str] = None, initial_cookies: Optional[list] = None, headless: bool = False):
        self.proxy = proxy
        self.cookies_path = cookies_path
        self.email = email
        self.senha = senha
        self.initial_cookies = initial_cookies
        self.headless = headless
        self.play = None
        self.browser = None
        self.context = None
        self.page = None
        self.capture = NetworkCapture()
        self.ua = None

    def collect(self, url: str) -> NetworkCapture:
        self.play = sync_playwright().start()
        self.browser = self.play.chromium.launch(headless=self.headless)
        args = context_args(self.proxy)
        self.context = self.browser.new_context(**args)
        try:
            self.ua = args.get("user_agent")
        except Exception:
            self.ua = None
        if self.initial_cookies and isinstance(self.initial_cookies, list):
            try:
                self.context.add_cookies(self.initial_cookies)
            except Exception:
                pass
        if self.cookies_path and os.path.exists(self.cookies_path):
            try:
                with open(self.cookies_path, "r", encoding="utf-8") as f:
                    cookies = json.load(f)
                if isinstance(cookies, list):
                    self.context.add_cookies(cookies)
            except Exception:
                pass
        self.page = self.context.new_page()
        
        # Injetar scripts anti-detecção ANTES de qualquer navegação
        self.page.add_init_script("""
            // Mascarar webdriver
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            
            // Mascarar chrome automation
            window.navigator.chrome = {runtime: {}};
            
            // Mascarar permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
            
            // Mascarar plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            // Mascarar languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['pt-BR', 'pt', 'en-US', 'en']
            });
        """)
        
        for s in init_scripts():
            self.page.add_init_script(s)
            
        # Lógica de Login Automático
        if (not self.initial_cookies) and self.email and self.senha:
            if "segueadii.com.br" in url:
                try:
                    self.page.goto("https://alunos.segueadii.com.br/login", wait_until="domcontentloaded")
                    self.page.locator('input[type="email"]').first.fill(self.email)
                    self.page.locator('input[type="password"]').first.fill(self.senha)
                    self.page.locator('button, input[type="submit"]').first.click()
                    self.page.wait_for_load_state("networkidle")
                except Exception:
                    pass
            elif "hub.la" in url:
                try:
                    print(f"[DEBUG] Detectado Hub.la. Iniciando fluxo de login...")
                    # Forçar ida para página de login direto por email
                    self.page.goto("https://app.hub.la/signin/email", wait_until="domcontentloaded")
                    print(f"[DEBUG] Navegou para login direto. Título: {self.page.title()}")
                    
                    try:
                        self.page.wait_for_selector('input[type="email"], input[name="email"]', timeout=5000)
                    except:
                        pass
                    
                    if self.page.locator('input[type="email"], input[name="email"]').count() > 0:
                        print("[DEBUG] Input de email encontrado. Preenchendo email...")
                        self.page.locator('input[type="email"], input[name="email"]').first.fill(self.email)
                        self.page.wait_for_timeout(1000)
                        
                        # PASSO 1: Clicar em Continuar para ir para tela de senha
                        print("[DEBUG] Procurando botão Continuar...")
                        next_btn = self.page.locator('button[type="submit"], button:has-text("Continuar"), button:has-text("Continue"), button:has-text("Next")')
                        if next_btn.count() > 0:
                            print("[DEBUG] Clicando em Continuar...")
                            next_btn.first.click()
                            
                            # Aguardar campo de senha aparecer
                            print("[DEBUG] Aguardando campo de senha aparecer...")
                            try:
                                self.page.wait_for_selector('input[type="password"], input[name="password"]', timeout=10000)
                                print("[DEBUG] Campo de senha detectado!")
                            except:
                                print("[DEBUG] Timeout aguardando senha. Tentando continuar...")
                        
                        # PASSO 2: Preencher senha e fazer login
                        self.page.wait_for_timeout(1000)
                        if self.page.locator('input[type="password"], input[name="password"]').count() > 0:
                            print("[DEBUG] Preenchendo senha...")
                            self.page.locator('input[type="password"], input[name="password"]').first.fill(self.senha)
                            self.page.wait_for_timeout(500)
                            
                            print("[DEBUG] Clicando em Entrar...")
                            login_btn = self.page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login"), button:has-text("Sign in")')
                            if login_btn.count() > 0:
                                login_btn.first.click()
                                print(f"[DEBUG] Login submetido. Aguardando autenticação...")
                                
                                # Aguardar sair da página de login ou aparecer elemento de dashboard
                                try:
                                    self.page.wait_for_url(lambda u: "/signin" not in u, timeout=15000)
                                    print(f"[DEBUG] Navegação pós-login detectada. URL: {self.page.url}")
                                except:
                                    print(f"[AVISO] Timeout aguardando saída do login. URL atual: {self.page.url}")
                                
                                self.page.wait_for_timeout(3000)
                            
                            self.page.wait_for_load_state("networkidle")
                            
                            # Agora vai para a URL original do video
                            print(f"[DEBUG] Redirecionando para alvo: {url}")
                            self.page.goto(url, wait_until="networkidle", timeout=60000)
                            
                            # Aguardar o player de vídeo carregar (elemento source com cloudflarestream)
                            print("[DEBUG] Aguardando player de vídeo carregar...")
                            try:
                                self.page.wait_for_selector('source[src*="cloudflarestream"]', timeout=15000)
                                print("[DEBUG] Player de vídeo detectado!")
                            except:
                                print("[DEBUG] Timeout aguardando player. Tentando scroll...")
                            
                            # Scroll para ativar lazy load
                            print("[DEBUG] Scrollando página para ativar lazy load...")
                            self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                            self.page.wait_for_timeout(2000)
                            self.page.evaluate("window.scrollTo(0, 0)")
                            self.page.wait_for_timeout(2000)
                            
                            # Tentar clicar em botões de play grandes (comum em players)
                            print("[DEBUG] Procurando botões de play...")
                            try:
                                # Seletores comuns de play
                                play_btns = self.page.locator('button[class*="play"], div[class*="play"], .vjs-big-play-button')
                                if play_btns.count() > 0:
                                    print(f"[DEBUG] Encontrado(s) {play_btns.count()} botões de play. Clicando no primeiro visível...")
                                    for i in range(play_btns.count()):
                                        if play_btns.nth(i).is_visible():
                                            play_btns.nth(i).click(timeout=2000)
                                            print(f"[DEBUG] Clicou no botão de play {i}")
                                            self.page.wait_for_timeout(3000) # Dar tempo para o request iniciar
                                            break
                            except Exception as e:
                                print(f"[DEBUG] Erro ao tentar clicar play: {e}")
                        else:
                             print("[DEBUG] Campo de senha não apareceu.")
                    else:
                        print("[DEBUG] Input de email NÃO encontrado em signin/email. Já logado?")
                        self.page.goto(url, wait_until="networkidle")

                except Exception as e:
                    print(f"[AVISO] Tentativa de login Hub.la falhou: {e}")
                    # Tenta ir para URL original de qualquer jeito
                    self.page.goto(url, wait_until="networkidle")
        
        self.page.on("request", self.capture.on_request)
        self.page.on("response", self.capture.on_response)
        
        # Se urls diferentes, o goto acima já resolveu, mas por garantia:
        if self.page.url != url:
             self.page.goto(url, wait_until="networkidle", timeout=120000)

        try:
            flag = self.page.evaluate("() => window.__drmDetected ? 'drm' : null")
            if flag:
                self.capture.flags["drm"] = flag
        except Exception:
            pass
        return self.capture

    def cookies_header_for(self, url: str) -> str:
        try:
            cookies = self.context.cookies(url)
            parts = []
            for c in cookies:
                parts.append(f"{c['name']}={c['value']}")
            return "; ".join(parts)
        except Exception:
            return ""

    def user_agent(self) -> Optional[str]:
        return self.ua

    def close(self):
        try:
            if self.context:
                self.context.close()
            if self.browser:
                self.browser.close()
            if self.play:
                self.play.stop()
        except Exception:
            pass
