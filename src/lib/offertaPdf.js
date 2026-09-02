// ─────────────────────────────────────────────────────────────────────────────
// Generatore PDF dell'offerta di prestazioni professionali.
// Ricalca il modello "OFFERTA TIPO.docx"; intestazione, piè di pagina e font
// arrivano dalle impostazioni Report dello studio (studios.report_*).
// ─────────────────────────────────────────────────────────────────────────────
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { registerGroteskaFonts } from "../assets/fonts/groteskaFonts";
import { FIRMA_STUDIO_PNG, FIRMA_STUDIO_RATIO } from "../assets/firmaStudio";
import { buildFontSetter, urlToBase64, imageSize, drawFooters, NAVY } from "./pdfCommon";
import {
  SEZIONI, BLOCCHI_FISSI, INQUADRAMENTO, MODALITA_PAGAMENTO, PAGAMENTO_CHIUSURA,
  TESTI, STUDIO_NOME, compilaTesto, segmentaGrassetto,
} from "./offertaTemplate";
import {
  sezioniAttive, vociAttive, importoSezione, calcolaTotali,
  euroSimbolo, numero2, importoInLettere, dataEstesa,
} from "./offertaModel";

registerGroteskaFonts();

const W = 210, H = 297, ML = 20, MR = 20, CW = W - ML - MR;
const FOOTER_H = 15;
const MAX_Y = H - FOOTER_H - 8;

export async function generaOffertaPdf({ offerta, studio, documento, modo = "salva" }) {
  const s = studio || {};
  const cfg = documento;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { setF, footerFont, footerFontStyle } = buildFontSetter(pdf, s);

  // ── Asset caricati una volta sola ──────────────────────────────────────────
  let logo = null;
  if (s.report_logo_url) {
    const b64 = await urlToBase64(s.report_logo_url, { maxPx: 600, format: "image/png" });
    if (b64) {
      const dim = await imageSize(b64);
      if (dim) logo = { b64, ratio: dim.w / dim.h };
    }
  }
  const logoSize = s.report_logo_size || "medium";
  const LOGO_MAX_W = logoSize === "small" ? 16 : logoSize === "large" ? 35 : 25;
  const LOGO_MAX_H = logoSize === "small" ? 10 : logoSize === "large" ? 20 : 14;

  const putLogo = (x2, y, maxW, maxH) => {
    if (!logo) return y;
    let w = maxW, h = maxW / logo.ratio;
    if (h > maxH) { h = maxH; w = maxH * logo.ratio; }
    try { pdf.addImage(logo.b64, "PNG", x2 - w, y, w, h, undefined, "FAST"); } catch { return y; }
    return y + h;
  };

  // ── Cursore di pagina ──────────────────────────────────────────────────────
  let y = 0;

  const testataPagina = () => {
    const bottom = putLogo(W - MR, 12, LOGO_MAX_W, LOGO_MAX_H);
    y = Math.max(bottom + 8, 28);
  };

  const nuovaPagina = () => { pdf.addPage(); testataPagina(); };

  const ensure = (h = 6) => { if (y + h > MAX_Y) nuovaPagina(); };

  // ── Primitive di testo ─────────────────────────────────────────────────────
  const paragrafo = (testo, {
    size = 9.5, weight = "book", zone = "body", color = [30, 30, 30],
    align = "left", lineH = 5, spaceAfter = 0, maxW = CW, x = ML,
  } = {}) => {
    if (!testo) return;
    setF(weight, zone); pdf.setFontSize(size); pdf.setTextColor(...color);
    pdf.splitTextToSize(String(testo), maxW).forEach((line) => {
      ensure(lineH);
      const px = align === "center" ? x + maxW / 2 : align === "right" ? x + maxW : x;
      pdf.text(line, px, y, { align });
      y += lineH;
    });
    y += spaceAfter;
  };

  // Testo con porzioni in grassetto (**…**), a capo automatico.
  const paragrafoRicco = (testo, { size = 9.5, x = ML, maxW = CW, lineH = 5, color = [30, 30, 30], spaceAfter = 0 } = {}) => {
    const segs = segmentaGrassetto(testo);
    pdf.setFontSize(size); pdf.setTextColor(...color);
    let curX = x;
    ensure(lineH);
    segs.forEach((seg) => {
      setF(seg.bold ? "bold" : "book");
      const tokens = seg.text.split(/(\s+)/).filter(t => t !== "");
      tokens.forEach((tok) => {
        const tw = pdf.getTextWidth(tok);
        if (/^\s+$/.test(tok)) { if (curX > x) curX += tw; return; }
        if (curX + tw > x + maxW && curX > x) {
          y += lineH; curX = x;
          if (y > MAX_Y) { nuovaPagina(); curX = x; }
        }
        pdf.text(tok, curX, y);
        curX += tw;
      });
    });
    y += lineH + spaceAfter;
  };

  // Pallino pieno disegnato: indipendente dai glifi disponibili nel font
  const pallino = (x, yy) => {
    pdf.setFillColor(30, 30, 30);
    pdf.circle(x, yy - 1.1, 0.7, "F");
  };

  const elenco = (voci, { size = 9.5, indent = 6, spaceBetween = 1.5 } = {}) => {
    voci.forEach((v) => {
      setF("book"); pdf.setFontSize(size);
      const righe = pdf.splitTextToSize(String(v).replace(/\*\*/g, ""), CW - indent).length;
      ensure(righe * 5 + 2);
      pdf.setTextColor(30, 30, 30);
      pallino(ML + 2, y);
      paragrafoRicco(v, { x: ML + indent, maxW: CW - indent, size });
      y += spaceBetween;
    });
  };

  const titoloCentrato = (testo, { size = 14, spaceBefore = 6, spaceAfter = 6 } = {}) => {
    ensure(spaceBefore + 16);
    y += spaceBefore;
    setF("book", "header"); pdf.setFontSize(size); pdf.setTextColor(30, 30, 30);
    pdf.text(testo, W / 2, y, { align: "center" });
    y += 4;
    pdf.setDrawColor(60, 60, 60); pdf.setLineWidth(0.4);
    pdf.line(ML, y, W - MR, y);
    y += spaceAfter;
  };

  const sottolinea = (testo, x, size, weight = "bold") => {
    setF(weight, "header"); pdf.setFontSize(size); pdf.setTextColor(30, 30, 30);
    pdf.text(testo, x, y);
    const w = pdf.getTextWidth(testo);
    pdf.setDrawColor(30, 30, 30); pdf.setLineWidth(0.3);
    pdf.line(x, y + 1, x + w, y + 1);
  };

  // ── PAGINA DI COPERTINA ────────────────────────────────────────────────────
  if (cfg.copertina) {
    let cy = 62;
    if (logo) {
      const maxW = 60, maxH = 32;
      let w = maxW, h = maxW / logo.ratio;
      if (h > maxH) { h = maxH; w = maxH * logo.ratio; }
      try { pdf.addImage(logo.b64, "PNG", (W - w) / 2, cy, w, h, undefined, "FAST"); } catch {}
      cy += h + 12;
    }
    const dest = cfg.destinatario || {};
    setF("book", "header"); pdf.setFontSize(13); pdf.setTextColor(30, 30, 30);
    if (dest.nome)      { pdf.text(dest.nome, W / 2, cy, { align: "center" }); cy += 7; }
    if (dest.indirizzo) { pdf.text(dest.indirizzo, W / 2, cy, { align: "center" }); cy += 7; }
    cy += 2;
    pdf.setDrawColor(30, 30, 30); pdf.setLineWidth(0.4);
    pdf.line(W / 2 - 65, cy, W / 2 + 65, cy);
    cy += 10;
    pdf.text(offerta?.numero_offerta || "", W / 2, cy, { align: "center" }); cy += 7;
    pdf.text(TESTI.copertinaSottotitolo, W / 2, cy, { align: "center" });
    nuovaPagina();
  } else {
    testataPagina();
  }

  // ── LETTERA DI ACCOMPAGNAMENTO ─────────────────────────────────────────────
  y = Math.max(y, 40);
  paragrafo(`${cfg.luogo || "Milano"} lì, ${dataEstesa(cfg.data)}`, { align: "right", size: 10, weight: "book" });
  y += 6;

  const oggettoRiga = `${offerta?.numero_offerta || "OFF."} PRESTAZIONI PROFESSIONALI PER ${(cfg.oggettoIncarico || "").toUpperCase()}`;
  paragrafo(oggettoRiga, { size: 10.5, weight: "bold", zone: "header", spaceAfter: 3 });
  pdf.setDrawColor(60, 60, 60); pdf.setLineWidth(0.4);
  pdf.line(ML, y, W - MR, y);
  y += 7;

  paragrafo(TESTI.oggetto, { spaceAfter: 6 });

  const dest = cfg.destinatario || {};
  paragrafo(`Egregio/Spettabile ${dest.nome || ""},`, { spaceAfter: 6 });

  const dettagli = [
    dest.sede  ? `con sede in ${dest.sede}` : null,
    dest.cf    ? `C.F. ${dest.cf}` : null,
    dest.piva  ? `P.IVA ${dest.piva}` : null,
  ].filter(Boolean).join(", ");
  paragrafo(
    `circa la manifestata necessità ${cfg.necessita || ""}${dettagli ? ", " + dettagli : ""}, si inoltra nostra miglior offerta per le competenze richieste.`,
    { spaceAfter: 6 }
  );
  paragrafo(TESTI.saluti, { spaceAfter: 6 });
  paragrafo(STUDIO_NOME, { spaceAfter: 2 });

  if (cfg.firma) {
    ensure(24);
    const fw = 40, fh = fw / FIRMA_STUDIO_RATIO;
    try { pdf.addImage(FIRMA_STUDIO_PNG, "PNG", ML, y, fw, fh, undefined, "FAST"); } catch {}
    y += fh + 4;
  }

  // ── STRUTTURA DELL'OFFERTA ─────────────────────────────────────────────────
  nuovaPagina();
  setF("book", "header"); pdf.setFontSize(16); pdf.setTextColor(30, 30, 30);
  pdf.text(TESTI.strutturaTitolo, W / 2, y + 4, { align: "center" });
  y += 8;
  pdf.setDrawColor(60, 60, 60); pdf.setLineWidth(0.4);
  pdf.line(ML, y, W - MR, y);
  y += 10;

  if (cfg.inquadramento?.attivo) {
    sottolinea(INQUADRAMENTO.titolo, ML, 11);
    y += 7;
    paragrafo(compilaTesto(INQUADRAMENTO.testo, cfg.inquadramento.campi), { spaceAfter: 6 });
  }

  const attive = sezioniAttive(cfg);

  attive.forEach((sez) => {
    ensure(30);   // il titolo non resta orfano in fondo alla pagina
    y += 3;
    sottolinea(`(${sez.lettera}) ${sez.titolo}`, ML, 10.5);
    y += 7;

    vociAttive(sez, cfg).forEach((gruppo) => {
      if (gruppo.label) {
        ensure(8);
        sottolinea(gruppo.label, ML + 4, 9.5, "regular");
        y += 6;
      }
      gruppo.voci.forEach((v) => {
        const vc = cfg.sezioni[sez.id].voci[v.id] || {};
        const testo = compilaTesto(v.testo, vc.campi);
        const conPrezzo = sez.modoPrezzo === "voci" && v.prezzo;

        // Riserva lo spazio per testo + eventuale riga prezzo: evita che
        // l'importo finisca da solo in cima alla pagina successiva.
        setF("book"); pdf.setFontSize(9.5);
        const righe = pdf.splitTextToSize(testo.replace(/\*\*/g, ""), CW - 10).length;
        ensure(righe * 5 + (conPrezzo ? 7 : 0) + 2);

        pdf.setTextColor(30, 30, 30);
        pallino(ML + 5, y);
        paragrafoRicco(testo, { x: ML + 10, maxW: CW - 10 });

        if (conPrezzo) {
          setF("bold"); pdf.setFontSize(9.5); pdf.setTextColor(30, 30, 30);
          const label = v.prezzoLabel || "€";
          pdf.text(`${label} ${numero2(vc.prezzo)}`, W - MR, y, { align: "right" });
          y += 5;
        }
        y += 2;
      });
      y += 2;
    });
  });

  // ── BLOCCHI DI TESTO FISSO ─────────────────────────────────────────────────
  BLOCCHI_FISSI.filter(b => cfg.blocchi?.[b.id]).forEach((b) => {
    titoloCentrato(b.titolo, { spaceBefore: 10, spaceAfter: 7 });
    b.paragrafi.forEach(p => paragrafo(p, { spaceAfter: 3 }));
    if (b.elenco?.length) { y += 1; elenco(b.elenco); }
  });

  // ── COMPENSI E ONERI ───────────────────────────────────────────────────────
  const tot = calcolaTotali(cfg);
  ensure(60);
  titoloCentrato(TESTI.compensiTitolo, { spaceBefore: 10, spaceAfter: 8 });

  // Font della tabella: coerente con la zona body del report
  setF("book"); const tblBook = pdf.getFont().fontName;
  setF("bold"); const tblBold = pdf.getFont().fontName;

  autoTable(pdf, {
    startY: y,
    theme: "plain",
    margin: { left: ML, right: MR },
    body: [
      ...tot.righe.map(r => [`(${r.lettera})`, r.titolo, euroSimbolo(r.importo)]),
      ["", TESTI.totaleLabel, euroSimbolo(tot.lordo)],
    ],
    columnStyles: {
      0: { cellWidth: 14, halign: "left" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 34, halign: "right" },
    },
    bodyStyles: {
      font: tblBook,
      fontStyle: "normal",
      fontSize: 9.5,
      textColor: [30, 30, 30],
      cellPadding: { top: 3.5, bottom: 3.5, left: 1, right: 1 },
      lineWidth: { bottom: 0.2 },
      lineColor: [210, 210, 210],
    },
    didParseCell: (data) => {
      const ultima = data.row.index === tot.righe.length;
      if (data.column.index === 1 || ultima) {
        // Groteska è registrata solo con stile "normal": il grassetto è una famiglia
        if (tblBold === "helvetica") data.cell.styles.fontStyle = "bold";
        else data.cell.styles.font = tblBold;
      }
      if (data.column.index === 0) data.cell.styles.fontSize = 8;
      if (ultima) data.cell.styles.lineWidth = { top: 0.5, bottom: 0 };
    },
    tableLineWidth: 0,
  });
  y = pdf.lastAutoTable.finalY + 9;

  paragrafo(
    `In base alle prestazioni professionali descritte ed elencate è calcolata una parcella di euro ${numero2(tot.lordo)} (${importoInLettere(tot.lordo)}).`,
    { spaceAfter: 3 }
  );
  paragrafo(TESTI.chiusuraNonConvenuto, { spaceAfter: 7 });

  let etichettaTotale = TESTI.totaleLabel;
  if (tot.sconto > 0 && tot.scontoFisso > 0)
    etichettaTotale += ` a seguito di sconto ${tot.sconto}% e ${euroSimbolo(tot.scontoFisso)}`;
  else if (tot.sconto > 0)      etichettaTotale += ` a seguito di sconto ${tot.sconto}%`;
  else if (tot.scontoFisso > 0) etichettaTotale += ` con sconto dedicato di ${euroSimbolo(tot.scontoFisso)}`;

  ensure(12);
  paragrafoRicco(
    `**${etichettaTotale}: ${euroSimbolo(tot.totale)} (${importoInLettere(tot.totale)}) esclusi oneri fiscali e contributi integrativi.**`,
    { size: 10.5, spaceAfter: 4 }
  );

  // ── MODALITÀ E SCADENZE DI PAGAMENTO ───────────────────────────────────────
  const opzioni = MODALITA_PAGAMENTO.filter(o => (cfg.pagamento?.opzioni || []).includes(o.id));
  if (opzioni.length > 0 || cfg.pagamento?.testoLibero) {
    titoloCentrato(TESTI.pagamentiTitolo, { spaceBefore: 8, spaceAfter: 7 });
    if (opzioni.length > 0) elenco(opzioni.map(o => `**Opzione ${o.id} —** ${o.testo}`));
    if (cfg.pagamento?.testoLibero) { y += 2; paragrafo(cfg.pagamento.testoLibero, { spaceAfter: 2 }); }
    y += 4;
    paragrafo(PAGAMENTO_CHIUSURA, { spaceAfter: 8 });
  }

  // ── ACCETTAZIONE ───────────────────────────────────────────────────────────
  ensure(34);
  paragrafo(TESTI.accettazione, { weight: "bold", zone: "header", size: 10, spaceAfter: 5 });
  setF("book"); pdf.setFontSize(9.5); pdf.setTextColor(30, 30, 30);
  pdf.text(TESTI.accettazioneSx, ML, y);
  pdf.text(TESTI.accettazioneDx, W / 2 + 15, y);
  y += 4;
  if (cfg.firma) {
    const fw = 40, fh = fw / FIRMA_STUDIO_RATIO;
    try { pdf.addImage(FIRMA_STUDIO_PNG, "PNG", W / 2 + 15, y, fw, fh, undefined, "FAST"); } catch {}
    y += fh;
  }

  // ── Piè di pagina su tutte le pagine ───────────────────────────────────────
  drawFooters(pdf, s, {
    ml: ML, mr: MR, W, pageH: H, footerH: FOOTER_H,
    footerFont, footerFontStyle,
    fallbackTitle: "Offerta di prestazioni professionali",
  });

  const nomeFile = `${(offerta?.numero_offerta || "offerta").replace(/[^a-zA-Z0-9_\-. ]/g, "")} - ${(offerta?.nome_offerta || "").replace(/[^a-zA-Z0-9_\-. ]/g, "")}`.trim() || "offerta";
  if (modo === "anteprima") return pdf.output("bloburl");
  pdf.save(`${nomeFile}.pdf`);
  return null;
}
