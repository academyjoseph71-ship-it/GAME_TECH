const fs = require('fs');
const path = require('path');
const D = require('./node_modules/docx');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, HeadingLevel, LevelFormat, PageBreak, Footer, PageNumber, NumberFormat, ShadingType,
  TableOfContents, SimpleField, PageOrientation, VerticalAlign, SectionType, TableLayoutType,
} = D;
const { content, references, annexes, S1, S1taux } = require('./content.js');

const FONT = 'Times New Roman';
const CM = 567; // DXA par cm
const MARGIN = Math.round(2.5 * CM);
const LINE = 360; // interligne 1,5
const HEIGHTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'charts/heights.json')));

// ---------- numérotation des tableaux et figures ----------
const num = { T: {}, F: {} };
let nt = 0, nf = 0;
for (const it of content) {
  if (it.type === 'table' && !it.annex) num.T[it.key] = ++nt;
  if (it.type === 'figure') num.F[it.key] = ++nf;
}
const resolve = (s) => s
  .replace(/\{T:(\w+)\}/g, (_, k) => { if (!num.T[k]) throw new Error('ref T ' + k); return 'tableau ' + num.T[k]; })
  .replace(/\{F:(\w+)\}/g, (_, k) => { if (!num.F[k]) throw new Error('ref F ' + k); return 'figure ' + num.F[k]; });

// typographie française : espaces insécables
const frTypo = (s) => s.replace(/ ([:;?!»%])/g, ' $1').replace(/« /g, '« ').replace(/(\d) (\d{3})\b/g, '$1 $2').replace(/\b([nN]) = /g, '$1\u00A0=\u00A0');

// ---------- balisage en ligne ----------
function runs(text, base = {}) {
  const s = frTypo(resolve(text));
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\{\{[^}]+\}\})/g;
  let last = 0, m;
  const push = (t, o) => { if (t) out.push(new TextRun({ text: t, font: FONT, ...base, ...o })); };
  while ((m = re.exec(s))) {
    push(s.slice(last, m.index), {});
    const tok = m[0];
    if (tok.startsWith('**')) {
      // gras pouvant contenir de l'italique
      const inner = tok.slice(2, -2);
      inner.split(/(\*[^*]+\*)/).forEach((p) => {
        if (p.startsWith('*') && p.endsWith('*') && p.length > 1) push(p.slice(1, -1), { bold: true, italics: true });
        else push(p, { bold: true });
      });
    } else if (tok.startsWith('{{')) push(tok.slice(2, -2), { highlight: 'yellow' });
    else push(tok.slice(1, -1), { italics: true });
    last = m.index + tok.length;
  }
  push(s.slice(last), {});
  return out;
}

// ---------- blocs ----------
const para = (text, o = {}) => new Paragraph({
  children: runs(text, o.run || {}),
  alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { line: o.line || LINE, after: o.after ?? 120, before: o.before ?? 0 },
  indent: o.indent || (o.noIndent ? undefined : { firstLine: Math.round(1.25 * CM) }),
  keepNext: o.keepNext, keepLines: o.keepLines,
  style: o.style,
});

let listInstance = 0;
const listItems = (items, ref) => {
  const inst = ++listInstance;
  return items.map((t, i) => new Paragraph({
    children: runs(t),
    numbering: { reference: ref, level: 0, instance: inst },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: LINE, after: i === items.length - 1 ? 120 : 40 },
  }));
};

const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };

const small = (text, o = {}) => new Paragraph({
  children: runs(text, { size: o.size || 22, ...(o.run || {}) }),
  alignment: o.align || AlignmentType.LEFT,
  spacing: { line: 240, before: o.before ?? 0, after: o.after ?? 0 },
  keepNext: o.keepNext,
});

function caption(label, n, title, useSeq, keepNext = true, breakBefore = false) {
  const kids = [new TextRun({ text: label + ' ', bold: true, font: FONT, size: 22 })];
  if (useSeq) kids.push(new SimpleField(`SEQ ${label} \\* ARABIC`, String(n)));
  else kids.push(new TextRun({ text: String(n), bold: true, font: FONT, size: 22 }));
  kids.push(new TextRun({ text: ' : ', bold: true, font: FONT, size: 22 }));
  kids.push(...runs(title, { size: 22 }));
  return new Paragraph({
    children: kids, style: 'Caption', alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100, line: 240 }, keepNext, pageBreakBefore: breakBefore,
  });
}
const sourceP = (src) => new Paragraph({
  children: [new TextRun({ text: 'Source : ', italics: true, font: FONT, size: 22 }), ...runs(src, { size: 22, italics: true })],
  alignment: AlignmentType.LEFT, spacing: { before: 60, after: 240, line: 240 },
});

function table(it, totalWidthCm = 16) {
  const fs = it.fontSize || 22;
  const widths = it.widths.map((w) => Math.round(w * CM));
  const tw = widths.reduce((a, b) => a + b, 0);
  const ncol = widths.length;
  const align = (j) => {
    const a = it.align ? it.align[j] : (j === 0 ? 'left' : 'center');
    return a === 'left' ? AlignmentType.LEFT : AlignmentType.CENTER;
  };
  const cell = (txt, j, o = {}) => new TableCell({
    borders, width: { size: widths.slice(j, j + (o.span || 1)).reduce((a, b) => a + b, 0), type: WidthType.DXA },
    shading: o.head ? { fill: 'D9E2F3', type: ShadingType.CLEAR, color: 'auto' } : (o.total ? { fill: 'F2F2F2', type: ShadingType.CLEAR, color: 'auto' } : undefined),
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: o.span,
    children: [new Paragraph({
      children: runs(txt, { size: fs, bold: !!(o.head || o.bold) }),
      alignment: o.head ? AlignmentType.CENTER : align(j), spacing: { line: 240, before: 0, after: 0 },
    })],
  });
  const rows = [];
  if (it.headRows) rows.push(...it.headRows(cell));
  else rows.push(new TableRow({ tableHeader: true, cantSplit: true, children: it.head.map((h, j) => cell(h, j, { head: true })) }));
  it.rows.forEach((r, i) => {
    const isTot = (it.totalRow && i === it.rows.length - 1) || (it.boldRows && it.boldRows.includes(i));
    rows.push(new TableRow({ cantSplit: true, children: r.map((c, j) => cell(c, j, { bold: isTot, total: isTot })) }));
  });
  const out = [];
  if (it.annex) out.push(caption('Tableau', it.annex, it.title, false, true, !!it.breakBefore));
  else out.push(caption('Tableau', num.T[it.key], it.title, true));
  out.push(new Table({ width: { size: tw, type: WidthType.DXA }, columnWidths: widths, rows, alignment: AlignmentType.CENTER, layout: TableLayoutType.FIXED }));
  if (it.note) out.push(small(it.note, { before: 60, size: 20 }));
  if (it.source) out.push(sourceP(it.source));
  return out;
}

function figure(it) {
  const out = [caption('Figure', num.F[it.key], it.title, true)];
  if (it.img) {
    const w = 15 / 2.54; // pouces
    const h = HEIGHTS[it.img];
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { line: 240, after: 0 },
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(__dirname, 'charts', it.img + '.png')), transformation: { width: Math.round(w * 96), height: Math.round(h * 96) } })],
    }));
  } else {
    out.push(new Table({
      width: { size: 9072, type: WidthType.DXA }, columnWidths: [9072], alignment: AlignmentType.CENTER,
      rows: [new TableRow({ height: { value: Math.round(6 * CM), rule: 'atLeast' }, children: [new TableCell({ borders, width: { size: 9072, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, children: [small(it.placeholder, { align: AlignmentType.CENTER })] })] })],
    }));
  }
  out.push(sourceP(it.source));
  return out;
}

const heading = (text, level) => new Paragraph({ heading: level, children: runs(text) });

function render(items) {
  const out = [];
  for (const it of items) {
    switch (it.type) {
      case 'h1': out.push(heading(it.t, HeadingLevel.HEADING_1)); break;
      case 'h2': out.push(heading(it.t, HeadingLevel.HEADING_2)); break;
      case 'h3': out.push(heading(it.t, HeadingLevel.HEADING_3)); break;
      case 'annexTitle': out.push(heading(it.t, HeadingLevel.HEADING_2)); break;
      case 'p':
        if (it.quote) out.push(para(it.t, { noIndent: true, indent: { left: Math.round(1 * CM), right: Math.round(1 * CM) }, align: AlignmentType.JUSTIFIED }));
        else out.push(para(it.t, { noIndent: it.noIndent, keepNext: it.keepNext }));
        break;
      case 'bullets': out.push(...listItems(it.items, 'tiret')); break;
      case 'numbered': out.push(...listItems(it.items, 'chiffre')); break;
      case 'table': out.push(...table(it)); break;
      case 'figure': out.push(...figure(it)); break;
      default: throw new Error('type ' + it.type);
    }
  }
  return out;
}

// ---------- page de garde ----------
const logo = fs.readFileSync(path.join(__dirname, 'odt/media/image2.jpeg'));
const c = (text, o = {}) => new Paragraph({
  alignment: o.align || AlignmentType.CENTER, spacing: { line: o.line || 240, before: o.before || 0, after: o.after || 0 },
  children: runs(text, { size: o.size || 24, bold: o.bold, allCaps: o.caps }),
  border: o.border,
});
const coverCell = (children, w) => new TableCell({ borders: noBorders, width: { size: w, type: WidthType.DXA }, children });
const box = { style: BorderStyle.DOUBLE, size: 6, color: '1F3864', space: 6 };
const cover = [
  new Table({
    width: { size: 9072, type: WidthType.DXA }, columnWidths: [4536, 4536], borders: noBorders,
    rows: [new TableRow({ children: [
      coverCell([
        c('**MINISTÈRE DES ENSEIGNEMENTS PRIMAIRE ET SECONDAIRE**', { size: 20 }), c('----------', { size: 20 }),
        c('**SECRÉTARIAT GÉNÉRAL**', { size: 20 }), c('----------', { size: 20 }),
        c('**DIRECTION DES RESSOURCES HUMAINES (DRH)**', { size: 20 }),
      ], 4536),
      coverCell([
        c('**RÉPUBLIQUE TOGOLAISE**', { size: 20 }), c('*Travail – Liberté – Patrie*', { size: 20 }), c('----------', { size: 20 }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 240, before: 60, after: 60 }, children: [new ImageRun({ type: 'jpg', data: logo, transformation: { width: 147, height: 70 } })] }),
        c('**INSTITUT NATIONAL DES SCIENCES DE L’ÉDUCATION (INSE)**', { size: 20 }),
      ], 4536),
    ] })],
  }),
  c('**MASTER PROFESSIONNEL EN SCIENCES DE L’ÉDUCATION ET DE LA FORMATION**', { before: 900, size: 24 }),
  c('Mention : Formation des formateurs des écoles normales', { before: 80 }),
  c('Spécialité : Sciences humaines', { before: 40 }),
  c('**MÉMOIRE DE MASTER PROFESSIONNEL**', { before: 900, size: 28 }),
  c('Rapport de stage en responsabilité effectué à l’ENFPE de Notsè', { before: 80 }),
  c('du 16 mars au 13 juin 2026', { before: 0 }),
  c('**THÈME**', { before: 900, size: 24 }),
  new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120, line: 276 },
    border: { top: box, bottom: box, left: box, right: box },
    indent: { left: 400, right: 400 },
    children: runs('**ANALYSE DES TECHNIQUES D’ÉVALUATION EN ÉDUCATION CIVIQUE ET MORALE (ECM) SUR LA NOTION DE CITOYENNETÉ À L’ENFPE DE NOTSÈ**', { size: 28 }),
  }),
  new Table({
    width: { size: 9072, type: WidthType.DXA }, columnWidths: [4536, 4536], borders: noBorders,
    rows: [new TableRow({ children: [
      coverCell([
        c('**Présenté par :**', { align: AlignmentType.LEFT, before: 700 }),
        c('KOGNI Koffi Joseph', { align: AlignmentType.LEFT, before: 60 }),
      ], 4536),
      coverCell([
        c('**Sous la direction de :**', { align: AlignmentType.LEFT, before: 700 }),
        c('{{[Nom et grade du directeur de mémoire]}}', { align: AlignmentType.LEFT, before: 60 }),
        c('**Encadreurs de stage :**', { align: AlignmentType.LEFT, before: 200 }),
        c('M. ADANGLO Kwami, directeur de l’ENFPE', { align: AlignmentType.LEFT, before: 60 }),
        c('M. EZA Agbéko Kossi, DACE', { align: AlignmentType.LEFT }),
        c('Les formateurs du champ Sciences humaines', { align: AlignmentType.LEFT }),
      ], 4536),
    ] })],
  }),
  c('Année académique : {{2025-2026}} – Harmattan 1', { before: 700, bold: true }),
];

// ---------- pages liminaires ----------
const frontTitle = (t) => new Paragraph({ style: 'FrontTitle', children: runs(t), pageBreakBefore: true });
const remerciements = [
  frontTitle('REMERCIEMENTS'),
  para('Nous tenons à exprimer notre sincère gratitude :', { noIndent: true }),
  ...listItems([
    'à Dieu tout-puissant, qui nous a permis d’accomplir ce stage en toute quiétude et en bonne santé ;',
    'à {{[M./Mme …]}}, notre directeur de mémoire, pour sa disponibilité et ses orientations ;',
    'à M. ADANGLO Kwami, directeur de l’ENFPE de Notsè, pour son accueil favorable au sein de son établissement, ainsi que pour ses encouragements et ses conseils ;',
    'à M. EZA Agbéko Kossi, directeur adjoint chargé des études, pour ses encouragements, ses conseils et son encadrement pédagogique, malgré un emploi du temps très chargé ;',
    'à M. DARE Oubote, M. DEGBE Vignon et M. OGATCHA, nos encadreurs, pour leurs conseils et leur accompagnement pédagogique indéfectible ;',
    'à l’ensemble du personnel de l’ENFPE de Notsè, pour ses contributions multiformes à la réussite de notre stage en responsabilité.',
  ], 'tiret'),
  para('Que chacun trouve ici l’expression de notre profonde reconnaissance.'),
];
const sigles = [
  ['APC', 'Approche par les compétences'], ['CPE', 'Conseiller principal d’éducation'], ['DACE', 'Directeur adjoint chargé des études'],
  ['DAF', 'Direction des affaires financières'], ['DEPP', 'Direction des enseignements préscolaire et primaire'],
  ['DExCC', 'Direction des examens, concours et certifications'], ['DPIP', 'Direction des programmes et innovations pédagogiques'],
  ['DRH', 'Direction des ressources humaines'], ['DST', 'Devoir sur table'], ['ECM', 'Éducation civique et morale'],
  ['ENFPE', 'École normale de formation des professeurs d’école'], ['ENI', 'École normale d’instituteurs'],
  ['EPA', 'École primaire d’application'], ['EPE', 'Élève-professeur d’école'],
  ['EP-ENFPE', 'Élève-professeur d’École normale de formation des professeurs d’école'], ['EPP', 'École primaire publique'],
  ['EPS', 'Éducation physique et sportive'], ['GC', 'Groupe-classe'],
  ['IFADEM', 'Initiative francophone pour la formation à distance des maîtres'], ['IGE', 'Inspection générale de l’éducation'],
  ['INSE', 'Institut national des sciences de l’éducation'], ['MEPS', 'Ministère des Enseignements primaire et secondaire'],
  ['MEPSTA', 'Ministère des Enseignements primaire, secondaire, technique et de l’Artisanat'], ['ODD', 'Objectif de développement durable'],
  ['OO', 'Objectif opérationnel'], ['PSE', 'Plan sectoriel de l’éducation'], ['QS', 'Question secondaire'], ['SH', 'Sciences humaines'],
  ['SPA', 'Stage de pratique accompagnée'], ['SR', 'Stage en responsabilité'], ['TPA', 'Techniques de pédagogie active'],
  ['UE', 'Unité d’enseignement'], ['UEL', 'Unité d’enseignement libre'],
  ['UNESCO', 'Organisation des Nations unies pour l’éducation, la science et la culture'],
];
const siglesBlock = [
  frontTitle('SIGLES, ABRÉVIATIONS ET ACRONYMES'),
  new Table({
    width: { size: 9072, type: WidthType.DXA }, columnWidths: [2268, 6804], borders: noBorders,
    rows: sigles.map(([a, b]) => new TableRow({ children: [
      new TableCell({ borders: noBorders, width: { size: 2268, type: WidthType.DXA }, children: [new Paragraph({ spacing: { line: 276, after: 20 }, children: runs('**' + a + '**') })] }),
      new TableCell({ borders: noBorders, width: { size: 6804, type: WidthType.DXA }, children: [new Paragraph({ spacing: { line: 276, after: 20 }, children: runs(': ' + b) })] }),
    ] })),
  }),
];
const toc = (title, opts) => [frontTitle(title), new TableOfContents(title, { hyperlink: true, ...opts })];

// ---------- références ----------
const refBlock = [
  heading('RÉFÉRENCES BIBLIOGRAPHIQUES', HeadingLevel.HEADING_1),
  ...references.map((r) => new Paragraph({
    children: runs(r), alignment: AlignmentType.LEFT,
    spacing: { line: LINE, after: 120 }, indent: { left: Math.round(1.27 * CM), hanging: Math.round(1.27 * CM) },
  })),
];

// ---------- annexes ----------
const annexBlock = [heading('ANNEXES', HeadingLevel.HEADING_1), ...render(annexes)];

const W_L = 14004; // largeur utile en paysage
const grp = (cellFn, labels) => {
  const head1 = new TableRow({ tableHeader: true, children: [cellFn('ENFPE', 0, { head: true }), ...labels.map((l, i) => cellFn(l, 1 + i * 3, { head: true, span: 3 }))] });
  const sub = [];
  labels.forEach((_, i) => ['H', 'F', 'T'].forEach((x, k) => sub.push(cellFn(x, 1 + i * 3 + k, { head: true }))));
  const head2 = new TableRow({ tableHeader: true, children: [cellFn('', 0, { head: true }), ...sub] });
  return [head1, head2];
};
const annex4 = [
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs('Annexe 4 : Résultats détaillés du semestre 1 de la promotion 4 par ENFPE et par sexe') }),
  ...table({
    annex: 'A2', title: 'Effectifs des EPE par ENFPE, statut et sexe (semestre 1, promotion 4)',
    widths: [3.1, ...Array(15).fill(1.3)], headRows: (cell) => grp(cell, ['Inscrits', 'Présents', 'Admis (35 crédits)', 'Rattrapage (25 à 34 crédits)', 'Renvoi (moins de 25 crédits)']),
    rows: S1, boldRows: [2, 8, 9], 
    note: 'Note. H = hommes ; F = femmes ; T = total.',
    source: 'Direction des programmes et innovations pédagogiques (DPIP), coordination des ENFPE (2026).',
  }),
  ...table({
    annex: 'A3', breakBefore: true, title: 'Taux de réussite, de rattrapage et de renvoi par ENFPE et par sexe, en % (semestre 1, promotion 4)',
    widths: [3.6, ...Array(9).fill(2.1)], headRows: (cell) => grp(cell, ['Taux de réussite', 'Taux de rattrapage', 'Taux de renvoi']),
    rows: S1taux, boldRows: [2, 8, 9], 
    source: 'Direction des programmes et innovations pédagogiques (DPIP), coordination des ENFPE (2026).',
  }),
];

// ---------- styles et document ----------
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 22 })] })] });
const portrait = { size: { width: 11906, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, footer: 567 } };

const doc = new Document({
  creator: 'KOGNI Koffi Joseph',
  title: 'Analyse des techniques d’évaluation en ECM sur la notion de citoyenneté à l’ENFPE de Notsè',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 24 }, paragraph: { spacing: { line: LINE } } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 28, bold: true, color: '1F3864' },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 360, line: LINE }, outlineLevel: 0, pageBreakBefore: true, keepNext: true } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 24, bold: true, color: '1F3864' },
        paragraph: { spacing: { before: 360, after: 120, line: LINE }, outlineLevel: 1, keepNext: true, keepLines: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 24, bold: true, italics: true },
        paragraph: { spacing: { before: 240, after: 120, line: LINE }, outlineLevel: 2, keepNext: true, keepLines: true } },
      { id: 'FrontTitle', name: 'Titre liminaire', basedOn: 'Normal', next: 'Normal',
        run: { font: FONT, size: 28, bold: true, color: '1F3864' },
        paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 480, line: LINE } } },
      { id: 'Caption', name: 'Caption', basedOn: 'Normal', next: 'Normal', run: { font: FONT, size: 22 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'tiret', levels: [{ level: 0, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 709, hanging: 354 } } } }] },
      { reference: 'chiffre', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 709, hanging: 354 } } } }] },
    ],
  },
  sections: [
    { properties: { page: portrait }, children: cover },
    {
      properties: { page: { ...portrait, pageNumbers: { start: 1, formatType: NumberFormat.LOWER_ROMAN } } },
      footers: { default: footer },
      children: [
        ...remerciements, ...siglesBlock,
        ...toc('SOMMAIRE', { headingStyleRange: '1-2' }),
        ...toc('LISTE DES TABLEAUX', { captionLabelIncludingNumbers: 'Tableau' }),
        ...toc('LISTE DES FIGURES', { captionLabelIncludingNumbers: 'Figure' }),
      ],
    },
    {
      properties: { page: { ...portrait, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      footers: { default: footer },
      children: [...render(content), ...refBlock, ...annexBlock],
    },
    {
      properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: portrait.margin } },
      footers: { default: footer },
      children: annex4,
    },
    {
      properties: { type: SectionType.NEXT_PAGE, page: portrait },
      footers: { default: footer },
      children: [frontTitle('TABLE DES MATIÈRES'), new TableOfContents('TABLE DES MATIÈRES', { hyperlink: true, headingStyleRange: '1-3' })],
    },
  ],
});

const JSZip = require('./node_modules/jszip');
Packer.toBuffer(doc).then(async (buf) => {
  // mise en forme (gras, 11 pt) du numéro contenu dans les champs SEQ
  const zip = await JSZip.loadAsync(buf);
  let xml = await zip.file('word/document.xml').async('string');
  const rpr = '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>';
  let k = 0;
  xml = xml.replace(/(<w:fldSimple w:instr="[^"]*SEQ[^"]*"[^>]*>\s*<w:r>)(?!<w:rPr>)/g, (m, a) => { k++; return a + rpr; });
  // interligne « multiple » explicite (évite l'interprétation « exacte » qui rogne les images)
  const addRule = (x) => x.replace(/<w:spacing((?:(?!\/>)[^>])*?)w:line="(\d+)"((?:(?!\/>)[^>])*?)\/>/g, (m, a, v, b) => m.includes('lineRule') ? m : `<w:spacing${a}w:line="${v}" w:lineRule="auto"${b}/>`);
  xml = addRule(xml);
  zip.file('word/styles.xml', addRule(await zip.file('word/styles.xml').async('string')));
  zip.file('word/document.xml', xml);
  buf = await zip.generateAsync({ type: 'nodebuffer' });
  console.log('SEQ formatés', k);
  fs.writeFileSync(path.join(__dirname, 'out/memoire_raw.docx'), buf);
  console.log('ok', nt, 'tableaux', nf, 'figures');
});
