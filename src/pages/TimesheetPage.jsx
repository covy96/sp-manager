import { useEffect, useMemo, useState } from "react";
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function TimesheetPage() {
  const { studioId, loading: studioLoading } = useStudio();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [currentMember, setCurrentMember] = useState(null);
  const [formData, setFormData] = useState({
    projectId: "",
    hours: "",
    notes: "",
  });

  const loadTimesheetEntries = async (date) => {
    setLoading(true);
    setError("");

    if (!studioId) return;
    const { data, error: queryError } = await supabase
      .from("timesheet")
      .select("*")
      .eq("studio", studioId)
      .eq("date", date)
      .order("created_at", { ascending: false });

    if (queryError) {
      setEntries([]);
      setError(queryError.message);
    } else {
      setEntries(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (studioId) loadTimesheetEntries(selectedDate);
  }, [selectedDate, studioId]);

  useEffect(() => {
    const loadProjects = async () => {
      if (!studioId) return;
      const { data, error: projectsError } = await supabase
        .from("projects")
        .select("id,name")
        .eq("studio", studioId)
        .order("name", { ascending: true });

      if (!projectsError) {
        setProjects(data ?? []);
      }
    };

    loadProjects();
  }, [studioId]);

  useEffect(() => {
    const loadCurrentMember = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) {
        setError(authError?.message || "Utente non autenticato.");
        return;
      }

      try {
        const member = await getOrCreateTeamMember(authData.user);
        setCurrentMember(member);
      } catch (memberError) {
        setError(memberError.message);
      }
    };

    loadCurrentMember();
  }, []);

  const totalHours = useMemo(
    () => entries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0),
    [entries],
  );

  const openModal = () => {
    setFormData({ projectId: "", hours: "", notes: "" });
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }
    setIsModalOpen(false);
    setFormError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFormError("");

    const hours = Number(formData.hours);
    const selectedProject = projects.find((project) => project.id === formData.projectId);

    if (!formData.projectId || !selectedProject) {
      setFormError("Seleziona un progetto.");
      return;
    }

    if (!Number.isFinite(hours) || hours <= 0) {
      setFormError("Inserisci un numero ore valido.");
      return;
    }

    setSaving(true);

    if (!currentMember?.id) {
      setFormError("Membro team corrente non disponibile.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("timesheet")
      .insert({
        project_id: selectedProject.id,
        project_name: selectedProject.name,
        team_member: currentMember.id,
        user_name: currentMember.user_name || currentMember.user_email || "Utente",
        date: selectedDate,
        hours,
        notes: formData.notes.trim() || null,
        studio: studioId,
      })
      .select("*")
      .single();

    if (insertError) {
      setFormError(insertError.message);
      setSaving(false);
      return;
    }

    setEntries((prev) => [data, ...prev]);
    setSaving(false);
    setIsModalOpen(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">Timesheet</h2>
          <p className="text-sm text-white/60">Ore registrate per giorno</p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
        >
          Aggiungi ore
        </button>
      </div>

      <section className="mb-4 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
        <label className="mb-2 block text-sm text-white/80">Data</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="w-full max-w-xs rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
        />
      </section>

      {loading ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
          Caricamento registrazioni...
        </section>
      ) : error ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-red-300">
          Errore: {error}
        </section>
      ) : entries.length === 0 ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          Nessuna registrazione per la data selezionata.
        </section>
      ) : (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-3">
          <ul className="divide-y divide-[#48484a]">
            {entries.map((entry) => (
              <li key={entry.id} className="grid grid-cols-1 gap-2 p-3 md:grid-cols-12">
                <p className="md:col-span-4 text-sm font-semibold text-white">
                  {entry.project_name ?? "Progetto"}
                </p>
                <p className="md:col-span-2 text-sm text-white/80">{entry.hours} h</p>
                <p className="md:col-span-6 text-sm text-white/70">
                  {entry.notes || <span className="text-white/40">Nessuna nota</span>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-4 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4 text-right">
        <p className="text-sm text-white/70">
          Totale ore: <span className="text-base font-semibold text-white">{totalHours}</span>
        </p>
      </footer>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
            <h3 className="text-xl font-semibold text-white">Aggiungi ore</h3>

            <form className="mt-5 space-y-4" onSubmit={handleSave}>
              <div>
                <label className="mb-1 block text-sm font-medium text-white">Progetto</label>
                <select
                  value={formData.projectId}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, projectId: event.target.value }))
                  }
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  required
                >
                  <option value="">Seleziona progetto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white">Ore</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.hours}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, hours: event.target.value }))
                  }
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white">Note</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  placeholder="Descrizione attività svolta"
                />
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
                  className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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
