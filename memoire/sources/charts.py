import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

S = json.load(open("stats.json"))
plt.rcParams.update({
    "font.family": "Liberation Serif", "font.size": 11, "axes.spines.top": False,
    "axes.spines.right": False, "axes.edgecolor": "#888888", "axes.labelcolor": "#222222",
    "xtick.color": "#444444", "ytick.color": "#444444", "axes.grid": True, "grid.color": "#e3e3e3",
    "grid.linewidth": 0.6, "axes.axisbelow": True, "savefig.dpi": 220, "savefig.bbox": "tight",
})
BLUE, ORANGE, AQUA, YELLOW = "#2a78d6", "#eb6834", "#1baf7a", "#eda100"
LV = ["#86b6ef", "#2a78d6", "#104281"]  # rampe ordinale (faible -> fort)
INK = "#222222"
W = 6.3


def lab(ax, bars, fmt="{:.0f}", suffix="", inside=False, h=False):
    for b in bars:
        v = b.get_width() if h else b.get_height()
        if h:
            ax.text(v + 0.8, b.get_y() + b.get_height() / 2, fmt.format(v) + suffix, va="center", fontsize=10, color=INK)
        else:
            ax.text(b.get_x() + b.get_width() / 2, v + 0.8, fmt.format(v) + suffix, ha="center", fontsize=10, color=INK)


def save(fig, name):
    fig.savefig(f"fig/{name}.png")
    plt.close(fig)

# 1. Série du bac
fig, ax = plt.subplots(figsize=(W, 2.9))
k = ["A4", "D", "C/E"]; v = [S["serie"][x] for x in k]
b = ax.bar(["Série A4 (littéraire)", "Série D (scientifique)", "Séries C/E (scientifiques)"], v, color=BLUE, width=0.5)
lab(ax, b, suffix=" %"); ax.set_ylabel("Pourcentage d'EPE"); ax.set_ylim(0, 58); ax.grid(axis="x", visible=False)
save(fig, "f_serie")

# 2. Distribution des notes
fig, ax = plt.subplots(figsize=(W, 3.0))
k = ["0", "0.25", "0.5", "0.75", "1.0", "1.25", "1.5"]; v = [S["notes"][x] for x in k]
cols = [LV[0]] * 3 + [LV[1]] * 2 + [LV[2]] * 2
b = ax.bar(["0", "0,25", "0,50", "0,75", "1,00", "1,25", "1,50"], v, color=cols, width=0.62)
lab(ax, b); ax.set_xlabel("Note obtenue à l'exercice de la Notion B (/1,5)"); ax.set_ylabel("Effectif d'EPE")
ax.set_ylim(0, 28); ax.grid(axis="x", visible=False)
from matplotlib.patches import Patch
ax.legend(handles=[Patch(color=LV[0], label="Non acquis"), Patch(color=LV[1], label="En cours d'acquisition"), Patch(color=LV[2], label="Acquis")], frameon=False, fontsize=10, loc="upper left")
save(fig, "f_notes")

# 3. Population vs échantillon
import numpy as np
fig, ax = plt.subplots(figsize=(W, 3.0))
cats = ["Non acquis\n[0 – 0,50]", "En cours d'acquisition\n[0,51 – 1,00]", "Acquis\n[1,01 – 1,50]"]
pop = [35.85, 42.08, 22.07]; smp = [S["niveau"][x] for x in ["NA", "ECA", "A"]]
x = np.arange(3)
b1 = ax.bar(x - 0.19, pop, 0.36, color=LV[0], label="Population (N = 385)")
b2 = ax.bar(x + 0.19, smp, 0.36, color=LV[2], label="Échantillon (n = 100)")
for bb, fmt in ((b1, "{:.2f}"), (b2, "{:.0f}")):
    for r in bb:
        ax.text(r.get_x() + r.get_width() / 2, r.get_height() + 0.8, fmt.format(r.get_height()).replace(".", ",") + " %", ha="center", fontsize=9.5)
ax.set_xticks(x, cats); ax.set_ylabel("Pourcentage"); ax.set_ylim(0, 52); ax.legend(frameon=False, fontsize=10); ax.grid(axis="x", visible=False)
save(fig, "f_popech")

# 4. Réussite par item
fig, ax = plt.subplots(figsize=(W, 2.9))
items = ["I5 – Problème (fraction-opérateur)", "I4 – Addition (dénominateurs différents)*", "I2 – Comparaison de fractions", "I3 – Équivalence / simplification", "I1 – Représentation graphique"]
vals = [S["I5"], S["I4_full"], S["I2"], S["I3"], S["I1"]]
b = ax.barh(items, vals, color=BLUE, height=0.55); lab(ax, b, suffix=" %", h=True)
ax.set_xlim(0, 100); ax.set_xlabel("Taux de réussite (% d'EPE)"); ax.grid(axis="y", visible=False)
save(fig, "f_items")

# 5. Types d'erreurs
fig, ax = plt.subplots(figsize=(W, 2.9))
er = ["T3 – Défaut de conversion entre registres", "T5 – Simplification erronée", "T4 – Mauvaise interprétation de la fraction-opérateur", "T1 – Interférence du modèle des entiers", "T2 – Algorithme erroné : (a+c)/(b+d)"]
ev = [S["E3"], S["E5"], S["E4"], S["E1"], S["E2"]]
b = ax.barh(er, ev, color=ORANGE, height=0.55); lab(ax, b, suffix=" %", h=True)
ax.set_xlim(0, 60); ax.set_xlabel("Pourcentage de copies présentant l'erreur (n = 100)"); ax.grid(axis="y", visible=False)
save(fig, "f_erreurs")

# 6. Niveau selon la série (100 %)
fig, ax = plt.subplots(figsize=(W, 2.6))
series = ["A4", "D", "C/E"]; tab = S["tab_serie"]
names = ["Série A4 (n = 46)", "Série D (n = 41)", "Séries C/E (n = 13)"]
left = np.zeros(3)
for j, (nm, c) in enumerate(zip(["Non acquis", "En cours d'acquisition", "Acquis"], LV)):
    pct = np.array([tab[i][j] / sum(tab[i]) * 100 for i in range(3)])
    bb = ax.barh(names, pct, left=left, color=c, label=nm, height=0.55, edgecolor="white", linewidth=1.5)
    for i, p in enumerate(pct):
        if p > 7:
            ax.text(left[i] + p / 2, i, f"{p:.1f} %".replace(".", ","), ha="center", va="center", fontsize=9.5, color="white" if j else INK)
    left += pct
ax.set_xlim(0, 100); ax.invert_yaxis(); ax.set_xlabel("Pourcentage d'EPE"); ax.grid(False)
ax.legend(frameon=False, fontsize=9.5, ncol=3, loc="upper center", bbox_to_anchor=(0.5, 1.2))
save(fig, "f_serie_niveau")

# 7. Critères des fiches
fig, ax = plt.subplots(figsize=(W, 2.9))
crit = ["C1 – Situation de départ", "C2 – Rigueur mathématique", "C3 – Registres sémiotiques", "C4 – Structuration de la séance"]
left = np.zeros(4)
for j, (nm, c) in enumerate(zip(["0 = Absent", "1 = Partiel", "2 = Conforme"], [ORANGE, "#c9c9c9", AQUA])):
    v = np.array([S[f"C{i+1}"][str(j)] for i in range(4)])
    ax.barh(crit, v, left=left, color=c, label=nm, height=0.55, edgecolor="white", linewidth=1.5)
    for i, p in enumerate(v):
        if p >= 7:
            ax.text(left[i] + p / 2, i, f"{p} %", ha="center", va="center", fontsize=9.5, color=INK)
    left += v
ax.set_xlim(0, 100); ax.invert_yaxis(); ax.set_xlabel("Pourcentage de fiches (n = 100)"); ax.grid(False)
ax.legend(frameon=False, fontsize=9.5, ncol=3, loc="upper center", bbox_to_anchor=(0.5, 1.18))
save(fig, "f_fiches")

# 8. Score moyen de la fiche selon le niveau
fig, ax = plt.subplots(figsize=(W, 2.8))
v = [S["fiche_by_level"][x] for x in ["NA", "ECA", "A"]]
b = ax.bar(["Non acquis (n = 36)", "En cours d'acquisition (n = 42)", "Acquis (n = 22)"], v, color=LV, width=0.5)
for r in b:
    ax.text(r.get_x() + r.get_width() / 2, r.get_height() + 0.1, f"{r.get_height():.2f}".replace(".", ",") + " / 8", ha="center", fontsize=10)
ax.set_ylim(0, 6); ax.set_ylabel("Score moyen de la fiche (/8)"); ax.set_xlabel("Niveau de maîtrise à la Notion B"); ax.grid(axis="x", visible=False)
save(fig, "f_fiche_niveau")

# 9. Entretiens EPE : Q1 et Q3
fig, (a1, a2) = plt.subplots(1, 2, figsize=(W, 2.8))
b = a1.bar(["Faible", "Moyenne", "Bonne"], [8, 9, 3], color=BLUE, width=0.55); lab(a1, b, fmt="{:.0f}")
a1.set_title("Auto-évaluation de la maîtrise (Q1)", fontsize=10.5); a1.set_ylim(0, 14); a1.set_ylabel("Nombre d'EPE (n = 20)"); a1.grid(axis="x", visible=False)
b = a2.bar(["Non", "Partiellement", "Pleinement"], [5, 12, 3], color=ORANGE, width=0.55); lab(a2, b, fmt="{:.0f}")
a2.set_title("Outils de l'ENFPE jugés suffisants (Q3)", fontsize=10.5); a2.set_ylim(0, 14); a2.grid(axis="x", visible=False)
from matplotlib.ticker import MaxNLocator
for a in (a1, a2): a.yaxis.set_major_locator(MaxNLocator(integer=True))
fig.tight_layout(); save(fig, "f_entretiens")

# 10. Thèmes EPE
fig, ax = plt.subplots(figsize=(W, 3.3))
th = [("Encadrement didactique insuffisant sur le terrain", 9), ("Difficulté à répondre aux « pourquoi » des élèves", 10),
      ("Volume horaire jugé insuffisant", 11), ("Manque de matériel didactique", 12), ("Appréhension héritée du collège", 13),
      ("Peu de séances de manipulation à l'ENFPE", 14), ("Recopie de la démarche du livre du maître", 15)]
b = ax.barh([t for t, _ in th], [n for _, n in th], color=BLUE, height=0.55)
for r in b:
    ax.text(r.get_width() + 0.2, r.get_y() + r.get_height() / 2, f"{int(r.get_width())} / 20", va="center", fontsize=10)
ax.set_xticks(range(0, 21, 2)); ax.set_xlim(0, 20); ax.set_xlabel("Nombre d'EPE ayant évoqué le thème (n = 20)"); ax.grid(axis="y", visible=False)
save(fig, "f_themes")


# ---- Schémas ----
def box(ax, x, y, w, h, txt, fc="#eef4fc", ec=BLUE, fs=10, bold=False):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08", fc=fc, ec=ec, lw=1.2))
    ax.text(x + w / 2, y + h / 2, txt, ha="center", va="center", fontsize=fs, wrap=True, fontweight="bold" if bold else "normal", color=INK)


def arrow(ax, p, q, c="#555555", style="-|>", rad=0.0):
    ax.add_patch(FancyArrowPatch(p, q, arrowstyle=style, mutation_scale=13, color=c, lw=1.2, connectionstyle=f"arc3,rad={rad}"))

# Double transposition
fig, ax = plt.subplots(figsize=(W+1.2, 2.5)); ax.set_xlim(0, 10); ax.set_ylim(0, 3); ax.axis("off")
xs = [0.1, 2.6, 5.1, 7.6]
tx = ["Savoir savant\n(nombres rationnels)", "Savoir à enseigner\nen ENFPE\n(programme, modules)", "Savoir appris\npar l'EPE\n(savoir professionnel)", "Savoir enseigné\nà l'élève du primaire\n(CE – CM)"]
for x, t in zip(xs, tx):
    box(ax, x, 1.0, 2.2, 1.45, t, fs=8.6)
arrow(ax, (2.32, 1.68), (2.58, 1.68)); arrow(ax, (4.82, 1.68), (5.08, 1.68)); arrow(ax, (7.32, 1.68), (7.58, 1.68))
ax.annotate("", xy=(0.1, 0.72), xytext=(4.8, 0.72), arrowprops=dict(arrowstyle="-", color=BLUE))
ax.text(2.45, 0.38, "1re transposition (formateur d'ENFPE)", ha="center", fontsize=9.5, color=BLUE)
ax.annotate("", xy=(5.1, 0.72), xytext=(9.8, 0.72), arrowprops=dict(arrowstyle="-", color=ORANGE))
ax.text(7.45, 0.38, "2e transposition (élève-professeur)", ha="center", fontsize=9.5, color=ORANGE)
save(fig, "f_transpo")

# Modèle d'analyse
fig, ax = plt.subplots(figsize=(W+1.2, 3.6)); ax.set_xlim(0, 10); ax.set_ylim(0, 5); ax.axis("off")
vi = ["VI1 : Maîtrise conceptuelle des fractions\n(copies – Outil 2)", "VI2 : Pratiques de préparation des leçons\n(fiches – Outil 1)", "VI3 : Dispositif de formation et d'encadrement\n(entretiens – Outil 3)"]
for i, t in enumerate(vi):
    box(ax, 0.1, 3.6 - i * 1.55, 4.9, 1.15, t, fs=8.6)
    arrow(ax, (5.05, 4.17 - i * 1.55), (5.55, 2.6))
box(ax, 5.6, 1.9, 4.3, 1.4, "VD : Difficultés des EPE dans\nl'enseignement des fractions\nau primaire", fc="#fdeee7", ec=ORANGE, fs=10, bold=True)
box(ax, 5.6, 0.1, 4.3, 1.1, "Variable d'identification (VM) :\nprofil d'entrée (série du bac, sexe)", fc="#f3f3f3", ec="#888888", fs=9.3)
arrow(ax, (7.75, 1.22), (7.75, 1.88))
save(fig, "f_modele")

# Démarche M-R-S-I
fig, ax = plt.subplots(figsize=(W+1.6, 3.0)); ax.set_xlim(0, 10); ax.set_ylim(0, 4); ax.axis("off")
steps = [("1. Problématiser", "situation-problème\nde partage ou de mesure"), ("2. Manipuler", "bandes, disques,\ncapsules, graines"),
         ("3. Représenter", "schémas, droite\ngraduée, mur"), ("4. Symboliser", "écriture a/b,\nlangage, règle"), ("5. Réinvestir", "exercices, problèmes,\nremédiation")]
cols = ["#fdeee7", "#eef4fc", "#e8f7f1", "#fff5dc", "#f3f3f3"]
for i, ((a, b), c) in enumerate(zip(steps, cols)):
    x = 0.05 + i * 2.0
    box(ax, x, 1.3, 1.8, 1.9, "", fc=c, ec="#777777")
    ax.text(x + 0.9, 2.75, a, ha="center", va="center", fontsize=9.5, fontweight="bold")
    ax.text(x + 0.9, 1.85, b, ha="center", va="center", fontsize=8.2)
    if i < 4:
        arrow(ax, (x + 1.82, 2.25), (x + 2.03, 2.25))
ax.annotate("", xy=(0.9, 1.25), xytext=(8.9, 1.25), arrowprops=dict(arrowstyle="-|>", color=ORANGE, lw=1.2, connectionstyle="arc3,rad=-0.18"))
ax.text(4.95, 0.25, "Conversion permanente entre registres et traitement de l'erreur (boucle de régulation)", ha="center", fontsize=9.5, color=ORANGE)
save(fig, "f_demarche")
print("ok")
