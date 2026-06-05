import { useEffect, useMemo, useState } from "react";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";

// ── BRAND TOKENS ─────────────────────────────────────────────────
const T = {
  ink: '#0E0E0D', navy: '#13315C', brass: '#D9C98A',
  paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33',
  red: '#b91c1c', green: '#1a6b3c',
};

function toDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isOverdue(dateValue) {
  const planned = toDateOnly(dateValue);
  if (!planned) return false;
  return planned < toDateOnly(new Date().toISOString());
}

function Panel({ children, style = {} }) {
  return <div style={{ background: '#fff', border: `1px solid ${T.ink10}`, padding: '18px 20px', borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)', ...style }}>{children}</div>;
}

function TaskRow({ task, projectName, onToggle, updating, done }) {
  const [hover, setHover] = useState(false);
  const overdue = !done && isOverdue(task.data_pianificata);

  return (
    <button
      type="button"
      onClick={() => onToggle(task, done)}
      disabled={updating}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '9px 12px', textAlign: 'left',
        background: hover ? T.paper : 'transparent',
        border: `1px solid ${hover ? T.ink20 : T.ink10}`,
        cursor: updating ? 'not-allowed' : 'pointer',
        opacity: updating ? 0.5 : 1, transition: 'all 0.1s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {/* Checkbox circle */}
        <span style={{
          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
          border: `1px solid ${done ? T.navy : overdue ? T.red : T.ink20}`, borderRadius: T.radiusSm,
          background: done ? T.navy : 'transparent',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {done && (
            <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
              <path d="M1 3L3 5L7 1" stroke="#EEF1F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: done ? T.muted : T.ink,
            textDecoration: done ? 'line-through' : 'none',
            fontFamily: "'Space Grotesk', sans-serif",
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{task.title || "Task senza titolo"}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 2 }}>
            {done ? `${projectName} · ${task.categoria || 'Senza categoria'}` : (task.categoria || 'Senza categoria')}
          </div>
        </div>
      </div>
      <div style={{ flexShrink: 0, marginLeft: 12 }}>
        {done ? (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.green }}>Completato</span>
        ) : (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: overdue ? T.red : T.muted }}>
            {task.data_pianificata || '—'}
          </span>
        )}
      </div>
    </button>
  );
}

export default function MyTasksPage() {
  const { studioId } = useStudio();
  usePageTitleOnMount("Le mie task");

  const [activeTasks, setActiveTasks]       = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [projectsById, setProjectsById]     = useState({});
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const loadData = async () => {
    setLoading(true); setError("");
    const today = new Date().toISOString().slice(0, 10);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) { setError(authError.message); setLoading(false); return; }
    const user = authData?.user;
    if (!user?.id) { setError("Utente non autenticato."); setLoading(false); return; }

    let teamMember;
    try { teamMember = await getOrCreateTeamMember(user); }
    catch (e) { setError(e.message); setLoading(false); return; }

    const { data: tasks, error: tErr } = await supabase
      .from("tasks").select("*").eq("studio", studioId).eq("assigned_member", teamMember.id);
    if (tErr) { setError(tErr.message || "Errore caricamento task"); setLoading(false); return; }

    const combined = tasks ?? [];
    const active = combined
      .filter(t => t.status !== "completed")
      .sort((a, b) => {
        if (!a.data_pianificata && !b.data_pianificata) return 0;
        if (!a.data_pianificata) return 1;
        if (!b.data_pianificata) return -1;
        return new Date(a.data_pianificata) - new Date(b.data_pianificata);
      });
    const done = combined
      .filter(t => t.status === "completed" && t.updated_at >= `${today}T00:00:00` && t.updated_at <= `${today}T23:59:59`)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    const pIds = [...new Set(combined.map(t => t.project_id).filter(Boolean))];
    let pMap = {};
    if (pIds.length > 0) {
      const { data: projs } = await supabase.from("projects").select("id,name").in("id", pIds);
      pMap = (projs ?? []).reduce((acc, p) => { acc[p.id] = p.name || "Progetto"; return acc; }, {});
    }

    setProjectsById(pMap);
    setActiveTasks(active);
    setCompletedToday(done);
    setLoading(false);
  };

  useEffect(() => { if (studioId) loadData(); }, [studioId]);

  const groupedActive = useMemo(() => activeTasks.reduce((acc, t) => {
    const key = t.project_id || "senza-progetto";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {}), [activeTasks]);

  const toggleTask = async (task, fromDone = false) => {
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    setUpdatingTaskId(task.id);
    if (fromDone) {
      setCompletedToday(p => p.filter(i => i.id !== task.id));
      if (nextStatus !== "completed") setActiveTasks(p => [{ ...task, status: nextStatus }, ...p]);
    } else {
      setActiveTasks(p => p.filter(i => i.id !== task.id));
      if (nextStatus === "completed") setCompletedToday(p => [{ ...task, status: "completed" }, ...p]);
    }
    const { error: uErr } = await supabase.from("tasks").update({ status: nextStatus }).eq("id", task.id);
    if (uErr) { await loadData(); setError(uErr.message); }
    else setError("");
    setUpdatingTaskId(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
      Caricamento task...
    </div>
  );

  if (error) return (
    <div style={{ border: `1px solid ${T.ink10}`, borderRadius: T.radiusSm, background: '#fff', padding: 32, color: T.red, fontSize: 13 }}>{error}</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Task attivi per progetto */}
      {Object.keys(groupedActive).length === 0 ? (
        <Panel>
          <div style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, padding: '24px 0' }}>
            Nessun task attivo assegnato.
          </div>
        </Panel>
      ) : (
        Object.entries(groupedActive).map(([projectId, tasks]) => (
          <Panel key={projectId}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: T.muted, marginBottom: 12 }}>
              {projectsById[projectId] || "Progetto non assegnato"}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tasks.map(task => (
                <TaskRow
                  key={task.id} task={task}
                  projectName={projectsById[task.project_id] || "—"}
                  onToggle={toggleTask}
                  updating={updatingTaskId === task.id}
                  done={false}
                />
              ))}
            </div>
          </Panel>
        ))
      )}

      {/* Task completati oggi */}
      <Panel>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: T.green, marginBottom: 12 }}>
          Task completati oggi
        </div>
        {completedToday.length === 0 ? (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, padding: '12px 0' }}>
            Nessun task completato oggi.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {completedToday.map(task => (
              <TaskRow
                key={task.id} task={task}
                projectName={projectsById[task.project_id] || "—"}
                onToggle={toggleTask}
                updating={updatingTaskId === task.id}
                done={true}
              />
            ))}
          </div>
        )}
      </Panel>

    </div>
  );
}
