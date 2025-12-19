
import os

path = r"d:\Cursor\ExtratorVideosCurso\sumarios\alunos.segueadii.com.br\7081703\render\Aula_4__Como_Criar_uma_Bio_que_Atrai_Fãs_Obcecados_-_segueadi_20251214_142026.html"

if not os.path.exists(path):
    print(f"File not found: {path}")
    # try locating any html
    d = r"d:\Cursor\ExtratorVideosCurso\sumarios\alunos.segueadii.com.br\7081703\render"
    files = [f for f in os.listdir(d) if f.endswith('.html') and '_v2' not in f]
    if files:
        path = os.path.join(d, files[0])
        print(f"Using found file: {path}")
    else:
        print("No file found.")
        exit(1)

try:
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    print("--- HEAD START ---")
    print(c[:3000])
    print("--- HEAD END ---")
    
    print("--- TRANS START ---")
    idx = c.find("Transcrição") # or "Transcrição Completa"
    if idx != -1:
        print(c[idx:idx+2000])
    else:
        print("Transcription not found string")
    print("--- TRANS END ---")
except Exception as e:
    print(e)
