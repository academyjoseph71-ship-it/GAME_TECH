"""Schémas directeurs : fichiers Freeplane (.mm) et leur rendu PNG."""
import textwrap, json, itertools
from xml.sax.saxutils import quoteattr
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from matplotlib.path import Path
import matplotlib.patches as mpatches
from data import EXPERIENCES, BRANCHES

plt.rcParams.update({'font.family': 'serif', 'font.serif': ['Times New Roman', 'Liberation Serif'], 'font.size': 11})

# ---------------- fichier Freeplane ----------------
_ids = itertools.count(1000)
def nid(): return 'ID_%d' % next(_ids)

def write_mm(e, path):
    L = ['<map version="freeplane 1.9.13">',
         '<!--Carte ouvrable avec Freeplane : https://www.freeplane.org -->',
         '<node TEXT=%s FOLDED="false" ID="%s" STYLE="bubble" COLOR="#ffffff" BACKGROUND_COLOR="#1f3864">' % (quoteattr(e['court'] + ' – ' + e['titre'].split(' : ', 1)[0]), nid()),
         '<font NAME="Times New Roman" SIZE="14" BOLD="true"/>',
         '<hook NAME="MapStyle"><properties fit_to_viewport="false"/></hook>',
         '<richcontent TYPE="NOTE" CONTENT-TYPE="plain/html"><html><body><p>%s</p></body></html></richcontent>' % e['titre'].replace('&', '&amp;').replace('<', '&lt;')]
    for key, label, side, col in BRANCHES:
        L.append('<node TEXT=%s POSITION="%s" ID="%s" COLOR="%s" STYLE="bubble">' % (quoteattr(label), side, nid(), col))
        L.append('<edge COLOR="%s" WIDTH="3"/><font NAME="Times New Roman" SIZE="12" BOLD="true"/>' % col)
        for leaf in e['mm'][key]:
            L.append('<node TEXT=%s ID="%s" COLOR="#000000"><edge COLOR="%s" WIDTH="1"/><font NAME="Times New Roman" SIZE="11"/></node>' % (quoteattr(leaf), nid(), col))
        L.append('</node>')
    L += ['</node>', '</map>']
    open(path, 'w', encoding='utf-8').write('\n'.join(L))

# ---------------- rendu graphique ----------------
def curve(ax, x0, y0, x1, y1, col, lw):
    mx = (x0 + x1) / 2
    p = Path([(x0, y0), (mx, y0), (mx, y1), (x1, y1)], [Path.MOVETO, Path.CURVE4, Path.CURVE4, Path.CURVE4])
    ax.add_patch(mpatches.PathPatch(p, fc='none', ec=col, lw=lw))

def render(e, path, W=694.0):  # W en points (24,5 cm)
    LH, GAP_LEAF, GAP_BR, WRAP = 13.2, 3.0, 12.0, 34
    sides = {'right': [], 'left': []}
    for key, label, side, col in BRANCHES:
        leaves = [textwrap.wrap(t, WRAP) for t in e['mm'][key]]
        h = sum(len(l) * LH + GAP_LEAF for l in leaves)
        sides[side].append((label, col, leaves, h))
    tot = {s: sum(b[3] for b in v) + GAP_BR * (len(v) - 1) for s, v in sides.items()}
    H = max(tot.values()) + 24
    fig = plt.figure(figsize=(W / 72, H / 72))
    ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, W); ax.set_ylim(0, H); ax.axis('off')
    cx, cy = W / 2, H / 2
    root = '\n'.join(textwrap.wrap(e['court'], 16))
    ax.text(cx, cy, root, ha='center', va='center', fontsize=13, fontweight='bold', color='white',
            bbox=dict(boxstyle='round,pad=0.6', fc='#1F3864', ec='#1F3864'), zorder=5)
    for side, sign in (('right', 1), ('left', -1)):
        y = cy + tot[side] / 2
        bx = cx + sign * 118
        lx = cx + sign * 180
        for label, col, leaves, h in sides[side]:
            top = y
            ys = []
            for l in leaves:
                n = len(l)
                ys.append(top - n * LH / 2)
                top -= n * LH + GAP_LEAF
            by = (ys[0] + ys[-1]) / 2
            curve(ax, cx + sign * 40, cy, bx - sign * 42, by, col, 2.6)
            ax.text(bx, by, label, ha='center', va='center', fontsize=11, fontweight='bold', color=col,
                    bbox=dict(boxstyle='round,pad=0.35', fc='white', ec=col, lw=1.4), zorder=5)
            for l, ly in zip(leaves, ys):
                curve(ax, bx + sign * 42, by, lx - sign * 4, ly, col, 1.0)
                ax.text(lx, ly, '\n'.join(l), ha='left' if sign > 0 else 'right', va='center', fontsize=11,
                        linespacing=1.0, zorder=5)
            y -= h + GAP_BR
    fig.savefig(path, dpi=220, facecolor='white')
    plt.close(fig)
    return H / 72

if __name__ == '__main__':
    heights = {}
    for e in EXPERIENCES:
        write_mm(e, 'out/%s_schema_directeur.mm' % e['id'])
        heights[e['id']] = render(e, 'img/%s_mindmap.png' % e['id'])
    json.dump(heights, open('img/mm_heights.json', 'w'))
    print(heights)
