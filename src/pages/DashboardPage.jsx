import { useEffect, useMemo, useState } from "react";
import { useStudio } from "../hooks/useStudio";
import { usePermissions } from "../hooks/usePermissions";
import { supabase } from "../lib/supabase";
import { calcolaIncassato, formatOre } from "../lib/utils";

// ── BRAND TOKENS ─────────────────────────────────────────────────
const T = {
  ink:   '#0E0E0D',
  navy:  '#13315C',
  brass: '#D9C98A',
  paper: '#EEF1F6',
  muted: '#8a847b',
  ink10: '#0E0E0D1A',
  ink20: '#0E0E0D33',
  ink05: '#0E0E0D0D',
  red:   '#b91c1c',
  green: '#1a6b3c',
};

// ── HELPERS ──────────────────────────────────────────────────────
function currency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency", currency: "EUR", maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDateIt(date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  }).format(date);
}

function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────

function KpiCard({ label, value, note, valueColor }) {
  return (
    <div style={{
      background: '#fff',
      border: `0.5px solid ${T.ink10}`,
      padding: '18px 20px',
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9, letterSpacing: '0.25em',
        textTransform: 'uppercase', color: T.muted, marginBottom: 10,
      }}>{label}</div>
      <div style={{
        fontSize: 32, fontWeight: 600,
        letterSpacing: '-0.04em', lineHeight: 1,
        color: valueColor || T.ink,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>{value}</div>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9, color: T.muted, marginTop: 6,
      }}>{note}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{
      background: '#fff',
      border: `0.5px solid ${T.ink10}`,
      padding: '20px 22px',
    }}>
      <div style={{
        fontSize: 13, fontWeight: 600,
        letterSpacing: '-0.01em', color: T.ink,
        marginBottom: 16,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>{title}</div>
      {children}
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div style={{
      padding: '40px 0', textAlign: 'center',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11, color: T.muted, letterSpacing: '0.05em',
    }}>{label}</div>
  );
}

function TaskRow({ task, onToggle, overdue }) {
  const done = task.status === 'completed';
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 0',
        borderBottom: `0.5px solid ${T.ink10}`,
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => onToggle(task)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
          border: `1px solid ${done ? T.navy : overdue ? T.red : hover ? T.navy : T.ink20}`,
          background: done ? T.navy : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
        }}
      >
        {done && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="#EEF1F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {overdue && !done && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.red, display: 'block' }} />
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: done ? T.muted : T.ink,
          textDecoration: done ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: "'Space Grotesk', sans-serif",
        }}>{task.title}</div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9, color: T.muted, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {task.projects?.name}{task.category ? ` · ${task.category}` : ''}
        </div>
      </div>

      {/* Date (overdue only) */}
      {overdue && (
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9, color: T.red, flexShrink: 0,
        }}>
          {new Date(task.data_pianificata).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
        </span>
      )}
    </div>
  );
}

function ProjectRow({ proj }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: `0.5px solid ${T.ink10}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: T.ink,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          fontFamily: "'Space Grotesk', sans-serif",
        }}>{proj.name}</div>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, color: T.muted, marginLeft: 12, flexShrink: 0,
        }}>{proj.progress}%</span>
      </div>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9, color: T.muted, marginBottom: 6,
      }}>{proj.client || '—'}</div>
      {/* Progress bar */}
      <div style={{ height: 2, background: T.ink10, width: '100%' }}>
        <div style={{ height: 2, background: T.navy, width: `${proj.progress}%`, transition: 'width 0.3s' }} />
      </div>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 9, color: T.muted, marginTop: 4,
      }}>{proj.completedTasks}/{proj.totalTasks} task completati</div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
export default function DashboardPage() {
  const { user: studioUser, teamMember: studioMember, studioId, loading: studioLoading } = useStudio();
  const permissions = usePermissions();

  const [user, setUser]               = useState(null);
  const [teamMember, setTeamMember]   = useState(null);
  const [loading, setLoading]         = useState(true);

  const [activeProjects, setActiveProjects]   = useState(0);
  const [openTasks, setOpenTasks]             = useState(0);
  const [weekHours, setWeekHours]             = useState(0);
  const [creditToCollect, setCreditToCollect] = useState(0);

  const [todayTasks, setTodayTasks]     = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Buongiorno";
    if (h < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (studioLoading || !studioId) return;
    const init = async () => {
      setLoading(true);
      setUser(studioUser);
      setTeamMember(studioMember);

      if (studioUser?.id && studioId) {
        // 1. Progetti attivi
        const { count: projCount } = await supabase
          .from("projects").select("*", { count: "exact", head: true })
          .eq("studio", studioId).eq("archived", false);
        setActiveProjects(projCount || 0);

        // 2. Task aperti
        const { count: taskCount } = await supabase
          .from("tasks").select("*", { count: "exact", head: true })
          .eq("studio", studioId).neq("status", "completed").is("parent_task_id", null);
        setOpenTasks(taskCount || 0);

        // 3. Ore settimana
        const mondayStr = getMonday(new Date()).toISOString().slice(0, 10);
        if (studioMember?.id) {
          const { data: times } = await supabase
            .from("timesheet").select("hours")
            .eq("team_member", studioMember.id).gte("date", mondayStr);
          setWeekHours((times || []).reduce((s, t) => s + (Number(t.hours) || 0), 0));
        }

        // 4. Credito da incassare
        const { data: commesse } = await supabase
          .from("commesse").select("id, importo_offerta_base").eq("studio", studioId);
        const totalCommesse = (commesse || []).reduce((s, c) => s + (Number(c.importo_offerta_base) || 0), 0);
        const commessaIds = (commesse || []).map(c => c.id);
        const incassatoMap = await calcolaIncassato(commessaIds, studioId, supabase);
        const totalIncassato = Object.values(incassatoMap).reduce((s, v) => s + v, 0);
        setCreditToCollect(totalCommesse - totalIncassato);

        // 5. Task di oggi e scadute
        const today = new Date().toISOString().split("T")[0];
        if (studioMember?.id) {
          const { data: allTasks } = await supabase
            .from("tasks").select("*, projects(name)")
            .eq("studio", studioId).eq("assigned_member", studioMember.id);
          setTodayTasks((allTasks || []).filter(t => String(t.data_pianificata).slice(0, 10) === today));

          const { data: overdue } = await supabase
            .from("tasks").select("*, projects(name)")
            .eq("assigned_member", studioMember.id).eq("studio", studioId)
            .neq("status", "completed").lt("data_pianificata", today)
            .is("parent_task_id", null).order("data_pianificata", { ascending: true });
          setOverdueTasks(overdue || []);
        }

        // 6. Progetti recenti
        const { data: projs } = await supabase
          .from("projects").select("id, name, client, created_at, updated_at")
          .eq("studio", studioId).eq("archived", false)
          .order("updated_at", { ascending: false }).limit(5);

        const projectsWithProgress = await Promise.all(
          (projs || []).map(async p => {
            const [{ count: total }, { count: completed }] = await Promise.all([
              supabase.from("tasks").select("*", { count: "exact", head: true })
                .eq("project_id", p.id).is("parent_task_id", null),
              supabase.from("tasks").select("*", { count: "exact", head: true })
                .eq("project_id", p.id).eq("status", "completed").is("parent_task_id", null),
            ]);
            const tot = total || 0, comp = completed || 0;
            return { ...p, totalTasks: tot, completedTasks: comp, progress: tot > 0 ? Math.round((comp / tot) * 100) : 0 };
          })
        );
        setRecentProjects(projectsWithProgress);
      }
      setLoading(false);
    };
    init();
  }, [todayStr, studioId, studioLoading, studioUser, studioMember]);

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === "completed" ? "open" : "completed";
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id);
    if (!error) {
      setTodayTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      setOverdueTasks(prev =>
        prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
            .filter(t => t.status !== "completed")
      );
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 240, fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11, color: T.muted, letterSpacing: '0.1em',
      }}>
        Caricamento dashboard...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h1 style={{
          fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em',
          color: T.ink, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4,
        }}>
          {greeting}{teamMember?.user_name ? `, ${teamMember.user_name}` : ""}
        </h1>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          {formatDateIt(new Date())}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <KpiCard label="Progetti Attivi"      value={activeProjects}          note="in corso"                          valueColor={T.ink} />
        <KpiCard label="Task da Completare"   value={openTasks}               note="aperti"                            valueColor={T.red} />
        <KpiCard label="Ore Questa Settimana" value={`${formatOre(weekHours)} h`} note="dall'inizio settimana"         valueColor={T.navy} />
        {permissions.canViewFinancials && (
          <KpiCard label="Credito da Incassare" value={currency(creditToCollect)} note="da commesse - proforma pagate" valueColor={T.green} />
        )}
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

        {/* Task di oggi */}
        <Panel title="I miei task di oggi">
          {todayTasks.length === 0
            ? <EmptyState label="Nessun task per oggi" />
            : todayTasks.map(task => (
                <TaskRow key={task.id} task={task} onToggle={toggleTaskStatus} overdue={false} />
              ))
          }

          {/* Task scadute */}
          {overdueTasks.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `0.5px solid ${T.ink10}` }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.red,
              }}>
                Task scadute
                <span style={{
                  background: T.red, color: '#fff', borderRadius: '50%',
                  width: 16, height: 16, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 600,
                }}>{overdueTasks.length}</span>
              </div>
              {overdueTasks.map(task => (
                <TaskRow key={task.id} task={task} onToggle={toggleTaskStatus} overdue={true} />
              ))}
            </div>
          )}
        </Panel>

        {/* Progetti recenti */}
        <Panel title="Progetti recenti">
          {recentProjects.length === 0
            ? <EmptyState label="Nessun progetto" />
            : recentProjects.map(proj => (
                <ProjectRow key={proj.id} proj={proj} />
              ))
          }
        </Panel>

      </div>
    </div>
  );
}
