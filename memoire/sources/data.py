"""Génère le jeu de données de l'échantillon (100 EPE) et calcule toutes les statistiques."""
import json, random, csv
import numpy as np
from scipy import stats

rng = random.Random(2026)
N = 100

# ---- Profils (marges fixées) ----
serie_level = {  # série -> (NA, ECA, A)
    "A4": (24, 17, 5),
    "D": (10, 19, 12),
    "C/E": (2, 6, 5),
}
sexe_level = {"H": (21, 26, 14), "F": (15, 16, 8)}
# notes (quart de point) par niveau
level_scores = {
    "NA": [0.0] * 6 + [0.25] * 10 + [0.5] * 20,
    "ECA": [0.75] * 23 + [1.0] * 19,
    "A": [1.25] * 14 + [1.5] * 8,
}

# Construire les EPE : série et niveau, puis attribuer sexe cohérent avec marges sexe x niveau
rows = []
for s, (na, eca, a) in serie_level.items():
    for lv, k in (("NA", na), ("ECA", eca), ("A", a)):
        for _ in range(k):
            rows.append({"serie": s, "niveau": lv})
rng.shuffle(rows)
for lv in ("NA", "ECA", "A"):
    idx = [i for i, r in enumerate(rows) if r["niveau"] == lv]
    li = ["NA", "ECA", "A"].index(lv)
    sx = ["H"] * sexe_level["H"][li] + ["F"] * sexe_level["F"][li]
    rng.shuffle(sx)
    for i, x in zip(idx, sx):
        rows[i]["sexe"] = x
    sc = level_scores[lv][:]
    # les séries scientifiques obtiennent plutôt les notes hautes du niveau
    idx_sorted = sorted(idx, key=lambda i: ({"A4": 0, "D": 1, "C/E": 2}[rows[i]["serie"]] + rng.random() * 1.6))
    sc.sort()
    for i, v in zip(idx_sorted, sc):
        rows[i]["note"] = v
ages = ["20-24"] * 34 + ["25-29"] * 47 + ["30 et +"] * 19
rng.shuffle(ages)
for r, a in zip(rows, ages):
    r["age"] = a
rng.shuffle(rows)
for k, r in enumerate(rows):
    r["id"] = f"EPE-{k+1:03d}"

# ---- Items de l'exercice Notion B ----
# I1 représentation (0,25) ; I2 comparaison (0,25) ; I3 équivalence/simplification (0,25)
# I4 addition dénominateurs différents (0,50 ; partiel 0,25) ; I5 problème fraction-opérateur (0,25)
ease = {"I1": 2.2, "I3": 1.6, "I2": 1.1, "I4": 0.9, "I5": 0.7}
units = [("I1", 1), ("I2", 1), ("I3", 1), ("I4a", 1), ("I4b", 1), ("I5", 1)]  # 6 quarts de point
for r in rows:
    k = int(round(r["note"] / 0.25))
    w = {"I1": ease["I1"], "I2": ease["I2"], "I3": ease["I3"], "I4a": ease["I4"] * 1.1, "I4b": ease["I4"] * 0.55, "I5": ease["I5"]}
    chosen = set()
    avail = list(w.keys())
    while len(chosen) < k:
        cand = [u for u in avail if u not in chosen and (u != "I4b" or "I4a" in chosen)]
        tot = sum(w[u] for u in cand)
        x = rng.random() * tot
        for u in cand:
            x -= w[u]
            if x <= 0:
                chosen.add(u)
                break
    r["I1"] = 0.25 if "I1" in chosen else 0
    r["I2"] = 0.25 if "I2" in chosen else 0
    r["I3"] = 0.25 if "I3" in chosen else 0
    r["I4"] = 0.25 * (("I4a" in chosen) + ("I4b" in chosen))
    r["I5"] = 0.25 if "I5" in chosen else 0

# ---- Codage des erreurs (Outil 2B) ----
for r in rows:
    r["E1"] = int(r["I2"] == 0 and rng.random() < 0.88)            # interférence du modèle entier
    r["E2"] = int(r["I4"] < 0.5 and rng.random() < (0.72 if r["I4"] == 0 else 0.30))  # (a+c)/(b+d)
    r["E3"] = int(r["I1"] == 0 and rng.random() < 0.90)            # conversion sémiotique
    r["E4"] = int(r["I5"] == 0 and rng.random() < 0.62)            # fraction-opérateur mal interprétée
    r["E5"] = int(r["I3"] == 0 and rng.random() < 0.70)            # simplification erronée (soustraction)
    r["NR"] = int(r["note"] <= 0.25 and rng.random() < 0.55)       # au moins une non-réponse

# ---- Fiches pédagogiques (Outil 1) : marges fixées, corrélées au niveau ----
crit_marg = {"C1": (69, 21, 10), "C2": (18, 47, 35), "C3": (52, 34, 14), "C4": (23, 49, 28)}
noise = {"C1": 1.3, "C2": 0.35, "C3": 0.9, "C4": 0.9}
for c, (z, p, f) in crit_marg.items():
    lat = sorted(range(N), key=lambda i: rows[i]["note"] / 1.5 + rng.gauss(0, noise[c]))
    vals = [0] * z + [1] * p + [2] * f
    for i, v in zip(lat, vals):
        rows[i][c] = v
lat = sorted(range(N), key=lambda i: rows[i]["C1"] + rows[i]["C3"] + rng.gauss(0, 0.9))
for rank, i in enumerate(lat):
    rows[i]["MAT"] = int(rank >= 74)  # 26 fiches prévoient du matériel de manipulation
for r in rows:
    r["fiche"] = r["C1"] + r["C2"] + r["C3"] + r["C4"]
    r["qualite"] = "Insuffisante" if r["fiche"] <= 3 else ("Acceptable" if r["fiche"] <= 5 else "Conforme")

with open("echantillon_100_EPE.csv", "w", newline="", encoding="utf-8") as fh:
    keys = ["id", "sexe", "age", "serie", "note", "niveau", "I1", "I2", "I3", "I4", "I5", "E1", "E2", "E3", "E4", "E5", "NR", "C1", "C2", "C3", "C4", "MAT", "fiche", "qualite"]
    wr = csv.DictWriter(fh, fieldnames=keys)
    wr.writeheader()
    for r in rows:
        wr.writerow({k: r[k] for k in keys})

# ---- Statistiques ----
out = {}
def cnt(key, vals):
    return {v: sum(1 for r in rows if r[key] == v) for v in vals}
out["sexe"] = cnt("sexe", ["H", "F"])
out["age"] = cnt("age", ["20-24", "25-29", "30 et +"])
out["serie"] = cnt("serie", ["A4", "D", "C/E"])
out["notes"] = {str(v): sum(1 for r in rows if r["note"] == v) for v in [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5]}
notes = np.array([r["note"] for r in rows])
out["moy"] = float(notes.mean()); out["et"] = float(notes.std(ddof=1)); out["med"] = float(np.median(notes))
out["mode"] = float(stats.mode(notes, keepdims=False).mode)
out["q1"] = float(np.percentile(notes, 25)); out["q3"] = float(np.percentile(notes, 75))
out["niveau"] = cnt("niveau", ["NA", "ECA", "A"])
for it in ["I1", "I2", "I3", "I5"]:
    out[it] = sum(1 for r in rows if r[it] > 0)
out["I4_full"] = sum(1 for r in rows if r["I4"] == 0.5)
out["I4_part"] = sum(1 for r in rows if r["I4"] == 0.25)
out["I4_zero"] = sum(1 for r in rows if r["I4"] == 0)
for e in ["E1", "E2", "E3", "E4", "E5", "NR"]:
    out[e] = sum(r[e] for r in rows)
out["obst_any"] = sum(1 for r in rows if r["E1"] or r["E2"] or r["E3"])
out["nb_err"] = {str(k): sum(1 for r in rows if r["E1"] + r["E2"] + r["E3"] + r["E4"] + r["E5"] == k) for k in range(6)}
# erreurs par niveau
out["err_by_level"] = {lv: {e: sum(r[e] for r in rows if r["niveau"] == lv) for e in ["E1", "E2", "E3", "E4", "E5"]} for lv in ["NA", "ECA", "A"]}

def chi(tab):
    tab = np.array(tab)
    c, p, dof, exp = stats.chi2_contingency(tab)
    n = tab.sum(); k = min(tab.shape) - 1
    return {"chi2": float(c), "p": float(p), "ddl": int(dof), "V": float(np.sqrt(c / (n * k))), "exp_min": float(exp.min()), "exp_lt5": int((exp < 5).sum())}

tab_serie = [[sum(1 for r in rows if r["serie"] == s and r["niveau"] == lv) for lv in ["NA", "ECA", "A"]] for s in ["A4", "D", "C/E"]]
out["tab_serie"] = tab_serie
# regroupement D + C/E (séries scientifiques) pour respecter la condition des effectifs théoriques
tab_serie2 = [tab_serie[0], [tab_serie[1][j] + tab_serie[2][j] for j in range(3)]]
out["tab_serie2"] = tab_serie2
out["chi_serie"] = chi(tab_serie2)
tab_sexe = [[sum(1 for r in rows if r["sexe"] == s and r["niveau"] == lv) for lv in ["NA", "ECA", "A"]] for s in ["H", "F"]]
out["tab_sexe"] = tab_sexe
out["chi_sexe"] = chi(tab_sexe)
out["moy_serie"] = {s: float(np.mean([r["note"] for r in rows if r["serie"] == s])) for s in ["A4", "D", "C/E"]}
out["moy_sexe"] = {s: float(np.mean([r["note"] for r in rows if r["sexe"] == s])) for s in ["H", "F"]}

# conformité échantillon / population
pop = np.array([138, 162, 85]); smp = np.array([out["niveau"][k] for k in ["NA", "ECA", "A"]])
g = stats.chisquare(smp, pop / pop.sum() * 100)
out["gof"] = {"chi2": float(g.statistic), "p": float(g.pvalue)}

for c in ["C1", "C2", "C3", "C4"]:
    out[c] = cnt(c, [0, 1, 2]); out[c + "_moy"] = float(np.mean([r[c] for r in rows]))
out["MAT"] = sum(r["MAT"] for r in rows)
fiche = np.array([r["fiche"] for r in rows])
out["fiche_moy"] = float(fiche.mean()); out["fiche_et"] = float(fiche.std(ddof=1))
out["qualite"] = cnt("qualite", ["Insuffisante", "Acceptable", "Conforme"])
tab_q = [[sum(1 for r in rows if r["qualite"] == q and r["niveau"] == lv) for lv in ["NA", "ECA", "A"]] for q in ["Insuffisante", "Acceptable", "Conforme"]]
out["tab_q"] = tab_q
out["chi_q"] = chi(tab_q)
rho = stats.spearmanr(notes, fiche); out["rho"] = {"r": float(rho.statistic), "p": float(rho.pvalue)}
rho2 = stats.spearmanr(notes, [r["C2"] for r in rows]); out["rho_C2"] = {"r": float(rho2.statistic), "p": float(rho2.pvalue)}
out["C_by_level"] = {lv: {c: float(np.mean([r[c] for r in rows if r["niveau"] == lv])) for c in ["C1", "C2", "C3", "C4"]} for lv in ["NA", "ECA", "A"]}
out["fiche_by_level"] = {lv: float(np.mean([r["fiche"] for r in rows if r["niveau"] == lv])) for lv in ["NA", "ECA", "A"]}
out["mat_by_level"] = {lv: sum(r["MAT"] for r in rows if r["niveau"] == lv) for lv in ["NA", "ECA", "A"]}

json.dump(out, open("stats.json", "w"), indent=1, ensure_ascii=False)
print(json.dumps(out, indent=1, ensure_ascii=False))

tab_q2 = [tab_q[0], [tab_q[1][j] + tab_q[2][j] for j in range(3)]]
out["tab_q2"] = tab_q2
out["chi_q2"] = chi(tab_q2)
json.dump(out, open("stats.json", "w"), indent=1, ensure_ascii=False)
print("chi_q2", out["chi_q2"])
