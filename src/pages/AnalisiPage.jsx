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
  const [ratePagate, setRatePagate] = useState([]);
  const [costiInterni, setCostiInterni] = useState([]);
  const [loading, setLoading]       = useState(true);

  const [selectedProject, setSelectedProject] = useState(null);
  const [costiPanel, setCostiPanel]           = useState(false);
  const [editCosti, setEditCosti]             = useState({}); // memberId → costo_orario
  const [savingCosti, setSavingCosti]         = useState(false);
  const [annoFiltro, setAnnoFiltro]           = useState(0); // default: tutti gli anni
  const [search, setSearch]                   = useState("");
  const [sortCol, setSortCol]                 = useState("margine");
  const [sortAsc, setSortAsc]                 = useState(false);
  const handleSortCol = col => { if (sortCol === col) setSortAsc(p => !p); else { setSortCol(col); setSortAsc(false); } };

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
        { data:rp },
        { data:ci },
      ] = await Promise.all([
        supabase.from("projects").select("id,name,client,archived").eq("studio",studioId).order("name"),
        supabase.from("team_members").select("id,user_name,user_email,color,costo_orario").eq("studio",studioId).eq("active",true),
        supabase.from("timesheet").select("project_id,hours,team_member").eq("studio",studioId),
        supabase.from("commesse").select("id,project_id,nome_commessa,cliente,importo_offerta_base,importo_totale,importo_incassato,data_commessa,created_at,archived").eq("studio",studioId),
        supabase.from("costi_extra").select("commessa_id,importo").eq("studio",studioId),
        supabase.from("collaboratori_esterni").select("commessa_id,importo").eq("studio",studioId),
        // Rate pagate — stesso metodo di calcolaIncassato (più preciso della tabella proforma)
        supabase.from("suddivisione_pagamenti").select("commessa_id,percentuale,importo_fisso").eq("pagato",true),
        supabase.from("costi_interni").select("*").eq("studio",studioId),
      ]);
      setProjects(proj??[]);
      setMembers(mem??[]);
      setTimesheet(ts??[]);
      setCommesse(comm??[]);
      setCostiExtra(ce??[]);
      setCollab(co??[]);
      setRatePagate(rp??[]);
      setCostiInterni(ci??[]);
      // Init editCosti
      const map = {};
      (mem??[]).forEach(m => { map[m.id] = m.costo_orario||0; });
      setEditCosti(map);
      setLoading(false);
    };
    load();
  }, [studioId]);

  // ── ANNI DISPONIBILI ─────────────────────────────────────────────
  const getAnnoCommessa = (c) => {
    const d = c.data_commessa || c.created_at;
    return d ? new Date(d).getFullYear() : null;
  };

  const anniDisponibili = useMemo(() => {
    const anni = new Set();
    anni.add(new Date().getFullYear());
    commesse.forEach(c => {
      const d = c.data_commessa || c.created_at;
      if (d) anni.add(new Date(d).getFullYear());
    });
    return Array.from(anni).sort((a,b)=>b-a);
  }, [commesse]);

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

      // Commesse del progetto (filtrate per anno)
      const commProj = commesse.filter(c => {
        if (c.project_id !== proj.id) return false;
        if (annoFiltro === 0) return true;
        const d = c.data_commessa || c.created_at;
        return d && new Date(d).getFullYear() === annoFiltro;
      });
      // Valore base = importo_offerta_base (sempre, senza IVA/contributi)
      const valoreCommesse = commProj.reduce((s,c) => s + (Number(c.importo_offerta_base) || 0), 0);
      // Valore totale = importo_totale (comprensivo di IVA e contributi) — solo per la vista dettaglio
      const valoreTotale = commProj.reduce((s,c) => {
        const v = Number(c.importo_totale) || Number(c.importo_offerta_base) || 0;
        return s + v;
      }, 0);

      // Costi extra e collaboratori
      const commIds = commProj.map(c=>c.id);
      const costExtra = costiExtra.filter(c=>commIds.includes(c.commessa_id)).reduce((s,c)=>s+Number(c.importo||0),0);
      const costCollab = collab.filter(c=>commIds.includes(c.commessa_id)).reduce((s,c)=>s+Number(c.importo||0),0);
      const costoEsterni = costExtra + costCollab;

      const costoInterno = costiInterni
        .filter(c => commProj.some(x => x.id === c.commessa_id))
        .reduce((s,c) => s + Number(c.importo||0), 0);

      const costoTotale = costoOre + costoEsterni + costoInterno;

      // Incassato: usa suddivisione_pagamenti con pagato=true (stesso metodo di calcolaIncassato)
      const incassato = commProj.reduce((s, c) => {
        const base = Number(c.importo_offerta_base) || 0;
        const paid = ratePagate.filter(r => r.commessa_id === c.id);
        const tot  = paid.reduce((rs, r) =>
          rs + (Number(r.importo_fisso) || (base * (Number(r.percentuale) || 0) / 100)), 0);
        return s + tot;
      }, 0);
      const margine = valoreCommesse - costoTotale;
      const marginePerc = valoreCommesse > 0 ? (margine/valoreCommesse)*100 : null;

      return { proj, oreTotali, costoOre, costoEsterni, costoInterno, costoTotale, valoreCommesse, valoreTotale, incassato, margine, marginePerc, membroBreakdown, commProj };
    });
  }, [projects, timesheet, members, commesse, costiExtra, collab, ratePagate, costiInterni, editCosti, annoFiltro]);

  // ── COMMESSE ORFANE (project_id null o progetto non nel studio) ───
  const projectIds = useMemo(() => new Set(projects.map(p => p.id)), [projects]);

  const orphanStats = useMemo(() => {
    const commProj = commesse.filter(c => {
      if (c.project_id && projectIds.has(c.project_id)) return false; // ha un progetto valido → non orfana
      if (annoFiltro === 0) return true;
      const d = c.data_commessa || c.created_at;
      return d && new Date(d).getFullYear() === annoFiltro;
    });
    if (commProj.length === 0) return null;

    const valoreCommesse = commProj.reduce((s,c) => s + (Number(c.importo_offerta_base) || 0), 0);
    const valoreTotale   = commProj.reduce((s,c) => { const v = Number(c.importo_totale) || Number(c.importo_offerta_base) || 0; return s + v; }, 0);
    const commIds = commProj.map(c => c.id);
    const costExtra  = costiExtra.filter(c => commIds.includes(c.commessa_id)).reduce((s,c) => s + Number(c.importo||0), 0);
    const costCollab = collab.filter(c => commIds.includes(c.commessa_id)).reduce((s,c) => s + Number(c.importo||0), 0);
    const costoEsterni = costExtra + costCollab;
    const costoInterno = costiInterni.filter(c => commProj.some(x => x.id === c.commessa_id)).reduce((s,c) => s + Number(c.importo||0), 0);
    const incassato = commProj.reduce((s, c) => {
      const base = Number(c.importo_offerta_base) || 0;
      const paid = ratePagate.filter(r => r.commessa_id === c.id);
      return s + paid.reduce((rs, r) => rs + (Number(r.importo_fisso) || (base * (Number(r.percentuale) || 0) / 100)), 0);
    }, 0);
    const costoTotale = costoEsterni + costoInterno;
    const margine = valoreCommesse - costoTotale;
    const marginePerc = valoreCommesse > 0 ? (margine / valoreCommesse) * 100 : null;
    const proj = { id: '__orphan__', name: '— Commesse senza progetto', client: null, archived: false };
    return { proj, oreTotali: 0, costoOre: 0, costoEsterni, costoInterno, costoTotale, valoreCommesse, valoreTotale, incassato, margine, marginePerc, membroBreakdown: [], commProj };
  }, [commesse, projectIds, costiExtra, collab, costiInterni, ratePagate, annoFiltro]);

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
    const stat = selectedProject.id === '__orphan__'
      ? orphanStats
      : projectStats.find(s => s.proj.id === selectedProject.id);
    if (!stat) return null;

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={()=>setSelectedProject(null)} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor:'pointer', color:T.muted, padding:'5px 12px', ...mono, fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase' }}>← Analisi</button>
          <div>
            <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em' }}>{stat.proj.name}</div>
            {stat.proj.client && <div style={{ ...mono, fontSize:10, color:T.muted }}>{stat.proj.client}</div>}
          </div>
        </div>

        {/* KPI */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {/* Riga 1: valori economici */}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 20px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
            <div style={{ ...label, marginBottom:8 }}>Valore base offerta</div>
            <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.ink }}>{currency(stat.valoreCommesse)}</div>
            <div style={{ ...mono, fontSize:9, color:T.muted, marginTop:4 }}>senza IVA / contributi</div>
          </div>
          {stat.valoreTotale !== stat.valoreCommesse && (
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 20px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
              <div style={{ ...label, marginBottom:8 }}>Valore con IVA/contributi</div>
              <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.ink }}>{currency(stat.valoreTotale)}</div>
              <div style={{ ...mono, fontSize:9, color:T.muted, marginTop:4 }}>importo totale commesse</div>
            </div>
          )}
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 20px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
            <div style={{ ...label, marginBottom:8 }}>Incassato</div>
            <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.green }}>{currency(stat.incassato)}</div>
            {stat.valoreCommesse>0 && <div style={{ ...mono, fontSize:9, color:T.muted, marginTop:4 }}>{((stat.incassato/stat.valoreCommesse)*100).toFixed(0)}% del valore base</div>}
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

        {/* ── ANALISI 1: Costo ore interne ── */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
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
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
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

        {/* ── ANALISI 3: Costi interni ── */}
        {costiInterni.filter(c => stat.commProj.some(x => x.id === c.commessa_id)).length > 0 && (
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
            <div style={{ padding:'14px 20px', borderBottom:`0.5px solid ${T.border}` }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>Costi interni</div>
              <div style={{ ...mono, fontSize:10, color:T.muted, marginTop:2 }}>Spese interne non fatturate al cliente</div>
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
                {costiInterni
                  .filter(c => stat.commProj.some(x => x.id === c.commessa_id))
                  .map(c => (
                    <tr key={c.id}>
                      <td style={tdSt}>{c.nome_membro||'—'}</td>
                      <td style={tdSt}>{c.descrizione}</td>
                      <td style={{ ...tdSt, ...mono, fontSize:11, color:T.muted }}>{c.data ? new Date(c.data).toLocaleDateString('it-IT') : '—'}</td>
                      <td style={{ ...tdSt, ...mono, fontSize:12, fontWeight:600, color:T.red }}>{currency(c.importo)}</td>
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

        {/* Riepilogo finale */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius: T.radiusSm, padding:'20px 24px' }}>
          <div style={{ fontSize:14, fontWeight:600, color:T.ink, marginBottom:16 }}>Riepilogo economico</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, maxWidth:400 }}>
            {[
              ['Valore base offerta', currency(stat.valoreCommesse), T.ink],
              ...(stat.valoreTotale !== stat.valoreCommesse ? [['  + IVA / contributi', currency(stat.valoreTotale), T.muted]] : []),
              ['Incassato', currency(stat.incassato), T.green],
              ['− Costo ore interne', currency(stat.costoOre), T.navy],
              ['− Costi esterni', currency(stat.costoEsterni), T.muted],
              ['− Costi interni', currency(stat.costoInterno), T.muted],
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
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ position:'relative' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca progetto..."
              style={{ padding:'6px 10px 6px 30px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, outline:'none', width:180 }}
            />
            <span style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:T.muted, fontSize:12, pointerEvents:'none' }}>⌕</span>
            {search && (
              <button onClick={() => setSearch('')} style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:14, lineHeight:1, padding:0 }}>×</button>
            )}
          </div>
          <select value={annoFiltro} onChange={e=>setAnnoFiltro(Number(e.target.value))}
            style={{ padding:'4px 8px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, cursor:'pointer', outline:'none', appearance:'auto' }}>
            <option value={0}>Tutti gli anni</option>
            {anniDisponibili.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={()=>setCostiPanel(true)} style={{ background:T.navy, color:'#EEF1F6', border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'9px 20px', cursor:'pointer' }}>
            ⚙ Costi orari
          </button>
        </div>
      </div>

      {/* Totali KPI */}
      {projectStats.length > 0 && (() => {
        const allStats = orphanStats ? [...projectStats, orphanStats] : projectStats;
        const totOre = allStats.reduce((s,p)=>s+p.oreTotali,0);
        const totCosto = allStats.reduce((s,p)=>s+p.costoTotale,0);
        const totValore = allStats.reduce((s,p)=>s+p.valoreCommesse,0);
        const totIncassato = allStats.reduce((s,p)=>s+p.incassato,0);
        const totMargine = totValore - totCosto;
        return (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
            {[
              { label:'Ore totali studio',   value:fmtOre(totOre),           color:T.ink  },
              { label:'Costo totale',        value:currency(totCosto),       color:T.navy },
              { label:'Valore commesse',     value:currency(totValore),      color:T.green},
              { label:'Incassato totale',    value:currency(totIncassato),   color:T.green},
              { label:'Margine complessivo', value:currency(totMargine),     color:totMargine>=0?T.green:T.red },
            ].map((k,i)=>(
              <div key={i} style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 20px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
                <div style={{ ...label, marginBottom:8 }}>{k.label}</div>
                <div style={{ fontSize:20, fontWeight:600, letterSpacing:'-0.03em', color:k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Tabella progetti */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {[
                ['nome',           'Progetto'],
                ['oreTotali',      'Ore totali'],
                ['costoOre',       'Costo ore'],
                ['costoEsterni',   'Costi esterni'],
                ['costoInterno',   'Costi interni'],
                ['costoTotale',    'Costo totale'],
                ['valoreCommesse', 'Valore commesse'],
                ['incassato',      'Incassato'],
                ['margine',        'Margine'],
              ].map(([col, label]) => (
                <th key={col} style={{ ...thSt, cursor:'pointer', userSelect:'none' }} onClick={() => handleSortCol(col)}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, color: sortCol===col ? T.navy : T.muted }}>
                    {label}
                    <span style={{ fontSize:9, opacity: sortCol===col ? 1 : 0.3 }}>
                      {sortCol===col ? (sortAsc ? '↑' : '↓') : '↕'}
                    </span>
                  </span>
                </th>
              ))}
              <th style={thSt}></th>
            </tr>
          </thead>
          <tbody>
            {projectStats.length === 0 ? (
              <tr><td colSpan={9} style={{ ...tdSt, textAlign:'center', color:T.muted, padding:'32px 0' }}>Nessun progetto attivo</td></tr>
            ) : (() => {
              const q = search.trim().toLowerCase();
              const filtered = projectStats.filter(({ proj }) =>
                !q ||
                (proj.name||'').toLowerCase().includes(q) ||
                (proj.client||'').toLowerCase().includes(q)
              );
              const withOrphan = [...filtered, ...(orphanStats && (!q || '— commesse senza progetto'.includes(q)) ? [orphanStats] : [])];
              const sortedRows = [...withOrphan].sort((a, b) => {
                const getVal = (row) => {
                  if (sortCol === 'nome') return (row.proj.name || '').toLowerCase();
                  return Number(row[sortCol]) || 0;
                };
                const vA = getVal(a), vB = getVal(b);
                if (vA < vB) return sortAsc ? -1 : 1;
                if (vA > vB) return sortAsc ? 1 : -1;
                return 0;
              });
              if (withOrphan.length === 0) return (
                <tr><td colSpan={9} style={{ ...tdSt, textAlign:'center', color:T.muted, padding:'32px 0' }}>Nessun risultato per "{search}"</td></tr>
              );
              return sortedRows.map(({ proj, oreTotali, costoOre, costoEsterni, costoInterno, costoTotale, valoreCommesse, incassato, margine, marginePerc }) => {
              const isOrphan = proj.id === '__orphan__';
              return (
              <tr key={proj.id}
                onClick={()=>setSelectedProject(proj)}
                style={{ cursor:'pointer', opacity: isOrphan ? 0.75 : 1 }}
                onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                <td style={tdSt}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ fontWeight:600, color: isOrphan ? T.muted : T.ink }}>{proj.name}</div>
                    {proj.archived && <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.1em', textTransform:'uppercase', color:T.muted, border:`1px solid ${T.border}`, borderRadius: T.radiusSm, padding:'1px 5px' }}>archiviato</span>}
                    {isOrphan && <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.1em', textTransform:'uppercase', color:T.muted, border:`1px solid ${T.border}`, borderRadius: T.radiusSm, padding:'1px 5px' }}>non collegato</span>}
                  </div>
                  {proj.client && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>{proj.client}</div>}
                </td>
                <td style={{ ...tdSt, ...mono, fontSize:12 }}>{fmtOre(oreTotali)}</td>
                <td style={{ ...tdSt, ...mono, fontSize:12, color:T.navy }}>{currency(costoOre)}</td>
                <td style={{ ...tdSt, ...mono, fontSize:12, color:T.muted }}>{currency(costoEsterni)}</td>
                <td style={{ ...tdSt, ...mono, fontSize:12, color:T.muted }}>{currency(costoInterno)}</td>
                <td style={{ ...tdSt, ...mono, fontSize:12, fontWeight:600, color:T.ink }}>{currency(costoTotale)}</td>
                <td style={{ ...tdSt, ...mono, fontSize:12, color:T.green }}>{currency(valoreCommesse)}</td>
                <td style={{ ...tdSt, ...mono, fontSize:12, color:T.green }}>{currency(incassato)}</td>
                <td style={tdSt}>
                  <div style={{ ...mono, fontSize:13, fontWeight:600, color:margine>=0?T.green:T.red }}>{currency(margine)}</div>
                  {marginePerc!=null && <div style={{ ...mono, fontSize:9, color:T.muted }}>{marginePerc.toFixed(1)}%</div>}
                </td>
                <td style={{ ...tdSt, ...mono, fontSize:10, color:T.navy }}>→</td>
              </tr>
              );
            });
            })()}
          </tbody>
        </table>
      </div>

      {/* ── PANEL COSTI ORARI ── */}
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
                    <input
                      type="number" min={0} step={0.5}
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
              <button onClick={()=>setCostiPanel(false)} style={{ border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:T.ink, ...mono, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:'pointer' }}>
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
