from typing import Optional
from playwright.sync_api import sync_playwright
from .network_capture import NetworkCapture
from .instrumentation import init_scripts
from .antibot import context_args
import json
import os

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
        for s in init_scripts():
            self.page.add_init_script(s)
        if (not self.initial_cookies) and self.email and self.senha and "segueadii.com.br" in url:
            try:
                self.page.goto("https://alunos.segueadii.com.br/login", wait_until="domcontentloaded")
                self.page.locator('input[type="email"]').first.fill(self.email)
                self.page.locator('input[type="password"]').first.fill(self.senha)
                self.page.locator('button, input[type="submit"]').first.click()
                self.page.wait_for_load_state("networkidle")
            except Exception:
                pass
        self.page.on("request", self.capture.on_request)
        self.page.on("response", self.capture.on_response)
        self.page.goto(url, wait_until="networkidle")
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
