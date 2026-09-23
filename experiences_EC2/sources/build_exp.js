const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, HeadingLevel, LevelFormat, Footer, PageNumber, ShadingType, TableOfContents, SimpleField,
  PageOrientation, VerticalAlign, SectionType, TableLayoutType,
} = require('./node_modules/docx');
const JSZip = require('./node_modules/jszip');

const EXP = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json')));
const HD = JSON.parse(fs.readFileSync(path.join(__dirname, 'img/dispo_heights.json')));
const HM = JSON.parse(fs.readFileSync(path.join(__dirname, 'img/mm_heights.json')));
const FONT = 'Times New Roman', CM = 567, MARGIN = Math.round(2.5 * CM), LINE = 360;
const SRC_FIG = 'Réalisation de l’auteur (2026), d’après le support de cours de l’EC2 « Maladies et hygiène » (2STE1275).';

const SITUATIONS = {
  exp1: 'Dans un village, les familles boivent l’eau du marigot et plusieurs enfants souffrent de diarrhée. Comment rendre cette eau propre à la consommation sans rien acheter ?',
  exp2: 'Un grand frère affirme que la cigarette « ne fait que de la fumée » et qu’elle ne laisse rien dans le corps. Comment lui prouver le contraire ?',
  exp3: 'Après la récréation, des élèves mangent sans se laver les mains, car « les mains sont propres puisqu’on ne voit rien dessus ». Comment leur montrer ce qu’on ne voit pas ?',
  exp4: 'Malgré les moustiquaires, les cas de paludisme restent nombreux dans le quartier de l’école. D’où viennent les moustiques et comment réduire leur nombre ?',
  exp5: 'Autour de l’école, les sachets plastiques s’accumulent alors que les épluchures disparaissent. Tous les déchets finissent-ils par disparaître dans le sol ?',
};

const CHAP = { exp1: 'Chapitres 5 et 1', exp2: 'Chapitre 4', exp3: 'Chapitres 1 et 3', exp4: 'Chapitre 1', exp5: 'Chapitres 6 et 5' };
const frTypo = (s) => s.replace(/ ([:;?!»%])/g, ' $1').replace(/« /g, '« ');
function runs(text, base = {}) {
  const s = frTypo(text), out = [], re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m;
  const push = (t, o) => { if (t) out.push(new TextRun({ text: t, font: FONT, ...base, ...o })); };
  while ((m = re.exec(s))) {
    push(s.slice(last, m.index), {});
    if (m[0].startsWith('**')) push(m[0].slice(2, -2), { bold: true }); else push(m[0].slice(1, -1), { italics: true });
    last = m.index + m[0].length;
  }
  push(s.slice(last), {});
  return out;
}
const para = (t, o = {}) => new Paragraph({
  children: runs(t, o.run || {}), alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { line: LINE, after: o.after ?? 120, before: o.before ?? 0 },
  indent: o.noIndent ? undefined : { firstLine: Math.round(1.25 * CM) }, keepNext: o.keepNext,
});
let inst = 0;
const list = (items, ref) => { const k = ++inst; return items.map((t, i) => new Paragraph({
  children: runs(t), numbering: { reference: ref, level: 0, instance: k }, alignment: AlignmentType.JUSTIFIED,
  spacing: { line: LINE, after: i === items.length - 1 ? 120 : 40 } })); };
const h = (t, level) => new Paragraph({ heading: level, children: runs(t) });

const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };
const noB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noB, bottom: noB, left: noB, right: noB, insideHorizontal: noB, insideVertical: noB };

let nT = 0, nF = 0;
function caption(label, n, title) {
  return new Paragraph({
    style: 'Caption', alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 200, after: 100, line: 240 },
    children: [new TextRun({ text: label + ' ', bold: true, font: FONT, size: 22 }), new SimpleField(`SEQ ${label} \\* ARABIC`, String(n)),
      new TextRun({ text: ' : ', bold: true, font: FONT, size: 22 }), ...runs(title, { size: 22 })],
  });
}
const source = (s) => new Paragraph({ spacing: { before: 60, after: 240, line: 240 },
  children: [new TextRun({ text: 'Source : ', italics: true, font: FONT, size: 22 }), ...runs(s, { size: 22, italics: true })] });

function table(title, head, rows, widthsCm, src, o = {}) {
  const w = widthsCm.map((x) => Math.round(x * CM));
  const cell = (t, j, hd) => new TableCell({
    borders, width: { size: w[j], type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    shading: hd ? { fill: 'D9E2F3', type: ShadingType.CLEAR, color: 'auto' } : (o.firstColShade && j === 0 ? { fill: 'F2F2F2', type: ShadingType.CLEAR, color: 'auto' } : undefined),
    children: [new Paragraph({ spacing: { line: 240 }, alignment: hd ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: runs(t, { size: 22, bold: hd || (o.firstColBold && j === 0) }) })],
  });
  const tr = [];
  if (head) tr.push(new TableRow({ tableHeader: true, cantSplit: true, children: head.map((x, j) => cell(x, j, true)) }));
  rows.forEach((r) => tr.push(new TableRow({ cantSplit: true, children: r.map((x, j) => cell(x, j, false)) })));
  return [caption('Tableau', ++nT, title),
    new Table({ width: { size: w.reduce((a, b) => a + b), type: WidthType.DXA }, columnWidths: w, rows: tr, alignment: AlignmentType.CENTER, layout: TableLayoutType.FIXED }),
    source(src)];
}
function figure(title, file, wCm, hIn, src) {
  return [caption('Figure', ++nF, title),
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { line: 240 },
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(__dirname, 'img', file)),
        transformation: { width: Math.round(wCm / 2.54 * 96), height: Math.round(hIn * (wCm / (file.includes('mindmap') ? 24.48 : 15)) * 96) } })] }),
    source(src)];
}

// ---------- page de garde ----------
const c = (t, o = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 276, before: o.before || 0, after: o.after || 0 }, children: runs(t, { size: o.size || 24, bold: o.bold }) });
const box = { style: BorderStyle.DOUBLE, size: 6, color: '1F3864', space: 8 };
const cover = [
  new Table({ width: { size: 9072, type: WidthType.DXA }, columnWidths: [4536, 4536], borders: noBorders, rows: [new TableRow({ children: [
    new TableCell({ borders: noBorders, width: { size: 4536, type: WidthType.DXA }, children: [c('**MINISTÈRE DE L’ÉDUCATION NATIONALE**', { size: 20 }), c('----------', { size: 20 }), c('**ÉCOLE NORMALE DE FORMATION DES PROFESSEURS D’ÉCOLE (ENFPE)**', { size: 20 })] }),
    new TableCell({ borders: noBorders, width: { size: 4536, type: WidthType.DXA }, children: [c('**RÉPUBLIQUE TOGOLAISE**', { size: 20 }), c('*Travail – Liberté – Patrie*', { size: 20 })] }),
  ] })] }),
  c('Champ : Sciences et technologie', { before: 1200 }),
  c('UE STE1275 : Corps humain et maladies', { before: 60 }),
  c('EC2 (2STE1275) : Maladies et hygiène – Semestre 2', { before: 60 }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 900, after: 200, line: 300 }, border: { top: box, bottom: box, left: box, right: box }, indent: { left: 300, right: 300 },
    children: runs('**CINQ EXPÉRIENCES PRATIQUES ARTISANALES RÉALISÉES AVEC LES RESSOURCES LOCALES DU TOGO**', { size: 30, color: '1F3864' }) }),
  c('Démarches, illustrations et schémas directeurs (Freeplane)', { before: 240, size: 26 }),
  c('Sans achat de matériel', { before: 120, size: 24, bold: true }),
  c('Public cible : élèves-professeurs d’école (EPE)', { before: 1400 }),
];

// ---------- introduction ----------
const intro = [
  new Paragraph({ style: 'FrontTitle', pageBreakBefore: true, children: runs('SOMMAIRE') }),
  new TableOfContents('SOMMAIRE', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: runs('INTRODUCTION') }),
  para('Le support de cours de l’EC2 « Maladies et hygiène » prévoit plusieurs travaux pratiques : fabrication d’un filtre à eau, mise en évidence du goudron du tabac, élaboration de la planche du cycle du paludisme et d’affiches sur l’hygiène et l’environnement. Le présent document propose cinq expériences qui rendent ces savoirs concrets et observables, en s’appuyant uniquement sur des ressources disponibles au Togo : objets de récupération, matériaux naturels, matériel de la cuisine, du jardin ou de la salle de classe. Aucune dépense n’est nécessaire.'),
  para('Chaque expérience suit la même démarche d’investigation : une situation-problème tirée de la vie quotidienne, un objectif, la liste du matériel avec le lieu où le trouver, la démarche pas à pas, les observations attendues, leur interprétation en lien avec le cours, les précautions de sécurité et des pistes de prolongement. Une illustration du dispositif et un schéma directeur réalisé dans Freeplane complètent chaque fiche. Le tableau 1 présente une vue d’ensemble des cinq expériences.'),
];
const recap = table('Vue d’ensemble des cinq expériences', ['N°', 'Expérience', 'Chapitre du cours', 'Durée'],
  EXP.map((e, i) => [String(i + 1), e.titre.split(' : ')[1], CHAP[e.id], e.duree]),
  [1.0, 6.4, 3.4, 5.2], 'Réalisation de l’auteur (2026).', {});
const introSuite = [
  h('Consignes générales de sécurité', HeadingLevel.HEADING_2),
  ...list([
    'Les découpes, le feu et la cigarette sont manipulés uniquement par le formateur.',
    'Les élèves ne goûtent, ne boivent et n’inhalent jamais un produit issu d’une expérience.',
    'Les échantillons biologiques (aliments moisis, larves) restent fermés ou couverts, puis sont détruits à la fin.',
    'Chaque séance se termine par un lavage des mains à l’eau et au savon.',
  ], 'tiret'),
  h('Utilisation des schémas directeurs Freeplane', HeadingLevel.HEADING_2),
  para('Les schémas directeurs sont fournis au format Freeplane (fichiers .mm), à ouvrir avec le logiciel libre et gratuit Freeplane (www.freeplane.org). Chaque carte part de l’expérience, au centre, et se divise en sept branches : objectifs, matériel local, démarche, observations, interprétation, sécurité et lien avec le cours. Elles peuvent être projetées en classe, complétées par les élèves-professeurs ou exportées en image (menu Fichier → Exporter).'),
];

// ---------- fiches ----------
function fiche(e, i) {
  const out = [h(e.titre.toUpperCase(), HeadingLevel.HEADING_1)];
  out.push(...table('Fiche signalétique de l’expérience ' + (i + 1), null, [
    ['Lien avec le cours', e.chapitre], ['Durée', e.duree], ['Public', 'Élèves-professeurs d’école ; transposable au CM1-CM2'], ['Coût', 'Aucun : matériel récupéré ou disponible à l’école']],
  [4.0, 12.0], 'Réalisation de l’auteur (2026), d’après le support de cours de l’EC2 (2STE1275).', { firstColBold: true, firstColShade: true }));
  const n = i + 1;
  out.push(h(`${n}.1. Situation-problème`, HeadingLevel.HEADING_2), para(SITUATIONS[e.id]));
  out.push(h(`${n}.2. Objectifs`, HeadingLevel.HEADING_2), ...list(e.objectif, 'tiret'));
  out.push(h(`${n}.3. Matériel et ressources locales`, HeadingLevel.HEADING_2));
  out.push(...table('Matériel de l’expérience ' + n + ' et où le trouver', ['Matériel', 'Où le trouver (sans achat)'], e.materiel.map((m) => [m[0], m[1]]), [8.0, 8.0], 'Réalisation de l’auteur (2026).'));
  out.push(h(`${n}.4. Démarche`, HeadingLevel.HEADING_2), ...list(e.demarche, 'chiffre'));
  out.push(...figure('Dispositif de l’expérience ' + n + ' : ' + e.court.toLowerCase(), e.id + '_dispositif.png', 15, HD[e.id + '_dispositif'], SRC_FIG));
  out.push(h(`${n}.5. Observations attendues`, HeadingLevel.HEADING_2), ...list(e.observations, 'tiret'));
  out.push(h(`${n}.6. Interprétation et conclusion`, HeadingLevel.HEADING_2), ...list(e.interpretation, 'tiret'));
  out.push(h(`${n}.7. Précautions de sécurité`, HeadingLevel.HEADING_2), ...list(e.securite, 'tiret'));
  out.push(h(`${n}.8. Prolongements`, HeadingLevel.HEADING_2), ...list(e.prolongement, 'tiret'));
  return out;
}
function mindmapSection(e, i) {
  return [
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(`${i + 1}.9. Schéma directeur (Freeplane)`) }),
    para(`Fichier source : *${e.id}_schema_directeur.mm*, à ouvrir avec Freeplane.`, { noIndent: true }),
    ...figure('Schéma directeur de l’expérience ' + (i + 1) + ' : ' + e.court.toLowerCase(), e.id + '_mindmap.png', 24.48, HM[e.id], 'Réalisation de l’auteur (2026) avec Freeplane, d’après le support de cours de l’EC2 (2STE1275).'),
  ];
}
const conclusion = [
  h('CONCLUSION', HeadingLevel.HEADING_1),
  para('Ces cinq expériences montrent qu’il est possible de rendre observables des notions abstraites du cours (microbes invisibles, goudrons, cycle du moustique, décomposition des déchets, potabilité de l’eau) sans aucun achat, grâce aux ressources du milieu togolais. Elles placent l’élève-professeur au cœur d’une démarche d’investigation qu’il pourra ensuite transposer dans ses classes du primaire. Elles débouchent enfin sur des actions concrètes de santé et d’hygiène : lave-mains, destruction des gîtes larvaires, compostage, traitement de l’eau et lutte contre le tabagisme.'),
  h('RÉFÉRENCES', HeadingLevel.HEADING_1),
  ...[
    'Djakou, R., et Thanon, S. Y. (1987). *Biologie humaine 3e*. Nouvelles Éditions Africaines ; Bordas.',
    'ENFPE. (s.d.). *UE STE1275 – EC2 (2STE1275) : Maladies et hygiène* [Support de cours]. Champ Sciences et technologie.',
    'Organisation mondiale de la santé. (2009). *Manuel technique de l’OMS pour l’hygiène des mains*. OMS.',
    'SERVEDIT et LIMUSCO. (2000). *Éducation scientifique et initiation à la vie pratique CE : guide du maître*.',
  ].map((r) => new Paragraph({ children: runs(r), spacing: { line: LINE, after: 120 }, indent: { left: 720, hanging: 720 } })),
];

// ---------- document ----------
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 22 })] })] });
const portrait = { size: { width: 11906, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, footer: 567 } };
const landscape = { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: portrait.margin };


const sections = [
  { properties: { page: portrait }, children: cover },
  { properties: { page: { ...portrait, pageNumbers: { start: 1 } } }, footers: { default: footer }, children: [...intro, ...recap, ...introSuite] },
];
EXP.forEach((e, i) => {
  sections.push({ properties: { type: SectionType.NEXT_PAGE, page: portrait }, footers: { default: footer }, children: fiche(e, i) });
  sections.push({ properties: { type: SectionType.NEXT_PAGE, page: landscape }, footers: { default: footer }, children: mindmapSection(e, i) });
});
sections.push({ properties: { type: SectionType.NEXT_PAGE, page: portrait }, footers: { default: footer }, children: conclusion });

const doc = new Document({
  creator: 'ENFPE', title: 'Cinq expériences pratiques artisanales – EC2 Maladies et hygiène', features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 24 }, paragraph: { spacing: { line: LINE } } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 28, bold: true, color: '1F3864' },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 360, line: LINE }, outlineLevel: 0, keepNext: true } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 24, bold: true, color: '1F3864' },
        paragraph: { spacing: { before: 280, after: 120, line: LINE }, outlineLevel: 1, keepNext: true } },
      { id: 'FrontTitle', name: 'Titre liminaire', basedOn: 'Normal', run: { font: FONT, size: 28, bold: true, color: '1F3864' }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 360 } } },
      { id: 'Caption', name: 'Caption', basedOn: 'Normal', run: { font: FONT, size: 22 } },
    ],
  },
  numbering: { config: [
    { reference: 'tiret', levels: [{ level: 0, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 709, hanging: 354 } } } }] },
    { reference: 'chiffre', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 709, hanging: 354 } } } }] },
  ] },
  sections,
});

Packer.toBuffer(doc).then(async (buf) => {
  const zip = await JSZip.loadAsync(buf);
  const rpr = '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>';
  const addRule = (x) => x.replace(/<w:spacing((?:(?!\/>)[^>])*?)w:line="(\d+)"((?:(?!\/>)[^>])*?)\/>/g, (m, a, v, b) => m.includes('lineRule') ? m : `<w:spacing${a}w:line="${v}" w:lineRule="auto"${b}/>`);
  let xml = await zip.file('word/document.xml').async('string');
  xml = addRule(xml.replace(/(<w:fldSimple w:instr="[^"]*SEQ[^"]*"[^>]*>\s*<w:r>)(?!<w:rPr>)/g, '$1' + rpr));
  zip.file('word/document.xml', xml);
  zip.file('word/styles.xml', addRule(await zip.file('word/styles.xml').async('string')));
  fs.writeFileSync(path.join(__dirname, 'out/experiences_raw.docx'), await zip.generateAsync({ type: 'nodebuffer' }));
  console.log('ok', nT, 'tableaux', nF, 'figures');
});
