import { useEffect, useState, useCallback, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";

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
  border:`0.5px solid ${T.borderMd}`, background:T.surface, color:T.ink,
  fontSize:12, fontFamily:"'Space Grotesk', sans-serif", outline:'none',
});

const Btn = ({ children, onClick, disabled, ghost, danger, style={} }) => {
  const { T } = useTheme();
  if (ghost) return (
    <button onClick={onClick} disabled={disabled} style={{
      background:'transparent', border:`0.5px solid ${danger ? '#ef4444' : T.borderMd}`,
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

// Carica un'immagine da URL come base64 (per jsPDF)
// Usa canvas per evitare problemi CORS con Supabase Storage
async function urlToBase64(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width  = img.naturalWidth  || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    // Cache-bust per forzare il re-fetch con crossOrigin
    img.src = url.includes("?") ? url + "&_cb=" + Date.now() : url + "?_cb=" + Date.now();
  });
}

// ── PDF generator ─────────────────────────────────────────────────────────────
// Usa lo snapshot salvato nel report se disponibile, altrimenti le impostazioni correnti
async function generatePdf({ report, project, studio }) {
  const s = report.header_snapshot ? { ...studio, ...report.header_snapshot } : studio;
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W = 210, ml = 20, mr = 20, cw = W - ml - mr;
  const PAGE_H = 297, FOOTER_H = 15;
  const maxY = PAGE_H - FOOTER_H - 10;
  let y = 18;

  const footerFont = s?.report_footer_font || "helvetica";

  // ── Logo (destra) ─────────────────────────────────────────────────
  let logoBottomY = y;
  if (s?.report_logo_url) {
    const b64 = await urlToBase64(s.report_logo_url);
    if (b64) {
      try {
        const imgEl = await new Promise(res => {
          const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null);
          i.src = b64;
        });
        if (imgEl) {
          const maxW = 45, maxH = 25;
          const ratio = imgEl.naturalWidth / imgEl.naturalHeight;
          let w = maxW, h = maxW / ratio;
          if (h > maxH) { h = maxH; w = maxH * ratio; }
          doc.addImage(b64, "PNG", W - mr - w, y - 4, w, h, undefined, "FAST");
          logoBottomY = y - 4 + h;
        }
      } catch {}
    }
  }

  // ── Nome studio + testo intestazione (sinistra) ──────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(19, 49, 92);
  const headerName = s?.report_header_name ?? "";
  if (headerName) { doc.text(headerName, ml, y); y += 5; }

  const headerText = s?.report_header_text?.trim() || "";
  if (headerText) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(19, 49, 92);
  doc.text(pdfTitle, W / 2, y, { align:"center" });
  y += 12;

  // ── Metadati ─────────────────────────────────────────────────────
  const meta = [
    ["Progetto",       project?.name || "—"],
    ["Cliente",        project?.client || "—"],
    ["Luogo",          report.luogo || project?.address || "—"],
    ["Data e ora",     formatDt(report.data_ora)],
    ["Sopralluogo N.", String(report.numero)],
  ];
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");   doc.text(`${k}:`, ml, y);
    doc.setFont("helvetica", "normal"); doc.text(v, ml + 38, y);
    y += 6;
  });
  y += 4;

  // ── Tabella presenti ─────────────────────────────────────────────
  const presenti = Array.isArray(report.presenti) ? report.presenti : [];
  if (presenti.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(19, 49, 92);
    doc.text("PRESENTI", ml, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: ml, right: mr },
      head: [["Figura professionale", "Azienda / Referente", "Email", "Telefono"]],
      body: presenti.map(p => [
        p.figura || "—",
        [p.azienda, p.referente].filter(Boolean).join(" / ") || "—",
        p.email || "—",
        p.telefono || "—",
      ]),
      headStyles: { fillColor:[19,49,92], textColor:[255,255,255], fontStyle:"bold", fontSize:8, cellPadding:3 },
      bodyStyles: { fontSize:8, cellPadding:3, textColor:[30,30,30] },
      alternateRowStyles: { fillColor:[245,247,250] },
      tableLineWidth:0.1, tableLineColor:[200,200,200],
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
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(19, 49, 92);
    doc.text("REPORT", ml, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    doc.splitTextToSize(report.contenuto, cw).forEach(line => {
      newPageIfNeeded(6);
      doc.text(line, ml, y); y += 5.5;
    });
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
    doc.setFont(footerFont, "normal"); doc.setFontSize(7.5); doc.setTextColor(140,140,140);

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

  const safeTitle = (report.titolo || "report").replace(/[^a-zA-Z0-9_\- ]/g,"").trim() || "report";
  doc.save(`${safeTitle}_sopralluogo_${report.numero}.pdf`);
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

export default function ReportCantierePanel({ projectId, studioId }) {
  const { T } = useTheme();
  const inputSt = inputCss(T);
  const fileRef = useRef(null);

  const [open, setOpen]       = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [studio, setStudio]   = useState(null);
  const [contacts, setContacts] = useState([]);

  // "list" | "form" | "header"
  const [view, setView]           = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  // Header + footer settings
  const [headerForm, setHeaderForm]   = useState({
    report_header_name:"",
    report_header_text:"", report_logo_url:"",
    report_footer_left:"", report_footer_center:"", report_footer_right:"",
    report_footer_font:"helvetica",
  });
  const [savingHeader, setSavingHeader] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [headerMsg, setHeaderMsg]     = useState("");
  const [confirmUpdateAll, setConfirmUpdateAll] = useState(false);

  // ── load ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!projectId || !studioId) return;
    setLoading(true);
    const [{ data:reps }, { data:proj }, { data:st }, { data:ctc }] = await Promise.all([
      supabase.from("report_cantiere").select("*").eq("project_id", projectId).is("deleted_at",null).order("numero",{ascending:false}),
      supabase.from("projects").select("id,name,client,address").eq("id",projectId).single(),
      supabase.from("studios").select("name,indirizzo,città,cap,piva,report_header_name,report_header_text,report_logo_url,report_footer_left,report_footer_center,report_footer_right,report_footer_font").eq("id",studioId).single(),
      supabase.from("project_contacts").select("*, global_contacts(*)").eq("project_id",projectId),
    ]);
    setReports(reps || []);
    setProject(proj);
    setStudio(st);
    setContacts(ctc || []);
    setHeaderForm({
      report_header_name:   st?.report_header_name   ?? "",
      report_header_text:   st?.report_header_text   || "",
      report_logo_url:      st?.report_logo_url      || "",
      report_footer_left:   st?.report_footer_left   || "",
      report_footer_center: st?.report_footer_center || "",
      report_footer_right:  st?.report_footer_right  || "",
      report_footer_font:   st?.report_footer_font   || "helvetica",
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

  // ── nuovo report ─────────────────────────────────────────────────
  const openNew = () => {
    const nextNum = (reports[0]?.numero ?? 0) + 1;
    const base = emptyForm(project?.address || "");
    base.presenti = contacts.map(pc => {
      const gc = pc.global_contacts || {};
      return { figura:pc.professional_role||"—", azienda:gc.company||"", referente:gc.full_name||"", email:gc.email||"", telefono:gc.phone||"" };
    });
    setForm({ ...base, _numero:nextNum });
    setEditingId(null); setSaveError(""); setView("form");
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
    setEditingId(r.id); setSaveError(""); setView("form");
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
    let err;
    if (editingId) {
      ({ error:err } = await supabase.from("report_cantiere").update(payload).eq("id",editingId));
    } else {
      ({ error:err } = await supabase.from("report_cantiere").insert(payload));
    }
    setSaving(false);
    if (err) { setSaveError(err.message); return; }
    setView("list"); setEditingId(null); load();
  };

  // ── elimina report ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    await supabase.rpc("elimina_report_cantiere", { p_id:id });
    setConfirmDel(null); load();
  };

  // ── salva intestazione ───────────────────────────────────────────
  const doSaveHeader = async (updateExisting) => {
    setSavingHeader(true); setHeaderMsg(""); setConfirmUpdateAll(false);
    const snapshot = {
      report_header_name:   headerForm.report_header_name   || null,
      report_header_text:   headerForm.report_header_text   || null,
      report_logo_url:      headerForm.report_logo_url      || null,
      report_footer_left:   headerForm.report_footer_left   || null,
      report_footer_center: headerForm.report_footer_center || null,
      report_footer_right:  headerForm.report_footer_right  || null,
      report_footer_font:   headerForm.report_footer_font   || "helvetica",
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
    // Auto-save logo subito
    const { error: saveErr } = await supabase.from("studios").update({ report_logo_url: newUrl }).eq("id", studioId);
    if (saveErr) { setHeaderMsg("Upload OK ma salvataggio fallito: " + saveErr.message); }
    else { setStudio(s => ({ ...s, report_logo_url: newUrl })); setHeaderMsg("Logo salvato!"); setTimeout(()=>setHeaderMsg(""),3000); }
    setUploadingLogo(false);
  };

  // ── presenti helpers ─────────────────────────────────────────────
  const updateP = (i, k, v) => setForm(f => { const a=[...f.presenti]; a[i]={...a[i],[k]:v}; return {...f,presenti:a}; });
  const addP    = ()        => setForm(f => ({ ...f, presenti:[...f.presenti, {figura:"",azienda:"",referente:"",email:"",telefono:""}] }));
  const removeP = (i)       => setForm(f => ({ ...f, presenti:f.presenti.filter((_,j)=>j!==i) }));

  // ── WIDGET ────────────────────────────────────────────────────────
  const widget = (
    <button onClick={()=>setOpen(true)} style={{
      display:'flex', alignItems:'center', gap:8,
      border:`0.5px solid ${reports.length > 0 ? T.navy : T.borderMd}`,
      background: reports.length > 0 ? T.navyLight : 'transparent',
      padding:'6px 12px', cursor:'pointer',
    }}>
      <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:reports.length>0?T.navy:T.muted, fontWeight:600 }}>Report</span>
      {reports.length > 0
        ? <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.navy, border:`0.5px solid ${T.navy}`, padding:'1px 6px' }}>{reports.length}</span>
        : <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>+ Crea</span>}
    </button>
  );

  // ── MODAL ─────────────────────────────────────────────────────────
  const modal = open && (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(14,14,13,0.55)', padding:16 }}>
      <div style={{ width:'100%', maxWidth:800, background:T.surface, border:`0.5px solid ${T.borderMd}`, maxHeight:'92vh', overflowY:'auto', display:'flex', flexDirection:'column' }}>

        {/* ── Header modal ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px 14px', borderBottom:`0.5px solid ${T.border}`, position:'sticky', top:0, background:T.surface, zIndex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {view !== "list" && (
              <button onClick={()=>{ setView("list"); setEditingId(null); }} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:18, padding:0 }}>←</button>
            )}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:15, fontWeight:600, color:T.ink, letterSpacing:'-0.02em' }}>
                  {view==="list" ? "Report di Cantiere" : view==="header" ? "Intestazione PDF" : editingId ? "Modifica Report" : "Nuovo Report"}
                </span>
                <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:'#fff', background:'#16a34a', padding:'2px 7px', borderRadius:3 }}>BETA</span>
              </div>
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2 }}>
                {project?.name}{project?.client?` · ${project.client}`:""}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Pulsante impostazioni intestazione */}
            {view === "list" && (
              <button onClick={()=>setView("header")} title="Personalizza intestazione PDF"
                style={{ background:'none', border:`0.5px solid ${T.borderMd}`, cursor:'pointer', color:T.muted, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </button>
            )}
            <button onClick={()=>{ setOpen(false); setView("list"); setEditingId(null); }}
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
                  <Btn onClick={openNew}>+ Crea primo report</Btn>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
                    <Btn onClick={openNew}>+ Nuovo report</Btn>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {reports.map(r => {
                      const isDel = confirmDel === r.id;
                      return (
                        <div key={r.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:T.bg, border:`0.5px solid ${T.border}` }}>
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
                            {isDel ? (
                              <>
                                <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, alignSelf:'center' }}>Sicuro?</span>
                                <button onClick={()=>handleDelete(r.id)} style={{ border:`0.5px solid #ef4444`, background:'transparent', color:'#ef4444', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, padding:'4px 10px', cursor:'pointer' }}>Sì</button>
                                <button onClick={()=>setConfirmDel(null)} style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, padding:'4px 10px', cursor:'pointer' }}>No</button>
                              </>
                            ) : (
                              <>
                                <button onClick={()=>generatePdf({report:r,project,studio})}
                                  style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.navy, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.05em', padding:'4px 10px', cursor:'pointer' }}>
                                  ↓ PDF
                                </button>
                                <button onClick={()=>openEdit(r)}
                                  style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.05em', padding:'4px 10px', cursor:'pointer' }}>
                                  Modifica
                                </button>
                                <button onClick={()=>setConfirmDel(r.id)}
                                  style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:'#ef4444', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, padding:'4px 10px', cursor:'pointer' }}>
                                  ✕
                                </button>
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

              {/* Logo */}
              <div>
                <FL>Logo studio</FL>
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                  {headerForm.report_logo_url && (
                    <img src={headerForm.report_logo_url} alt="logo" style={{ height:48, maxWidth:160, objectFit:'contain', border:`0.5px solid ${T.border}`, padding:4, background:'#fff' }}/>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display:'none' }}/>
                  <button onClick={()=>fileRef.current?.click()} disabled={uploadingLogo}
                    style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 14px', cursor:'pointer' }}>
                    {uploadingLogo ? "Caricamento..." : headerForm.report_logo_url ? "Cambia logo" : "Carica logo"}
                  </button>
                  {headerForm.report_logo_url && (
                    <button onClick={()=>setHeaderForm(h=>({...h,report_logo_url:""}))}
                      style={{ border:`0.5px solid #ef4444`, background:'transparent', color:'#ef4444', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, padding:'7px 12px', cursor:'pointer' }}>
                      Rimuovi
                    </button>
                  )}
                </div>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:6 }}>
                  PNG o SVG consigliati. Il logo appare in alto a destra nell'intestazione del PDF.
                </div>
              </div>

              {/* Nome studio nel PDF */}
              <div>
                <FL required>Nome studio nel PDF</FL>
                <input type="text" value={headerForm.report_header_name}
                  onChange={e=>setHeaderForm(h=>({...h,report_header_name:e.target.value}))}
                  placeholder="Es. Studio Prini" style={inputSt}/>
              </div>

              {/* Testo intestazione */}
              <div>
                <FL>Testo sotto il nome studio</FL>
                <textarea
                  value={headerForm.report_header_text}
                  onChange={e=>setHeaderForm(h=>({...h,report_header_text:e.target.value}))}
                  placeholder={`Es.\nVia Roma 1, 20100 Milano\nTel: +39 02 1234567 | Email: info@studio.it | P.IVA: 01234567890`}
                  rows={4}
                  style={{ ...inputSt, resize:'vertical', lineHeight:1.6 }}
                />
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:4 }}>
                  Indirizzo, telefono, email, P.IVA — appare nell'intestazione di ogni PDF generato.
                </div>
              </div>

              {/* Anteprima intestazione — subito dopo il testo */}
              <div style={{ background:T.bg, border:`0.5px solid ${T.border}`, padding:'14px 18px' }}>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:10 }}>Anteprima intestazione</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:T.navy, minHeight:20 }}>{headerForm.report_header_name || ""}</div>
                    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:4, whiteSpace:'pre-line', lineHeight:1.7 }}>
                      {headerForm.report_header_text || ""}
                    </div>
                  </div>
                  {headerForm.report_logo_url && (
                    <img src={headerForm.report_logo_url} alt="logo" style={{ height:40, maxWidth:120, objectFit:'contain', marginLeft:12 }}/>
                  )}
                </div>
                <div style={{ borderTop:`0.5px solid ${T.navy}`, marginTop:10, paddingTop:8 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:T.navy, textAlign:'center', textTransform:'uppercase', letterSpacing:'0.05em' }}>Titolo del report PDF</div>
                </div>
              </div>

              {/* Sezione Footer */}
              <div style={{ borderTop:`0.5px solid ${T.border}`, paddingTop:16 }}>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:14 }}>Piè di pagina (footer)</div>

                {/* Font */}
                <div style={{ marginBottom:14 }}>
                  <FL>Font footer</FL>
                  <div style={{ display:'flex', gap:8 }}>
                    {[["helvetica","Helvetica"],["times","Times"],["courier","Courier"]].map(([val,label])=>(
                      <button key={val} onClick={()=>setHeaderForm(h=>({...h,report_footer_font:val}))}
                        style={{ padding:'6px 16px', border:`0.5px solid ${headerForm.report_footer_font===val ? T.navy : T.borderMd}`, background: headerForm.report_footer_font===val ? T.navyLight : 'transparent', color: headerForm.report_footer_font===val ? T.navy : T.ink, cursor:'pointer', fontFamily: val==='helvetica' ? 'Arial, sans-serif' : val==='times' ? 'Georgia, serif' : "'Courier New', monospace", fontSize:12 }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3 colonne footer — textarea per andare a capo */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  {[
                    ["report_footer_left",   "Sinistra"],
                    ["report_footer_center", "Centro"],
                    ["report_footer_right",  "Destra"],
                  ].map(([field, label]) => (
                    <div key={field}>
                      <FL>{label}</FL>
                      <textarea
                        value={headerForm[field]}
                        onChange={e=>setHeaderForm(h=>({...h,[field]:e.target.value}))}
                        rows={3}
                        wrap="off"
                        placeholder=""
                        style={{ ...inputSt, resize:'vertical', lineHeight:1.6, overflowX:'auto', whiteSpace:'pre', fontFamily:"'Space Grotesk', sans-serif" }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:6 }}>
                  Scrivi liberamente. Usa <strong style={{color:T.ink}}>{"{pagina}"}</strong> e <strong style={{color:T.ink}}>{"{totale}"}</strong> per la numerazione automatica.
                </div>

                {/* Anteprima footer */}
                <div style={{ marginTop:12 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, marginBottom:6 }}>Anteprima footer</div>
                  <div style={{ background:T.bg, border:`0.5px solid ${T.border}`, padding:'12px 14px' }}>
                    <div style={{ height:1, background:'rgba(150,150,150,0.4)', marginBottom:10 }}/>
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start',
                      fontFamily: headerForm.report_footer_font==='times' ? 'Georgia, serif' : headerForm.report_footer_font==='courier' ? "'Courier New', monospace" : 'Arial, sans-serif',
                      fontSize:9, color:T.muted }}>
                      {/* Sinistra */}
                      <div style={{ flex:1, borderLeft:`2px solid ${T.border}`, paddingLeft:6 }}>
                        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:7, color:T.muted, marginBottom:3, opacity:0.6 }}>SINISTRA</div>
                        {(headerForm.report_footer_left||"").split("\n").map((line,i)=>(
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:4, minHeight:14 }}>
                            {line ? <span>{line.replace(/\{pagina\}/g,"1").replace(/\{totale\}/g,"3")}</span> : <span style={{ opacity:0.3 }}>—</span>}
                          </div>
                        ))}
                      </div>
                      {/* Centro */}
                      <div style={{ flex:1, borderLeft:`2px solid ${T.border}`, paddingLeft:6, textAlign:'center' }}>
                        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:7, color:T.muted, marginBottom:3, opacity:0.6 }}>CENTRO</div>
                        {(headerForm.report_footer_center||"").split("\n").map((line,i)=>(
                          <div key={i} style={{ minHeight:14 }}>
                            {line ? line.replace(/\{pagina\}/g,"1").replace(/\{totale\}/g,"3") : <span style={{ opacity:0.3 }}>—</span>}
                          </div>
                        ))}
                      </div>
                      {/* Destra */}
                      <div style={{ flex:1, borderLeft:`2px solid ${T.border}`, paddingLeft:6, textAlign:'right' }}>
                        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:7, color:T.muted, marginBottom:3, opacity:0.6 }}>DESTRA</div>
                        {(headerForm.report_footer_right||"").split("\n").map((line,i)=>(
                          <div key={i} style={{ minHeight:14 }}>
                            {line ? line.replace(/\{pagina\}/g,"1").replace(/\{totale\}/g,"3") : <span style={{ opacity:0.3 }}>—</span>}
                          </div>
                        ))}
                      </div>
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
                  <Btn ghost onClick={()=>setView("list")}>← Indietro</Btn>
                  <Btn onClick={handleSaveHeader} disabled={savingHeader}>
                    {savingHeader ? "Salvataggio..." : "Salva intestazione"}
                  </Btn>
                </div>
              )}
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
                  <button onClick={addP} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, color:T.navy, fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', padding:'3px 10px', cursor:'pointer' }}>
                    + Aggiungi riga
                  </button>
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
                <textarea value={form.contenuto} onChange={e=>setForm(f=>({...f,contenuto:e.target.value}))}
                  placeholder="Descrivi cosa è stato verificato, le prescrizioni operative, l'esito del sopralluogo..."
                  rows={10} style={{ ...inputSt, resize:'vertical', minHeight:180, lineHeight:1.6 }}/>
              </div>

              {saveError && (
                <div style={{ background:'#fef2f2', border:'0.5px solid #fca5a5', padding:'10px 14px', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:'#b91c1c' }}>
                  ⚠ Errore: {saveError}
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:`0.5px solid ${T.border}` }}>
                <Btn ghost onClick={()=>{ setView("list"); setEditingId(null); }}>← Indietro</Btn>
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
