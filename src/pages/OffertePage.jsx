import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style:"currency", currency:"EUR", maximumFractionDigits:2 }).format(Number(v)||0);
}

const STATI = {
  offerta:   { label:'Offerta',   color:'#854d0e', bg:'#fefce8' },
  accettata: { label:'Accettata', color:'#1a6b3c', bg:'#f0fdf4' },
  rifiutata: { label:'Rifiutata', color:'#b91c1c', bg:'#fef2f2' },
};

export default function OffertePage() {
  usePageTitleOnMount("Offerte");
  const navigate  = useNavigate();
  const { studioId } = useStudio();
  const { T } = useTheme();

  const [offerte, setOfferte]   = useState([]);
  const [progetti, setProgetti] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [modalOpen, setModalOpen]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');

  const [form, setForm] = useState({
    numero_offerta:'', nome_offerta:'', cliente:'',
    project_id:'', data_offerta:'',
    importo_offerta_base:'',
    perc_iva1:60, perc_contributo1:5,
    perc_iva2:40, perc_contributo2:4,
    perc_iva_finale:22,
    note:'',
  });

  const loadData = async () => {
    if (!studioId) return;
    const [{ data:off }, { data:proj }] = await Promise.all([
      supabase.from("offerte").select("*").eq("studio",studioId).eq("archived",false).order("created_at",{ascending:false}),
      supabase.from("projects").select("id,name,client").eq("studio",studioId).eq("archived",false).order("name"),
    ]);
    setOfferte(off??[]);
    setProgetti(proj??[]);
    setLoading(false);
  };

  useEffect(()=>{ loadData(); },[studioId]);

  // Calcola importo totale
  const calcTotale = (form) => {
    const base = Number(form.importo_offerta_base)||0;
    const parte1 = base * (Number(form.perc_iva1)||0)/100;
    const contrib1 = parte1 * (Number(form.perc_contributo1)||0)/100;
    const parte2 = base * (Number(form.perc_iva2)||0)/100;
    const contrib2 = parte2 * (Number(form.perc_contributo2)||0)/100;
    const subtot = base + contrib1 + contrib2;
    const iva = subtot * (Number(form.perc_iva_finale)||0)/100;
    return subtot + iva;
  };

  const handleSave = async e => {
    e.preventDefault();
    if (!form.nome_offerta.trim()||!form.cliente.trim()||!form.importo_offerta_base) {
      setFormError('Compila tutti i campi obbligatori'); return;
    }
    setSaving(true); setFormError('');
    const proj = progetti.find(p=>p.id===form.project_id);
    const { error } = await supabase.from("offerte").insert({
      studio: studioId,
      numero_offerta: form.numero_offerta||`OFF.${Date.now()}`,
      nome_offerta: form.nome_offerta.trim(),
      cliente: form.cliente.trim(),
      project_id: form.project_id||null,
      project_name: proj?.name||null,
      data_offerta: form.data_offerta||null,
      importo_offerta_base: Number(form.importo_offerta_base),
      perc_iva1: Number(form.perc_iva1),
      perc_contributo1: Number(form.perc_contributo1),
      perc_iva2: Number(form.perc_iva2),
      perc_contributo2: Number(form.perc_contributo2),
      perc_iva_finale: Number(form.perc_iva_finale),
      importo_totale: calcTotale(form),
      note: form.note||null,
      stato: 'offerta',
    });
    if (error) { setFormError(error.message); setSaving(false); return; }
    setModalOpen(false);
    setForm({ numero_offerta:'', nome_offerta:'', cliente:'', project_id:'', data_offerta:'', importo_offerta_base:'', perc_iva1:60, perc_contributo1:5, perc_iva2:40, perc_contributo2:4, perc_iva_finale:22, note:'' });
    await loadData();
    setSaving(false);
  };

  const handleAccetta = async (offerta) => {
    if (!confirm(`Accettare l'offerta "${offerta.nome_offerta}" e creare la commessa?`)) return;
    // Crea commessa
    const { data:commessa, error:cErr } = await supabase.from("commesse").insert({
      studio: studioId,
      numero_offerta: offerta.numero_offerta,
      nome_commessa: offerta.nome_offerta,
      cliente: offerta.cliente,
      client_id: offerta.client_id||null,
      project_id: offerta.project_id||null,
      project_name: offerta.project_name||null,
      data_commessa: offerta.data_offerta||null,
      importo_offerta_base: offerta.importo_offerta_base,
      perc_iva1: offerta.perc_iva1,
      perc_contributo1: offerta.perc_contributo1,
      perc_iva2: offerta.perc_iva2,
      perc_contributo2: offerta.perc_contributo2,
      perc_iva_finale: offerta.perc_iva_finale,
      importo_totale: offerta.importo_totale,
      stato_pagamento: 'non_iniziato',
    }).select().single();
    if (cErr) { alert('Errore creazione commessa: '+cErr.message); return; }
    // Aggiorna offerta
    await supabase.from("offerte").update({ stato:'accettata', commessa_id:commessa.id }).eq("id",offerta.id);
    await loadData();
    navigate(`/commesse/${commessa.id}`);
  };

  const handleRifiuta = async (offerta) => {
    if (!confirm(`Rifiutare l'offerta "${offerta.nome_offerta}"?`)) return;
    await supabase.from("offerte").update({ stato:'rifiutata' }).eq("id",offerta.id);
    await loadData();
  };

  const handleRipristina = async (offerta) => {
    await supabase.from("offerte").update({ stato:'offerta' }).eq("id",offerta.id);
    await loadData();
  };

  const visibili = useMemo(()=>
    filtroStato === 'tutti' ? offerte : offerte.filter(o=>o.stato===filtroStato)
  ,[offerte,filtroStato]);

  // KPI
  const nOfferte   = offerte.filter(o=>o.stato==='offerta').length;
  const nAccettate = offerte.filter(o=>o.stato==='accettata').length;
  const nRifiutate = offerte.filter(o=>o.stato==='rifiutata').length;
  const valOfferte = offerte.filter(o=>o.stato==='offerta').reduce((s,o)=>s+Number(o.importo_totale||o.importo_offerta_base||0),0);
  const valAccettate = offerte.filter(o=>o.stato==='accettata').reduce((s,o)=>s+Number(o.importo_totale||o.importo_offerta_base||0),0);

  const mono = { fontFamily:"'IBM Plex Mono', monospace" };
  const inputSt = { width:'100%', padding:'8px 12px', boxSizing:'border-box', border:`0.5px solid ${T.borderMd}`, background:T.inputBg, color:T.inputText, fontSize:13, fontFamily:"'Space Grotesk', sans-serif", outline:'none' };
  const labelSt = { ...mono, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:6, display:'block' };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240, ...mono, fontSize:11, color:T.muted }}>Caricamento...</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.ink, marginBottom:4 }}>Offerte</div>
          <div style={{ ...mono, fontSize:10, color:T.muted }}>{offerte.length} offerte totali</div>
        </div>
        <button onClick={()=>setModalOpen(true)} style={{ background:T.navy, color:'#EEF1F6', border:'none', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'9px 20px', cursor:'pointer' }}>
          + Nuova offerta
        </button>
      </div>

      {/* KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'In corso',    value:nOfferte,           sub:currency(valOfferte),   color:T.ink  },
          { label:'Accettate',   value:nAccettate,         sub:currency(valAccettate), color:T.green},
          { label:'Rifiutate',   value:nRifiutate,         sub:'',                     color:T.muted},
          { label:'Tasso accettazione', value: offerte.length>0?`${Math.round((nAccettate/offerte.length)*100)}%`:'—', sub:'', color:T.navy },
        ].map((k,i)=>(
          <div key={i} style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'16px 20px' }}>
            <div style={{ ...mono, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:24, fontWeight:600, letterSpacing:'-0.03em', color:k.color }}>{k.value}</div>
            {k.sub && <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:4 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filtri stato */}
      <div style={{ display:'flex', border:`0.5px solid ${T.borderMd}`, width:'fit-content', overflow:'hidden' }}>
        {[['tutti','Tutte'],['offerta','In corso'],['accettata','Accettate'],['rifiutata','Rifiutate']].map(([id,label])=>(
          <button key={id} onClick={()=>setFiltroStato(id)} style={{
            padding:'7px 16px', border:'none', cursor:'pointer',
            background: filtroStato===id ? T.navy : 'transparent',
            color: filtroStato===id ? '#EEF1F6' : T.muted,
            ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase',
          }}>{label}</button>
        ))}
      </div>

      {/* Lista offerte */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:10 }}>
        {visibili.length === 0 ? (
          <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'48px 0', textAlign:'center', gridColumn:'1/-1' }}>
            <div style={{ ...mono, fontSize:11, color:T.muted }}>Nessuna offerta</div>
          </div>
        ) : visibili.map(o => {
          const st = STATI[o.stato]||STATI.offerta;
          const valore = Number(o.importo_totale||o.importo_offerta_base||0);
          return (
            <div key={o.id} style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'18px 20px', display:'flex', flexDirection:'column', gap:10 }}>
              {/* Header card */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ ...mono, fontSize:9, color:T.muted, marginBottom:4 }}>{o.numero_offerta}</div>
                  <div style={{ fontSize:14, fontWeight:600, color:T.ink, marginBottom:2 }}>{o.nome_offerta}</div>
                  <div style={{ ...mono, fontSize:10, color:T.muted }}>{o.cliente}</div>
                </div>
                <span style={{ ...mono, fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:st.color, background:st.bg, padding:'3px 8px', flexShrink:0, borderRadius:2 }}>
                  {st.label}
                </span>
              </div>

              {/* Progetto */}
              {o.project_name && (
                <div style={{ ...mono, fontSize:10, color:T.muted }}>↳ {o.project_name}</div>
              )}

              {/* Valore */}
              <div style={{ fontSize:20, fontWeight:600, letterSpacing:'-0.02em', color:T.navy }}>{currency(valore)}</div>

              {/* Data */}
              {o.data_offerta && (
                <div style={{ ...mono, fontSize:9, color:T.muted }}>
                  Data: {new Date(o.data_offerta).toLocaleDateString('it-IT')}
                </div>
              )}

              {/* Azioni */}
              <div style={{ display:'flex', gap:6, marginTop:4, paddingTop:10, borderTop:`0.5px solid ${T.border}` }}>
                <button onClick={()=>navigate(`/offerte/${o.id}`)} style={{ flex:1, padding:'7px 0', border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.ink, ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
                  Dettaglio
                </button>
                {o.stato==='offerta' && <>
                  <button onClick={()=>handleAccetta(o)} style={{ flex:1, padding:'7px 0', border:'none', background:T.green, color:'#fff', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
                    Accetta
                  </button>
                  <button onClick={()=>handleRifiuta(o)} style={{ flex:1, padding:'7px 0', border:`0.5px solid ${T.red}`, background:'transparent', color:T.red, ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
                    Rifiuta
                  </button>
                </>}
                {o.stato==='accettata' && o.commessa_id && (
                  <button onClick={()=>navigate(`/commesse/${o.commessa_id}`)} style={{ flex:1, padding:'7px 0', border:`0.5px solid ${T.navy}`, background:'transparent', color:T.navy, ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
                    Vai a commessa
                  </button>
                )}
                {o.stato==='rifiutata' && (
                  <button onClick={()=>handleRipristina(o)} style={{ flex:1, padding:'7px 0', border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.muted, ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
                    Ripristina
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal nuova offerta */}
      {modalOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', padding:16 }}>
          <div style={{ width:'100%', maxWidth:560, background:T.surface, border:`0.5px solid ${T.borderMd}`, padding:28, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
              <div style={{ fontSize:16, fontWeight:600, color:T.ink }}>Nuova offerta</div>
              <button onClick={()=>setModalOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:20 }}>×</button>
            </div>

            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={labelSt}>N° Offerta</label>
                  <input type="text" value={form.numero_offerta} onChange={e=>setForm(p=>({...p,numero_offerta:e.target.value}))} placeholder="OFF.001" style={inputSt}/>
                </div>
                <div>
                  <label style={labelSt}>Data offerta</label>
                  <input type="date" value={form.data_offerta} onChange={e=>setForm(p=>({...p,data_offerta:e.target.value}))} style={inputSt}/>
                </div>
                <div style={{ gridColumn:'span 2' }}>
                  <label style={labelSt}>Nome offerta *</label>
                  <input type="text" value={form.nome_offerta} onChange={e=>setForm(p=>({...p,nome_offerta:e.target.value}))} required autoFocus style={inputSt}/>
                </div>
                <div style={{ gridColumn:'span 2' }}>
                  <label style={labelSt}>Cliente *</label>
                  <input type="text" value={form.cliente} onChange={e=>setForm(p=>({...p,cliente:e.target.value}))} required style={inputSt}/>
                </div>
                <div style={{ gridColumn:'span 2' }}>
                  <label style={labelSt}>Progetto</label>
                  <select value={form.project_id} onChange={e=>setForm(p=>({...p,project_id:e.target.value}))} style={{...inputSt,cursor:'pointer'}}>
                    <option value="">— Nessun progetto —</option>
                    {progetti.map(p=><option key={p.id} value={p.id}>{p.name} — {p.client}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:'span 2' }}>
                  <label style={labelSt}>Importo offerta base (€) *</label>
                  <input type="number" min={0} step={0.01} value={form.importo_offerta_base} onChange={e=>setForm(p=>({...p,importo_offerta_base:e.target.value}))} required style={inputSt}/>
                </div>
                {/* Percentuali */}
                <div>
                  <label style={labelSt}>% IVA parte 1</label>
                  <input type="number" value={form.perc_iva1} onChange={e=>setForm(p=>({...p,perc_iva1:e.target.value}))} style={inputSt}/>
                </div>
                <div>
                  <label style={labelSt}>% Contributo 1</label>
                  <input type="number" value={form.perc_contributo1} onChange={e=>setForm(p=>({...p,perc_contributo1:e.target.value}))} style={inputSt}/>
                </div>
                <div>
                  <label style={labelSt}>% IVA parte 2</label>
                  <input type="number" value={form.perc_iva2} onChange={e=>setForm(p=>({...p,perc_iva2:e.target.value}))} style={inputSt}/>
                </div>
                <div>
                  <label style={labelSt}>% Contributo 2</label>
                  <input type="number" value={form.perc_contributo2} onChange={e=>setForm(p=>({...p,perc_contributo2:e.target.value}))} style={inputSt}/>
                </div>
                <div>
                  <label style={labelSt}>% IVA finale</label>
                  <input type="number" value={form.perc_iva_finale} onChange={e=>setForm(p=>({...p,perc_iva_finale:e.target.value}))} style={inputSt}/>
                </div>
                <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                  <label style={labelSt}>Totale calcolato</label>
                  <div style={{ padding:'8px 12px', background:T.surface2, border:`0.5px solid ${T.border}`, ...mono, fontSize:14, fontWeight:600, color:T.navy }}>
                    {currency(calcTotale(form))}
                  </div>
                </div>
                <div style={{ gridColumn:'span 2' }}>
                  <label style={labelSt}>Note</label>
                  <input type="text" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Note aggiuntive..." style={inputSt}/>
                </div>
              </div>

              {formError && <div style={{ ...mono, fontSize:11, color:T.red }}>{formError}</div>}

              <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:14, borderTop:`0.5px solid ${T.border}` }}>
                <button type="button" onClick={()=>setModalOpen(false)} style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.ink, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>Annulla</button>
                <button type="submit" disabled={saving} style={{ background:T.navy, border:'none', color:'#EEF1F6', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 20px', cursor:saving?'not-allowed':'pointer', opacity:saving?0.6:1 }}>
                  {saving?'Salvataggio...':'Crea offerta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
