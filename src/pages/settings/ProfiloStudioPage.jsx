import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";

const TIPO_OPTIONS = [
  {
    id: "proforma",
    emoji: "👤",
    titolo: "Privati / Persone fisiche / Studio associato",
    flusso: "Proforma → Pagamento → Fattura",
    desc: "Il cliente paga la proforma, poi emetti la fattura fiscale.",
  },
  {
    id: "fattura",
    emoji: "🏢",
    titolo: "Società (Srl, Spa, ecc.)",
    flusso: "Fattura → Pagamento sulla fattura",
    desc: "Emetti direttamente fattura fiscale con termini di pagamento (es. 60gg).",
  },
];

function KpiCard({ label, value, color }) {
  const { T } = useTheme();
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow, padding:'16px 20px' }}>
      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:600, letterSpacing:'-0.03em', color:color||T.ink }}>{value}</div>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  const { T } = useTheme();
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow, padding:'20px 22px', marginBottom:14 }}>
      <div style={{ fontSize:14, fontWeight:600, color:T.ink, marginBottom: subtitle?4:16 }}>{title}</div>
      {subtitle && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginBottom:18 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

export default function ProfiloStudioPage() {
  const { T } = useTheme();
  const inputSt = { width:'100%', padding:'8px 12px', boxSizing:'border-box', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontSize:13, fontFamily:"'Space Grotesk', sans-serif", outline:'none' };
  const labelSt = { fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:6, display:'block' };
  usePageTitleOnMount("Profilo Studio");
  const { studioId, studio } = useStudio();

  const [studioData, setStudioData]   = useState(null);
  const [stats, setStats]             = useState({ progetti:0, commesse:0, membri:0 });
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [message, setMessage]         = useState("");
  const [tipoModal, setTipoModal]     = useState(false);

  const [form, setForm] = useState({
    name:'', descrizione:'', piva:'', indirizzo:'', città:'', cap:'',
  });
  const [nuovoTipo, setNuovoTipo] = useState('proforma');

  useEffect(()=>{
    if (!studioId) return;
    const load = async () => {
      const [{ data:st }, { count:nProj }, { count:nComm }, { count:nMem }] = await Promise.all([
        supabase.from("studios").select("*").eq("id", studioId).single(),
        supabase.from("projects").select("*",{count:'exact',head:true}).eq("studio",studioId).eq("archived",false),
        supabase.from("commesse").select("*",{count:'exact',head:true}).eq("studio",studioId),
        supabase.from("team_members").select("*",{count:'exact',head:true}).eq("studio",studioId).eq("active",true),
      ]);
      setStudioData(st);
      setForm({
        name: st?.name||'',
        descrizione: st?.descrizione||'',
        piva: st?.piva||'',
        indirizzo: st?.indirizzo||'',
        città: st?.città||'',
        cap: st?.cap||'',
      });
      setNuovoTipo(st?.tipo_fatturazione||'proforma');
      setStats({ progetti:nProj||0, commesse:nComm||0, membri:nMem||0 });
      setLoading(false);
    };
    load();
  },[studioId]);

  const handleSave = async e => {
    e.preventDefault(); setSaving(true); setMessage('');
    const { error } = await supabase.from("studios").update({
      name: form.name.trim(),
      descrizione: form.descrizione||null,
      piva: form.piva||null,
      indirizzo: form.indirizzo||null,
      città: form.città||null,
      cap: form.cap||null,
    }).eq("id", studioId);
    setMessage(error ? 'Errore: '+error.message : 'Salvato!');
    setSaving(false);
    setTimeout(()=>setMessage(''), 3000);
  };

  const handleCambiaTipo = async () => {
    setSaving(true);
    const { error } = await supabase.from("studios").update({ tipo_fatturazione: nuovoTipo }).eq("id", studioId);
    if (!error) {
      setStudioData(p=>({...p, tipo_fatturazione: nuovoTipo}));
      setTipoModal(false);
      setMessage('Tipo fatturazione aggiornato!');
      setTimeout(()=>setMessage(''), 3000);
    }
    setSaving(false);
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.muted}}>Caricamento...</div>
  );

  const tipoAttuale = TIPO_OPTIONS.find(t=>t.id===(studioData?.tipo_fatturazione||'proforma'));
  const iscritto = studioData?.created_at ? new Date(studioData.created_at).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'}) : '—';

  return (
    <div style={{maxWidth:680}}>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:18,fontWeight:600,color:T.ink,letterSpacing:'-0.02em',marginBottom:4}}>Profilo Studio</div>
        <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted}}>Gestisci le informazioni e le impostazioni del tuo studio</div>
      </div>

      {message && (
        <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:message.includes('Errore')?T.red:T.green,marginBottom:14}}>{message}</div>
      )}

      {/* KPI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        <KpiCard label="Iscritto il" value={iscritto} color={T.muted}/>
        <KpiCard label="Progetti attivi" value={stats.progetti} color={T.navy}/>
        <KpiCard label="Commesse" value={stats.commesse} color={T.green}/>
        <KpiCard label="Membri team" value={stats.membri} color={T.ink}/>
      </div>

      {/* Dati studio */}
      <Panel title="Dati dello studio" subtitle="Informazioni anagrafiche dello studio">
        <form onSubmit={handleSave} style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div style={{gridColumn:'span 2'}}>
              <label style={labelSt}>Nome studio *</label>
              <input type="text" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required style={inputSt}/>
            </div>
            <div style={{gridColumn:'span 2'}}>
              <label style={labelSt}>Descrizione</label>
              <input type="text" value={form.descrizione} onChange={e=>setForm(p=>({...p,descrizione:e.target.value}))} placeholder="Breve descrizione dello studio" style={inputSt}/>
            </div>
            <div>
              <label style={labelSt}>Partita IVA</label>
              <input type="text" value={form.piva} onChange={e=>setForm(p=>({...p,piva:e.target.value}))} placeholder="IT12345678901" style={inputSt}/>
            </div>
            <div>
              <label style={labelSt}>CAP</label>
              <input type="text" value={form.cap} onChange={e=>setForm(p=>({...p,cap:e.target.value}))} placeholder="20121" style={inputSt}/>
            </div>
            <div style={{gridColumn:'span 2'}}>
              <label style={labelSt}>Indirizzo</label>
              <input type="text" value={form.indirizzo} onChange={e=>setForm(p=>({...p,indirizzo:e.target.value}))} placeholder="Via Roma 1" style={inputSt}/>
            </div>
            <div>
              <label style={labelSt}>Città</label>
              <input type="text" value={form.città} onChange={e=>setForm(p=>({...p,città:e.target.value}))} placeholder="Milano" style={inputSt}/>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <button type="submit" disabled={saving} style={{background:T.navy,color:T.bg,border:'none',fontFamily:"'IBM Plex Mono', monospace",fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',padding:'8px 20px',cursor:saving?'not-allowed':'pointer',opacity:saving?0.6:1}}>
              {saving?'Salvataggio...':'Salva'}
            </button>
          </div>
        </form>
      </Panel>

      {/* Tipo fatturazione */}
      <Panel title="Tipo di fatturazione" subtitle="Come gestisci i pagamenti con i tuoi clienti">
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:20}}>{tipoAttuale?.emoji}</span>
              <div style={{fontSize:13,fontWeight:600,color:T.ink}}>{tipoAttuale?.titolo}</div>
            </div>
            <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.navy,marginBottom:4}}>{tipoAttuale?.flusso}</div>
            <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted}}>{tipoAttuale?.desc}</div>
          </div>
          <button onClick={()=>{ setNuovoTipo(studioData?.tipo_fatturazione||'proforma'); setTipoModal(true); }}
            style={{background:'transparent',border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm,color:T.ink,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',padding:'7px 16px',cursor:'pointer',flexShrink:0}}>
            Modifica
          </button>
        </div>

        {/* Avviso cambio tipo */}
        <div style={{marginTop:14,padding:'10px 14px',background:T.yellowLight,border:`0.5px solid ${T.yellow}22`}}>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.yellow,lineHeight:1.6}}>
            ⚠️ Cambiare il tipo di fatturazione influenza il flusso in CommessaDetail — da Proforma a Fattura diretta o viceversa. Le commesse e proforma già create non vengono modificate.
          </div>
        </div>
      </Panel>

      {/* Modal cambio tipo */}
      {tipoModal && (
        <div style={{position:'fixed',inset:0,zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(14,14,13,0.5)',padding:16}}>
          <div style={{width:'100%',maxWidth:500,background:T.surface,border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm,padding:28}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <div style={{fontSize:16,fontWeight:600,color:T.ink}}>Cambia tipo fatturazione</div>
              <button onClick={()=>setTipoModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:20}}>×</button>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
              {TIPO_OPTIONS.map(t=>(
                <button key={t.id} onClick={()=>setNuovoTipo(t.id)} style={{
                  display:'flex',flexDirection:'column',gap:6,padding:'14px 16px',textAlign:'left',
                  border:`0.5px solid ${nuovoTipo===t.id?T.navy:T.border}`, borderRadius: T.radiusSm,
                  background:nuovoTipo===t.id?T.navyLight:T.surface,cursor:'pointer',
                }}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:18}}>{t.emoji}</span>
                    <div style={{fontSize:13,fontWeight:600,color:T.ink}}>{t.titolo}</div>
                    {nuovoTipo===t.id&&<span style={{marginLeft:'auto',color:T.navy,fontSize:12}}>✓</span>}
                  </div>
                  <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.navy,marginLeft:26}}>{t.flusso}</div>
                  <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,marginLeft:26}}>{t.desc}</div>
                </button>
              ))}
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',gap:10,paddingTop:14,borderTop:`0.5px solid ${T.border}`}}>
              <button onClick={()=>setTipoModal(false)} style={{border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm,background:'transparent',color:T.ink,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',padding:'8px 18px',cursor:'pointer'}}>Annulla</button>
              <button onClick={handleCambiaTipo} disabled={saving||nuovoTipo===(studioData?.tipo_fatturazione||'proforma')} style={{background:T.navy,border:'none',color:T.bg,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',padding:'8px 18px',cursor:'pointer',opacity:saving||nuovoTipo===(studioData?.tipo_fatturazione||'proforma')?0.6:1}}>
                {saving?'Salvataggio...':'Conferma cambio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Codice invito */}
      <Panel title="Codice invito studio">
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:24,letterSpacing:'0.3em',color:T.navy,fontWeight:600,background:T.bg,padding:'10px 20px',border:`0.5px solid ${T.border}`}}>
            {studioData?.invite_code||'——'}
          </div>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted,lineHeight:1.6}}>
            Condividi questo codice con i tuoi collaboratori<br/>per invitarli allo studio.
          </div>
        </div>
      </Panel>
    </div>
  );
}
