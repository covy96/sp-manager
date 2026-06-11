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

  const [members, setMembers]           = useState([]);
  const [timesheet, setTimesheet]       = useState([]);
  const [commesse, setCommesse]         = useState([]);
  const [costiExtra, setCostiExtra]     = useState([]);
  const [collab, setCollab]             = useState([]);
  const [ratePagate, setRatePagate]     = useState([]);
  const [costiInterni, setCostiInterni] = useState([]);
  const [loading, setLoading]           = useState(true);

  const [selectedCommessa, setSelectedCommessa] = useState(null);
  const [costiPanel, setCostiPanel]             = useState(false);
  const [editCosti, setEditCosti]               = useState({});
  const [savingCosti, setSavingCosti]           = useState(false);
  const [annoFiltro, setAnnoFiltro]             = useState(0);
  const [search, setSearch]                     = useState("");
  const [sortCol, setSortCol]                   = useState("margine");
  const [sortAsc, setSortAsc]                   = useState(false);
  const handleSortCol = col => { if (sortCol === col) setSortAsc(p => !p); else { setSortCol(col); setSortAsc(false); } };

  // ── LOAD ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!studioId) return;
    const load = async () => {
      const [
        { data:mem },
        { data:ts },
        { data:comm },
        { data:ce },
        { data:co },
        { data:rp },
        { data:ci },
      ] = await Promise.all([
        supabase.from("team_members").select("id,user_name,user_email,color,costo_orario").eq("studio",studioId).eq("active",true),
        supabase.from("timesheet").select("project_id,hours,team_member").eq("studio",studioId).is("deleted_at",null),
        supabase.from("commesse").select("id,project_id,nome_commessa,cliente,numero_offerta,importo_offerta_base,importo_totale,data_commessa,created_at,archived").eq("studio",studioId).is("deleted_at",null),
        supabase.from("costi_extra").select("commessa_id,importo").eq("studio",studioId),
        supabase.from("collaboratori_esterni").select("commessa_id,importo").eq("studio",studioId),
        supabase.from("suddivisione_pagamenti").select("commessa_id,percentuale,importo_fisso").eq("pagato",true),
        supabase.from("costi_interni").select("*").eq("studio",studioId),
      ]);
      setMembers(mem??[]);
      setTimesheet(ts??[]);
      setCommesse(comm??[]);
      setCostiExtra(ce??[]);
      setCollab(co??[]);
      setRatePagate(rp??[]);
      setCostiInterni(ci??[]);
      const map = {};
      (mem??[]).forEach(m => { map[m.id] = m.costo_orario||0; });
      setEditCosti(map);
      setLoading(false);
    };
    load();
  }, [studioId]);

  // ── ANNI DISPONIBILI ─────────────────────────────────────────────
  const anniDisponibili = useMemo(() => {
    const anni = new Set([new Date().getFullYear()]);
    commesse.forEach(c => { const d = c.data_commessa || c.created_at; if (d) anni.add(new Date(d).getFullYear()); });
    return Array.from(anni).sort((a,b)=>b-a);
  }, [commesse]);

  // ── COMMESSE FILTRATE PER ANNO ────────────────────────────────────
  const commesseFiltrate = useMemo(() => {
    if (annoFiltro === 0) return commesse;
    return commesse.filter(c => {
      const d = c.data_commessa || c.created_at;
      return d && new Date(d).getFullYear() === annoFiltro;
    });
  }, [commesse, annoFiltro]);

  // ── CALCOLI PER COMMESSA ──────────────────────────────────────────
  const commessaStats = useMemo(() => {
    return commesseFiltrate.map(c => {
      // Ore dal progetto collegato
      const tsProj = c.project_id ? timesheet.filter(t => t.project_id === c.project_id) : [];
      const orePerMembro = {};
      tsProj.forEach(t => { orePerMembro[t.team_member] = (orePerMembro[t.team_member]||0) + Number(t.hours||0); });
      const oreTotali = Object.values(orePerMembro).reduce((s,v)=>s+v, 0);

      let costoOre = 0;
      const membroBreakdown = members.map(m => {
        const ore = orePerMembro[m.id]||0;
        const costo = ore * Number(editCosti[m.id]||m.costo_orario||0);
        costoOre += costo;
        return { ...m, ore, costo };
      }).filter(m => m.ore > 0);

      const valoreBase   = Number(c.importo_offerta_base)||0;
      const valoreTotale = Number(c.importo_totale)||valoreBase;

      const costExtra  = costiExtra.filter(x => x.commessa_id === c.id).reduce((s,x) => s+Number(x.importo||0), 0);
      const costCollab = collab.filter(x => x.commessa_id === c.id).reduce((s,x) => s+Number(x.importo||0), 0);
      const costoEsterni = costExtra + costCollab;

      const costoInterno = costiInterni.filter(x => x.commessa_id === c.id).reduce((s,x) => s+Number(x.importo||0), 0);

      const paid = ratePagate.filter(r => r.commessa_id === c.id);
      const incassato = paid.reduce((rs,r) => rs + (Number(r.importo_fisso) || (valoreBase * (Number(r.percentuale)||0) / 100)), 0);

      const costoTotale = costoOre + costoEsterni + costoInterno;
      const margine = valoreBase - costoTotale;
      const marginePerc = valoreBase > 0 ? (margine/valoreBase)*100 : null;

      return { commessa: c, oreTotali, costoOre, costoEsterni, costoInterno, costoTotale, valoreBase, valoreTotale, incassato, margine, marginePerc, membroBreakdown };
    });
  }, [commesseFiltrate, timesheet, members, costiExtra, collab, ratePagate, costiInterni, editCosti]);

  // ── SALVA COSTI ORARI ─────────────────────────────────────────────
  const handleSaveCosti = async () => {
    setSavingCosti(true);
    await Promise.all(members.map(m => supabase.from("team_members").update({ costo_orario: Number(editCosti[m.id])||0 }).eq("id", m.id)));
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
      <div style={{ ...mono, fontSize:11, color:T.muted, textAlign:'center' }}>Questa sezione è riservata al titolare dello studio.</div>
    </div>
  );

  if (plan.id !== 'pro') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:16 }}>
      <div style={{ fontSize:32 }}>🔒</div>
      <div style={{ fontSize:16, fontWeight:600, color:T.ink }}>Funzionalità Pro</div>
      <div style={{ ...mono, fontSize:11, color:T.muted, textAlign:'center', maxWidth:360 }}>La pagina Analisi è disponibile solo per il piano Pro.<br/>Fai l'upgrade per accedere ai report economici.</div>
      <button onClick={()=>navigate('/impostazioni/piano')} style={{ background:T.navy, color:'#EEF1F6', border:'none', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'10px 24px', cursor:'pointer' }}>Vedi piani →</button>
    </div>
  );

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240, ...mono, fontSize:11, color:T.muted }}>Caricamento...</div>
  );

  // ── DETTAGLIO COMMESSA ────────────────────────────────────────────
  if (selectedCommessa) {
    const stat = commessaStats.find(s => s.commessa.id === selectedCommessa.id);
    if (!stat) return null;
    const c = stat.commessa;

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>setSelectedCommessa(null)} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor:'pointer', color:T.muted, padding:'5px 12px', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase' }}>← Analisi</button>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em' }}>{c.nome_commessa}</div>
              {c.numero_offerta && <span style={{ ...mono, fontSize:9, color:T.muted, border:`1px solid ${T.border}`, borderRadius: T.radiusSm, padding:'2px 6px' }}>{c.numero_offerta}</span>}
              {c.archived && <span style={{ ...mono, fontSize:9, color:'#854d0e', background:'#fefce8', padding:'2px 8px', borderRadius:2 }}>ARCHIVIATA</span>}
            </div>
            <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:2 }}>{c.cliente || '—'}</div>
          </div>
        </div>

        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 20px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
            <div style={{ ...label, marginBottom:8 }}>Valore base offerta</div>
            <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.ink }}>{currency(stat.valoreBase)}</div>
            <div style={{ ...mono, fontSize:9, color:T.muted, marginTop:4 }}>senza IVA / contributi</div>
          </div>
          {stat.valoreTotale !== stat.valoreBase && (
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 20px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
              <div style={{ ...label, marginBottom:8 }}>Valore con IVA/contributi</div>
              <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.ink }}>{currency(stat.valoreTotale)}</div>
            </div>
          )}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 20px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
            <div style={{ ...label, marginBottom:8 }}>Incassato</div>
            <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.green }}>{currency(stat.incassato)}</div>
            {stat.valoreBase>0 && <div style={{ ...mono, fontSize:9, color:T.muted, marginTop:4 }}>{((stat.incassato/stat.valoreBase)*100).toFixed(0)}% del valore base</div>}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 20px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
            <div style={{ ...label, marginBottom:8 }}>Costo ore interne</div>
            <div style={{ fontSize:20, fontWeight:600, letterSpacing:'-0.03em', color:T.navy }}>{currency(stat.costoOre)}</div>
          </div>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 20px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
            <div style={{ ...label, marginBottom:8 }}>Costi esterni</div>
            <div style={{ fontSize:20, fontWeight:600, letterSpacing:'-0.03em', color:T.muted }}>{currency(stat.costoEsterni)}</div>
          </div>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 20px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
            <div style={{ ...label, marginBottom:8 }}>Margine stimato</div>
            <div style={{ fontSize:20, fontWeight:600, letterSpacing:'-0.03em', color:stat.margine>=0?T.green:T.red }}>{currency(stat.margine)}</div>
            {stat.marginePerc!=null && <div style={{ ...mono, fontSize:9, color:T.muted, marginTop:4 }}>{stat.marginePerc.toFixed(1)}%</div>}
          </div>
        </div>

        {/* Costo ore interne */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
          <div style={{ padding:'14px 20px', borderBottom:`0.5px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>Costo ore interne</div>
            <div style={{ ...mono, fontSize:10, color:T.muted }}>{fmtOre(stat.oreTotali)} ore totali{!c.project_id && <span style={{ marginLeft:8, color:T.muted }}>(nessun progetto collegato)</span>}</div>
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

        {/* Costi esterni */}
        {stat.costoEsterni > 0 && (() => {
          const ceRows = costiExtra.filter(x => x.commessa_id === c.id);
          const coRows = collab.filter(x => x.commessa_id === c.id);
          return (
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
              <div style={{ padding:'14px 20px', borderBottom:`0.5px solid ${T.border}` }}>
                <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>Costi esterni</div>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    <th style={thSt}>Tipo</th>
                    <th style={thSt}>Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {ceRows.map((x,i) => (
                    <tr key={`ce-${i}`}>
                      <td style={tdSt}>Costo extra</td>
                      <td style={{ ...tdSt, ...mono, fontSize:12, color:T.red }}>{currency(x.importo)}</td>
                    </tr>
                  ))}
                  {coRows.map((x,i) => (
                    <tr key={`co-${i}`}>
                      <td style={tdSt}>Collaboratore esterno</td>
                      <td style={{ ...tdSt, ...mono, fontSize:12, color:T.red }}>{currency(x.importo)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...tdSt, fontWeight:600 }}>Totale esterni</td>
                    <td style={{ ...tdSt, ...mono, fontSize:14, fontWeight:600, color:T.red }}>{currency(stat.costoEsterni)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* Costi interni */}
        {costiInterni.filter(x => x.commessa_id === c.id).length > 0 && (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
            <div style={{ padding:'14px 20px', borderBottom:`0.5px solid ${T.border}` }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>Costi interni</div>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={thSt}>Membro</th>
                  <th style={thSt}>Descrizione</th>
                  <th style={thSt}>Data</th>
                  <th style={thSt}>Importo</th>
                </tr>
              </thead>
              <tbody>
                {costiInterni.filter(x => x.commessa_id === c.id).map(x => (
                  <tr key={x.id}>
                    <td style={tdSt}>{x.nome_membro||'—'}</td>
                    <td style={tdSt}>{x.descrizione}</td>
                    <td style={{ ...tdSt, ...mono, fontSize:11, color:T.muted }}>{x.data ? new Date(x.data).toLocaleDateString('it-IT') : '—'}</td>
                    <td style={{ ...tdSt, ...mono, fontSize:12, fontWeight:600, color:T.red }}>{currency(x.importo)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ ...tdSt, fontWeight:600 }}>Totale costi interni</td>
                  <td style={{ ...tdSt, ...mono, fontSize:14, fontWeight:600, color:T.red }}>{currency(stat.costoInterno)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Riepilogo */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius: T.radiusSm, padding:'20px 24px' }}>
          <div style={{ fontSize:14, fontWeight:600, color:T.ink, marginBottom:16 }}>Riepilogo economico</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, maxWidth:400 }}>
            {[
              ['Valore base offerta', currency(stat.valoreBase), T.ink],
              ...(stat.valoreTotale !== stat.valoreBase ? [['  + IVA / contributi', currency(stat.valoreTotale), T.muted]] : []),
              ['Incassato', currency(stat.incassato), T.green],
              ['− Costo ore interne', currency(stat.costoOre), T.navy],
              ['− Costi esterni', currency(stat.costoEsterni), T.muted],
              ['− Costi interni', currency(stat.costoInterno), T.muted],
            ].map(([l,v,col])=>(
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`0.5px solid ${T.border}` }}>
                <span style={{ ...mono, fontSize:11, color:T.muted }}>{l}</span>
                <span style={{ ...mono, fontSize:12, fontWeight:600, color:col }}>{v}</span>
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

  // ── LISTA COMMESSE ────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.ink, marginBottom:4 }}>Analisi economica</div>
          <div style={{ ...mono, fontSize:10, color:T.muted }}>Costi, margini e redditività per commessa — visibile solo al titolare</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ position:'relative' }}>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca commessa..."
              style={{ padding:'6px 10px 6px 30px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, ...mono, fontSize:11, outline:'none', width:200 }}
            />
            <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:T.muted, fontSize:12, pointerEvents:'none' }}>⌕</span>
            {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:14, lineHeight:1, padding:0 }}>×</button>}
          </div>
          <select value={annoFiltro} onChange={e=>setAnnoFiltro(Number(e.target.value))}
            style={{ padding:'4px 8px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, ...mono, fontSize:11, cursor:'pointer', outline:'none', appearance:'auto' }}>
            <option value={0}>Tutti gli anni</option>
            {anniDisponibili.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={()=>setCostiPanel(true)} style={{ background:T.navy, color:'#EEF1F6', border:'none', ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'9px 20px', cursor:'pointer' }}>
            ⚙ Costi orari
          </button>
        </div>
      </div>

      {/* KPI totali */}
      {commessaStats.length > 0 && (() => {
        const totOre       = commessaStats.reduce((s,p)=>s+p.oreTotali, 0);
        const totCosto     = commessaStats.reduce((s,p)=>s+p.costoTotale, 0);
        const totValore    = commessaStats.reduce((s,p)=>s+p.valoreBase, 0);
        const totIncassato = commessaStats.reduce((s,p)=>s+p.incassato, 0);
        const totMargine   = totValore - totCosto;
        return (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
            {[
              { label:'Ore totali studio',   value:fmtOre(totOre),         color:T.ink   },
              { label:'Costo totale',        value:currency(totCosto),     color:T.navy  },
              { label:'Valore commesse',     value:currency(totValore),    color:T.green },
              { label:'Incassato totale',    value:currency(totIncassato), color:T.green },
              { label:'Margine complessivo', value:currency(totMargine),   color:totMargine>=0?T.green:T.red },
            ].map((k,i)=>(
              <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 20px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
                <div style={{ ...label, marginBottom:8 }}>{k.label}</div>
                <div style={{ fontSize:20, fontWeight:600, letterSpacing:'-0.03em', color:k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Tabella commesse */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {[
                ['nome',        'Commessa'],
                ['oreTotali',   'Ore totali'],
                ['costoOre',    'Costo ore'],
                ['costoEsterni','Costi esterni'],
                ['costoInterno','Costi interni'],
                ['costoTotale', 'Costo totale'],
                ['valoreBase',  'Valore offerta'],
                ['incassato',   'Incassato'],
                ['margine',     'Margine'],
              ].map(([col, lbl]) => (
                <th key={col} style={{ ...thSt, cursor:'pointer', userSelect:'none' }} onClick={() => handleSortCol(col)}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, color: sortCol===col ? T.navy : T.muted }}>
                    {lbl}
                    <span style={{ fontSize:9, opacity: sortCol===col ? 1 : 0.3 }}>{sortCol===col ? (sortAsc ? '↑' : '↓') : '↕'}</span>
                  </span>
                </th>
              ))}
              <th style={thSt}></th>
            </tr>
          </thead>
          <tbody>
            {commessaStats.length === 0 ? (
              <tr><td colSpan={10} style={{ ...tdSt, textAlign:'center', color:T.muted, padding:'32px 0' }}>Nessuna commessa</td></tr>
            ) : (() => {
              const q = search.trim().toLowerCase();
              const filtered = commessaStats.filter(({ commessa: c }) =>
                !q ||
                (c.nome_commessa||'').toLowerCase().includes(q) ||
                (c.cliente||'').toLowerCase().includes(q) ||
                (c.numero_offerta||'').toLowerCase().includes(q)
              );
              if (filtered.length === 0) return (
                <tr><td colSpan={10} style={{ ...tdSt, textAlign:'center', color:T.muted, padding:'32px 0' }}>Nessun risultato per "{search}"</td></tr>
              );
              const sorted = [...filtered].sort((a, b) => {
                const getVal = row => {
                  if (sortCol === 'nome') return (row.commessa.nome_commessa||'').toLowerCase();
                  return Number(row[sortCol]) || 0;
                };
                const vA = getVal(a), vB = getVal(b);
                if (vA < vB) return sortAsc ? -1 : 1;
                if (vA > vB) return sortAsc ? 1 : -1;
                return 0;
              });
              return sorted.map(({ commessa: c, oreTotali, costoOre, costoEsterni, costoInterno, costoTotale, valoreBase, incassato, margine, marginePerc }) => (
                <tr key={c.id}
                  onClick={()=>setSelectedCommessa(c)}
                  style={{ cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <td style={tdSt}>
                    <div style={{ fontWeight:600, color:T.ink }}>{c.nome_commessa || '—'}</div>
                    <div style={{ ...mono, fontSize:9, color:T.muted, marginTop:2 }}>
                      {c.cliente || '—'}
                      {c.numero_offerta && <span style={{ marginLeft:6 }}>{c.numero_offerta}</span>}
                      {c.archived && <span style={{ marginLeft:6, color:'#854d0e' }}>archiviata</span>}
                    </div>
                  </td>
                  <td style={{ ...tdSt, ...mono, fontSize:12 }}>{fmtOre(oreTotali)}</td>
                  <td style={{ ...tdSt, ...mono, fontSize:12, color:T.navy }}>{currency(costoOre)}</td>
                  <td style={{ ...tdSt, ...mono, fontSize:12, color:T.muted }}>{currency(costoEsterni)}</td>
                  <td style={{ ...tdSt, ...mono, fontSize:12, color:T.muted }}>{currency(costoInterno)}</td>
                  <td style={{ ...tdSt, ...mono, fontSize:12, fontWeight:600, color:T.ink }}>{currency(costoTotale)}</td>
                  <td style={{ ...tdSt, ...mono, fontSize:12, color:T.green }}>{currency(valoreBase)}</td>
                  <td style={{ ...tdSt, ...mono, fontSize:12, color:T.green }}>{currency(incassato)}</td>
                  <td style={tdSt}>
                    <div style={{ ...mono, fontSize:13, fontWeight:600, color:margine>=0?T.green:T.red }}>{currency(margine)}</div>
                    {marginePerc!=null && <div style={{ ...mono, fontSize:9, color:T.muted }}>{marginePerc.toFixed(1)}%</div>}
                  </td>
                  <td style={{ ...tdSt, ...mono, fontSize:10, color:T.navy }}>→</td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {/* Panel costi orari */}
      {costiPanel && (
        <div className="asm-modal-bg" style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div className="asm-modal-content" style={{ width:'100%', maxWidth:480, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, boxShadow:T.shadowLg, borderRadius:T.radiusLg, padding:28, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:600, color:T.ink }}>Costi orari del team</div>
                <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:2 }}>Imposta il costo orario per ogni membro</div>
              </div>
              <button onClick={()=>setCostiPanel(false)} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:20 }}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
              {members.map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:T.surface2, border:`1px solid ${T.border}` }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:m.color||T.navy, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff', flexShrink:0 }}>
                    {(m.user_name||'?').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{m.user_name||m.user_email}</div>
                    <div style={{ ...mono, fontSize:9, color:T.muted }}>{m.user_email}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ ...mono, fontSize:11, color:T.muted }}>€</span>
                    <input type="number" min={0} step={0.5}
                      value={editCosti[m.id]??0}
                      onChange={e => setEditCosti(p=>({...p,[m.id]:e.target.value}))}
                      style={{ width:70, padding:'6px 8px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.inputBg, color:T.inputText, fontSize:13, ...mono, outline:'none', textAlign:'right' }}
                    />
                    <span style={{ ...mono, fontSize:11, color:T.muted }}>/h</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:14, borderTop:`0.5px solid ${T.border}` }}>
              <button onClick={()=>setCostiPanel(false)} style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.ink, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>Annulla</button>
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
