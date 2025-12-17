
import os

path = r"d:\Cursor\ExtratorVideosCurso\sumarios\alunos.segueadii.com.br\7081703\render\Aula_4__Como_Criar_uma_Bio_que_Atrai_Fãs_Obcecados_-_segueadi_20251214_142026.html"

if not os.path.exists(path):
    # Fallback search
    d = os.path.dirname(path)
    files = [f for f in os.listdir(d) if f.endswith('.html') and '_v2' not in f]
    if files: path = os.path.join(d, files[0])

print(f"Reading {path}")
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

found_url = False
found_model = False
found_trans = False

for i, line in enumerate(lines):
    if "URL" in line or "Original" in line:
        print(f"URL Candidate L{i}: {line.strip()[:200]}")
    if "Model" in line or "IA" in line or "Gemini" in line:
        print(f"Model Candidate L{i}: {line.strip()[:200]}")
    if "Transcrição" in line:
        print(f"Transcription Candidate L{i}: {line.strip()[:200]}")
        # Print subsequent structure
        for j in range(1, 15):
             if i+j < len(lines):
                 print(f"  +{j}: {lines[i+j].strip()[:200]}")
        break  # Assumption: transcription is the last major thing
