
import os
import sys
import time
import json
from playwright.sync_api import sync_playwright

sys.path.append(os.getcwd())
# Mock credentials or import REAL ones
try:
    from extrator_videos.credential_manager import get_credentials
except ImportError:
    def get_credentials(url):
        return "mock@email.com", "mockpass"

TARGET_URL = "https://app.hub.la/m/rewBz3XuYUIFLxXbGazK/p/4y1Pl3qi"
LOG_DIR = "logs/deep_scan"
os.makedirs(LOG_DIR, exist_ok=True)

def deep_scan():
    print("=== DEEP SCAN DIAGNOSTIC ===")
    
    email, senha = get_credentials(TARGET_URL)
    if not email:
        print("[ERRO] Sem credenciais.")
        return

    with sync_playwright() as p:
        # Use HEADLESS=FALSE to rule out anti-bot/lazy-load issues
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
             user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
             viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()

        # 1. Login Logic (Direct Email)
        print("1. Logging in...")
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
                print("   Login submitted.")
                page.wait_for_timeout(5000)
            else:
                 print("   [WARN] Password field did not appear.")
        else:
             print("   [INFO] Maybe already logged in or diff page.")

        # 2. Go to Target
        print(f"2. Navigating to Target: {TARGET_URL}")
        page.goto(TARGET_URL, wait_until="domcontentloaded")
        page.wait_for_timeout(5000) # Initial wait
        
        # 3. Action: Scroll & Click Play to trigger load
        print("3. Interaction (Scroll + Play)...")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(1000)
        page.evaluate("window.scrollTo(0, 0)")
        
        # Try to find IFRAMES and print their URLs
        print("   Iframes found:")
        for fr in page.frames:
            print(f"   - {fr.url}")

        # 4. JS Resource Scan
        print("4. Scanning Performance Entries (JS)...")
        
        # Get all resource URLs loaded by the browser
        resources = page.evaluate("""() => {
            return performance.getEntries()
                .filter(e => e.entryType === 'resource')
                .map(e => e.name);
        }""")
        
        print(f"   Total resources found: {len(resources)}")
        
        # Filter for m3u8 or cloudflare
        found_res = [r for r in resources if "m3u8" in r or "cloudflarestream" in r]
        
        if found_res:
            print(f"[SUCESSO] Found {len(found_res)} suspect resources via JS Performance API:")
            for r in found_res:
                print(f"   MATCH: {r}")
        else:
            print("[FALHA] No video resources found in Performance API.")
            
        # 5. Dump full resource list for manual check
        with open(f"{LOG_DIR}/resources_list.txt", "w", encoding="utf-8") as f:
            for r in resources:
                f.write(r + "\n")
        print(f"   Full resource list saved to {LOG_DIR}/resources_list.txt")

        time.sleep(2)
        browser.close()
        print("=== DEEP SCAN COMPLETED ===")
        sys.stdout.flush()

if __name__ == "__main__":
    deep_scan()
