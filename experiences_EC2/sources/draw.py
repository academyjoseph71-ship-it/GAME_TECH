"""Illustrations schématiques des cinq dispositifs expérimentaux."""
import json, random
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Polygon, Ellipse, FancyBboxPatch, Circle, FancyArrowPatch, Wedge

plt.rcParams.update({'font.family': 'serif', 'font.serif': ['Times New Roman', 'Liberation Serif'], 'font.size': 11})
random.seed(3); np.random.seed(3)
W_CM = 15.0
H = {}

def new(h_cm, xlim, ylim):
    fig = plt.figure(figsize=(W_CM / 2.54, h_cm / 2.54))
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.set_aspect('equal'); ax.axis('off')
    return fig, ax

def label(ax, xy, txt, xt, yt, ha='left'):
    ax.annotate(txt, xy=xy, xytext=(xt, yt), ha=ha, va='center', fontsize=11,
                arrowprops=dict(arrowstyle='-', color='#333', lw=0.8))

def save(fig, name, h_cm):
    fig.savefig('img/%s.png' % name, dpi=220, facecolor='white'); plt.close(fig); H[name] = h_cm / 2.54

def dots(ax, x0, x1, y0, y1, n, col, s):
    ax.scatter(np.random.uniform(x0, x1, n), np.random.uniform(y0, y1, n), s=s, c=col, zorder=3, lw=0)

# ---------- 1. filtre ----------
def fig_filtre():
    fig, ax = new(11, (0, 30), (0, 22))
    # bouteille renversée
    x0, x1 = 3, 9
    ax.add_patch(Polygon([(x0, 5.5), (5.3, 3.8), (5.3, 3.0), (6.7, 3.0), (6.7, 3.8), (x1, 5.5), (x1, 19), (x0, 19)], closed=True, fc='#EAF4FB', ec='#4A6B82', lw=1.5, zorder=1))
    layers = [(5.5, 6.9, '#2B2B2B', 'charbon'), (6.9, 8.7, '#E8D39A', 'sable'), (8.7, 10.1, '#2B2B2B', 'charbon'),
              (10.1, 11.9, '#9A9A9A', 'gravier'), (11.9, 13.3, '#C9C2B4', 'petit')]
    for y0, y1, c, k in layers:
        ax.add_patch(Rectangle((x0 + 0.08, y0), x1 - x0 - 0.16, y1 - y0, fc=c, ec='none', zorder=2))
        if k == 'sable': dots(ax, x0 + .2, x1 - .2, y0 + .1, y1 - .1, 120, '#B89A55', 3)
        if k == 'gravier':
            for _ in range(22): ax.add_patch(Circle((random.uniform(x0 + .4, x1 - .4), random.uniform(y0 + .3, y1 - .3)), random.uniform(.22, .38), fc='#6E6E6E', ec='#4d4d4d', zorder=3))
        if k == 'petit': dots(ax, x0 + .2, x1 - .2, y0 + .1, y1 - .1, 70, '#7C7568', 10)
        if k == 'charbon': dots(ax, x0 + .2, x1 - .2, y0 + .1, y1 - .1, 40, '#555', 12)
    ax.add_patch(Rectangle((x0 + 0.08, 13.3), x1 - x0 - 0.16, 3.2, fc='#8B6A3E', ec='none', alpha=.85, zorder=2))
    ax.add_patch(Rectangle((5.2, 2.9), 1.6, 0.35, fc='#C0392B', ec='none', zorder=4))  # tissu
    # gouttes et calebasse
    for yy in (2.3, 1.7): ax.add_patch(Ellipse((6, yy), .25, .4, fc='#5DADE2', zorder=3))
    ax.add_patch(Wedge((6, 1.2), 3.2, 180, 360, fc='#C8A165', ec='#8A6A3A', lw=1.4, zorder=2))
    ax.add_patch(Wedge((6, 1.2), 2.8, 180, 360, fc='#AED6F1', ec='none', zorder=3))
    # versement
    ax.add_patch(Polygon([(0.4, 19.6), (2.6, 19.6), (2.6, 20.8), (0.4, 20.8)], fc='#B0B0B0', ec='#555', zorder=4))
    ax.plot([2.5, 3.8, 4.4], [19.9, 19.3, 16.8], color='#8B6A3E', lw=3, zorder=4)
    lab = [((8.8, 15), 'Eau boueuse'), ((8.8, 12.6), 'Petits graviers (3 cm)'), ((8.8, 11), 'Gravier (4 cm)'),
           ((8.8, 9.4), 'Charbon de bois (3 cm)'), ((8.8, 7.8), 'Sable fin (4 cm)'), ((8.8, 6.2), 'Charbon de bois (3 cm)'),
           ((6.8, 3.05), 'Tissu + élastique'), ((8.2, 0.2), 'Calebasse : eau filtrée')]
    for i, (xy, t) in enumerate(lab):
        label(ax, xy, t, 10.3, [15, 13.2, 11.6, 10.0, 8.4, 6.8, 3.6, 1.2][i])
    label(ax, (8.9, 18.2), 'Bouteille retournée (goulot en bas)', 10.3, 20.5)
    ax.text(1.5, 21.1, 'Boîte', ha='center', va='bottom', fontsize=11)
    # SODIS
    ax.plot([19.5, 29.5], [5.2, 5.2], color='#777', lw=3)
    for k in range(10): ax.plot([19.8 + k, 20.3 + k], [5.2, 5.6], color='#999', lw=1.5)
    ax.add_patch(FancyBboxPatch((21, 5.7), 6.5, 1.8, boxstyle='round,pad=0.1,rounding_size=0.8', fc='#D6EAF8', ec='#4A6B82', lw=1.4))
    ax.add_patch(Rectangle((27.5, 6.2), 0.8, 0.8, fc='#2E86C1'))
    ax.add_patch(Circle((25.5, 16.5), 1.8, fc='#F7C948', ec='#E0A800', lw=1.5))
    for a in np.linspace(0, 2 * np.pi, 12, endpoint=False):
        ax.plot([25.5 + 2.2 * np.cos(a), 25.5 + 2.9 * np.cos(a)], [16.5 + 2.2 * np.sin(a), 16.5 + 2.9 * np.sin(a)], color='#E0A800', lw=1.5)
    for xs in (22.5, 24.5, 26.5):
        ax.add_patch(FancyArrowPatch((xs + 1, 13.2), (xs, 8.2), arrowstyle='->', mutation_scale=12, color='#E0A800', lw=1.3))
    ax.text(24.5, 3.8, 'Bouteille d’eau filtrée claire\ncouchée sur la tôle du toit', ha='center', va='top', fontsize=11)
    ax.text(24.5, 1.4, '6 h de plein soleil', ha='center', va='top', fontsize=11, fontweight='bold')
    ax.text(25.5, 20.1, 'Désinfection solaire', ha='center', fontsize=11, fontweight='bold')
    save(fig, 'exp1_dispositif', 11)

# ---------- 2. machine à fumer ----------
def fig_tabac():
    fig, ax = new(11, (0, 30), (-2, 20))
    ax.add_patch(FancyBboxPatch((4, 1), 6, 11, boxstyle='round,pad=0.1,rounding_size=1.2', fc='#EAF4FB', ec='#4A6B82', lw=1.5))
    ax.add_patch(Polygon([(4.2, 12), (6.2, 14.2), (7.8, 14.2), (9.8, 12)], fc='#EAF4FB', ec='#4A6B82', lw=1.5))
    ax.add_patch(Rectangle((6.2, 14.2), 1.6, 1.3, fc='#EAF4FB', ec='#4A6B82', lw=1.5))
    ax.add_patch(Ellipse((7, 14.3), 1.5, 1.1, fc='#C9A66B', ec='#7E5B2A', zorder=4))  # coton brun
    ax.add_patch(Rectangle((6.0, 15.4), 2.0, 0.9, fc='#2E86C1', ec='#1B4F72', zorder=4))  # bouchon
    ax.add_patch(Rectangle((6.72, 16.3), 0.56, 2.6, fc='white', ec='#555', zorder=4))
    ax.add_patch(Rectangle((6.72, 16.3), 0.56, 0.8, fc='#E59866', ec='#555', zorder=4))
    ax.add_patch(Circle((7, 19.0), 0.3, fc='#E74C3C', zorder=5))
    t = np.linspace(0, 1, 50)
    ax.plot(7 + 0.6 * np.sin(t * 9), 19.3 + 0.8 * t, color='#999', lw=1.3)
    ax.add_patch(Rectangle((4.1, 1.05), 5.8, 2.2, fc='#F4D03F', alpha=.55, ec='none'))
    for s in (1, -1):
        x = 7 + s * 4.7
        ax.add_patch(FancyArrowPatch((x + s * 1.3, 7), (x, 7), arrowstyle='-|>', mutation_scale=14, color='#C0392B', lw=1.6))
    ax.text(7, -0.4, 'Presser puis relâcher la bouteille', ha='center', va='top', fontsize=11, color='#C0392B')
    label(ax, (7.3, 19.0), 'Cigarette allumée (formateur)', 11.5, 19.0)
    label(ax, (8, 15.8), 'Bouchon percé', 11.5, 16.8)
    label(ax, (7.7, 14.3), 'Coton : les « poumons »', 11.5, 14.6)
    label(ax, (9.8, 9), 'Bouteille souple de 1,5 L', 11.5, 10.5)
    label(ax, (9.8, 2.2), 'Eau qui jaunit', 11.5, 2.6)
    # comparaison
    ax.text(23.5, 12.2, 'Comparaison des cotons', ha='center', fontsize=11, fontweight='bold')
    ax.add_patch(Ellipse((20.8, 6.8), 3.4, 2.4, fc='white', ec='#999', lw=1.3))
    ax.add_patch(Ellipse((26.2, 6.8), 3.4, 2.4, fc='#A67C3D', ec='#6E4F1E', lw=1.3))
    ax.add_patch(Ellipse((26.0, 6.9), 1.6, 1.1, fc='#5C3D14', ec='none', alpha=.7))
    ax.text(20.8, 4.9, 'Témoin\n(coton neuf)', ha='center', va='top', fontsize=11)
    ax.text(26.2, 4.9, 'Après :\ngoudron brun\net collant', ha='center', va='top', fontsize=11)
    save(fig, 'exp2_dispositif', 11)

# ---------- 3. microbes ----------
def fig_microbes():
    fig, ax = new(10.5, (0, 30), (0, 21))
    cols = [('A', 'Témoin (sans contact)', 0), ('B', 'Mains non lavées', 40), ('C', 'Mains lavées au savon', 6)]
    for r, (yb, jour) in enumerate(((11.5, 'Jour 0'), (1.8, 'Jour 6'))):
        ax.text(0.6, yb + 3.2, jour, ha='left', va='center', fontsize=11, fontweight='bold', rotation=90)
        for i, (lettre, txt, n) in enumerate(cols):
            x = 3 + i * 9
            ax.add_patch(FancyBboxPatch((x, yb), 7.2, 6.4, boxstyle='round,pad=0.1,rounding_size=0.5', fc='#F2F8FC', ec='#7FA7C2', lw=1.3))
            ax.plot([x + 3.6, x + 3.6], [yb + 6.5, yb + 7.2], color='#7F6A4E', lw=2)
            ax.add_patch(FancyBboxPatch((x + 1.3, yb + 1.2), 4.6, 3.8, boxstyle='round,pad=0.1,rounding_size=0.6', fc='#F3E3B5', ec='#C8A95A', lw=1))
            ax.text(x + 0.5, yb + 5.6, lettre, fontsize=12, fontweight='bold', color='#1F3864')
            if r == 1 and n:
                for _ in range(n):
                    ax.add_patch(Circle((random.uniform(x + 1.7, x + 5.5), random.uniform(yb + 1.6, yb + 4.6)), random.uniform(.12, .45 if n > 10 else .28),
                                        fc=random.choice(['#2E7D32', '#1B1B1B', '#FFFFFF', '#7CB342', '#F9A825']), ec='#555', lw=.4, zorder=4))
            if r == 0:
                ax.text(x + 3.6, yb + 8.2, txt, ha='center', va='bottom', fontsize=11)
    ax.text(3, 0.9, 'Taches (colonies) : A aucune, B nombreuses, C peu nombreuses', ha='left', va='center', fontsize=11)
    save(fig, 'exp3_dispositif', 10.5)

# ---------- 4. larves ----------
def larva(ax, x, y, ang, siph=False, s=1.0):
    a = np.deg2rad(ang)
    for k in range(6):
        ax.add_patch(Ellipse((x + k * .32 * s * np.cos(a), y - k * .32 * s * np.sin(a)), .38 * s, .22 * s, angle=-ang, fc='#5D4037', ec='none', zorder=4))
    if siph: ax.plot([x, x - .5 * np.cos(a)], [y, y + .5 * np.sin(a) + .25], color='#5D4037', lw=1.4)

def fig_larves():
    fig, ax = new(12.5, (0, 30), (-5.5, 19.5))
    ax.add_patch(Polygon([(2, 2), (12, 2), (12, 15), (2, 15)], fc='white', ec='#4A6B82', lw=1.6))
    ax.add_patch(Rectangle((2.1, 2.1), 9.8, 10.4, fc='#C8E6C9', ec='none', alpha=.8))
    ax.plot([2.1, 11.9], [12.5, 12.5], color='#2E7D32', lw=1.2)
    for k in np.arange(2, 12.1, .5): ax.plot([k, k], [15, 15.6], color='#555', lw=.6)
    ax.plot([1.8, 12.2], [15.3, 15.3], color='#555', lw=.6); ax.plot([1.8, 12.2], [15.6, 15.6], color='#555', lw=.6)
    ax.add_patch(Rectangle((1.8, 14.3), 10.4, 0.5, fc='#212121', ec='none'))
    larva(ax, 3.2, 12.25, 0); larva(ax, 6.2, 12.25, 0)
    larva(ax, 8.8, 12.1, 50, siph=True); larva(ax, 10.3, 12.1, 50, siph=True)
    ax.add_patch(Wedge((4.5, 9.0), .6, 30, 330, fc='#3E2723', zorder=4)); ax.plot([4.2, 4.9], [8.4, 7.8], color='#3E2723', lw=2)
    label(ax, (5.5, 15.4), 'Moustiquaire usée', 13.5, 17.5)
    label(ax, (11.8, 14.5), 'Élastique de chambre à air', 13.5, 15.6)
    label(ax, (5, 12.25), 'Larve d’anophèle : horizontale', 13.5, 13.4)
    label(ax, (10.6, 11.6), 'Larve de culex : oblique, avec siphon', 13.5, 11.4)
    label(ax, (5.0, 9.0), 'Nymphe « en virgule »', 13.5, 9.2)
    label(ax, (11.8, 5), 'Eau de vieux pneu ou de boîte', 13.5, 7.0)
    label(ax, (11.8, 3), 'Bouteille coupée', 13.5, 5.0)
    ax.text(7, 0.9, 'Récipient toujours couvert, à l’ombre', ha='center', fontsize=11)
    # cycle
    etapes = ['Œufs\n(1 à 3 jours)', 'Larve\n(4 à 7 jours)', 'Nymphe\n(1 à 3 jours)', 'Moustique\nadulte']
    for i, t in enumerate(etapes):
        x = 3.5 + i * 7.5
        ax.add_patch(FancyBboxPatch((x - 2.6, -4.6), 5.2, 2.8, boxstyle='round,pad=0.1,rounding_size=0.5', fc='#FFF3E0', ec='#EF6C00', lw=1.2))
        ax.text(x, -3.2, t, ha='center', va='center', fontsize=11)
        if i < 3: ax.add_patch(FancyArrowPatch((x + 2.7, -3.2), (x + 4.8, -3.2), arrowstyle='-|>', mutation_scale=13, color='#EF6C00', lw=1.4))
    ax.text(15, -0.6, 'Cycle dans l’eau : 7 à 12 jours. Au jour 7, vider l’eau sur un sol sec.', ha='center', fontsize=11, fontweight='bold')
    save(fig, 'exp4_dispositif', 12.5)

# ---------- 5. déchets ----------
def fig_dechets():
    fig, ax = new(10, (0, 30), (0, 20))
    ax.add_patch(Rectangle((0, 2), 30, 9, fc='#A1887F', ec='none'))
    ax.add_patch(Rectangle((0, 10.6), 30, 0.5, fc='#6D4C41', ec='none'))
    dots(ax, 0.3, 29.7, 2.2, 10.4, 400, '#8D6E63', 6)
    items = [('Épluchures', '#F9A825', 'décomposées'), ('Feuilles', '#7CB342', 'décomposées'),
             ('Papier', '#FFFFFF', 'en partie'), ('Sachet\nplastique', '#4FC3F7', 'intact'), ('Boîte de\nconserve', '#B0BEC5', 'rouillée')]
    for i, (nom, c, res) in enumerate(items):
        x = 3 + i * 6
        ax.add_patch(Rectangle((x - 1.6, 5.2), 3.2, 5.4, fc='#795548', ec='#5D4037', ls='--', lw=1))
        if 'plastique' in nom:
            ax.add_patch(Polygon([(x - 1.1, 6), (x + 1.1, 6), (x + 0.8, 8.2), (x - 0.8, 8.2)], fc=c, ec='#0277BD', zorder=4))
        elif 'Boîte' in nom:
            ax.add_patch(Rectangle((x - 0.8, 6), 1.6, 2.2, fc=c, ec='#546E7A', zorder=4))
        elif 'Papier' in nom:
            ax.add_patch(Polygon([(x - 1, 6), (x + 1, 6.3), (x + 0.9, 8), (x - 0.9, 7.8)], fc=c, ec='#999', zorder=4))
        else:
            for _ in range(5):
                ax.add_patch(Ellipse((x + random.uniform(-.8, .8), random.uniform(6.2, 7.9)), 1.2, .5, angle=random.uniform(0, 180), fc=c, ec='#555', lw=.4, zorder=4))
        ax.plot([x + 1.3, x + 1.3], [10.6, 15.5], color='#6D4C41', lw=3)
        ax.add_patch(Rectangle((x - 1.5, 14.0), 4.0, 2.2, fc='#E0C9A6', ec='#8D6E63', zorder=4))
        ax.text(x + 0.5, 15.1, nom, ha='center', va='center', fontsize=11 if '\n' not in nom else 10.5, zorder=5)
        col = '#2E7D32' if 'décomp' in res else ('#EF6C00' if res == 'en partie' else '#C62828')
        ax.text(x, 0.9, res, ha='center', va='center', fontsize=11, fontweight='bold', color=col)
    ax.text(0.2, 12.2, 'Sol', fontsize=11, color='#4E342E')
    ax.text(29.8, 18.8, 'Piquets et étiquettes en carton', ha='right', fontsize=11)
    ax.plot([29.6, 29.6], [4.2, 10.4], color='#333', lw=.8)
    ax.text(29.4, 7.3, '15 à 20 cm', ha='right', va='center', fontsize=11, rotation=90)
    ax.text(15, 18.8, '', ha='center')
    ax.text(0.2, 1.8, 'Après 4 semaines :', fontsize=11, va='bottom')
    save(fig, 'exp5_dispositif', 10)

if __name__ == '__main__':
    fig_filtre(); fig_tabac(); fig_microbes(); fig_larves(); fig_dechets()
    json.dump(H, open('img/dispo_heights.json', 'w')); print(H)

# ---------- 6. moringa ----------
def bottle(ax, x, y, w=3.2, h=8.0, water='#8B6A3E', clear=None, depot=False, flocs=False, lab=None):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.05,rounding_size=0.5', fc='#EAF4FB', ec='#4A6B82', lw=1.4, zorder=2))
    ax.add_patch(Polygon([(x + .2, y + h), (x + w / 2 - .45, y + h + 1.3), (x + w / 2 + .45, y + h + 1.3), (x + w - .2, y + h)], fc='#EAF4FB', ec='#4A6B82', lw=1.4, zorder=2))
    ax.add_patch(Rectangle((x + w / 2 - .5, y + h + 1.3), 1.0, .5, fc='#2E86C1', ec='#1B4F72', zorder=3))
    top = y + h - 0.6
    if clear:
        ax.add_patch(Rectangle((x + .1, y + 1.0), w - .2, top - y - 1.0, fc=clear, ec='none', zorder=3))
    else:
        ax.add_patch(Rectangle((x + .1, y + .1), w - .2, top - y - .1, fc=water, ec='none', alpha=.9, zorder=3))
    if depot:
        ax.add_patch(Rectangle((x + .1, y + .1), w - .2, 0.9, fc='#6D4C2F', ec='none', zorder=4))
        dots(ax, x + .2, x + w - .2, y + .15, y + .9, 40, '#4E342E', 6)
    if flocs:
        dots(ax, x + .3, x + w - .3, y + 1.3, top - .3, 18, '#A1887F', 14)
    if lab: ax.text(x + w / 2, y - 0.5, lab, ha='center', va='top', fontsize=11)

def fig_moringa():
    fig, ax = new(14, (0, 30), (1.5, 30))
    # --- étape 1 : préparation de la poudre
    ax.text(0.3, 29.3, '1. Préparer la poudre de graines', fontsize=11, fontweight='bold', va='top')
    # gousse
    t = np.linspace(0, 1, 30)
    ax.add_patch(Polygon(list(zip(1 + 5 * t, 24.5 + 0.9 * np.sin(np.pi * t))) + list(zip((1 + 5 * t)[::-1], (24.5 - 0.9 * np.sin(np.pi * t))[::-1])), fc='#8D6E63', ec='#5D4037', lw=1.2))
    for k in range(4): ax.add_patch(Circle((1.9 + k * 1.1, 24.5), .28, fc='#4E342E'))
    ax.text(3.5, 22.8, 'Gousse sèche', ha='center', va='top', fontsize=11)
    arrow = lambda a, b: ax.add_patch(FancyArrowPatch(a, b, arrowstyle='-|>', mutation_scale=14, color='#1F3864', lw=1.5))
    arrow((6.6, 24.5), (8.2, 24.5))
    # graine ailée -> amande
    for k, xx in enumerate((9.3, 11.2)):
        ax.add_patch(Polygon([(xx - .9, 24.5), (xx, 25.3), (xx + .9, 24.5), (xx, 23.7)], fc='#D7CCC8', ec='#8D6E63'))
        ax.add_patch(Circle((xx, 24.5), .38, fc='#5D4037'))
    ax.text(10.25, 22.8, 'Graines ailées', ha='center', va='top', fontsize=11)
    arrow((12.4, 24.5), (14.0, 24.5))
    for k in range(3): ax.add_patch(Ellipse((15.0 + k * .9, 24.5), .7, .55, fc='#FFFDE7', ec='#BDB76B'))
    ax.text(15.9, 22.8, '3 amandes', ha='center', va='top', fontsize=11)
    arrow((17.4, 24.5), (19.0, 24.5))
    ax.add_patch(Ellipse((21.2, 23.9), 3.8, 1.2, fc='#9E9E9E', ec='#616161'))
    ax.add_patch(Ellipse((21.4, 25.2), 2.6, 1.0, fc='#BDBDBD', ec='#616161'))
    dots(ax, 20.2, 22.2, 24.3, 24.6, 30, '#FFFDE7', 8)
    ax.text(21.2, 22.8, 'Écraser entre\ndeux pierres', ha='center', va='top', fontsize=11)
    arrow((23.5, 24.5), (25.1, 24.5))
    ax.add_patch(FancyBboxPatch((25.6, 23.2), 1.8, 2.6, boxstyle='round,pad=0.05,rounding_size=0.3', fc='#FAFAFA', ec='#4A6B82'))
    ax.add_patch(Rectangle((25.7, 23.3), 1.6, 1.4, fc='#F5F5DC', ec='none'))
    ax.text(26.5, 22.8, 'Pâte\nlaiteuse', ha='center', va='top', fontsize=11)
    # --- étape 2 : trois bouteilles après décantation
    ax.text(0.3, 19.6, '2. Mélanger puis laisser reposer 1 à 2 h', fontsize=11, fontweight='bold', va='top')
    bottle(ax, 1.5, 5.5, lab='A : témoin\n(eau boueuse seule)')
    bottle(ax, 7.0, 5.5, clear='#DCEFF7', depot=True, lab='B : + moringa')
    bottle(ax, 12.5, 5.5, clear='#DCEFF7', depot=True, lab='C : + moringa')
    label(ax, (15.5, 6.0), 'Dépôt\nde boue', 16.1, 7.6)
    ax.text(10.9, 1.9, '', fontsize=11)
    # --- étape 3 : filtrer au pagne puis soleil
    ax.text(18.3, 19.6, '3. Filtrer au pagne, puis au soleil', fontsize=11, fontweight='bold', va='top')
    ax.plot([16.3, 18.5, 20.6], [14.8, 16.0, 13.6], color='#5DADE2', lw=3)
    ax.add_patch(Polygon([(19.2, 13.6), (22.4, 13.6), (21.6, 12.6), (20.0, 12.6)], fc='#C0392B', ec='#7B241C', zorder=4))
    ax.text(22.8, 13.2, 'Pagne plié en quatre', fontsize=11, va='center')
    bottle(ax, 19.2, 5.5, w=2.6, h=6.2, clear='#E3F2FD', lab='Eau limpide')
    ax.add_patch(Circle((27.3, 10.2), 1.3, fc='#F7C948', ec='#E0A800', lw=1.4))
    for a in np.linspace(0, 2 * np.pi, 10, endpoint=False):
        ax.plot([27.3 + 1.6 * np.cos(a), 27.3 + 2.1 * np.cos(a)], [10.2 + 1.6 * np.sin(a), 10.2 + 2.1 * np.sin(a)], color='#E0A800', lw=1.3)
    ax.text(27.3, 6.8, '6 h au soleil\nou ébullition', ha='center', va='top', fontsize=11, fontweight='bold')
    save(fig, 'exp6_dispositif', 14)
