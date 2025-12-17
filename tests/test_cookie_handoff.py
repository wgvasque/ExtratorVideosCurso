
import os
import yt_dlp
import logging
from dotenv import load_dotenv
import sys
sys.path.append(os.getcwd())
from extrator_videos.auth import programmatic_login

# Carregar variáveis
load_dotenv()
EMAIL = os.getenv("EMAIL")
SENHA = os.getenv("SENHA")
URL = "https://alunos.segueadii.com.br/area/produto/item/7033466"

logging.basicConfig(level=logging.INFO)

def run_test():
    print("[1/2] Efetuando login via auth.programmatic_login...")
    
    # Tentar login
    cookies_list = programmatic_login(URL, EMAIL, SENHA)
    
    if not cookies_list:
        print("[FALHA] Não foi possível obter cookies via login programático (requests).")
        print("Isso indica que o site provavelmente exige JavaScript para login ou tem proteção anti-bot que o 'requests' não passa.")
        return

    print(f"[SUCESSO] Cookies obtidos: {len(cookies_list)}")
    
    # Converter para formato que o yt-dlp entenda (dict simples ou cookie jar)
    # yt-dlp aceita cookies como string 'key=value; key2=value2' no header, mas vamos tentar via manipulador interno se possível.
    # A maneira mais fácil via Python é passar headers com Cookie string.
    
    cookie_str = "; ".join([f"{c['name']}={c['value']}" for c in cookies_list])
    
    print("\n[2/2] Tentando yt-dlp com os cookies injetados...")
    
    ydl_opts = {
        'quiet': False,
        'no_warnings': False,
        'extract_flat': True,
        'ignoreerrors': True,
        'http_headers': {
            'Cookie': cookie_str,
            'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        }
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"Analisando URL: {URL}")
            info = ydl.extract_info(URL, download=False)
            
            print("\n>>> RESULTADO DO YT-DLP <<<")
            if info:
                print(f"Título: {info.get('title')}")
                print(f"Extrator: {info.get('extractor')}")
                # Verificar se encontrou video real
                if not info.get('title') and info.get('extractor') == 'generic':
                    print("ANÁLISE: O yt-dlp acesso a página, mas não encontrou o vídeo (Título None).")
                else:
                    print("ANÁLISE: Sucesso! O yt-dlp encontrou os dados.")
            else:
                print("Nada retornado pelo yt-dlp.")
                
    except Exception as e:
        print(f"Erro no yt-dlp: {e}")

if __name__ == "__main__":
    run_test()
