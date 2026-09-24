"""Repère la page de chaque titre/légende dans le PDF rendu et écrit pages.json."""
import json, re, subprocess, unicodedata

def norm(s):
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if c.isalnum())
    return s

def roman(n):
    vals = [(10, "x"), (9, "ix"), (5, "v"), (4, "iv"), (1, "i")]
    out = ""
    for v, r in vals:
        while n >= v:
            out += r; n -= v
    return out

heads = json.load(open("heads.json"))
npages = int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", "Memoire.pdf"], capture_output=True, text=True).stdout).group(1))
pages = []
for p in range(1, npages + 1):
    t = subprocess.run(["pdftotext", "-f", str(p), "-l", str(p), "-layout", "Memoire.pdf", "-"], capture_output=True, text=True).stdout
    lines = [norm(l) for l in t.split("\n") if "....." not in l]
    lines = [l for l in lines if l]
    # concaténation des lignes consécutives pour les titres sur plusieurs lignes
    pages.append(lines)

def find(h, start):
    key = norm(h["text"])[:70]
    for p in range(start, npages + 1):
        L = pages[p - 1]
        for i in range(len(L)):
            joined = "".join(L[i:i + 4])
            if joined.startswith(key) and (L[i] and key.startswith(L[i][:min(len(L[i]), len(key))])):
                return p
    return None

# page de début du corps = page de l'INTRODUCTION GÉNÉRALE
result = []
cur = 2
body_start = None
# on saute le sommaire (pages de la section front) : les titres front se cherchent après le sommaire
sommaire_end = 2
for p in range(2, npages + 1):
    if any(l.startswith(norm("DÉDICACE")) for l in pages[p - 1]) and not any(l.startswith("sommaire") for l in pages[p - 1]):
        sommaire_end = p; break
cur = sommaire_end
for h in heads:
    p = find(h, cur)
    if p is None:
        print("INTROUVABLE:", h["text"][:60]); result.append("?"); continue
    if h["kind"] == "front":
        result.append(roman(p - 1))  # la page de garde n'est pas numérotée ; le sommaire commence à i
    else:
        if body_start is None:
            body_start = p
        result.append(str(p - body_start + 1))
    cur = p
json.dump(result, open("pages.json", "w"))
print("début du corps : page PDF", body_start, "; entrées :", len(result))
print("dernière page du corps (conclusion) :", [r for h, r in zip(heads, result) if h["text"].startswith("RÉFÉRENCES")])
