// ─────────────────────────────────────────────────────────────────────────────
// Export Excel del capitolato: ricalca la struttura a fogli del file "CAP. BASE"
// (Copertina, un foglio per categoria, Riepilogo). Colonne A–H come l'originale.
// Categorie re-letterate (A, B, C…) e voci renumerate come nel PDF; numeri a 2
// decimali. Le colonne IMPORTI (unitario/TOTALE) restano vuote (non estimativo).
// ─────────────────────────────────────────────────────────────────────────────
import * as XLSX from "xlsx";
import { CAPITOLATO_PREMESSA, CAPITOLATO_TITOLO, CAPITOLATO_NOTA_IVA } from "./capitolatoTemplate";
import { componiGruppi, totaleRiga, qtaMisurazione, parseNum } from "./capitolatoModel";

const dataIt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const num = (v) => { const n = parseNum(v); return Number.isFinite(n) && n !== 0 ? n : null; };

// applica il formato "0.00" a tutte le celle numeriche del foglio
function formatta2Decimali(ws) {
  const ref = ws["!ref"]; if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === "n") cell.z = "0.00";
    }
  }
}

function foglioCategoria(g) {
  const aoa = [];
  aoa.push([g.titoloPagina]);
  aoa.push(["r. Ord", "DESIGNAZIONE DEI LAVORI", "Dimensioni", null, null, "Quantità", "IMPORTI", null]);
  aoa.push([null, null, "Lung.", "Larg.", "H/peso", null, "unitario", "TOTALE"]);

  g.items.forEach((r) => {
    aoa.push([r._code || r.codice || "", (r.titolo || "").toUpperCase()]);
    if (r.descrizione) aoa.push([null, r.descrizione]);
    if (r.note) aoa.push([null, "NOTE: " + r.note]);
    aoa.push([null, "MISURAZIONI:"]);
    (r.misurazioni || [])
      .filter((m) => m.descrizione || m.lung || m.larg || m.hpeso || m.qta)
      .forEach((m) => aoa.push([null, m.descrizione || "", num(m.lung), num(m.larg), num(m.hpeso), qtaMisurazione(m) || null]));
    const tot = totaleRiga(r);
    const labels = (r.sommano_labels && r.sommano_labels.length) ? r.sommano_labels : [`SOMMANO ${r.unita || ""}`.trim()];
    labels.forEach((lab) => aoa.push([null, lab, null, null, null, tot || null, null, null]));
    aoa.push([]);
  });
  aoa.push([null, `TOTALE ${g.nomeIndice}`]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 8 }, { wch: 60 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 11 }, { wch: 12 }];
  formatta2Decimali(ws);
  return ws;
}

export function generaCapitolatoXlsx({ capitolato, righe, project, modo = "salva" }) {
  const wb = XLSX.utils.book_new();
  const gruppi = componiGruppi(righe);
  const nomeProgetto = capitolato?.nome && capitolato.nome !== "Capitolato"
    ? capitolato.nome : (project?.name || "Progetto");

  const cop = XLSX.utils.aoa_to_sheet([
    [CAPITOLATO_TITOLO],
    ["COMPUTO OPERE EDILI IMPIANTISTICHE E DI FINITURE"],
    ["Capitolato d'appalto"],
    [],
    ["Progetto:", nomeProgetto],
    ["Committente:", capitolato?.committente || ""],
    ["Località:", capitolato?.localita || ""],
    ["Data:", dataIt(capitolato?.data)],
    ["Revisione:", capitolato?.revisione || ""],
    [],
    [CAPITOLATO_NOTA_IVA],
  ]);
  cop["!cols"] = [{ wch: 16 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, cop, "Copertina");

  const prem = XLSX.utils.aoa_to_sheet([["PREMESSA"], [], ...CAPITOLATO_PREMESSA.map((p) => [p])]);
  prem["!cols"] = [{ wch: 120 }];
  XLSX.utils.book_append_sheet(wb, prem, "Premessa");

  gruppi.forEach((g) => {
    const nome = `${g.code} - ${g.nomeIndice}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, foglioCategoria(g), nome);
  });

  const rie = XLSX.utils.aoa_to_sheet([
    [CAPITOLATO_TITOLO],
    ["Riepilogo generale per categoria di lavori"],
    [],
    ["Cod.", "Descrizione", "Importo"],
    ...gruppi.map((g) => [g.code, g.nomeIndice, null]),
  ]);
  rie["!cols"] = [{ wch: 8 }, { wch: 45 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, rie, "Riepilogo");

  const filename = `Capitolato_${String(nomeProgetto).replace(/[^\w\-]+/g, "_")}.xlsx`;
  if (modo === "blob") {
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  XLSX.writeFile(wb, filename);
}
