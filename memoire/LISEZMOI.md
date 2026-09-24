# Mémoire : Difficultés des élèves-professeurs dans l'enseignement des fractions au primaire (ENFPE de Notsè)

- `Memoire_Fractions_ENFPE_Notse.docx` : le mémoire complet (Times New Roman 12, interligne 1,5, marges 2,5 cm).
- `Memoire_Fractions_ENFPE_Notse_apercu.pdf` : aperçu PDF du même document.
- `donnees_SIMULEES_echantillon_100_EPE.csv` : jeu de données **simulé** ayant servi à calculer les tableaux et graphiques du chapitre 4. À remplacer par les données réellement collectées.
- `sources/` : textes balisés par chapitre et scripts de génération (`data.py` pour les statistiques, `charts.py` pour les graphiques, `build.js` pour le .docx, `findpages.py` pour les numéros de page du sommaire et de la table des matières).

Régénération : `python3 data.py && python3 charts.py && node build.js`, puis conversion PDF, `python3 findpages.py` et `node build.js pages.json` pour fixer les numéros de page.
