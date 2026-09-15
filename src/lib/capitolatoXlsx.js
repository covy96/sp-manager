// ─────────────────────────────────────────────────────────────────────────────
// Export Excel del capitolato con ExcelJS — ricalca il file "CAP. BASE":
// barra titolo navy, header grigio con celle unite (Dimensioni/IMPORTI), righe
// voce su fondo grigio con bordi, MISURAZIONI/SOMMANO in corsivo, cella unitario
// evidenziata (crema), formati numero/€, larghezze colonne, TOTALE e Riepilogo
// con formule. Il foglio è PROTETTO: si può modificare SOLO la cella "unitario".
// ─────────────────────────────────────────────────────────────────────────────
import ExcelJS from "exceljs";
import { CAPITOLATO_CATEGORIE, CAPITOLATO_PREMESSA, CAPITOLATO_TITOLO, CAPITOLATO_NOTA_IVA } from "./capitolatoTemplate";
import { componiGruppi, totaleRigaEff, qtaMisurazione, parseNum, IMPIANTI_ASSISTENZA, assistenzaBasi } from "./capitolatoModel";
import { urlToBase64, imageSize } from "./pdfCommon";

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
function st(cell, { b = false, i = false, sz = 8, color, fill, align, wrap, num, border, unlock, vtop } = {}) {
  // usa il vero font corsivo (Groteska-BookItalic) invece del corsivo sintetico sul romano
  cell.font = { name: i ? "Groteska-BookItalic" : FONT, size: sz, bold: b, italic: i, ...(color ? { color: { argb: color } } : {}) };
  cell.alignment = { vertical: vtop ? "top" : "middle", ...(align ? { horizontal: align } : {}), wrapText: !!wrap };
  if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  if (border) cell.border = border;
  if (num) cell.numFmt = num;
  cell.protection = { locked: !unlock };
}
const COLS = [4.5, 38, 5.5, 5.5, 6, 8, 10.5, 11.5];

// impaginazione stampa (A4 verticale, adatta larghezza)
function impagina(ws) {
  ws.pageSetup = {
    paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    horizontalCentered: true, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  ws.headerFooter = { oddFooter: "&CPagina &P di &N" };
}
// riga di intestazione visibile: progetto (sx) + logo (dx). Ritorna n. righe occupate (1).
function testataFoglio(ws, wb, nomeProgetto, logo) {
  const r = ws.getRow(1); r.height = 34;
  const a = r.getCell(1); a.value = String(nomeProgetto || "").toUpperCase();
  a.font = { name: "Groteska-Bold", size: 12, bold: true, color: { argb: NAVY } };
  a.alignment = { vertical: "middle", horizontal: "left" };
  ws.mergeCells(1, 1, 1, 5);
  if (logo) {
    const h = 30, w = Math.round(h * logo.ratio);
    ws.addImage(logo.id, { tl: { col: 8 - w / 60, row: 0.12 }, ext: { width: w, height: h } });
  }
  return 1;
}

function buildCategoria(wb, g, nomeProgetto, logo, assistenzePending) {
  const ws = wb.addWorksheet(`${g.code} - ${g.nomeIndice}`.slice(0, 31), { views: [{ showGridLines: false, style: "pageLayout" }] });
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

  // intestazione visibile (progetto + logo)
  r = testataFoglio(ws, wb, nomeProgetto, logo);

  // titolo categoria (navy) — merge dinamico
  const titR = setRow([C(g.titoloPagina, { b: true, sz: 13, color: "FFFFFFFF", fill: NAVY, align: "center" }),
    ...[0, 0, 0, 0, 0, 0, 0].map(() => C("", { fill: NAVY }))], 20);
  ws.mergeCells(titR, 1, titR, 8);

  // header (2 righe) — merge dinamici
  const H = { b: true, sz: 8, fill: HEADER, align: "center", border: box };
  const h1 = setRow([C("r. Ord", H), C("DESIGNAZIONE DEI LAVORI", H), C("Dimensioni", H), C("", H), C("", H), C("Quantità", H), C("IMPORTI", H), C("", H)], 15);
  const h2 = setRow([C("", H), C("", H), C("Lung.", H), C("Larg.", H), C("H/peso", H), C("", H), C("unitario", H), C("TOTALE", H)], 15);
  ws.mergeCells(h1, 1, h2, 1); ws.mergeCells(h1, 2, h2, 2); ws.mergeCells(h1, 3, h1, 5); ws.mergeCells(h1, 6, h2, 6); ws.mergeCells(h1, 7, h1, 8);
  const firstVoceRow = h2 + 1;

  g.items.forEach((it) => {
    const topb = { top: { style: "medium", color: { argb: NAVY } }, left: thin, bottom: thin, right: thin };

    // ── Voce ASSISTENZA MURARIA a %: nessuna misura, l'importo è una formula viva
    // (% × TOTALE del foglio impianto base). Il totale base viene collegato dopo
    // che tutti i fogli categoria sono costruiti (evita riferimenti circolari).
    if (it.assistenza) {
      const basi = assistenzaBasi(it.assistenza);
      const impNomi = basi.map((c) => IMPIANTI_ASSISTENZA.find((x) => x.code === c)?.nome || c).join(", ") || "impianti";
      const percRaw = it.assistenza.perc;
      const hasPerc = percRaw !== "" && percRaw != null;
      setRow([
        C(it._code || it.codice || "", { b: true, sz: 8, fill: TITLE, align: "center", border: topb }),
        C((it.titolo || "ASSISTENZE MURARIE").toUpperCase(), { b: true, sz: 9, fill: TITLE, wrap: true, border: topb }),
        C("", { fill: TITLE, border: topb }), C("", { fill: TITLE, border: topb }), C("", { fill: TITLE, border: topb }),
        C("", { fill: TITLE, border: topb }), C("", { fill: TITLE, border: topb, num: F_EUR }), C("", { fill: TITLE, border: topb, num: F_EUR }),
      ], Math.max(15, nlines((it.titolo || "").toUpperCase(), 40) * 12 + 4));
      const desc = it.descrizione || `Assistenze murarie e oneri connessi — ${impNomi}.`;
      setRow([
        C("", { border: box }), C(desc, { sz: 8, wrap: true, border: box }),
        C("", { border: box }), C("", { border: box }), C("", { border: box }),
        C("", { border: box }), C("", { border: box }), C("", { border: box }),
      ], Math.max(20, nlines(desc, 44) * 11.5 + 6));
      const rr = r + 1;
      setRow([
        C("", { i: true, sz: 8, border: box }),
        C(`Assistenza muraria — ${hasPerc ? percRaw + "% " : ""}su totale ${impNomi}`, { i: true, sz: 8, border: box }),
        C("", { border: box }), C("", { border: box }), C("", { border: box }),
        C(null, { i: true, sz: 8, align: "right", border: box, num: F_EUR }),                       // F: somma totali impianti (formula, dopo)
        C(hasPerc ? Number(percRaw) / 100 : null, { fill: CREAM, sz: 8, align: "right", border: box, num: "0.00%", unlock: true }), // G: percentuale (impresa)
        F(`IF(OR(F${rr}=0,G${rr}=""),"",F${rr}*G${rr})`, { sz: 8, border: box, num: F_EUR }),        // H: importo
      ], 14);
      assistenzePending.push({ ws, fRow: rr, basi });
      return;
    }

    const misure = (it.misurazioni || []).filter((m) => m.descrizione || m.lung || m.larg || m.hpeso || m.qta);
    const labels = (it.sommano_labels && it.sommano_labels.length) ? it.sommano_labels : [`SOMMANO ${it.unita || ""}`.trim()];
    // titolo (grigio, top medium)
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
      C("", { border: box, num: F_NUM }), C("NOTE: ", { sz: 8, color: "FF808080", border: box, vtop: true, align: "left" }), C("", { border: box }),
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
    const tot = totaleRigaEff(it);
    labels.forEach((lab) => {
      const rr = r + 1;
      const fSum = (misure.length && misStart <= misEnd) ? `SUM(F${misStart}:F${misEnd})` : null;
      setRow([
        C("", { i: true, sz: 8, border: box }),
        C(lab, { i: true, sz: 8, border: box }),
        C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }),
        fSum ? F(fSum, { i: true, sz: 8, align: "right", border: box, num: F_NUM })
          : C(tot || null, { i: true, sz: 8, align: "right", border: box, num: F_NUM }),
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
    F(`SUM(H${firstVoceRow}:H${lastContent})`, { b: true, sz: 10, color: "FFFFFFFF", align: "right", fill: NAVY, num: F_EUR }),
  ], 16);
  impagina(ws);
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

  // logo studio (in alto a destra, come nel PDF)
  let logo = null;
  if (s.report_logo_url) {
    const b64 = await urlToBase64(s.report_logo_url, { maxPx: 400, format: "image/png" });
    if (b64) { const dim = await imageSize(b64); if (dim) logo = { id: wb.addImage({ base64: b64, extension: "png" }), ratio: dim.w / dim.h }; }
  }

  // ── Copertina ──────────────────────────────────────────────────────────────
  const cop = wb.addWorksheet("Copertina", { views: [{ showGridLines: false, style: "pageLayout" }] });
  COLS.forEach((w, i) => { cop.getColumn(i + 1).width = w; });
  testataFoglio(cop, wb, nomeProgetto, logo);
  const copCell = (row, v, o) => { const c = cop.getCell(row, 1); c.value = v; st(c, o); };
  const copMerge = (row) => cop.mergeCells(row, 1, row, 8);
  // Distribuzione verticale come nel PDF: titolo ~1/4 pagina, blocco dati ~metà,
  // nota IVA in fondo. Le righe spaziatrici danno l'aria della copertina PDF.
  cop.getRow(2).height = 130; // spazio prima del titolo
  copMerge(3); copCell(3, CAPITOLATO_TITOLO, { b: true, sz: 16, color: NAVY, align: "center" }); cop.getRow(3).height = 24;
  copMerge(4); copCell(4, "COMPUTO OPERE EDILI IMPIANTISTICHE E DI FINITURE", { sz: 10.5, align: "center" }); cop.getRow(4).height = 15;
  copMerge(5); copCell(5, "Capitolato d'appalto", { sz: 10.5, color: "FF808080", align: "center" }); cop.getRow(5).height = 16;
  cop.getRow(6).height = 150; // spazio prima del blocco dati
  const underline = { bottom: { style: "thin", color: { argb: "FFC8C8C8" } } };
  // Committente e località: se non compilati nel capitolato, presi dal progetto (cliente / indirizzo).
  const committente = capitolato?.committente || project?.client || "";
  const localita = capitolato?.localita || project?.address || "";
  [["Progetto:", nomeProgetto], ["Committente:", committente], ["Località:", localita], ["Data:", dataIt(capitolato?.data)], ["Revisione:", capitolato?.revisione || ""]]
    .forEach((p, i) => {
      const rr = 7 + i; cop.getRow(rr).height = 16;
      cop.mergeCells(rr, 1, rr, 3); const l = cop.getCell(rr, 1); l.value = p[0]; st(l, { b: true, sz: 10, color: NAVY, align: "right" });
      cop.mergeCells(rr, 4, rr, 8); const val = cop.getCell(rr, 4); val.value = p[1]; st(val, { sz: 10 });
      for (let cc = 4; cc <= 8; cc++) cop.getCell(rr, cc).border = underline; // sottolineatura campo (come PDF)
    });
  cop.getRow(12).height = 210; // spazio fino in fondo pagina
  cop.mergeCells(13, 1, 13, 8); const iva = cop.getCell(13, 1); iva.value = CAPITOLATO_NOTA_IVA; st(iva, { i: true, sz: 9, color: "FF808080", align: "center" }); cop.getRow(13).height = 15;
  const gen = new Date(); const p2 = (n) => String(n).padStart(2, "0");
  const stamp = `${p2(gen.getDate())}/${p2(gen.getMonth() + 1)}/${gen.getFullYear()} ${p2(gen.getHours())}:${p2(gen.getMinutes())}`;
  cop.mergeCells(14, 1, 14, 8); const gc = cop.getCell(14, 1); gc.value = `Generato il ${stamp}`; st(gc, { i: true, sz: 8, color: "FFB0B0B0", align: "center" }); cop.getRow(14).height = 13;
  impagina(cop);

  // ── Premessa ──────────────────────────────────────────────────────────────
  const prem = wb.addWorksheet("Premessa", { views: [{ showGridLines: false, style: "pageLayout" }] });
  COLS.forEach((w, i) => { prem.getColumn(i + 1).width = w; });
  testataFoglio(prem, wb, nomeProgetto, logo);
  let pr = 2; // dopo l'intestazione
  prem.mergeCells(pr, 1, pr, 8); const pc0 = prem.getCell(pr, 1); pc0.value = "PREMESSA"; st(pc0, { b: true, sz: 11, color: "FFFFFFFF", fill: NAVY });
  CAPITOLATO_PREMESSA.forEach((p, pi) => {
    const isLast = pi === CAPITOLATO_PREMESSA.length - 1; // "Tenuta del cantiere…" → blu grassetto (come PDF)
    pr += 1; prem.mergeCells(pr, 1, pr, 8); const c = prem.getCell(pr, 1); c.value = p;
    st(c, { sz: 9, wrap: true, vtop: true, ...(isLast ? { b: true, color: NAVY } : {}) });
    prem.getRow(pr).height = nlines(p, 88) * 11.3 + 2;
  });
  // INDICE dei fogli attivi
  pr += 2; prem.mergeCells(pr, 1, pr, 8); const ic = prem.getCell(pr, 1); ic.value = "INDICE"; st(ic, { b: true, sz: 10, fill: HEADER, align: "center" });
  gruppi.forEach((g) => {
    pr += 1;
    const a = prem.getCell(pr, 1); a.value = g.code; st(a, { b: true, sz: 9, align: "center", border: box });
    prem.mergeCells(pr, 2, pr, 8); const b = prem.getCell(pr, 2); b.value = g.nomeIndice; st(b, { sz: 9, border: box });
  });
  impagina(prem);

  // ── Categorie ──────────────────────────────────────────────────────────────
  const info = [];
  const assistenzePending = [];       // celle assistenza da collegare al totale impianto
  const totBySource = {};             // originalCode impianto -> { name, totRow }
  gruppi.forEach((g) => {
    const { name, totRow } = buildCategoria(wb, g, nomeProgetto, logo, assistenzePending);
    info.push({ code: g.code, nome: g.nomeIndice, name, totRow });
    totBySource[g.originalCode] = { name, totRow };
  });
  // Collega ogni assistenza ai TOTALI (celle H) dei fogli impianto scelti: F = somma
  // dei totali, così H = F × G(%) si aggiorna quando l'impresa compila i prezzi.
  assistenzePending.forEach((p) => {
    const refs = (p.basi || []).map((b) => totBySource[b]).filter(Boolean).map((s) => `'${s.name}'!H${s.totRow}`);
    p.ws.getCell(p.fRow, 6).value = refs.length ? { formula: refs.join("+") } : 0;
  });

  // ── Riepilogo ──────────────────────────────────────────────────────────────
  const rie = wb.addWorksheet("Riepilogo", { views: [{ showGridLines: false, style: "pageLayout" }] });
  rie.getColumn(1).width = 10; rie.getColumn(2).width = 50; rie.getColumn(3).width = 16;
  for (let i = 3; i < 8; i++) rie.getColumn(i + 1).width = 6;
  testataFoglio(rie, wb, nomeProgetto, logo);
  rie.mergeCells(3, 1, 3, 3); const rc0 = rie.getCell(3, 1); rc0.value = CAPITOLATO_TITOLO; st(rc0, { b: true, sz: 13, color: "FFFFFFFF", fill: NAVY, align: "center" });
  const rc1 = rie.getCell(4, 1); rc1.value = "Riepilogo generale per categoria di lavori"; st(rc1, { i: true, sz: 9, color: "FF808080" });
  const rieHead = 6;
  ["Cod.", "Descrizione", "Importo"].forEach((t, i) => { const c = rie.getCell(rieHead, i + 1); c.value = t; st(c, { b: true, sz: 9, fill: HEADER, align: i === 1 ? "left" : "center", border: box }); });
  info.forEach((c, i) => {
    const rr = rieHead + 1 + i;
    const a = rie.getCell(rr, 1); a.value = c.code; st(a, { b: true, sz: 9, align: "center", border: box });
    const b = rie.getCell(rr, 2); b.value = c.nome; st(b, { sz: 9, border: box });
    const im = rie.getCell(rr, 3); im.value = { formula: `'${c.name}'!H${c.totRow}` }; st(im, { sz: 9, align: "right", border: box, num: F_EUR });
  });
  // TOTALE GENERALE (banda blu)
  const tgRow = rieHead + 1 + info.length;
  const ta = rie.getCell(tgRow, 1); ta.value = ""; st(ta, { fill: NAVY });
  const tb = rie.getCell(tgRow, 2); tb.value = "TOTALE GENERALE"; st(tb, { b: true, sz: 10, color: "FFFFFFFF", fill: NAVY });
  const tc = rie.getCell(tgRow, 3); tc.value = info.length ? { formula: `SUM(C${rieHead + 1}:C${rieHead + info.length})` } : 0; st(tc, { b: true, sz: 10, color: "FFFFFFFF", align: "right", fill: NAVY, num: F_EUR });
  impagina(rie);

  const now = new Date();
  const pz = (n) => String(n).padStart(2, "0");
  const ts = `${now.getFullYear()}${pz(now.getMonth() + 1)}${pz(now.getDate())}_${pz(now.getHours())}${pz(now.getMinutes())}`;
  const filename = `Capitolato_${String(nomeProgetto).replace(/[^\w\-]+/g, "_")}_${ts}.xlsx`;
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  if (modo === "blob") return blob;
  scarica(blob, filename);
}
