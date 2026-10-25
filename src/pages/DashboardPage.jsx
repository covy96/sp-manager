import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useTheme } from '../contexts/ThemeContext';
import { useStudio } from "../hooks/useStudio";
import { usePermissions } from "../hooks/usePermissions";
import { useIsMobile } from "../hooks/useIsMobile";
import { supabase } from "../lib/supabase";
import { calcolaIncassato, formatOre } from "../lib/utils";
import SlidingTabs from "../components/SlidingTabs";

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

// Restituisce il prossimo giorno lavorativo:
// venerdì/sabato/domenica → lunedì prossimo, altrimenti domani
function getNextWorkday() {
  const today = new Date();
  const day = today.getDay(); // 0=dom, 1=lun...5=ven, 6=sab
  let daysToAdd = 1;
  if (day === 5) daysToAdd = 3; // ven → lun
  if (day === 6) daysToAdd = 2; // sab → lun
  if (day === 0) daysToAdd = 1; // dom → lun
  const next = new Date(today);
  next.setDate(today.getDate() + daysToAdd);
  return next;
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────

// Icone stile lucide (tratto 2px), inline per non aggiungere dipendenze
const ICONS = {
  folder: <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  check: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  euro: <><path d="M4 10h12" /><path d="M4 14h9" /><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></>,
  arrow: <path d="M5 12h14M12 5l7 7-7 7" />,
};

function Icon({ name, size = 16, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function IconChip({ name, color }) {
  return (
    <span className="glass-chip" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
      <Icon name={name} size={16} />
    </span>
  );
}

// Anello di avanzamento (come le card obiettivo dello stile "glassy")
function Ring({ value, size = 56, stroke = 5, color = "var(--glass-accent)" }) {
  const { T } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.borderMd} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s var(--ease-spring)' }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size < 50 ? 10 : 12, fontWeight: 600, color: T.ink, fontFamily: "var(--font-ui)",
      }}>{pct}%</div>
    </div>
  );
}

function KpiCard({ label, value, note, valueColor, isMobile, onClick, icon, accent, ring }) {
  const { T } = useTheme();
  const clickable = typeof onClick === "function";
  return (
    <div
      className={`glass-card${clickable ? ' glass-lift' : ''}`}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      style={{
        padding: isMobile ? '14px 14px' : '20px 22px',
        minWidth: 0,
        cursor: clickable ? 'pointer' : 'default',
        display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {icon && <IconChip name={icon} color={accent || T.navy} />}
        {ring != null && !isMobile
          ? <Ring value={ring} size={44} stroke={4} />
          : clickable && <span style={{ color: T.muted, opacity: 0.7 }}><Icon name="arrow" size={14} /></span>}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: isMobile ? 12 : 13, color: T.muted, marginBottom: 6,
          fontFamily: "var(--font-ui)",
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{label}</div>
        <div style={{
          fontSize: isMobile ? 22 : 30, fontWeight: 700,
          letterSpacing: '-0.03em', lineHeight: 1,
          color: valueColor || T.ink,
          fontFamily: "var(--font-ui)",
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{value}</div>
        <div style={{
          fontFamily: "var(--font-label)",
          fontSize: 10, color: T.muted, marginTop: 8,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{note}</div>
      </div>
    </div>
  );
}

function Panel({ title, icon, accent, count, children, isMobile }) {
  const { T } = useTheme();
  return (
    <div className="glass-card" style={{ padding: isMobile ? '16px 16px' : '22px 24px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        {icon && <IconChip name={icon} color={accent || T.navy} />}
        <div style={{
          flex: 1, minWidth: 0,
          fontSize: isMobile ? 14 : 15, fontWeight: 600,
          letterSpacing: '-0.01em', color: T.ink,
          fontFamily: "var(--font-ui)",
        }}>{title}</div>
        {count > 0 && (
          <span style={{
            fontFamily: "var(--font-label)", fontSize: 10, color: T.muted,
            background: 'var(--glass-bg)', border: '1px solid var(--glass-edge)',
            borderRadius: 99, padding: '3px 9px',
          }}>{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ label }) {
  const { T } = useTheme();
  return (
    <div style={{
      padding: '40px 0', textAlign: 'center',
      fontFamily: "var(--font-label)",
      fontSize: 11, color: T.muted, letterSpacing: '0.05em',
    }}>{label}</div>
  );
}

function TaskRow({ task, onToggle, overdue }) {
  const { T } = useTheme();
  const done = task.status === 'completed';
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 0',
      }}
      className="glass-row"
    >
      {/* Toggle button */}
      <button
        onClick={() => onToggle(task)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
          border: `1px solid ${done ? T.navy : overdue ? T.red : hover ? T.navy : T.borderMd}`,
          background: done ? T.navy : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
        }}
      >
        {done && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke={T.bg} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
          fontFamily: "var(--font-ui)",
        }}>{task.title}</div>
        <div style={{
          fontFamily: "var(--font-label)",
          fontSize: 10, color: T.muted, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {task.projects?.name}{task.category ? ` · ${task.category}` : ''}
        </div>
      </div>

      {/* Date (overdue only) */}
      {overdue && (
        <span style={{
          fontFamily: "var(--font-label)",
          fontSize: 10, color: T.red, flexShrink: 0,
        }}>
          {new Date(task.data_pianificata).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
        </span>
      )}
    </div>
  );
}

function ProjectRow({ proj }) {
  const { T } = useTheme();
  return (
    <div style={{ padding: '10px 0', borderBottom: `0.5px solid ${T.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: T.ink,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          fontFamily: "var(--font-ui)",
        }}>{proj.name}</div>
        <span style={{
          fontFamily: "var(--font-label)",
          fontSize: 10, color: T.muted, marginLeft: 12, flexShrink: 0,
        }}>{proj.progress}%</span>
      </div>
      <div style={{
        fontFamily: "var(--font-label)",
        fontSize: 10, color: T.muted, marginBottom: 6,
      }}>{proj.client || '—'}</div>
      {/* Progress bar */}
      <div style={{ height: 2, background: T.border, width: '100%' }}>
        <div style={{ height: 2, background: T.navy, width: `${proj.progress}%`, transition: 'width 0.3s' }} />
      </div>
      <div style={{
        fontFamily: "var(--font-label)",
        fontSize: 10, color: T.muted, marginTop: 4,
      }}>{proj.completedTasks}/{proj.totalTasks} task completati</div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
export default function DashboardPage() {
  const { T } = useTheme();
  usePageTitleOnMount("Dashboard");
  const navigate = useNavigate();
  const { user: studioUser, teamMember: studioMember, studioId, loading: studioLoading } = useStudio();
  const permissions = usePermissions();
  const isMobile = useIsMobile();

  const [user, setUser]               = useState(null);
  const [teamMember, setTeamMember]   = useState(null);
  const [loading, setLoading]         = useState(true);

  // "mine" = solo l'utente corrente, "all" = tutto lo studio (solo owner)
  const [scope, setScope] = useState("mine");

  const [activeProjects, setActiveProjects]   = useState(0);
  const [openTasks, setOpenTasks]             = useState(0);
  const [weekHours, setWeekHours]             = useState(0);
  const [creditToCollect, setCreditToCollect] = useState(0);
  const [incassatoPct, setIncassatoPct]       = useState(null);

  const [todayTasks, setTodayTasks]       = useState([]);
  const [overdueTasks, setOverdueTasks]   = useState([]);
  const [tomorrowTasks, setTomorrowTasks] = useState([]);
  const [scadenzePratiche, setScadenzePratiche] = useState([]);

  const greeting    = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Buongiorno";
    if (h < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);
  const todayStr    = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const nextWorkday      = useMemo(() => getNextWorkday(), [todayStr]);
  const isWeekend        = useMemo(() => { const d = new Date().getDay(); return d === 5 || d === 6 || d === 0; }, [todayStr]);
  const nextWorkdayLabel = useMemo(() => {
    if (isWeekend) return "Lunedì";
    return nextWorkday.toLocaleDateString("it-IT", { weekday: "long" });
  }, [isWeekend, nextWorkday]);

  useEffect(() => {
    if (studioLoading || !studioId) return;
    const init = async () => {
      setLoading(true);
      setUser(studioUser);
      setTeamMember(studioMember);

      if (studioUser?.id && studioId) {
        const memberId = studioMember?.id;
        const isAll = scope === "all";

        // Le query sono indipendenti: partono tutte insieme invece che una
        // dopo l'altra (prima erano ~10 round-trip in fila prima di mostrare la pagina).
        const today = new Date().toISOString().split("T")[0];
        await Promise.all([
          // 1. Progetti attivi — filtrati per utente se scope=mine
          (async () => {
            let projQ = supabase.from("projects").select("*", { count: "exact", head: true })
              .eq("studio", studioId).eq("archived", false);
            if (!isAll && memberId) projQ = projQ.contains("assigned_users", [memberId]);
            const { count: projCount } = await projQ;
            setActiveProjects(projCount || 0);
          })(),

          // 2. Task aperti — filtrati per utente se scope=mine
          (async () => {
            let taskQ = supabase.from("tasks").select("*", { count: "exact", head: true })
              .eq("studio", studioId).neq("status", "completed").is("parent_task_id", null).is("deleted_at", null);
            if (!isAll && memberId) taskQ = taskQ.eq("assigned_member", memberId);
            const { count: taskCount } = await taskQ;
            setOpenTasks(taskCount || 0);
          })(),

          // 3. Ore settimana (sempre personali)
          (async () => {
            if (!memberId) return;
            const mondayStr = getMonday(new Date()).toISOString().slice(0, 10);
            const { data: times } = await supabase
              .from("timesheet").select("hours")
              .eq("team_member", memberId).is("deleted_at", null).gte("date", mondayStr);
            setWeekHours((times || []).reduce((s, t) => s + (Number(t.hours) || 0), 0));
          })(),

          // 4. Credito da incassare (sempre tutto lo studio)
          (async () => {
            const { data: commesse } = await supabase
              .from("commesse").select("id, importo_offerta_base").eq("studio", studioId).is("deleted_at", null);
            const totalCommesse = (commesse || []).reduce((s, c) => s + (Number(c.importo_offerta_base) || 0), 0);
            const commessaIds = (commesse || []).map(c => c.id);
            const incassatoMap = await calcolaIncassato(commessaIds, studioId, supabase);
            const totalIncassato = Object.values(incassatoMap).reduce((s, v) => s + v, 0);
            setCreditToCollect(totalCommesse - totalIncassato);
            setIncassatoPct(totalCommesse > 0 ? (totalIncassato / totalCommesse) * 100 : null);
          })(),

          // 5. Task di oggi (sempre personali)
          (async () => {
            if (!memberId) return;
            const { data: allTodayTasks } = await supabase
              .from("tasks").select("*, projects(name)")
              .eq("studio", studioId).eq("assigned_member", memberId)
              .eq("data_pianificata", today)
              .neq("status", "completed")
              .is("parent_task_id", null).is("deleted_at", null)
              .order("created_at", { ascending: true });
            setTodayTasks(allTodayTasks || []);
          })(),

          // 5b. Task scadute (sempre personali)
          (async () => {
            if (!memberId) return;
            const { data: overdue } = await supabase
              .from("tasks").select("*, projects(name)")
              .eq("assigned_member", memberId).eq("studio", studioId)
              .neq("status", "completed").lt("data_pianificata", today)
              .is("parent_task_id", null).is("deleted_at", null).order("data_pianificata", { ascending: true });
            setOverdueTasks(overdue || []);
          })(),

          // 6b. Scadenze pratiche — prossimi 30 giorni
          // Carica pratiche con scadenza manuale impostata dall'utente (campo scadenza nel JSON note)
          (async () => {
            const { data: pratiche } = await supabase
              .from("pratiche_edilizie")
              .select("id, tipo_pratica, protocollo, note, project_id, projects(name)")
              .eq("studio", studioId)
              .not("note", "is", null);

            const parseNoteLocal = (raw) => {
              if (!raw) return null;
              try { const p = JSON.parse(raw); return p?.scadenza || null; } catch { return null; }
            };

            const cutoff14 = new Date(); cutoff14.setDate(cutoff14.getDate() - 14);
            const cutoff14Str = cutoff14.toISOString().slice(0,10);

            const eventi = [];
            for (const p of (pratiche || [])) {
              const scadenza = parseNoteLocal(p.note);
              if (!scadenza?.data) continue;
              if (scadenza.data < cutoff14Str) continue; // più vecchia di 14gg: ignora
              eventi.push({
                ...p,
                eventLabel: scadenza.label || `Scadenza ${p.tipo_pratica}`,
                eventDate: scadenza.data,
                expired: scadenza.data < today,
              });
            }
            eventi.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
            setScadenzePratiche(eventi);
          })(),

          // 6. Task di domani (o lunedì se weekend) — sempre personali
          (async () => {
            if (!memberId) return;
            const nwDay = getNextWorkday().toISOString().slice(0, 10);
            const { data: tmTasks } = await supabase
              .from("tasks").select("*, projects(name)")
              .eq("studio", studioId).eq("assigned_member", memberId)
              .eq("data_pianificata", nwDay)
              .neq("status", "completed")
              .is("parent_task_id", null).is("deleted_at", null)
              .order("created_at", { ascending: true });
            setTomorrowTasks(tmTasks || []);
          })(),
        ]);
      }
      setLoading(false);
    };
    init();
  }, [todayStr, studioId, studioLoading, studioUser, studioMember, scope]);

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === "completed" ? "open" : "completed";
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id);
    if (!error) {
      // Completando o riaprendo un task padre, propaga lo stato alle subtask
      await supabase.from("tasks").update({ status: newStatus === "completed" ? "completed" : "todo" }).eq("parent_task_id", task.id);
      setTodayTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      setOverdueTasks(prev =>
        prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t)
            .filter(t => t.status !== "completed")
      );
      setTomorrowTasks(prev => prev.filter(t => t.id !== task.id));
    }
  };

  if (loading) {
    return (
      <div className="glass-dash" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "var(--font-label)",
        fontSize: 11, color: T.muted, letterSpacing: '0.1em',
      }}>
        Caricamento dashboard...
      </div>
    );
  }

  return (
    <div className="glass-dash" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 18 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{
            fontSize: isMobile ? 22 : 26, fontWeight: 700, letterSpacing: '-0.025em',
            color: T.ink, fontFamily: "var(--font-ui)", marginBottom: 4,
          }}>
            {greeting}{teamMember?.user_name ? `, ${teamMember.user_name.trim().split(/\s+/)[0]}` : ""}
          </h1>
          <p style={{
            fontFamily: "var(--font-label)",
            fontSize: 10, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {formatDateIt(new Date())}
          </p>
        </div>

        {/* Toggle scope — solo per owner con team */}
        {permissions.isOwner && (
          <SlidingTabs
            tabs={[{ key: "mine", label: "Solo miei" }, { key: "all", label: "Tutto lo studio" }]}
            active={scope}
            onChange={setScope}
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
          />
        )}
      </div>

      {/* KPI Cards */}
      <div className="glass-stagger" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 12 : 18 }}>
        <KpiCard isMobile={isMobile} onClick={() => navigate("/progetti")}
          label={scope === "all" ? "Progetti attivi studio" : "Miei progetti attivi"}
          value={activeProjects} note="in corso" valueColor={T.ink}
          icon="folder" accent={T.navy} />
        <KpiCard isMobile={isMobile} onClick={() => navigate("/timesheet")}
          label="Ore questa settimana"
          value={`${formatOre(weekHours)} h`} note="dall'inizio settimana" valueColor={T.ink}
          icon="clock" accent="#F2762E" />
        <KpiCard isMobile={isMobile} onClick={() => navigate("/scrivania")}
          label={scope === "all" ? "Task da completare studio" : "Miei task aperti"}
          value={openTasks} note="aperti" valueColor={T.red}
          icon="check" accent={T.red} />
        {permissions.canViewFinancials && (
          <KpiCard isMobile={isMobile} onClick={() => navigate("/proforma")}
            label="Credito da incassare"
            value={currency(creditToCollect)}
            note={incassatoPct != null ? `incassato ${Math.round(incassatoPct)}% delle commesse` : "da commesse - proforma"}
            valueColor={T.green} icon="euro" accent={T.green} ring={incassatoPct} />
        )}
      </div>

      {/* Two columns */}
      <div className="glass-stagger" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 18 }}>

        {/* Task di oggi */}
        <Panel title="I miei task di oggi" icon="sun" accent="#F2762E" count={todayTasks.length} isMobile={isMobile}>
          {todayTasks.length === 0
            ? <EmptyState label="Nessun task per oggi" />
            : todayTasks.map(task => (
                <TaskRow key={task.id} task={task} onToggle={toggleTaskStatus} overdue={false} />
              ))
          }

          {/* Task scadute */}
          {overdueTasks.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `0.5px solid ${T.border}` }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                fontFamily: "var(--font-label)",
                fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.red,
              }}>
                Task scadute
                <span style={{
                  background: T.red, color: T.surface, borderRadius: '50%',
                  width: 16, height: 16, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600,
                }}>{overdueTasks.length}</span>
              </div>
              {overdueTasks.map(task => (
                <TaskRow key={task.id} task={task} onToggle={toggleTaskStatus} overdue={true} />
              ))}
            </div>
          )}
        </Panel>

        {/* Task di domani / lunedì */}
        <Panel title={`Le mie task di ${nextWorkdayLabel}`} icon="calendar" accent={T.navy} count={tomorrowTasks.length} isMobile={isMobile}>
          {tomorrowTasks.length === 0 ? (
            <EmptyState label={`Nessuna task pianificata per ${nextWorkdayLabel.toLowerCase()}`} />
          ) : (
            tomorrowTasks.map(task => (
              <TaskRow key={task.id} task={task} onToggle={toggleTaskStatus} overdue={false} />
            ))
          )}
        </Panel>

      </div>

      {/* Scadenze pratiche */}
      <Panel title="Scadenzario pratiche" icon="calendar" accent="#b45309" count={scadenzePratiche.length} isMobile={isMobile}>
        {scadenzePratiche.length === 0 ? (
          <EmptyState label="Nessuna scadenza impostata" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {scadenzePratiche.map((ev) => {
              const daysLeft = Math.round((new Date(ev.eventDate) - new Date(todayStr)) / 86400000);
              const expired  = ev.expired;
              const urgent   = !expired && daysLeft <= 7;
              const warning  = !expired && daysLeft <= 14 && !urgent;
              const color    = expired ? T.red : urgent ? T.red : warning ? '#b45309' : T.muted;
              return (
                <div key={`${ev.id}-${ev.eventLabel}`} className="glass-row"
                  onClick={() => ev.project_id && navigate(`/progetti/${ev.project_id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    cursor: ev.project_id ? 'pointer' : 'default',
                    opacity: expired ? 0.75 : 1,
                  }}>
                  {/* Pallino urgenza */}
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: expired ? T.red : urgent ? T.red : warning ? '#b45309' : T.borderMd,
                  }} />
                  {/* Tipo pratica + progetto */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: expired ? T.red : T.ink,
                      fontFamily: "var(--font-ui)",
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {ev.tipo_pratica}
                      {ev.protocollo && <span style={{ fontWeight: 400, color: T.muted }}> · {ev.protocollo}</span>}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-label)",
                      fontSize: 10, color: T.muted, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {ev.projects?.name || '—'} · {ev.eventLabel}
                    </div>
                  </div>
                  {/* Data + stato */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-label)", fontSize: 10, color }}>
                      {new Date(ev.eventDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                    </div>
                    <div style={{ fontFamily: "var(--font-label)", fontSize: 10, color, marginTop: 1 }}>
                      {expired ? 'SCADUTA' : daysLeft === 0 ? 'oggi' : `tra ${daysLeft}gg`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

    </div>
  );
}
