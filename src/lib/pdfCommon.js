// ─────────────────────────────────────────────────────────────────────────────
// Helper condivisi per i PDF generati con jsPDF: caricamento immagini, font
// Groteska, intestazione e piè di pagina presi dalle impostazioni Report.
// Stessa resa del Report di Cantiere (studios.report_*).
// ─────────────────────────────────────────────────────────────────────────────
import { GROTESKA_VARIANTS } from "../assets/fonts/groteskaFonts";

export const NAVY = [19, 49, 92];

// Carica un'immagine da URL come base64 passando da canvas (evita problemi CORS)
export async function urlToBase64(url, { maxPx = 1200, quality = 0.78, format = "image/jpeg" } = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
          else       { w = Math.round(w * maxPx / h); h = maxPx; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (format === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL(format, quality));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url.includes("?") ? url + "&_cb=" + Date.now() : url + "?_cb=" + Date.now();
  });
}

export async function imageSize(b64) {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight });
    i.onerror = () => res(null);
    i.src = b64;
  });
}

// Costruisce il selettore di font con le stesse regole del report:
// zona "header" usa Groteska se selezionata, zona "body" solo con lo switch attivo.
export function buildFontSetter(doc, s) {
  const footerFontKey  = s?.report_footer_font || "helvetica";
  const groteska       = GROTESKA_VARIANTS.find(g => g.key === footerFontKey);
  const headerEnabled  = !!groteska;
  const bodyEnabled    = !!(s?.report_body_font_enabled && groteska);

  const FAM = { bold:"Groteska-Bold", regular:"Groteska-Regular", book:"Groteska-Book", light:"Groteska-Light", italic:"Groteska-BookItalic" };

  const setF = (weight = "book", zone = "body") => {
    const useG = zone === "header" ? headerEnabled : bodyEnabled;
    if (useG) doc.setFont(FAM[weight] || FAM.book, weight === "italic" ? "italic" : "normal");
    else doc.setFont("helvetica", weight === "bold" ? "bold" : weight === "italic" ? "italic" : "normal");
  };

  return {
    setF,
    footerFont: groteska ? groteska.family : footerFontKey,
    footerFontStyle: groteska ? groteska.style : "normal",
  };
}

// Logo in alto a destra. Ritorna la y del bordo inferiore del logo.
export async function drawLogo(doc, s, { x2, y, scale = 1 }) {
  if (!s?.report_logo_url) return y;
  const b64 = await urlToBase64(s.report_logo_url, { maxPx: 600, format: "image/png" });
  if (!b64) return y;
  const dim = await imageSize(b64);
  if (!dim) return y;
  const size = s?.report_logo_size || "medium";
  const maxW = (size === "small" ? 16 : size === "large" ? 35 : 25) * scale;
  const maxH = (size === "small" ? 10 : size === "large" ? 20 : 14) * scale;
  const ratio = dim.w / dim.h;
  let w = maxW, h = maxW / ratio;
  if (h > maxH) { h = maxH; w = maxH * ratio; }
  try { doc.addImage(b64, "PNG", x2 - w, y - 2, w, h, undefined, "FAST"); } catch { return y; }
  return y - 2 + h;
}

// Piè di pagina su tutte le pagine, identico al report.
// skipFirst: non disegna il footer sulla pagina 1 (usato quando non serve).
export function drawFooters(doc, s, { ml, mr, W, pageH, footerH, footerFont, footerFontStyle, fallbackTitle = "" }) {
  const fLeft   = s?.report_footer_left   || "";
  const fCenter = s?.report_footer_center || "";
  const fRight  = s?.report_footer_right  || "";
  const tot = doc.getNumberOfPages();

  for (let i = 1; i <= tot; i++) {
    doc.setPage(i);
    const fy = pageH - footerH;
    doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
    doc.line(ml, fy, W - mr, fy);
    doc.setFont(footerFont, footerFontStyle); doc.setFontSize(7.5); doc.setTextColor(140, 140, 140);

    const replace = (str) => String(str).replace(/\{pagina\}/g, i).replace(/\{totale\}/g, tot);
    const draw = (text, x, align) =>
      replace(text).split("\n").forEach((line, li) => doc.text(line, x, fy + 5 + li * 4, { align }));

    if (fLeft)   draw(fLeft,   ml,     "left");
    if (fCenter) draw(fCenter, W / 2,  "center");
    if (fRight)  draw(fRight,  W - mr, "right");

    if (!fLeft && !fCenter && !fRight) {
      const fn = s?.report_header_name ?? s?.name ?? "";
      doc.text(`${fn}${fn ? " — " : ""}${fallbackTitle}`, ml, fy + 5);
      doc.text(`Pagina ${i} di ${tot}`, W - mr, fy + 5, { align: "right" });
    }
  }
}
