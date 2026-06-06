import { useEffect, useMemo, useState } from "react";
import SlidingTabs from "../components/SlidingTabs";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { usePlan } from "../hooks/usePlan";
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from "../hooks/useIsMobile";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatOre } from "../lib/utils";

const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DAYS   = ["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];

// ── HELPERS DATE ─────────────────────────────────────────────────
function toISO(d) { return d.toISOString().slice(0,10); }

function getMonthRange(year, month) {
  return { start: toISO(new Date(year,month,1)), end: toISO(new Date(year,month+1,0)) };
}

function getWeekRange(refDate) {
  const d = new Date(refDate);
  const day = d.getDay(); // 0=dom
  const diff = day === 0 ? -6 : 1 - day; // lunedì
  const mon = new Date(d); mon.setDate(d.getDate()+diff);
  const sun = new Date(mon); sun.setDate(mon.getDate()+6);
  return { start: toISO(mon), end: toISO(sun), monday: mon };
}

function addWeeks(date, n) {
  const d = new Date(date); d.setDate(d.getDate()+n*7); return d;
}

function formatWeekLabel(monday) {
  const sun = new Date(monday); sun.setDate(monday.getDate()+6);
  const fmtShort = d => d.toLocaleDateString('it-IT',{day:'numeric',month:'short'});
  return `${fmtShort(monday)} – ${fmtShort(sun)}`;
}

function csvEscape(v) {
  const s = String(v??"");
  return s.includes(",")||s.includes('"')||s.includes("\n") ? `"${s.replace(/"/g,'""')}"` : s;
}

// ── UI ────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, sub }) {
  const { T } = useTheme();
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 18px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:color||T.ink, fontFamily:"'Space Grotesk', sans-serif" }}>{value}</div>
      {sub && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  const { T } = useTheme();
  return (
    <button onClick={onClick} style={{
      padding:'7px 16px', border:'none', background:'transparent', cursor:'pointer',
      fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase',
      color: active ? T.navy : T.muted,
      borderBottom:`1.5px solid ${active ? T.navy : 'transparent'}`,
    }}>{children}</button>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function ReportPage() {
  const { T } = useTheme();
  usePageTitleOnMount("Report");
  const thSt = { fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'8px 14px', borderBottom:`0.5px solid ${T.border}`, textAlign:'left', whiteSpace:'nowrap' };
  const tdSt = { padding:'9px 14px', borderBottom:`0.5px solid ${T.border}`, fontSize:12, color:T.ink };
  const monoSt = { fontFamily:"'IBM Plex Mono', monospace", fontSize:11 };
  const tooltipSt = { contentStyle:{ background:T.surface, border:`0.5px solid ${T.borderMd}`, borderRadius:0, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.ink }, formatter: v => formatOre(v) };
  const axisSt = { tick:{ fill:T.muted, fontSize:9, fontFamily:"'IBM Plex Mono', monospace" }, axisLine:false, tickLine:false };
  const { studioId, loading:studioLoading } = useStudio();
  const permissions = usePermissions();
  const { plan } = usePlan();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const now = new Date();

  // Periodo
  const [mode, setMode]                 = useState("month"); // "month" | "week"
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [weekRef, setWeekRef]           = useState(now); // data di riferimento per la settimana

  // Vista
  const [view, setView] = useState("progetto"); // "progetto" | "cliente" | "utente"

  // Popup barra trend
  const [barPopup, setBarPopup] = useState(null); // { label, users:[{name,hours}], x, y }

  // Dati
  const [rows, setRows]         = useState([]);
  const [allRows, setAllRows]   = useState([]); // per confronto anno/totale
  const [projects, setProjects] = useState([]);
  const [projectMap, setProjectMap] = useState({}); // id → {name, client}
  const [memberMap, setMemberMap]   = useState({}); // id → user_name
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  // Range corrente
  const range = useMemo(() => {
    if (mode === "month") return getMonthRange(selectedYear, selectedMonth);
    return getWeekRange(weekRef);
  }, [mode, selectedYear, selectedMonth, weekRef]);

  const periodLabel = useMemo(() => {
    if (mode === "month") return `${MONTHS[selectedMonth]} ${selectedYear}`;
    return formatWeekLabel(getWeekRange(weekRef).monday);
  }, [mode, selectedYear, selectedMonth, weekRef]);

  // Navigazione
  const goBack = () => {
    if (mode === "month") {
      const d = new Date(selectedYear, selectedMonth-1, 1);
      setSelectedYear(d.getFullYear()); setSelectedMonth(d.getMonth());
    } else setWeekRef(w => addWeeks(w, -1));
  };
  const goNext = () => {
    if (mode === "month") {
      const d = new Date(selectedYear, selectedMonth+1, 1);
      setSelectedYear(d.getFullYear()); setSelectedMonth(d.getMonth());
    } else setWeekRef(w => addWeeks(w, 1));
  };
  const goToday = () => {
    setSelectedYear(now.getFullYear()); setSelectedMonth(now.getMonth());
    setWeekRef(now);
  };

  const loadData = async () => {
    if (!studioId) return;
    setLoading(true); setError("");
    try {
      const [tsRes, pRes, allRes, mRes] = await Promise.all([
        supabase.from("timesheet").select("*").eq("studio",studioId).gte("date",range.start).lte("date",range.end).order("date",{ascending:true}),
        supabase.from("projects").select("id,name,client").eq("studio",studioId),
        supabase.from("timesheet").select("*").eq("studio",studioId).gte("date",`${selectedYear}-01-01`).lte("date",`${selectedYear}-12-31`),
        supabase.from("team_members").select("id,user_name").eq("studio",studioId),
      ]);
      if (tsRes.error) throw tsRes.error;
      const projList = pRes.data ?? [];
      const memberList = mRes.data ?? [];
      // Mappe id → metadati per join client-side
      const pMap = {};
      projList.forEach(p => { pMap[p.id] = { name: p.name, client: p.client }; });
      const mMap = {};
      memberList.forEach(m => { mMap[m.id] = m.user_name; });
      setRows(tsRes.data ?? []);
      setProjects(projList);
      setProjectMap(pMap);
      setMemberMap(mMap);
      setAllRows(allRes.data ?? []);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (studioId) loadData(); }, [studioId, range]);

  // ── KPI ──────────────────────────────────────────────────────
  const oreTotali = useMemo(() => rows.reduce((s,r)=>s+(Number(r.hours)||0),0), [rows]);
  const oreAnno   = useMemo(() => allRows.reduce((s,r)=>s+(Number(r.hours)||0),0), [allRows]);

  // Helper per risolvere nomi da UUID (join client-side)
  const projName   = r => projectMap[r.project_id]?.name   || r.project_name || "Senza progetto";
  const projClient = r => projectMap[r.project_id]?.client || r.project_client || "—";
  const userName   = r => memberMap[r.team_member]          || r.user_name     || "—";

  // ── DATI GRAFICO / TABELLA per vista ─────────────────────────
  const byProgetto = useMemo(() => {
    const g={};
    rows.forEach(r => { const n=projName(r); g[n]=(g[n]||0)+(Number(r.hours)||0); });
    return Object.entries(g).map(([name,hours])=>({name,hours})).sort((a,b)=>b.hours-a.hours);
  }, [rows, projectMap]);

  const byCliente = useMemo(() => {
    const g={};
    rows.forEach(r => {
      const c = projClient(r) !== "—" ? projClient(r) : projName(r);
      g[c]=(g[c]||0)+(Number(r.hours)||0);
    });
    return Object.entries(g).map(([name,hours])=>({name,hours})).sort((a,b)=>b.hours-a.hours);
  }, [rows, projectMap]);

  const byUtente = useMemo(() => {
    const g={};
    rows.forEach(r => { const n=userName(r); g[n]=(g[n]||0)+(Number(r.hours)||0); });
    return Object.entries(g).map(([name,hours])=>({name,hours})).sort((a,b)=>b.hours-a.hours);
  }, [rows, memberMap]);

  // Dati tabella dettaglio per utente (con confronto anno)
  const tableByUtente = useMemo(() => {
    const g={};
    rows.forEach(r=>{ const n=userName(r); if(!g[n]) g[n]={name:n,period:0,year:0}; g[n].period+=Number(r.hours)||0; });
    allRows.forEach(r=>{ const n=userName(r); if(!g[n]) g[n]={name:n,period:0,year:0}; g[n].year+=Number(r.hours)||0; });
    return Object.values(g).filter(r => r.name && r.name !== "—").sort((a,b)=>b.period-a.period);
  }, [rows, allRows, memberMap]);

  // Dati grafico corrente
  const chartData = view==="progetto" ? byProgetto : view==="cliente" ? byCliente : byUtente;
  const chartLayout = "vertical"; // sempre orizzontale per leggibilità nomi

  // Dati per grafico temporale (andamento settimana/mese)
  const trendData = useMemo(() => {
    if (mode === "week") {
      // 7 giorni
      const days = Array.from({length:7},(_,i)=>{
        const d = new Date(getWeekRange(weekRef).monday);
        d.setDate(d.getDate()+i);
        return { date: toISO(d), label: `${DAYS[d.getDay()]} ${d.getDate()}`, hours:0 };
      });
      rows.forEach(r=>{ const d=days.find(x=>x.date===r.date); if(d) d.hours+=Number(r.hours)||0; });
      return days;
    } else {
      // Raggruppato per settimana del mese
      const weeks={};
      rows.forEach(r=>{
        const d=new Date(r.date);
        const wk=Math.ceil(d.getDate()/7);
        const key=`Sett. ${wk}`;
        if(!weeks[key]) weeks[key]={label:key,hours:0};
        weeks[key].hours+=Number(r.hours)||0;
      });
      return Object.values(weeks);
    }
  }, [rows, mode, weekRef]);

  // ── CLICK BARRA TREND ────────────────────────────────────────
  const handleBarClick = (data, _index, event) => {
    let periodRows;
    if (mode === "week") {
      periodRows = rows.filter(r => r.date === data.date);
    } else {
      const wk = parseInt((data.label || "").replace("Sett. ", "")) || 0;
      periodRows = rows.filter(r => Math.ceil(new Date(r.date).getDate() / 7) === wk);
    }
    const g = {};
    periodRows.forEach(r => { const n = userName(r); g[n] = (g[n] || 0) + (Number(r.hours) || 0); });
    const users = Object.entries(g).map(([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours);
    const rect = event?.target?.closest("svg")?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : (event?.clientX ?? 0);
    const cy = rect ? rect.top : (event?.clientY ?? 0);
    setBarPopup({ label: data.label, users, x: cx, y: cy });
  };

  // ── EXPORT CSV ───────────────────────────────────────────────
  const exportCsv = () => {
    const headers=["data","progetto","utente","ore","note"];
    const lines=[headers.join(","),...rows.map(r=>[csvEscape(r.date),csvEscape(projName(r)),csvEscape(userName(r)),csvEscape(r.hours),csvEscape(r.notes||r.note)].join(","))];
    const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`report-${range.start}-${range.end}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!studioLoading && !permissions.canViewReport) return (
    <div style={{ border:`1px solid ${T.border}`, borderRadius: T.radiusSm, background:T.surface, padding:32, textAlign:'center', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>Non hai i permessi per accedere a questa sezione.</div>
  );

  if (plan.id !== 'pro') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:16 }}>
      <div style={{ fontSize:32 }}>🔒</div>
      <div style={{ fontSize:16, fontWeight:600, color:T.ink }}>Funzionalità Pro</div>
      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, textAlign:'center', maxWidth:360 }}>
        Il Report è disponibile solo per il piano Pro.<br/>Fai l'upgrade per accedere ai report avanzati.
      </div>
      <button onClick={()=>navigate('/impostazioni/piano')} style={{ background:T.navy, color:'#EEF1F6', border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'10px 24px', cursor:'pointer' }}>
        Vedi piani →
      </button>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── TOOLBAR ── */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding: isMobile ? '12px 14px' : '12px 18px', display:'flex', flexDirection:'column', gap:10, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>

        {/* Riga 1: toggle + esporta */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          {/* Toggle mese/settimana */}
          <SlidingTabs
            tabs={[{ key:"month", label:"Mensile" }, { key:"week", label:"Settimanale" }]}
            active={mode}
            onChange={setMode}
          />

          {/* Esporta */}
          <button onClick={exportCsv} style={{ background:T.navy, border:'none', cursor:'pointer', color:T.bg, padding:'8px 16px', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            Esporta CSV
          </button>
        </div>

        {/* Riga 2: navigazione periodo */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={goBack} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor:'pointer', color:T.ink, padding:'5px 12px', fontFamily:"'IBM Plex Mono', monospace", fontSize:12 }}>←</button>
          <div style={{ flex:1, fontFamily:"'Space Grotesk', sans-serif", fontSize:14, fontWeight:600, color:T.ink, letterSpacing:'-0.02em', textAlign:'center' }}>
            {periodLabel}
          </div>
          <button onClick={goNext} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor:'pointer', color:T.ink, padding:'5px 12px', fontFamily:"'IBM Plex Mono', monospace", fontSize:12 }}>→</button>
          <button onClick={goToday} style={{ background:T.bg, border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor:'pointer', color:T.muted, padding:'5px 12px', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.05em' }}>Oggi</button>
        </div>
      </div>

      {/* ── KPI ── */}
      <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap:10 }}>
        <KpiCard
          label={mode==="week"?"Ore settimana":"Ore del mese"}
          value={formatOre(oreTotali)}
          color={T.navy}
          sub={oreTotali > 0 ? `≈ ${(oreTotali / 8).toFixed(1).replace(".",",")} giorni lavorativi` : undefined}
        />
        <KpiCard
          label="Ore anno in corso"
          value={formatOre(oreAnno)}
          color={T.muted}
          sub={oreAnno > 0 ? `≈ ${(oreAnno / 8).toFixed(1).replace(".",",")} giorni lavorativi` : undefined}
        />
        <KpiCard label="Progetti nel periodo" value={new Set(rows.map(r=>projName(r)).filter(n=>n!=="Senza progetto")).size} color={T.green}/>
        <KpiCard label="Membri attivi" value={new Set(rows.map(r=>userName(r)).filter(n=>n!=="—")).size} color={T.ink}/>
      </div>

      {/* ── GRAFICI ── */}
      <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 1fr', gap:10 }}>

        {/* Andamento temporale */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius: T.radiusSm, padding:'16px 18px', position:'relative' }}>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:14 }}>
            Andamento ore — {mode==="week"?"per giorno":"per settimana"}
            <span style={{ marginLeft:10, opacity:0.5, fontWeight:400 }}>clicca una barra per il dettaglio</span>
          </div>
          <div style={{ height:220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} style={{ cursor:'pointer' }}>
                <CartesianGrid stroke={T.border} strokeDasharray="3 3"/>
                <XAxis dataKey="label" {...axisSt} stroke="transparent"/>
                <YAxis {...axisSt} stroke="transparent" tickFormatter={v=>formatOre(v)}/>
                <Tooltip {...tooltipSt}/>
                <Bar dataKey="hours" fill={T.navy} radius={[2,2,0,0]} onClick={handleBarClick}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafico per vista selezionata */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'16px 18px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
          {/* Tab vista */}
          <div style={{ marginBottom:14 }}>
            <SlidingTabs
              tabs={[
                { key:"progetto", label:"Per progetto" },
                { key:"cliente",  label:"Per cliente" },
                { key:"utente",   label:"Per utente" },
              ]}
              active={view}
              onChange={setView}
            />
          </div>
          <div style={{ height:200 }}>
            {chartData.length === 0 ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
                Nessun dato nel periodo
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid stroke={T.border} strokeDasharray="3 3"/>
                  <XAxis type="number" {...axisSt} stroke="transparent" tickFormatter={v=>formatOre(v)}/>
                  <YAxis type="category" dataKey="name" width={120} {...axisSt} stroke="transparent" tick={{...axisSt.tick,fontSize:9}}/>
                  <Tooltip {...tooltipSt}/>
                  <Bar dataKey="hours" fill={T.navy} radius={[0,2,2,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── TABELLE DETTAGLIO ── */}
      <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 1fr', gap:10, alignItems:'start' }}>

        {/* Tabella ore per utente — sticky left */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, overflowX:'auto', position:'sticky', top:0, alignSelf:'start', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, padding:'10px 14px', borderBottom:`0.5px solid ${T.border}` }}>
            Dettaglio per utente
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={thSt}>Membro</th>
                <th style={thSt}>{mode==="week"?"Sett.":"Mese"}</th>
                <th style={thSt}>Anno</th>
              </tr>
            </thead>
            <tbody>
              {tableByUtente.length===0 ? (
                <tr><td colSpan={3} style={{...tdSt,color:T.muted,textAlign:'center',padding:'24px 0'}}>Nessun dato</td></tr>
              ) : tableByUtente.map(r=>(
                <tr key={r.name}>
                  <td style={{...tdSt,fontWeight:600}}>{r.name}</td>
                  <td style={{...tdSt,...monoSt,color:T.navy}}>{formatOre(r.period)}</td>
                  <td style={{...tdSt,...monoSt,color:T.muted}}>{formatOre(r.year)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tabella ore per progetto */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, overflowX:'auto', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, padding:'10px 14px', borderBottom:`0.5px solid ${T.border}` }}>
            Dettaglio per progetto
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={thSt}>Progetto</th>
                <th style={thSt}>Cliente</th>
                <th style={thSt}>Ore</th>
              </tr>
            </thead>
            <tbody>
              {byProgetto.length===0 ? (
                <tr><td colSpan={3} style={{...tdSt,color:T.muted,textAlign:'center',padding:'24px 0'}}>Nessun dato</td></tr>
              ) : byProgetto.map(r=>{
                const proj=projects.find(p=>p.name===r.name);
                const client=proj?.client || projectMap[Object.keys(projectMap).find(id=>projectMap[id]?.name===r.name)]?.client || "—";
                return (
                  <tr key={r.name}>
                    <td style={{...tdSt,fontWeight:600}}>{r.name}</td>
                    <td style={{...tdSt,color:T.muted}}>{client}</td>
                    <td style={{...tdSt,...monoSt,color:T.navy}}>{formatOre(r.hours)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{ position:'fixed', bottom:24, right:24, background:T.navy, color:T.bg, padding:'8px 16px', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.05em' }}>
          Caricamento...
        </div>
      )}

      {error && (
        <div style={{ border:`1px solid ${T.border}`, borderRadius: T.radiusSm, background:T.surface, padding:16, color:T.red, fontFamily:"'IBM Plex Mono', monospace", fontSize:11 }}>
          {error}
        </div>
      )}

      {/* ── POPUP DETTAGLIO BARRA ── */}
      {barPopup && (
        <div
          onClick={() => setBarPopup(null)}
          style={{ position:'fixed', inset:0, zIndex:60 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position:'fixed',
              left: Math.min(barPopup.x - 120, window.innerWidth - 280),
              top:  Math.max(barPopup.y - 20, 80),
              width: 260,
              background: T.surface,
              border: `1px solid ${T.borderMd}`, borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, 
              boxShadow: `0 8px 24px rgba(0,0,0,0.14)`,
              zIndex: 61,
            }}
          >
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:`0.5px solid ${T.border}` }}>
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted }}>
                {barPopup.label} — per utente
              </div>
              <button onClick={() => setBarPopup(null)} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:16, lineHeight:1, padding:0 }}>×</button>
            </div>
            {/* Righe utenti */}
            {barPopup.users.length === 0 ? (
              <div style={{ padding:'16px 14px', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>Nessun dato</div>
            ) : (
              <div>
                {barPopup.users.map((u, i) => (
                  <div key={u.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 14px', borderTop: i > 0 ? `0.5px solid ${T.border}` : 'none' }}>
                    <span style={{ fontSize:12, color:T.ink, fontWeight: i === 0 ? 600 : 400 }}>{u.name}</span>
                    <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color: i === 0 ? T.navy : T.muted, fontWeight: i === 0 ? 600 : 400 }}>{formatOre(u.hours)}</span>
                  </div>
                ))}
                <div style={{ padding:'8px 14px', borderTop:`0.5px solid ${T.border}`, display:'flex', justifyContent:'space-between', background:T.bg }}>
                  <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:T.muted }}>Totale</span>
                  <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, fontWeight:600, color:T.navy }}>
                    {formatOre(barPopup.users.reduce((s, u) => s + u.hours, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
