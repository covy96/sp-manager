import { useEffect, useMemo, useState } from "react";
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";

// ── BRAND TOKENS ─────────────────────────────────────────────────
const T = {
  ink: '#0E0E0D', navy: '#13315C', brass: '#D9C98A',
  paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33',
  red: '#b91c1c', green: '#1a6b3c',
};

const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const WEEKDAYS = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

function toISODate(date) {
  const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,"0"), d = String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}
function getMonthRange(year, month) {
  return { start: toISODate(new Date(year, month, 1)), end: toISODate(new Date(year, month+1, 0)) };
}
function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
  const firstWeekday = (firstDay.getDay()+6) % 7;
  const totalCells = Math.ceil((firstWeekday + lastDay.getDate()) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const date = new Date(year, month, i - firstWeekday + 1);
    return { date, iso: toISODate(date), isCurrentMonth: date.getMonth() === month };
  });
}

function getTaskDot(task, today) {
  if (task.status === "completed") return T.muted;
  if (task.data_pianificata < today) return T.red;
  return T.navy;
}
function getTaskBg(task, today) {
  if (task.status === "completed") return { bg: '#f3f4f6', color: T.muted };
  if (task.data_pianificata < today) return { bg: '#fef2f2', color: T.red };
  return { bg: '#EEF3FA', color: T.navy };
}

export default function CalendarioPage() {
  const { studioId } = useStudio();
  const now = new Date();

  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [tasks, setTasks]                 = useState([]);
  const [projectsById, setProjectsById]   = useState({});
  const [membersById, setMembersById]     = useState({});
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [onlyMine, setOnlyMine]           = useState(false);
  const [selectedDay, setSelectedDay]     = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  const todayISO = toISODate(new Date());

  useEffect(() => {
    if (!studioId || studioId === "null" || studioId === "undefined") return;
    const loadData = async () => {
      setLoading(true); setError("");
      const range = getMonthRange(selectedYear, selectedMonth);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) { setError(authError?.message || "Utente non autenticato."); setLoading(false); return; }
      let teamMember;
      try { teamMember = await getOrCreateTeamMember(authData.user); }
      catch (e) { setError(e.message); setLoading(false); return; }
      if (!teamMember?.id || teamMember.id === "null") { setError("Impossibile identificare il membro del team."); setLoading(false); return; }

      const tasksRes = await supabase.from("tasks").select("*").eq("studio", studioId).gte("data_pianificata", range.start).lte("data_pianificata", range.end);
      if (tasksRes.error) { setError(tasksRes.error.message); setLoading(false); return; }

      const loaded = tasksRes.data ?? [];
      const pIds = [...new Set(loaded.map(t => t.project_id).filter(Boolean))];
      const mIds = [...new Set(loaded.map(t => t.assigned_member).filter(Boolean))];
      const [pRes, mRes] = await Promise.all([
        pIds.length > 0 ? supabase.from("projects").select("id,name").in("id", pIds) : Promise.resolve({ data: [] }),
        mIds.length > 0 ? supabase.from("team_members").select("id,user_name,user_email").in("id", mIds) : Promise.resolve({ data: [] }),
      ]);

      setTasks(loaded);
      setProjectsById((pRes.data ?? []).reduce((acc, p) => { acc[p.id] = p.name || "Progetto"; return acc; }, {}));
      setMembersById((mRes.data ?? []).reduce((acc, m) => { acc[m.id] = m.user_name || m.user_email || "Membro"; return acc; }, {}));
      setCurrentMemberId(teamMember.id);
      setSelectedDay(null);
      setLoading(false);
    };
    loadData();
  }, [selectedYear, selectedMonth, studioId]);

  const calendarDays = useMemo(() => getCalendarDays(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  const visibleTasks = useMemo(() => {
    const validId = currentMemberId && currentMemberId !== "null" ? currentMemberId : null;
    const filtered = onlyMine && validId ? tasks.filter(t => t.assigned_member === validId) : tasks;
    return [...filtered].sort((a, b) => {
      if (a.status === b.status) return (a.title || "").localeCompare(b.title || "", "it");
      return a.status === "completed" ? 1 : -1;
    });
  }, [currentMemberId, onlyMine, tasks]);

  const tasksByDay = useMemo(() => visibleTasks.reduce((acc, t) => {
    if (!t.data_pianificata) return acc;
    if (!acc[t.data_pianificata]) acc[t.data_pianificata] = [];
    acc[t.data_pianificata].push(t);
    return acc;
  }, {}), [visibleTasks]);

  const selectedDayTasks = selectedDay ? tasksByDay[selectedDay] ?? [] : [];

  const changeMonth = delta => {
    const next = new Date(selectedYear, selectedMonth + delta, 1);
    setSelectedYear(next.getFullYear()); setSelectedMonth(next.getMonth());
  };
  const goToday = () => { const t = new Date(); setSelectedYear(t.getFullYear()); setSelectedMonth(t.getMonth()); };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento calendario...</div>
  );
  if (error) return (
    <div style={{ border: `0.5px solid ${T.ink10}`, background: '#fff', padding: 32, color: T.red, fontSize: 13 }}>Errore: {error}</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header controls */}
      <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: `0.5px solid ${T.ink20}`, cursor: 'pointer', color: T.ink, padding: '5px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>←</button>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', minWidth: 180, textAlign: 'center' }}>
            {MONTHS[selectedMonth]} {selectedYear}
          </div>
          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: `0.5px solid ${T.ink20}`, cursor: 'pointer', color: T.ink, padding: '5px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>→</button>
          <button onClick={goToday} style={{ background: T.navy, border: 'none', cursor: 'pointer', color: '#EEF1F6', padding: '5px 14px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Oggi</button>
        </div>

        {/* Toggle mine/all */}
        <div style={{ display: 'flex', border: `0.5px solid ${T.ink20}`, overflow: 'hidden' }}>
          {[false, true].map(v => (
            <button key={String(v)} onClick={() => setOnlyMine(v)} style={{
              padding: '6px 16px', border: 'none', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              background: onlyMine === v ? T.navy : 'transparent',
              color: onlyMine === v ? '#EEF1F6' : T.muted,
            }}>{v ? "Solo i miei" : "Tutti"}</button>
          ))}
        </div>
      </div>

      {/* Calendar + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 10, alignItems: 'start' }}>

        {/* Calendar grid */}
        <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, overflow: 'hidden' }}>
          {/* Weekdays header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `0.5px solid ${T.ink10}`, background: T.paper }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, padding: '8px 0', textAlign: 'center' }}>{d}</div>
            ))}
          </div>
          {/* Days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {calendarDays.map(day => {
              const dayTasks = tasksByDay[day.iso] ?? [];
              const visible = dayTasks.slice(0, 2);
              const hidden = Math.max(dayTasks.length - 2, 0);
              const isToday = day.iso === todayISO;
              const isSelected = day.iso === selectedDay;
              return (
                <button key={day.iso} type="button" onClick={() => setSelectedDay(day.iso)}
                  style={{
                    minHeight: 100, borderBottom: `0.5px solid ${T.ink10}`, borderRight: `0.5px solid ${T.ink10}`,
                    padding: '6px 8px', textAlign: 'left', cursor: 'pointer',
                    background: isSelected ? '#EEF3FA' : day.isCurrentMonth ? '#fff' : T.paper,
                    outline: isToday ? `1.5px solid ${T.navy}` : 'none',
                    outlineOffset: -1,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.paper; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#EEF3FA' : day.isCurrentMonth ? '#fff' : T.paper; }}
                >
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: day.isCurrentMonth ? (isToday ? T.navy : T.ink) : T.muted, fontWeight: isToday ? 600 : 400, marginBottom: 4 }}>
                    {day.date.getDate()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {visible.map(task => {
                      const { bg, color } = getTaskBg(task, todayISO);
                      return (
                        <div key={task.id} style={{ background: bg, color, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
                          {task.title || "Task"}
                        </div>
                      );
                    })}
                    {hidden > 0 && (
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, padding: '1px 4px' }}>+{hidden} altri</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Task del giorno</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, letterSpacing: '0.05em' }}>
                {selectedDay || "Seleziona un giorno"}
              </div>
            </div>
            {selectedDay && (
              <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: `0.5px solid ${T.ink20}`, cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, padding: '3px 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Chiudi</button>
            )}
          </div>

          {!selectedDay && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, padding: '20px 0', textAlign: 'center' }}>
              Clicca su un giorno per vedere i task.
            </div>
          )}

          {selectedDay && selectedDayTasks.length === 0 && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, padding: '20px 0', textAlign: 'center' }}>
              Nessun task pianificato.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedDayTasks.map(task => {
              const dot = getTaskDot(task, todayISO);
              const { bg, color } = getTaskBg(task, todayISO);
              return (
                <div key={task.id} style={{ background: bg, border: `0.5px solid ${color}22`, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 3 }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>{task.title || "Task senza titolo"}</div>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 16 }}>
                    <div>Categoria: <span style={{ color: T.ink }}>{task.categoria || "Senza categoria"}</span></div>
                    <div>Progetto: <span style={{ color: T.ink }}>{projectsById[task.project_id] || "—"}</span></div>
                    <div>Membro: <span style={{ color: T.ink }}>{membersById[task.assigned_member] || "—"}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
