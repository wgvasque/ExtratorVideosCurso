"""
Script para baixar vídeo do Hub.la usando Playwright
Utiliza a sessão autenticada do navegador para bypass do 401
"""
import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv()

async def download_video_from_hubla():
    """Baixa vídeo do Hub.la usando Playwright"""
    
    # Carregar manifest capturado
    project_root = Path(__file__).parent.parent
    manifests_file = project_root / 'captured_manifests.json'
    
    if not manifests_file.exists():
        print("❌ Nenhum manifest capturado")
        return
    
    with open(manifests_file, 'r') as f:
        manifests = json.load(f)
    
    if not manifests:
        print("❌ Arquivo de manifests vazio")
        return
    
    # Pegar o mais recente
    page_url = list(manifests.keys())[-1]
    manifest_data = manifests[page_url]
    manifest_url = manifest_data['manifestUrl']
    
    print(f"📹 Página: {page_url}")
    print(f"📺 Manifest: {manifest_url[:80]}...")
    
    async with async_playwright() as p:
        # Usar Chrome com perfil persistente para manter login
        browser = await p.chromium.launch(
            headless=False,  # Visível para debug
            channel="chrome"  # Usar Chrome instalado
        )
        
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        
        page = await context.new_page()
        
        print("🔐 Fazendo login no Hub.la...")
        
        # Ir para login
        await page.goto("https://hub.la/signin")
        await page.wait_for_load_state("networkidle")
        
        # Verificar se já está logado ou precisa fazer login
        if "signin" in page.url:
            email = os.getenv("HUBLA_EMAIL")
            password = os.getenv("HUBLA_PASSWORD")
            
            if not email or not password:
                print("❌ Configure HUBLA_EMAIL e HUBLA_PASSWORD no .env")
                await browser.close()
                return
            
            # Preencher login
            await page.fill('input[type="email"]', email)
            await page.fill('input[type="password"]', password)
            await page.click('button[type="submit"]')
            
            await page.wait_for_timeout(5000)
            print("✅ Login realizado")
        
        # Ir para página do vídeo
        print(f"📄 Acessando: {page_url}")
        await page.goto(page_url)
        await page.wait_for_load_state("networkidle")
        await page.wait_for_timeout(3000)
        
        # Tentar acessar o manifest direto
        print("🎬 Testando acesso ao manifest...")
        response = await page.request.get(manifest_url)
        
        if response.status == 200:
            print("✅ Manifest acessível! Token válido.")
            
            # Salvar manifest para análise
            content = await response.text()
            output_file = project_root / "temp_manifest.m3u8"
            with open(output_file, 'w') as f:
                f.write(content)
            print(f"📁 Manifest salvo em: {output_file}")
            
            # Extrair cookies para FFmpeg
            cookies = await context.cookies()
            cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies])
            
            print("\n🍪 Cookies para FFmpeg:")
            print(f"   {cookie_str[:100]}...")
            
            # Salvar cookies
            cookies_file = project_root / "hubla_cookies.txt"
            with open(cookies_file, 'w') as f:
                for c in cookies:
                    domain = c.get('domain', '')
                    f.write(f"{domain}\tTRUE\t/\tFALSE\t0\t{c['name']}\t{c['value']}\n")
            print(f"📁 Cookies salvos em: {cookies_file}")
            
        else:
            print(f"❌ Erro ao acessar manifest: {response.status}")
        
        await browser.close()
        print("✅ Concluído!")

if __name__ == "__main__":
    asyncio.run(download_video_from_hubla())
