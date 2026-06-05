import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { useTheme } from "../contexts/ThemeContext";
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

export default function OfferteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { studioId } = useStudio();
  const { T } = useTheme();

  const [offerta, setOfferta]   = useState(null);
  const [progetti, setProgetti] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({});
  const [accettaModal, setAccettaModal] = useState(false);
  const [accettaForm, setAccettaForm]   = useState(null);
  const [allineaModal, setAllineaModal] = useState(false);
  useEscKey(() => {
    if (allineaModal)  { setAllineaModal(false); return; }
    if (accettaModal)  { setAccettaModal(false); }
  }, allineaModal || accettaModal);

  usePageTitleOnMount("Dettaglio offerta");

  const loadData = async () => {
    const [{ data:off }, { data:proj }] = await Promise.all([
      supabase.from("offerte").select("*").eq("id",id).single(),
      supabase.from("projects").select("id,name,client").eq("studio",studioId).eq("archived",false).order("name"),
    ]);
    setOfferta(off);
    setProgetti(proj??[]);
    if (off) setForm({
      nome_offerta: off.nome_offerta,
      cliente: off.cliente,
      project_id: off.project_id||'',
      data_offerta: off.data_offerta||'',
      importo_offerta_base: off.importo_offerta_base,
      note: off.note||'',
      numero_offerta: off.numero_offerta,
    });
    setLoading(false);
  };

  useEffect(()=>{ if(studioId) loadData(); },[id,studioId]);

  const handleSave = async () => {
    setSaving(true);
    const proj = progetti.find(p=>p.id===form.project_id);
    await supabase.from("offerte").update({
      nome_offerta: form.nome_offerta,
      cliente: form.cliente,
      project_id: form.project_id||null,
      project_name: proj?.name||null,
      data_offerta: form.data_offerta||null,
      importo_offerta_base: Number(form.importo_offerta_base),
      note: form.note||null,
      numero_offerta: form.numero_offerta,
    }).eq("id",id);
    setSaving(false);
    setEditing(false);
    await loadData();
  };

  const handleRifiuta = async () => {
    if (!confirm("Rifiutare questa offerta?")) return;
    await supabase.from("offerte").update({ stato:'rifiutata' }).eq("id",id);
    await loadData();
  };

  const handleRipristina = async () => {
    await supabase.from("offerte").update({ stato:'offerta' }).eq("id",id);
    await loadData();
  };

  const handleElimina = async () => {
    if (!confirm(`Spostare "${offerta?.nome_offerta}" nel cestino?`)) return;
    const { error } = await supabase.rpc('elimina_offerta', { p_offerta_id: id });
    if (error) { alert('Errore: ' + error.message); return; }
    navigate('/offerte');
  };

  const openAccetta = () => {
    setAccettaForm({
      nome_commessa: offerta.nome_offerta,
      cliente: offerta.cliente,
      project_id: offerta.project_id||'',
      data_commessa: new Date().toISOString().slice(0,10),
      importo_offerta_base: offerta.importo_offerta_base,
      numero_offerta: offerta.numero_offerta,
    });
    setAccettaModal(true);
  };

  // Esegue effettivamente la creazione della commessa
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
      await supabase.from('offerte').update({ project_id:newProj.id, project_name:newProj.name }).eq('id', id);
    }

    const { data:commessa, error } = await supabase.from("commesse").insert({
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
    if (error) { alert('Errore: '+error.message); setSaving(false); return; }

    // Aggiorna stato offerta (e valore se richiesto)
    const offerUpdate = { stato:'accettata', commessa_id:commessa.id };
    if (aggiornaOfferta) offerUpdate.importo_offerta_base = Number(accettaForm.importo_offerta_base);
    await supabase.from("offerte").update(offerUpdate).eq("id",id);

    setSaving(false);
    setAccettaModal(false);
    setAllineaModal(false);
    navigate(`/commesse/${commessa.id}`);
  };

  const handleConfermaAccetta = async () => {
    // Se il valore è stato modificato rispetto all'offerta originale, chiedi se allineare
    const valoreOriginale = Number(offerta.importo_offerta_base);
    const valoreNuovo = Number(accettaForm.importo_offerta_base);
    if (valoreNuovo !== valoreOriginale) {
      setAccettaModal(false);
      setAllineaModal(true);
      return;
    }
    await _doCreaNcommessa(false);
  };

  const mono = { fontFamily:"'IBM Plex Mono', monospace" };
  const inputSt = { width:'100%', padding:'8px 12px', boxSizing:'border-box', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.inputBg, color:T.inputText, fontSize:13, fontFamily:"'Space Grotesk', sans-serif", outline:'none' };
  const labelSt = { ...mono, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:6, display:'block' };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240, ...mono, fontSize:11, color:T.muted }}>Caricamento...</div>;
  if (!offerta) return <div style={{ ...mono, fontSize:11, color:T.red }}>Offerta non trovata</div>;

  const st = STATI[offerta.stato]||STATI.offerta;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>navigate('/offerte')} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor:'pointer', color:T.muted, padding:'5px 12px', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase' }}>← Offerte</button>
          <div>
            <div style={{ ...mono, fontSize:10, color:T.muted, marginBottom:2 }}>{offerta.numero_offerta}</div>
            <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em' }}>{offerta.nome_offerta}</div>
          </div>
          <span style={{ ...mono, fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:st.color, background:st.bg, padding:'3px 8px', borderRadius:2 }}>{st.label}</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {offerta.stato==='offerta' && <>
            {!editing && <button onClick={()=>setEditing(true)} style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.ink, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 16px', cursor:'pointer' }}>Modifica</button>}
            <button onClick={openAccetta} style={{ background:T.green, border:'none', color:'#fff', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 16px', cursor:'pointer' }}>Accetta →</button>
            <button onClick={handleRifiuta} style={{ border:`0.5px solid ${T.red}`, borderRadius: T.radiusSm, background:'transparent', color:T.red, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 16px', cursor:'pointer' }}>Rifiuta</button>
          </>}
          {offerta.stato==='accettata' && offerta.commessa_id && (
            <button onClick={()=>navigate(`/commesse/${offerta.commessa_id}`)} style={{ border:`0.5px solid ${T.navy}`, borderRadius: T.radiusSm, background:'transparent', color:T.navy, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 16px', cursor:'pointer' }}>Vai a commessa →</button>
          )}
          {offerta.stato==='rifiutata' && (
            <button onClick={handleRipristina} style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.muted, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 16px', cursor:'pointer' }}>Ripristina</button>
          )}
          <button onClick={handleElimina} style={{ border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, background:'transparent', color:T.muted, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 14px', cursor:'pointer' }}>🗑 Elimina</button>
        </div>
      </div>

      {/* Dati offerta */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius: T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow, padding:'24px 28px' }}>
        {editing ? (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label style={labelSt}>N° Offerta</label>
                <input type="text" value={form.numero_offerta} onChange={e=>setForm(p=>({...p,numero_offerta:e.target.value}))} style={inputSt}/>
              </div>
              <div>
                <label style={labelSt}>Data offerta</label>
                <input type="date" value={form.data_offerta} onChange={e=>setForm(p=>({...p,data_offerta:e.target.value}))} style={inputSt}/>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={labelSt}>Nome offerta</label>
                <input type="text" value={form.nome_offerta} onChange={e=>setForm(p=>({...p,nome_offerta:e.target.value}))} style={inputSt}/>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={labelSt}>Cliente</label>
                <input type="text" value={form.cliente} onChange={e=>setForm(p=>({...p,cliente:e.target.value}))} style={inputSt}/>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={labelSt}>Progetto</label>
                <select value={form.project_id} onChange={e=>setForm(p=>({...p,project_id:e.target.value}))} style={{...inputSt,cursor:'pointer'}}>
                  <option value="">— Nessun progetto —</option>
                  {progetti.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Importo base (€)</label>
                <input type="number" value={form.importo_offerta_base} onChange={e=>setForm(p=>({...p,importo_offerta_base:e.target.value}))} style={inputSt}/>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={labelSt}>Note</label>
                <input type="text" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} style={inputSt}/>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:14, borderTop:`0.5px solid ${T.border}` }}>
              <button onClick={()=>setEditing(false)} style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.ink, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>Annulla</button>
              <button onClick={handleSave} disabled={saving} style={{ background:T.navy, border:'none', color:'#EEF1F6', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 20px', cursor:'pointer', opacity:saving?0.6:1 }}>
                {saving?'Salvataggio...':'Salva'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:20 }}>
            {[
              ['N° Offerta', offerta.numero_offerta],
              ['Data offerta', offerta.data_offerta ? new Date(offerta.data_offerta).toLocaleDateString('it-IT') : '—'],
              ['Cliente', offerta.cliente],
              ['Progetto', offerta.project_name||'—'],
              ['Importo base', currency(offerta.importo_offerta_base)],
              ['Note', offerta.note||'—'],
            ].map(([l,v])=>(
              <div key={l}>
                <div style={{ ...labelSt, marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:14, color:T.ink, fontWeight: l==='Importo base'?600:400 }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal accettazione */}
      {accettaModal && accettaForm && (
        <div style={{ position:'fixed', inset:0, zIndex:70, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', padding:16 }}>
          <div style={{ width:'100%', maxWidth:480, background:T.surface, border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, padding:28 }}>
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
              <button onClick={()=>setAccettaModal(false)} style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.ink, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>Annulla</button>
              <button onClick={handleConfermaAccetta} disabled={saving} style={{ background:T.green, border:'none', color:'#fff', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 20px', cursor:'pointer', opacity:saving?0.6:1 }}>
                {saving?'Creazione...':'Crea commessa →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup allineamento valore offerta ── */}
      {allineaModal && accettaForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, padding:'28px 28px 24px', maxWidth:420, width:'100%', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:15, fontWeight:600, color:T.ink, marginBottom:8 }}>
              Aggiornare anche l'offerta?
            </div>
            <div style={{ ...mono, fontSize:10, color:T.muted, marginBottom:20, lineHeight:1.7 }}>
              Hai modificato il valore rispetto all'offerta originale.<br/>
              Vuoi allineare anche il valore dell'offerta a quello della commessa?
            </div>

            {/* Confronto valori */}
            <div style={{ background:T.bg, border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, padding:'12px 14px', marginBottom:20, display:'flex', gap:20 }}>
              <div>
                <div style={{ ...mono, fontSize:8, color:T.muted, marginBottom:4, letterSpacing:'0.15em', textTransform:'uppercase' }}>Valore offerta originale</div>
                <div style={{ fontSize:16, fontWeight:600, color:T.muted }}>
                  €{Number(offerta.importo_offerta_base).toLocaleString('it-IT', { minimumFractionDigits:2 })}
                </div>
              </div>
              <div style={{ borderLeft:`0.5px solid ${T.border}`, paddingLeft:20 }}>
                <div style={{ ...mono, fontSize:8, color:T.muted, marginBottom:4, letterSpacing:'0.15em', textTransform:'uppercase' }}>Nuovo valore commessa</div>
                <div style={{ fontSize:16, fontWeight:600, color:T.navy }}>
                  €{Number(accettaForm.importo_offerta_base).toLocaleString('it-IT', { minimumFractionDigits:2 })}
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
                {saving ? '...' : 'No, mantieni offerta'}
              </button>
            </div>
            <button onClick={() => { setAllineaModal(false); setAccettaModal(true); }} disabled={saving}
              style={{ marginTop:12, background:'none', border:'none', color:T.muted, ...mono, fontSize:10, cursor:'pointer', width:'100%', textAlign:'center' }}>
              ← Torna a modifica
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
