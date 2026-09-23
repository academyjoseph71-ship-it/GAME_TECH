import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
plt.rcParams.update({'font.family':'serif','font.serif':['Times New Roman','Liberation Serif'],'font.size':11,
 'axes.spines.top':False,'axes.spines.right':False,'axes.edgecolor':'#555','axes.linewidth':0.8,'savefig.dpi':220})
C='#2F5D8A'
def fr(x): return ('%.1f'%x).replace('.',',')
def hbar(name,labels,vals,n,wcm=15,xlabel='Effectif'):
    h=0.40*len(labels)+0.85
    fig,ax=plt.subplots(figsize=(wcm/2.54,h))
    y=range(len(labels))[::-1]
    ax.barh(list(y),vals,color=C,height=0.62)
    ax.set_yticks(list(y)); ax.set_yticklabels(labels)
    m=max(vals)
    for yi,v in zip(y,vals):
        ax.text(v+m*0.015,yi,'%d (%s %%)'%(v,fr(100*v/n)),va='center',fontsize=11)
    ax.set_xlim(0,m*1.28); ax.set_xlabel(xlabel)
    ax.tick_params(axis='y',length=0)
    ax.xaxis.grid(True,color='#ddd',lw=0.6); ax.set_axisbelow(True)
    fig.tight_layout(); fig.savefig('charts/%s.png'%name, facecolor='white'); plt.close(fig)
    from PIL import Image; Image.open('charts/%s.png'%name).convert('RGB').save('charts/%s.png'%name)
    return h
out={}
out['sexe']=hbar('sexe',['Masculin','Féminin'],[44,18],62)
out['tech_epe']=hbar('tech_epe',['Questions écrites','Questions orales','Observation des comportements','Travaux de groupe','Jeux de rôle','Études de cas'],[56,40,17,16,9,8],62)
out['profil']=hbar('profil',['Exclusivement écrit/oral','Avec travaux pratiques\n(sans observation)','Avec observation\ndes comportements'],[28,17,17],62)
out['freq']=hbar('freq',['Souvent','Très souvent','Rarement'],[35,24,2],61)
out['civ']=hbar('civ',['Tout à fait','Partiellement'],[51,11],62)
out['appr']=hbar('appr',['Oui, tout à fait','Partiellement'],[51,11],62)
out['compo']=hbar('compo',['Positivement','Aucun effet'],[56,6],62)
out['satis']=hbar('satis',['Satisfait(e)','Très satisfait(e)','Peu satisfait(e)'],[35,19,7],61)
out['diff']=hbar('diff',['Oui','Non'],[54,8],62)
out['nat_diff']=hbar('nat_diff',["Insuffisance de temps","Manque d'outils adaptés","Effectifs élevés","Autres","Manque de formation"],[36,31,23,8,5],54)
out['sugg']=hbar('sugg',["Gestion du temps et des effectifs","Évaluation en situation réelle","Autres","Matériel, documents et outils","Participation active des élèves","Diversification des techniques","Formation et accompagnement"],[15,14,13,12,5,5,4],62)
out['tech_form']=hbar('tech_form',['Questions écrites','Travaux de groupe','Questions orales','Études de cas','Jeux de rôle','Observation des comportements'],[4,4,3,2,2,2],4)
out['diff_form']=hbar('diff_form',["Manque d'outils adaptés","Effectifs élevés","Manque de formation","Autres"],[4,3,1,1],4)
import json; json.dump(out,open('charts/heights.json','w'))
