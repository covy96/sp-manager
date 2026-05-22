import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStudio } from "../../hooks/useStudio";
import { useTheme } from "../../contexts/ThemeContext";
import { supabase } from "../../lib/supabase";

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style:"currency", currency:"EUR", maximumFractionDigits:2 }).format(Number(v)||0);
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' });
}

export default function CommessaArchiviataRecapPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { studioId } = useStudio();
  const { T } = useTheme();

  const [commessa, setCommessa]     = useState(null);
  const [suddivisione, setSuddivisione] = useState([]);
  const [proforma, setProforma]     = useState([]);
  const [fatture, setFatture]       = useState([]);
  const [costiExtra, setCostiExtra] = useState([]);
  const [collab, setCollab]         = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!id || !studioId) return;
    const load = async () => {
      const [
        { data: comm },
        { data: sudd },
        { data: prof },
        { data: fatt },
        { data: costi },
        { data: co },
      ] = await Promise.all([
        supabase.from("commesse").select("*").eq("id", id).single(),
        supabase.from("suddivisione_pagamenti").select("*").eq("commessa_id", id).order("order"),
        supabase.from("proforma").select("*").eq("commessa_id", id).order("created_at", { ascending:false }),
        supabase.from("fatture").select("*").eq("commessa_id", id).order("data_emissione", { ascending:false }),
        supabase.from("costi_extra").select("*").eq("commessa_id", id),
        supabase.from("collaboratori_esterni").select("*").eq("commessa_id", id),
      ]);
      setCommessa(comm);
      setSuddivisione(sudd ?? []);
      setProforma(prof ?? []);
      setFatture(fatt ?? []);
      setCostiExtra(costi ?? []);
      setCollab(co ?? []);
      setLoading(false);
    };
    load();
  }, [id, studioId]);

  const mono = { fontFamily:"'IBM Plex Mono', monospace" };
  const labelSt = { ...mono, fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:8 };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240, ...mono, fontSize:11, color:T.muted }}>Caricamento...</div>;
  if (!commessa) return <div style={{ ...mono, fontSize:11, color:T.red }}>Commessa non trovata</div>;

  // Calcoli finanziari
  const valoreBase   = Number(commessa.importo_offerta_base || 0);
  const valoreTotale = Number(commessa.importo_totale || valoreBase);
  const incassato    = Number(commessa.importo_incassato || 0);
  const residuo      = valoreTotale - incassato;
  const percIncassato = valoreTotale > 0 ? Math.round((incassato/valoreTotale)*100) : 0;

  // Rate
  const ratePagate   = suddivisione.filter(r => r.pagato).length;

  // Proforma
  const proformaPagate  = proforma.filter(p => p.pagato);
  const totProfPagate   = proformaPagate.reduce((s,p) => s+Number(p.importo_totale||0), 0);

  // Costi esterni
  const totCostiExtra = costiExtra.reduce((s,c) => s+Number(c.importo||0), 0);
  const totCollab     = collab.reduce((s,c) => s+Number(c.importo||0), 0);
  const totEsterni    = totCostiExtra + totCollab;

  // Margine
  const margine = valoreTotale - totEsterni;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:720 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={()=>navigate('/impostazioni/commesse-archiviate')} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, cursor:'pointer', color:T.muted, padding:'5px 12px', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase' }}>
          ← Archiviate
        </button>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em' }}>{commessa.nome_commessa}</div>
            <span style={{ ...mono, fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'#854d0e', background:'#fefce8', padding:'3px 8px', borderRadius:2 }}>ARCHIVIATA</span>
          </div>
          <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:2 }}>{commessa.cliente} {commessa.numero_offerta ? `· ${commessa.numero_offerta}` : ''}</div>
        </div>
      </div>

      {/* KPI principali */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'Valore contratto', value:currency(valoreTotale),   color:T.ink   },
          { label:'Incassato',        value:currency(incassato),       sub:`${percIncassato}%`, color:T.green },
          { label:'Residuo',          value:currency(residuo),         color:residuo>0?T.red:T.green },
          { label:'Costi esterni',    value:currency(totEsterni),      color:T.muted },
        ].map((k,i) => (
          <div key={i} style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'16px 20px' }}>
            <div style={labelSt}>{k.label}</div>
            <div style={{ fontSize:20, fontWeight:600, letterSpacing:'-0.03em', color:k.color }}>{k.value}</div>
            {k.sub && <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:4 }}>{k.sub} del valore</div>}
          </div>
        ))}
      </div>

      {/* Info commessa */}
      <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'20px 24px' }}>
        <div style={{ ...labelSt, marginBottom:16 }}>Informazioni commessa</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {[
            ['Progetto', commessa.project_name || '—'],
            ['Data commessa', fmtDate(commessa.data_commessa)],
            ['Importo base', currency(valoreBase)],
          ].map(([l,v]) => (
            <div key={l}>
              <div style={{ ...mono, fontSize:9, color:T.muted, marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:13, color:T.ink, fontWeight: l==='Importo base'?600:400 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rate */}
      {suddivisione.length > 0 && (
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'20px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={labelSt}>Rate di pagamento</div>
            <div style={{ ...mono, fontSize:10, color:T.muted }}>{ratePagate}/{suddivisione.length} pagate</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {suddivisione.map((r,i) => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background: r.pagato ? T.greenLight : T.surface2, border:`0.5px solid ${r.pagato ? T.green : T.border}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ ...mono, fontSize:11, color: r.pagato ? T.green : T.muted }}>{r.pagato ? '✓' : '○'}</span>
                  <span style={{ fontSize:13, color:T.ink }}>{r.label || r.numero_rata || `Rata ${i+1}`}</span>
                </div>
                <div style={{ textAlign:'right' }}>
                  {r.importo_fisso && <div style={{ ...mono, fontSize:12, fontWeight:600, color:T.navy }}>{currency(r.importo_fisso)}</div>}
                  {r.percentuale && <div style={{ ...mono, fontSize:11, color:T.muted }}>{r.percentuale}%</div>}
                  {r.data_pagamento && <div style={{ ...mono, fontSize:9, color:T.green }}>Pagata {fmtDate(r.data_pagamento)}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proforma */}
      {proforma.length > 0 && (
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'20px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={labelSt}>Proforma emesse</div>
            <div style={{ ...mono, fontSize:10, color:T.muted }}>{proformaPagate.length}/{proforma.length} pagate · {currency(totProfPagate)}</div>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['N°','Data','Scadenza','Importo','Stato','Fattura'].map(h=>(
                  <th key={h} style={{ ...mono, fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'6px 10px', borderBottom:`0.5px solid ${T.border}`, textAlign:'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proforma.map(p => (
                <tr key={p.id}>
                  <td style={{ padding:'8px 10px', borderBottom:`0.5px solid ${T.border}`, fontSize:12, fontWeight:600, color:T.ink }}>{p.numero_proforma}</td>
                  <td style={{ padding:'8px 10px', borderBottom:`0.5px solid ${T.border}`, ...mono, fontSize:11, color:T.muted }}>{fmtDate(p.data_creazione)}</td>
                  <td style={{ padding:'8px 10px', borderBottom:`0.5px solid ${T.border}`, ...mono, fontSize:11, color:T.muted }}>{fmtDate(p.data_scadenza)}</td>
                  <td style={{ padding:'8px 10px', borderBottom:`0.5px solid ${T.border}`, ...mono, fontSize:12, fontWeight:600, color:T.navy }}>{currency(p.importo_totale)}</td>
                  <td style={{ padding:'8px 10px', borderBottom:`0.5px solid ${T.border}` }}>
                    <span style={{ ...mono, fontSize:9, color: p.pagato?T.green:T.muted, letterSpacing:'0.05em' }}>{p.pagato?'✓ PAGATA':'IN ATTESA'}</span>
                  </td>
                  <td style={{ padding:'8px 10px', borderBottom:`0.5px solid ${T.border}`, ...mono, fontSize:11, color:T.muted }}>{p.numero_fattura||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fatture */}
      {fatture.length > 0 && (
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'20px 24px' }}>
          <div style={{ ...labelSt, marginBottom:16 }}>Fatture emesse</div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['N°','Data emissione','Scadenza','Importo','Stato'].map(h=>(
                  <th key={h} style={{ ...mono, fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'6px 10px', borderBottom:`0.5px solid ${T.border}`, textAlign:'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fatture.map(f => (
                <tr key={f.id}>
                  <td style={{ padding:'8px 10px', borderBottom:`0.5px solid ${T.border}`, fontSize:12, fontWeight:600, color:T.ink }}>{f.numero_fattura}</td>
                  <td style={{ padding:'8px 10px', borderBottom:`0.5px solid ${T.border}`, ...mono, fontSize:11, color:T.muted }}>{fmtDate(f.data_emissione)}</td>
                  <td style={{ padding:'8px 10px', borderBottom:`0.5px solid ${T.border}`, ...mono, fontSize:11, color:T.muted }}>{fmtDate(f.data_scadenza)}</td>
                  <td style={{ padding:'8px 10px', borderBottom:`0.5px solid ${T.border}`, ...mono, fontSize:12, fontWeight:600, color:T.navy }}>{currency(f.importo_totale)}</td>
                  <td style={{ padding:'8px 10px', borderBottom:`0.5px solid ${T.border}` }}>
                    <span style={{ ...mono, fontSize:9, color:f.pagato?T.green:T.muted, letterSpacing:'0.05em' }}>{f.pagato?'✓ PAGATA':'IN ATTESA'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Costi esterni */}
      {(costiExtra.length > 0 || collab.length > 0) && (
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'20px 24px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={labelSt}>Costi esterni</div>
            <div style={{ ...mono, fontSize:12, fontWeight:600, color:T.red }}>{currency(totEsterni)}</div>
          </div>
          {costiExtra.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ ...mono, fontSize:9, color:T.muted, marginBottom:8 }}>Costi extra</div>
              {costiExtra.map(c => (
                <div key={c.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`0.5px solid ${T.border}` }}>
                  <span style={{ fontSize:13, color:T.ink }}>{c.descrizione||'—'}</span>
                  <span style={{ ...mono, fontSize:12, color:T.red }}>{currency(c.importo)}</span>
                </div>
              ))}
            </div>
          )}
          {collab.length > 0 && (
            <div>
              <div style={{ ...mono, fontSize:9, color:T.muted, marginBottom:8 }}>Collaboratori esterni</div>
              {collab.map(c => (
                <div key={c.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`0.5px solid ${T.border}` }}>
                  <span style={{ fontSize:13, color:T.ink }}>{c.nome_cognome} <span style={{ ...mono, fontSize:10, color:T.muted }}>({c.ruolo})</span></span>
                  <span style={{ ...mono, fontSize:12, color:T.red }}>{currency(c.importo)}</span>
                </div>
              ))}
            </div>
          )}
          {/* Margine */}
          <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0 0', marginTop:8 }}>
            <span style={{ fontSize:14, fontWeight:600, color:T.ink }}>Margine (valore - costi esterni)</span>
            <span style={{ ...mono, fontSize:16, fontWeight:600, color:margine>=0?T.green:T.red }}>{currency(margine)}</span>
          </div>
        </div>
      )}

      {/* Ripristina */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:8 }}>
        <button onClick={async()=>{
          if(!confirm('Ripristinare questa commessa?')) return;
          await supabase.from('commesse').update({ archived:false }).eq('id', id);
          navigate('/impostazioni/commesse-archiviate');
        }} style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.ink, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>
          Ripristina commessa
        </button>
      </div>
    </div>
  );
}
