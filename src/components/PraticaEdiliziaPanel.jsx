import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

const TIPI_PRATICA = [
  "CILA",
  "SCIA art. 22",
  "SCIA art. 23",
  "Permesso a Costruire",
];

const SAME_DATE_TYPES = ["CILA", "SCIA art. 22"];

function FieldLabel({ children, required }) {
  const { T } = useTheme();
  return (
    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:5 }}>
      {children}{required && <span style={{ color:T.red, marginLeft:2 }}>*</span>}
    </div>
  );
}

export default function PraticaEdiliziaPanel({ projectId, studioId }) {
  const { T } = useTheme();
  const inputSt = {
    width:'100%', padding:'7px 10px', boxSizing:'border-box',
    border:`0.5px solid ${T.borderMd}`, background:T.surface, color:T.ink,
    fontSize:12, fontFamily:"'Space Grotesk', sans-serif", outline:'none',
  };
  const [pratica, setPratica]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  useBodyScrollLock(modalOpen);
  const [form, setForm] = useState({
    tipo_pratica:'', protocollo:'',
    data_presentazione:'', data_protocollazione:'',
    data_fine_lavori:'', note:'',
  });

  useEffect(() => {
    if (!projectId || !studioId) return;
    loadPratica();
  }, [projectId, studioId]);

  const loadPratica = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pratiche_edilizie").select("*")
      .eq("project_id", projectId).maybeSingle();
    if (data) {
      setPratica(data);
      setForm({
        tipo_pratica:         data.tipo_pratica || "",
        protocollo:           data.protocollo || "",
        data_presentazione:   data.data_presentazione || "",
        data_protocollazione: data.data_protocollazione || "",
        data_fine_lavori:     data.data_fine_lavori || "",
        note:                 data.note || "",
      });
    }
    setLoading(false);
  };

  const handleChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "data_presentazione" && SAME_DATE_TYPES.includes(next.tipo_pratica))
        next.data_protocollazione = value;
      if (field === "data_protocollazione" && SAME_DATE_TYPES.includes(next.tipo_pratica))
        next.data_presentazione = value;
      if (field === "tipo_pratica" && SAME_DATE_TYPES.includes(value)) {
        if (next.data_presentazione) next.data_protocollazione = next.data_presentazione;
        else if (next.data_protocollazione) next.data_presentazione = next.data_protocollazione;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.tipo_pratica) return;
    setSaving(true);
    const payload = {
      project_id: projectId, studio: studioId,
      tipo_pratica: form.tipo_pratica,
      protocollo: form.protocollo || null,
      data_presentazione: form.data_presentazione || null,
      data_protocollazione: form.data_protocollazione || null,
      data_fine_lavori: form.data_fine_lavori || null,
      note: form.note || null,
      updated_at: new Date().toISOString(),
    };
    if (pratica) {
      const { data } = await supabase.from("pratiche_edilizie").update(payload).eq("id", pratica.id).select("*").single();
      if (data) setPratica(data);
    } else {
      const { data } = await supabase.from("pratiche_edilizie").insert(payload).select("*").single();
      if (data) setPratica(data);
    }
    setSaving(false);
    setModalOpen(false);
  };

  const isSameDate = SAME_DATE_TYPES.includes(form.tipo_pratica);
  const fmtDate = d => d ? new Date(d).toLocaleDateString('it-IT', { day:'numeric', month:'short', year:'numeric' }) : '—';

  // ── WIDGET COMPATTO ───────────────────────────────────────────
  const widget = (
    <button onClick={() => setModalOpen(true)} style={{
      display:'flex', alignItems:'center', gap:8,
      border:`0.5px solid ${T.navy}`, background: pratica ? T.navyLight : 'transparent',
      padding:'6px 12px', cursor:'pointer',
    }}>
      <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:T.navy, fontWeight:600 }}>
        Pratica Edilizia
      </span>
      {pratica?.tipo_pratica ? (
        <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.navy, border:`0.5px solid ${T.navy}`, padding:'1px 6px' }}>
          {pratica.tipo_pratica}
        </span>
      ) : (
        <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>
          + Aggiungi
        </span>
      )}
      {pratica?.protocollo && (
        <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>
          {pratica.protocollo}
        </span>
      )}
    </button>
  );

  // ── MODAL ─────────────────────────────────────────────────────
  const modal = modalOpen && (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(14,14,13,0.5)', padding:16 }}>
      <div style={{ width:'100%', maxWidth:680, background:T.surface, border:`0.5px solid ${T.borderMd}`, padding:28, maxHeight:'90vh', overflowY:'auto' }}>

        {/* Header modal */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:T.ink, letterSpacing:'-0.02em' }}>Pratica Edilizia</div>
            <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:3 }}>
              Inserisci i dati della pratica edilizia collegata a questo progetto
            </div>
          </div>
          <button onClick={() => setModalOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:20, lineHeight:1 }}>×</button>
        </div>

        {/* Griglia campi */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

          {/* Tipo pratica */}
          <div>
            <FieldLabel required>Tipo pratica</FieldLabel>
            <select value={form.tipo_pratica} onChange={e => handleChange("tipo_pratica", e.target.value)}
              style={{ ...inputSt, cursor:'pointer' }}>
              <option value="">— Seleziona —</option>
              {TIPI_PRATICA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Protocollo */}
          <div>
            <FieldLabel>N° Protocollo</FieldLabel>
            <input type="text" value={form.protocollo} onChange={e => handleChange("protocollo", e.target.value)}
              placeholder="Es. PG. 12345" style={inputSt}/>
          </div>

          {/* Data presentazione */}
          <div>
            <FieldLabel>
              {isSameDate ? "Data presentazione / protocollazione" : "Data presentazione"}
            </FieldLabel>
            <input type="date" value={form.data_presentazione} onChange={e => handleChange("data_presentazione", e.target.value)}
              style={{ ...inputSt, fontFamily:"'IBM Plex Mono', monospace", fontSize:11 }}/>
            {isSameDate && form.tipo_pratica && (
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted, marginTop:4 }}>
                Per {form.tipo_pratica} la data di presentazione coincide con la protocollazione
              </div>
            )}
          </div>

          {/* Data protocollazione — solo per SCIA 23 e Permesso */}
          {!isSameDate && (
            <div>
              <FieldLabel>Data protocollazione</FieldLabel>
              <input type="date" value={form.data_protocollazione} onChange={e => handleChange("data_protocollazione", e.target.value)}
                style={{ ...inputSt, fontFamily:"'IBM Plex Mono', monospace", fontSize:11 }}/>
            </div>
          )}

          {/* Data fine lavori */}
          <div>
            <FieldLabel>Data fine lavori</FieldLabel>
            <input type="date" value={form.data_fine_lavori} onChange={e => handleChange("data_fine_lavori", e.target.value)}
              style={{ ...inputSt, fontFamily:"'IBM Plex Mono', monospace", fontSize:11 }}/>
          </div>

          {/* Note */}
          <div style={{ gridColumn: isSameDate ? 'span 2' : 'span 1' }}>
            <FieldLabel>Note</FieldLabel>
            <input type="text" value={form.note} onChange={e => handleChange("note", e.target.value)}
              placeholder="Note aggiuntive..." style={inputSt}/>
          </div>

        </div>

        {/* Riepilogo date se già salvata */}
        {pratica?.tipo_pratica && (
          <div style={{ marginTop:20, padding:'12px 14px', background:T.bg, border:`0.5px solid ${T.border}` }}>
            <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:10 }}>
              Riepilogo
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
              {[
                { label:'Tipo', value: pratica.tipo_pratica },
                { label:'Protocollo', value: pratica.protocollo || '—' },
                { label: isSameDate ? 'Presentazione / prot.' : 'Presentazione', value: fmtDate(pratica.data_presentazione) },
                { label:'Fine lavori', value: fmtDate(pratica.data_fine_lavori) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.ink }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, paddingTop:16, borderTop:`0.5px solid ${T.border}` }}>
          <button onClick={() => setModalOpen(false)} style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>
            Annulla
          </button>
          <button onClick={handleSave} disabled={saving || !form.tipo_pratica} style={{ background:T.navy, color:T.bg, border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor: saving || !form.tipo_pratica ? 'not-allowed' : 'pointer', opacity: saving || !form.tipo_pratica ? 0.6 : 1 }}>
            {saving ? "Salvataggio..." : pratica ? "Aggiorna" : "Salva pratica"}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) return null;

  return (
    <>
      {widget}
      {modal}
    </>
  );
}
