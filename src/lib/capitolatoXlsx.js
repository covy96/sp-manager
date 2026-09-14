// ─────────────────────────────────────────────────────────────────────────────
// Export Excel del capitolato con ExcelJS — ricalca il file "CAP. BASE":
// barra titolo navy, header grigio con celle unite (Dimensioni/IMPORTI), righe
// voce su fondo grigio con bordi, MISURAZIONI/SOMMANO in corsivo, cella unitario
// evidenziata (crema), formati numero/€, larghezze colonne, TOTALE e Riepilogo
// con formule. Il foglio è PROTETTO: si può modificare SOLO la cella "unitario".
// ─────────────────────────────────────────────────────────────────────────────
import ExcelJS from "exceljs";
import { CAPITOLATO_PREMESSA, CAPITOLATO_TITOLO, CAPITOLATO_NOTA_IVA } from "./capitolatoTemplate";
import { componiGruppi, totaleRiga, qtaMisurazione, parseNum } from "./capitolatoModel";

const NAVY = "FF1F3864", HEADER = "FFD6DCE4", TITLE = "FFEEF1F6", ZONE = "FFF5F6F9", CREAM = "FFFFF7D6", GRID = "FFBFBFBF";
const FONT = "Groteska-Book";
const F_NUM = "#,##0.00", F_EUR = '#,##0.00" €"';
const thin = { style: "thin", color: { argb: GRID } };
const medium = { style: "medium", color: { argb: "FF404040" } };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const PROTECT = { selectLockedCells: true, selectUnlockedCells: true, formatCells: false, insertRows: false, deleteRows: false };

const dataIt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso); if (isNaN(d)) return String(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const numOrBlank = (v) => { const n = parseNum(v); return Number.isFinite(n) && n !== 0 ? n : null; };
const nlines = (txt, cpl = 44) => {
  const s = String(txt || "");
  return Math.max(1, s.split("\n").reduce((n, p) => n + Math.max(1, Math.ceil((p.length || 1) / cpl)), 0));
};

// stile su una cella ExcelJS
function st(cell, { b = false, i = false, sz = 8, color, fill, align, wrap, num, border, unlock } = {}) {
  // usa il vero font corsivo (Groteska-BookItalic) invece del corsivo sintetico sul romano
  cell.font = { name: i ? "Groteska-BookItalic" : FONT, size: sz, bold: b, italic: i, ...(color ? { color: { argb: color } } : {}) };
  cell.alignment = { vertical: wrap ? "top" : "middle", ...(align ? { horizontal: align } : {}), wrapText: !!wrap };
  if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  if (border) cell.border = border;
  if (num) cell.numFmt = num;
  cell.protection = { locked: !unlock };
}
const COLS = [4.5, 38, 5.5, 5.5, 6, 8, 10.5, 11.5];

// impaginazione stampa (A4 verticale, adatta larghezza) + intestazione progetto/studio
function impagina(ws, hdr) {
  ws.pageSetup = {
    paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    horizontalCentered: true, margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  ws.headerFooter = { differentFirst: false, oddHeader: hdr, oddFooter: "&CPagina &P di &N" };
}
function intestazione(nomeProgetto, localita, nomeStudio, email) {
  const L = [nomeProgetto, localita].filter(Boolean).join("\n");
  const R = [nomeStudio, email].filter(Boolean).join("\n");
  return `&L&"Groteska-Bold"${L}&R&"Groteska-Bold"${R}`;
}

function buildCategoria(wb, g, hdr) {
  const ws = wb.addWorksheet(`${g.code} - ${g.nomeIndice}`.slice(0, 31), { views: [{ showGridLines: false }] });
  COLS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  let r = 0;
  const setRow = (cells, h) => {
    r += 1; const row = ws.getRow(r);
    cells.forEach((c, ci) => { const cell = row.getCell(ci + 1); if (c) { if (c.f) cell.value = { formula: c.f }; else if (c.v != null) cell.value = c.v; st(cell, c); } });
    if (h) row.height = h;
    return r;
  };
  const C = (v, opts) => ({ v, ...opts });
  const F = (formula, opts) => ({ f: formula, ...opts });

  // r1 titolo categoria (navy)
  setRow([C(g.titoloPagina, { b: true, sz: 13, color: "FFFFFFFF", fill: NAVY, align: "center" }),
    ...[0, 0, 0, 0, 0, 0, 0].map(() => C("", { fill: NAVY }))], 20);
  ws.mergeCells(1, 1, 1, 8);

  // r2-3 header
  const H = { b: true, sz: 8, fill: HEADER, align: "center", border: box };
  setRow([C("r. Ord", H), C("DESIGNAZIONE DEI LAVORI", H), C("Dimensioni", H), C("", H), C("", H), C("Quantità", H), C("IMPORTI", H), C("", H)], 15);
  setRow([C("", H), C("", H), C("Lung.", H), C("Larg.", H), C("H/peso", H), C("", H), C("unitario", H), C("TOTALE", H)], 15);
  ws.mergeCells("A2:A3"); ws.mergeCells("B2:B3"); ws.mergeCells("C2:E2"); ws.mergeCells("F2:F3"); ws.mergeCells("G2:H2");

  g.items.forEach((it) => {
    const misure = (it.misurazioni || []).filter((m) => m.descrizione || m.lung || m.larg || m.hpeso || m.qta);
    const labels = (it.sommano_labels && it.sommano_labels.length) ? it.sommano_labels : [`SOMMANO ${it.unita || ""}`.trim()];
    // titolo (grigio, top medium)
    const topb = { top: medium, left: thin, bottom: thin, right: thin };
    setRow([
      C(it._code || it.codice || "", { b: true, sz: 8, fill: TITLE, align: "center", border: topb }),
      C((it.titolo || "").toUpperCase(), { b: true, sz: 9, fill: TITLE, wrap: true, border: topb }),
      C("", { fill: TITLE, border: topb, num: F_NUM }), C("", { fill: TITLE, border: topb, num: F_NUM }),
      C("", { fill: TITLE, border: topb, num: F_NUM }), C("", { fill: TITLE, border: topb, num: F_NUM }),
      C("", { fill: TITLE, border: topb, num: F_EUR }), C("", { fill: TITLE, border: topb, num: F_EUR }),
    ], Math.max(15, nlines((it.titolo || "").toUpperCase(), 40) * 12 + 4));
    // descrizione + NOTE (celle centrali senza riempimento, bianche)
    const descRow = setRow([
      C("", { border: box }), C(it.descrizione || "", { sz: 8, wrap: true, border: box }),
      C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }),
      C("", { border: box, num: F_NUM }), C("NOTE: ", { sz: 8, color: "FF808080", border: box }), C("", { border: box }),
    ], Math.max(22, nlines(it.descrizione || "", 44) * 11.5 + 6));
    // MISURAZIONI (corsivo)
    setRow([
      C("", { border: box }), C("MISURAZIONI:", { i: true, sz: 8, border: box }),
      C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }),
      C("", { border: box, num: F_NUM }), C("", { border: box }), C("", { border: box }),
    ], 13);
    const misStart = r + 1;
    misure.forEach((m) => {
      setRow([
        C("", { border: box }), C(m.descrizione || "", { sz: 8, color: "FF595959", border: box }),
        C(numOrBlank(m.lung), { sz: 8, align: "right", border: box, num: F_NUM }),
        C(numOrBlank(m.larg), { sz: 8, align: "right", border: box, num: F_NUM }),
        C(numOrBlank(m.hpeso), { sz: 8, align: "right", border: box, num: F_NUM }),
        C(qtaMisurazione(m) || null, { sz: 8, align: "right", border: box, num: F_NUM }),
        C("", { border: box }), C("", { border: box }),
      ], 13);
    });
    const misEnd = r;
    // NOTE = un'unica cella (merge G:H da descrizione a fine misure)
    ws.mergeCells(descRow, 7, Math.max(descRow, misEnd), 8);
    // SOMMANO (grassetto+corsivo, senza riempimento; solo unitario crema e sbloccato)
    const tot = totaleRiga(it);
    labels.forEach((lab) => {
      const rr = r + 1;
      const fSum = (misure.length && misStart <= misEnd) ? `SUM(F${misStart}:F${misEnd})` : null;
      setRow([
        C("", { b: true, i: true, sz: 8, border: box }),
        C(lab, { b: true, i: true, sz: 8, border: box }),
        C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }),
        fSum ? F(fSum, { b: true, i: true, sz: 8, align: "right", border: box, num: F_NUM })
          : C(tot || null, { b: true, i: true, sz: 8, align: "right", border: box, num: F_NUM }),
        C("", { fill: CREAM, border: box, num: F_EUR, unlock: true }),
        F(`IF(G${rr}="","",F${rr}*G${rr})`, { sz: 8, border: box, num: F_EUR }),
      ], 14);
    });
  });

  // riga vuota prima del totale
  const lastContent = r;
  setRow([], 6);
  // TOTALE categoria (navy) — H = somma degli H voce
  const totRow = setRow([
    C("", { fill: NAVY }), C(`TOTALE ${g.nomeIndice}`, { b: true, sz: 10, color: "FFFFFFFF", fill: NAVY }),
    C("", { fill: NAVY }), C("", { fill: NAVY }), C("", { fill: NAVY }), C("", { fill: NAVY }), C("", { fill: NAVY }),
    F(`SUM(H4:H${lastContent})`, { b: true, sz: 10, color: "FFFFFFFF", align: "right", fill: NAVY, num: F_EUR }),
  ], 16);
  impagina(ws, hdr);
  return { name: ws.name, totRow };
}

function scarica(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function generaCapitolatoXlsx({ capitolato, righe, project, studio, modo = "salva" }) {
  const wb = new ExcelJS.Workbook();
  const gruppi = componiGruppi(righe);
  const nomeProgetto = capitolato?.nome && capitolato.nome !== "Capitolato"
    ? capitolato.nome : (project?.name || "Progetto");
  const s = studio || {};
  const hdr = intestazione(
    String(nomeProgetto).toUpperCase(), capitolato?.localita || "",
    s.report_header_name || s.name || "", s.report_header_email || s.email || ""
  );

  // Copertina
  const cop = wb.addWorksheet("Copertina", { views: [{ showGridLines: false }] });
  cop.getColumn(1).width = 14; cop.getColumn(2).width = 46;
  const copCell = (addr, v, o) => { const c = cop.getCell(addr); c.value = v; st(c, o); };
  cop.mergeCells("A1:H1"); copCell("A1", CAPITOLATO_TITOLO, { b: true, sz: 16, color: "FFFFFFFF", fill: NAVY, align: "center" }); cop.getRow(1).height = 24;
  cop.mergeCells("A2:H2"); copCell("A2", "COMPUTO OPERE EDILI IMPIANTISTICHE E DI FINITURE", { sz: 11, align: "center" });
  cop.mergeCells("A3:H3"); copCell("A3", "Capitolato d'appalto", { sz: 11, color: "FF808080", align: "center" });
  [["Progetto:", nomeProgetto], ["Committente:", capitolato?.committente || ""], ["Località:", capitolato?.localita || ""], ["Data:", dataIt(capitolato?.data)], ["Revisione:", capitolato?.revisione || ""]]
    .forEach((p, i) => { copCell(`A${5 + i}`, p[0], { b: true, sz: 10 }); copCell(`B${5 + i}`, p[1], { sz: 10 }); });
  copCell("A11", CAPITOLATO_NOTA_IVA, { i: true, sz: 9, color: "FF808080" });
  const gen = new Date();
  const p2 = (n) => String(n).padStart(2, "0");
  const stamp = `${p2(gen.getDate())}/${p2(gen.getMonth() + 1)}/${gen.getFullYear()} ${p2(gen.getHours())}:${p2(gen.getMinutes())}`;
  copCell("A13", `Generato il ${stamp}`, { i: true, sz: 8, color: "FFB0B0B0" });
  impagina(cop, hdr);

  // Premessa
  const prem = wb.addWorksheet("Premessa", { views: [{ showGridLines: false }] });
  prem.getColumn(1).width = 110;
  prem.mergeCells("A1:A1"); const pc0 = prem.getCell("A1"); pc0.value = "PREMESSA"; st(pc0, { b: true, sz: 11, color: "FFFFFFFF", fill: NAVY });
  let pr = 2;
  CAPITOLATO_PREMESSA.forEach((p) => {
    const isSub = p.length < 40 && p === p.toUpperCase() && !p.includes("\n");
    pr += 1; const c = prem.getCell(`A${pr}`); c.value = p; st(c, { b: isSub, sz: isSub ? 9 : 8, wrap: true });
    prem.getRow(pr).height = Math.max(14, nlines(p, 120) * 11 + 4);
  });
  impagina(prem, hdr);

  // Categorie
  const info = [];
  gruppi.forEach((g) => { const { name, totRow } = buildCategoria(wb, g, hdr); info.push({ code: g.code, nome: g.nomeIndice, name, totRow }); });

  // Riepilogo
  const rie = wb.addWorksheet("Riepilogo", { views: [{ showGridLines: false }] });
  rie.getColumn(1).width = 8; rie.getColumn(2).width = 45; rie.getColumn(3).width = 14;
  rie.mergeCells("A1:C1"); const rc0 = rie.getCell("A1"); rc0.value = CAPITOLATO_TITOLO; st(rc0, { b: true, sz: 13, color: "FFFFFFFF", fill: NAVY, align: "center" });
  const rc1 = rie.getCell("A2"); rc1.value = "Riepilogo generale per categoria di lavori"; st(rc1, { i: true, sz: 9, color: "FF808080" });
  ["Cod.", "Descrizione", "Importo"].forEach((t, i) => { const c = rie.getCell(4, i + 1); c.value = t; st(c, { b: true, sz: 9, fill: HEADER, align: i === 1 ? "left" : "center", border: box }); });
  info.forEach((c, i) => {
    const rr = 5 + i;
    const a = rie.getCell(rr, 1); a.value = c.code; st(a, { b: true, sz: 9, align: "center", border: box });
    const b = rie.getCell(rr, 2); b.value = c.nome; st(b, { sz: 9, border: box });
    const im = rie.getCell(rr, 3); im.value = { formula: `'${c.name}'!H${c.totRow}` }; st(im, { sz: 9, align: "right", border: box, num: F_EUR });
  });
  impagina(rie, hdr);

  const now = new Date();
  const pz = (n) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}${pz(now.getMonth() + 1)}${pz(now.getDate())}_${pz(now.getHours())}${pz(now.getMinutes())}`;
  const filename = `Capitolato_${String(nomeProgetto).replace(/[^\w\-]+/g, "_")}_${ts}.xlsx`;
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  if (modo === "blob") return blob;
  scarica(blob, filename);
}
