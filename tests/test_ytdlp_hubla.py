import subprocess
import json

url = "https://app.hub.la/m/rewBz3XuYUIFLxXbGazK/p/4y1Pl3qi"

# Tentar com yt-dlp
cmd = [
    "yt-dlp",
    "--dump-json",
    "--no-playlist",
    url
]

print("Testando yt-dlp...")
try:
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode == 0:
        data = json.loads(result.stdout)
        print(f"SUCESSO! URL encontrada: {data.get('url')}")
    else:
        print(f"FALHA: {result.stderr}")
except Exception as e:
    print(f"ERRO: {e}")
