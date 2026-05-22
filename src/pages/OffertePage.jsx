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

  const [offerte, setOfferte]           = useState([]);
  const [progetti, setProgetti]         = useState([]);
  const [serviceTemplates, setServiceTemplates] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [annoFiltro, setAnnoFiltro]   = useState(new Date().getFullYear());
  const [modalOpen, setModalOpen]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');
  const [accettaModal, setAccettaModal] = useState(false);
  const [accettaForm, setAccettaForm]   = useState(null);
  const [accettaId, setAccettaId]       = useState(null);

  const [form, setForm] = useState({
    numero_offerta:'', nome_offerta:'', cliente:'',
    project_id:'', data_offerta:'',
    importo_offerta_base:'',
    note:'',
  });

  const loadData = async () => {
    if (!studioId) return;
    const [{ data:off }, { data:proj }, { data:svc }] = await Promise.all([
      supabase.from("offerte").select("*").eq("studio",studioId).eq("archived",false).order("created_at",{ascending:false}),
      supabase.from("projects").select("id,name,client").eq("studio",studioId).eq("archived",false).order("name"),
      supabase.from("service_task_templates").select("*").eq("studio",studioId).order("order",{ascending:true}),
    ]);
    setOfferte(off??[]);
    setProgetti(proj??[]);
    setServiceTemplates(svc??[]);
    setLoading(false);
  };

  useEffect(()=>{ loadData(); },[studioId]);

  const handleSave = async e => {
    e.preventDefault();
    if (!form.nome_offerta.trim()||!form.cliente.trim()||!form.importo_offerta_base) {
      setFormError('Compila tutti i campi obbligatori'); return;
    }
    setSaving(true); setFormError('');

    let projectId = form.project_id||null;
    let projectName = progetti.find(p=>p.id===form.project_id)?.name||null;

    if (form.creaProgetto && form.nuovoProgettoNome?.trim()) {
      const serviziScelti = form.nuovoProgettoServizi || [];
      const { data:newProj, error:pErr } = await supabase.from('projects').insert({
        studio: studioId,
        name: form.nuovoProgettoNome.trim(),
        client: form.cliente.trim(),
        address: form.nuovoProgettoIndirizzo||null,
        status: 'in_corso',
        gantt_enabled: false,
        archived: false,
        servizi_selezionati: serviziScelti,
      }).select().single();
      if (pErr) { setFormError('Errore creazione progetto: '+pErr.message); setSaving(false); return; }
      projectId = newProj.id;
      projectName = newProj.name;
      // Crea task predefinite per i servizi selezionati
      if (serviziScelti.length > 0) {
        const taskRows = [];
        for (const serviceName of serviziScelti) {
          const template = serviceTemplates.find(t => t.service_name === serviceName);
          const taskList = Array.isArray(template?.task_templates) ? template.task_templates : [];
          for (const taskName of taskList) {
            taskRows.push({ project_id: newProj.id, title: taskName, categoria: serviceName, status: 'todo', studio: studioId });
          }
        }
        if (taskRows.length > 0) await supabase.from('tasks').insert(taskRows);
      }
    }

    const { error } = await supabase.from("offerte").insert({
      studio: studioId,
      numero_offerta: form.numero_offerta||`OFF.${Date.now()}`,
      nome_offerta: form.nome_offerta.trim(),
      cliente: form.cliente.trim(),
      project_id: projectId,
      project_name: projectName,
      data_offerta: form.data_offerta||null,
      importo_offerta_base: Number(form.importo_offerta_base),
      perc_iva1: 60, perc_contributo1: 5,
      perc_iva2: 40, perc_contributo2: 4,
      perc_iva_finale: 22,
      importo_totale: Number(form.importo_offerta_base),
      note: form.note||null,
      stato: 'offerta',
    });
    if (error) { setFormError(error.message); setSaving(false); return; }
    setModalOpen(false);
    setForm({ numero_offerta:'', nome_offerta:'', cliente:'', project_id:'', data_offerta:'', importo_offerta_base:'', note:'' });
    await loadData();
    setSaving(false);
  };

  const openAccetta = (o) => {
    setAccettaId(o.id);
    setAccettaForm({
      nome_commessa: o.nome_offerta,
      cliente: o.cliente,
      project_id: o.project_id||'',
      data_commessa: new Date().toISOString().slice(0,10),
      importo_offerta_base: o.importo_offerta_base,
      numero_offerta: o.numero_offerta,
      note: o.note||'',
    });
    setAccettaModal(true);
  };

  const handleConfermaAccetta = async () => {
    setSaving(true);

    let projectId = accettaForm.project_id||null;
    let projectName = progetti.find(p=>p.id===accettaForm.project_id)?.name||null;

    if (!projectId && accettaForm.creaProgetto && accettaForm.nuovoProgettoNome?.trim()) {
      const { data:newProj, error:pErr } = await supabase.from('projects').insert({
        studio: studioId,
        name: accettaForm.nuovoProgettoNome.trim(),
        client: accettaForm.cliente,
        status: 'in_corso',
        gantt_enabled: false,
        archived: false,
      }).select().single();
      if (pErr) { alert('Errore creazione progetto: '+pErr.message); setSaving(false); return; }
      projectId = newProj.id;
      projectName = newProj.name;
      await supabase.from('offerte').update({ project_id:newProj.id, project_name:newProj.name }).eq('id', accettaId);
    }

    const { data:commessa, error:cErr } = await supabase.from('commesse').insert({
      studio: studioId,
      numero_offerta: accettaForm.numero_offerta,
      nome_commessa: accettaForm.nome_commessa,
      cliente: accettaForm.cliente,
      project_id: projectId,
      project_name: projectName,
      data_commessa: accettaForm.data_commessa || new Date().toISOString().slice(0,10),
      importo_offerta_base: Number(accettaForm.importo_offerta_base),
      perc_iva1:60, perc_contributo1:5, perc_iva2:40, perc_contributo2:4, perc_iva_finale:22,
      importo_totale: Number(accettaForm.importo_offerta_base),
      stato_pagamento: 'non_iniziato',
    }).select().single();
    if (cErr) { alert('Errore: '+cErr.message); setSaving(false); return; }
    await supabase.from('offerte').update({ stato:'accettata', commessa_id:commessa.id }).eq('id',accettaId);
    setAccettaModal(false); setSaving(false);
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

  const anniDisponibili = useMemo(() => {
    const anni = new Set();
    anni.add(new Date().getFullYear());
    offerte.forEach(o => {
      const d = o.data_offerta || o.created_at;
      if (d) anni.add(new Date(d).getFullYear());
    });
    return Array.from(anni).sort((a,b)=>b-a);
  }, [offerte]);

  const visibili = useMemo(() => {
    let list = filtroStato === 'tutti' ? offerte : offerte.filter(o=>o.stato===filtroStato);
    if (annoFiltro !== 0) {
      list = list.filter(o => {
        const d = o.data_offerta || o.created_at;
        return d && new Date(d).getFullYear() === annoFiltro;
      });
    }
    return list;
  }, [offerte, filtroStato, annoFiltro]);

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

      {/* Filtri */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <div style={{ display:'flex', border:`0.5px solid ${T.borderMd}`, overflow:'hidden' }}>
          {[['tutti','Tutte'],['offerta','In corso'],['accettata','Accettate'],['rifiutata','Rifiutate']].map(([id,label])=>(
            <button key={id} onClick={()=>setFiltroStato(id)} style={{
              padding:'7px 16px', border:'none', cursor:'pointer',
              background: filtroStato===id ? T.navy : 'transparent',
              color: filtroStato===id ? '#EEF1F6' : T.muted,
              ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase',
            }}>{label}</button>
          ))}
        </div>
        <select value={annoFiltro} onChange={e=>setAnnoFiltro(Number(e.target.value))}
          style={{ padding:'4px 8px', border:`0.5px solid ${T.borderMd}`, background:T.surface, color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, cursor:'pointer', outline:'none', appearance:'auto' }}>
          <option value={0}>Tutti gli anni</option>
          {anniDisponibili.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
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
                  <button onClick={()=>openAccetta(o)} style={{ flex:1, padding:'7px 0', border:'none', background:T.green, color:'#fff', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer' }}>
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
                {/* Toggle crea progetto */}
                <div style={{ gridColumn:'span 2', display:'flex', alignItems:'center', gap:10 }}>
                  <input type="checkbox" id="creaProgetto" checked={form.creaProgetto||false}
                    onChange={e=>setForm(p=>({...p,creaProgetto:e.target.checked, project_id:''}))}
                    style={{ accentColor:T.navy, width:14, height:14 }}/>
                  <label htmlFor="creaProgetto" style={{ ...mono, fontSize:11, color:T.ink, cursor:'pointer' }}>
                    Crea nuovo progetto per questa offerta
                  </label>
                </div>
                {form.creaProgetto && (
                  <div style={{ gridColumn:'span 2', display:'flex', flexDirection:'column', gap:10, padding:'14px', background:T.surface2, border:`0.5px solid ${T.border}` }}>
                    <div style={{ ...mono, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:4 }}>Nuovo progetto</div>
                    <div>
                      <label style={labelSt}>Nome progetto *</label>
                      <input type="text" value={form.nuovoProgettoNome||''} onChange={e=>setForm(p=>({...p,nuovoProgettoNome:e.target.value}))} placeholder="Es. Ristrutturazione Villa Bianchi" style={inputSt}/>
                    </div>
                    <div>
                      <label style={labelSt}>Indirizzo</label>
                      <input type="text" value={form.nuovoProgettoIndirizzo||''} onChange={e=>setForm(p=>({...p,nuovoProgettoIndirizzo:e.target.value}))} placeholder="Via Roma 1, Milano" style={inputSt}/>
                    </div>
                    {serviceTemplates.length > 0 && (
                      <div>
                        <label style={labelSt}>Servizi</label>
                        <div style={{ border:`0.5px solid ${T.border}`, background:T.bg, padding:'8px 12px', maxHeight:140, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
                          {serviceTemplates.map(s => {
                            const selected = (form.nuovoProgettoServizi||[]).includes(s.service_name);
                            return (
                              <label key={s.id} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'3px 0' }}>
                                <input type="checkbox" checked={selected}
                                  onChange={() => setForm(p => {
                                    const list = p.nuovoProgettoServizi || [];
                                    return { ...p, nuovoProgettoServizi: selected ? list.filter(x=>x!==s.service_name) : [...list, s.service_name] };
                                  })}
                                  style={{ accentColor:T.navy, width:13, height:13 }}/>
                                <span style={{ fontSize:12, color:T.ink, fontFamily:"'Space Grotesk', sans-serif" }}>{s.service_name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ gridColumn:'span 2' }}>
                  <label style={labelSt}>Importo offerta base (€) *</label>
                  <input type="number" min={0} step={0.01} value={form.importo_offerta_base} onChange={e=>setForm(p=>({...p,importo_offerta_base:e.target.value}))} required style={inputSt}/>
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

      {/* Modal accettazione */}
      {accettaModal && accettaForm && (
        <div style={{ position:'fixed', inset:0, zIndex:70, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', padding:16 }}>
          <div style={{ width:'100%', maxWidth:480, background:T.surface, border:`0.5px solid ${T.borderMd}`, padding:28 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:600, color:T.ink }}>Accetta offerta</div>
                <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:2 }}>Verifica i dati prima di creare la commessa</div>
              </div>
              <button onClick={()=>setAccettaModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:20 }}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={labelSt}>Nome commessa</label>
                <input type="text" value={accettaForm.nome_commessa} onChange={e=>setAccettaForm(p=>({...p,nome_commessa:e.target.value}))} style={inputSt}/>
              </div>
              <div>
                <label style={labelSt}>Cliente</label>
                <input type="text" value={accettaForm.cliente} onChange={e=>setAccettaForm(p=>({...p,cliente:e.target.value}))} style={inputSt}/>
              </div>
              <div>
                <label style={labelSt}>Progetto</label>
                <select value={accettaForm.project_id} onChange={e=>setAccettaForm(p=>({...p,project_id:e.target.value}))} style={{...inputSt,cursor:'pointer'}}>
                  <option value="">— Nessun progetto —</option>
                  {progetti.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {!accettaForm.project_id && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <input type="checkbox" id="creaProgettoAccetta" checked={accettaForm.creaProgetto||false}
                      onChange={e=>setAccettaForm(p=>({...p,creaProgetto:e.target.checked}))}
                      style={{ accentColor:T.navy, width:14, height:14 }}/>
                    <label htmlFor="creaProgettoAccetta" style={{ ...mono, fontSize:11, color:T.ink, cursor:'pointer' }}>
                      Crea nuovo progetto per questa commessa
                    </label>
                  </div>
                  {accettaForm.creaProgetto && (
                    <div style={{ padding:'12px', background:T.surface2, border:`0.5px solid ${T.border}` }}>
                      <label style={labelSt}>Nome progetto *</label>
                      <input type="text" value={accettaForm.nuovoProgettoNome||''} onChange={e=>setAccettaForm(p=>({...p,nuovoProgettoNome:e.target.value}))} placeholder="Es. Ristrutturazione Villa Bianchi" style={inputSt}/>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label style={labelSt}>Data commessa</label>
                <input type="date" value={accettaForm.data_commessa} onChange={e=>setAccettaForm(p=>({...p,data_commessa:e.target.value}))} style={inputSt}/>
              </div>
              <div>
                <label style={labelSt}>Importo base (€)</label>
                <input type="number" value={accettaForm.importo_offerta_base} onChange={e=>setAccettaForm(p=>({...p,importo_offerta_base:e.target.value}))} style={inputSt}/>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, paddingTop:14, borderTop:`0.5px solid ${T.border}` }}>
              <button onClick={()=>setAccettaModal(false)} style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.ink, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>Annulla</button>
              <button onClick={handleConfermaAccetta} disabled={saving} style={{ background:T.green, border:'none', color:'#fff', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 20px', cursor:'pointer', opacity:saving?0.6:1 }}>
                {saving?'Creazione...':'Crea commessa →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
