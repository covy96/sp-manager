import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStudio } from "../../hooks/useStudio";
import { useTheme } from "../../contexts/ThemeContext";
import { supabase } from "../../lib/supabase";

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style:"currency", currency:"EUR", maximumFractionDigits:2 }).format(Number(v)||0);
}
function fmtOre(h) {
  const tot = Math.round(Number(h) * 60);
  return `${Math.floor(tot/60)}:${String(tot%60).padStart(2,'0')}`;
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' });
}

export default function ProgettoArchiviotoRecapPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { studioId } = useStudio();
  const { T } = useTheme();

  const [project, setProject]   = useState(null);
  const [tasks, setTasks]       = useState([]);
  const [timesheet, setTimesheet] = useState([]);
  const [members, setMembers]   = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!id || !studioId) return;
    const load = async () => {
      const [
        { data: proj },
        { data: tsk },
        { data: ts },
        { data: mem },
        { data: comm },
      ] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("tasks").select("*").eq("project_id", id).is("deleted_at", null),
        supabase.from("timesheet").select("*").eq("project_id", id).eq("studio", studioId),
        supabase.from("team_members").select("id, user_name, user_email, color").eq("studio", studioId),
        supabase.from("commesse").select("id, nome_commessa, importo_offerta_base, importo_totale, importo_incassato, stato_pagamento").eq("project_id", id),
      ]);
      setProject(proj);
      setTasks(tsk ?? []);
      setTimesheet(ts ?? []);
      setMembers(mem ?? []);
      setCommesse(comm ?? []);
      setLoading(false);
    };
    load();
  }, [id, studioId]);

  const mono = { fontFamily:"'IBM Plex Mono', monospace" };
  const labelSt = { ...mono, fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:8 };

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240, ...mono, fontSize:11, color:T.muted }}>Caricamento...</div>;
  if (!project) return <div style={{ ...mono, fontSize:11, color:T.red }}>Progetto non trovato</div>;

  // Calcoli task
  const taskTotali    = tasks.filter(t => !t.parent_task_id).length;
  const taskCompletate = tasks.filter(t => !t.parent_task_id && t.status === 'completed').length;
  const taskPercent   = taskTotali > 0 ? Math.round((taskCompletate / taskTotali) * 100) : 0;

  // Calcoli timesheet
  const oreTotali = timesheet.reduce((s, t) => s + Number(t.hours || 0), 0);
  const orePerMembro = {};
  timesheet.forEach(t => {
    const nome = t.user_name || members.find(m => m.id === t.team_member)?.user_name || 'Sconosciuto';
    orePerMembro[nome] = (orePerMembro[nome] || 0) + Number(t.hours || 0);
  });

  // Calcoli commesse
  const valoreCommesse = commesse.reduce((s, c) => s + Number(c.importo_offerta_base || 0), 0);
  const incassato      = commesse.reduce((s, c) => s + Number(c.importo_incassato || 0), 0);

  // Task per categoria
  const perCategoria = {};
  tasks.filter(t => !t.parent_task_id).forEach(t => {
    const cat = t.categoria || 'Senza categoria';
    if (!perCategoria[cat]) perCategoria[cat] = { totale:0, completate:0 };
    perCategoria[cat].totale++;
    if (t.status === 'completed') perCategoria[cat].completate++;
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:720 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={()=>navigate('/impostazioni/progetti-archiviati')} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, cursor:'pointer', color:T.muted, padding:'5px 12px', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase' }}>
          ← Archiviati
        </button>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em' }}>{project.name}</div>
            <span style={{ ...mono, fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'#854d0e', background:'#fefce8', padding:'3px 8px', borderRadius:2 }}>ARCHIVIATO</span>
          </div>
          {project.client && <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:2 }}>{project.client}</div>}
        </div>
      </div>

      {/* KPI principali */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'Task completate', value:`${taskCompletate}/${taskTotali}`, sub:`${taskPercent}%`, color:T.green },
          { label:'Ore lavorate',    value:fmtOre(oreTotali),                sub:'totali',           color:T.navy },
          { label:'Valore commesse', value:currency(valoreCommesse),         sub:'',                 color:T.ink  },
          { label:'Incassato',       value:currency(incassato),              sub:`${valoreCommesse>0?Math.round((incassato/valoreCommesse)*100):0}%`, color:T.green },
        ].map((k,i) => (
          <div key={i} style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'16px 20px' }}>
            <div style={labelSt}>{k.label}</div>
            <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:k.color }}>{k.value}</div>
            {k.sub && <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:4 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Info progetto */}
      <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'20px 24px' }}>
        <div style={{ ...labelSt, marginBottom:16 }}>Informazioni progetto</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
          {[
            ['Indirizzo', project.address || '—'],
            ['Creato il', fmtDate(project.created_at)],
            ['Stato finale', project.status || '—'],
          ].map(([l,v]) => (
            <div key={l}>
              <div style={{ ...mono, fontSize:9, color:T.muted, marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:13, color:T.ink }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task per categoria */}
      {Object.keys(perCategoria).length > 0 && (
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'20px 24px' }}>
          <div style={{ ...labelSt, marginBottom:16 }}>Task per categoria</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Object.entries(perCategoria).map(([cat, { totale, completate }]) => {
              const perc = totale > 0 ? Math.round((completate/totale)*100) : 0;
              return (
                <div key={cat}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:13, color:T.ink }}>{cat}</span>
                    <span style={{ ...mono, fontSize:11, color:T.muted }}>{completate}/{totale} · {perc}%</span>
                  </div>
                  <div style={{ height:4, background:T.border, borderRadius:2 }}>
                    <div style={{ height:4, background:perc===100?T.green:T.navy, width:`${perc}%`, borderRadius:2, transition:'width 0.3s' }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ore per membro */}
      {Object.keys(orePerMembro).length > 0 && (
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'20px 24px' }}>
          <div style={{ ...labelSt, marginBottom:16 }}>Ore per membro</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {Object.entries(orePerMembro).sort((a,b)=>b[1]-a[1]).map(([nome, ore]) => {
              const m = members.find(x => x.user_name === nome || x.user_email === nome);
              const perc = oreTotali > 0 ? (ore/oreTotali)*100 : 0;
              return (
                <div key={nome} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:m?.color||T.navy, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, color:'#fff', flexShrink:0 }}>
                    {(nome||'?').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:13, color:T.ink }}>{nome}</span>
                      <span style={{ ...mono, fontSize:11, color:T.navy, fontWeight:600 }}>{fmtOre(ore)}</span>
                    </div>
                    <div style={{ height:3, background:T.border, borderRadius:2 }}>
                      <div style={{ height:3, background:T.navy, width:`${perc}%`, borderRadius:2 }}/>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:10, borderTop:`0.5px solid ${T.border}`, marginTop:4 }}>
              <span style={{ ...mono, fontSize:10, color:T.muted }}>Totale ore</span>
              <span style={{ ...mono, fontSize:12, fontWeight:600, color:T.ink }}>{fmtOre(oreTotali)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Commesse collegate */}
      {commesse.length > 0 && (
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'20px 24px' }}>
          <div style={{ ...labelSt, marginBottom:16 }}>Commesse collegate</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {commesse.map(c => {
              const tot = Number(c.importo_offerta_base||0);
              const inc = Number(c.importo_incassato||0);
              const perc = tot > 0 ? Math.round((inc/tot)*100) : 0;
              return (
                <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:T.surface2, border:`0.5px solid ${T.border}` }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{c.nome_commessa}</div>
                    <div style={{ ...mono, fontSize:9, color:T.muted, marginTop:2, textTransform:'uppercase', letterSpacing:'0.08em' }}>{c.stato_pagamento||'—'}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ ...mono, fontSize:13, fontWeight:600, color:T.navy }}>{currency(tot)}</div>
                    <div style={{ ...mono, fontSize:9, color:T.green, marginTop:2 }}>{perc}% incassato</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ripristina */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:8 }}>
        <button onClick={async()=>{
          if(!confirm('Ripristinare questo progetto?')) return;
          await supabase.from('projects').update({ archived:false }).eq('id', id);
          navigate('/impostazioni/progetti-archiviati');
        }} style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.ink, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>
          Ripristina progetto
        </button>
      </div>
    </div>
  );
}
