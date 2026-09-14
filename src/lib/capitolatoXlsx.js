// ─────────────────────────────────────────────────────────────────────────────
// Export Excel del capitolato — ricalca fedelmente il file "CAP. BASE":
// barra titolo navy, header grigio con celle unite (Dimensioni/IMPORTI), righe
// voce su fondo grigio con bordi, MISURAZIONI/SOMMANO in corsivo, cella unitario
// evidenziata (crema), formati numero/€, larghezze colonne, riga TOTALE e
// Riepilogo con formule. Usa xlsx-js-style (SheetJS con stili).
// ─────────────────────────────────────────────────────────────────────────────
import * as XLSX from "xlsx-js-style";
import { CAPITOLATO_PREMESSA, CAPITOLATO_TITOLO, CAPITOLATO_NOTA_IVA } from "./capitolatoTemplate";
import { componiGruppi, totaleRiga, qtaMisurazione, parseNum } from "./capitolatoModel";

const NAVY = "1F3864", HEADER = "D6DCE4", TITLE = "EEF1F6", CREAM = "FFF7D6", GRIDCOL = "808080";
const FONT = "Groteska-Book";
const F_NUM = "#,##0.00", F_EUR = '#,##0.00\\ \\€';
const thin = { style: "thin", color: { rgb: GRIDCOL } };
const medium = { style: "medium", color: { rgb: "404040" } };
const box = { top: thin, bottom: thin, left: thin, right: thin };

const dataIt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const numOrNull = (v) => { const n = parseNum(v); return Number.isFinite(n) && n !== 0 ? n : null; };

// factory cella con stile
function C(v, { b = false, i = false, sz = 8, color, fill, align, wrap, num, border, formula } = {}) {
  const cell = {};
  if (formula) { cell.f = formula; cell.t = "n"; }
  else { cell.v = v == null ? "" : v; cell.t = typeof v === "number" ? "n" : "s"; }
  cell.s = {
    font: { name: FONT, sz, bold: b, italic: i, ...(color ? { color: { rgb: color } } : {}) },
    alignment: { vertical: "center", ...(align ? { horizontal: align } : {}), ...(wrap ? { wrapText: true } : {}) },
    ...(fill ? { fill: { patternType: "solid", fgColor: { rgb: fill } } } : {}),
    ...(border ? { border } : {}),
    ...(num ? { numFmt: num } : {}),
  };
  return cell;
}
const empty = 8; // n. colonne A..H

function buildCategoria(g) {
  const rows = [];      // array di array di celle
  const merges = [];    // {s:{r,c}, e:{r,c}}
  const heights = {};   // rowIndex -> altezza
  const push = (cells, h) => { const idx = rows.length; rows.push(cells); if (h) heights[idx] = h; return idx; };
  const blank = () => Array.from({ length: empty }, () => C(""));

  // r0: titolo categoria (navy, bianco, merge A:H)
  const r0 = blank();
  r0[0] = C(g.titoloPagina, { b: true, sz: 13, color: "FFFFFF", fill: NAVY, align: "center" });
  for (let c = 1; c < empty; c++) r0[c] = C("", { fill: NAVY });
  push(r0, 20);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: empty - 1 } });

  // r1-r2: header grigio con merge
  const hstyle = { b: true, sz: 8, fill: HEADER, align: "center", border: box };
  const r1 = [C("r. Ord", hstyle), C("DESIGNAZIONE DEI LAVORI", hstyle), C("Dimensioni", hstyle), C("", { ...hstyle }), C("", { ...hstyle }), C("Quantità", hstyle), C("IMPORTI", hstyle), C("", { ...hstyle })];
  const r2 = [C("", hstyle), C("", hstyle), C("Lung.", hstyle), C("Larg.", hstyle), C("H/peso", hstyle), C("", hstyle), C("unitario", hstyle), C("TOTALE", hstyle)];
  const hr1 = push(r1, 15); const hr2 = push(r2, 15);
  merges.push({ s: { r: hr1, c: 0 }, e: { r: hr2, c: 0 } });       // r.Ord
  merges.push({ s: { r: hr1, c: 1 }, e: { r: hr2, c: 1 } });       // DESIGNAZIONE
  merges.push({ s: { r: hr1, c: 2 }, e: { r: hr1, c: 4 } });       // Dimensioni
  merges.push({ s: { r: hr1, c: 5 }, e: { r: hr2, c: 5 } });       // Quantità
  merges.push({ s: { r: hr1, c: 6 }, e: { r: hr1, c: 7 } });       // IMPORTI

  // voci
  g.items.forEach((r) => {
    const misure = (r.misurazioni || []).filter((m) => m.descrizione || m.lung || m.larg || m.hpeso || m.qta);
    const labels = (r.sommano_labels && r.sommano_labels.length) ? r.sommano_labels : [`SOMMANO ${r.unita || ""}`.trim()];
    // riga titolo (grigio, top medium)
    const topb = { top: medium, bottom: thin, left: thin, right: thin };
    const tr = [
      C(r._code || r.codice || "", { b: true, sz: 8, fill: TITLE, align: "center", border: topb }),
      C((r.titolo || "").toUpperCase(), { b: true, sz: 9, fill: TITLE, wrap: true, border: topb }),
      C("", { fill: TITLE, border: topb, num: F_NUM }), C("", { fill: TITLE, border: topb, num: F_NUM }),
      C("", { fill: TITLE, border: topb, num: F_NUM }), C("", { fill: TITLE, border: topb, num: F_NUM }),
      C("", { fill: TITLE, border: topb, num: F_EUR }), C("", { fill: TITLE, border: topb, num: F_EUR }),
    ];
    push(tr, 15);
    // descrizione
    const descTxt = r.descrizione || "";
    const descRow = push([
      C("", { border: box }), C(descTxt, { sz: 8, wrap: true, border: box }),
      C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }),
      C("", { border: box, num: F_NUM }), C("NOTE: ", { sz: 8, border: box, num: F_EUR }), C("", { border: box }),
    ], Math.max(24, Math.ceil((descTxt.length || 1) / 60) * 11 + 6));
    // MISURAZIONI (corsivo)
    push([
      C("", { border: box }), C("MISURAZIONI:", { i: true, sz: 8, wrap: true, border: box }),
      C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }),
      C("", { border: box, num: F_NUM }), C("", { border: box }), C("", { border: box }),
    ], 13);
    // righe misura
    const misStart = rows.length;
    misure.forEach((m) => {
      push([
        C("", { border: box }), C(m.descrizione || "", { sz: 8, wrap: true, border: box }),
        C(numOrNull(m.lung), { sz: 8, align: "right", border: box, num: F_NUM }),
        C(numOrNull(m.larg), { sz: 8, align: "right", border: box, num: F_NUM }),
        C(numOrNull(m.hpeso), { sz: 8, align: "right", border: box, num: F_NUM }),
        C(qtaMisurazione(m) || null, { sz: 8, align: "right", border: box, num: F_NUM }),
        C("", { border: box }), C("", { border: box }),
      ], 13);
    });
    const misEnd = rows.length - 1;
    // NOTE merge: da descRow fino all'ultima riga misura (o descRow se nessuna)
    merges.push({ s: { r: descRow, c: 6 }, e: { r: Math.max(descRow, misEnd), c: 7 } });
    // SOMMANO (bold+italic), F=somma misure, G crema, H formula €
    const tot = totaleRiga(r);
    labels.forEach((lab) => {
      const rr = rows.length;
      const f = (misure.length && misStart <= misEnd)
        ? `SUM(F${misStart + 1}:F${misEnd + 1})` : null;
      push([
        C("", { b: true, i: true, sz: 8, border: box }),
        C(lab, { b: true, i: true, sz: 8, wrap: true, border: box }),
        C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }), C("", { border: box, num: F_NUM }),
        f ? C(null, { b: true, i: true, sz: 8, align: "right", border: box, num: F_NUM, formula: f })
          : C(tot || null, { b: true, i: true, sz: 8, align: "right", border: box, num: F_NUM }),
        C("", { fill: CREAM, border: box, num: F_EUR }),
        C(null, { sz: 8, border: box, num: F_EUR, formula: `IF(G${rr + 1}="","",F${rr + 1}*G${rr + 1})` }),
      ], 13);
    });
  });

  // TOTALE categoria (navy)
  const totRowIdx = rows.length;
  const trow = blank();
  trow[1] = C(`TOTALE ${g.nomeIndice}`, { b: true, sz: 10, color: "FFFFFF", fill: NAVY });
  for (let c = 0; c < empty; c++) if (c !== 1) trow[c] = C("", { fill: NAVY, num: c >= 6 ? F_EUR : undefined });
  push(trow, 16);

  // ws
  const aoa = rows; // già celle stilizzate
  const ws = {};
  const range = { s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: empty - 1 } };
  rows.forEach((cells, r) => cells.forEach((cell, c) => { ws[XLSX.utils.encode_cell({ r, c })] = cell; }));
  ws["!ref"] = XLSX.utils.encode_range(range);
  ws["!merges"] = merges;
  ws["!cols"] = [{ wch: 4.5 }, { wch: 38 }, { wch: 5.5 }, { wch: 5.5 }, { wch: 6 }, { wch: 8 }, { wch: 10.5 }, { wch: 11.5 }];
  // imposta altezze riga
  const rowArr = [];
  for (let r = 0; r < rows.length; r++) rowArr[r] = heights[r] ? { hpt: heights[r] } : {};
  ws["!rows"] = rowArr;
  return { name: `${g.code} - ${g.nomeIndice}`.slice(0, 31), ws, totRow: totRowIdx + 1 };
}

export function generaCapitolatoXlsx({ capitolato, righe, project, modo = "salva" }) {
  const wb = XLSX.utils.book_new();
  const gruppi = componiGruppi(righe);
  const nomeProgetto = capitolato?.nome && capitolato.nome !== "Capitolato"
    ? capitolato.nome : (project?.name || "Progetto");

  // Copertina
  const cop = XLSX.utils.aoa_to_sheet([[""]]);
  const copRows = [
    [C(CAPITOLATO_TITOLO, { b: true, sz: 16, color: "FFFFFF", fill: NAVY, align: "center" })],
    [C("COMPUTO OPERE EDILI IMPIANTISTICHE E DI FINITURE", { sz: 11, align: "center" })],
    [C("Capitolato d'appalto", { sz: 11, align: "center", color: "808080" })],
    [C("")],
    [C("Progetto:", { b: true, sz: 10 }), C(nomeProgetto, { sz: 10 })],
    [C("Committente:", { b: true, sz: 10 }), C(capitolato?.committente || "", { sz: 10 })],
    [C("Località:", { b: true, sz: 10 }), C(capitolato?.localita || "", { sz: 10 })],
    [C("Data:", { b: true, sz: 10 }), C(dataIt(capitolato?.data), { sz: 10 })],
    [C("Revisione:", { b: true, sz: 10 }), C(capitolato?.revisione || "", { sz: 10 })],
    [C("")],
    [C(CAPITOLATO_NOTA_IVA, { i: true, sz: 9, color: "808080" })],
  ];
  copRows.forEach((cells, r) => cells.forEach((cell, c) => { cop[XLSX.utils.encode_cell({ r, c })] = cell; }));
  cop["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: copRows.length - 1, c: 7 } });
  cop["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }];
  cop["!cols"] = [{ wch: 14 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, cop, "Copertina");

  // Premessa
  const prem = {};
  const premRows = [[C("PREMESSA", { b: true, sz: 11, color: "FFFFFF", fill: NAVY })], [C("")]];
  CAPITOLATO_PREMESSA.forEach((p) => {
    const isSub = p.length < 40 && p === p.toUpperCase() && !p.includes("\n");
    premRows.push([C(p, { b: isSub, sz: isSub ? 9 : 8, wrap: true })]);
  });
  premRows.forEach((cells, r) => cells.forEach((cell, c) => { prem[XLSX.utils.encode_cell({ r, c })] = cell; }));
  prem["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: premRows.length - 1, c: 7 } });
  prem["!merges"] = premRows.map((_, r) => ({ s: { r, c: 0 }, e: { r, c: 7 } }));
  prem["!cols"] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, prem, "Premessa");

  // Categorie
  const catInfo = [];
  gruppi.forEach((g) => { const { name, ws, totRow } = buildCategoria(g); catInfo.push({ code: g.code, nome: g.nomeIndice, name, totRow }); XLSX.utils.book_append_sheet(wb, ws, name); });

  // Riepilogo
  const rie = {};
  const rieRows = [
    [C(CAPITOLATO_TITOLO, { b: true, sz: 13, color: "FFFFFF", fill: NAVY, align: "center" }), ...Array.from({ length: 2 }, () => C("", { fill: NAVY }))],
    [C("Riepilogo generale per categoria di lavori", { i: true, sz: 9, color: "808080" })],
    [C("")],
    [C("Cod.", { b: true, sz: 9, fill: HEADER, align: "center", border: box }), C("Descrizione", { b: true, sz: 9, fill: HEADER, border: box }), C("Importo", { b: true, sz: 9, fill: HEADER, align: "center", border: box })],
  ];
  catInfo.forEach((c) => rieRows.push([
    C(c.code, { b: true, sz: 9, align: "center", border: box }),
    C(c.nome, { sz: 9, border: box }),
    C(null, { sz: 9, align: "right", border: box, num: F_EUR, formula: `'${c.name}'!H${c.totRow}` }),
  ]));
  rieRows.forEach((cells, r) => cells.forEach((cell, c) => { rie[XLSX.utils.encode_cell({ r, c })] = cell; }));
  rie["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rieRows.length - 1, c: 2 } });
  rie["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  rie["!cols"] = [{ wch: 8 }, { wch: 45 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, rie, "Riepilogo");

  const filename = `Capitolato_${String(nomeProgetto).replace(/[^\w\-]+/g, "_")}.xlsx`;
  if (modo === "blob") {
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  XLSX.writeFile(wb, filename);
}
