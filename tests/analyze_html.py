
import os
from bs4 import BeautifulSoup

LOG_FILE = "logs/screenshots/login_dump.html"

if not os.path.exists(LOG_FILE):
    print("File not found.")
    exit(1)

with open(LOG_FILE, "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")

print(f"Title: {soup.title.string if soup.title else 'No Title'}")
print(f"Body length: {len(str(soup.body))}")

iframes = soup.find_all("iframe")
print(f"Iframes found: {len(iframes)}")
for i, f in enumerate(iframes):
    print(f"  Iframe {i}: src={f.get('src')}")

inputs = soup.find_all("input")
print(f"Inputs found (BS4): {len(inputs)}")
for i, inp in enumerate(inputs):
    print(f"  Input {i}: {inp}")

print("Text snippet:")
print(soup.get_text()[:500].replace("\n", " "))
