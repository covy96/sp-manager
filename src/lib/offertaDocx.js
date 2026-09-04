// ─────────────────────────────────────────────────────────────────────────────
// Generatore Word (.docx) dell'offerta di prestazioni professionali.
// Stesso contenuto del PDF, con intestazione e piè di pagina nativi di Word
// alimentati dalle impostazioni Report dello studio.
// La libreria `docx` viene caricata in lazy-load al momento della generazione.
// ─────────────────────────────────────────────────────────────────────────────
import { FIRMA_STUDIO_PNG, FIRMA_STUDIO_RATIO } from "../assets/firmaStudio";
import {
  resolveTemplate, PAGAMENTO_CHIUSURA,
  TESTI, STUDIO_NOME, compilaTesto, segmentaGrassetto, testoRateC,
} from "./offertaTemplate";
import {
  sezioniAttive, vociAttive, importoVoce, calcolaTotali, euroSimbolo, numero2, importoInLettere, dataEstesa,
} from "./offertaModel";
import { GROTESKA_VARIANTS } from "../assets/fonts/groteskaFonts";

const MM = (mm) => Math.round(mm * 56.6929);        // mm → twip
const PX = (mm) => Math.round(mm * 96 / 25.4);      // mm → px (immagini)

const FONT_BODY = "Calibri";

function dataUrlToUint8(dataUrl) {
  const b64 = String(dataUrl).split(",")[1] || "";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function fetchImage(url) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const tipo = /\.png($|\?)/i.test(url) || (bytes[0] === 0x89 && bytes[1] === 0x50) ? "png" : "jpg";
    const dim = await new Promise((resolve) => {
      const i = new Image();
      i.onload = () => resolve({ w: i.naturalWidth, h: i.naturalHeight });
      i.onerror = () => resolve(null);
      i.src = URL.createObjectURL(new Blob([bytes]));
    });
    return dim ? { bytes, tipo, ratio: dim.w / dim.h } : null;
  } catch { return null; }
}

export async function generaOffertaDocx({ offerta, studio, documento }) {
  const D = await import("docx");
  const {
    Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer,
    Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, TabStopType,
  } = D;

  const s = studio || {};
  const cfg = documento;
  const tpl = resolveTemplate(studio);
  const { BLOCCHI_FISSI, INQUADRAMENTO, MODALITA_PAGAMENTO } = tpl;
  const tot = calcolaTotali(cfg, tpl);

  const groteska = GROTESKA_VARIANTS.find(g => g.key === (s.report_footer_font || ""));
  const fontFooter = groteska ? "Groteska Book" : FONT_BODY;

  const NESSUN_BORDO = {
    top:    { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right:  { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };

  // ── Helper di composizione ────────────────────────────────────────────────
  const runs = (testo, extra = {}) =>
    segmentaGrassetto(testo).map(seg => new TextRun({ text: seg.text, bold: seg.bold, ...extra }));

  const P = (testo, opts = {}) => {
    const { size = 20, bold, align, spacing, indent, underline, color = "1E1E1E", font = FONT_BODY, keepLines, keepNext } = opts;
    return new Paragraph({
      alignment: align,
      spacing: { after: spacing ?? 120, ...(opts.spacingBefore ? { before: opts.spacingBefore } : {}) },
      indent,
      ...(keepLines ? { keepLines: true } : {}),
      ...(keepNext ? { keepNext: true } : {}),
      children: typeof testo === "string"
        ? runs(testo, { size, bold, underline: underline ? {} : undefined, color, font })
        : testo,
    });
  };

  const Bullet = (testo, opts = {}) =>
    new Paragraph({
      bullet: { level: opts.level ?? 0 },
      spacing: { after: opts.after ?? 80 },
      ...(opts.keepNext ? { keepNext: true } : {}),
      ...(opts.keepLines ? { keepLines: true } : {}),
      children: runs(testo, { size: opts.size ?? 20, color: "1E1E1E", font: FONT_BODY }),
    });

  // Titolo centrato + riga orizzontale, come nel modello
  const TitoloBlocco = (testo, size = 28) => ([
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 60 },
      keepNext: true,
      children: [new TextRun({ text: testo, size, color: "1E1E1E", font: FONT_BODY })],
    }),
    new Paragraph({
      spacing: { after: 180 },
      keepNext: true,
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "3C3C3C", space: 1 } },
      children: [],
    }),
  ]);

  // ── Immagini ──────────────────────────────────────────────────────────────
  const logo = s.report_logo_url ? await fetchImage(s.report_logo_url) : null;
  const coverLogo = (s.offerta_logo_url && s.offerta_logo_url !== s.report_logo_url)
    ? (await fetchImage(s.offerta_logo_url)) : logo;
  const logoSize = s.report_logo_size || "medium";
  const logoMaxW = logoSize === "small" ? 16 : logoSize === "large" ? 35 : 25;
  const logoMaxH = logoSize === "small" ? 10 : logoSize === "large" ? 20 : 14;

  const logoRun = (maxWmm, maxHmm) => {
    if (!logo) return null;
    let w = maxWmm, h = maxWmm / logo.ratio;
    if (h > maxHmm) { h = maxHmm; w = maxHmm * logo.ratio; }
    return new ImageRun({
      type: logo.tipo,
      data: logo.bytes,
      transformation: { width: PX(w), height: PX(h) },
    });
  };

  const firmaRun = (wmm = 40) => new ImageRun({
    type: "png",
    data: dataUrlToUint8(FIRMA_STUDIO_PNG),
    transformation: { width: PX(wmm), height: PX(wmm / FIRMA_STUDIO_RATIO) },
  });

  // ── Intestazione e piè di pagina ──────────────────────────────────────────
  const headerDefault = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: logoRun(logoMaxW, logoMaxH) ? [logoRun(logoMaxW, logoMaxH)] : [],
      }),
    ],
  });

  const fLeft   = s.report_footer_left   || "";
  const fCenter = s.report_footer_center || "";
  const fRight  = s.report_footer_right  || "";
  const usaFallback = !fLeft && !fCenter && !fRight;

  const righeFooter = () => {
    if (usaFallback) {
      const nome = s.report_header_name || s.name || STUDIO_NOME;
      return [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `${nome} — Offerta di prestazioni professionali`, size: 15, color: "8C8C8C", font: fontFooter })],
      })];
    }
    const L = fLeft.split("\n"), C = fCenter.split("\n"), R = fRight.split("\n");
    const n = Math.max(L.length, C.length, R.length);
    const larghezza = MM(210 - 40);
    const out = [];
    for (let i = 0; i < n; i++) {
      const children = [];
      const push = (txt) => children.push(new TextRun({ text: txt, size: 15, color: "8C8C8C", font: fontFooter }));
      push(L[i] || "");
      children.push(new TextRun({ children: [new D.Tab()] }));
      push((C[i] || "").replace(/\{pagina\}/g, "").replace(/\{totale\}/g, ""));
      children.push(new TextRun({ children: [new D.Tab()] }));
      push((R[i] || "").replace(/\{pagina\}/g, "").replace(/\{totale\}/g, ""));
      out.push(new Paragraph({
        tabStops: [
          { type: TabStopType.CENTER, position: larghezza / 2 },
          { type: TabStopType.RIGHT,  position: larghezza },
        ],
        children,
      }));
    }
    return out;
  };

  const footerDefault = new Footer({
    children: [
      // Piè di pagina senza linea di separazione: solo il testo.
      ...righeFooter(),
    ],
  });

  // ── Corpo del documento ───────────────────────────────────────────────────
  const body = [];
  const dest = cfg.destinatario || {};

  // Copertina
  if (cfg.copertina) {
    for (let i = 0; i < 6; i++) body.push(new Paragraph({ children: [] }));
    if (coverLogo) {
      let cw = 110, ch = 110 / coverLogo.ratio;
      if (ch > 50) { ch = 50; cw = 50 * coverLogo.ratio; }
      body.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        children: [new ImageRun({ type: coverLogo.tipo, data: coverLogo.bytes, transformation: { width: PX(cw), height: PX(ch) } })],
      }));
    }
    const coverNome = offerta?.cliente || dest.nome; // in copertina sempre il Cliente
    if (coverNome)      body.push(P(coverNome,      { align: AlignmentType.CENTER, size: 26, spacing: 60 }));
    if (dest.indirizzo) body.push(P(dest.indirizzo, { align: AlignmentType.CENTER, size: 26, spacing: 60 }));
    body.push(new Paragraph({
      spacing: { before: 120, after: 240 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1E1E1E", space: 1 } },
      children: [],
    }));
    body.push(P(offerta?.numero_offerta || "", { align: AlignmentType.CENTER, size: 26, spacing: 60 }));
    body.push(P(TESTI.copertinaSottotitolo,     { align: AlignmentType.CENTER, size: 26 }));
    body.push(new Paragraph({ pageBreakBefore: true, children: [] }));
  }

  // Lettera di accompagnamento
  body.push(P(`${cfg.luogo || "Milano"} lì, ${dataEstesa(cfg.data)}`, { align: AlignmentType.RIGHT, size: 21, spacing: 300 }));

  body.push(new Paragraph({
    spacing: { after: 60 },
    children: runs(`${offerta?.numero_offerta || "OFF."} PRESTAZIONI PROFESSIONALI PER ${(cfg.oggettoIncarico || "").toUpperCase()}`, { size: 21, font: FONT_BODY }),
  }));
  body.push(new Paragraph({
    spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "3C3C3C", space: 1 } },
    children: [],
  }));

  body.push(P(TESTI.oggetto, { spacing: 240 }));
  body.push(P(`${dest.appellativo || "Spettabile"} ${dest.nome || ""},`, { spacing: 240 }));

  const _cf = (dest.cf || "").trim(), _piva = (dest.piva || "").trim();
  const _cfPivaUguali = _cf && _piva && _cf === _piva;
  const dettagli = [
    dest.sede ? `con sede in ${dest.sede}` : null,
    _cfPivaUguali ? `C.F. e P.IVA ${_cf}` : (_cf ? `C.F. ${_cf}` : null),
    _cfPivaUguali ? null : (_piva ? `P.IVA ${_piva}` : null),
  ].filter(Boolean).join(", ");
  body.push(P(`circa la manifestata necessità ${cfg.necessita || ""}${dettagli ? ", " + dettagli : ""}, si inoltra nostra miglior offerta per le competenze richieste.`, { spacing: 240 }));
  body.push(P(TESTI.saluti, { spacing: 240 }));
  body.push(P(STUDIO_NOME, { spacing: 80 }));
  if (cfg.firma) body.push(new Paragraph({ spacing: { after: 200 }, children: [firmaRun(40)] }));

  // Struttura dell'offerta
  body.push(new Paragraph({
    pageBreakBefore: true,
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: TESTI.strutturaTitolo, size: 32, color: "1E1E1E", font: FONT_BODY })],
  }));
  body.push(new Paragraph({
    spacing: { after: 240 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "3C3C3C", space: 1 } },
    children: [],
  }));

  if (cfg.inquadramento?.attivo) {
    body.push(P(INQUADRAMENTO.titolo, { size: 22, bold: true, underline: true, spacing: 120 }));
    body.push(P((cfg.inquadramento.testoLibero || "").trim() || compilaTesto(INQUADRAMENTO.testo, cfg.inquadramento.campi), { spacing: 240 }));
  }

  sezioniAttive(cfg, tpl).forEach((sez) => {
    body.push(P(`(${sez.lettera}) ${sez.titolo}`, { size: 21, bold: true, underline: true, spacing: 120, spacingBefore: 200 }));

    vociAttive(sez, cfg).forEach((gruppo) => {
      if (gruppo.label) {
        body.push(P(gruppo.label, { size: 20, underline: true, spacing: 80, indent: { left: MM(4) } }));
      }
      gruppo.voci.forEach((v) => {
        const vc = cfg.sezioni[sez.id].voci[v.id] || {};
        body.push(Bullet(compilaTesto(v.testo, vc.campi)));
        if (sez.modoPrezzo === "voci" && v.prezzo) {
          // Voci "cad.": unitario × quantità, mostrato come costo finale con "€".
          body.push(P(`€ ${numero2(importoVoce(v, vc))}`, { align: AlignmentType.RIGHT, bold: true, spacing: 140 }));
        }
      });
    });
  });

  // Blocchi di testo fisso (su nuovo foglio)
  const blocchiAttivi = BLOCCHI_FISSI.filter(b => cfg.blocchi?.[b.id]);
  if (blocchiAttivi.length > 0) {
    body.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    blocchiAttivi.forEach((b) => {
      // Titolo e contenuto restano uniti (keepNext a catena): l'intero blocco
      // va a pagina nuova insieme se non entra, mai spezzato su due pagine.
      TitoloBlocco(b.titolo).forEach(p => body.push(p));
      const paras = b.paragrafi || [];
      const els = b.elenco || [];
      paras.forEach((p, i) => {
        const ultimo = i === paras.length - 1 && els.length === 0;
        body.push(P(p, { spacing: 140, keepLines: true, keepNext: !ultimo }));
      });
      els.forEach((v, i) => {
        body.push(Bullet(v, { keepLines: true, keepNext: i !== els.length - 1 }));
      });
    });
  }

  // Compensi e oneri (su nuovo foglio)
  body.push(new Paragraph({ pageBreakBefore: true, children: [] }));
  TitoloBlocco(TESTI.compensiTitolo).forEach(p => body.push(p));

  const bordoRiga = {
    ...NESSUN_BORDO,
    bottom: { style: BorderStyle.SINGLE, size: 3, color: "D2D2D2" },
  };
  const cella = (children, width, align) => new TableCell({
    borders: bordoRiga,
    width: { size: width, type: WidthType.PERCENTAGE },
    margins: { top: 70, bottom: 70, left: 40, right: 40 },
    children: [new Paragraph({ alignment: align, children })],
  });

  const righeTabella = tot.righe.map(r => new TableRow({
    children: [
      cella([new TextRun({ text: `(${r.lettera})`, size: 16, font: FONT_BODY })], 9),
      cella([new TextRun({ text: r.titolo, size: 20, font: FONT_BODY })], 70),
      cella([new TextRun({ text: euroSimbolo(r.importo), size: 20, font: FONT_BODY })], 21, AlignmentType.RIGHT),
    ],
  }));

  const bordoTotale = {
    ...NESSUN_BORDO,
    top: { style: BorderStyle.SINGLE, size: 8, color: "3C3C3C" },
  };
  const cellaTot = (children, width, align) => new TableCell({
    borders: bordoTotale,
    width: { size: width, type: WidthType.PERCENTAGE },
    margins: { top: 70, bottom: 70, left: 40, right: 40 },
    children: [new Paragraph({ alignment: align, children })],
  });

  righeTabella.push(new TableRow({
    children: [
      cellaTot([], 9),
      cellaTot([new TextRun({ text: TESTI.totaleLabel, size: 20, font: FONT_BODY })], 70),
      cellaTot([new TextRun({ text: euroSimbolo(tot.lordo), size: 20, font: FONT_BODY })], 21, AlignmentType.RIGHT),
    ],
  }));

  body.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [MM(14), MM(120), MM(36)],
    layout: "fixed",
    rows: righeTabella,
  }));
  body.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  body.push(P(`In base alle prestazioni professionali descritte ed elencate è calcolata una parcella di euro ${numero2(tot.lordo)} (${importoInLettere(tot.lordo)}).`, { spacing: 140 }));
  body.push(P(TESTI.chiusuraNonConvenuto, { spacing: 300 }));

  let etichettaTotale = TESTI.totaleLabel;
  if (tot.sconto > 0 && tot.scontoFisso > 0)
    etichettaTotale += ` a seguito di sconto ${tot.sconto}% e ${euroSimbolo(tot.scontoFisso)}`;
  else if (tot.sconto > 0)      etichettaTotale += ` a seguito di sconto ${tot.sconto}%`;
  else if (tot.scontoFisso > 0) etichettaTotale += ` con sconto dedicato di ${euroSimbolo(tot.scontoFisso)}`;

  body.push(new Paragraph({
    spacing: { after: 300 },
    children: [
      new TextRun({ text: `${etichettaTotale}: `, size: 21, font: FONT_BODY, color: "1E1E1E" }),
      new TextRun({ text: `${euroSimbolo(tot.totale)} (${importoInLettere(tot.totale)})`, size: 21, bold: true, font: FONT_BODY, color: "1E1E1E" }),
      new TextRun({ text: " esclusi oneri fiscali e contributi integrativi.", size: 21, font: FONT_BODY, color: "1E1E1E" }),
    ],
  }));

  // Modalità di pagamento
  const opzioni = MODALITA_PAGAMENTO.filter(o => (cfg.pagamento?.opzioni || []).includes(o.id));
  if (opzioni.length > 0 || cfg.pagamento?.testoLibero) {
    TitoloBlocco(TESTI.pagamentiTitolo).forEach(p => body.push(p));
    opzioni.forEach(o => body.push(Bullet(o.rate ? testoRateC(cfg.pagamento?.rateC) : o.testo)));
    if (cfg.pagamento?.testoLibero) body.push(P(cfg.pagamento.testoLibero, { spacing: 140 }));
    body.push(P(PAGAMENTO_CHIUSURA, { spacing: 300, spacingBefore: 200 }));
  }

  // Accettazione
  body.push(P(TESTI.accettazione, { size: 21, bold: true, spacing: 160 }));
  body.push(new Paragraph({
    tabStops: [{ type: TabStopType.LEFT, position: MM(85) }],
    spacing: { after: 80 },
    children: [
      new TextRun({ text: TESTI.accettazioneSx, size: 20, font: FONT_BODY }),
      new TextRun({ children: [new D.Tab()] }),
      new TextRun({ text: TESTI.accettazioneDx, size: 20, font: FONT_BODY }),
    ],
  }));
  if (cfg.firma) {
    body.push(new Paragraph({
      tabStops: [{ type: TabStopType.LEFT, position: MM(85) }],
      children: [new TextRun({ children: [new D.Tab()] }), firmaRun(40)],
    }));
  }

  // ── Documento ─────────────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT_BODY, size: 20, color: "1E1E1E" } },
      },
    },
    sections: [{
      properties: {
        titlePage: !!cfg.copertina,
        page: {
          size: { width: MM(210), height: MM(297) },
          margin: { top: MM(18), bottom: MM(20), left: MM(20), right: MM(20), header: MM(10), footer: MM(10) },
        },
      },
      headers: { default: headerDefault, first: new Header({ children: [new Paragraph({ children: [] })] }) },
      footers: { default: footerDefault, first: footerDefault },
      children: body,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const nomeFile = `${(offerta?.numero_offerta || "offerta").replace(/[^a-zA-Z0-9_\-. ]/g, "")} - ${(offerta?.nome_offerta || "").replace(/[^a-zA-Z0-9_\-. ]/g, "")}`.trim() || "offerta";

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${nomeFile}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
