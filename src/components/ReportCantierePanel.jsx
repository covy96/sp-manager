import { useEffect, useState, useCallback } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";

// ── helpers ──────────────────────────────────────────────────────────────────
const FieldLabel = ({ children, required }) => {
  const { T } = useTheme();
  return (
    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:5 }}>
      {children}{required && <span style={{ color:T.red, marginLeft:2 }}>*</span>}
    </div>
  );
};

const inputCss = (T) => ({
  width:'100%', padding:'7px 10px', boxSizing:'border-box',
  border:`0.5px solid ${T.borderMd}`, background:T.surface, color:T.ink,
  fontSize:12, fontFamily:"'Space Grotesk', sans-serif", outline:'none',
});

const BtnPrimary = ({ children, onClick, disabled, style={} }) => {
  const { T } = useTheme();
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:T.navy, color:T.bg, border:'none',
      fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase',
      padding:'8px 18px', cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.6:1, ...style,
    }}>{children}</button>
  );
};
const BtnGhost = ({ children, onClick, danger, style={} }) => {
  const { T } = useTheme();
  return (
    <button onClick={onClick} style={{
      background:'transparent', border:`0.5px solid ${danger?T.red:T.borderMd}`,
      color:danger?T.red:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11,
      letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer', ...style,
    }}>{children}</button>
  );
};

// Data/ora locale → input datetime-local value
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

// ── PDF generator ─────────────────────────────────────────────────────────────
function generatePdf({ report, project, studio }) {
  const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
  const W = 210, ml = 20, mr = 20, cw = W - ml - mr;
  let y = 20;

  // ── Intestazione studio ──────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(19, 49, 92); // T.navy approx
  doc.text(studio?.name || "Studio", ml, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);

  const studioLines = [
    [studio?.indirizzo, studio?.città, studio?.cap].filter(Boolean).join(", "),
    studio?.piva ? `P.IVA: ${studio.piva}` : "",
  ].filter(Boolean);
  studioLines.forEach(line => { doc.text(line, ml, y); y += 4.5; });

  // Linea divisoria
  y += 3;
  doc.setDrawColor(19, 49, 92);
  doc.setLineWidth(0.5);
  doc.line(ml, y, W - mr, y);
  y += 8;

  // ── Titolo report ────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(19, 49, 92);
  const titleText = (report.titolo || "Report di Cantiere").toUpperCase();
  doc.text(titleText, W / 2, y, { align:"center" });
  y += 12;

  // ── Metadati ─────────────────────────────────────────────────────
  const meta = [
    ["Progetto",        project?.name || "—"],
    ["Cliente",         project?.client || "—"],
    ["Luogo",           report.luogo || project?.address || "—"],
    ["Data e ora",      formatDt(report.data_ora)],
    ["Sopralluogo N.",  String(report.numero)],
  ];

  doc.setFont("helvetica", "normal");
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
      headStyles: {
        fillColor: [19, 49, 92], textColor: [255,255,255],
        fontStyle:"bold", fontSize:8, cellPadding:3,
      },
      bodyStyles: { fontSize:8, cellPadding:3, textColor:[30,30,30] },
      alternateRowStyles: { fillColor:[245,247,250] },
      tableLineWidth: 0.1,
      tableLineColor: [200,200,200],
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ── Contenuto ────────────────────────────────────────────────────
  if (report.contenuto?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(19, 49, 92);
    doc.text("REPORT", ml, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(report.contenuto, cw);
    // page break handling
    lines.forEach(line => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, ml, y);
      y += 5.5;
    });
  }

  // ── Footer ───────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(160, 160, 160);
    doc.text(`${studio?.name || ""} — Report di Cantiere`, ml, 290);
    doc.text(`Pagina ${i} di ${totalPages}`, W - mr, 290, { align:"right" });
  }

  const safeTitle = (report.titolo || "report").replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "report";
  doc.save(`${safeTitle}_sopralluogo_${report.numero}.pdf`);
}

// ── EMPTY FORM ────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  titolo: "",
  luogo: "",
  data_ora: new Date().toISOString(),
  contenuto: "",
  presenti: [],
});

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function ReportCantierePanel({ projectId, studioId }) {
  const { T } = useTheme();
  const inputSt = inputCss(T);

  const [open, setOpen]         = useState(false);
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [project, setProject]   = useState(null);
  const [studio, setStudio]     = useState(null);
  const [contacts, setContacts] = useState([]); // project_contacts + global_contacts

  // view: "list" | "form"
  const [view, setView]         = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]         = useState(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  // ── load ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!projectId || !studioId) return;
    setLoading(true);
    const [{ data:reps }, { data:proj }, { data:st }, { data:ctc }] = await Promise.all([
      supabase.from("report_cantiere").select("*").eq("project_id", projectId).is("deleted_at", null).order("numero", { ascending:false }),
      supabase.from("projects").select("id,name,client,address").eq("id", projectId).single(),
      supabase.from("studios").select("name,indirizzo,città,cap,piva").eq("id", studioId).single(),
      supabase.from("project_contacts").select("*, global_contacts(*)").eq("project_id", projectId),
    ]);
    setReports(reps || []);
    setProject(proj);
    setStudio(st);
    setContacts(ctc || []);
    setLoading(false);
  }, [projectId, studioId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  // ── nuovo report ─────────────────────────────────────────────────
  const openNew = () => {
    const nextNum = (reports[0]?.numero ?? 0) + 1; // reports sorted desc
    const base = emptyForm();
    base.luogo = project?.address || "";
    // Pre-popola presenti dall'anagrafica progetto
    base.presenti = contacts.map(pc => {
      const gc = pc.global_contacts || {};
      return {
        figura:    pc.professional_role || "—",
        azienda:   gc.company || "",
        referente: gc.full_name || "",
        email:     gc.email || "",
        telefono:  gc.phone || "",
      };
    });
    setForm({ ...base, _numero: nextNum });
    setEditingId(null);
    setView("form");
  };

  // ── modifica report ──────────────────────────────────────────────
  const openEdit = (r) => {
    setForm({
      titolo:   r.titolo,
      luogo:    r.luogo,
      data_ora: r.data_ora,
      contenuto:r.contenuto,
      presenti: Array.isArray(r.presenti) ? r.presenti : [],
      _numero:  r.numero,
    });
    setEditingId(r.id);
    setView("form");
  };

  // ── salva ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.titolo.trim()) return;
    setSaving(true);
    const payload = {
      studio:     studioId,
      project_id: projectId,
      numero:     form._numero || 1,
      titolo:     form.titolo.trim(),
      luogo:      form.luogo.trim(),
      data_ora:   form.data_ora || new Date().toISOString(),
      contenuto:  form.contenuto,
      presenti:   form.presenti,
      updated_at: new Date().toISOString(),
    };
    if (editingId) {
      await supabase.from("report_cantiere").update(payload).eq("id", editingId);
    } else {
      await supabase.from("report_cantiere").insert(payload);
    }
    setSaving(false);
    setView("list");
    setEditingId(null);
    load();
  };

  // ── elimina ──────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    await supabase.rpc("elimina_report_cantiere", { p_id: id });
    setConfirmDel(null);
    load();
  };

  // ── presenti helpers ─────────────────────────────────────────────
  const updatePresente = (idx, field, value) => {
    setForm(f => {
      const arr = [...f.presenti];
      arr[idx] = { ...arr[idx], [field]: value };
      return { ...f, presenti: arr };
    });
  };
  const addPresente = () => setForm(f => ({
    ...f, presenti: [...f.presenti, { figura:"", azienda:"", referente:"", email:"", telefono:"" }]
  }));
  const removePresente = (idx) => setForm(f => ({
    ...f, presenti: f.presenti.filter((_,i) => i !== idx)
  }));

  // ── widget button ─────────────────────────────────────────────────
  const widget = (
    <button onClick={() => setOpen(true)} style={{
      display:'flex', alignItems:'center', gap:8,
      border:`0.5px solid ${reports.length > 0 ? T.navy : T.borderMd}`,
      background: reports.length > 0 ? T.navyLight : 'transparent',
      padding:'6px 12px', cursor:'pointer',
    }}>
      <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color: reports.length > 0 ? T.navy : T.muted, fontWeight:600 }}>
        Report
      </span>
      {reports.length > 0 ? (
        <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.navy, border:`0.5px solid ${T.navy}`, padding:'1px 6px' }}>
          {reports.length}
        </span>
      ) : (
        <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>+ Crea</span>
      )}
    </button>
  );

  // ── MODAL ─────────────────────────────────────────────────────────
  const modal = open && (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(14,14,13,0.55)', padding:16 }}>
      <div style={{ width:'100%', maxWidth:780, background:T.surface, border:`0.5px solid ${T.borderMd}`, maxHeight:'92vh', overflowY:'auto', display:'flex', flexDirection:'column' }}>

        {/* Header modal */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 28px 16px', borderBottom:`0.5px solid ${T.border}`, position:'sticky', top:0, background:T.surface, zIndex:1 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {view === "form" && (
                <button onClick={() => { setView("list"); setEditingId(null); }} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:16, padding:0, marginRight:4 }}>←</button>
              )}
              <div style={{ fontSize:16, fontWeight:600, color:T.ink, letterSpacing:'-0.02em' }}>
                {view === "list" ? "Report di Cantiere" : editingId ? "Modifica Report" : "Nuovo Report"}
              </div>
              <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:'#fff', background:T.green, padding:'2px 7px', borderRadius:3 }}>BETA</span>
            </div>
            <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:3 }}>
              {project?.name}{project?.client ? ` · ${project.client}` : ""}
            </div>
          </div>
          <button onClick={() => { setOpen(false); setView("list"); setEditingId(null); }}
            style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:22, lineHeight:1 }}>×</button>
        </div>

        <div style={{ padding:'20px 28px', flex:1 }}>

          {/* ── LISTA REPORT ── */}
          {view === "list" && (
            <>
              {loading ? (
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, textAlign:'center', padding:'40px 0' }}>Caricamento...</div>
              ) : reports.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0' }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>📋</div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, marginBottom:20 }}>Nessun report ancora</div>
                  <BtnPrimary onClick={openNew}>+ Crea primo report</BtnPrimary>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
                    <BtnPrimary onClick={openNew}>+ Nuovo report</BtnPrimary>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {reports.map(r => {
                      const isDel = confirmDel === r.id;
                      return (
                        <div key={r.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:T.bg, border:`0.5px solid ${T.border}` }}>
                          {/* Numero badge */}
                          <div style={{ width:36, height:36, background:T.navyLight, border:`0.5px solid ${T.navy}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, fontWeight:700, color:T.navy }}>#{r.numero}</span>
                          </div>
                          {/* Info */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:14, fontWeight:600, color:T.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.titolo || "Senza titolo"}</div>
                            <div style={{ display:'flex', gap:12, marginTop:2, flexWrap:'wrap' }}>
                              <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>{formatDt(r.data_ora)}</span>
                              {r.luogo && <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>{r.luogo}</span>}
                              {Array.isArray(r.presenti) && r.presenti.length > 0 && (
                                <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>{r.presenti.length} presenti</span>
                              )}
                            </div>
                          </div>
                          {/* Azioni */}
                          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                            {isDel ? (
                              <>
                                <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, alignSelf:'center' }}>Sicuro?</span>
                                <button onClick={() => handleDelete(r.id)} style={{ border:`0.5px solid ${T.red}`, background:'transparent', color:T.red, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, padding:'4px 10px', cursor:'pointer' }}>Sì</button>
                                <button onClick={() => setConfirmDel(null)} style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, padding:'4px 10px', cursor:'pointer' }}>No</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => generatePdf({ report:r, project, studio })}
                                  style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.navy, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.05em', padding:'4px 10px', cursor:'pointer' }}>
                                  ↓ PDF
                                </button>
                                <button onClick={() => openEdit(r)}
                                  style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.05em', padding:'4px 10px', cursor:'pointer' }}>
                                  Modifica
                                </button>
                                <button onClick={() => setConfirmDel(r.id)}
                                  style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.red, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, padding:'4px 10px', cursor:'pointer' }}>
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

          {/* ── FORM REPORT ── */}
          {view === "form" && (
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

              {/* Titolo */}
              <div>
                <FieldLabel required>Titolo report</FieldLabel>
                <input type="text" value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo:e.target.value }))}
                  placeholder="Es. Verifica tramezzature interne" style={inputSt} />
              </div>

              {/* Luogo + Data/Ora */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <FieldLabel>Luogo</FieldLabel>
                  <input type="text" value={form.luogo} onChange={e => setForm(f => ({ ...f, luogo:e.target.value }))}
                    placeholder="Via e città del cantiere" style={inputSt} />
                </div>
                <div>
                  <FieldLabel>Data e ora</FieldLabel>
                  <input type="datetime-local" value={toInputDt(form.data_ora)} onChange={e => setForm(f => ({ ...f, data_ora:fromInputDt(e.target.value) }))}
                    style={inputSt} />
                </div>
              </div>

              {/* Tabella presenti */}
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <FieldLabel>Presenti</FieldLabel>
                  <button onClick={addPresente} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, color:T.navy, fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', padding:'3px 10px', cursor:'pointer' }}>
                    + Aggiungi riga
                  </button>
                </div>

                {form.presenti.length === 0 ? (
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, padding:'12px 0' }}>
                    Nessun presente — clicca "+ Aggiungi riga" o i dati vengono presi dall'Anagrafica progetto
                  </div>
                ) : (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                      <thead>
                        <tr style={{ background:T.bg }}>
                          {["Figura", "Azienda", "Referente", "Email", "Telefono", ""].map(h => (
                            <th key={h} style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, padding:'6px 8px', textAlign:'left', borderBottom:`0.5px solid ${T.border}`, whiteSpace:'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {form.presenti.map((p, i) => (
                          <tr key={i} style={{ borderBottom:`0.5px solid ${T.border}` }}>
                            {["figura","azienda","referente","email","telefono"].map(field => (
                              <td key={field} style={{ padding:'4px 4px' }}>
                                <input type="text" value={p[field] || ""} onChange={e => updatePresente(i, field, e.target.value)}
                                  style={{ ...inputSt, padding:'5px 7px', fontSize:11 }} />
                              </td>
                            ))}
                            <td style={{ padding:'4px 4px' }}>
                              <button onClick={() => removePresente(i)} style={{ background:'none', border:'none', color:T.red, cursor:'pointer', fontSize:14 }}>✕</button>
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
                <FieldLabel>Contenuto del report</FieldLabel>
                <textarea value={form.contenuto} onChange={e => setForm(f => ({ ...f, contenuto:e.target.value }))}
                  placeholder="Descrivi cosa è stato verificato, le prescrizioni operative, l'esito del sopralluogo..."
                  rows={10}
                  style={{ ...inputSt, resize:'vertical', minHeight:180, lineHeight:1.6 }} />
              </div>

              {/* Footer form */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:`0.5px solid ${T.border}` }}>
                <BtnGhost onClick={() => { setView("list"); setEditingId(null); }}>← Indietro</BtnGhost>
                <div style={{ display:'flex', gap:10 }}>
                  <BtnPrimary onClick={handleSave} disabled={saving || !form.titolo.trim()}>
                    {saving ? "Salvataggio..." : editingId ? "Aggiorna" : "Salva report"}
                  </BtnPrimary>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  return (
    <>
      {widget}
      {modal}
    </>
  );
}
