import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useEscKey } from "../hooks/useEscKey";
import { useToast } from "../contexts/ToastContext";

// ── TIPI E CATEGORIE ──────────────────────────────────────────────
const CATEGORIE = [
  { id:"edilizia",  label:"Edilizia",         icon:"🏗️" },
  { id:"osap",      label:"OSAP",              icon:"🚧" },
  { id:"insegne",   label:"Insegne",           icon:"🪧" },
  { id:"scia_comm", label:"SCIA Commerciale",  icon:"🏪" },
  { id:"catasto",   label:"Catasto",           icon:"📐" },
];

const TIPI_EDILIZIA = ["CILA","SCIA art. 22","SCIA art. 23","Permesso a Costruire"];
const TIPI_CATASTO  = ["Variazione catastale","Aggiornamento planimetria","Fusione / Frazionamento","Altro"];
const TIPI_VARIANTE = ["Variante essenziale","Variante non essenziale","Variante in corso d'opera","Variante in sanatoria"];
const SAME_DATE     = ["CILA","SCIA art. 22"];

function catFromTipo(tipo) {
  if (TIPI_EDILIZIA.includes(tipo))   return "edilizia";
  if (tipo === "OSAP")                return "osap";
  if (tipo === "Insegna")             return "insegne";
  if (tipo === "SCIA Commerciale")    return "scia_comm";
  if (TIPI_CATASTO.includes(tipo))    return "catasto";
  return "edilizia";
}

// Varianti e nota testuale serializzate nel campo `note` come JSON
function parseNote(raw) {
  if (!raw) return { nota:"", varianti:[] };
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object") return { nota: p.note||"", varianti: p.varianti||[] };
  } catch {}
  return { nota: raw, varianti:[] };
}
function serializeNote(nota, varianti) {
  if (!varianti?.length) return nota||null;
  return JSON.stringify({ note: nota||"", varianti });
}

const EMPTY_FORM = {
  categoria:"", tipo_pratica:"", protocollo:"",
  data_presentazione:"", data_protocollazione:"",
  data_fine_lavori:"", nota:"", varianti:[],
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT", { day:"numeric", month:"short", year:"numeric" });
}

// ── FIELD LABEL ───────────────────────────────────────────────────
function FieldLabel({ children, required, T }) {
  return (
    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:"0.2em", textTransform:"uppercase", color:T.muted, marginBottom:5 }}>
      {children}{required && <span style={{ color:T.red, marginLeft:2 }}>*</span>}
    </div>
  );
}

// ── MODAL VARIANTI ────────────────────────────────────────────────
function VariantiModal({ pratica, onClose, onSaved }) {
  const { T } = useTheme();
  const showToast = useToast();
  const mono = { fontFamily:"'IBM Plex Mono', monospace" };
  const inputSt = {
    width:"100%", padding:"7px 10px", boxSizing:"border-box",
    border:`0.5px solid ${T.borderMd}`, borderRadius:T.radiusSm,
    background:T.surface, color:T.ink, fontSize:12,
    fontFamily:"'Space Grotesk', sans-serif", outline:"none",
  };

  const { varianti: initial } = parseNote(pratica.note);
  const [localV, setLocalV]   = useState(initial);
  const [newV, setNewV]       = useState({ tipo:"", data:"", protocollo:"", nota:"" });
  const [saving, setSaving]   = useState(false);

  useBodyScrollLock(true);
  useEscKey(() => onClose(), true);

  const addVariante = () => {
    if (!newV.tipo) return;
    setLocalV(p => [...p, { ...newV, id: crypto.randomUUID() }]);
    setNewV({ tipo:"", data:"", protocollo:"", nota:"" });
  };
  const removeVariante = (id) => setLocalV(p => p.filter(v => v.id !== id));

  const saveAll = async () => {
    setSaving(true);
    const { nota } = parseNote(pratica.note);
    const noteStr  = serializeNote(nota, localV);
    const { error } = await supabase.from("pratiche_edilizie").update({ note: noteStr }).eq("id", pratica.id);
    setSaving(false);
    if (error) { showToast("Errore: "+error.message); return; }
    showToast("Varianti aggiornate", "success");
    onSaved();
    onClose();
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:80, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(14,14,13,0.6)", padding:16 }}>
      <div style={{ width:"100%", maxWidth:580, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, borderRadius:T.radiusLg, padding:28, maxHeight:"88vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:600, color:T.ink }}>Varianti edilizie</div>
            <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:3 }}>
              {pratica.tipo_pratica}{pratica.protocollo ? ` · ${pratica.protocollo}` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted, fontSize:20, lineHeight:1 }}>×</button>
        </div>

        {/* Lista varianti esistenti */}
        {localV.length > 0 && (
          <div style={{ marginBottom:16, display:"flex", flexDirection:"column", gap:6 }}>
            {localV.map(v => (
              <div key={v.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:T.radiusSm }}>
                <span style={{ ...mono, fontSize:9, color:T.navy, border:`0.5px solid ${T.navy}`, borderRadius:T.radiusSm, padding:"1px 6px", flexShrink:0 }}>{v.tipo}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  {v.protocollo && <span style={{ ...mono, fontSize:10, color:T.ink }}>{v.protocollo}</span>}
                  {v.data && <span style={{ ...mono, fontSize:9, color:T.muted, marginLeft: v.protocollo?8:0 }}>{fmtDate(v.data)}</span>}
                  {v.nota && <span style={{ fontSize:11, color:T.muted, marginLeft:8 }}>{v.nota}</span>}
                </div>
                <button onClick={() => removeVariante(v.id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted, fontSize:15, lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
        )}

        {localV.length === 0 && (
          <div style={{ textAlign:"center", padding:"20px 0 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
            <div style={{ fontSize:24, opacity:0.2 }}>🔀</div>
            <div style={{ ...mono, fontSize:10, color:T.muted }}>Nessuna variante inserita</div>
          </div>
        )}

        {/* Form nuova variante */}
        <div style={{ padding:14, background:T.bg, border:`0.5px solid ${T.border}`, borderRadius:T.radiusSm, marginBottom:16 }}>
          <div style={{ ...mono, fontSize:8, letterSpacing:"0.18em", textTransform:"uppercase", color:T.muted, marginBottom:10 }}>Nuova variante</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ gridColumn:"span 2" }}>
              <FieldLabel T={T} required>Tipo variante</FieldLabel>
              <select value={newV.tipo} onChange={e => setNewV(p => ({ ...p, tipo:e.target.value }))} style={{ ...inputSt, cursor:"pointer" }}>
                <option value="">— Seleziona —</option>
                {TIPI_VARIANTE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel T={T}>N° Protocollo</FieldLabel>
              <input type="text" value={newV.protocollo} onChange={e => setNewV(p => ({ ...p, protocollo:e.target.value }))} placeholder="Es. PG. 12345" style={inputSt}/>
            </div>
            <div>
              <FieldLabel T={T}>Data</FieldLabel>
              <input type="date" value={newV.data} onChange={e => setNewV(p => ({ ...p, data:e.target.value }))} style={{ ...inputSt, fontFamily:"'IBM Plex Mono', monospace", fontSize:11 }}/>
            </div>
            <div style={{ gridColumn:"span 2" }}>
              <FieldLabel T={T}>Note</FieldLabel>
              <input type="text" value={newV.nota} onChange={e => setNewV(p => ({ ...p, nota:e.target.value }))} placeholder="Note sulla variante..." style={inputSt}/>
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:10 }}>
            <button onClick={addVariante} disabled={!newV.tipo} style={{ ...mono, fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", padding:"6px 14px", background:T.navy, color:T.bg, border:"none", borderRadius:T.radiusSm, cursor:newV.tipo?"pointer":"not-allowed", opacity:newV.tipo?1:0.5 }}>
              + Aggiungi
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, paddingTop:14, borderTop:`0.5px solid ${T.border}` }}>
          <button onClick={onClose} style={{ ...mono, fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", padding:"8px 18px", border:`0.5px solid ${T.borderMd}`, borderRadius:T.radiusSm, background:"transparent", color:T.ink, cursor:"pointer" }}>
            Annulla
          </button>
          <button onClick={saveAll} disabled={saving} style={{ ...mono, fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", padding:"8px 20px", background:T.navy, color:T.bg, border:"none", borderRadius:T.radiusSm, cursor:saving?"not-allowed":"pointer", opacity:saving?0.6:1 }}>
            {saving ? "Salvataggio..." : "Salva varianti"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPALE ─────────────────────────────────────────
export default function PraticaEdiliziaPanel({ projectId, studioId }) {
  const { T } = useTheme();
  const showToast = useToast();

  const mono = { fontFamily:"'IBM Plex Mono', monospace" };
  const inputSt = {
    width:"100%", padding:"7px 10px", boxSizing:"border-box",
    border:`0.5px solid ${T.borderMd}`, borderRadius:T.radiusSm,
    background:T.surface, color:T.ink, fontSize:12,
    fontFamily:"'Space Grotesk', sans-serif", outline:"none",
  };

  const [pratiche, setPratiche]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  const [listOpen, setListOpen]   = useState(false);
  const [formOpen, setFormOpen]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);

  const [variantiOpen, setVariantiOpen]           = useState(false);
  const [variantePraticaId, setVariantePraticaId] = useState(null);

  // Blocca scroll solo quando non c'è il modale varianti (che ha suo lock)
  useBodyScrollLock(listOpen && !variantiOpen);
  useBodyScrollLock(formOpen && !variantiOpen);
  useEscKey(() => {
    if (variantiOpen) return; // gestito da VariantiModal
    if (formOpen)  { setFormOpen(false);  return; }
    if (listOpen)  { setListOpen(false);  }
  }, (listOpen || formOpen) && !variantiOpen);

  // ── LOAD ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId || !studioId) return;
    load();
  }, [projectId, studioId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pratiche_edilizie").select("*")
      .eq("project_id", projectId).order("created_at", { ascending:true });
    setPratiche(data || []);
    setLoading(false);
  };

  // ── APRI FORM ────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (p) => {
    const { nota, varianti } = parseNote(p.note);
    setEditingId(p.id);
    setForm({
      categoria:            catFromTipo(p.tipo_pratica),
      tipo_pratica:         p.tipo_pratica||"",
      protocollo:           p.protocollo||"",
      data_presentazione:   p.data_presentazione||"",
      data_protocollazione: p.data_protocollazione||"",
      data_fine_lavori:     p.data_fine_lavori||"",
      nota,
      varianti,
    });
    setFormOpen(true);
  };

  // ── SALVA ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.tipo_pratica) return;
    setSaving(true);
    const payload = {
      project_id:           projectId,
      studio:               studioId,
      tipo_pratica:         form.tipo_pratica,
      protocollo:           form.protocollo||null,
      data_presentazione:   form.data_presentazione||null,
      data_protocollazione: form.data_protocollazione||null,
      data_fine_lavori:     form.data_fine_lavori||null,
      note:                 serializeNote(form.nota, form.varianti),
      updated_at:           new Date().toISOString(),
    };
    if (editingId) {
      const { error } = await supabase.from("pratiche_edilizie").update(payload).eq("id", editingId);
      if (error) { showToast("Errore: "+error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("pratiche_edilizie").insert(payload);
      if (error) { showToast("Errore: "+error.message); setSaving(false); return; }
    }
    showToast(editingId ? "Pratica aggiornata" : "Pratica aggiunta", "success");
    setSaving(false);
    setFormOpen(false);
    load();
  };

  // ── ELIMINA ──────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Eliminare questa pratica?")) return;
    const { error } = await supabase.from("pratiche_edilizie").delete().eq("id", id);
    if (error) { showToast("Errore: "+error.message); return; }
    showToast("Pratica eliminata", "success");
    load();
  };

  // ── AGGIORNAMENTO FORM ────────────────────────────────────────────
  const setField = (k, v) => setForm(p => {
    const n = { ...p, [k]:v };
    if (k==="tipo_pratica") n.categoria = catFromTipo(v);
    if (k==="data_presentazione" && SAME_DATE.includes(n.tipo_pratica)) n.data_protocollazione = v;
    if (k==="data_protocollazione" && SAME_DATE.includes(n.tipo_pratica)) n.data_presentazione = v;
    if (k==="tipo_pratica" && SAME_DATE.includes(v)) {
      if (n.data_presentazione) n.data_protocollazione = n.data_presentazione;
      else if (n.data_protocollazione) n.data_presentazione = n.data_protocollazione;
    }
    return n;
  });

  const variantePratica = variantePraticaId ? pratiche.find(p => p.id === variantePraticaId) : null;

  if (loading) return null;

  const totale = pratiche.length;
  const isSameDate = SAME_DATE.includes(form.tipo_pratica);

  return (
    <>
      {/* ── WIDGET ─────────────────────────────────────────────── */}
      <button onClick={() => setListOpen(true)} style={{
        display:"flex", alignItems:"center", gap:8,
        border:`0.5px solid ${T.navy}`, borderRadius:T.radiusSm,
        background: totale > 0 ? T.navyLight||"rgba(19,49,92,0.07)" : "transparent",
        height:34, padding:"0 12px", cursor:"pointer",
      }}>
        <span style={{ ...mono, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:T.navy, fontWeight:600 }}>
          Pratiche
        </span>
        {totale > 0
          ? <span style={{ ...mono, fontSize:9, color:T.navy, border:`0.5px solid ${T.navy}`, borderRadius:T.radiusSm, padding:"1px 6px" }}>{totale}</span>
          : <span style={{ ...mono, fontSize:9, color:T.muted }}>+ Aggiungi</span>
        }
      </button>

      {/* ── MODAL LISTA ────────────────────────────────────────── */}
      {listOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:60, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(14,14,13,0.5)", padding:16 }}>
          <div style={{ width:"100%", maxWidth:640, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, borderRadius:T.radiusLg, padding:28, maxHeight:"88vh", overflowY:"auto" }}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:600, color:T.ink, letterSpacing:"-0.02em" }}>Pratiche</div>
                <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:3 }}>Autorizzazioni e pratiche collegate al progetto</div>
              </div>
              <button onClick={() => setListOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted, fontSize:20, lineHeight:1 }}>×</button>
            </div>

            {/* Lista */}
            {pratiche.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                <div style={{ fontSize:28, opacity:0.2 }}>📋</div>
                <div style={{ ...mono, fontSize:11, color:T.muted }}>Nessuna pratica inserita</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                {CATEGORIE.map(cat => {
                  const items = pratiche.filter(p => catFromTipo(p.tipo_pratica) === cat.id);
                  if (!items.length) return null;
                  return (
                    <div key={cat.id}>
                      <div style={{ ...mono, fontSize:8, letterSpacing:"0.2em", textTransform:"uppercase", color:T.muted, marginBottom:6, marginTop:4 }}>
                        {cat.icon} {cat.label}
                      </div>
                      {items.map(p => {
                        const { varianti } = parseNote(p.note);
                        const isEdilizia = cat.id === "edilizia";
                        return (
                          <div key={p.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:T.radiusSm, marginBottom:4, flexWrap:"wrap" }}>
                            <span style={{ ...mono, fontSize:9, color:T.navy, border:`0.5px solid ${T.navy}`, borderRadius:T.radiusSm, padding:"1px 7px", flexShrink:0 }}>
                              {p.tipo_pratica}
                            </span>
                            <div style={{ flex:1, minWidth:120 }}>
                              {p.protocollo && <span style={{ ...mono, fontSize:10, color:T.ink }}>{p.protocollo}</span>}
                              {p.data_presentazione && (
                                <span style={{ ...mono, fontSize:9, color:T.muted, marginLeft: p.protocollo?8:0 }}>
                                  pres. {fmtDate(p.data_presentazione)}
                                </span>
                              )}
                              {p.data_fine_lavori && (
                                <span style={{ ...mono, fontSize:9, color:"#1a6b3c", marginLeft:8 }}>
                                  FL {fmtDate(p.data_fine_lavori)}
                                </span>
                              )}
                            </div>
                            {isEdilizia && (
                              <button onClick={() => { setVariantePraticaId(p.id); setVariantiOpen(true); }} style={{
                                ...mono, fontSize:9,
                                color: varianti.length ? T.navy : T.muted,
                                background:"none",
                                border:`0.5px solid ${varianti.length ? T.navy : T.border}`,
                                borderRadius:T.radiusSm, padding:"2px 8px", cursor:"pointer", flexShrink:0,
                              }}>
                                {varianti.length ? `Varianti (${varianti.length})` : "+ Variante"}
                              </button>
                            )}
                            <button onClick={() => openEdit(p)} style={{ ...mono, fontSize:9, color:T.muted, background:"none", border:`0.5px solid ${T.border}`, borderRadius:T.radiusSm, padding:"2px 8px", cursor:"pointer", flexShrink:0 }}>
                              Modifica
                            </button>
                            <button onClick={() => handleDelete(p.id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted, fontSize:15, lineHeight:1, flexShrink:0, padding:"0 2px" }}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer lista */}
            <div style={{ borderTop:`0.5px solid ${T.border}`, paddingTop:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <button onClick={() => setListOpen(false)} style={{ ...mono, fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", padding:"8px 18px", border:`0.5px solid ${T.borderMd}`, borderRadius:T.radiusSm, background:"transparent", color:T.ink, cursor:"pointer" }}>
                Chiudi
              </button>
              <button onClick={openNew} style={{ ...mono, fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", padding:"8px 18px", background:T.navy, color:T.bg, border:"none", borderRadius:T.radiusSm, cursor:"pointer" }}>
                + Aggiungi pratica
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FORM AGGIUNGI / MODIFICA ─────────────────────── */}
      {formOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:70, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(14,14,13,0.55)", padding:16 }}>
          <div style={{ width:"100%", maxWidth:620, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, borderRadius:T.radiusLg, padding:28, maxHeight:"90vh", overflowY:"auto" }}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22 }}>
              <div style={{ fontSize:15, fontWeight:600, color:T.ink, letterSpacing:"-0.02em" }}>
                {editingId ? "Modifica pratica" : "Nuova pratica"}
              </div>
              <button onClick={() => setFormOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted, fontSize:20, lineHeight:1 }}>×</button>
            </div>

            {/* Selezione categoria */}
            <div style={{ marginBottom:18 }}>
              <FieldLabel T={T} required>Categoria</FieldLabel>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {CATEGORIE.map(cat => (
                  <button key={cat.id}
                    onClick={() => {
                      const defaultTipo = cat.id==="osap" ? "OSAP" : cat.id==="insegne" ? "Insegna" : cat.id==="scia_comm" ? "SCIA Commerciale" : "";
                      setForm(p => ({ ...p, categoria:cat.id, tipo_pratica:defaultTipo }));
                    }}
                    style={{
                      ...mono, fontSize:10, letterSpacing:"0.06em", padding:"5px 12px",
                      border:`0.5px solid ${form.categoria===cat.id ? T.navy : T.border}`,
                      borderRadius:T.radiusSm,
                      background: form.categoria===cat.id ? (T.navyLight||"rgba(19,49,92,0.07)") : T.surface,
                      color: form.categoria===cat.id ? T.navy : T.ink,
                      cursor:"pointer",
                    }}>
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campi per categoria */}
            {form.categoria && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

                {/* EDILIZIA */}
                {form.categoria === "edilizia" && <>
                  <div>
                    <FieldLabel T={T} required>Tipo pratica</FieldLabel>
                    <select value={form.tipo_pratica} onChange={e => setField("tipo_pratica", e.target.value)} style={{ ...inputSt, cursor:"pointer" }}>
                      <option value="">— Seleziona —</option>
                      {TIPI_EDILIZIA.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel T={T}>N° Protocollo</FieldLabel>
                    <input type="text" value={form.protocollo} onChange={e => setField("protocollo", e.target.value)} placeholder="Es. PG. 12345" style={inputSt}/>
                  </div>
                  <div>
                    <FieldLabel T={T}>{isSameDate ? "Data pres. / protocollazione" : "Data presentazione"}</FieldLabel>
                    <input type="date" value={form.data_presentazione} onChange={e => setField("data_presentazione", e.target.value)} style={{ ...inputSt, ...mono, fontSize:11 }}/>
                    {isSameDate && form.tipo_pratica && (
                      <div style={{ ...mono, fontSize:8, color:T.muted, marginTop:3 }}>Coincide con protocollazione per {form.tipo_pratica}</div>
                    )}
                  </div>
                  {!isSameDate && (
                    <div>
                      <FieldLabel T={T}>Data protocollazione</FieldLabel>
                      <input type="date" value={form.data_protocollazione} onChange={e => setField("data_protocollazione", e.target.value)} style={{ ...inputSt, ...mono, fontSize:11 }}/>
                    </div>
                  )}
                  <div>
                    <FieldLabel T={T}>Data fine lavori</FieldLabel>
                    <input type="date" value={form.data_fine_lavori} onChange={e => setField("data_fine_lavori", e.target.value)} style={{ ...inputSt, ...mono, fontSize:11 }}/>
                  </div>
                  <div style={{ gridColumn: isSameDate ? "span 2" : "span 1" }}>
                    <FieldLabel T={T}>Note</FieldLabel>
                    <input type="text" value={form.nota} onChange={e => setField("nota", e.target.value)} placeholder="Note aggiuntive..." style={inputSt}/>
                  </div>
                </>}

                {/* OSAP */}
                {form.categoria === "osap" && <>
                  <div style={{ gridColumn:"span 2" }}>
                    <FieldLabel T={T}>N° Protocollo / Autorizzazione</FieldLabel>
                    <input type="text" value={form.protocollo} onChange={e => setField("protocollo", e.target.value)} placeholder="Es. OSP-2024-001" style={inputSt}/>
                  </div>
                  <div>
                    <FieldLabel T={T}>Data inizio</FieldLabel>
                    <input type="date" value={form.data_presentazione} onChange={e => setField("data_presentazione", e.target.value)} style={{ ...inputSt, ...mono, fontSize:11 }}/>
                  </div>
                  <div>
                    <FieldLabel T={T}>Data scadenza</FieldLabel>
                    <input type="date" value={form.data_fine_lavori} onChange={e => setField("data_fine_lavori", e.target.value)} style={{ ...inputSt, ...mono, fontSize:11 }}/>
                  </div>
                  <div style={{ gridColumn:"span 2" }}>
                    <FieldLabel T={T}>Note</FieldLabel>
                    <input type="text" value={form.nota} onChange={e => setField("nota", e.target.value)} placeholder="Note aggiuntive..." style={inputSt}/>
                  </div>
                </>}

                {/* INSEGNE */}
                {form.categoria === "insegne" && <>
                  <div>
                    <FieldLabel T={T}>N° Protocollo</FieldLabel>
                    <input type="text" value={form.protocollo} onChange={e => setField("protocollo", e.target.value)} placeholder="Es. PG. 12345" style={inputSt}/>
                  </div>
                  <div>
                    <FieldLabel T={T}>Data presentazione</FieldLabel>
                    <input type="date" value={form.data_presentazione} onChange={e => setField("data_presentazione", e.target.value)} style={{ ...inputSt, ...mono, fontSize:11 }}/>
                  </div>
                  <div style={{ gridColumn:"span 2" }}>
                    <FieldLabel T={T}>Note</FieldLabel>
                    <input type="text" value={form.nota} onChange={e => setField("nota", e.target.value)} placeholder="Tipo insegna, dimensioni..." style={inputSt}/>
                  </div>
                </>}

                {/* SCIA COMMERCIALE */}
                {form.categoria === "scia_comm" && <>
                  <div>
                    <FieldLabel T={T}>N° Protocollo</FieldLabel>
                    <input type="text" value={form.protocollo} onChange={e => setField("protocollo", e.target.value)} placeholder="Es. PG. 12345" style={inputSt}/>
                  </div>
                  <div>
                    <FieldLabel T={T}>Data presentazione</FieldLabel>
                    <input type="date" value={form.data_presentazione} onChange={e => setField("data_presentazione", e.target.value)} style={{ ...inputSt, ...mono, fontSize:11 }}/>
                  </div>
                  <div style={{ gridColumn:"span 2" }}>
                    <FieldLabel T={T}>Note</FieldLabel>
                    <input type="text" value={form.nota} onChange={e => setField("nota", e.target.value)} placeholder="Attività, metratura..." style={inputSt}/>
                  </div>
                </>}

                {/* CATASTO */}
                {form.categoria === "catasto" && <>
                  <div style={{ gridColumn:"span 2" }}>
                    <FieldLabel T={T} required>Tipo pratica catastale</FieldLabel>
                    <select value={form.tipo_pratica} onChange={e => setField("tipo_pratica", e.target.value)} style={{ ...inputSt, cursor:"pointer" }}>
                      <option value="">— Seleziona —</option>
                      {TIPI_CATASTO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <FieldLabel T={T}>N° Pratica</FieldLabel>
                    <input type="text" value={form.protocollo} onChange={e => setField("protocollo", e.target.value)} placeholder="Es. CAT-2024-001" style={inputSt}/>
                  </div>
                  <div>
                    <FieldLabel T={T}>Data presentazione</FieldLabel>
                    <input type="date" value={form.data_presentazione} onChange={e => setField("data_presentazione", e.target.value)} style={{ ...inputSt, ...mono, fontSize:11 }}/>
                  </div>
                  <div style={{ gridColumn:"span 2" }}>
                    <FieldLabel T={T}>Note</FieldLabel>
                    <input type="text" value={form.nota} onChange={e => setField("nota", e.target.value)} placeholder="Note aggiuntive..." style={inputSt}/>
                  </div>
                </>}

              </div>
            )}

            {/* Footer form */}
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:22, paddingTop:16, borderTop:`0.5px solid ${T.border}` }}>
              <button onClick={() => setFormOpen(false)} style={{ ...mono, fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", padding:"8px 18px", border:`0.5px solid ${T.borderMd}`, borderRadius:T.radiusSm, background:"transparent", color:T.ink, cursor:"pointer" }}>
                Annulla
              </button>
              <button onClick={handleSave} disabled={saving || !form.tipo_pratica}
                style={{ ...mono, fontSize:11, letterSpacing:"0.08em", textTransform:"uppercase", padding:"8px 20px", background:T.navy, color:T.bg, border:"none", borderRadius:T.radiusSm, cursor: saving||!form.tipo_pratica ? "not-allowed" : "pointer", opacity: saving||!form.tipo_pratica ? 0.6 : 1 }}>
                {saving ? "Salvataggio..." : editingId ? "Aggiorna" : "Salva pratica"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL VARIANTI ─────────────────────────────────────── */}
      {variantiOpen && variantePratica && (
        <VariantiModal
          pratica={variantePratica}
          onClose={() => setVariantiOpen(false)}
          onSaved={load}
        />
      )}
    </>
  );
}
