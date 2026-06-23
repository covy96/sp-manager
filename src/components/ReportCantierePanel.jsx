import { useEffect, useState, useCallback, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { registerGroteskaFonts, GROTESKA_VARIANTS } from "../assets/fonts/groteskaFonts";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useEscKey } from "../hooks/useEscKey";
import { handleListKeyDown } from "../lib/listKeyDown";
import { useStudio } from "../hooks/useStudio";

// Registra i font Groteska globalmente (una volta sola)
registerGroteskaFonts();

// ── helpers ──────────────────────────────────────────────────────────────────
const FL = ({ children, required }) => {
  const { T } = useTheme();
  return (
    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:5 }}>
      {children}{required && <span style={{ color:'#ef4444', marginLeft:2 }}>*</span>}
    </div>
  );
};

const inputCss = (T) => ({
  width:'100%', padding:'7px 10px', boxSizing:'border-box',
  border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink,
  fontSize:12, fontFamily:"'Space Grotesk', sans-serif", outline:'none',
});

const Btn = ({ children, onClick, disabled, ghost, danger, style={} }) => {
  const { T } = useTheme();
  if (ghost) return (
    <button onClick={onClick} disabled={disabled} style={{
      background:'transparent', border:`0.5px solid ${danger ? '#ef4444' : T.borderMd}`, borderRadius: T.radiusSm,
      color: danger ? '#ef4444' : T.ink,
      fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em',
      textTransform:'uppercase', padding:'8px 18px', cursor:disabled?'not-allowed':'pointer',
      opacity:disabled?0.5:1, ...style,
    }}>{children}</button>
  );
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:T.navy, color:T.bg, border:'none',
      fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase',
      padding:'8px 18px', cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.6:1, ...style,
    }}>{children}</button>
  );
};

// Datetime helpers
const toInputDt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromInputDt = (v) => v ? new Date(v).toISOString() : new Date().toISOString();
const formatDt = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("it-IT", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
};

// Comprime un File immagine prima dell'upload (max 1800px, qualità 0.82)
async function compressImage(file, maxPx = 1800, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > maxPx || h > maxPx) {
        if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
        else       { w = Math.round(w * maxPx / h); h = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => resolve(blob || file), "image/jpeg", quality);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
}

// Carica un'immagine da URL come base64 (per jsPDF)
// Usa canvas per evitare problemi CORS con Supabase Storage
async function urlToBase64(url, { maxPx = 1200, quality = 0.78, format = "image/jpeg" } = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        let w = img.naturalWidth  || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
          else       { w = Math.round(w * maxPx / h); h = maxPx; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (format === "image/jpeg") {
          // sfondo bianco: il JPEG non supporta trasparenza
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL(format, quality));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    // Cache-bust per forzare il re-fetch con crossOrigin
    img.src = url.includes("?") ? url + "&_cb=" + Date.now() : url + "?_cb=" + Date.now();
  });
}

// ── PDF generator ─────────────────────────────────────────────────────────────
// Usa lo snapshot salvato nel report se disponibile, altrimenti le impostazioni correnti
async function generatePdf({ report, project, studio, fotos = [] }) {
  const s = report.header_snapshot ? { ...studio, ...report.header_snapshot } : studio;
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W = 210, ml = 20, mr = 20, cw = W - ml - mr;
  const PAGE_H = 297, FOOTER_H = 15;
  const maxY = PAGE_H - FOOTER_H - 10;
  let y = 18;

  // ── Font setup ───────────────────────────────────────────────────
  const footerFontKey  = s?.report_footer_font || "helvetica";
  const groteskaFooter = GROTESKA_VARIANTS.find(g => g.key === footerFontKey);
  const footerFont      = groteskaFooter ? groteskaFooter.family : footerFontKey;
  const footerFontStyle = groteskaFooter ? groteskaFooter.style  : "normal";

  // Header usa sempre Groteska se selezionato; body solo se switch attivo
  const headerEnabled = !!groteskaFooter;
  const bodyEnabled   = s?.report_body_font_enabled && groteskaFooter;
  // Mappa: peso → nome font Groteska
  const gBold    = "Groteska-Bold";
  const gRegular = "Groteska-Regular";
  const gBook    = "Groteska-Book";
  const gLight   = "Groteska-Light";
  // Helper: imposta font (usa Groteska se bodyEnabled, altrimenti helvetica)
  // setF(weight, zone) — zone: "header" usa sempre Groteska se selezionato
  //                                   "body" usa Groteska solo se switch attivo
  const setF = (weight, zone="body") => {
    const useG = zone === "header" ? headerEnabled : bodyEnabled;
    if (useG) {
      const fam = weight === "bold" ? gBold : weight === "regular" ? gRegular : weight === "book" ? gBook : gLight;
      doc.setFont(fam, "normal");
    } else {
      doc.setFont("helvetica", weight === "bold" ? "bold" : "normal");
    }
  };

  // ── Logo (destra) ─────────────────────────────────────────────────
  let logoBottomY = y;
  if (s?.report_logo_url) {
    const b64 = await urlToBase64(s.report_logo_url, { maxPx: 600, format: "image/png" });
    if (b64) {
      try {
        const imgEl = await new Promise(res => {
          const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null);
          i.src = b64;
        });
        if (imgEl) {
          // Dimensione logo in base all'impostazione (default: medio = 25mm)
          const logoSize = s?.report_logo_size || "medium";
          const maxW = logoSize === "small" ? 16 : logoSize === "large" ? 35 : 25;
          const maxH = logoSize === "small" ? 10 : logoSize === "large" ? 20 : 14;
          const ratio = imgEl.naturalWidth / imgEl.naturalHeight;
          let w = maxW, h = maxW / ratio;
          if (h > maxH) { h = maxH; w = maxH * ratio; }
          doc.addImage(b64, "PNG", W - mr - w, y - 2, w, h, undefined, "FAST");
          logoBottomY = y - 2 + h;
        }
      } catch {}
    }
  }

  // ── Nome studio + testo intestazione (sinistra) ──────────────────
  setF("bold","header"); doc.setFontSize(13); doc.setTextColor(19, 49, 92);
  const headerName = s?.report_header_name ?? "";
  if (headerName) { doc.text(headerName, ml, y); y += 5; }

  const headerText = s?.report_header_text?.trim() || "";
  if (headerText) {
    setF("light","header"); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80);
    const maxTextW = s?.report_logo_url ? cw - 50 : cw;
    doc.splitTextToSize(headerText, maxTextW).forEach(line => { doc.text(line, ml, y); y += 4.5; });
  }

  // La linea scende sotto il punto più basso tra testo e logo
  y = Math.max(y + 3, logoBottomY + 4);
  doc.setDrawColor(19, 49, 92);
  doc.setLineWidth(0.5);
  doc.line(ml, y, W - mr, y);
  y += 10;

  // ── Titolo PDF ───────────────────────────────────────────────────
  const pdfTitle = (report.titolo || "Report di Cantiere").toUpperCase();
  setF("bold","header"); doc.setFontSize(15); doc.setTextColor(19, 49, 92);
  doc.text(pdfTitle, W / 2, y, { align:"center" });
  y += 12;

  // ── Metadati ─────────────────────────────────────────────────────
  const meta = [
    ["Progetto",       project?.name || "—"],
    ["Committente",    project?.client || "—"],
    ["Luogo",          report.luogo || project?.address || "—"],
    ["Data e ora",     formatDt(report.data_ora)],
    ["Sopralluogo N.", String(report.numero)],
  ];
  doc.setFontSize(9.5); doc.setTextColor(30, 30, 30);
  meta.forEach(([k, v]) => {
    setF("regular"); doc.text(`${k}:`, ml, y);
    setF("book");    doc.text(v, ml + 38, y);
    y += 6;
  });
  y += 4;

  // ── Tabella presenti — stile minimal ─────────────────────────────
  const presenti = Array.isArray(report.presenti) ? report.presenti : [];
  if (presenti.length > 0) {
    const tblFont  = bodyEnabled   ? gBook    : "helvetica";
    const tblLFont = headerEnabled ? gRegular : "helvetica"; // etichette colonna
    autoTable(doc, {
      startY: y,
      theme: "plain",
      margin: { left: ml, right: mr },
      head: [["FIGURA", "AZIENDA / REFERENTE", "EMAIL", "TELEFONO"]],
      body: presenti.map(p => [
        p.figura || "—",
        [p.azienda, p.referente].filter(Boolean).join(" / ") || "—",
        p.email || "—",
        p.telefono || "—",
      ]),
      headStyles: {
        font: tblLFont,
        fontStyle: "normal",
        fontSize: 7,
        textColor: [160, 160, 160],
        cellPadding: { top: 3, bottom: 5, left: 2, right: 2 },
        lineWidth: { bottom: 0.4 },
        lineColor: [200, 200, 200],
      },
      bodyStyles: {
        font: tblFont,
        fontStyle: "normal",
        fontSize: 9,
        textColor: [30, 30, 30],
        cellPadding: { top: 5, bottom: 5, left: 2, right: 2 },
        lineWidth: { bottom: 0.2 },
        lineColor: [230, 230, 230],
      },
      alternateRowStyles: {},   // nessun riempimento alternato
      tableLineWidth: 0,        // nessun bordo esterno
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── Contenuto ────────────────────────────────────────────────────
  const newPageIfNeeded = (neededH = 6) => {
    if (y + neededH > maxY) { doc.addPage(); y = 20; return true; }
    return false;
  };

  if (report.contenuto?.trim()) {
    newPageIfNeeded(14);
    setF("regular"); doc.setFontSize(9); doc.setTextColor(19, 49, 92);
    doc.text("REPORT", ml, y);
    y += 5;
    setF("book"); doc.setFontSize(9.5); doc.setTextColor(30, 30, 30);
    doc.splitTextToSize(report.contenuto, cw).forEach(line => {
      newPageIfNeeded(6);
      doc.text(line, ml, y); y += 5.5;
    });
  }

  // ── Foto ──────────────────────────────────────────────────────────
  // Pagine libere (nessun testo): orizzontali 2 per pagina affiancate,
  //   verticali 2 per riga e max 4 per pagina (2 righe).
  // Con testo: orizzontali larghezza piena, verticali 2 per riga.
  if (fotos.length > 0) {
    newPageIfNeeded(20);
    y += 6;
    setF("regular","header"); doc.setFontSize(9); doc.setTextColor(19, 49, 92);
    doc.text("FOTO", ml, y);
    y += 6;

    const loaded = await Promise.all(fotos.map(async f => {
      const b64 = await urlToBase64(f.url);
      if (!b64) return null;
      const dims = await new Promise(res => {
        const i = new Image();
        i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight });
        i.onerror = () => res(null);
        i.src = b64;
      });
      return { b64, dims };
    }));

    const gapX = 6;
    const items = loaded.filter(Boolean);
    const hasContent = !!report.contenuto?.trim();

    const renderOne = (b64, x, w, h) => {
      if (b64) { try { doc.addImage(b64, "JPEG", x, y, w, h, undefined, "FAST"); } catch {} }
      else { doc.setDrawColor(220,220,220); doc.setLineWidth(0.3); doc.rect(x, y, w, h); }
    };

    if (!hasContent) {
      // ── PAGINE LIBERE ──
      // Orizzontali: 2 affiancate per pagina
      // Verticali: 2 per riga, 4 per pagina (2 righe)
      let i = 0;
      let portraitRowsOnPage = 0;

      while (i < items.length) {
        const cur = items[i];
        const isLandscape = cur.dims.w >= cur.dims.h;

        if (isLandscape) {
          portraitRowsOnPage = 0;
          const next = items[i + 1];
          const nextIsLandscape = next && next.dims.w >= next.dims.h;

          if (nextIsLandscape) {
            // 2 orizzontali affiancate
            const w = (cw - gapX) / 2;
            const h1 = w * (cur.dims.h / cur.dims.w);
            const h2 = w * (next.dims.h / next.dims.w);
            const rowH = Math.max(h1, h2);
            newPageIfNeeded(rowH + 5);
            renderOne(cur.b64, ml, w, h1);
            renderOne(next.b64, ml + w + gapX, w, h2);
            y += rowH + 5;
            i += 2;
          } else {
            // Orizzontale sola: larghezza piena
            const h = cw * (cur.dims.h / cur.dims.w);
            newPageIfNeeded(h + 5);
            renderOne(cur.b64, ml, cw, h);
            y += h + 5;
            i++;
          }
        } else {
          // Verticale: 2 per riga, poi controlla limite pagina
          const next = items[i + 1];
          const nextIsPortrait = next && next.dims.w < next.dims.h;
          const w = (cw - gapX) / 2;

          if (nextIsPortrait) {
            const hL = w * (cur.dims.h / cur.dims.w);
            const hR = w * (next.dims.h / next.dims.w);
            const rowH = Math.max(hL, hR);
            newPageIfNeeded(rowH + 5);
            renderOne(cur.b64, ml, w, hL);
            renderOne(next.b64, ml + w + gapX, w, hR);
            y += rowH + 5;
            i += 2;
          } else {
            // Verticale sola (ultima o seguita da orizzontale)
            const h = w * (cur.dims.h / cur.dims.w);
            newPageIfNeeded(h + 5);
            renderOne(cur.b64, ml, w, h);
            y += h + 5;
            i++;
          }
          portraitRowsOnPage++;
          // Dopo 2 righe di verticali (4 foto), nuova pagina
          if (portraitRowsOnPage >= 2 && i < items.length) {
            doc.addPage(); y = 20;
            portraitRowsOnPage = 0;
          }
        }
      }
    } else {
      // ── CON TESTO ──
      // Orizzontali: larghezza piena (1 per riga)
      // Verticali: 2 per riga
      let pendingPortrait = null;

      const flushPending = () => {
        if (!pendingPortrait) return;
        const w = (cw - gapX) / 2;
        const h = w * (pendingPortrait.dims.h / pendingPortrait.dims.w);
        newPageIfNeeded(h + 5);
        renderOne(pendingPortrait.b64, ml, w, h);
        y += h + 5;
        pendingPortrait = null;
      };

      for (const { b64, dims } of items) {
        const isLandscape = dims.w >= dims.h;
        if (isLandscape) {
          flushPending();
          const h = cw * (dims.h / dims.w);
          newPageIfNeeded(h + 5);
          renderOne(b64, ml, cw, h);
          y += h + 5;
        } else {
          if (pendingPortrait) {
            const w = (cw - gapX) / 2;
            const hL = w * (pendingPortrait.dims.h / pendingPortrait.dims.w);
            const hR = w * (dims.h / dims.w);
            const rowH = Math.max(hL, hR);
            newPageIfNeeded(rowH + 5);
            renderOne(pendingPortrait.b64, ml, w, hL);
            renderOne(b64, ml + w + gapX, w, hR);
            y += rowH + 5;
            pendingPortrait = null;
          } else {
            pendingPortrait = { b64, dims };
          }
        }
      }
      flushPending();
    }
  }

  // ── Footer personalizzato su ogni pagina ──────────────────────────
  const fLeft   = s?.report_footer_left   || "";
  const fCenter = s?.report_footer_center || "";
  const fRight  = s?.report_footer_right  || "";
  const tot = doc.getNumberOfPages();

  for (let i = 1; i <= tot; i++) {
    doc.setPage(i);
    const fy = PAGE_H - FOOTER_H;
    doc.setDrawColor(200,200,200); doc.setLineWidth(0.3);
    doc.line(ml, fy, W - mr, fy);
    doc.setFont(footerFont, footerFontStyle); doc.setFontSize(7.5); doc.setTextColor(140,140,140);

    // Sostituisce {pagina} e {totale} e gestisce i ritorni a capo
    const replace = (str) => str.replace(/\{pagina\}/g, i).replace(/\{totale\}/g, tot);
    const drawFooterLines = (text, x, align) => {
      const lines = replace(text).split("\n");
      lines.forEach((line, li) => doc.text(line, x, fy + 5 + li * 4, { align }));
    };

    if (fLeft)   drawFooterLines(fLeft,   ml,      "left");
    if (fCenter) drawFooterLines(fCenter, W / 2,   "center");
    if (fRight)  drawFooterLines(fRight,  W - mr,  "right");

    // Fallback se tutti e tre vuoti
    if (!fLeft && !fCenter && !fRight) {
      const fn = s?.report_header_name ?? s?.name ?? "";
      doc.text(`${fn}${fn ? " — " : ""}Report di Cantiere`, ml, fy + 5);
      doc.text(`Pagina ${i} di ${tot}`, W - mr, fy + 5, { align:"right" });
    }
  }

  const safeTitle = (report.titolo || "report").replace(/[^a-zA-Z0-9_\-\. ]/g,"").trim() || "report";
  doc.save(`${safeTitle}.pdf`);
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
const emptyForm = (address = "") => ({
  nome_interno: "",
  titolo: "",
  luogo: address,
  data_ora: new Date().toISOString(),
  contenuto: "",
  presenti: [],
});

export default function ReportCantierePanel({ projectId, studioId, canManage = false }) {
  const { T } = useTheme();
  const inputSt = inputCss(T);
  const fileRef = useRef(null);
  const { teamMember } = useStudio();

  const [open, setOpen]       = useState(false);
  useBodyScrollLock(open);
  // "list" | "form" | "header" | "preview"
  const [view, setView]           = useState("list");
  const viewRef = useRef("list");
  const setViewTracked = (v) => { viewRef.current = v; setView(v); };
  useEscKey(() => {
    if (viewRef.current !== "list") {
      setViewTracked("list"); setEditingId(null); setPreviewReport(null);
    } else {
      setOpen(false); setViewTracked("list"); setEditingId(null); setPreviewReport(null);
    }
  }, open);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [studio, setStudio]   = useState(null);
  const [contacts, setContacts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [previewReport, setPreviewReport] = useState(null); // report selezionato per anteprima
  const [previewFotos, setPreviewFotos]   = useState([]);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk]       = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  // Header + footer settings
  const [headerForm, setHeaderForm]   = useState({
    report_header_name:"",
    report_header_text:"", report_logo_url:"", report_logo_size:"medium",
    report_footer_left:"", report_footer_center:"", report_footer_right:"",
    report_footer_font:"helvetica",
    report_body_font_enabled: false,
  });
  const [savingHeader, setSavingHeader] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [headerMsg, setHeaderMsg]     = useState("");
  const [confirmUpdateAll, setConfirmUpdateAll] = useState(false);

  // ── Foto ─────────────────────────────────────────────────────────
  const [fotos, setFotos]           = useState([]);   // { id, url, ordine }
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamDropOpen, setTeamDropOpen] = useState(false);

  // ── load ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!projectId || !studioId) return;
    setLoading(true);
    const [{ data:reps }, { data:proj }, { data:st }, { data:ctc }, { data:members }] = await Promise.all([
      supabase.from("report_cantiere").select("*").eq("project_id", projectId).is("deleted_at",null).order("numero",{ascending:false}),
      supabase.from("projects").select("id,name,client,address").eq("id",projectId).single(),
      supabase.from("studios").select("name,indirizzo,città,cap,piva,report_header_name,report_header_text,report_logo_url,report_logo_size,report_footer_left,report_footer_center,report_footer_right,report_footer_font,report_body_font_enabled").eq("id",studioId).single(),
      supabase.from("project_contacts").select("*, global_contacts(*)").eq("project_id",projectId),
      supabase.from("team_members").select("id,user_name,user_email,role_internal").eq("studio",studioId).order("user_name",{ascending:true}),
    ]);
    setTeamMembers(members || []);
    setReports(reps || []);
    setProject(proj);
    setStudio(st);
    setContacts(ctc || []);
    setHeaderForm({
      report_header_name:   st?.report_header_name   ?? "",
      report_header_text:   st?.report_header_text   || "",
      report_logo_url:      st?.report_logo_url      || "",
      report_logo_size:     st?.report_logo_size     || "medium",
      report_footer_left:   st?.report_footer_left   || "",
      report_footer_center: st?.report_footer_center || "",
      report_footer_right:  st?.report_footer_right  || "",
      report_footer_font:        st?.report_footer_font        || "helvetica",
      report_body_font_enabled:  st?.report_body_font_enabled  ?? false,
    });
    setLoading(false);
  }, [projectId, studioId]);

  // Carica il conteggio subito (per mostrare badge nel pulsante)
  useEffect(() => {
    if (!projectId || !studioId) return;
    supabase.from("report_cantiere").select("id", { count:"exact", head:true }).eq("project_id", projectId).is("deleted_at", null)
      .then(({ count }) => { if (count != null) setReports(Array(count).fill({})); });
  }, [projectId, studioId]);

  // Carica tutto quando si apre il modal
  useEffect(() => { if (open) load(); }, [open, load]);

  const loadFotos = async (reportId) => {
    const { data } = await supabase.from("report_cantiere_foto")
      .select("*").eq("report_id", reportId).order("ordine", { ascending:true });
    setFotos(data || []);
  };

  // ── anteprima report ─────────────────────────────────────────────
  const openPreview = async (r) => {
    setPreviewReport(r);
    const { data } = await supabase.from("report_cantiere_foto")
      .select("*").eq("report_id", r.id).order("ordine", { ascending:true });
    setPreviewFotos(data || []);
    setViewTracked("preview");
  };

  // ── nuovo report ─────────────────────────────────────────────────
  const openNew = () => {
    const nextNum = (reports[0]?.numero ?? 0) + 1;
    const base = emptyForm(project?.address || "");

    // Voce DL: sempre il membro che sta aprendo il report, con dati dello studio
    const dlEntry = {
      figura:    "Direttore Lavori",
      azienda:   studio?.report_header_name || studio?.name || "",
      referente: teamMember?.user_name || teamMember?.user_email || "",
      email:     teamMember?.user_email || "",
      telefono:  "",
    };

    // Contatti anagrafica correnti → mappa per confronto
    const anagraficaPresenti = contacts.map(pc => {
      const gc = pc.global_contacts || {};
      return { figura: pc.professional_role || "—", azienda: gc.company || "", referente: gc.full_name || "", email: gc.email || "", telefono: gc.phone || "" };
    });

    if (reports.length > 0) {
      // Report successivi: riprendi i presenti dall'ultimo report
      const lastPresenti = Array.isArray(reports[0]?.presenti) ? reports[0].presenti : [];
      // Aggiorna (o aggiungi) la voce DL in cima
      const withoutDL = lastPresenti.filter(p =>
        !(p.figura === "Direttore Lavori" && (p.azienda === dlEntry.azienda || p.referente === dlEntry.referente))
      );
      // Aggiungi contatti anagrafica che non sono già presenti (confronto per nome referente)
      const existingNames = new Set(withoutDL.map(p => (p.referente || "").toLowerCase().trim()));
      const nuovi = anagraficaPresenti.filter(p => !existingNames.has((p.referente || "").toLowerCase().trim()));
      base.presenti = [dlEntry, ...withoutDL, ...nuovi];
    } else {
      // Primo report: DL + contatti progetto
      base.presenti = [dlEntry, ...anagraficaPresenti];
    }

    setForm({ ...base, _numero:nextNum });
    setEditingId(null); setSaveError(""); setSaveOk(false); setFotos([]); setViewTracked("form");
  };

  const openEdit = (r) => {
    setForm({
      nome_interno: r.nome_interno || "",
      titolo:       r.titolo,
      luogo:        r.luogo,
      data_ora:     r.data_ora,
      contenuto:    r.contenuto,
      presenti:     Array.isArray(r.presenti) ? r.presenti : [],
      _numero:      r.numero,
    });
    setEditingId(r.id); setSaveError(""); setViewTracked("form");
    loadFotos(r.id);
  };

  // ── salva report ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nome_interno.trim() && !form.titolo.trim()) return;
    setSaving(true); setSaveError("");
    const payload = {
      studio:       studioId,
      project_id:   projectId,
      numero:       form._numero || 1,
      nome_interno:    form.nome_interno.trim() || form.titolo.trim(),
      titolo:          form.titolo.trim() || form.nome_interno.trim(),
      luogo:           form.luogo.trim(),
      data_ora:        form.data_ora || new Date().toISOString(),
      contenuto:       form.contenuto,
      presenti:        form.presenti,
      updated_at:      new Date().toISOString(),
      // Snapshot intestazione al momento della creazione (non sovrascrivere se modifica)
      ...(editingId ? {} : { header_snapshot: {
        report_header_name:   studio?.report_header_name   ?? null,
        report_header_text:   studio?.report_header_text   ?? null,
        report_logo_url:      studio?.report_logo_url      ?? null,
        report_footer_left:   studio?.report_footer_left   ?? null,
        report_footer_center: studio?.report_footer_center ?? null,
        report_footer_right:  studio?.report_footer_right  ?? null,
        report_footer_font:   studio?.report_footer_font   ?? "helvetica",
      }}),
    };
    let err, newId = editingId;
    if (editingId) {
      ({ error:err } = await supabase.from("report_cantiere").update(payload).eq("id",editingId));
    } else {
      const { data:ins, error:insErr } = await supabase.from("report_cantiere").insert(payload).select("id").single();
      err = insErr; newId = ins?.id;
    }
    setSaving(false);
    if (err) { setSaveError(err.message); return; }

    if (!editingId && newId) {
      // Nuovo report salvato: rimani nel form in edit mode per aggiungere foto
      setEditingId(newId);
      await loadFotos(newId);
      setSaveError(""); setSaveOk(true);
      setTimeout(() => setSaveOk(false), 4000);
      load();
    } else {
      setViewTracked("list"); setEditingId(null); setFotos([]); setSaveOk(false); load();
    }
  };

  // ── elimina report + foto dallo storage ─────────────────────────
  const handleDelete = async (id) => {
    // 1. Recupera tutte le foto del report
    const { data: fotoList } = await supabase
      .from("report_cantiere_foto").select("id, url").eq("report_id", id);

    // 2. Elimina file dallo storage
    if (fotoList?.length) {
      const paths = fotoList
        .map(f => f.url.split("/report-foto/")[1]?.split("?")[0])
        .filter(Boolean);
      if (paths.length) await supabase.storage.from("report-foto").remove(paths);

      // 3. Elimina record foto dal DB
      await supabase.from("report_cantiere_foto").delete().eq("report_id", id);
    }

    // 4. Soft-delete del report
    const { error: delErr } = await supabase.rpc("elimina_report_cantiere", { p_id: id });
    if (delErr) { showToast("Errore eliminazione report: " + delErr.message); return; }
    setConfirmDel(null); load();
  };

  // ── upload foto ──────────────────────────────────────────────────
  const handleFotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !editingId) return;
    setUploadingFoto(true);
    for (const file of files) {
      // Comprimi prima dell'upload (max 1800px, ~300-500KB)
      const compressed = await compressImage(file);
      const path = `${studioId}/${editingId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error: upErr } = await supabase.storage.from("report-foto").upload(path, compressed, { contentType:"image/jpeg", upsert:false });
      if (upErr) continue;
      const { data:{ publicUrl } } = supabase.storage.from("report-foto").getPublicUrl(path);
      const { error: insErr } = await supabase.from("report_cantiere_foto").insert({
        studio: studioId, report_id: editingId,
        url: publicUrl, ordine: fotos.length,
      });
      if (insErr) showToast("Errore salvataggio foto: " + insErr.message);
    }
    await loadFotos(editingId);
    setUploadingFoto(false);
    if (fotoInputRef.current) fotoInputRef.current.value = "";
  };

  const handleFotoDelete = async (foto) => {
    const { error: delErr } = await supabase.from("report_cantiere_foto").delete().eq("id", foto.id);
    if (delErr) { showToast("Errore eliminazione foto: " + delErr.message); return; }
    const path = foto.url.split("/report-foto/")[1]?.split("?")[0];
    if (path) await supabase.storage.from("report-foto").remove([path]);
    setFotos(f => f.filter(x => x.id !== foto.id));
  };

  // ── salva intestazione ───────────────────────────────────────────
  const doSaveHeader = async (updateExisting) => {
    setSavingHeader(true); setHeaderMsg(""); setConfirmUpdateAll(false);
    const snapshot = {
      report_header_name:   headerForm.report_header_name   || null,
      report_header_text:   headerForm.report_header_text   || null,
      report_logo_url:      headerForm.report_logo_url      || null,
      report_logo_size:     headerForm.report_logo_size     || "medium",
      report_footer_left:   headerForm.report_footer_left   || null,
      report_footer_center: headerForm.report_footer_center || null,
      report_footer_right:  headerForm.report_footer_right  || null,
      report_footer_font:        headerForm.report_footer_font        || "helvetica",
      report_body_font_enabled:  headerForm.report_body_font_enabled  ?? false,
    };
    const { error } = await supabase.from("studios").update(snapshot).eq("id", studioId);
    if (error) { setSavingHeader(false); setHeaderMsg("Errore: " + error.message); return; }

    if (updateExisting) {
      // Aggiorna lo snapshot di tutti i report esistenti di questo studio
      await supabase.from("report_cantiere")
        .update({ header_snapshot: snapshot })
        .eq("studio", studioId)
        .is("deleted_at", null);
    }
    setSavingHeader(false);
    setHeaderMsg(updateExisting ? "Salvato e aggiornato su tutti i report!" : "Salvato!");
    await load();
    setTimeout(() => setHeaderMsg(""), 3000);
  };

  const handleSaveHeader = () => {
    // Se ci sono report esistenti, chiedi se aggiornarli
    if (reports.length > 0) {
      setConfirmUpdateAll(true);
    } else {
      doSaveHeader(false);
    }
  };

  // ── upload logo + auto-save ──────────────────────────────────────
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true); setHeaderMsg("");
    const ext  = file.name.split(".").pop();
    const path = `${studioId}/logo.${ext}`;
    const { error: upErr } = await supabase.storage.from("report-logos").upload(path, file, { upsert:true });
    if (upErr) { setHeaderMsg("Errore upload: " + upErr.message); setUploadingLogo(false); return; }
    const { data:{ publicUrl } } = supabase.storage.from("report-logos").getPublicUrl(path);
    const newUrl = publicUrl + "?t=" + Date.now();
    setHeaderForm(h => ({ ...h, report_logo_url: newUrl }));
    // Auto-save logo su studios
    const { error: saveErr } = await supabase.from("studios").update({ report_logo_url: newUrl }).eq("id", studioId);
    if (saveErr) { setHeaderMsg("Upload OK ma salvataggio fallito: " + saveErr.message); setUploadingLogo(false); return; }

    // Aggiorna anche gli snapshot di tutti i report esistenti (solo il logo)
    const { data: existingReports } = await supabase
      .from("report_cantiere").select("id, header_snapshot")
      .eq("studio", studioId).is("deleted_at", null);

    if (existingReports?.length) {
      await Promise.all(existingReports.map(r =>
        supabase.from("report_cantiere").update({
          header_snapshot: { ...(r.header_snapshot || {}), report_logo_url: newUrl }
        }).eq("id", r.id)
      ));
    }

    setStudio(s => ({ ...s, report_logo_url: newUrl }));
    setHeaderMsg("Logo salvato e aggiornato su tutti i report!");
    setTimeout(()=>setHeaderMsg(""), 3000);
    setUploadingLogo(false);
  };

  // ── presenti helpers ─────────────────────────────────────────────
  const updateP = (i, k, v) => setForm(f => { const a=[...f.presenti]; a[i]={...a[i],[k]:v}; return {...f,presenti:a}; });
  const addP    = ()        => setForm(f => ({ ...f, presenti:[...f.presenti, {figura:"",azienda:"",referente:"",email:"",telefono:""}] }));
  const removeP = (i)       => setForm(f => ({ ...f, presenti:f.presenti.filter((_,j)=>j!==i) }));
  const addFromTeam = (member) => {
    setTeamDropOpen(false);
    const entry = {
      figura:    "Direttore Lavori",
      azienda:   studio?.report_header_name || studio?.name || "",
      referente: member.user_name || member.user_email || "",
      email:     member.user_email || "",
      telefono:  "",
    };
    setForm(f => ({ ...f, presenti: [...f.presenti, entry] }));
  };

  // ── WIDGET ────────────────────────────────────────────────────────
  const widget = (
    <button onClick={()=>setOpen(true)} style={{
      display:'flex', alignItems:'center', gap:8,
      border:`0.5px solid ${reports.length > 0 ? T.navy : T.borderMd}`, borderRadius: T.radiusSm,
      background: reports.length > 0 ? T.navyLight : 'transparent',
      padding:'6px 12px', cursor:'pointer',
    }}>
      <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:reports.length>0?T.navy:T.muted, fontWeight:600 }}>Report</span>
      {reports.length > 0
        ? <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.navy, border:`0.5px solid ${T.navy}`, borderRadius: T.radiusSm, padding:'1px 6px' }}>{reports.length}</span>
        : <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>+ Crea</span>}
    </button>
  );

  // ── MODAL ─────────────────────────────────────────────────────────
  const modal = open && (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(14,14,13,0.55)', padding:16 }}>
      <div style={{ width:'100%', maxWidth:800, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, borderRadius:T.radiusLg, maxHeight:'92vh', overflowY:'auto', display:'flex', flexDirection:'column', boxShadow:T.shadowLg }}>

        {/* ── Header modal ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px 14px', borderBottom:`1px solid ${T.border}`, borderRadius:`${T.radiusLg} ${T.radiusLg} 0 0`, position:'sticky', top:0, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {view !== "list" && (
              <button onClick={()=>{ setViewTracked("list"); setEditingId(null); setPreviewReport(null); }} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:18, padding:0 }}>←</button>
            )}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:15, fontWeight:600, color:T.ink, letterSpacing:'-0.02em' }}>
                  {view==="list" ? "Report di Cantiere" : view==="header" ? "Intestazione PDF" : view==="preview" ? (previewReport?.nome_interno || previewReport?.titolo || "Report") : editingId ? "Modifica Report" : "Nuovo Report"}
                </span>
              </div>
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2 }}>
                {project?.name}{project?.client?` · ${project.client}`:""}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Pulsante impostazioni intestazione */}
            <button onClick={()=>{ setOpen(false); setViewTracked("list"); setEditingId(null); }}
              style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:22, lineHeight:1 }}>×</button>
          </div>
        </div>

        <div style={{ padding:'20px 24px', flex:1 }}>

          {/* ══════════════ LISTA REPORT ══════════════ */}
          {view === "list" && (
            <>
              {loading ? (
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, textAlign:'center', padding:'40px 0' }}>Caricamento...</div>
              ) : reports.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0' }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, marginBottom:20 }}>Nessun report ancora</div>
                  {canManage && <Btn onClick={openNew}>+ Crea primo report</Btn>}
                </div>
              ) : (
                <>
                  {canManage && (
                    <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
                      <Btn onClick={openNew}>+ Nuovo report</Btn>
                    </div>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {reports.map(r => {
                      const isDel = confirmDel === r.id;
                      return (
                        <div key={r.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:T.bg, border:`0.5px solid ${T.border}`, cursor:'pointer' }}
                          onClick={(e)=>{ if(!e.target.closest('button')) openPreview(r); }}>
                          <div style={{ width:36, height:36, background:T.navyLight, border:`0.5px solid ${T.navy}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, fontWeight:700, color:T.navy }}>#{r.numero}</span>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            {/* Nome nell'app */}
                            <div style={{ fontSize:14, fontWeight:600, color:T.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              {r.nome_interno || r.titolo || "Senza nome"}
                            </div>
                            {/* Titolo PDF (se diverso) */}
                            {r.titolo && r.titolo !== r.nome_interno && (
                              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.navy, marginTop:1 }}>
                                PDF: {r.titolo}
                              </div>
                            )}
                            <div style={{ display:'flex', gap:12, marginTop:2, flexWrap:'wrap' }}>
                              <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>{formatDt(r.data_ora)}</span>
                              {r.luogo && <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>{r.luogo}</span>}
                              {Array.isArray(r.presenti) && r.presenti.length > 0 && (
                                <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>{r.presenti.length} presenti</span>
                              )}
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                            {canManage && isDel ? (
                              <>
                                <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, alignSelf:'center' }}>Sicuro?</span>
                                <button onClick={()=>handleDelete(r.id)} style={{ border:`0.5px solid #ef4444`, background:'transparent', color:'#ef4444', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, padding:'4px 10px', cursor:'pointer' }}>Sì</button>
                                <button onClick={()=>setConfirmDel(null)} style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, padding:'4px 10px', cursor:'pointer' }}>No</button>
                              </>
                            ) : (
                              <>
                                <button onClick={async ()=>{
                                  const { data:rf } = await supabase.from("report_cantiere_foto").select("*").eq("report_id",r.id).order("ordine",{ascending:true});
                                  generatePdf({report:r,project,studio,fotos:rf||[]});
                                }}
                                  style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.navy, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.05em', padding:'4px 10px', cursor:'pointer' }}>
                                  ↓ PDF
                                </button>
                                {canManage && (
                                  <button onClick={()=>openEdit(r)}
                                    style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.05em', padding:'4px 10px', cursor:'pointer' }}>
                                    Modifica
                                  </button>
                                )}
                                {canManage && (
                                  <button onClick={()=>setConfirmDel(r.id)}
                                    style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:'#ef4444', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, padding:'4px 10px', cursor:'pointer' }}>
                                    ✕
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* ══════════════ INTESTAZIONE PDF ══════════════ */}
          {view === "header" && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* ── Riga 1: Logo (sx) + Font/Switch (dx) ── */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>

                {/* Logo */}
                <div>
                  <FL>Logo studio</FL>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    {headerForm.report_logo_url && (
                      <img src={headerForm.report_logo_url} alt="logo" style={{ height:44, maxWidth:140, objectFit:'contain', border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, padding:4, background:'#fff' }}/>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display:'none' }}/>
                    <button onClick={()=>fileRef.current?.click()} disabled={uploadingLogo}
                      style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'6px 12px', cursor:'pointer' }}>
                      {uploadingLogo ? "..." : headerForm.report_logo_url ? "Cambia" : "Carica logo"}
                    </button>
                    {headerForm.report_logo_url && (
                      <button onClick={()=>setHeaderForm(h=>({...h,report_logo_url:""}))}
                        style={{ border:`0.5px solid #ef4444`, background:'transparent', color:'#ef4444', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, padding:'6px 10px', cursor:'pointer' }}>
                        Rimuovi
                      </button>
                    )}
                  </div>
                  {headerForm.report_logo_url && (
                    <div style={{ display:'flex', gap:4, marginTop:8 }}>
                      {[["small","S"],["medium","M"],["large","L"]].map(([val,lbl])=>(
                        <button key={val} onClick={()=>setHeaderForm(h=>({...h,report_logo_size:val}))}
                          style={{ width:28, height:28, border:`0.5px solid ${headerForm.report_logo_size===val?T.navy:T.borderMd}`, borderRadius: T.radiusSm, background:headerForm.report_logo_size===val?T.navyLight:'transparent', color:headerForm.report_logo_size===val?T.navy:T.muted, cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, fontWeight:600 }}>
                          {lbl}
                        </button>
                      ))}
                      <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, alignSelf:'center', marginLeft:4 }}>dimensione logo</span>
                    </div>
                  )}
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:5 }}>PNG consigliato · appare in alto a destra</div>
                </div>

                {/* Font + Switch */}
                <div>
                  <FL>Font documento</FL>
                  {/* Selettore compatto: standard + Groteska come gruppo */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {/* Standard */}
                    <div style={{ display:'flex', gap:6 }}>
                      {[
                        { val:"helvetica", label:"Helvetica" },
                        { val:"times",     label:"Times"     },
                        { val:"courier",   label:"Courier"   },
                      ].map(({val,label})=>{
                        const sel = headerForm.report_footer_font === val;
                        return (
                          <button key={val} onClick={()=>setHeaderForm(h=>({...h,report_footer_font:val,report_body_font_enabled:false}))}
                            style={{ padding:'5px 12px', border:`0.5px solid ${sel?T.navy:T.borderMd}`, borderRadius: T.radiusSm, background:sel?T.navyLight:'transparent', color:sel?T.navy:T.ink, cursor:'pointer', fontSize:11 }}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {/* Groteska gruppo */}
                    <div>
                      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted, marginBottom:4, letterSpacing:'0.1em' }}>GROTESKA</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {GROTESKA_VARIANTS.map(g=>{
                          const sel = headerForm.report_footer_font === g.key;
                          return (
                            <button key={g.key} onClick={()=>setHeaderForm(h=>({...h,report_footer_font:g.key}))}
                              style={{ padding:'5px 12px', border:`0.5px solid ${sel?T.navy:T.borderMd}`, borderRadius: T.radiusSm, background:sel?T.navyLight:'transparent', color:sel?T.navy:T.ink, cursor:'pointer', fontSize:11, fontFamily:"'Space Grotesk', sans-serif" }}>
                              {g.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {/* Switch applica a tutto */}
                    {GROTESKA_VARIANTS.find(g=>g.key===headerForm.report_footer_font) && (
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:4, padding:'8px 10px', background:T.bg, border:`0.5px solid ${T.border}` }}>
                        <button onClick={()=>setHeaderForm(h=>({...h,report_body_font_enabled:!h.report_body_font_enabled}))}
                          style={{ width:36, height:20, borderRadius:10, border:'none', cursor:'pointer', position:'relative', flexShrink:0, transition:'background 0.2s',
                            background:headerForm.report_body_font_enabled?T.navy:T.borderMd }}>
                          <div style={{ position:'absolute', top:2, left:headerForm.report_body_font_enabled?18:2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }}/>
                        </button>
                        <div>
                          <div style={{ fontSize:12, color:T.ink, fontWeight:500 }}>Applica a tutto il documento</div>
                          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted, marginTop:1 }}>
                            Titolo → Bold · Etichette → Regular · Testo → Book
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Nome studio + Testo sotto ── */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <FL>Nome studio nel PDF</FL>
                  <input type="text" value={headerForm.report_header_name}
                    onChange={e=>setHeaderForm(h=>({...h,report_header_name:e.target.value}))}
                    placeholder="Es. Studio Prini" style={inputSt}/>
                </div>
                <div>
                  <FL>Testo sotto il nome</FL>
                  <textarea value={headerForm.report_header_text}
                    onChange={e=>setHeaderForm(h=>({...h,report_header_text:e.target.value}))}
                    rows={3} style={{ ...inputSt, resize:'vertical', lineHeight:1.5 }}
                    placeholder="Via, telefono, email, P.IVA..."/>
                </div>
              </div>

              {/* Anteprima intestazione */}
              <div style={{ background:T.bg, border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, padding:'14px 18px' }}>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:10 }}>Anteprima intestazione</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:T.navy, minHeight:20 }}>{headerForm.report_header_name||""}</div>
                    <div style={{ fontSize:9, color:T.muted, marginTop:4, whiteSpace:'pre-line', lineHeight:1.7 }}>{headerForm.report_header_text||""}</div>
                  </div>
                  {headerForm.report_logo_url && (
                    <img src={headerForm.report_logo_url} alt="logo" style={{ height:36, maxWidth:110, objectFit:'contain', marginLeft:12 }}/>
                  )}
                </div>
                <div style={{ borderTop:`0.5px solid ${T.navy}`, marginTop:10, paddingTop:8 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.navy, textAlign:'center', textTransform:'uppercase', letterSpacing:'0.05em' }}>Titolo del report PDF</div>
                </div>
              </div>

              {/* ── Sezione Footer ── */}
              <div style={{ borderTop:`0.5px solid ${T.border}`, paddingTop:16 }}>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:14 }}>Piè di pagina (footer)</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  {[["report_footer_left","Sinistra"],["report_footer_center","Centro"],["report_footer_right","Destra"]].map(([field,label])=>(
                    <div key={field}>
                      <FL>{label}</FL>
                      <textarea value={headerForm[field]} onChange={e=>setHeaderForm(h=>({...h,[field]:e.target.value}))}
                        rows={3} wrap="off" placeholder=""
                        style={{ ...inputSt, resize:'vertical', lineHeight:1.6, overflowX:'auto', whiteSpace:'pre' }}/>
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:6 }}>
                  Usa <strong style={{color:T.ink}}>{"{pagina}"}</strong> e <strong style={{color:T.ink}}>{"{totale}"}</strong> per la numerazione automatica.
                </div>
                {/* Anteprima footer */}
                <div style={{ marginTop:12 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, marginBottom:6 }}>Anteprima footer</div>
                  <div style={{ background:T.bg, border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, padding:'10px 14px' }}>
                    <div style={{ height:1, background:'rgba(150,150,150,0.4)', marginBottom:8 }}/>
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:9, color:T.muted,
                      fontFamily: headerForm.report_footer_font==='times'?'Georgia, serif':headerForm.report_footer_font==='courier'?"'Courier New', monospace":'Arial, sans-serif' }}>
                      {[["report_footer_left","SINISTRA","left"],["report_footer_center","CENTRO","center"],["report_footer_right","DESTRA","right"]].map(([field,lbl,align])=>(
                        <div key={field} style={{ flex:1, borderLeft:`2px solid ${T.border}`, paddingLeft:6, textAlign:align }}>
                          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:7, color:T.muted, marginBottom:3, opacity:0.6 }}>{lbl}</div>
                          {(headerForm[field]||"").split("\n").map((line,i)=>(
                            <div key={i} style={{ minHeight:13 }}>{line?(line.replace(/\{pagina\}/g,"1").replace(/\{totale\}/g,"3")):(<span style={{opacity:0.25}}>—</span>)}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {headerMsg && (
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color: headerMsg.startsWith("Errore") ? '#ef4444' : '#16a34a', padding:'8px 12px', background: headerMsg.startsWith("Errore") ? '#fef2f2' : '#f0fdf4', border:`0.5px solid ${headerMsg.startsWith("Errore") ? '#fca5a5' : '#86efac'}` }}>
                  {headerMsg}
                </div>
              )}

              {/* Popup conferma aggiornamento report esistenti */}
              {confirmUpdateAll && (
                <div style={{ background: T.navyLight, border:`1px solid ${T.navy}`, padding:'16px 18px', borderRadius:4 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:T.ink, marginBottom:6 }}>
                    Aggiornare anche i report esistenti?
                  </div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginBottom:14 }}>
                    Hai {reports.length} report salvati. Vuoi applicare la nuova intestazione anche a quelli già creati?
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <Btn onClick={()=>doSaveHeader(true)} disabled={savingHeader} style={{ flex:1 }}>
                      {savingHeader ? "..." : "Sì, aggiorna tutti"}
                    </Btn>
                    <Btn ghost onClick={()=>doSaveHeader(false)} disabled={savingHeader} style={{ flex:1 }}>
                      No, solo i nuovi
                    </Btn>
                    <Btn ghost onClick={()=>setConfirmUpdateAll(false)} disabled={savingHeader}>
                      Annulla
                    </Btn>
                  </div>
                </div>
              )}

              {!confirmUpdateAll && (
                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:10, borderTop:`0.5px solid ${T.border}` }}>
                  <Btn ghost onClick={()=>setViewTracked("list")}>← Indietro</Btn>
                  <Btn onClick={handleSaveHeader} disabled={savingHeader}>
                    {savingHeader ? "Salvataggio..." : "Salva intestazione"}
                  </Btn>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ ANTEPRIMA REPORT ══════════════ */}
          {view === "preview" && previewReport && (
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* Badge numero + metadati */}
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:44, height:44, background:T.navyLight, border:`0.5px solid ${T.navy}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:13, fontWeight:700, color:T.navy }}>#{previewReport.numero}</span>
                </div>
                <div>
                  <div style={{ fontSize:16, fontWeight:600, color:T.ink }}>{previewReport.nome_interno || previewReport.titolo || "Report"}</div>
                  {previewReport.titolo && previewReport.titolo !== previewReport.nome_interno && (
                    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.navy, marginTop:2 }}>PDF: {previewReport.titolo}</div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  ["Data e ora", formatDt(previewReport.data_ora)],
                  ["Luogo", previewReport.luogo || "—"],
                ].map(([k,v])=>(
                  <div key={k} style={{ padding:'10px 14px', background:T.bg, border:`0.5px solid ${T.border}` }}>
                    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, marginBottom:4 }}>{k}</div>
                    <div style={{ fontSize:13, color:T.ink }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Presenti */}
              {Array.isArray(previewReport.presenti) && previewReport.presenti.length > 0 && (
                <div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:8 }}>Presenti</div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr>
                          {["Figura","Azienda","Referente","Email","Telefono"].map(h=>(
                            <th key={h} style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:7, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, padding:'4px 8px', textAlign:'left', borderBottom:`0.5px solid ${T.border}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewReport.presenti.map((p,i)=>(
                          <tr key={i} style={{ borderBottom:`0.5px solid ${T.border}` }}>
                            {["figura","azienda","referente","email","telefono"].map(f=>(
                              <td key={f} style={{ padding:'6px 8px', color:T.ink, fontSize:12 }}>{p[f]||"—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Contenuto */}
              {previewReport.contenuto?.trim() && (
                <div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:8 }}>Report</div>
                  <div style={{ fontSize:13, color:T.ink, lineHeight:1.7, whiteSpace:'pre-wrap', padding:'14px 16px', background:T.bg, border:`0.5px solid ${T.border}` }}>
                    {previewReport.contenuto}
                  </div>
                </div>
              )}

              {/* Foto */}
              {previewFotos.length > 0 && (
                <div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:8 }}>Foto ({previewFotos.length})</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                    {previewFotos.map(f=>(
                      <img key={f.id} src={f.url} alt="" style={{ width:'100%', height:120, objectFit:'cover', border:`0.5px solid ${T.border}` }}/>
                    ))}
                  </div>
                </div>
              )}

              {/* Azioni */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:`0.5px solid ${T.border}` }}>
                <Btn ghost onClick={()=>{ setViewTracked("list"); setPreviewReport(null); }}>← Lista</Btn>
                <div style={{ display:'flex', gap:10 }}>
                  <Btn ghost onClick={async ()=>{
                    const { data:rf } = await supabase.from("report_cantiere_foto").select("*").eq("report_id",previewReport.id).order("ordine",{ascending:true});
                    generatePdf({ report:previewReport, project, studio, fotos:rf||[] });
                  }}>↓ PDF</Btn>
                  {canManage && <Btn onClick={()=>{ openEdit(previewReport); }}>Modifica</Btn>}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ FORM REPORT ══════════════ */}
          {view === "form" && (
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

              {/* Nome interno (app) + Titolo PDF */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <FL required>Nome nell'app</FL>
                  <input type="text" value={form.nome_interno} onChange={e=>setForm(f=>({...f,nome_interno:e.target.value}))}
                    placeholder="Es. Sopralluogo cucina" style={inputSt}/>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:4 }}>Come appare nella lista dei report</div>
                </div>
                <div>
                  <FL>Titolo PDF</FL>
                  <input type="text" value={form.titolo} onChange={e=>setForm(f=>({...f,titolo:e.target.value}))}
                    placeholder="Es. Verifica tramezzature interne" style={inputSt}/>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:4 }}>Titolo grande nel documento PDF</div>
                </div>
              </div>

              {/* Luogo + Data/Ora */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <FL>Luogo</FL>
                  <input type="text" value={form.luogo} onChange={e=>setForm(f=>({...f,luogo:e.target.value}))}
                    placeholder="Via e città del cantiere" style={inputSt}/>
                </div>
                <div>
                  <FL>Data e ora</FL>
                  <input type="datetime-local" value={toInputDt(form.data_ora)} onChange={e=>setForm(f=>({...f,data_ora:fromInputDt(e.target.value)}))}
                    style={inputSt}/>
                </div>
              </div>

              {/* Tabella presenti */}
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <FL>Presenti</FL>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {/* Dropdown team */}
                    {teamMembers.length > 0 && (
                      <div style={{ position:'relative' }}>
                        <button
                          onClick={e => {
                            const r = e.currentTarget.getBoundingClientRect();
                            setTeamDropOpen(p => !p);
                            // salva posizione per dropdown fixed
                            e.currentTarget._rect = r;
                          }}
                          style={{ background:'none', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, color:T.muted, fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', padding:'3px 10px', cursor:'pointer' }}>
                          + Dal team
                        </button>
                        {teamDropOpen && (() => {
                          const btn = document.activeElement?.closest?.('button') || null;
                          return (
                            <div style={{ position:'absolute', right:0, top:'100%', marginTop:4, zIndex:200, background:T.surface, border:`0.5px solid ${T.borderMd}`, boxShadow:'0 4px 16px rgba(0,0,0,0.15)', minWidth:200, maxHeight:240, overflowY:'auto' }}>
                              {teamMembers.map(m => (
                                <button key={m.id} onClick={() => addFromTeam(m)}
                                  style={{ display:'block', width:'100%', padding:'8px 12px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontFamily:"'Space Grotesk', sans-serif", fontSize:12, color:T.ink, borderBottom:`0.5px solid ${T.border}` }}>
                                  <div style={{ fontWeight:600 }}>{m.user_name || m.user_email}</div>
                                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2 }}>{m.role_internal || ""}</div>
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <button onClick={addP} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, color:T.navy, fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', padding:'3px 10px', cursor:'pointer' }}>
                      + Aggiungi riga
                    </button>
                  </div>
                </div>
                {form.presenti.length === 0 ? (
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, padding:'10px 0' }}>
                    Nessun presente — aggiungi righe o compila l'Anagrafica del progetto
                  </div>
                ) : (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                      <thead>
                        <tr style={{ background:T.bg }}>
                          {["Figura","Azienda","Referente","Email","Telefono",""].map(h=>(
                            <th key={h} style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, padding:'6px 8px', textAlign:'left', borderBottom:`0.5px solid ${T.border}`, whiteSpace:'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {form.presenti.map((p,i)=>(
                          <tr key={i} style={{ borderBottom:`0.5px solid ${T.border}` }}>
                            {["figura","azienda","referente","email","telefono"].map(field=>(
                              <td key={field} style={{ padding:'4px 4px' }}>
                                <input type="text" value={p[field]||""} onChange={e=>updateP(i,field,e.target.value)}
                                  style={{ ...inputSt, padding:'5px 7px', fontSize:11 }}/>
                              </td>
                            ))}
                            <td style={{ padding:'4px 4px' }}>
                              <button onClick={()=>removeP(i)} style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:14 }}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Contenuto */}
              <div>
                <FL>Contenuto del report</FL>
                <textarea value={form.contenuto} onChange={e=>setForm(f=>({...f,contenuto:e.target.value}))} onKeyDown={e=>handleListKeyDown(e,form.contenuto,val=>setForm(f=>({...f,contenuto:val})))}
                  placeholder="Descrivi cosa è stato verificato, le prescrizioni operative, l'esito del sopralluogo..."
                  rows={10} style={{ ...inputSt, resize:'vertical', minHeight:180, lineHeight:1.6 }}/>
              </div>

              {/* ── Foto ── */}
              <div style={{ borderTop:`0.5px solid ${T.border}`, paddingTop:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <FL>Foto</FL>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {!editingId && (
                      <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>
                        Salva il report per aggiungere foto
                      </span>
                    )}
                    {editingId && (
                      <>
                        <input ref={fotoInputRef} type="file" accept="image/*" multiple onChange={handleFotoUpload} style={{ display:'none' }}/>
                        <button onClick={()=>fotoInputRef.current?.click()} disabled={uploadingFoto}
                          style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.navy, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'5px 12px', cursor:'pointer' }}>
                          {uploadingFoto ? "Caricamento..." : "+ Aggiungi foto"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {fotos.length === 0 ? (
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, padding:'12px 0' }}>
                    {editingId ? "Nessuna foto ancora — clicca \"+ Aggiungi foto\"" : ""}
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
                    {fotos.map(foto => (
                      <div key={foto.id} style={{ position:'relative', aspect:'square' }}>
                        <img src={foto.url} alt="" style={{ width:'100%', height:120, objectFit:'cover', display:'block', border:`0.5px solid ${T.border}` }}/>
                        <button onClick={()=>handleFotoDelete(foto)}
                          style={{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%', background:'rgba(0,0,0,0.6)', border:'none', color:'#fff', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {saveOk && (
                <div style={{ background:'#f0fdf4', border:'0.5px solid #86efac', padding:'10px 14px', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:'#16a34a' }}>
                  ✓ Report salvato — ora puoi aggiungere le foto qui sotto
                </div>
              )}
              {saveError && (
                <div style={{ background:'#fef2f2', border:'0.5px solid #fca5a5', padding:'10px 14px', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:'#b91c1c' }}>
                  ⚠ Errore: {saveError}
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:`0.5px solid ${T.border}` }}>
                <Btn ghost onClick={()=>{ setViewTracked("list"); setEditingId(null); setFotos([]); }}>← Indietro</Btn>
                <Btn onClick={handleSave} disabled={saving || (!form.nome_interno.trim() && !form.titolo.trim())}>
                  {saving ? "Salvataggio..." : editingId ? "Aggiorna" : "Salva report"}
                </Btn>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  return <>{widget}{modal}</>;
}
