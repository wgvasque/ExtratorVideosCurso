
import os
import sys
import time
from playwright.sync_api import sync_playwright

TARGET_URL = "https://app.hub.la/signin"

def debug_text():
    print("=== Debug Page Text ===")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(TARGET_URL)
        time.sleep(5)
        
        print(f"Title: {page.title()}")
        print("--- Text Content ---")
        text = page.locator("body").inner_text()
        print(text[:1000])
        print("--------------------")
        
        # Check specific strings
        if "human" in text.lower() or "robot" in text.lower():
            print("[ALERT] Possible Antibot detected")
        if "loading" in text.lower():
            print("[ALERT] Page might still be loading")
            
        browser.close()

if __name__ == "__main__":
    debug_text()
