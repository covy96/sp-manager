import { useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";

const MONTHS   = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const WEEKDAYS = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
const WEEKDAYS_FULL = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];

// ── HELPERS DATE ──────────────────────────────────────────────────
function toISO(date) {
  const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,"0"), d=String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}
function getMondayOf(date) {
  const d=new Date(date);
  const day=d.getDay();
  const diff=day===0?-6:1-day;
  d.setDate(d.getDate()+diff); d.setHours(0,0,0,0);
  return d;
}
function addDays(date,n) { const d=new Date(date); d.setDate(d.getDate()+n); return d; }
function addWeeks(date,n) { return addDays(date,n*7); }
function addMonths(date,n) { return new Date(date.getFullYear(), date.getMonth()+n, 1); }

function getMonthRange(year,month) {
  return { start:toISO(new Date(year,month,1)), end:toISO(new Date(year,month+1,0)) };
}
function getWeekDays(monday, count=7) {
  return Array.from({length:count},(_,i)=>addDays(monday,i));
}
function getMonthDays(year,month) {
  const first=new Date(year,month,1);
  const last=new Date(year,month+1,0);
  const firstWd=(first.getDay()+6)%7;
  const total=Math.ceil((firstWd+last.getDate())/7)*7;
  return Array.from({length:total},(_,i)=>{
    const date=new Date(year,month,i-firstWd+1);
    return { date, iso:toISO(date), isCurrentMonth:date.getMonth()===month };
  });
}
function fmtDay(date) { return date.toLocaleDateString('it-IT',{day:'numeric',month:'short'}); }
function fmtDayNum(date) { return String(date.getDate()); }

function getTaskBg(task,today,T) {
  if (task.status==="completed") return { bg:T.surface2, color:T.muted };
  if (task.data_pianificata<today) return { bg:T.redLight, color:T.red };
  return { bg:T.navyLight, color:T.navy };
}

// ── AVATAR ────────────────────────────────────────────────────────
const AVATAR_COLORS=["#13315C","#1a6b3c","#7c3aed","#b45309","#be185d","#0e7490"];
function avatarColor(seed="") {
  let h=0; for(let i=0;i<seed.length;i++) h=seed.charCodeAt(i)+((h<<5)-h);
  return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length];
}
function getInitials(name="") {
  return name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");
}

// ── TASK PILL ─────────────────────────────────────────────────────
function TaskPill({ task, today, onClick }) {
  const { T } = useTheme();
  const { bg, color } = getTaskBg(task, today, T);
  return (
    <div onClick={e=>{e.stopPropagation();onClick&&onClick(task);}} style={{
      background:bg, color, fontFamily:"'IBM Plex Mono', monospace", fontSize:9,
      padding:'2px 6px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
      letterSpacing:'0.02em', cursor:'pointer', marginBottom:2,
    }}>
      {task.title||"Task"}
    </div>
  );
}

// ── TASK DETAIL SIDEBAR ───────────────────────────────────────────
function TaskSidebar({ tasks, date, projectsById, membersById, onClose, today }) {
  const { T } = useTheme();
  return (
    <div style={{ background:T.surface, border:`0.5px solid ${T.ink10}`, padding:'16px 18px', minWidth:280 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:T.ink, marginBottom:4 }}>Task del giorno</div>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>
            {date ? fmtDay(new Date(date)) : "Seleziona un giorno"}
          </div>
        </div>
        {date && <button onClick={onClose} style={{ background:'none', border:`0.5px solid ${T.ink20}`, cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, padding:'3px 8px', textTransform:'uppercase', letterSpacing:'0.08em' }}>×</button>}
      </div>
      {!date && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, padding:'20px 0', textAlign:'center' }}>Clicca su un giorno</div>}
      {date && tasks.length===0 && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, padding:'20px 0', textAlign:'center' }}>Nessun task pianificato</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {tasks.map(task=>{
          const {bg,color}=getTaskBg(task,today,T);
          return (
            <div key={task.id} style={{ background:bg, border:`0.5px solid ${color}22`, padding:'10px 12px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0, marginTop:3 }}/>
                <div style={{ fontSize:12, fontWeight:600, color:T.ink, lineHeight:1.3 }}>{task.title||"Task"}</div>
              </div>
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, paddingLeft:16, display:'flex', flexDirection:'column', gap:2 }}>
                <div>Categoria: <span style={{color:T.ink}}>{task.categoria||"—"}</span></div>
                <div>Progetto: <span style={{color:T.ink}}>{projectsById[task.project_id]||"—"}</span></div>
                <div>Membro: <span style={{color:T.ink}}>{membersById[task.assigned_member]||"—"}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function CalendarioPage() {
  const { T } = useTheme();
  const { studioId } = useStudio();
  const now = new Date();
  const todayISO = toISO(now);

  // Vista
  const [viewMode, setViewMode] = useState("month"); // month|week|3days|today

  // Riferimento data di navigazione
  const [refDate, setRefDate] = useState(new Date(now));

  // Dati
  const [tasks, setTasks]             = useState([]);
  const [projectsById, setProjectsById] = useState({});
  const [membersById, setMembersById] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  // Filtri
  const [selectedMembers, setSelectedMembers] = useState([]); // vuoto = tutti
  const [showMemberFilter, setShowMemberFilter] = useState(false);
  const filterRef = useRef(null);

  // Selezione giorno (sidebar)
  const [selectedDay, setSelectedDay] = useState(null);

  // Range di caricamento
  const loadRange = useMemo(() => {
    if (viewMode==="month") {
      return getMonthRange(refDate.getFullYear(), refDate.getMonth());
    }
    if (viewMode==="week") {
      const mon=getMondayOf(refDate);
      return { start:toISO(mon), end:toISO(addDays(mon,6)) };
    }
    if (viewMode==="3days") {
      return { start:toISO(refDate), end:toISO(addDays(refDate,2)) };
    }
    // today
    return { start:todayISO, end:todayISO };
  }, [viewMode, refDate]);

  // Carica dati
  useEffect(() => {
    if (!studioId||studioId==="null") return;
    const load = async () => {
      setLoading(true); setError("");
      const { data:authData, error:authError } = await supabase.auth.getUser();
      if (authError||!authData?.user?.id) { setError("Utente non autenticato."); setLoading(false); return; }
      let tm;
      try { tm=await getOrCreateTeamMember(authData.user); }
      catch(e) { setError(e.message); setLoading(false); return; }
      setCurrentMemberId(tm.id);

      const [tasksRes, membersRes] = await Promise.all([
        supabase.from("tasks").select("*").eq("studio",studioId).gte("data_pianificata",loadRange.start).lte("data_pianificata",loadRange.end),
        supabase.from("team_members").select("id,user_name,user_email,color").eq("studio",studioId),
      ]);
      if (tasksRes.error) { setError(tasksRes.error.message); setLoading(false); return; }

      const loaded=tasksRes.data??[];
      const pIds=[...new Set(loaded.map(t=>t.project_id).filter(Boolean))];
      const mIds=[...new Set(loaded.map(t=>t.assigned_member).filter(Boolean))];
      const [pRes,mRes]=await Promise.all([
        pIds.length>0?supabase.from("projects").select("id,name").in("id",pIds):Promise.resolve({data:[]}),
        mIds.length>0?supabase.from("team_members").select("id,user_name,user_email").in("id",mIds):Promise.resolve({data:[]}),
      ]);
      setTasks(loaded);
      setProjectsById((pRes.data??[]).reduce((acc,p)=>({...acc,[p.id]:p.name||"Progetto"}),{}));
      setMembersById((mRes.data??[]).reduce((acc,m)=>({...acc,[m.id]:m.user_name||m.user_email||"Membro"}),{}));
      setTeamMembers(membersRes.data??[]);
      setSelectedDay(null);
      setLoading(false);
    };
    load();
  }, [studioId, loadRange]);

  // Chiudi filtro su click esterno
  useEffect(() => {
    function h(e) { if(filterRef.current&&!filterRef.current.contains(e.target)) setShowMemberFilter(false); }
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  }, []);

  // Task filtrate per membro
  const visibleTasks = useMemo(() => {
    const filtered = selectedMembers.length>0
      ? tasks.filter(t=>selectedMembers.includes(t.assigned_member))
      : tasks;
    return [...filtered].sort((a,b)=>{
      if(a.status===b.status) return (a.title||"").localeCompare(b.title||"","it");
      return a.status==="completed"?1:-1;
    });
  }, [tasks, selectedMembers]);

  const tasksByDay = useMemo(() => visibleTasks.reduce((acc,t)=>{
    if(!t.data_pianificata) return acc;
    if(!acc[t.data_pianificata]) acc[t.data_pianificata]=[];
    acc[t.data_pianificata].push(t);
    return acc;
  },{}), [visibleTasks]);

  const selectedDayTasks = selectedDay ? (tasksByDay[selectedDay]??[]) : [];

  // ── NAVIGAZIONE ───────────────────────────────────────────────
  const goBack = () => {
    if(viewMode==="month") setRefDate(d=>addMonths(d,-1));
    else if(viewMode==="week") setRefDate(d=>addWeeks(d,-1));
    else if(viewMode==="3days") setRefDate(d=>addDays(d,-3));
    else setRefDate(d=>addDays(d,-1));
  };
  const goNext = () => {
    if(viewMode==="month") setRefDate(d=>addMonths(d,1));
    else if(viewMode==="week") setRefDate(d=>addWeeks(d,1));
    else if(viewMode==="3days") setRefDate(d=>addDays(d,3));
    else setRefDate(d=>addDays(d,1));
  };
  const goToday = () => { setRefDate(new Date(now)); };

  // ── LABEL PERIODO ──────────────────────────────────────────────
  const periodLabel = useMemo(() => {
    if(viewMode==="month") return `${MONTHS[refDate.getMonth()]} ${refDate.getFullYear()}`;
    if(viewMode==="week") {
      const mon=getMondayOf(refDate);
      const sun=addDays(mon,6);
      return `${fmtDay(mon)} – ${fmtDay(sun)}`;
    }
    if(viewMode==="3days") return `${fmtDay(refDate)} – ${fmtDay(addDays(refDate,2))}`;
    return fmtDay(now);
  }, [viewMode, refDate]);

  // ── TOGGLE MEMBRO ─────────────────────────────────────────────
  const toggleMember = id => setSelectedMembers(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  // ── RENDER VISTE ──────────────────────────────────────────────

  // Vista MESE
  const monthDays = useMemo(()=>getMonthDays(refDate.getFullYear(),refDate.getMonth()),[refDate]);

  const renderMonth = () => (
    <div style={{ background:T.surface, border:`0.5px solid ${T.ink10}`, overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:`0.5px solid ${T.ink10}`, background:T.bg }}>
        {WEEKDAYS.map(d=>(
          <div key={d} style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'8px 0', textAlign:'center' }}>{d}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
        {monthDays.map(day=>{
          const dayTasks=tasksByDay[day.iso]??[];
          const visible=dayTasks.slice(0,3);
          const hidden=Math.max(dayTasks.length-3,0);
          const isToday=day.iso===todayISO;
          const isSel=day.iso===selectedDay;
          return (
            <button key={day.iso} onClick={()=>setSelectedDay(isSel?null:day.iso)} style={{
              minHeight:90, borderBottom:`0.5px solid ${T.ink10}`, borderRight:`0.5px solid ${T.ink10}`,
              padding:'5px 6px', textAlign:'left', cursor:'pointer',
              background:isSel?T.navyLight:day.isCurrentMonth?T.surface:T.bg,
              outline:isToday?`1.5px solid ${T.navy}`:'none', outlineOffset:-1,
            }}
              onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=T.bg;}}
              onMouseLeave={e=>{e.currentTarget.style.background=isSel?T.navyLight:day.isCurrentMonth?T.surface:T.bg;}}
            >
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:day.isCurrentMonth?(isToday?T.navy:T.ink):T.muted, fontWeight:isToday?600:400, marginBottom:3 }}>
                {day.date.getDate()}
              </div>
              {visible.map(t=><TaskPill key={t.id} task={t} today={todayISO}/>)}
              {hidden>0&&<div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted }}>+{hidden}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Vista SETTIMANA e 3 GIORNI (colonne per giorno)
  const renderMultiDay = (count) => {
    const startDate = count===7 ? getMondayOf(refDate) : new Date(refDate);
    const days = getWeekDays(startDate, count);
    return (
      <div style={{ background:T.surface, border:`0.5px solid ${T.ink10}`, overflow:'hidden' }}>
        {/* Header giorni */}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${count},1fr)`, borderBottom:`0.5px solid ${T.ink10}`, background:T.bg }}>
          {days.map((d,i)=>{
            const iso=toISO(d);
            const isToday=iso===todayISO;
            return (
              <div key={i} style={{ padding:'10px 8px', textAlign:'center', borderRight:i<count-1?`0.5px solid ${T.ink10}`:'none' }}>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, marginBottom:4 }}>
                  {WEEKDAYS[i%7]}
                </div>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:18, fontWeight:600, color:isToday?T.navy:T.ink, width:32, height:32, borderRadius:'50%', background:isToday?T.navyLight:'transparent', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>
                  {fmtDayNum(d)}
                </div>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted, marginTop:2 }}>
                  {d.toLocaleDateString('it-IT',{month:'short'})}
                </div>
              </div>
            );
          })}
        </div>
        {/* Colonne task */}
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${count},1fr)`, minHeight:300 }}>
          {days.map((d,i)=>{
            const iso=toISO(d);
            const dayTasks=tasksByDay[iso]??[];
            const isToday=iso===todayISO;
            const isSel=iso===selectedDay;
            return (
              <div key={i} onClick={()=>setSelectedDay(isSel?null:iso)} style={{
                padding:'8px 6px', borderRight:i<count-1?`0.5px solid ${T.ink10}`:'none',
                background:isSel?T.navyLight:isToday?T.surface2:T.surface,
                cursor:'pointer', minHeight:200,
              }}
                onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background=T.bg;}}
                onMouseLeave={e=>{e.currentTarget.style.background=isSel?T.navyLight:isToday?T.surface2:T.surface;}}
              >
                {dayTasks.length===0 ? (
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.ink10, padding:'8px 0', textAlign:'center' }}>—</div>
                ) : dayTasks.map(t=>(
                  <TaskPill key={t.id} task={t} today={todayISO} onClick={()=>setSelectedDay(iso)}/>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Vista OGGI
  const renderToday = () => {
    const dayTasks=tasksByDay[todayISO]??[];
    return (
      <div style={{ background:T.surface, border:`0.5px solid ${T.ink10}`, padding:'20px 24px' }}>
        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:T.muted, marginBottom:16 }}>
          Oggi — {now.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        </div>
        {dayTasks.length===0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
            Nessun task pianificato per oggi.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {dayTasks.map(task=>{
              const {bg,color}=getTaskBg(task,todayISO,T);
              return (
                <div key={task.id} style={{ background:bg, border:`0.5px solid ${color}33`, padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:12 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0, marginTop:4 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.ink, marginBottom:4 }}>{task.title||"Task"}</div>
                    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, display:'flex', gap:12 }}>
                      <span>Progetto: <span style={{color:T.ink}}>{projectsById[task.project_id]||"—"}</span></span>
                      <span>Membro: <span style={{color:T.ink}}>{membersById[task.assigned_member]||"—"}</span></span>
                      {task.categoria&&<span>Cat: <span style={{color:T.ink}}>{task.categoria}</span></span>}
                    </div>
                  </div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', color, border:`0.5px solid ${color}`, padding:'2px 8px', flexShrink:0 }}>
                    {task.status==="completed"?"Fatto":task.data_pianificata<todayISO?"Scaduta":"In attesa"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
      Caricamento calendario...
    </div>
  );
  if (error) return (
    <div style={{ border:`0.5px solid ${T.ink10}`, background:T.surface, padding:32, color:T.red, fontSize:13 }}>Errore: {error}</div>
  );

  const showSidebar = viewMode==="month" || viewMode==="week" || viewMode==="3days";

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── TOOLBAR ── */}
      <div style={{ background:T.surface, border:`0.5px solid ${T.ink10}`, padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>

        {/* Toggle vista */}
        <div style={{ display:'flex', border:`0.5px solid ${T.ink20}`, overflow:'hidden' }}>
          {[["month","Mese"],["week","Settimana"],["3days","3 Giorni"],["today","Oggi"]].map(([m,label])=>(
            <button key={m} onClick={()=>{setViewMode(m);if(m==="today")setRefDate(new Date(now));}} style={{
              padding:'6px 14px', border:'none', background:viewMode===m?T.navy:'transparent',
              color:viewMode===m?T.bg:T.muted,
              fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase',
              cursor:'pointer',
            }}>{label}</button>
          ))}
        </div>

        {/* Navigazione */}
        {viewMode!=="today" && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button onClick={goBack} style={{ background:'none', border:`0.5px solid ${T.ink20}`, cursor:'pointer', color:T.ink, padding:'5px 12px', fontFamily:"'IBM Plex Mono', monospace", fontSize:12 }}>←</button>
            <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:14, fontWeight:600, color:T.ink, letterSpacing:'-0.02em', minWidth:200, textAlign:'center' }}>
              {periodLabel}
            </div>
            <button onClick={goNext} style={{ background:'none', border:`0.5px solid ${T.ink20}`, cursor:'pointer', color:T.ink, padding:'5px 12px', fontFamily:"'IBM Plex Mono', monospace", fontSize:12 }}>→</button>
            <button onClick={goToday} style={{ background:T.bg, border:`0.5px solid ${T.ink20}`, cursor:'pointer', color:T.muted, padding:'5px 12px', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.05em' }}>Oggi</button>
          </div>
        )}

        {/* Filtro utenti */}
        <div ref={filterRef} style={{ position:'relative' }}>
          <button onClick={()=>setShowMemberFilter(!showMemberFilter)} style={{
            display:'flex', alignItems:'center', gap:6,
            border:`0.5px solid ${selectedMembers.length>0?T.navy:T.ink20}`,
            background:selectedMembers.length>0?T.navyLight:'transparent',
            padding:'6px 12px', cursor:'pointer',
            fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase',
            color:selectedMembers.length>0?T.navy:T.muted,
          }}>
            {/* Avatars selezionati */}
            {selectedMembers.length>0 ? (
              <div style={{ display:'flex', gap:2 }}>
                {selectedMembers.slice(0,3).map(id=>{
                  const m=teamMembers.find(x=>x.id===id);
                  return m ? (
                    <div key={id} style={{ width:18,height:18,borderRadius:'50%',background:m.color||avatarColor(m.user_name||m.user_email||""),display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:600,color:T.surface }}>
                      {getInitials(m.user_name||m.user_email)}
                    </div>
                  ) : null;
                })}
                {selectedMembers.length>3&&<span style={{fontSize:9,color:T.navy}}>+{selectedMembers.length-3}</span>}
              </div>
            ) : "Utenti"}
            <span style={{ fontSize:10 }}>▾</span>
          </button>

          {showMemberFilter && (
            <div style={{ position:'absolute', right:0, top:'100%', marginTop:4, width:220, background:T.surface, border:`0.5px solid ${T.ink20}`, zIndex:30 }}>
              <div style={{ padding:'8px 12px', maxHeight:240, overflowY:'auto' }}>
                {teamMembers.map(m=>(
                  <label key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', cursor:'pointer' }}>
                    <input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={()=>toggleMember(m.id)} style={{ accentColor:T.navy, width:13, height:13 }}/>
                    <div style={{ width:22,height:22,borderRadius:'50%',background:m.color||avatarColor(m.user_name||m.user_email||""),display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:600,color:T.surface,flexShrink:0 }}>
                      {getInitials(m.user_name||m.user_email)}
                    </div>
                    <span style={{ fontSize:12, color:T.ink }}>{m.user_name||m.user_email}</span>
                  </label>
                ))}
              </div>
              {selectedMembers.length>0&&(
                <div style={{ padding:'8px 12px', borderTop:`0.5px solid ${T.ink10}` }}>
                  <button onClick={()=>setSelectedMembers([])} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.red, letterSpacing:'0.05em' }}>
                    Rimuovi filtri
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENUTO ── */}
      {viewMode==="today" ? (
        renderToday()
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:showSidebar&&selectedDay?'1fr 300px':'1fr', gap:10, alignItems:'start' }}>
          <div>
            {viewMode==="month" && renderMonth()}
            {viewMode==="week"  && renderMultiDay(7)}
            {viewMode==="3days" && renderMultiDay(3)}
          </div>
          {showSidebar && selectedDay && (
            <TaskSidebar
              tasks={selectedDayTasks}
              date={selectedDay}
              projectsById={projectsById}
              membersById={membersById}
              onClose={()=>setSelectedDay(null)}
              today={todayISO}
            />
          )}
        </div>
      )}

    </div>
  );
}
