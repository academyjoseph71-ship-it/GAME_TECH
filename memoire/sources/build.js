// Construit le mémoire (.docx) à partir des fichiers de contenu balisés.
// Usage : node build.js [pages.json]
const fs = require("fs");
const d = require("docx");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, ImageRun, Footer, PageNumber, NumberFormat, TabStopType,
  LevelFormat, VerticalAlign, PageBreak, SectionType,
} = d;

const PAGES = process.argv[2] && fs.existsSync(process.argv[2]) ? JSON.parse(fs.readFileSync(process.argv[2])) : null;
const FONT = "Times New Roman";
const CM = 567;
const TEXTW = 11906 - 2 * 1417; // A4 moins 2 x 2,5 cm = 9072
const LINE15 = 360;

const files = ["01_intro", "ch1", "ch2", "ch3", "ch4", "ch5", "07_conclusion"].map((f) => `content/${f}.txt`);
const frontFile = "content/00_front.txt";
const refsFile = "content/08_refs.txt";
const annexFile = "content/09_annexes.txt";

// ---------- Numérotation des tableaux / graphiques / figures ----------
const counters = { T: 0, G: 0, F: 0 };
const keys = {};
const allText = [frontFile, ...files, annexFile].map((f) => fs.readFileSync(f, "utf8")).join("\n");
for (const line of allText.split("\n")) {
  let m;
  if ((m = line.match(/^@TABLE\s+(\S+)\s*\|/))) keys["T:" + m[1]] = ++counters.T;
  else if ((m = line.match(/^@GRAPH\s+\S+\s+(\S+)\s*\|/))) keys["G:" + m[1]] = ++counters.G;
  else if ((m = line.match(/^@FIG\s+\S+\s+(\S+)\s*\|/))) keys["F:" + m[1]] = ++counters.F;
}
const subst = (s) => s.replace(/\{([TGF]):([^}]+)\}/g, (_, k, n) => {
  const v = keys[k + ":" + n];
  if (!v) throw new Error("Référence inconnue " + k + ":" + n);
  return String(v);
});

// ---------- Inline : **gras**, *italique* ----------
function runs(text, base = {}) {
  text = subst(text);
  const out = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\^(.+?)\^/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, ...base }));
    if (m[1] !== undefined) out.push(new TextRun({ text: m[1], bold: true, font: FONT, ...base }));
    else if (m[2] !== undefined) out.push(new TextRun({ text: m[2], italics: true, font: FONT, ...base }));
    else out.push(new TextRun({ text: m[3], superScript: true, font: FONT, ...base }));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, ...base }));
  return out;
}

const heads = []; // pour la table des matières et la recherche des pages
const captions = { T: [], G: [], F: [] };
let headIdx = 0;
function pageOf(i) { return PAGES ? PAGES[i] || "" : "00"; }

const para = (text, opt = {}) => new Paragraph({
  children: runs(text, opt.run || {}),
  alignment: opt.align || AlignmentType.JUSTIFIED,
  spacing: { line: opt.line || LINE15, after: opt.after ?? 120, before: opt.before || 0 },
  indent: opt.indent || (opt.noindent ? undefined : { firstLine: 709 }),
  keepNext: opt.keepNext,
  pageBreakBefore: opt.pageBreakBefore,
});

function heading(level, text, kind = "body", opts = {}) {
  const idx = headIdx++;
  heads.push({ level, text, kind, toc: opts.toc !== false });
  const hl = [null, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][level];
  return new Paragraph({ heading: hl, children: [new TextRun({ text, font: FONT })], pageBreakBefore: level === 1 && !opts.noBreak, keepNext: true, keepLines: true });
}

// ---------- Tableaux ----------
const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const borders = { top: border, bottom: border, left: border, right: border };
function cellParas(txt, header, align) {
  return subst(txt).split("<br>").map((t) => new Paragraph({
    children: runs(t.trim(), { size: 20, bold: header || undefined }),
    alignment: header ? AlignmentType.CENTER : align,
    spacing: { line: 240, before: 20, after: 20 },
  }));
}
function makeTable(rows, widths) {
  const ncol = rows[0].length;
  if (!widths) {
    const len = Array(ncol).fill(0);
    rows.forEach((r) => r.forEach((c, j) => { len[j] = Math.max(len[j], Math.min(c.length, 60)); }));
    const tot = len.reduce((a, b) => a + b, 0);
    widths = len.map((l) => Math.max(0.08, l / tot));
  }
  const s = widths.reduce((a, b) => a + b, 0);
  let w = widths.map((x) => Math.floor((x / s) * TEXTW));
  w[w.length - 1] += TEXTW - w.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: TEXTW, type: WidthType.DXA },
    columnWidths: w,
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      cantSplit: true,
      children: r.map((c, j) => {
        const cs = r.indexOf("colspan");
        if (cs >= 0 && j > cs) return null;
        if (cs >= 0 && j === cs) {
          const span = r.length - cs, ww = w.slice(cs).reduce((a, b) => a + b, 0);
          return new TableCell({ borders, columnSpan: span, width: { size: ww, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 90, right: 90 }, verticalAlign: VerticalAlign.CENTER, children: cellParas(r[cs + 1] || "", false, AlignmentType.CENTER) });
        }
        const header = i === 0;
        const numeric = /^[\d\s,.%±χ<>=/–-]+$/.test(c.trim()) && c.trim().length < 14;
        const bold = /^\*\*.*\*\*$/.test(c.trim());
        return new TableCell({
          borders, width: { size: w[j], type: WidthType.DXA },
          shading: header ? { fill: "D9E2F3", type: ShadingType.CLEAR, color: "auto" } : (bold && j === 0 ? { fill: "F2F2F2", type: ShadingType.CLEAR, color: "auto" } : undefined),
          margins: { top: 40, bottom: 40, left: 90, right: 90 },
          verticalAlign: VerticalAlign.CENTER,
          children: cellParas(c, header, numeric ? AlignmentType.CENTER : AlignmentType.LEFT),
        });
      }).filter(Boolean),
    })),
  });
}
function caption(kind, text) {
  const idx = headIdx++;
  const label = { T: "Tableau", G: "Graphique", F: "Figure" }[kind];
  const n = captions[kind].length + 1;
  const full = `${label} ${n} : ${text}`;
  captions[kind].push({ text: full, idx });
  heads.push({ level: 9, text: full, kind: "cap", toc: false });
  return new Paragraph({
    children: [new TextRun({ text: `${label} ${n} : `, bold: true, font: FONT, size: 22 }), ...runs(text, { size: 22, bold: true })],
    alignment: AlignmentType.CENTER, spacing: { before: 160, after: 80, line: 276 }, keepNext: true, keepLines: true,
  });
}
const source = (t) => new Paragraph({ children: runs(t, { size: 20, italics: true }), alignment: AlignmentType.LEFT, spacing: { before: 60, after: 200, line: 240 } });

function image(file, widthCm) {
  const buf = fs.readFileSync("fig/" + file + ".png");
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const maxw = (widthCm || 15.5) * 37.8;
  const ww = Math.min(maxw, 16 * 37.8), hh = (ww * h) / w;
  return new Paragraph({ children: [new ImageRun({ type: "png", data: buf, transformation: { width: Math.round(ww), height: Math.round(hh) }, altText: { title: file, description: file, name: file } })], alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, keepNext: true });
}

// ---------- Analyse du balisage ----------
function parse(file, kind = "body") {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    let L = lines[i].replace(/\s+$/, "");
    if (!L.trim() || L.startsWith("%%")) { i++; continue; }
    let m;
    if ((m = L.match(/^@H1(\*?)(!?)\s+(.*)$/))) { out.push(heading(1, m[3], kind, { toc: m[1] !== "*", noBreak: m[2] === "!" })); i++; continue; }
    if ((m = L.match(/^(#{2,4})\s+(.*)$/))) { out.push(heading(m[1].length, m[2], kind)); i++; continue; }
    if (L === "@PB") { out.push(new Paragraph({ children: [new PageBreak()] })); i++; continue; }
    if ((m = L.match(/^@CENTER\s+(.*)$/))) { out.push(para(m[1], { align: AlignmentType.CENTER, noindent: true })); i++; continue; }
    if ((m = L.match(/^@RIGHT\s+(.*)$/))) { out.push(para(m[1], { align: AlignmentType.RIGHT, noindent: true, run: { italics: true } })); i++; continue; }
    if ((m = L.match(/^@NOINDENT\s+(.*)$/))) { out.push(para(m[1], { noindent: true })); i++; continue; }
    if ((m = L.match(/^@SPACE\s+(\d+)$/))) { out.push(new Paragraph({ children: [], spacing: { before: +m[1] * 20 } })); i++; continue; }
    if ((m = L.match(/^@REF\s+(.*)$/))) { out.push(para(m[1], { indent: { left: 709, hanging: 709 }, line: 276, after: 140, align: AlignmentType.LEFT })); i++; continue; }
    if ((m = L.match(/^@SIGLE\s+(.*?)\s*\|\s*(.*)$/))) {
      out.push(new Paragraph({ children: [new TextRun({ text: m[1], bold: true, font: FONT }), new TextRun({ text: "\t" + m[2], font: FONT })], tabStops: [{ type: TabStopType.LEFT, position: 1900 }], indent: { left: 1900, hanging: 1900 }, spacing: { line: 300, after: 60 } }));
      i++; continue;
    }
    if ((m = L.match(/^@SOURCE\s+(.*)$/))) { out.push(source(m[1])); i++; continue; }
    if ((m = L.match(/^@(GRAPH|FIG)\s+(\S+)\s+(\S+)\s*\|\s*(.*?)(?:\s*\|\s*([\d.]+))?$/))) {
      out.push(caption(m[1] === "GRAPH" ? "G" : "F", m[4]));
      out.push(image(m[2], m[5] ? +m[5] : undefined)); i++; continue;
    }
    if ((m = L.match(/^@(A?)TABLE\s+(\S+)\s*\|\s*(.*)$/))) {
      if (m[1]) out.push(new Paragraph({ children: runs(m[3], { bold: true, size: 22 }), alignment: AlignmentType.CENTER, spacing: { before: 160, after: 80 }, keepNext: true }));
      else out.push(caption("T", m[3]));
      i++;
      let widths = null;
      if (lines[i] && lines[i].startsWith("@W ")) { widths = lines[i].slice(3).split(",").map(Number); i++; }
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i].trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()));
        i++;
      }
      out.push(makeTable(rows, widths));
      continue;
    }
    if ((m = L.match(/^(\s*)- (.*)$/))) {
      const lvl = m[1].length >= 2 ? 1 : 0;
      out.push(new Paragraph({ children: runs(m[2]), numbering: { reference: "bullets", level: lvl }, alignment: AlignmentType.JUSTIFIED, spacing: { line: LINE15, after: 60 } }));
      i++; continue;
    }
    if ((m = L.match(/^(\d+)\) (.*)$/))) {
      out.push(new Paragraph({ children: runs(`${m[1]}) ` + m[2]), indent: { left: 709, hanging: 360 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: LINE15, after: 60 } }));
      i++; continue;
    }
    if ((m = L.match(/^> (.*)$/))) {
      out.push(new Paragraph({ children: runs(m[1], { italics: true, size: 23 }), indent: { left: 850, right: 567 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: 300, after: 140, before: 40 } }));
      i++; continue;
    }
    out.push(para(L)); i++;
  }
  return out;
}

// ---------- Page de garde ----------
function cover() {
  const c = (t, o = {}) => new Paragraph({ children: [new TextRun({ text: t, font: FONT, size: o.size || 22, bold: o.bold, italics: o.italics, allCaps: o.caps })], alignment: o.align || AlignmentType.CENTER, spacing: { after: o.after ?? 0, before: o.before || 0, line: o.line || 260 } });
  const nb = { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } };
  const top = new Table({
    width: { size: TEXTW, type: WidthType.DXA }, columnWidths: [5200, TEXTW - 5200],
    rows: [new TableRow({ children: [
      new TableCell({ borders: nb, width: { size: 5200, type: WidthType.DXA }, children: [
        c("MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE", { size: 20, bold: true }), c("********", { size: 18 }),
        c("UNIVERSITÉ DE LOMÉ", { size: 20, bold: true }), c("********", { size: 18 }),
        c("INSTITUT NATIONAL DES SCIENCES DE L'ÉDUCATION (INSE)", { size: 20, bold: true }),
      ] }),
      new TableCell({ borders: nb, width: { size: TEXTW - 5200, type: WidthType.DXA }, children: [
        c("RÉPUBLIQUE TOGOLAISE", { size: 20, bold: true }), c("Travail – Liberté – Patrie", { size: 20, italics: true }),
      ] }),
    ] })],
  });
  const boxB = { style: BorderStyle.DOUBLE, size: 6, color: "1F3864" };
  const titleBox = new Table({
    width: { size: TEXTW, type: WidthType.DXA }, columnWidths: [TEXTW],
    rows: [new TableRow({ children: [new TableCell({ borders: { top: boxB, bottom: boxB, left: boxB, right: boxB }, width: { size: TEXTW, type: WidthType.DXA }, margins: { top: 200, bottom: 200, left: 250, right: 250 }, children: [
      c("DIFFICULTÉS DES ÉLÈVES-PROFESSEURS DANS L'ENSEIGNEMENT DES FRACTIONS AU PRIMAIRE : ANALYSE DES PRATIQUES ET PROPOSITIONS DIDACTIQUES À L'ENFPE DE NOTSÈ", { size: 30, bold: true, line: 340 }),
    ] })] })],
  });
  const people = new Table({
    width: { size: TEXTW, type: WidthType.DXA }, columnWidths: [4536, 4536],
    rows: [new TableRow({ children: [
      new TableCell({ borders: nb, width: { size: 4536, type: WidthType.DXA }, children: [
        c("Présenté et soutenu par :", { size: 22, italics: true, align: AlignmentType.LEFT, bold: true }),
        c("M. AWI Abaloutu", { size: 24, bold: true, align: AlignmentType.LEFT, before: 80 }),
        c("Étudiant-professeur en Master professionnel", { size: 22, align: AlignmentType.LEFT, before: 40 }),
      ] }),
      new TableCell({ borders: nb, width: { size: 4536, type: WidthType.DXA }, children: [
        c("Sous la direction de :", { size: 22, italics: true, align: AlignmentType.LEFT, bold: true }),
        c("[Nom et grade du Directeur], INSE", { size: 22, align: AlignmentType.LEFT, before: 80 }),
        c("Co-directeur :", { size: 22, italics: true, align: AlignmentType.LEFT, bold: true, before: 120 }),
        c("[Nom et grade du Co-directeur], ENFPE de Notsè", { size: 22, align: AlignmentType.LEFT, before: 80 }),
      ] }),
    ] })],
  });
  return [
    top,
    c("MASTER PROFESSIONNEL", { size: 26, bold: true, before: 700 }),
    c("Formation des formateurs – Champ disciplinaire : Mathématiques", { size: 23, italics: true, before: 60 }),
    c("MÉMOIRE PROFESSIONNEL", { size: 28, bold: true, before: 500, after: 300 }),
    titleBox,
    c("Lieu du stage : École Normale de Formation des Professeurs d'École (ENFPE) de Notsè", { size: 22, italics: true, before: 300, after: 700 }),
    people,
    c("Année académique : 2025 – 2026", { size: 24, bold: true, before: 1200 }),
  ];
}

// ---------- Sommaire, listes, table des matières (statiques, numéros issus du rendu) ----------
function tocLine(text, page, level, bold) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: 22, bold }), new TextRun({ text: "\t" + page, font: FONT, size: 22, bold })],
    tabStops: [{ type: TabStopType.RIGHT, position: TEXTW, leader: "dot" }],
    indent: { left: [0, 0, 300, 600, 900][level] || 0, right: 400 },
    spacing: { line: 264, after: level === 1 ? 60 : 20, before: level === 1 ? 100 : 0 },
  });
}

// Pré-parse pour connaître les titres (pour les listes/table placées avant le contenu)
function buildAll() {
  headIdx = 0; heads.length = 0; captions.T.length = 0; captions.G.length = 0; captions.F.length = 0;
  const front = parse(frontFile, "front");
  const body = files.flatMap((f) => parse(f));
  const refs = parse(refsFile);
  const tmHead = heading(1, "TABLE DES MATIÈRES", "body");
  const annexes = parse(annexFile);
  return { front, body, refs, tmHead, annexes };
}
let parts = buildAll();
const snapshotHeads = heads.map((h, i) => ({ ...h, i }));
const snapshotCaps = { T: captions.T.map((x) => ({ ...x })), G: captions.G.map((x) => ({ ...x })), F: captions.F.map((x) => ({ ...x })) };

const sommaire = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "SOMMAIRE", font: FONT })] }),
  ...snapshotHeads.filter((h) => h.toc && h.level <= 2 && h.kind !== "cap").map((h) => tocLine(h.level === 1 ? h.text : h.text, pageOf(h.i), h.level, h.level === 1)),
];
const listes = [
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text: "LISTE DES TABLEAUX", font: FONT })] }),
  ...snapshotCaps.T.map((c) => tocLine(c.text, pageOf(c.idx), 1)),
  new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun({ text: "LISTE DES GRAPHIQUES ET FIGURES", font: FONT })] }),
  ...snapshotCaps.G.map((c) => tocLine(c.text, pageOf(c.idx), 1)),
  new Paragraph({ children: [], spacing: { before: 200 } }),
  ...snapshotCaps.F.map((c) => tocLine(c.text, pageOf(c.idx), 1)),
];
const tdm = snapshotHeads.filter((h) => h.toc && h.kind === "body" && h.level <= 4 && h.text !== "TABLE DES MATIÈRES").map((h) => tocLine(h.text, pageOf(h.i), h.level, h.level === 1));

fs.writeFileSync("heads.json", JSON.stringify(snapshotHeads.map((h) => ({ text: h.text, kind: h.kind, level: h.level })), null, 0));

const footer = (fmt) => ({ default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 22 })] })] }) });
const pageProps = (fmt, start) => ({ page: { size: { width: 11906, height: 16838 }, margin: { top: 1417, bottom: 1417, left: 1417, right: 1417, footer: 600 }, pageNumbers: start ? { start, formatType: fmt } : { formatType: fmt } } });

const doc = new Document({
  creator: "AWI Abaloutu",
  title: "Difficultés des élèves-professeurs dans l'enseignement des fractions au primaire",
  styles: {
    default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: FONT, allCaps: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 0, after: 360, line: 320 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: FONT }, paragraph: { spacing: { before: 280, after: 140, line: 300 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, italics: true, font: FONT }, paragraph: { spacing: { before: 220, after: 120, line: 300 }, indent: { left: 284 }, outlineLevel: 2 } },
      { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, italics: true, font: FONT, underline: {} }, paragraph: { spacing: { before: 160, after: 100, line: 300 }, indent: { left: 567 }, outlineLevel: 3 } },
    ],
  },
  numbering: { config: [{ reference: "bullets", levels: [
    { level: 0, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 709, hanging: 283 } } } },
    { level: 1, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1134, hanging: 283 } } } },
  ] }] },
  sections: [
    { properties: pageProps(NumberFormat.DECIMAL), children: cover() },
    { properties: { ...pageProps(NumberFormat.LOWER_ROMAN, 1), type: SectionType.NEXT_PAGE }, footers: footer(), children: [...sommaire, ...parts.front, ...listes] },
    { properties: { ...pageProps(NumberFormat.DECIMAL, 1), type: SectionType.NEXT_PAGE }, footers: footer(), children: [...parts.body, ...parts.refs, parts.tmHead, ...tdm, ...parts.annexes] },
  ],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync("Memoire.docx", b); console.log("OK", counters); });
