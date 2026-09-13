// ─────────────────────────────────────────────────────────────────────────────
// Generatore PDF del capitolato / computo metrico. Ricalca l'impaginazione del
// file "CAP. BASE": copertina, premessa + indice, una pagina per categoria con
// le voci (codice, descrizione, misurazioni, SOMMANO) e riepilogo finale.
// Le colonne IMPORTI restano vuote (computo metrico non estimativo).
// ─────────────────────────────────────────────────────────────────────────────
import { jsPDF } from "jspdf";
import { registerGroteskaFonts } from "../assets/fonts/groteskaFonts";
import { buildFontSetter, urlToBase64, imageSize, drawFooters, NAVY } from "./pdfCommon";
import {
  CAPITOLATO_CATEGORIE, CAPITOLATO_PREMESSA,
  CAPITOLATO_TITOLO, CAPITOLATO_SOTTOTITOLO, CAPITOLATO_NOTA_IVA,
} from "./capitolatoTemplate";
import { totaleRiga, qtaMisurazione, fmtNum, parseNum } from "./capitolatoModel";

registerGroteskaFonts();

const W = 210, H = 297, ML = 12, MR = 12;
const FOOTER_H = 14;
const MAX_Y = H - FOOTER_H - 4;

// Larghezze colonne (mm). Designazione occupa lo spazio residuo.
const COL = { ord: 12, lung: 15, larg: 15, hpeso: 17, qta: 18, unit: 20, tot: 22 };
const DESIG = (W - ML - MR) - (COL.ord + COL.lung + COL.larg + COL.hpeso + COL.qta + COL.unit + COL.tot);

// x di partenza di ogni colonna
const X = {};
(() => {
  let x = ML;
  X.ord = x; x += COL.ord;
  X.desig = x; x += DESIG;
  X.lung = x; x += COL.lung;
  X.larg = x; x += COL.larg;
  X.hpeso = x; x += COL.hpeso;
  X.qta = x; x += COL.qta;
  X.unit = x; x += COL.unit;
  X.tot = x; x += COL.tot;
  X.end = x;
})();
const RIGHT = (key) => X[key] + COL[key] - 1.5;

const dataIt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export async function generaCapitolatoPdf({ capitolato, righe, project, studio, modo = "salva" }) {
  const s = studio || {};
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { setF, footerFont, footerFontStyle } = buildFontSetter(pdf, s);

  // logo studio (se presente)
  let logo = null;
  if (s.report_logo_url) {
    const b64 = await urlToBase64(s.report_logo_url, { maxPx: 600, format: "image/png" });
    if (b64) { const dim = await imageSize(b64); if (dim) logo = { b64, ratio: dim.w / dim.h }; }
  }
  const putLogo = (x2, y, maxW = 24, maxH = 13) => {
    if (!logo) return y;
    let w = maxW, h = maxW / logo.ratio;
    if (h > maxH) { h = maxH; w = maxH * logo.ratio; }
    try { pdf.addImage(logo.b64, "PNG", x2 - w, y, w, h, undefined, "FAST"); } catch { return y; }
    return y + h;
  };

  const nomeStudio = s.report_header_name || s.name || "STUDIO";
  const emailStudio = s.report_header_email || s.email || "";
  const nomeProgetto = capitolato?.nome && capitolato.nome !== "Capitolato"
    ? capitolato.nome : (project?.name || "PROGETTO");
  const localita = capitolato?.localita || "";

  let y = 0;

  // ── Intestazione di pagina (progetto a sx, studio a dx) ────────────────────
  const testata = () => {
    const top = 10;
    setF("bold", "header"); pdf.setFontSize(9); pdf.setTextColor(...NAVY);
    pdf.text(String(nomeProgetto).toUpperCase(), ML, top + 2);
    setF("book", "body"); pdf.setFontSize(7.5); pdf.setTextColor(110, 110, 110);
    if (localita) pdf.text(localita, ML, top + 6);

    const logoBottom = putLogo(W - MR, top - 2);
    let ry = top + 2;
    setF("bold", "header"); pdf.setFontSize(8); pdf.setTextColor(...NAVY);
    if (!logo) { pdf.text(nomeStudio, W - MR, ry, { align: "right" }); ry += 4; }
    setF("book", "body"); pdf.setFontSize(7); pdf.setTextColor(110, 110, 110);
    if (emailStudio) pdf.text(emailStudio, W - MR, Math.max(logoBottom, ry) + (logo ? 3 : 0), { align: "right" });

    pdf.setDrawColor(190, 190, 190); pdf.setLineWidth(0.3);
    pdf.line(ML, top + 9, W - MR, top + 9);
    y = top + 13;
  };

  // ── Riga di intestazione tabella (colonne) ─────────────────────────────────
  const intestazioneTabella = () => {
    const h1 = 5, h2 = 5;
    pdf.setFillColor(238, 240, 244);
    pdf.rect(ML, y, W - ML - MR, h1 + h2, "F");
    pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.2);
    // linee verticali separatori
    [X.desig, X.lung, X.larg, X.hpeso, X.qta, X.unit, X.tot, X.end].forEach((x) =>
      pdf.line(x, y, x, y + h1 + h2));
    pdf.line(ML, y, X.end, y); pdf.line(ML, y + h1 + h2, X.end, y + h1 + h2);
    pdf.line(ML, y + h1, X.end, y + h1);

    setF("bold", "header"); pdf.setFontSize(6.3); pdf.setTextColor(60, 60, 60);
    pdf.text("r. Ord", X.ord + COL.ord / 2, y + 3.4, { align: "center" });
    pdf.text("DESIGNAZIONE DEI LAVORI", X.desig + 2, y + 3.4);
    const dimW = COL.lung + COL.larg + COL.hpeso;
    pdf.text("Dimensioni", X.lung + dimW / 2, y + 3.4, { align: "center" });
    pdf.text("Quantità", X.qta + COL.qta / 2, y + 3.4, { align: "center" });
    pdf.text("IMPORTI", X.unit + (COL.unit + COL.tot) / 2, y + 3.4, { align: "center" });
    pdf.setFontSize(6);
    pdf.text("Lung.", X.lung + COL.lung / 2, y + h1 + 3.3, { align: "center" });
    pdf.text("Larg.", X.larg + COL.larg / 2, y + h1 + 3.3, { align: "center" });
    pdf.text("H/peso", X.hpeso + COL.hpeso / 2, y + h1 + 3.3, { align: "center" });
    pdf.text("unitario", X.unit + COL.unit / 2, y + h1 + 3.3, { align: "center" });
    pdf.text("TOTALE", X.tot + COL.tot / 2, y + h1 + 3.3, { align: "center" });
    y += h1 + h2;
  };

  const ensure = (needed) => {
    if (y + needed > MAX_Y) { pdf.addPage(); testata(); intestazioneTabella(); }
  };

  // ── COPERTINA ───────────────────────────────────────────────────────────────
  testata();
  y = 70;
  setF("bold", "header"); pdf.setFontSize(20); pdf.setTextColor(...NAVY);
  pdf.text(CAPITOLATO_TITOLO, W / 2, y, { align: "center" }); y += 12;
  setF("book", "body"); pdf.setFontSize(11); pdf.setTextColor(70, 70, 70);
  CAPITOLATO_SOTTOTITOLO.split("\n").forEach((l) => { pdf.text(l, W / 2, y, { align: "center" }); y += 6; });
  y += 4;
  setF("book", "body"); pdf.setFontSize(12); pdf.setTextColor(120, 120, 120);
  pdf.text("Capitolato d'appalto", W / 2, y, { align: "center" });

  // riquadro dati progetto
  y = 150;
  const boxX = 55, boxW = 100, rowH = 12;
  const campi = [
    ["Progetto:", nomeProgetto],
    ["Committente:", capitolato?.committente || ""],
    ["Località:", localita],
    ["Data:", dataIt(capitolato?.data)],
    ["Revisione:", capitolato?.revisione || ""],
  ];
  pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.3);
  campi.forEach((c, i) => {
    const ry = y + i * rowH;
    setF("bold", "header"); pdf.setFontSize(9); pdf.setTextColor(...NAVY);
    pdf.text(c[0], boxX, ry);
    setF("book", "body"); pdf.setFontSize(9); pdf.setTextColor(50, 50, 50);
    pdf.text(String(c[1]), boxX + 30, ry);
    pdf.line(boxX + 28, ry + 1.5, boxX + boxW, ry + 1.5);
  });
  setF("book", "body"); pdf.setFontSize(8); pdf.setTextColor(120, 120, 120);
  pdf.text(CAPITOLATO_NOTA_IVA, W / 2, MAX_Y, { align: "center" });

  // ── PREMESSA + INDICE ─────────────────────────────────────────────────────
  pdf.addPage(); testata();
  setF("bold", "header"); pdf.setFontSize(12); pdf.setTextColor(...NAVY);
  pdf.text("PREMESSA", ML, y); y += 6;
  setF("book", "body"); pdf.setFontSize(7.5); pdf.setTextColor(60, 60, 60);
  CAPITOLATO_PREMESSA.forEach((par) => {
    par.split("\n").forEach((sub) => {
      const lines = pdf.splitTextToSize(sub, W - ML - MR);
      lines.forEach((ln) => { ensure(4); pdf.text(ln, ML, y); y += 3.6; });
    });
    y += 2.5;
  });

  y += 4; ensure(10);
  setF("bold", "header"); pdf.setFontSize(12); pdf.setTextColor(...NAVY);
  pdf.text("INDICE", ML, y); y += 6;
  const usedCodes = new Set(righe.map((r) => r.categoria_code));
  setF("book", "body"); pdf.setFontSize(9); pdf.setTextColor(50, 50, 50);
  CAPITOLATO_CATEGORIE.forEach((cat) => {
    if (!usedCodes.has(cat.code)) return;
    ensure(6);
    setF("bold", "header"); pdf.setTextColor(...NAVY);
    pdf.text(cat.code, ML + 2, y);
    setF("book", "body"); pdf.setTextColor(50, 50, 50);
    pdf.text(cat.nomeIndice, ML + 12, y);
    y += 5.5;
  });

  // ── PAGINE PER CATEGORIA ────────────────────────────────────────────────────
  const perCategoria = CAPITOLATO_CATEGORIE
    .map((cat) => ({ cat, righe: righe.filter((r) => r.categoria_code === cat.code) }))
    .filter((g) => g.righe.length > 0);

  const totaliCat = []; // { code, nomeIndice } (importo vuoto: non estimativo)

  perCategoria.forEach((g) => {
    pdf.addPage(); testata();
    // barra titolo categoria
    pdf.setFillColor(...NAVY);
    pdf.rect(ML, y, W - ML - MR, 6, "F");
    setF("bold", "header"); pdf.setFontSize(8.5); pdf.setTextColor(255, 255, 255);
    pdf.text(g.cat.titoloPagina, ML + 2, y + 4.1);
    y += 6;
    intestazioneTabella();

    g.righe.forEach((r) => {
      const misure = (r.misurazioni || []).filter(
        (m) => m.descrizione || m.lung || m.larg || m.hpeso || m.qta
      );
      const labels = (r.sommano_labels && r.sommano_labels.length)
        ? r.sommano_labels
        : [`SOMMANO ${r.unita || ""}`.trim()];
      const tot = totaleRiga(r);

      // stima altezza blocco per decidere il salto pagina del titolo+descrizione
      setF("book", "body"); pdf.setFontSize(7);
      const descLines = pdf.splitTextToSize(r.descrizione || "", DESIG - 3);
      const headBlock = 4.5 + descLines.length * 3.1 + 4; // codice+titolo + descr + MISURAZIONI
      ensure(headBlock + 4);

      const blockTop = y;
      // codice + titolo
      setF("bold", "header"); pdf.setFontSize(7.2); pdf.setTextColor(...NAVY);
      pdf.text(r.codice || "", X.ord + COL.ord / 2, y + 3, { align: "center" });
      pdf.text((r.titolo || "").toUpperCase(), X.desig + 1.5, y + 3);
      y += 4.5;
      // descrizione
      setF("book", "body"); pdf.setFontSize(7); pdf.setTextColor(55, 55, 55);
      descLines.forEach((ln) => { ensure(3.4); pdf.text(ln, X.desig + 1.5, y + 2.2); y += 3.1; });
      // NOTE (se presente)
      if (r.note) {
        setF("book", "body"); pdf.setFontSize(6.5); pdf.setTextColor(120, 120, 120);
        const noteLines = pdf.splitTextToSize("NOTE: " + r.note, DESIG - 3);
        noteLines.forEach((ln) => { ensure(3.2); pdf.text(ln, X.desig + 1.5, y + 2); y += 3; });
      }
      // MISURAZIONI
      y += 1; ensure(4);
      setF("bold", "header"); pdf.setFontSize(6.6); pdf.setTextColor(90, 90, 90);
      pdf.text("MISURAZIONI:", X.desig + 1.5, y + 2.2); y += 4;

      // righe misurazione
      setF("book", "body"); pdf.setFontSize(7); pdf.setTextColor(55, 55, 55);
      misure.forEach((m) => {
        ensure(3.6);
        pdf.text(String(m.descrizione || ""), X.desig + 3, y + 2.2);
        const cell = (key, val) => { const n = parseNum(val); if (Number.isFinite(n)) pdf.text(fmtNum(n), RIGHT(key), y + 2.2, { align: "right" }); };
        cell("lung", m.lung); cell("larg", m.larg); cell("hpeso", m.hpeso);
        const q = qtaMisurazione(m);
        if (q) pdf.text(fmtNum(q), RIGHT("qta"), y + 2.2, { align: "right" });
        y += 3.4;
      });

      // SOMMANO (una o due righe: fornitura/posa)
      labels.forEach((lab) => {
        ensure(4);
        setF("bold", "header"); pdf.setFontSize(7); pdf.setTextColor(40, 40, 40);
        pdf.text(lab, X.desig + 1.5, y + 2.4);
        pdf.text(fmtNum(tot), RIGHT("qta"), y + 2.4, { align: "right" });
        y += 4;
      });

      // separatore voce
      pdf.setDrawColor(225, 225, 225); pdf.setLineWidth(0.2);
      pdf.line(ML, y + 0.5, X.end, y + 0.5);
      // bordo sinistro colonna ordine per il blocco
      pdf.line(X.desig, blockTop, X.desig, y + 0.5);
      pdf.line(X.qta, blockTop, X.qta, y + 0.5);
      pdf.line(X.unit, blockTop, X.unit, y + 0.5);
      pdf.line(X.tot, blockTop, X.tot, y + 0.5);
      y += 2.5;
    });

    // TOTALE categoria (importo vuoto)
    ensure(6);
    setF("bold", "header"); pdf.setFontSize(7.5); pdf.setTextColor(...NAVY);
    pdf.text(`TOTALE ${g.cat.nomeIndice}`, X.desig + 1.5, y + 3);
    pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.3);
    pdf.line(ML, y - 0.5, X.end, y - 0.5);
    y += 6;
    totaliCat.push(g.cat);
  });

  // ── RIEPILOGO ────────────────────────────────────────────────────────────────
  pdf.addPage(); testata();
  setF("bold", "header"); pdf.setFontSize(13); pdf.setTextColor(...NAVY);
  pdf.text("RIEPILOGO GENERALE PER CATEGORIA", ML, y); y += 8;
  const rW = W - ML - MR;
  pdf.setFillColor(238, 240, 244); pdf.rect(ML, y, rW, 6, "F");
  setF("bold", "header"); pdf.setFontSize(7.5); pdf.setTextColor(60, 60, 60);
  pdf.text("Cod.", ML + 2, y + 4);
  pdf.text("Descrizione", ML + 20, y + 4);
  pdf.text("Importo", W - MR - 2, y + 4, { align: "right" });
  y += 6;
  totaliCat.forEach((cat) => {
    ensure(6);
    setF("bold", "header"); pdf.setFontSize(8); pdf.setTextColor(...NAVY);
    pdf.text(cat.code, ML + 2, y + 4);
    setF("book", "body"); pdf.setTextColor(50, 50, 50);
    pdf.text(cat.nomeIndice, ML + 20, y + 4);
    pdf.setDrawColor(225, 225, 225); pdf.setLineWidth(0.2);
    pdf.line(ML, y + 6, W - MR, y + 6);
    y += 6;
  });
  setF("book", "body"); pdf.setFontSize(8); pdf.setTextColor(120, 120, 120);
  pdf.text(CAPITOLATO_NOTA_IVA, ML, MAX_Y);

  // ── Footer su tutte le pagine (salta la copertina) ──────────────────────────
  drawFooters(pdf, s, {
    ml: ML, mr: MR, W, pageH: H, footerH: FOOTER_H,
    footerFont, footerFontStyle, fallbackTitle: "Capitolato",
  });

  const filename = `Capitolato_${(nomeProgetto || "progetto").replace(/[^\w\-]+/g, "_")}.pdf`;
  if (modo === "blob") return pdf.output("blob");
  pdf.save(filename);
}
