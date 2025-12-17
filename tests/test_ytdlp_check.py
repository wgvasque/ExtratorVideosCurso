
import yt_dlp
import sys
import logging
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurar logs
logging.basicConfig(level=logging.DEBUG)

url = "https://alunos.segueadii.com.br/area/produto/item/7033466"
email = os.getenv("EMAIL")
senha = os.getenv("SENHA")

print(f"Testing yt-dlp support for: {url}")
print(f"Using credentials: {email} / {'*' * len(senha) if senha else 'None'}")

ydl_opts = {
    'quiet': False,
    'no_warnings': False,
    'extract_flat': True, # Tentar extrair apenas info sem baixar primeiro
    'ignoreerrors': True,
    'username': email,
    'password': senha,
}

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        if info:
            print("[SUCCESS] yt-dlp found info:")
            print(f"Title: {info.get('title')}")
            print(f"Extractor: {info.get('extractor')}")
        else:
            print("[FAILURE] yt-dlp returned no info object.")
except Exception as e:
    print(f"[ERROR] yt-dlp failed: {e}")
