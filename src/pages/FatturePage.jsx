import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from "../hooks/useIsMobile";
import { useEscKey } from "../hooks/useEscKey";

function currency(v) {
  return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(Number(v)||0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'});
}
function isOverdue(dataScadenza, pagato) {
  if (pagato || !dataScadenza) return false;
  return new Date(dataScadenza) < new Date();
}

function KpiCard({ label, value, color, sub }) {
  const { T } = useTheme();
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, padding:'16px 20px',borderRadius:T.radius,backdropFilter:T.blurSm,WebkitBackdropFilter:T.blurSm,boxShadow:T.shadow}}>
      <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,letterSpacing:'0.25em',textTransform:'uppercase',color:T.muted,marginBottom:8}}>{label}</div>
      <div style={{fontSize:24,fontWeight:600,letterSpacing:'-0.03em',color:color||T.ink}}>{value}</div>
      {sub&&<div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,marginTop:4}}>{sub}</div>}
    </div>
  );
}

export default function FatturePage() {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  usePageTitleOnMount("Fatture");
  const navigate = useNavigate();
  const { studioId, studio } = useStudio();
  const tipoFatturazione = studio?.tipo_fatturazione || 'proforma';

  const [fatture, setFatture]           = useState([]);
  const [commesse, setCommesse]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showPagate, setShowPagate]     = useState(true);
  const [annoFiltro, setAnnoFiltro]     = useState(new Date().getFullYear());
  const [modalOpen, setModalOpen]       = useState(false);
  useEscKey(() => setModalOpen(false), modalOpen);
  const [editFattura, setEditFattura]   = useState(null);
  const [form, setForm]                 = useState({
    numero_fattura:'', commessa_id:'', data_emissione:'', termini_pagamento:60,
    data_scadenza:'', importo_totale:'', note:'', numero_fattura_fiscale:'',
  });
  const [proformePagate, setProformePagate] = useState([]);
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState('');

  const loadData = async () => {
    if (!studioId) return;
    setLoading(true);
    const [{ data:fatt }, { data:comm }, { data:profPagate }] = await Promise.all([
      supabase.from("fatture").select("*").eq("studio",studioId).is("deleted_at",null).order("data_emissione",{ascending:false}),
      supabase.from("commesse").select("id,nome_commessa,cliente").eq("studio",studioId),
      supabase.from("proforma").select("*").eq("studio",studioId).eq("pagato",true).order("data_pagamento",{ascending:false}),
    ]);
    setFatture(fatt??[]);
    setCommesse(comm??[]);
    setProformePagate(profPagate??[]);
    setLoading(false);
  };

  useEffect(()=>{ loadData(); },[studioId]);

  const commessaName = id => commesse.find(c=>c.id===id)?.nome_commessa||'—';
  const commessaCliente = id => commesse.find(c=>c.id===id)?.cliente||'—';

  // KPI
  const totaleEmesso  = tipoFatturazione === 'proforma'
    ? proformePagate.reduce((s,p)=>s+(Number(p.importo_totale)||0),0)
    : fatture.reduce((s,f)=>s+(Number(f.importo_totale)||0),0);
  const totalePagato  = tipoFatturazione === 'proforma'
    ? totaleEmesso
    : fatture.filter(f=>f.pagato).reduce((s,f)=>s+(Number(f.importo_totale)||0),0);
  const daIncassare   = tipoFatturazione === 'proforma'
    ? 0
    : fatture.filter(f=>!f.pagato).reduce((s,f)=>s+(Number(f.importo_totale)||0),0);
  const scadute       = tipoFatturazione === 'proforma'
    ? 0
    : fatture.filter(f=>isOverdue(f.data_scadenza,f.pagato)).length;

  const anniDisponibili = useMemo(() => {
    const anni = new Set();
    anni.add(new Date().getFullYear());
    fatture.forEach(f => {
      const d = f.data_emissione || f.created_at;
      if (d) anni.add(new Date(d).getFullYear());
    });
    return Array.from(anni).sort((a,b)=>b-a);
  }, [fatture]);

  const visibili = useMemo(() => {
    let list = showPagate ? fatture : fatture.filter(f=>!f.pagato);
    if (annoFiltro !== 0) {
      list = list.filter(f => {
        const d = f.data_emissione || f.created_at;
        return d && new Date(d).getFullYear() === annoFiltro;
      });
    }
    return list;
  }, [fatture, showPagate, annoFiltro]);

  const openNew = () => {
    setEditFattura(null);
    const today = new Date().toISOString().slice(0,10);
    const scad = new Date(); scad.setDate(scad.getDate()+60);
    setForm({ numero_fattura:'', commessa_id:'', data_emissione:today, termini_pagamento:60, data_scadenza:scad.toISOString().slice(0,10), importo_totale:'', note:'', numero_fattura_fiscale:'' });
    setFormError(''); setModalOpen(true);
  };

  const openEdit = (f) => {
    setEditFattura(f);
    setForm({
      numero_fattura: f.numero_fattura||'',
      commessa_id: f.commessa_id||'',
      data_emissione: f.data_emissione||'',
      termini_pagamento: f.termini_pagamento||60,
      data_scadenza: f.data_scadenza||'',
      importo_totale: f.importo_totale||'',
      note: f.note||'',
      numero_fattura_fiscale: f.numero_fattura_fiscale||'',
    });
    setFormError(''); setModalOpen(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    if (!form.numero_fattura.trim()||!form.data_emissione) { setFormError('Numero fattura e data emissione sono obbligatori.'); return; }
    setSaving(true); setFormError('');
    const payload = {
      studio: studioId,
      numero_fattura: form.numero_fattura.trim(),
      commessa_id: form.commessa_id||null,
      data_emissione: form.data_emissione,
      termini_pagamento: Number(form.termini_pagamento)||60,
      data_scadenza: form.data_scadenza||null,
      importo_totale: Number(form.importo_totale)||0,
      note: form.note||null,
      numero_fattura_fiscale: form.numero_fattura_fiscale||null,
    };
    if (editFattura) {
      await supabase.from("fatture").update(payload).eq("id",editFattura.id);
    } else {
      await supabase.from("fatture").insert({...payload,pagato:false});
    }
    setSaving(false); setModalOpen(false);
    loadData();
  };

  const handleSegnaComePagata = async (f) => {
    const today = new Date().toISOString().slice(0,10);
    await supabase.from("fatture").update({ pagato:true, data_pagamento:today }).eq("id",f.id);
    setFatture(p=>p.map(x=>x.id===f.id?{...x,pagato:true,data_pagamento:today}:x));
  };

  const handleAnnullaPagamento = async (f) => {
    await supabase.from("fatture").update({ pagato:false, data_pagamento:null }).eq("id",f.id);
    setFatture(p=>p.map(x=>x.id===f.id?{...x,pagato:false,data_pagamento:null}:x));
  };

  const handleDelete = async (id) => {
    if (!confirm("Eliminare questa fattura? Verrà spostata nel cestino.")) return;
    const { error } = await supabase.rpc('elimina_fattura', { p_id: id });
    if (error) { alert('Errore: ' + error.message); return; }
    setFatture(p=>p.filter(x=>x.id!==id));
  };

  // Calcola scadenza da emissione + termini
  const updateScadenza = (emissione, termini) => {
    if (!emissione||!termini) return;
    const d = new Date(emissione); d.setDate(d.getDate()+Number(termini));
    setForm(p=>({...p,data_scadenza:d.toISOString().slice(0,10)}));
  };

  const thSt = {fontFamily:"'IBM Plex Mono', monospace",fontSize:8,letterSpacing:'0.2em',textTransform:'uppercase',color:T.muted,padding:'8px 14px',borderBottom:`0.5px solid ${T.border}`,textAlign:'left'};
  const tdSt = {padding:'10px 14px',borderBottom:`0.5px solid ${T.border}`,fontSize:12,color:T.ink};
  const inputSt = {width:'100%',padding:'8px 12px',boxSizing:'border-box',border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm,background:T.surface,color:T.ink,fontSize:13,fontFamily:"'Space Grotesk', sans-serif",outline:'none'};
  const lbSt = {fontFamily:"'IBM Plex Mono', monospace",fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:T.muted,marginBottom:6,display:'block'};

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:240,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.muted}}>Caricamento fatture...</div>;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:22,fontWeight:600,letterSpacing:'-0.03em',color:T.ink,marginBottom:4}}>Fatture</div>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted}}>
            {tipoFatturazione === 'proforma'
              ? `${proformePagate.length} proforma pagate — fatture emesse`
              : `${fatture.length} fatture emesse`
            }
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <select value={annoFiltro} onChange={e=>setAnnoFiltro(Number(e.target.value))}
            style={{ padding:'4px 8px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, cursor:'pointer', outline:'none', appearance:'auto' }}>
            <option value={0}>Tutti gli anni</option>
            {anniDisponibili.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          {tipoFatturazione === 'fattura' && (
            <button onClick={openNew} style={{background:T.navy,color:T.bg,border:'none',fontFamily:"'IBM Plex Mono', monospace",fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',padding:'9px 20px',cursor:'pointer'}}>
              + Nuova fattura
            </button>
          )}
        </div>
      </div>

      {/* KPI */}
      <div style={{display:'grid',gridTemplateColumns:isMobile ? '1fr 1fr' : 'repeat(4,1fr)',gap:10}}>
        <KpiCard label="Totale emesso"  value={currency(totaleEmesso)}  color={T.ink}
          sub={tipoFatturazione==='proforma' ? `${proformePagate.length} proforma pagate` : `${fatture.length} fatture`}/>
        <KpiCard label="Pagato"         value={currency(totalePagato)}  color={T.green}
          sub={tipoFatturazione==='proforma' ? 'tutte incassate' : `${fatture.filter(f=>f.pagato).length} pagate`}/>
        <KpiCard label="Da incassare"   value={currency(daIncassare)}   color={daIncassare>0?T.red:T.muted}
          sub={tipoFatturazione==='proforma' ? '—' : `${fatture.filter(f=>!f.pagato).length} aperte`}/>
        <KpiCard label="Scadute"        value={scadute}                 color={scadute>0?T.red:T.muted} sub="non pagate"/>
      </div>

      {/* Tabella condizionale: proforma pagate o fatture dirette */}
      {tipoFatturazione === 'proforma' ? (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.radius,backdropFilter:T.blurSm,WebkitBackdropFilter:T.blurSm,boxShadow:T.shadow}}>
          <div style={{padding:'12px 16px',borderBottom:`0.5px solid ${T.border}`,fontFamily:"'IBM Plex Mono', monospace",fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:T.muted}}>
            {proformePagate.length} proforma pagate
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={thSt}>N° Proforma</th>
                  <th style={thSt}>Commessa</th>
                  <th style={thSt}>Cliente</th>
                  <th style={thSt}>Data pagamento</th>
                  <th style={thSt}>Importo</th>
                  <th style={thSt}>N° Fattura fiscale</th>
                  <th style={thSt}></th>
                </tr>
              </thead>
              <tbody>
                {proformePagate.length === 0 ? (
                  <tr><td colSpan={7} style={{...tdSt,textAlign:'center',color:T.muted,padding:'32px 0'}}>
                    Nessuna proforma pagata ancora — le proforma pagate appaiono qui come fatture emesse.
                  </td></tr>
                ) : proformePagate.map(p => (
                  <tr key={p.id}>
                    <td style={{...tdSt,fontWeight:600}}>{p.numero_proforma}</td>
                    <td style={tdSt}>
                      {p.commessa_id ? (
                        <button onClick={()=>navigate(`/commesse/${p.commessa_id}`)}
                          style={{background:'none',border:'none',cursor:'pointer',color:T.navy,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,textDecoration:'underline'}}>
                          {commessaName(p.commessa_id)}
                        </button>
                      ) : '—'}
                    </td>
                    <td style={{...tdSt,color:T.muted}}>{p.commessa_id ? commessaCliente(p.commessa_id) : '—'}</td>
                    <td style={{...tdSt,fontFamily:"'IBM Plex Mono', monospace",fontSize:11}}>{fmtDate(p.data_pagamento)}</td>
                    <td style={{...tdSt,fontFamily:"'IBM Plex Mono', monospace",fontSize:12,color:T.navy,fontWeight:600}}>{currency(p.importo_totale)}</td>
                    <td style={{...tdSt,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.muted}}>
                      {p.numero_fattura || '—'}
                    </td>
                    <td style={tdSt}>
                      <button onClick={()=>navigate(`/commesse/${p.commessa_id}`)}
                        style={{background:'none',border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm,color:T.ink,fontFamily:"'IBM Plex Mono', monospace",fontSize:9,padding:'4px 10px',cursor:'pointer'}}>
                        Vai a commessa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.radius,backdropFilter:T.blurSm,WebkitBackdropFilter:T.blurSm,boxShadow:T.shadow}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:`0.5px solid ${T.border}`}}>
            <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:T.muted}}>
              {visibili.length} fatture
            </div>
            <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
              <input type="checkbox" checked={showPagate} onChange={e=>setShowPagate(e.target.checked)} style={{accentColor:T.navy,width:13,height:13}}/>
              <span style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted}}>Mostra anche pagate</span>
            </label>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={thSt}>N° Fattura</th>
                  <th style={thSt}>Commessa</th>
                  <th style={thSt}>Cliente</th>
                  <th style={thSt}>Data emissione</th>
                  <th style={thSt}>Scadenza</th>
                  <th style={thSt}>Importo</th>
                  <th style={thSt}>Stato</th>
                  <th style={thSt}></th>
                </tr>
              </thead>
              <tbody>
                {visibili.length===0 ? (
                  <tr><td colSpan={8} style={{...tdSt,textAlign:'center',color:T.muted,padding:'32px 0'}}>Nessuna fattura</td></tr>
                ) : visibili.map(f=>{
                  const overdue = isOverdue(f.data_scadenza, f.pagato);
                  return (
                    <tr key={f.id}>
                      <td style={{...tdSt,fontWeight:600}}>{f.numero_fattura}</td>
                      <td style={tdSt}>
                        {f.commessa_id ? (
                          <button onClick={()=>navigate(`/commesse/${f.commessa_id}`)} style={{background:'none',border:'none',cursor:'pointer',color:T.navy,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,textDecoration:'underline'}}>
                            {commessaName(f.commessa_id)}
                          </button>
                        ) : '—'}
                      </td>
                      <td style={{...tdSt,color:T.muted}}>{f.commessa_id?commessaCliente(f.commessa_id):'—'}</td>
                      <td style={{...tdSt,fontFamily:"'IBM Plex Mono', monospace",fontSize:11}}>{fmtDate(f.data_emissione)}</td>
                      <td style={{...tdSt,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:overdue?T.red:T.ink}}>
                        {fmtDate(f.data_scadenza)}
                        {f.termini_pagamento&&<div style={{fontSize:9,color:T.muted}}>({f.termini_pagamento}gg)</div>}
                      </td>
                      <td style={{...tdSt,fontFamily:"'IBM Plex Mono', monospace",fontSize:12,color:T.navy,fontWeight:600}}>{currency(f.importo_totale)}</td>
                      <td style={tdSt}>
                        {f.pagato ? (
                          <div>
                            <span style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.green,letterSpacing:'0.05em'}}>✓ PAGATA</span>
                            <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:8,color:T.muted}}>{fmtDate(f.data_pagamento)}</div>
                          </div>
                        ) : (
                          <span style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:overdue?T.red:T.muted,letterSpacing:'0.05em'}}>
                            {overdue?'⚠ SCADUTA':'IN ATTESA'}
                          </span>
                        )}
                      </td>
                      <td style={{...tdSt,whiteSpace:'nowrap'}}>
                        <div style={{display:'flex',gap:6}}>
                          {!f.pagato && (
                            <button onClick={()=>handleSegnaComePagata(f)} style={{background:T.green,border:'none',color:T.surface,fontFamily:"'IBM Plex Mono', monospace",fontSize:9,letterSpacing:'0.05em',padding:'4px 10px',cursor:'pointer'}}>
                              Segna pagata
                            </button>
                          )}
                          {f.pagato && (
                            <button onClick={()=>handleAnnullaPagamento(f)} style={{background:'none',border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm,color:T.muted,fontFamily:"'IBM Plex Mono', monospace",fontSize:9,padding:'4px 10px',cursor:'pointer'}}>
                              Annulla pag.
                            </button>
                          )}
                          <button onClick={()=>openEdit(f)} style={{background:'none',border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm,color:T.ink,fontFamily:"'IBM Plex Mono', monospace",fontSize:9,padding:'4px 10px',cursor:'pointer'}}>···</button>
                          <button onClick={()=>handleDelete(f.id)} style={{background:'none',border:`0.5px solid ${T.red}`, borderRadius: T.radiusSm,color:T.red,fontFamily:"'IBM Plex Mono', monospace",fontSize:9,padding:'4px 10px',cursor:'pointer'}}>×</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal nuova/modifica fattura */}
      {modalOpen && (
        <div className="asm-modal-bg" style={{position:'fixed',inset:0,zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="asm-modal-content" style={{width:'100%',maxWidth:560,background:T.glassBg,backdropFilter:T.blur,WebkitBackdropFilter:T.blur,border:`1px solid ${T.glassBorder}`,boxShadow:T.shadowLg,borderRadius:T.radiusLg,padding:28,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
              <div style={{fontSize:16,fontWeight:600,color:T.ink}}>{editFattura?'Modifica fattura':'Nuova fattura'}</div>
              <button onClick={()=>setModalOpen(false)} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:20}}>×</button>
            </div>

            <form onSubmit={handleSave} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                  <label style={lbSt}>N° Fattura *</label>
                  <input type="text" value={form.numero_fattura} onChange={e=>setForm(p=>({...p,numero_fattura:e.target.value}))} required autoFocus style={inputSt}/>
                </div>
                <div>
                  <label style={lbSt}>N° Fattura fiscale</label>
                  <input type="text" value={form.numero_fattura_fiscale} onChange={e=>setForm(p=>({...p,numero_fattura_fiscale:e.target.value}))} placeholder="Es. 2026/001" style={inputSt}/>
                </div>
                <div style={{gridColumn:'span 2'}}>
                  <label style={lbSt}>Commessa</label>
                  <select value={form.commessa_id} onChange={e=>setForm(p=>({...p,commessa_id:e.target.value}))} style={{...inputSt,cursor:'pointer'}}>
                    <option value="">— Nessuna commessa —</option>
                    {commesse.map(c=><option key={c.id} value={c.id}>{c.nome_commessa} — {c.cliente}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbSt}>Data emissione *</label>
                  <input type="date" value={form.data_emissione} onChange={e=>{ setForm(p=>({...p,data_emissione:e.target.value})); updateScadenza(e.target.value,form.termini_pagamento); }} required style={inputSt}/>
                </div>
                <div>
                  <label style={lbSt}>Termini pagamento (giorni)</label>
                  <input type="number" min={0} value={form.termini_pagamento} onChange={e=>{ setForm(p=>({...p,termini_pagamento:e.target.value})); updateScadenza(form.data_emissione,e.target.value); }} style={inputSt}/>
                </div>
                <div>
                  <label style={lbSt}>Data scadenza</label>
                  <input type="date" value={form.data_scadenza} onChange={e=>setForm(p=>({...p,data_scadenza:e.target.value}))} style={inputSt}/>
                  <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,marginTop:4}}>Calcolata automaticamente da emissione + termini</div>
                </div>
                <div>
                  <label style={lbSt}>Importo totale (€)</label>
                  <input type="number" min={0} step={0.01} value={form.importo_totale} onChange={e=>setForm(p=>({...p,importo_totale:e.target.value}))} style={inputSt}/>
                </div>
                <div style={{gridColumn:'span 2'}}>
                  <label style={lbSt}>Note</label>
                  <input type="text" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Note aggiuntive..." style={inputSt}/>
                </div>
              </div>

              {formError && <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.red}}>{formError}</div>}

              <div style={{display:'flex',justifyContent:'flex-end',gap:10,paddingTop:14,borderTop:`0.5px solid ${T.border}`}}>
                <button type="button" onClick={()=>setModalOpen(false)} style={{border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm,background:'transparent',color:T.ink,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',padding:'8px 18px',cursor:'pointer'}}>Annulla</button>
                <button type="submit" disabled={saving} style={{background:T.navy,border:'none',color:T.bg,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',padding:'8px 18px',cursor:saving?'not-allowed':'pointer',opacity:saving?0.6:1}}>
                  {saving?'Salvataggio...':editFattura?'Aggiorna':'Crea fattura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
