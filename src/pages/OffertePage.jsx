import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { useTheme } from "../contexts/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { supabase } from "../lib/supabase";
import { useEscKey } from "../hooks/useEscKey";

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
  const isMobile = useIsMobile();

  const [offerte, setOfferte]           = useState([]);
  const [progetti, setProgetti]         = useState([]);
  const [serviceTemplates, setServiceTemplates] = useState([]);
  const [globalContacts, setGlobalContacts]     = useState([]);
  const [vociTemplates, setVociTemplates]       = useState([]);
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [annoFiltro, setAnnoFiltro]   = useState(new Date().getFullYear());
  const [modalOpen, setModalOpen]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');
  const [accettaModal, setAccettaModal] = useState(false);
  const [accettaForm, setAccettaForm]   = useState(null);
  const [accettaId, setAccettaId]       = useState(null);
  const [allineaModal, setAllineaModal] = useState(false);
  useEscKey(() => {
    if (allineaModal)  { setAllineaModal(false); return; }
    if (accettaModal)  { setAccettaModal(false); return; }
    if (modalOpen)     { setModalOpen(false); }
  }, allineaModal || accettaModal || modalOpen);
  const [offertaOriginale, setOffertaOriginale] = useState(null);

  const [form, setForm] = useState({
    numero_offerta:'', nome_offerta:'', cliente:'',
    project_id:'', data_offerta:'',
    voci: [], sconto: '',
    note:'',
  });

  const loadData = async () => {
    if (!studioId) return;
    const [{ data:off }, { data:proj }, { data:svc }, { data:contacts }, { data:voci }] = await Promise.all([
      supabase.from("offerte").select("*").eq("studio",studioId).eq("archived",false).is("deleted_at",null).order("created_at",{ascending:false}),
      supabase.from("projects").select("id,name,client").eq("studio",studioId).eq("archived",false).order("name"),
      supabase.from("service_task_templates").select("*").eq("studio",studioId).order("order",{ascending:true}),
      supabase.from("global_contacts").select("id,full_name").eq("studio",studioId).order("full_name",{ascending:true}),
      supabase.from("voci_offerta_template").select("*").eq("studio",studioId).order("order",{ascending:true}),
    ]);
    setOfferte(off??[]);
    setProgetti(proj??[]);
    setServiceTemplates(svc??[]);
    setGlobalContacts(contacts??[]);
    setVociTemplates(voci??[]);
    setLoading(false);
  };

  useEffect(()=>{ loadData(); },[studioId]);

  const handleSave = async e => {
    e.preventDefault();
    const sconto = Number(form.sconto)||0;
    const vociScontate = (form.voci||[]).map(v =>
      v.attiva && sconto > 0
        ? { ...v, prezzo: Math.round(Number(v.prezzo||0) * (1 - sconto/100) * 100) / 100 }
        : v
    );
    const importoCalcolato = vociScontate.filter(v=>v.attiva).reduce((s,v)=>s+Number(v.prezzo||0),0);
    if (!form.nome_offerta.trim()||!form.cliente.trim()) {
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
      importo_offerta_base: importoCalcolato,
      voci: vociScontate,
      perc_iva1: 60, perc_contributo1: 5,
      perc_iva2: 40, perc_contributo2: 4,
      perc_iva_finale: 22,
      importo_totale: importoCalcolato,
      note: form.note||null,
      stato: 'offerta',
    });
    if (error) { setFormError(error.message); setSaving(false); return; }
    setModalOpen(false);
    setForm({ numero_offerta:'', nome_offerta:'', cliente:'', project_id:'', data_offerta:'', voci:[], sconto:'', note:'' });
    await loadData();
    setSaving(false);
  };

  const openAccetta = (o) => {
    setAccettaId(o.id);
    setOffertaOriginale(o);
    // Carica voci dall'offerta, o crea riga singola con importo base se non ci sono voci
    const vociSalvate = Array.isArray(o.voci) && o.voci.length > 0
      ? o.voci.map(v => ({ ...v, attiva: v.attiva !== false }))
      : [{ id: 'legacy', nome: o.nome_offerta||'Prestazione', prezzo: Number(o.importo_offerta_base)||0, attiva: true }];
    setAccettaForm({
      nome_commessa: o.nome_offerta,
      cliente: o.cliente,
      project_id: o.project_id||'',
      data_commessa: new Date().toISOString().slice(0,10),
      voci: vociSalvate,
      numero_offerta: o.numero_offerta,
      note: o.note||'',
    });
    setAccettaModal(true);
  };

  const _doCreaNcommessa = async (aggiornaOfferta) => {
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

    const scAcc = Number(accettaForm.sconto)||0;
    const vociAccScontate = (accettaForm.voci||[]).map(v =>
      v.attiva && scAcc > 0
        ? { ...v, prezzo: Math.round(Number(v.prezzo||0) * (1 - scAcc/100) * 100) / 100 }
        : v
    );
    const totaleAccetta = vociAccScontate.filter(v=>v.attiva).reduce((s,v)=>s+Number(v.prezzo||0),0);
    const { data:commessa, error:cErr } = await supabase.from('commesse').insert({
      studio: studioId,
      numero_offerta: accettaForm.numero_offerta,
      nome_commessa: accettaForm.nome_commessa,
      cliente: accettaForm.cliente,
      project_id: projectId,
      project_name: projectName,
      data_commessa: accettaForm.data_commessa || new Date().toISOString().slice(0,10),
      importo_offerta_base: totaleAccetta,
      perc_iva1:60, perc_contributo1:5, perc_iva2:40, perc_contributo2:4, perc_iva_finale:22,
      importo_totale: totaleAccetta,
      stato_pagamento: 'non_iniziato',
    }).select().single();
    if (cErr) { alert('Errore: '+cErr.message); setSaving(false); return; }

    const offerUpdate = { stato:'accettata', commessa_id:commessa.id };
    if (aggiornaOfferta) offerUpdate.importo_offerta_base = totaleAccetta;
    await supabase.from('offerte').update(offerUpdate).eq('id', accettaId);

    setSaving(false);
    setAccettaModal(false);
    setAllineaModal(false);
    await loadData();
    navigate(`/commesse/${commessa.id}`);
  };

  const handleConfermaAccetta = async () => {
    const valoreOriginale = Number(offertaOriginale?.importo_offerta_base);
    const scAcc2 = Number(accettaForm.sconto)||0;
    const valoreNuovo = (accettaForm.voci||[]).filter(v=>v.attiva).reduce((s,v)=>s+Number(v.prezzo||0),0) * (scAcc2>0 ? (1-scAcc2/100) : 1);
    if (valoreNuovo !== valoreOriginale) {
      setAccettaModal(false);
      setAllineaModal(true);
      return;
    }
    await _doCreaNcommessa(false);
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

  const handleElimina = async (offerta) => {
    if (!confirm(`Spostare "${offerta.nome_offerta}" nel cestino?`)) return;
    const { error } = await supabase.rpc('elimina_offerta', { p_offerta_id: offerta.id });
    if (error) { alert('Errore: ' + error.message); return; }
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

  // KPI — filtrati per anno selezionato
  const offerteAnno = annoFiltro === 0 ? offerte : offerte.filter(o => {
    const d = o.data_offerta || o.created_at;
    return d && new Date(d).getFullYear() === annoFiltro;
  });
  const nOfferte    = offerteAnno.filter(o=>o.stato==='offerta').length;
  const nAccettate  = offerteAnno.filter(o=>o.stato==='accettata').length;
  const nRifiutate  = offerteAnno.filter(o=>o.stato==='rifiutata').length;
  const valOfferte   = offerteAnno.filter(o=>o.stato==='offerta').reduce((s,o)=>s+Number(o.importo_totale||o.importo_offerta_base||0),0);
  const valAccettate = offerteAnno.filter(o=>o.stato==='accettata').reduce((s,o)=>s+Number(o.importo_totale||o.importo_offerta_base||0),0);
  const valRifiutate = offerteAnno.filter(o=>o.stato==='rifiutata').reduce((s,o)=>s+Number(o.importo_totale||o.importo_offerta_base||0),0);
  const valTotale    = offerteAnno.reduce((s,o)=>s+Number(o.importo_totale||o.importo_offerta_base||0),0);
  const totaleAnno   = offerteAnno.length;

  const mono = { fontFamily:"'IBM Plex Mono', monospace" };
  const inputSt = { width:'100%', padding:'8px 12px', boxSizing:'border-box', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.inputBg, color:T.inputText, fontSize:13, fontFamily:"'Space Grotesk', sans-serif", outline:'none' };
  const labelSt = { ...mono, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:6, display:'block' };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240, ...mono, fontSize:11, color:T.muted }}>Caricamento...</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.ink, marginBottom:4 }}>Offerte</div>
          <div style={{ ...mono, fontSize:10, color:T.muted }}>{offerte.length} offerte totali</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <select value={annoFiltro} onChange={e=>setAnnoFiltro(Number(e.target.value))}
            style={{ padding:'8px 10px', border:`1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, cursor:'pointer', outline:'none', appearance:'auto' }}>
            <option value={0}>Tutti gli anni</option>
            {anniDisponibili.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={()=>setModalOpen(true)} style={{ background:T.navy, color:'#EEF1F6', border:'none', borderRadius:T.radiusSm, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'9px 20px', cursor:'pointer', whiteSpace:'nowrap' }}>
            + Nuova offerta
          </button>
        </div>
      </div>

      {/* KPI — cliccabili come filtri */}
      <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr 1fr' : 'repeat(5,1fr)', gap:10 }}>
        {[
          { label:'Totale',      value:totaleAnno,  sub:currency(valTotale),    color:T.ink,   filtro:'tutti'     },
          { label:'In corso',    value:nOfferte,    sub:currency(valOfferte),   color:T.ink,   filtro:'offerta'   },
          { label:'Accettate',   value:nAccettate,  sub:currency(valAccettate), color:T.green, filtro:'accettata' },
          { label:'Rifiutate',   value:nRifiutate,  sub:currency(valRifiutate), color:T.muted, filtro:'rifiutata' },
          { label:'Tasso accettazione', value: totaleAnno>0?`${Math.round((nAccettate/totaleAnno)*100)}%`:'—', sub:'', color:T.navy, filtro:null },
        ].map((k,i)=>{
          const isActive = k.filtro && filtroStato === k.filtro;
          return (
            <div key={i}
              onClick={() => k.filtro && setFiltroStato(k.filtro)}
              className={k.filtro ? 'asm-card' : ''}
              style={{
                background: isActive ? T.navyLight : T.surface,
                border: `${isActive ? '2px' : '1px'} solid ${isActive ? T.navy : T.border}`,
                padding:'16px 20px', borderRadius:T.radius,
                backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm,
                boxShadow: isActive ? T.shadowMd : T.shadow,
                cursor: k.filtro ? 'pointer' : 'default',
                transition:'all 0.18s',
              }}>
              <div style={{ ...mono, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color: isActive ? T.navy : T.muted, marginBottom:8 }}>{k.label}</div>
              <div style={{ fontSize:24, fontWeight:600, letterSpacing:'-0.03em', color: isActive ? T.navy : k.color }}>{k.value}</div>
              {k.sub && <div style={{ ...mono, fontSize:10, color: isActive ? T.navy : T.muted, marginTop:4 }}>{k.sub}</div>}
            </div>
          );
        })}
      </div>

      {/* Lista offerte */}
      <div className="asm-list asm-fade-in" style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'repeat(auto-fill,minmax(320px,1fr))', gap:10 }}>
        {visibili.length === 0 ? (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'48px 0', textAlign:'center', gridColumn:'1/-1', borderRadius:T.radius }}>
            <div style={{ ...mono, fontSize:11, color:T.muted }}>Nessuna offerta</div>
          </div>
        ) : visibili.map(o => {
          const st = STATI[o.stato]||STATI.offerta;
          const valore = Number(o.importo_totale||o.importo_offerta_base||0);
          return (
            <div key={o.id} className="asm-card" onClick={() => navigate(`/offerte/${o.id}`)} style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'18px 20px', display:'flex', flexDirection:'column', gap:10, height:'100%', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow, cursor:'pointer' }}>
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
              <div onClick={e => e.stopPropagation()} style={{ display:'flex', flexWrap:'nowrap', alignItems:'center', gap:6, marginTop:'auto', paddingTop:10, borderTop:`0.5px solid ${T.border}` }}>
                {o.stato==='offerta' && <>
                  <button onClick={()=>openAccetta(o)} style={{ flex:1, minWidth:0, padding:'7px 6px', border:'none', background:T.green, color:'#fff', borderRadius:T.radiusSm, ...mono, fontSize:10, letterSpacing:'0.05em', textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    Accetta
                  </button>
                  <button onClick={()=>handleRifiuta(o)} style={{ flex:1, minWidth:0, padding:'7px 6px', border:`1px solid ${T.red}`, background:'transparent', color:T.red, borderRadius:T.radiusSm, ...mono, fontSize:10, letterSpacing:'0.05em', textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    Rifiuta
                  </button>
                </>}
                {o.stato==='accettata' && o.commessa_id && (
                  <button onClick={e => { e.stopPropagation(); navigate(`/commesse/${o.commessa_id}`); }} style={{ flex:1, minWidth:0, padding:'7px 6px', border:`1px solid ${T.navy}`, background:'transparent', color:T.navy, borderRadius:T.radiusSm, ...mono, fontSize:10, letterSpacing:'0.05em', textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    Vai a commessa
                  </button>
                )}
                {o.stato==='rifiutata' && (
                  <button onClick={()=>handleRipristina(o)} style={{ flex:1, minWidth:0, padding:'7px 6px', border:`1px solid ${T.borderMd}`, background:'transparent', color:T.muted, borderRadius:T.radiusSm, ...mono, fontSize:10, letterSpacing:'0.05em', textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    Ripristina
                  </button>
                )}
                <button onClick={()=>handleElimina(o)} style={{ flexShrink:0, padding:'7px 10px', border:`1px solid ${T.border}`, background:'transparent', color:T.muted, borderRadius:T.radiusSm, ...mono, fontSize:10, cursor:'pointer', lineHeight:1 }}>
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal nuova offerta */}
      {modalOpen && (
        <div className="asm-modal-bg" style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div className="asm-modal-content" style={{ width:'100%', maxWidth:560, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, boxShadow:T.shadowLg, borderRadius:T.radiusLg, padding:28, maxHeight:'90vh', overflowY:'auto' }}>
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
                <div style={{ gridColumn:'span 2', position:'relative' }}>
                  <label style={labelSt}>Cliente *</label>
                  <input type="text" value={form.cliente} autoComplete="off" required style={inputSt}
                    onChange={e => {
                      const val = e.target.value;
                      setForm(p=>({...p, cliente: val}));
                      const q = val.trim().toLowerCase();
                      setClientSuggestions(q.length >= 3
                        ? globalContacts.filter(c=>(c.full_name||'').toLowerCase().includes(q)).slice(0,8)
                        : []);
                    }}
                    onBlur={() => setTimeout(()=>setClientSuggestions([]), 150)}
                  />
                  {clientSuggestions.length > 0 && (
                    <div style={{ position:'absolute', left:0, right:0, top:'100%', background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, borderRadius:12, boxShadow:T.shadowMd, zIndex:50, maxHeight:200, overflowY:'auto' }}>
                      {clientSuggestions.map(c => (
                        <button key={c.id} type="button" onMouseDown={() => { setForm(p=>({...p,cliente:c.full_name})); setClientSuggestions([]); }}
                          style={{ display:'block', width:'100%', padding:'9px 12px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontSize:13, color:T.ink, fontFamily:"'Space Grotesk', sans-serif" }}>
                          {c.full_name}
                        </button>
                      ))}
                    </div>
                  )}
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
                  <div style={{ gridColumn:'span 2', display:'flex', flexDirection:'column', gap:10, padding:'14px', background:T.surface2, border:`1px solid ${T.border}` }}>
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
                        <div style={{ border:`1px solid ${T.border}`, borderRadius: T.radiusSm, background:T.bg, padding:'8px 12px', maxHeight:140, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
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
                  <label style={labelSt}>Voci offerta</label>
                  {/* Carica preset se voci è vuoto e si apre il modal */}
                  <div style={{ border:`1px solid ${T.border}`, borderRadius:T.radiusSm, overflow:'hidden', marginBottom:8 }}>
                    {(form.voci||[]).map((v,i) => (
                      <div key={v.id||i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderBottom:i<(form.voci||[]).length-1?`0.5px solid ${T.border}`:'none', background:v.attiva?'transparent':T.surface2 }}>
                        <input type="checkbox" checked={v.attiva} onChange={()=>setForm(p=>({...p,voci:p.voci.map((x,j)=>j===i?{...x,attiva:!x.attiva}:x)}))} style={{accentColor:T.navy,width:13,height:13,flexShrink:0}}/>
                        <input type="text" value={v.nome} onChange={e=>{const val=e.target.value;setForm(p=>({...p,voci:p.voci.map((x,j)=>j===i?{...x,nome:val}:x)}));}} style={{...inputSt,flex:1,padding:'4px 8px',fontSize:12,opacity:v.attiva?1:0.5}}/>
                        <input type="number" value={v.prezzo} onChange={e=>{const val=e.target.value;setForm(p=>({...p,voci:p.voci.map((x,j)=>j===i?{...x,prezzo:val}:x)}));}} style={{...inputSt,width:110,padding:'4px 8px',fontSize:12,textAlign:'right',opacity:v.attiva?1:0.5}} placeholder="€"/>
                        <button type="button" onClick={()=>setForm(p=>({...p,voci:p.voci.filter((_,j)=>j!==i)}))} style={{background:'none',border:'none',cursor:'pointer',color:T.red,fontSize:14,lineHeight:1,flexShrink:0,padding:'0 4px'}}>×</button>
                      </div>
                    ))}
                    {(form.voci||[]).length===0 && (
                      <div style={{padding:'16px',textAlign:'center',fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.muted}}>Nessuna voce — aggiungi dal preset o crea una riga</div>
                    )}
                  </div>
                  {/* Preset template */}
                  {vociTemplates.length>0 && (
                    <div style={{marginBottom:8,display:'flex',flexWrap:'wrap',gap:4}}>
                      {vociTemplates.filter(t=>!(form.voci||[]).some(v=>v.templateId===t.id)).map(t=>(
                        <button type="button" key={t.id} onClick={()=>setForm(p=>({...p,voci:[...(p.voci||[]),{id:`t${t.id}${Date.now()}`,templateId:t.id,nome:t.nome,prezzo:Number(t.prezzo_default)||0,attiva:true}]}))}
                          style={{border:`0.5px solid ${T.borderMd}`,borderRadius:T.radiusSm,background:T.bg,color:T.ink,fontFamily:"'IBM Plex Mono',monospace",fontSize:10,padding:'3px 10px',cursor:'pointer'}}>
                          + {t.nome}
                        </button>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={()=>setForm(p=>({...p,voci:[...(p.voci||[]),{id:`c${Date.now()}`,nome:'',prezzo:'',attiva:true}]}))}
                    style={{border:`0.5px solid ${T.borderMd}`,borderRadius:T.radiusSm,background:'transparent',color:T.muted,fontFamily:"'IBM Plex Mono',monospace",fontSize:10,letterSpacing:'0.06em',padding:'5px 12px',cursor:'pointer'}}>
                    + Aggiungi riga
                  </button>
                  {/* Sconto + Totale */}
                  {(form.voci||[]).length>0 && (() => {
                    const lordo = (form.voci||[]).filter(v=>v.attiva).reduce((s,v)=>s+Number(v.prezzo||0),0);
                    const sc = Number(form.sconto)||0;
                    const netto = sc > 0 ? lordo * (1 - sc/100) : lordo;
                    return (
                      <div style={{marginTop:10,paddingTop:8,borderTop:`0.5px solid ${T.border}`}}>
                        {/* Riga sconto */}
                        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:10,marginBottom:8}}>
                          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.muted}}>SCONTO</span>
                          <div style={{display:'flex',alignItems:'center',gap:4}}>
                            <input type="number" min={0} max={100} step={0.1} value={form.sconto} onChange={e=>setForm(p=>({...p,sconto:e.target.value}))}
                              placeholder="0" style={{...inputSt,width:70,padding:'4px 8px',fontSize:12,textAlign:'right'}}/>
                            <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:T.muted}}>%</span>
                          </div>
                          {sc > 0 && <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:T.red}}>−{currency(lordo-netto)}</span>}
                        </div>
                        {/* Totale */}
                        <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:12}}>
                          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.muted}}>TOTALE OFFERTA</span>
                          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,fontWeight:700,color:T.navy}}>{currency(netto)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div style={{ gridColumn:'span 2' }}>
                  <label style={labelSt}>Note</label>
                  <input type="text" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Note aggiuntive..." style={inputSt}/>
                </div>
              </div>

              {formError && <div style={{ ...mono, fontSize:11, color:T.red }}>{formError}</div>}

              <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:14, borderTop:`0.5px solid ${T.border}` }}>
                <button type="button" onClick={()=>setModalOpen(false)} style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.ink, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>Annulla</button>
                <button type="submit" disabled={saving} style={{ background:T.navy, border:'none', color:'#EEF1F6', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 20px', cursor:saving?'not-allowed':'pointer', opacity:saving?0.6:1 }}>
                  {saving?'Salvataggio...':'Crea offerta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal allineamento valore */}
      {allineaModal && accettaForm && offertaOriginale && (
        <div className="asm-modal-bg" style={{ position:'fixed', inset:0, zIndex:80, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div className="asm-modal-content" style={{ background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, boxShadow:T.shadowLg, borderRadius:T.radiusLg, padding:'28px 28px 24px', maxWidth:420, width:'100%' }}>
            <div style={{ fontSize:15, fontWeight:600, color:T.ink, marginBottom:8 }}>
              Aggiornare anche l'offerta?
            </div>
            <div style={{ ...mono, fontSize:10, color:T.muted, marginBottom:20, lineHeight:1.7 }}>
              Hai modificato il valore rispetto all'offerta originale.<br/>
              Vuoi allineare anche il valore dell'offerta a quello della commessa?
            </div>
            <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius: T.radiusSm, padding:'12px 14px', marginBottom:20, display:'flex', gap:20 }}>
              <div>
                <div style={{ ...mono, fontSize:8, color:T.muted, marginBottom:4, letterSpacing:'0.15em', textTransform:'uppercase' }}>Valore offerta originale</div>
                <div style={{ fontSize:16, fontWeight:600, color:T.muted }}>
                  {currency(offertaOriginale.importo_offerta_base)}
                </div>
              </div>
              <div style={{ borderLeft:`0.5px solid ${T.border}`, paddingLeft:20 }}>
                <div style={{ ...mono, fontSize:8, color:T.muted, marginBottom:4, letterSpacing:'0.15em', textTransform:'uppercase' }}>Nuovo valore commessa</div>
                <div style={{ fontSize:16, fontWeight:600, color:T.navy }}>
                  {currency((accettaForm.voci||[]).filter(v=>v.attiva).reduce((s,v)=>s+Number(v.prezzo||0),0))}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => _doCreaNcommessa(true)} disabled={saving}
                style={{ flex:1, background:T.navy, color:T.bg, border:'none', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'10px 0', cursor:'pointer', opacity:saving?0.6:1 }}>
                {saving ? 'Creazione...' : 'Sì, aggiorna offerta'}
              </button>
              <button onClick={() => _doCreaNcommessa(false)} disabled={saving}
                style={{ flex:1, background:'transparent', color:T.ink, border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'10px 0', cursor:'pointer', opacity:saving?0.6:1 }}>
                No, mantieni offerta
              </button>
            </div>
            <button onClick={() => { setAllineaModal(false); setAccettaModal(true); }} disabled={saving}
              style={{ marginTop:12, background:'none', border:'none', color:T.muted, ...mono, fontSize:10, cursor:'pointer', width:'100%', textAlign:'center' }}>
              ← Torna a modifica
            </button>
          </div>
        </div>
      )}

      {/* Modal accettazione */}
      {accettaModal && accettaForm && (
        <div className="asm-modal-bg" style={{ position:'fixed', inset:0, zIndex:70, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div className="asm-modal-content" style={{ width:'100%', maxWidth:480, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, boxShadow:T.shadowLg, borderRadius:T.radiusLg, padding:28 }}>
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
                    <div style={{ padding:'12px', background:T.surface2, border:`1px solid ${T.border}` }}>
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
                <label style={labelSt}>Voci da confermare</label>
                <div style={{border:`1px solid ${T.border}`,borderRadius:T.radiusSm,overflow:'hidden',marginBottom:8}}>
                  {(accettaForm.voci||[]).map((v,i)=>(
                    <div key={v.id||i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderBottom:i<(accettaForm.voci||[]).length-1?`0.5px solid ${T.border}`:'none',background:v.attiva?'transparent':T.surface2}}>
                      <input type="checkbox" checked={v.attiva} onChange={()=>setAccettaForm(p=>({...p,voci:p.voci.map((x,j)=>j===i?{...x,attiva:!x.attiva}:x)}))} style={{accentColor:T.navy,width:13,height:13,flexShrink:0}}/>
                      <span style={{flex:1,fontSize:12,color:v.attiva?T.ink:T.muted,fontFamily:"'Space Grotesk',sans-serif",opacity:v.attiva?1:0.5}}>{v.nome}</span>
                      <input type="number" value={v.prezzo} onChange={e=>{const val=e.target.value;setAccettaForm(p=>({...p,voci:p.voci.map((x,j)=>j===i?{...x,prezzo:val}:x)}));}} style={{...inputSt,width:110,padding:'4px 8px',fontSize:12,textAlign:'right',opacity:v.attiva?1:0.5}} placeholder="€"/>
                    </div>
                  ))}
                </div>
                {/* Sconto + totale */}
                {(() => {
                  const lordo = (accettaForm.voci||[]).filter(v=>v.attiva).reduce((s,v)=>s+Number(v.prezzo||0),0);
                  const sc = Number(accettaForm.sconto)||0;
                  const netto = sc > 0 ? lordo * (1 - sc/100) : lordo;
                  return (
                    <div style={{paddingTop:8}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:10,marginBottom:8}}>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.muted}}>SCONTO</span>
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <input type="number" min={0} max={100} step={0.1} value={accettaForm.sconto||''} onChange={e=>setAccettaForm(p=>({...p,sconto:e.target.value}))}
                            placeholder="0" style={{...inputSt,width:70,padding:'4px 8px',fontSize:12,textAlign:'right'}}/>
                          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:T.muted}}>%</span>
                        </div>
                        {sc > 0 && <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,color:T.red}}>−{currency(lordo-netto)}</span>}
                      </div>
                      <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:12}}>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.muted}}>TOTALE COMMESSA</span>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,fontWeight:700,color:T.navy}}>{currency(netto)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, paddingTop:14, borderTop:`0.5px solid ${T.border}` }}>
              <button onClick={()=>setAccettaModal(false)} style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.ink, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>Annulla</button>
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
