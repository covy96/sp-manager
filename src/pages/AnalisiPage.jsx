import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { useTheme } from "../contexts/ThemeContext";
import { usePermissions } from "../hooks/usePermissions";
import { usePlan } from "../hooks/usePlan";
import { supabase } from "../lib/supabase";

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style:"currency", currency:"EUR", maximumFractionDigits:2 }).format(Number(v)||0);
}
function fmtOre(h) {
  const tot = Math.round(h * 60);
  return `${Math.floor(tot/60)}:${String(tot%60).padStart(2,'0')}`;
}

export default function AnalisiPage() {
  usePageTitleOnMount("Analisi");
  const navigate = useNavigate();
  const { T } = useTheme();
  const { studioId } = useStudio();
  const permissions = usePermissions();
  const { plan } = usePlan();

  const [projects, setProjects]     = useState([]);
  const [members, setMembers]       = useState([]);
  const [timesheet, setTimesheet]   = useState([]);
  const [commesse, setCommesse]     = useState([]);
  const [costiExtra, setCostiExtra] = useState([]);
  const [collab, setCollab]         = useState([]);
  const [loading, setLoading]       = useState(true);

  const [selectedProject, setSelectedProject] = useState(null);
  const [costiPanel, setCostiPanel]           = useState(false);
  const [editCosti, setEditCosti]             = useState({}); // memberId → costo_orario
  const [savingCosti, setSavingCosti]         = useState(false);

  // ── LOAD ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!studioId) return;
    const load = async () => {
      const [
        { data:proj },
        { data:mem },
        { data:ts },
        { data:comm },
        { data:ce },
        { data:co },
      ] = await Promise.all([
        supabase.from("projects").select("id,name,client").eq("studio",studioId).eq("archived",false).order("name"),
        supabase.from("team_members").select("id,user_name,user_email,color,costo_orario").eq("studio",studioId).eq("active",true),
        supabase.from("timesheet").select("project_id,hours,team_member").eq("studio",studioId),
        supabase.from("commesse").select("id,project_id,project_name,nome_commessa,cliente,importo_offerta_base,importo_totale,archived").eq("studio",studioId),
        supabase.from("costi_extra").select("commessa_id,importo").eq("studio",studioId),
        supabase.from("collaboratori_esterni").select("commessa_id,importo").eq("studio",studioId),
      ]);
      setProjects(proj??[]);
      setMembers(mem??[]);
      setTimesheet(ts??[]);
      setCommesse(comm??[]);
      setCostiExtra(ce??[]);
      setCollab(co??[]);
      // Init editCosti
      const map = {};
      (mem??[]).forEach(m => { map[m.id] = m.costo_orario||0; });
      setEditCosti(map);
      setLoading(false);
    };
    load();
  }, [studioId]);

  // ── CALCOLI PER PROGETTO ──────────────────────────────────────────
  const projectStats = useMemo(() => {
    return projects.map(proj => {
      // Ore per membro su questo progetto
      const tsProj = timesheet.filter(t => t.project_id === proj.id);
      const orePerMembro = {};
      tsProj.forEach(t => {
        orePerMembro[t.team_member] = (orePerMembro[t.team_member]||0) + Number(t.hours||0);
      });
      const oreTotali = Object.values(orePerMembro).reduce((s,v)=>s+v, 0);

      // Costo ore per membro
      let costoOre = 0;
      const membroBreakdown = members.map(m => {
        const ore = orePerMembro[m.id]||0;
        const costo = ore * Number(editCosti[m.id]||m.costo_orario||0);
        costoOre += costo;
        return { ...m, ore, costo };
      }).filter(m => m.ore > 0);

      // Commesse del progetto
      const commProj = commesse.filter(c => c.project_id === proj.id);
      const valoreCommesse = commProj.reduce((s,c) => s + Number(c.importo_totale || c.importo_offerta_base || 0), 0);

      // Costi extra e collaboratori
      const commIds = commProj.map(c=>c.id);
      const costExtra = costiExtra.filter(c=>commIds.includes(c.commessa_id)).reduce((s,c)=>s+Number(c.importo||0),0);
      const costCollab = collab.filter(c=>commIds.includes(c.commessa_id)).reduce((s,c)=>s+Number(c.importo||0),0);
      const costoEsterni = costExtra + costCollab;

      const costoTotale = costoOre + costoEsterni;
      const margine = valoreCommesse - costoTotale;
      const marginePerc = valoreCommesse > 0 ? (margine/valoreCommesse)*100 : null;

      return { proj, oreTotali, costoOre, costoEsterni, costoTotale, valoreCommesse, margine, marginePerc, membroBreakdown, commProj };
    });
  }, [projects, timesheet, members, commesse, costiExtra, collab, editCosti]);

  // ── SALVA COSTI ORARI ─────────────────────────────────────────────
  const handleSaveCosti = async () => {
    setSavingCosti(true);
    await Promise.all(
      members.map(m =>
        supabase.from("team_members").update({ costo_orario: Number(editCosti[m.id])||0 }).eq("id", m.id)
      )
    );
    setSavingCosti(false);
    setCostiPanel(false);
  };

  // ── STILI ─────────────────────────────────────────────────────────
  const mono = { fontFamily:"'IBM Plex Mono', monospace" };
  const label = { ...mono, fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted };
  const thSt  = { ...mono, fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'8px 14px', borderBottom:`0.5px solid ${T.border}`, textAlign:'left', whiteSpace:'nowrap' };
  const tdSt  = { padding:'10px 14px', borderBottom:`0.5px solid ${T.border}`, fontSize:12, color:T.ink };

  if (!permissions.isOwner) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240 }}>
      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, textAlign:'center' }}>
        Questa sezione è riservata al titolare dello studio.
      </div>
    </div>
  );

  if (plan.id !== 'pro') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:16 }}>
      <div style={{ fontSize:32 }}>🔒</div>
      <div style={{ fontSize:16, fontWeight:600, color:T.ink }}>Funzionalità Pro</div>
      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, textAlign:'center', maxWidth:360 }}>
        La pagina Analisi è disponibile solo per il piano Pro.<br/>Fai l'upgrade per accedere ai report economici.
      </div>
      <button onClick={()=>navigate('/impostazioni/piano')} style={{ background:T.navy, color:'#EEF1F6', border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'10px 24px', cursor:'pointer' }}>
        Vedi piani →
      </button>
    </div>
  );

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240, ...mono, fontSize:11, color:T.muted }}>
      Caricamento...
    </div>
  );

  // ── DETTAGLIO PROGETTO ────────────────────────────────────────────
  if (selectedProject) {
    const stat = projectStats.find(s => s.proj.id === selectedProject.id);
    if (!stat) return null;

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>setSelectedProject(null)} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, cursor:'pointer', color:T.muted, padding:'5px 12px', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase' }}>← Analisi</button>
          <div>
            <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em' }}>{stat.proj.name}</div>
            {stat.proj.client && <div style={{ ...mono, fontSize:10, color:T.muted }}>{stat.proj.client}</div>}
          </div>
        </div>

        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          {[
            { label:'Valore commesse',  value:currency(stat.valoreCommesse), color:T.ink  },
            { label:'Costo ore interne',value:currency(stat.costoOre),       color:T.navy },
            { label:'Costi esterni',    value:currency(stat.costoEsterni),   color:T.muted},
            { label:'Margine stimato',  value:currency(stat.margine),        color:stat.margine>=0?T.green:T.red,
              sub: stat.marginePerc!=null ? `${stat.marginePerc.toFixed(1)}%` : null },
          ].map((k,i)=>(
            <div key={i} style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'16px 20px' }}>
              <div style={{ ...label, marginBottom:8 }}>{k.label}</div>
              <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:k.color }}>{k.value}</div>
              {k.sub && <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:4 }}>{k.sub} del valore</div>}
            </div>
          ))}
        </div>

        {/* ── ANALISI 1: Costo ore interne ── */}
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}` }}>
          <div style={{ padding:'14px 20px', borderBottom:`0.5px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>Costo ore interne</div>
            <div style={{ ...mono, fontSize:10, color:T.muted }}>{fmtOre(stat.oreTotali)} ore totali</div>
          </div>
          {stat.membroBreakdown.length === 0 ? (
            <div style={{ padding:'32px 0', textAlign:'center', ...mono, fontSize:11, color:T.muted }}>Nessuna ora registrata</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={thSt}>Membro</th>
                  <th style={thSt}>Ore</th>
                  <th style={thSt}>Costo/ora</th>
                  <th style={thSt}>Costo totale</th>
                  <th style={thSt}>% del costo</th>
                </tr>
              </thead>
              <tbody>
                {stat.membroBreakdown.map(m => (
                  <tr key={m.id}>
                    <td style={tdSt}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:24, height:24, borderRadius:'50%', background:m.color||T.navy, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:600, color:'#fff', flexShrink:0 }}>
                          {(m.user_name||'?').slice(0,2).toUpperCase()}
                        </div>
                        <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{m.user_name||m.user_email}</div>
                      </div>
                    </td>
                    <td style={{ ...tdSt, ...mono, fontSize:12 }}>{fmtOre(m.ore)}</td>
                    <td style={{ ...tdSt, ...mono, fontSize:12, color:T.muted }}>
                      {Number(editCosti[m.id]||m.costo_orario||0) > 0 ? currency(Number(editCosti[m.id]||m.costo_orario))+'/h' : <span style={{ color:T.muted, fontSize:10 }}>non impostato</span>}
                    </td>
                    <td style={{ ...tdSt, ...mono, fontSize:13, fontWeight:600, color:T.navy }}>{currency(m.costo)}</td>
                    <td style={tdSt}>
                      {stat.costoOre > 0 ? (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:4, background:T.border, maxWidth:80 }}>
                            <div style={{ height:4, background:T.navy, width:`${(m.costo/stat.costoOre)*100}%` }}/>
                          </div>
                          <span style={{ ...mono, fontSize:10, color:T.muted }}>{((m.costo/stat.costoOre)*100).toFixed(0)}%</span>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ ...tdSt, fontWeight:600, color:T.ink }}>Totale ore interne</td>
                  <td style={{ ...tdSt, ...mono, fontSize:14, fontWeight:600, color:T.navy }}>{currency(stat.costoOre)}</td>
                  <td style={tdSt}/>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* ── ANALISI 2: Costi esterni ── */}
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}` }}>
          <div style={{ padding:'14px 20px', borderBottom:`0.5px solid ${T.border}` }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>Costi esterni</div>
            <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:2 }}>Costi extra e collaboratori dalle commesse collegate</div>
          </div>
          {stat.commProj.length === 0 ? (
            <div style={{ padding:'32px 0', textAlign:'center', ...mono, fontSize:11, color:T.muted }}>Nessuna commessa collegata</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={thSt}>Commessa</th>
                  <th style={thSt}>Importo base</th>
                  <th style={thSt}>Valore contratto</th>
                  <th style={thSt}>Costi extra</th>
                  <th style={thSt}>Collaboratori</th>
                  <th style={thSt}>Totale esterni</th>
                </tr>
              </thead>
              <tbody>
                {stat.commProj.map(c => {
                  const ce = costiExtra.filter(x=>x.commessa_id===c.id).reduce((s,x)=>s+Number(x.importo||0),0);
                  const co = collab.filter(x=>x.commessa_id===c.id).reduce((s,x)=>s+Number(x.importo||0),0);
                  return (
                    <tr key={c.id}>
                      <td style={{ ...tdSt, fontWeight:600 }}>{c.nome_commessa || '—'}</td>
                      <td style={{ ...tdSt, ...mono, fontSize:12 }}>{currency(c.importo_offerta_base||0)}</td>
                      <td style={{ ...tdSt, ...mono, fontSize:12 }}>{currency(c.importo_totale||0)}</td>
                      <td style={{ ...tdSt, ...mono, fontSize:12 }}>{currency(ce)}</td>
                      <td style={{ ...tdSt, ...mono, fontSize:12 }}>{currency(co)}</td>
                      <td style={{ ...tdSt, ...mono, fontSize:13, fontWeight:600, color:T.red }}>{currency(ce+co)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={5} style={{ ...tdSt, fontWeight:600, color:T.ink }}>Totale esterni</td>
                  <td style={{ ...tdSt, ...mono, fontSize:14, fontWeight:600, color:T.red }}>{currency(stat.costoEsterni)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Riepilogo finale */}
        <div style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'20px 24px' }}>
          <div style={{ fontSize:14, fontWeight:600, color:T.ink, marginBottom:16 }}>Riepilogo economico</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, maxWidth:400 }}>
            {[
              ['Valore commesse', currency(stat.valoreCommesse), T.ink],
              ['− Costo ore interne', currency(stat.costoOre), T.navy],
              ['− Costi esterni', currency(stat.costoEsterni), T.muted],
            ].map(([l,v,c])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`0.5px solid ${T.border}` }}>
                <span style={{ ...mono, fontSize:11, color:T.muted }}>{l}</span>
                <span style={{ ...mono, fontSize:12, fontWeight:600, color:c }}>{v}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', marginTop:4 }}>
              <span style={{ fontSize:14, fontWeight:600, color:T.ink }}>Margine stimato</span>
              <div style={{ textAlign:'right' }}>
                <span style={{ fontSize:18, fontWeight:600, color:stat.margine>=0?T.green:T.red }}>{currency(stat.margine)}</span>
                {stat.marginePerc!=null && <div style={{ ...mono, fontSize:10, color:T.muted }}>{stat.marginePerc.toFixed(1)}%</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LISTA PROGETTI ────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.ink, marginBottom:4 }}>Analisi economica</div>
          <div style={{ ...mono, fontSize:10, color:T.muted }}>Costi, margini e redditività per progetto — visibile solo al titolare</div>
        </div>
        <button onClick={()=>setCostiPanel(true)} style={{ background:T.navy, color:T.bg, border:'none', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'9px 20px', cursor:'pointer' }}>
          ⚙ Costi orari
        </button>
      </div>

      {/* Tabella progetti */}
      <div style={{ background:T.surface, border:`0.5px solid ${T.border}` }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={thSt}>Progetto</th>
              <th style={thSt}>Ore totali</th>
              <th style={thSt}>Costo ore</th>
              <th style={thSt}>Costi esterni</th>
              <th style={thSt}>Costo totale</th>
              <th style={thSt}>Valore commesse</th>
              <th style={thSt}>Margine</th>
              <th style={thSt}></th>
            </tr>
          </thead>
          <tbody>
            {projectStats.length === 0 ? (
              <tr><td colSpan={8} style={{ ...tdSt, textAlign:'center', color:T.muted, padding:'32px 0' }}>Nessun progetto attivo</td></tr>
            ) : projectStats.map(({ proj, oreTotali, costoOre, costoEsterni, costoTotale, valoreCommesse, margine, marginePerc }) => (
              <tr key={proj.id}
                onClick={()=>setSelectedProject(proj)}
                style={{ cursor:'pointer' }}
                onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <td style={tdSt}>
                  <div style={{ fontWeight:600, color:T.ink }}>{proj.name}</div>
                  {proj.client && <div style={{ ...mono, fontSize:9, color:T.muted }}>{proj.client}</div>}
                </td>
                <td style={{ ...tdSt, ...mono, fontSize:12 }}>{fmtOre(oreTotali)}</td>
                <td style={{ ...tdSt, ...mono, fontSize:12, color:T.navy }}>{currency(costoOre)}</td>
                <td style={{ ...tdSt, ...mono, fontSize:12, color:T.muted }}>{currency(costoEsterni)}</td>
                <td style={{ ...tdSt, ...mono, fontSize:12, fontWeight:600, color:T.ink }}>{currency(costoTotale)}</td>
                <td style={{ ...tdSt, ...mono, fontSize:12, color:T.green }}>{currency(valoreCommesse)}</td>
                <td style={tdSt}>
                  <div style={{ ...mono, fontSize:13, fontWeight:600, color:margine>=0?T.green:T.red }}>{currency(margine)}</div>
                  {marginePerc!=null && <div style={{ ...mono, fontSize:9, color:T.muted }}>{marginePerc.toFixed(1)}%</div>}
                </td>
                <td style={{ ...tdSt, ...mono, fontSize:10, color:T.navy }}>→</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totali */}
      {projectStats.length > 0 && (() => {
        const totOre = projectStats.reduce((s,p)=>s+p.oreTotali,0);
        const totCosto = projectStats.reduce((s,p)=>s+p.costoTotale,0);
        const totValore = projectStats.reduce((s,p)=>s+p.valoreCommesse,0);
        const totMargine = totValore - totCosto;
        return (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { label:'Ore totali studio',   value:fmtOre(totOre),       color:T.ink  },
              { label:'Costo totale',        value:currency(totCosto),   color:T.navy },
              { label:'Valore commesse',     value:currency(totValore),  color:T.green},
              { label:'Margine complessivo', value:currency(totMargine), color:totMargine>=0?T.green:T.red },
            ].map((k,i)=>(
              <div key={i} style={{ background:T.surface, border:`0.5px solid ${T.border}`, padding:'16px 20px' }}>
                <div style={{ ...label, marginBottom:8 }}>{k.label}</div>
                <div style={{ fontSize:20, fontWeight:600, letterSpacing:'-0.03em', color:k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── PANEL COSTI ORARI ── */}
      {costiPanel && (
        <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', padding:16 }}>
          <div style={{ width:'100%', maxWidth:480, background:T.surface, border:`0.5px solid ${T.borderMd}`, padding:28, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:600, color:T.ink }}>Costi orari del team</div>
                <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:2 }}>Imposta il costo orario per ogni membro</div>
              </div>
              <button onClick={()=>setCostiPanel(false)} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:20 }}>×</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
              {members.map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:T.surface2, border:`0.5px solid ${T.border}` }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:m.color||T.navy, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff', flexShrink:0 }}>
                    {(m.user_name||'?').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{m.user_name||m.user_email}</div>
                    <div style={{ ...mono, fontSize:9, color:T.muted }}>{m.user_email}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ ...mono, fontSize:11, color:T.muted }}>€</span>
                    <input
                      type="number" min={0} step={0.5}
                      value={editCosti[m.id]??0}
                      onChange={e => setEditCosti(p=>({...p,[m.id]:e.target.value}))}
                      style={{ width:70, padding:'6px 8px', border:`0.5px solid ${T.borderMd}`, background:T.inputBg, color:T.inputText, fontSize:13, ...mono, outline:'none', textAlign:'right' }}
                    />
                    <span style={{ ...mono, fontSize:11, color:T.muted }}>/h</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:14, borderTop:`0.5px solid ${T.border}` }}>
              <button onClick={()=>setCostiPanel(false)} style={{ border:`0.5px solid ${T.borderMd}`, background:'transparent', color:T.ink, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>
                Annulla
              </button>
              <button onClick={handleSaveCosti} disabled={savingCosti} style={{ background:T.navy, border:'none', color:T.bg, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 20px', cursor:savingCosti?'not-allowed':'pointer', opacity:savingCosti?0.6:1 }}>
                {savingCosti ? 'Salvataggio...' : 'Salva costi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
