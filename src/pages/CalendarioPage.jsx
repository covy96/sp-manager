import { useEffect, useMemo, useState } from "react";
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";

const MONTHS = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

function getCalendarDays(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((firstWeekday + lastDay.getDate()) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(year, monthIndex, index - firstWeekday + 1);
    return {
      date,
      iso: toISODate(date),
      isCurrentMonth: date.getMonth() === monthIndex,
    };
  });
}

function getTaskColor(task, todayISO) {
  if (task.status === "completed") {
    return "bg-[#636366] text-white/80";
  }
  if (task.data_pianificata < todayISO) {
    return "bg-[#ff453a] text-white";
  }
  return "bg-[#0a84ff] text-white";
}

export default function CalendarioPage() {
  const { studioId } = useStudio();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [tasks, setTasks] = useState([]);
  const [projectsById, setProjectsById] = useState({});
  const [membersById, setMembersById] = useState({});
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const todayISO = toISODate(new Date());

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      const range = getMonthRange(selectedYear, selectedMonth);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) {
        setError(authError?.message || "Utente non autenticato.");
        setLoading(false);
        return;
      }

      let teamMember;
      try {
        teamMember = await getOrCreateTeamMember(authData.user);
      } catch (teamMemberError) {
        setError(teamMemberError.message);
        setLoading(false);
        return;
      }

      const tasksRes = await supabase
        .from("tasks")
        .select("*")
        .eq("studio", studioId)
        .gte("data_pianificata", range.start)
        .lte("data_pianificata", range.end);

      if (tasksRes.error) {
        setError(tasksRes.error.message);
        setLoading(false);
        return;
      }

      const loadedTasks = tasksRes.data ?? [];
      const projectIds = [...new Set(loadedTasks.map((task) => task.project_id).filter(Boolean))];
      const memberIds = [...new Set(loadedTasks.map((task) => task.assigned_member).filter(Boolean))];
      const [projectsRes, membersRes] = await Promise.all([
        projectIds.length > 0
          ? supabase.from("projects").select("id,name").in("id", projectIds)
          : Promise.resolve({ data: [], error: null }),
        memberIds.length > 0
          ? supabase.from("team_members").select("id,user_name,user_email").in("id", memberIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (projectsRes.error || membersRes.error) {
        setError(projectsRes.error?.message || membersRes.error?.message || "Errore caricamento calendario");
        setLoading(false);
        return;
      }

      setTasks(loadedTasks);
      setProjectsById(
        (projectsRes.data ?? []).reduce((acc, project) => {
          acc[project.id] = project.name || "Progetto";
          return acc;
        }, {}),
      );
      setMembersById(
        (membersRes.data ?? []).reduce((acc, member) => {
          acc[member.id] = member.user_name || member.user_email || "Membro";
          return acc;
        }, {}),
      );
      setCurrentMemberId(teamMember.id);
      setSelectedDay(null);
      setLoading(false);
    };

    loadData();
  }, [selectedYear, selectedMonth, studioId]);

  const calendarDays = useMemo(() => getCalendarDays(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  const visibleTasks = useMemo(() => {
    const filtered = onlyMine ? tasks.filter((task) => task.assigned_member === currentMemberId) : tasks;
    return [...filtered].sort((a, b) => {
      if (a.status === b.status) {
        return (a.title || "").localeCompare(b.title || "", "it");
      }
      return a.status === "completed" ? 1 : -1;
    });
  }, [currentMemberId, onlyMine, tasks]);

  const tasksByDay = useMemo(() => {
    return visibleTasks.reduce((acc, task) => {
      if (!task.data_pianificata) {
        return acc;
      }
      if (!acc[task.data_pianificata]) {
        acc[task.data_pianificata] = [];
      }
      acc[task.data_pianificata].push(task);
      return acc;
    }, {});
  }, [visibleTasks]);

  const selectedDayTasks = selectedDay ? tasksByDay[selectedDay] ?? [] : [];

  const changeMonth = (delta) => {
    const next = new Date(selectedYear, selectedMonth + delta, 1);
    setSelectedYear(next.getFullYear());
    setSelectedMonth(next.getMonth());
  };

  const goToday = () => {
    const today = new Date();
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
        Caricamento calendario...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-red-300">
        Errore: {error}
      </section>
    );
  }

  return (
    <div className="space-y-5 bg-[#1c1c1e] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => changeMonth(-1)} className="rounded-md border border-[#48484a] px-3 py-1 text-sm hover:bg-white/10">
            ←
          </button>
          <h2 className="min-w-56 text-center text-xl font-semibold">
            {MONTHS[selectedMonth]} {selectedYear}
          </h2>
          <button type="button" onClick={() => changeMonth(1)} className="rounded-md border border-[#48484a] px-3 py-1 text-sm hover:bg-white/10">
            →
          </button>
          <button type="button" onClick={goToday} className="ml-2 rounded-md bg-[#0a84ff] px-3 py-1 text-sm font-medium text-white hover:brightness-110">
            Oggi
          </button>
        </div>

        <div className="flex rounded-lg border border-[#48484a] bg-[#1c1c1e] p-1 text-sm">
          <button
            type="button"
            onClick={() => setOnlyMine(false)}
            className={`rounded-md px-3 py-1 ${!onlyMine ? "bg-[#0a84ff] text-white" : "text-white/70 hover:text-white"}`}
          >
            Tutti
          </button>
          <button
            type="button"
            onClick={() => setOnlyMine(true)}
            className={`rounded-md px-3 py-1 ${onlyMine ? "bg-[#0a84ff] text-white" : "text-white/70 hover:text-white"}`}
          >
            Solo i miei
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-xl border border-[#48484a] bg-[#2c2c2e]">
          <div className="grid grid-cols-7 border-b border-[#48484a] bg-[#1c1c1e] text-center text-xs font-medium uppercase tracking-wide text-white/60">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-3">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dayTasks = tasksByDay[day.iso] ?? [];
              const visibleDayTasks = dayTasks.slice(0, 2);
              const hiddenCount = Math.max(dayTasks.length - 2, 0);
              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => setSelectedDay(day.iso)}
                  className={`min-h-32 border-b border-r border-[#48484a] p-2 text-left transition hover:bg-white/5 ${
                    day.isCurrentMonth ? "bg-[#2c2c2e]" : "bg-[#242426] text-white/35"
                  } ${day.iso === todayISO ? "ring-1 ring-inset ring-[#0a84ff]" : ""}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{day.date.getDate()}</span>
                  </div>
                  <div className="space-y-1">
                    {visibleDayTasks.map((task) => (
                      <div key={task.id} className={`truncate rounded px-2 py-1 text-xs ${getTaskColor(task, todayISO)}`}>
                        {task.title || "Task senza titolo"}
                      </div>
                    ))}
                    {hiddenCount > 0 ? (
                      <span className="inline-flex rounded bg-white/10 px-2 py-1 text-xs text-white/80">+{hiddenCount} altri</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Task del giorno</h3>
              <p className="text-sm text-white/60">{selectedDay || "Seleziona un giorno"}</p>
            </div>
            {selectedDay ? (
              <button type="button" onClick={() => setSelectedDay(null)} className="rounded-md border border-[#48484a] px-2 py-1 text-xs text-white/70 hover:bg-white/10">
                Chiudi
              </button>
            ) : null}
          </div>

          {selectedDay && selectedDayTasks.length === 0 ? (
            <p className="rounded-lg border border-[#48484a] bg-[#1c1c1e] p-4 text-sm text-white/60">Nessun task pianificato.</p>
          ) : null}

          {!selectedDay ? (
            <p className="rounded-lg border border-[#48484a] bg-[#1c1c1e] p-4 text-sm text-white/60">Clicca su un giorno del calendario per vedere il dettaglio.</p>
          ) : null}

          <div className="space-y-3">
            {selectedDayTasks.map((task) => (
              <article key={task.id} className="rounded-lg border border-[#48484a] bg-[#1c1c1e] p-4">
                <div className="mb-2 flex items-start gap-2">
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getTaskColor(task, todayISO).split(" ")[0]}`} />
                  <h4 className="text-sm font-semibold text-white">{task.title || "Task senza titolo"}</h4>
                </div>
                <div className="space-y-1 text-xs text-white/60">
                  <p>Categoria: <span className="text-white/85">{task.categoria || "Senza categoria"}</span></p>
                  <p>Progetto: <span className="text-white/85">{projectsById[task.project_id] || "Progetto non assegnato"}</span></p>
                  <p>Membro: <span className="text-white/85">{membersById[task.assigned_member] || "Membro non assegnato"}</span></p>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
