"""
Script para processar vídeo imediatamente após captura
Evita problemas de token expirado
"""
import sys
import json
from pathlib import Path

# Carregar manifests
manifests_file = Path(__file__).parent.parent / 'captured_manifests.json'

with open(manifests_file, 'r', encoding='utf-8') as f:
    manifests = json.load(f)

if not manifests:
    print("❌ Nenhum manifest capturado!")
    print("   1. Acesse vídeo no Hub.la")
    print("   2. Dê play")
    print("   3. Execute este script novamente")
    sys.exit(1)

# Pegar manifest mais recente
latest_url = max(manifests.items(), key=lambda x: x[1]['captured_at'])
page_url, data = latest_url
manifest_url = data['manifestUrl']

print("=" * 80)
print("PROCESSANDO VÍDEO MAIS RECENTE")
print("=" * 80)
print(f"Página: {page_url}")
print(f"Capturado: {data['captured_at']}")
print(f"Manifest: {manifest_url[:80]}...")
print("=" * 80)

# Processar
import subprocess
cmd = [
    sys.executable,
    '-m', 'extrator_videos.cli',
    page_url
]

print("\n🚀 Iniciando processamento...")
result = subprocess.run(cmd, cwd=Path(__file__).parent.parent)

if result.returncode == 0:
    print("\n✅ Processamento concluído com sucesso!")
else:
    print(f"\n❌ Erro no processamento (código: {result.returncode})")
    sys.exit(result.returncode)
