import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";

function nextWorkingDay() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() + 2);
  if (day === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

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

  // Tasks
  const [todayTasks, setTodayTasks] = useState([]);
  const [tomorrowTasks, setTomorrowTasks] = useState([]);

  // Greeting based on hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Early return if loading or missing essential data
  if (studioLoading || !studioMember || !studioId) {
    return (
      <div className="flex h-64 items-center justify-center text-white/60">
        Caricamento...
      </div>
    );
  }

  useEffect(() => {
    if (studioLoading || !studioId || !studioMember?.id) return;
    const init = async () => {
      setLoading(true);

      const u = studioUser;
      const tm = studioMember;
      setUser(u);
      setTeamMember(tm);

      if (u?.id && studioId && tm?.id) {
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

        // 4. Credit to collect (commesse total - pagamenti total)
        const [{ data: commesse }, { data: pagamenti }] = await Promise.all([
          supabase.from("commesse").select("importo_offerta_base").eq("studio", studioId),
          supabase.from("pagamenti").select("importo"),
        ]);
        const totalCommesse = (commesse || []).reduce(
          (s, c) => s + (Number(c.importo_offerta_base) || 0),
          0
        );
        const totalPagamenti = (pagamenti || []).reduce(
          (s, p) => s + (Number(p.importo) || 0),
          0
        );
        setCreditToCollect(totalCommesse - totalPagamenti);

        // 5. Today's tasks for this user
        const today = new Date().toISOString().split("T")[0];
        const { data: allTasks } = await supabase
          .from("tasks")
          .select("*, projects(name)")
          .eq("studio", studioId)
          .eq("assigned_member", tm.id);
        const todayFiltered = (allTasks || []).filter(
          (t) => String(t.data_pianificata).slice(0, 10) === today,
        );
        setTodayTasks(todayFiltered);

        // 6. Tomorrow's tasks (next working day) for this user
        const nwd = nextWorkingDay();
        const { data: tomorrowData } = await supabase
          .from("tasks")
          .select("*, projects(name)")
          .eq("assigned_member", tm.id)
          .eq("data_pianificata", nwd)
          .neq("status", "completed");
        setTomorrowTasks(tomorrowData || []);
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
          {greeting} {user?.email ? user.email.split("@")[0] : ""}
        </h1>
        <p className="mt-1 text-sm text-white/50">{formatDateIt(new Date())}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">Progetti Attivi</p>
          <p className="mt-2 text-3xl font-bold text-white">{activeProjects}</p>
          <p className="mt-1 text-xs text-white/40">in corso</p>
        </div>

        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">Task da Completare</p>
          <p className="mt-2 text-3xl font-bold text-[#ff453a]">{openTasks}</p>
          <p className="mt-1 text-xs text-white/40">aperti</p>
        </div>

        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-white/50">Ore Questa Settimana</p>
          <p className="mt-2 text-3xl font-bold text-[#0a84ff]">{weekHours}h</p>
          <p className="mt-1 text-xs text-white/40">dall&apos;inizio settimana</p>
        </div>

        {permissions.canViewFinancials && (
          <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-white/50">Credito da Incassare</p>
            <p className="mt-2 text-3xl font-bold text-[#30d158]">{currency(creditToCollect)}</p>
            <p className="mt-1 text-xs text-white/40">da commesse - pagamenti</p>
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
        </div>

        {/* Right - Tomorrow's tasks */}
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
          <h3 className="mb-4 text-base font-semibold text-white">
            {new Date().getDay() === 5 ? "Task di lunedì" : "Task di domani"}
          </h3>
          {tomorrowTasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">
              {new Date().getDay() === 5 ? "Nessun task pianificato per lunedì" : "Nessun task pianificato per domani"}
            </p>
          ) : (
            <ul className="space-y-2">
              {tomorrowTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2.5"
                >
                  <button
                    onClick={() => toggleTaskStatus(task)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      task.status === "completed"
                        ? "border-[#30d158] bg-[#30d158]"
                        : "border-[#48484a] hover:border-[#0a84ff]"
                    }`}
                  >
                    {task.status === "completed" && (
                      <svg className="h-3 w-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{task.title}</p>
                    <p className="truncate text-xs text-white/50">
                      {task.projects?.name ?? "—"}{task.categoria ? ` · ${task.categoria}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

