import { useEffect, useMemo, useRef, useState } from "react";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";
import SlidingTabs from "../components/SlidingTabs";

const MONTHS   = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const WEEKDAYS = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

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

// ── TASK DETAIL — sidebar desktop / bottom sheet mobile ───────────
function TaskSidebar({ tasks, date, projectsById, membersById, onClose, today, isMobile }) {
  const { T } = useTheme();

  const content = (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:T.ink, marginBottom:4 }}>Task del giorno</div>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>
            {date ? fmtDay(new Date(date)) : "Seleziona un giorno"}
          </div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:`0.5px solid ${T.ink20}`, borderRadius: T.radiusSm, cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:12, color:T.muted, padding:'3px 10px', lineHeight:1 }}>×</button>
      </div>
      {tasks.length===0 && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, padding:'20px 0', textAlign:'center' }}>Nessun task pianificato</div>}
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
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:48, background:'rgba(0,0,0,0.3)' }}/>
        {/* Bottom sheet */}
        <div style={{
          position:'fixed', bottom:64, left:0, right:0, zIndex:49,
          background:T.surface, borderRadius:'16px 16px 0 0',
          padding:'16px 18px 24px',
          maxHeight:'55vh', overflowY:'auto',
          boxShadow:'0 -4px 24px rgba(0,0,0,0.18)',
        }}>
          {/* Handle */}
          <div style={{ width:36, height:4, borderRadius:2, background:T.ink20, margin:'0 auto 14px' }}/>
          {content}
        </div>
      </>
    );
  }

  return (
    <div style={{ background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, boxShadow:T.shadowMd, borderRadius:T.radius, padding:'16px 18px', minWidth:280 }}>
      {content}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function CalendarioPage() {
  const { T } = useTheme();
  usePageTitleOnMount("Calendario");
  const isMobile = useIsMobile();
  const { studioId } = useStudio();
  const now = new Date();
  const todayISO = toISO(now);

  // Vista — su mobile default "3days", su desktop "month"
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? "3days" : "month");

  const [refDate, setRefDate] = useState(new Date(now));
  const [tasks, setTasks]             = useState([]);
  const [projectsById, setProjectsById] = useState({});
  const [membersById, setMembersById] = useState({});
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showMemberFilter, setShowMemberFilter] = useState(false);
  const filterRef = useRef(null);
  const [selectedDay, setSelectedDay] = useState(null);

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
    return { start:todayISO, end:todayISO };
  }, [viewMode, refDate]);

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
        supabase.from("tasks").select("*").eq("studio",studioId).gte("data_pianificata",loadRange.start).lte("data_pianificata",loadRange.end).is("deleted_at",null),
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

  useEffect(() => {
    function h(e) { if(filterRef.current&&!filterRef.current.contains(e.target)) setShowMemberFilter(false); }
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  }, []);

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

  const toggleMember = id => setSelectedMembers(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const monthDays = useMemo(()=>getMonthDays(refDate.getFullYear(),refDate.getMonth()),[refDate]);

  // ── VISTA MESE ────────────────────────────────────────────────
  const renderMonth = () => {
    if (isMobile) {
      // Versione mobile: celle compatte con pallini colorati
      return (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, overflow:'hidden', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:`0.5px solid ${T.ink10}`, background:T.bg }}>
            {WEEKDAYS.map(d=>(
              <div key={d} style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:7, letterSpacing:'0.1em', textTransform:'uppercase', color:T.muted, padding:'6px 0', textAlign:'center' }}>{d}</div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
            {monthDays.map(day=>{
              const dayTasks=tasksByDay[day.iso]??[];
              const isToday=day.iso===todayISO;
              const isSel=day.iso===selectedDay;
              // Raggruppa task per colore (completate=grigio, scadute=rosso, attive=navy)
              const dots = [];
              const active = dayTasks.filter(t=>t.status!=="completed"&&t.data_pianificata>=todayISO);
              const overdue = dayTasks.filter(t=>t.status!=="completed"&&t.data_pianificata<todayISO);
              const done = dayTasks.filter(t=>t.status==="completed");
              if(overdue.length>0) dots.push(T.red);
              if(active.length>0) dots.push(T.navy);
              if(done.length>0) dots.push(T.muted);
              return (
                <button key={day.iso} onClick={()=>setSelectedDay(isSel?null:day.iso)} style={{
                  minHeight:48,
                  padding:'4px 2px', textAlign:'center', cursor:'pointer',
                  background:isSel?T.navyLight:day.isCurrentMonth?T.surface:T.bg,
                  outline:isToday?`1.5px solid ${T.navy}`:'none', outlineOffset:-1,
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-between',
                  border:'none', borderBottom:`0.5px solid ${T.ink10}`, borderRight:`0.5px solid ${T.ink10}`,
                }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:day.isCurrentMonth?(isToday?T.navy:T.ink):T.ink20, fontWeight:isToday?700:400 }}>
                    {day.date.getDate()}
                  </div>
                  {dots.length>0 && (
                    <div style={{ display:'flex', gap:2, justifyContent:'center', paddingBottom:2 }}>
                      {dots.slice(0,3).map((c,i)=>(
                        <div key={i} style={{ width:5, height:5, borderRadius:'50%', background:c }}/>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Desktop: versione originale con scroll
    return (
      <div style={{ overflowX:'auto' }}>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, overflow:'hidden', minWidth:560, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
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
                  minHeight:90,
                  padding:'5px 6px', textAlign:'left', cursor:'pointer',
                  background:isSel?T.navyLight:day.isCurrentMonth?T.surface:T.bg,
                  outline:isToday?`1.5px solid ${T.navy}`:'none', outlineOffset:-1,
                  border:'none', borderBottom:`0.5px solid ${T.ink10}`, borderRight:`0.5px solid ${T.ink10}`,
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
      </div>
    );
  };

  // ── VISTA SETTIMANA / 3 GIORNI ────────────────────────────────
  const renderMultiDay = (count) => {
    const startDate = count===7 ? getMondayOf(refDate) : new Date(refDate);
    const days = getWeekDays(startDate, count);
    const minW = count === 7 ? 560 : 320;
    return (
      <div style={{ overflowX: (!isMobile || count===7) && count!==3 ? 'auto' : 'visible' }}>
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, overflow:'hidden', minWidth: isMobile && count<=3 ? undefined : minW, borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
          {/* Header giorni */}
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${count},1fr)`, borderBottom:`0.5px solid ${T.ink10}`, background:T.bg }}>
            {days.map((d,i)=>{
              const iso=toISO(d);
              const isToday=iso===todayISO;
              return (
                <div key={i} style={{ padding: isMobile ? '8px 4px' : '10px 8px', textAlign:'center', borderRight:i<count-1?`0.5px solid ${T.ink10}`:'none' }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize: isMobile ? 7 : 8, letterSpacing:'0.1em', textTransform:'uppercase', color:T.muted, marginBottom:3 }}>
                    {WEEKDAYS[(i + (count===7 ? 0 : new Date(startDate).getDay() === 0 ? 6 : new Date(startDate).getDay() - 1)) % 7]}
                  </div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize: isMobile ? 20 : 18, fontWeight:600, color:isToday?T.navy:T.ink, width: isMobile ? 36 : 32, height: isMobile ? 36 : 32, borderRadius:'50%', background:isToday?T.navyLight:'transparent', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>
                    {fmtDayNum(d)}
                  </div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize: isMobile ? 8 : 8, color:T.muted, marginTop:2 }}>
                    {d.toLocaleDateString('it-IT',{month:'short'})}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Colonne task */}
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${count},1fr)`, minHeight: isMobile ? 200 : 300 }}>
            {days.map((d,i)=>{
              const iso=toISO(d);
              const dayTasks=tasksByDay[iso]??[];
              const isToday=iso===todayISO;
              const isSel=iso===selectedDay;
              return (
                <div key={i} onClick={()=>setSelectedDay(isSel?null:iso)} style={{
                  padding: isMobile ? '6px 4px' : '8px 6px',
                  borderRight:i<count-1?`0.5px solid ${T.ink10}`:'none',
                  background:isSel?T.navyLight:isToday?T.surface2:T.surface,
                  cursor:'pointer', minHeight: isMobile ? 120 : 200,
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
      </div>
    );
  };

  // ── VISTA OGGI ────────────────────────────────────────────────
  const renderToday = () => {
    const dayTasks=tasksByDay[todayISO]??[];
    return (
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding: isMobile ? '16px' : '20px 24px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>
        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:16 }}>
          {now.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
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
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:T.ink, marginBottom:4 }}>{task.title||"Task"}</div>
                    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, display:'flex', flexWrap:'wrap', gap: isMobile ? 6 : 12 }}>
                      <span>Progetto: <span style={{color:T.ink}}>{projectsById[task.project_id]||"—"}</span></span>
                      <span>Membro: <span style={{color:T.ink}}>{membersById[task.assigned_member]||"—"}</span></span>
                      {task.categoria&&<span>Cat: <span style={{color:T.ink}}>{task.categoria}</span></span>}
                    </div>
                  </div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.06em', textTransform:'uppercase', color, border:`0.5px solid ${color}`, padding:'2px 8px', flexShrink:0, whiteSpace:'nowrap' }}>
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
    <div style={{ border:`0.5px solid ${T.ink10}`, borderRadius: T.radiusSm, background:T.surface, padding:32, color:T.red, fontSize:13 }}>Errore: {error}</div>
  );

  // Viste disponibili
  const TABS_DESKTOP = [
    { key:'month',  label:'Mese'      },
    { key:'week',   label:'Settimana' },
    { key:'3days',  label:'3 Giorni'  },
    { key:'today',  label:'Oggi'      },
  ];
  const TABS_MOBILE = [
    { key:'3days',  label:'3 Giorni'  },
    { key:'month',  label:'Mese'      },
    { key:'today',  label:'Oggi'      },
  ];
  const tabs = isMobile ? TABS_MOBILE : TABS_DESKTOP;

  const showSidebar = viewMode==="month" || viewMode==="week" || viewMode==="3days";

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── TOOLBAR — riga unica ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

        {/* SlidingTabs vista */}
        <SlidingTabs
          tabs={tabs}
          active={viewMode}
          onChange={key => { setViewMode(key); if (key==="today") setRefDate(new Date(now)); }}
          style={{ flexShrink:0 }}
        />

        {/* Navigazione periodo */}
        {viewMode!=="today" && (
          <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, justifyContent:'center', minWidth:0 }}>
            <button onClick={goBack} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor:'pointer', color:T.ink, padding:'4px 12px', fontFamily:"'IBM Plex Mono', monospace", fontSize:13, flexShrink:0 }}>←</button>
            <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize: isMobile ? 12 : 13, fontWeight:600, color:T.ink, letterSpacing:'-0.02em', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0 }}>
              {periodLabel}
            </div>
            <button onClick={goNext} style={{ background:'none', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor:'pointer', color:T.ink, padding:'4px 12px', fontFamily:"'IBM Plex Mono', monospace", fontSize:13, flexShrink:0 }}>→</button>
            <button onClick={goToday} style={{ background:T.bg, border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor:'pointer', color:T.muted, padding:'4px 8px', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, letterSpacing:'0.05em', whiteSpace:'nowrap', flexShrink:0 }}>Oggi</button>
          </div>
        )}

        {/* Filtro utenti */}
        <div ref={filterRef} style={{ position:'relative', flexShrink:0, marginLeft:'auto' }}>
          <button onClick={()=>setShowMemberFilter(!showMemberFilter)} style={{
            display:'flex', alignItems:'center', gap:6,
            border:`0.5px solid ${selectedMembers.length>0 ? T.navy : T.borderMd}`,
            borderRadius: T.radiusSm,
            background: selectedMembers.length>0 ? T.navyLight : 'transparent',
            padding:'7px 14px', cursor:'pointer',
            fontFamily:"'IBM Plex Mono', monospace", fontSize:11,
            letterSpacing:'0.08em', textTransform:'uppercase',
            color: selectedMembers.length>0 ? T.navy : T.ink,
          }}>
            {selectedMembers.length>0 ? `Utenti (${selectedMembers.length})` : `Utenti`}
          </button>

          {showMemberFilter && (
            <div style={{ position:'absolute', right:0, top:'100%', marginTop:4, width:220, background:T.surface, border:`1px solid ${T.borderMd}`, zIndex:30 }}>
              <div style={{ padding:8, maxHeight:240, overflowY:'auto' }}>
                {teamMembers.map(m=>(
                  <label key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', cursor:'pointer' }}>
                    <input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={()=>toggleMember(m.id)} style={{ accentColor:T.navy, width:13, height:13 }}/>
                    <div style={{ width:22,height:22,borderRadius:'50%',background:m.color||avatarColor(m.user_name||m.user_email||""),display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:600,color:'#fff',flexShrink:0 }}>
                      {getInitials(m.user_name||m.user_email)}
                    </div>
                    <span style={{ fontSize:12, color:T.ink }}>{m.user_name||m.user_email}</span>
                  </label>
                ))}
              </div>
              {selectedMembers.length>0 && (
                <div style={{ padding:'8px 12px', borderTop:`0.5px solid ${T.border}` }}>
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
        <>
          {/* Desktop: griglia con sidebar laterale */}
          {!isMobile ? (
            <div style={{ display:'grid', gridTemplateColumns:showSidebar&&selectedDay?'1fr 300px':'1fr', gap:10, alignItems:'start' }}>
              <div>
                {viewMode==="month" && renderMonth()}
                {viewMode==="week"  && renderMultiDay(7)}
                {viewMode==="3days" && renderMultiDay(3)}
              </div>
              {showSidebar && selectedDay && (
                <TaskSidebar tasks={selectedDayTasks} date={selectedDay} projectsById={projectsById} membersById={membersById} onClose={()=>setSelectedDay(null)} today={todayISO} isMobile={false}/>
              )}
            </div>
          ) : (
            // Mobile: calendario fullwidth + bottom sheet
            <div>
              {viewMode==="month" && renderMonth()}
              {viewMode==="week"  && renderMultiDay(7)}
              {viewMode==="3days" && renderMultiDay(3)}
              {selectedDay && (
                <TaskSidebar tasks={selectedDayTasks} date={selectedDay} projectsById={projectsById} membersById={membersById} onClose={()=>setSelectedDay(null)} today={todayISO} isMobile={true}/>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}
