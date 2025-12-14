import re

def scrub(text: str) -> str:
    t = re.sub(r"[\w\.-]+@[\w\.-]+", "[email]", text)
    t = re.sub(r"\b\+?\d[\d\s\-\(\)]{7,}\b", "[telefone]", t)
    return t

def segments_to_topics(segments):
    full = " ".join([s["text"] for s in segments])
    full = scrub(full)
    blocks = []
    current = []
    last = 0
    for s in segments:
        current.append(s)
        if len(current) >= 10:
            blocks.append({"inicio": current[0]["start"], "fim": current[-1]["end"], "conteudo": " ".join([x["text"] for x in current])})
            current = []
    if current:
        blocks.append({"inicio": current[0]["start"], "fim": current[-1]["end"], "conteudo": " ".join([x["text"] for x in current])})
    return {"texto": full, "blocos": blocks}

def generate_orientacoes(texto: str, max_itens: int = 5):
    import re
    sents = re.split(r"(?<=[\.!?])\s+", texto)
    out = []
    seen = set()
    passo = 1
    for s in sents:
        t = s.strip()
        if not t:
            continue
        k = t.lower()
        if k in seen:
            continue
        seen.add(k)
        out.append({"passo": passo, "acao": t, "beneficio": "ganho de clareza e foco"})
        passo += 1
        if len(out) >= max_itens:
            break
    return out
