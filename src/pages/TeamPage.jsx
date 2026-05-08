import { useEffect, useMemo, useState } from "react";
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";

const ROLE_OPTIONS = ["Architetto", "Collaboratore", "Titolare", "Stagista"];

function getInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getAvatarColor(seed = "") {
  const colors = ["#0a84ff", "#64d2ff", "#5e5ce6", "#30d158", "#bf5af2", "#ff9f0a"];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getMondayISODate() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diff);
  now.setHours(0, 0, 0, 0);
  return now.toISOString().slice(0, 10);
}

export default function TeamPage() {
  const { studioId, loading: studioLoading } = useStudio();
  const [members, setMembers] = useState([]);
  const [statsByMember, setStatsByMember] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    user_name: "",
    user_email: "",
    role_internal: ROLE_OPTIONS[0],
  });

  const loadData = async () => {
    if (!studioId) return;
    setLoading(true);
    setError("");

    const mondayISO = getMondayISODate();
    const [{ data: authData, error: authError }, membersResult, timesheetResult, tasksResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("team_members").select("*").eq("studio", studioId).order("user_name", { ascending: true }),
      supabase.from("timesheet").select("team_member,date,hours").gte("date", mondayISO),
      supabase.from("tasks").select("assigned_member,status,project_id"),
    ]);

    if (authError || !authData?.user?.id) {
      setError(authError?.message || "Utente non autenticato.");
      setLoading(false);
      return;
    }

    if (membersResult.error) {
      setError(membersResult.error.message);
      setLoading(false);
      return;
    }
    if (timesheetResult.error) {
      setError(timesheetResult.error.message);
      setLoading(false);
      return;
    }
    if (tasksResult.error) {
      setError(tasksResult.error.message);
      setLoading(false);
      return;
    }

    const loadedMembers = membersResult.data ?? [];
    const timesheetRows = timesheetResult.data ?? [];
    const taskRows = tasksResult.data ?? [];

    const stats = {};
    loadedMembers.forEach((member) => {
      stats[member.id] = {
        weeklyHours: 0,
        activeTasks: 0,
        totalTasks: 0,
        completedTasks: 0,
        projectsSet: new Set(),
      };
    });

    timesheetRows.forEach((entry) => {
      const key = entry.team_member;
      if (!stats[key]) {
        return;
      }
      stats[key].weeklyHours += Number(entry.hours) || 0;
    });

    taskRows.forEach((task) => {
      const key = task.assigned_member;
      if (!stats[key]) {
        return;
      }

      stats[key].totalTasks += 1;
      if (task.status === "completed") {
        stats[key].completedTasks += 1;
      } else {
        stats[key].activeTasks += 1;
      }
      if (task.project_id) {
        stats[key].projectsSet.add(task.project_id);
      }
    });

    const normalizedStats = {};
    Object.entries(stats).forEach(([memberId, value]) => {
      normalizedStats[memberId] = {
        weeklyHours: value.weeklyHours,
        activeTasks: value.activeTasks,
        totalTasks: value.totalTasks,
        completedTasks: value.completedTasks,
        projects: value.projectsSet.size,
      };
    });

    let currentMember = loadedMembers.find((member) => member.user_account === authData.user.id);
    if (!currentMember) {
      try {
        currentMember = await getOrCreateTeamMember(authData.user);
        loadedMembers.push(currentMember);
      } catch (memberError) {
        setError(memberError.message);
        setLoading(false);
        return;
      }
    }
    setIsAdmin(currentMember?.role_internal === "Titolare");
    setMembers(loadedMembers);
    setStatsByMember(normalizedStats);
    setLoading(false);
  };

  useEffect(() => {
    if (studioId) loadData();
  }, [studioId]);

  const cards = useMemo(() => {
    return members.map((member) => {
      const memberStats = statsByMember[member.id] ?? {
        weeklyHours: 0,
        activeTasks: 0,
        projects: 0,
        completedTasks: 0,
        totalTasks: 0,
      };

      const progress =
        memberStats.totalTasks > 0
          ? Math.round((memberStats.completedTasks / memberStats.totalTasks) * 100)
          : 0;

      return { member, stats: memberStats, progress };
    });
  }, [members, statsByMember]);

  const openModal = () => {
    setFormError("");
    setFormData({
      user_name: "",
      user_email: "",
      role_internal: ROLE_OPTIONS[0],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }
    setIsModalOpen(false);
  };

  const handleSaveMember = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!formData.user_name.trim() || !formData.user_email.trim() || !formData.role_internal) {
      setFormError("Compila tutti i campi.");
      return;
    }

    setSaving(true);
    const payload = {
      user_name: formData.user_name.trim(),
      user_email: formData.user_email.trim(),
      role_internal: formData.role_internal,
      studio: studioId,
    };

    const { data, error: insertError } = await supabase
      .from("team_members")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) {
      setFormError(insertError.message);
      setSaving(false);
      return;
    }

    setMembers((prev) => [...prev, data].sort((a, b) => a.user_name.localeCompare(b.user_name, "it")));
    setStatsByMember((prev) => ({
      ...prev,
      [data.id]: {
        weeklyHours: 0,
        activeTasks: 0,
        totalTasks: 0,
        completedTasks: 0,
        projects: 0,
      },
    }));
    setSaving(false);
    setIsModalOpen(false);
  };

  if (studioLoading || !studioId || loading) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
        Caricamento team...
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
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Team</h2>
          <p className="text-sm text-white/60">Panoramica membri e produttivita settimanale</p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={openModal}
            className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Aggiungi Membro
          </button>
        ) : null}
      </header>

      {cards.length === 0 ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          Nessun membro presente.
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {cards.map(({ member, stats, progress }) => (
            <article key={member.id} className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: getAvatarColor(member.user_name || member.user_email || "") }}
                >
                  {getInitials(member.user_name || member.user_email)}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-white">{member.user_name || "-"}</h3>
                  <p className="truncate text-sm text-white/70">{member.user_email || "-"}</p>
                  <p className="mt-1 inline-block rounded-md border border-[#48484a] px-2 py-1 text-xs text-white/80">
                    {member.role_internal || "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                  <p className="text-xs text-white/60">Ore settimana</p>
                  <p className="mt-1 text-lg font-semibold text-white">{stats.weeklyHours}</p>
                </div>
                <div className="rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                  <p className="text-xs text-white/60">Task attivi</p>
                  <p className="mt-1 text-lg font-semibold text-white">{stats.activeTasks}</p>
                </div>
                <div className="rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                  <p className="text-xs text-white/60">Progetti</p>
                  <p className="mt-1 text-lg font-semibold text-white">{stats.projects}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                  <span>Task completati</span>
                  <span>
                    {stats.completedTasks}/{stats.totalTasks}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#48484a]">
                  <div
                    className="h-full rounded-full bg-[#30d158] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
            <h3 className="text-xl font-semibold text-white">Aggiungi Membro</h3>
            <form className="mt-5 space-y-4" onSubmit={handleSaveMember}>
              <div>
                <label className="mb-1 block text-sm font-medium text-white">Nome</label>
                <input
                  type="text"
                  value={formData.user_name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, user_name: event.target.value }))}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white">Email</label>
                <input
                  type="email"
                  value={formData.user_email}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, user_email: event.target.value }))
                  }
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white">Ruolo interno</label>
                <select
                  value={formData.role_internal}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, role_internal: event.target.value }))
                  }
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  required
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {formError ? <p className="text-sm text-red-300">{formError}</p> : null}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
                >
                  {saving ? "Salvataggio..." : "Salva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
