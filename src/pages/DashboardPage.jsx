import { useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "../hooks/useStudio";
import { usePermissions } from "../hooks/usePermissions";
import { supabase } from "../lib/supabase";
import { calcolaIncassato, formatOre } from "../lib/utils";

function currency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDateIt(date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export default function DashboardPage() {
  const { user: studioUser, teamMember: studioMember, studioId, loading: studioLoading } = useStudio();
  const permissions = usePermissions();
  const [user, setUser] = useState(null);
  const [teamMember, setTeamMember] = useState(null);
  const [loading, setLoading] = useState(true);

  // Summary data
  const [activeProjects, setActiveProjects] = useState(0);
  const [openTasks, setOpenTasks] = useState(0);
  const [weekHours, setWeekHours] = useState(0);
  const [creditToCollect, setCreditToCollect] = useState(0);

  // Tasks and projects
  const [todayTasks, setTodayTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);

  // Greeting based on hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (studioLoading || !studioId) return;
    const init = async () => {
      setLoading(true);

      const u = studioUser;
      const tm = studioMember;
      setUser(u);
      setTeamMember(tm);

      if (u?.id && studioId) {
        // 1. Active projects count
        const { count: projCount } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("studio", studioId)
          .eq("archived", false);
        setActiveProjects(projCount || 0);

        // 2. Open tasks count (not completed, no parent)
        const { count: taskCount } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("studio", studioId)
          .neq("status", "completed")
          .is("parent_task_id", null);
        setOpenTasks(taskCount || 0);

        // 3. Hours this week
        const monday = getMonday(new Date());
        const mondayStr = monday.toISOString().slice(0, 10);
        if (tm?.id) {
          const { data: times } = await supabase
            .from("timesheet")
            .select("hours")
            .eq("team_member", tm.id)
            .gte("date", mondayStr);
          const sum = (times || []).reduce((s, t) => s + (Number(t.hours) || 0), 0);
          setWeekHours(sum);
        }

        // 4. Credit to collect (commesse total - incassato da proforma pagate)
        const { data: commesse } = await supabase
          .from("commesse")
          .select("id, importo_offerta_base")
          .eq("studio", studioId);
        const totalCommesse = (commesse || []).reduce(
          (s, c) => s + (Number(c.importo_offerta_base) || 0),
          0
        );

        // Calcola incassato reale dalle proforma pagate
        const commessaIds = (commesse || []).map((c) => c.id);
        const incassatoMap = await calcolaIncassato(commessaIds, studioId, supabase);
        const totalIncassato = Object.values(incassatoMap).reduce((s, v) => s + v, 0);

        setCreditToCollect(totalCommesse - totalIncassato);

        // 5. Today's tasks for this user
        const today = new Date().toISOString().split("T")[0];
        if (tm?.id) {
          const { data: allTasks } = await supabase
            .from("tasks")
            .select("*, projects(name)")
            .eq("studio", studioId)
            .eq("assigned_member", tm.id);
          const todayFiltered = (allTasks || []).filter(
            (t) => String(t.data_pianificata).slice(0, 10) === today,
          );
          setTodayTasks(todayFiltered);

          // 5b. Overdue tasks (not completed, past date, parent tasks only)
          const { data: overdue } = await supabase
            .from("tasks")
            .select("*, projects(name)")
            .eq("assigned_member", tm.id)
            .eq("studio", studioId)
            .neq("status", "completed")
            .lt("data_pianificata", today)
            .is("parent_task_id", null)
            .order("data_pianificata", { ascending: true });
          setOverdueTasks(overdue || []);
        }

        // 6. Recent projects (last 5, not archived)
        const { data: projs } = await supabase
          .from("projects")
          .select("id, name, client, created_at, updated_at")
          .eq("studio", studioId)
          .eq("archived", false)
          .order("updated_at", { ascending: false })
          .limit(5);

        // Get task counts for each project
        const projectsWithProgress = await Promise.all(
          (projs || []).map(async (p) => {
            const [{ count: total }, { count: completed }] = await Promise.all([
              supabase
                .from("tasks")
                .select("*", { count: "exact", head: true })
                .eq("project_id", p.id)
                .is("parent_task_id", null),
              supabase
                .from("tasks")
                .select("*", { count: "exact", head: true })
                .eq("project_id", p.id)
                .eq("status", "completed")
                .is("parent_task_id", null),
            ]);
            const tot = total || 0;
            const comp = completed || 0;
            return {
              ...p,
              totalTasks: tot,
              completedTasks: comp,
              progress: tot > 0 ? Math.round((comp / tot) * 100) : 0,
            };
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
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);
    if (!error) {
      setTodayTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
      // Also update overdue tasks list if task is there
      setOverdueTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)).filter((t) => t.status !== "completed")
      );
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-white/60">
        Caricamento dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white">
          {greeting}{teamMember?.user_name ? ` ${teamMember.user_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-white/50">{formatDateIt(new Date())}</p>
      </div>

      {/* Summary Cards - 4 columns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Progetti Attivi</p>
          <p className="mt-2 text-3xl font-bold text-white">{activeProjects}</p>
          <p className="mt-1 text-xs text-white/40">in corso</p>
        </div>

        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Task da Completare</p>
          <p className="mt-2 text-3xl font-bold text-[#ff453a]">{openTasks}</p>
          <p className="mt-1 text-xs text-white/40">aperti</p>
        </div>

        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Ore Questa Settimana</p>
          <p className="mt-2 text-3xl font-bold text-[#0a84ff]">{formatOre(weekHours)} h</p>
          <p className="mt-1 text-xs text-white/40">dall&apos;inizio settimana</p>
        </div>

        {permissions.canViewFinancials && (
          <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wide">Credito da Incassare</p>
            <p className="mt-2 text-3xl font-bold text-[#30d158]">{currency(creditToCollect)}</p>
            <p className="mt-1 text-xs text-white/40">da commesse - proforma pagate</p>
          </div>
        )}
      </div>

      {/* Two Columns */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Left - Today's Tasks */}
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
          <h3 className="mb-4 text-base font-semibold text-white">I miei task di oggi</h3>
          {todayTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">Nessun task per oggi</p>
          ) : (
            <ul className="space-y-2">
              {todayTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2.5"
                >
                  <button
                    onClick={() => toggleTaskStatus(task)}
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                      task.status === "completed"
                        ? "border-[#30d158] bg-[#30d158]"
                        : "border-[#48484a] hover:border-[#0a84ff]"
                    }`}
                  >
                    {task.status === "completed" && (
                      <svg className="h-3 w-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        task.status === "completed" ? "text-white/40 line-through" : "text-white"
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="truncate text-xs text-white/50">
                      {task.projects?.name} · {task.category || "Generale"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Task scadute */}
          {overdueTasks.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#ff453a]">
                Task scadute
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff453a] text-xs font-bold text-white">
                  {overdueTasks.length}
                </span>
              </h4>
              <ul className="space-y-2">
                {overdueTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg border border-[#ff453a]/50 bg-[#1c1c1e] px-3 py-2.5"
                  >
                    <button
                      onClick={() => toggleTaskStatus(task)}
                      className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#ff453a] hover:bg-[#ff453a]/20"
                      title="Completa task"
                    >
                      <span className="h-2 w-2 rounded-full bg-[#ff453a]" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{task.title}</p>
                      <p className="truncate text-xs text-white/50">
                        {task.projects?.name} · {task.category || "Generale"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[#ff453a]">
                      {new Date(task.data_pianificata).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right - Recent Projects */}
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
          <h3 className="mb-4 text-base font-semibold text-white">Progetti recenti</h3>
          {recentProjects.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">Nessun progetto</p>
          ) : (
            <ul className="space-y-3">
              {recentProjects.map((proj) => (
                <li key={proj.id} className="rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{proj.name}</p>
                      <p className="truncate text-xs text-white/50">{proj.client || "—"}</p>
                    </div>
                    <span className="ml-3 text-xs font-medium text-white/60">{proj.progress}%</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#48484a]">
                    <div
                      className="h-1.5 rounded-full bg-[#0a84ff] transition-all"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-white/40">
                    {proj.completedTasks}/{proj.totalTasks} task completati
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
}

