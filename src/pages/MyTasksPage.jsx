import { useEffect, useMemo, useState } from "react";
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";

function toDateOnly(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isOverdue(dateValue) {
  const planned = toDateOnly(dateValue);
  if (!planned) {
    return false;
  }
  const today = toDateOnly(new Date().toISOString());
  return planned < today;
}

export default function MyTasksPage() {
  const { studioId } = useStudio();
  const [activeTasks, setActiveTasks] = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [projectsById, setProjectsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    const today = new Date().toISOString().slice(0, 10);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const user = authData?.user;
    if (!user?.id) {
      setError("Utente non autenticato.");
      setLoading(false);
      return;
    }

    let teamMember;
    try {
      teamMember = await getOrCreateTeamMember(user);
    } catch (teamMemberError) {
      setError(teamMemberError.message);
      setLoading(false);
      return;
    }

    const teamMemberId = teamMember.id;
    const tasksRes = await supabase.from("tasks").select("*").eq("studio", studioId).eq("assigned_member", teamMemberId);

    if (tasksRes.error) {
      setError(tasksRes.error.message || "Errore caricamento task");
      setLoading(false);
      return;
    }

    const combined = tasksRes.data ?? [];
    const activeTasksData = combined
      .filter((task) => task.status !== "completed")
      .sort((a, b) => {
        if (!a.data_pianificata && !b.data_pianificata) {
          return 0;
        }
        if (!a.data_pianificata) {
          return 1;
        }
        if (!b.data_pianificata) {
          return -1;
        }
        return new Date(a.data_pianificata) - new Date(b.data_pianificata);
      });
    const completedTodayData = combined
      .filter(
        (task) =>
          task.status === "completed" &&
          task.updated_at >= `${today}T00:00:00` &&
          task.updated_at <= `${today}T23:59:59`,
      )
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const projectIds = [...new Set(combined.map((t) => t.project_id).filter(Boolean))];

    let projectsMap = {};
    if (projectIds.length > 0) {
      const projectsRes = await supabase.from("projects").select("id,name").in("id", projectIds);
      if (!projectsRes.error) {
        projectsMap = (projectsRes.data ?? []).reduce((acc, project) => {
          acc[project.id] = project.name || "Progetto";
          return acc;
        }, {});
      }
    }

    setProjectsById(projectsMap);
    setActiveTasks(activeTasksData);
    setCompletedToday(completedTodayData);
    setLoading(false);
  };

  useEffect(() => {
    if (studioId) loadData();
  }, [studioId]);

  const groupedActive = useMemo(() => {
    return activeTasks.reduce((acc, task) => {
      const key = task.project_id || "senza-progetto";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(task);
      return acc;
    }, {});
  }, [activeTasks]);

  const toggleTask = async (task, fromCompletedToday = false) => {
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    setUpdatingTaskId(task.id);

    if (fromCompletedToday) {
      setCompletedToday((prev) => prev.filter((item) => item.id !== task.id));
      if (nextStatus !== "completed") {
        setActiveTasks((prev) => [{ ...task, status: nextStatus }, ...prev]);
      }
    } else {
      setActiveTasks((prev) =>
        prev.filter((item) => item.id !== task.id),
      );
      if (nextStatus === "completed") {
        setCompletedToday((prev) => [{ ...task, status: "completed" }, ...prev]);
      }
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ status: nextStatus })
      .eq("id", task.id);

    if (updateError) {
      await loadData();
      setError(updateError.message);
    } else {
      setError("");
    }
    setUpdatingTaskId(null);
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
        Caricamento task...
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
    <div className="space-y-6">
      {Object.keys(groupedActive).length === 0 ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          Nessun task attivo assegnato.
        </section>
      ) : (
        Object.entries(groupedActive).map(([projectId, tasks]) => (
          <section key={projectId} className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
            <h3 className="mb-3 text-lg font-semibold text-white">
              {projectsById[projectId] || "Progetto non assegnato"}
            </h3>
            <div className="space-y-2">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => toggleTask(task, false)}
                  disabled={updatingTaskId === task.id}
                  className="flex w-full items-center justify-between rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2 text-left hover:border-[#0a84ff] disabled:opacity-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/60" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{task.title || "Task senza titolo"}</p>
                      <p className="text-xs text-white/60">{task.categoria || "Senza categoria"}</p>
                    </div>
                  </div>
                  <p
                    className={`text-xs ${
                      task.data_pianificata && isOverdue(task.data_pianificata) ? "text-[#ff453a]" : "text-white/70"
                    }`}
                  >
                    {task.data_pianificata || "Nessuna data"}
                  </p>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
        <h3 className="mb-3 text-lg font-semibold text-[#30d158]">Task completati oggi</h3>
        {completedToday.length === 0 ? (
          <p className="text-sm text-white/60">Nessun task completato oggi.</p>
        ) : (
          <div className="space-y-2">
            {completedToday.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => toggleTask(task, true)}
                disabled={updatingTaskId === task.id}
                className="flex w-full items-center justify-between rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2 text-left hover:border-[#0a84ff] disabled:opacity-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[#30d158] bg-[#30d158]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1c1c1e]" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white/80">{task.title || "Task senza titolo"}</p>
                    <p className="text-xs text-white/50">
                      {projectsById[task.project_id] || "Progetto non assegnato"} - {task.categoria || "Senza categoria"}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[#30d158]">Completato</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
