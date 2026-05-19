import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import { formatOre } from "../lib/utils";

const T = {
  ink:'#0E0E0D', navy:'#13315C', brass:'#D9C98A',
  paper:'#EEF1F6', muted:'#8a847b',
  ink10:'#0E0E0D1A', ink20:'#0E0E0D33',
  red:'#b91c1c', green:'#1a6b3c',
};

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
  return (
    <div style={{ background:'#fff', border:`0.5px solid ${T.ink10}`, padding:'16px 18px' }}>
      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:color||T.ink, fontFamily:"'Space Grotesk', sans-serif" }}>{value}</div>
      {sub && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:'7px 16px', border:'none', background:'transparent', cursor:'pointer',
      fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase',
      color: active ? T.navy : T.muted,
      borderBottom:`1.5px solid ${active ? T.navy : 'transparent'}`,
    }}>{children}</button>
  );
}

const thSt = { fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'8px 14px', borderBottom:`0.5px solid ${T.ink10}`, textAlign:'left', whiteSpace:'nowrap' };
const tdSt = { padding:'9px 14px', borderBottom:`0.5px solid ${T.ink10}`, fontSize:12, color:T.ink };
const monoSt = { fontFamily:"'IBM Plex Mono', monospace", fontSize:11 };
const tooltipSt = { contentStyle:{ background:'#fff', border:`0.5px solid ${T.ink20}`, borderRadius:0, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.ink }, formatter: v => formatOre(v) };
const axisSt = { tick:{ fill:T.muted, fontSize:9, fontFamily:"'IBM Plex Mono', monospace" }, axisLine:false, tickLine:false };

// ── MAIN ─────────────────────────────────────────────────────────
export default function ReportPage() {
  const { studioId, loading:studioLoading } = useStudio();
  const permissions = usePermissions();
  const now = new Date();

  // Periodo
  const [mode, setMode]                 = useState("month"); // "month" | "week"
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [weekRef, setWeekRef]           = useState(now); // data di riferimento per la settimana

  // Vista
  const [view, setView] = useState("progetto"); // "progetto" | "cliente" | "utente"

  // Dati
  const [rows, setRows]         = useState([]);
  const [allRows, setAllRows]   = useState([]); // per confronto anno/totale
  const [projects, setProjects] = useState([]);
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
      const [tsRes, pRes, allRes] = await Promise.all([
        supabase.from("timesheet").select("*").eq("studio",studioId).gte("date",range.start).lte("date",range.end).order("date",{ascending:true}),
        supabase.from("projects").select("id,name,client").eq("studio",studioId).eq("archived",false),
        supabase.from("timesheet").select("*").eq("studio",studioId).gte("date",`${selectedYear}-01-01`).lte("date",`${selectedYear}-12-31`),
      ]);
      if (tsRes.error) throw tsRes.error;
      setRows(tsRes.data??[]);
      setProjects(pRes.data??[]);
      setAllRows(allRes.data??[]);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (studioId) loadData(); }, [studioId, range]);

  // ── KPI ──────────────────────────────────────────────────────
  const oreTotali = useMemo(() => rows.reduce((s,r)=>s+(Number(r.hours)||0),0), [rows]);
  const oreAnno   = useMemo(() => allRows.reduce((s,r)=>s+(Number(r.hours)||0),0), [allRows]);

  // ── DATI GRAFICO / TABELLA per vista ─────────────────────────
  const byProgetto = useMemo(() => {
    const g={};
    rows.forEach(r => { const n=r.project_name||"Senza progetto"; g[n]=(g[n]||0)+(Number(r.hours)||0); });
    return Object.entries(g).map(([name,hours])=>({name,hours})).sort((a,b)=>b.hours-a.hours);
  }, [rows]);

  const byCliente = useMemo(() => {
    // Mappa project_name → client
    const clientMap={};
    projects.forEach(p=>{ clientMap[p.name]=p.client||"—"; });
    const g={};
    rows.forEach(r => {
      const c = clientMap[r.project_name] || r.project_name || "—";
      g[c]=(g[c]||0)+(Number(r.hours)||0);
    });
    return Object.entries(g).map(([name,hours])=>({name,hours})).sort((a,b)=>b.hours-a.hours);
  }, [rows,projects]);

  const byUtente = useMemo(() => {
    const g={};
    rows.forEach(r => { const n=r.user_name||"—"; g[n]=(g[n]||0)+(Number(r.hours)||0); });
    return Object.entries(g).map(([name,hours])=>({name,hours})).sort((a,b)=>b.hours-a.hours);
  }, [rows]);

  // Dati tabella dettaglio per utente (con confronto anno)
  const tableByUtente = useMemo(() => {
    const g={};
    rows.forEach(r=>{ const n=r.user_name||"—"; if(!g[n]) g[n]={name:n,period:0,year:0}; g[n].period+=Number(r.hours)||0; });
    allRows.forEach(r=>{ const n=r.user_name||"—"; if(!g[n]) g[n]={name:n,period:0,year:0}; g[n].year+=Number(r.hours)||0; });
    return Object.values(g).sort((a,b)=>b.period-a.period);
  }, [rows,allRows]);

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

  // ── EXPORT CSV ───────────────────────────────────────────────
  const exportCsv = () => {
    const headers=["data","progetto","utente","ore","note"];
    const lines=[headers.join(","),...rows.map(r=>[csvEscape(r.date),csvEscape(r.project_name),csvEscape(r.user_name),csvEscape(r.hours),csvEscape(r.notes||r.note)].join(","))];
    const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`report-${range.start}-${range.end}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!studioLoading && !permissions.canViewReport) return (
    <div style={{ border:`0.5px solid ${T.ink10}`, background:'#fff', padding:32, textAlign:'center', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>Non hai i permessi per accedere a questa sezione.</div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── TOOLBAR ── */}
      <div style={{ background:'#fff', border:`0.5px solid ${T.ink10}`, padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>

        {/* Toggle mese/settimana */}
        <div style={{ display:'flex', border:`0.5px solid ${T.ink20}`, overflow:'hidden' }}>
          {[["month","Mensile"],["week","Settimanale"]].map(([m,label])=>(
            <button key={m} onClick={()=>setMode(m)} style={{
              padding:'6px 14px', border:'none', background: mode===m ? T.navy : 'transparent',
              color: mode===m ? '#EEF1F6' : T.muted,
              fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase',
              cursor:'pointer',
            }}>{label}</button>
          ))}
        </div>

        {/* Navigazione periodo */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={goBack} style={{ background:'none', border:`0.5px solid ${T.ink20}`, cursor:'pointer', color:T.ink, padding:'5px 12px', fontFamily:"'IBM Plex Mono', monospace", fontSize:12 }}>←</button>
          <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:14, fontWeight:600, color:T.ink, letterSpacing:'-0.02em', minWidth:220, textAlign:'center' }}>
            {periodLabel}
          </div>
          <button onClick={goNext} style={{ background:'none', border:`0.5px solid ${T.ink20}`, cursor:'pointer', color:T.ink, padding:'5px 12px', fontFamily:"'IBM Plex Mono', monospace", fontSize:12 }}>→</button>
          <button onClick={goToday} style={{ background:T.paper, border:`0.5px solid ${T.ink20}`, cursor:'pointer', color:T.muted, padding:'5px 12px', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.05em' }}>Oggi</button>
        </div>

        {/* Esporta */}
        <button onClick={exportCsv} style={{ background:T.navy, border:'none', cursor:'pointer', color:'#EEF1F6', padding:'8px 16px', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase' }}>
          Esporta CSV
        </button>
      </div>

      {/* ── KPI ── */}
      <div style={{ display:'grid', gridTemplateColumns:window.innerWidth < 768 ? '1fr 1fr' : 'repeat(4, 1fr)', gap:10 }}>
        <KpiCard label={mode==="week"?"Ore settimana":"Ore del mese"} value={formatOre(oreTotali)} color={T.navy}/>
        <KpiCard label="Ore anno in corso" value={formatOre(oreAnno)} color={T.muted}/>
        <KpiCard label="Progetti nel periodo" value={new Set(rows.map(r=>r.project_name).filter(Boolean)).size} color={T.green}/>
        <KpiCard label="Membri attivi" value={new Set(rows.map(r=>r.user_name).filter(Boolean)).size} color={T.ink}/>
      </div>

      {/* ── GRAFICI ── */}
      <div style={{ display:'grid', gridTemplateColumns:window.innerWidth < 768 ? '1fr' : '1fr 1fr', gap:10 }}>

        {/* Andamento temporale */}
        <div style={{ background:'#fff', border:`0.5px solid ${T.ink10}`, padding:'16px 18px' }}>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:14 }}>
            Andamento ore — {mode==="week"?"per giorno":"per settimana"}
          </div>
          <div style={{ height:220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid stroke={T.ink10} strokeDasharray="3 3"/>
                <XAxis dataKey="label" {...axisSt} stroke="transparent"/>
                <YAxis {...axisSt} stroke="transparent" tickFormatter={v=>formatOre(v)}/>
                <Tooltip {...tooltipSt}/>
                <Bar dataKey="hours" fill={T.navy} radius={[2,2,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafico per vista selezionata */}
        <div style={{ background:'#fff', border:`0.5px solid ${T.ink10}`, padding:'16px 18px' }}>
          {/* Tab vista */}
          <div style={{ display:'flex', borderBottom:`0.5px solid ${T.ink10}`, marginBottom:14 }}>
            <TabBtn active={view==="progetto"} onClick={()=>setView("progetto")}>Per progetto</TabBtn>
            <TabBtn active={view==="cliente"}  onClick={()=>setView("cliente")}>Per cliente</TabBtn>
            <TabBtn active={view==="utente"}   onClick={()=>setView("utente")}>Per utente</TabBtn>
          </div>
          <div style={{ height:200 }}>
            {chartData.length === 0 ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
                Nessun dato nel periodo
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid stroke={T.ink10} strokeDasharray="3 3"/>
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
      <div style={{ display:'grid', gridTemplateColumns:window.innerWidth < 768 ? '1fr' : '1fr 1fr', gap:10 }}>

        {/* Tabella ore per utente */}
        <div style={{ background:'#fff', border:`0.5px solid ${T.ink10}`, overflowX:'auto' }}>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, padding:'10px 14px', borderBottom:`0.5px solid ${T.ink10}` }}>
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
        <div style={{ background:'#fff', border:`0.5px solid ${T.ink10}`, overflowX:'auto' }}>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, padding:'10px 14px', borderBottom:`0.5px solid ${T.ink10}` }}>
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
                return (
                  <tr key={r.name}>
                    <td style={{...tdSt,fontWeight:600}}>{r.name}</td>
                    <td style={{...tdSt,color:T.muted}}>{proj?.client||"—"}</td>
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
        <div style={{ position:'fixed', bottom:24, right:24, background:T.navy, color:'#EEF1F6', padding:'8px 16px', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.05em' }}>
          Caricamento...
        </div>
      )}

      {error && (
        <div style={{ border:`0.5px solid ${T.ink10}`, background:'#fff', padding:16, color:T.red, fontFamily:"'IBM Plex Mono', monospace", fontSize:11 }}>
          {error}
        </div>
      )}

    </div>
  );
}
