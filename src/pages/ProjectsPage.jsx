import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";

function getProgress(completedTasks, totalTasks) {
  const safeTotal = Number(totalTasks) || 0;
  const safeCompleted = Number(completedTasks) || 0;

  if (safeTotal <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((safeCompleted / safeTotal) * 100));
}

function normalizeMembers(rawMembers) {
  if (!rawMembers) {
    return [];
  }

  if (Array.isArray(rawMembers)) {
    return rawMembers.map((member, index) => {
      if (typeof member === "string") {
        return { id: `${member}-${index}`, name: member };
      }

      return {
        id: member.id ?? `${member.name ?? "member"}-${index}`,
        name: member.name ?? "Membro",
      };
    });
  }

  return [];
}

function initialsFromName(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join("");
}

function ProjectCard({ project, onClick }) {
  const members = normalizeMembers(
    project.members ?? project.assigned_members ?? project.team_members,
  );
  const completedTasks = project.completed_tasks ?? project.tasks_completed ?? 0;
  const totalTasks = project.total_tasks ?? project.tasks_total ?? 0;
  const progress = getProgress(completedTasks, totalTasks);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5 text-left transition hover:border-[#0a84ff] hover:bg-[#343436]"
    >
      <h3 className="text-lg font-bold text-white">
        {project.name ?? project.project_name ?? "Progetto senza nome"}
      </h3>

      <div className="mt-3 space-y-1 text-sm text-white/70">
        <p>
          <span className="text-white/50">Cliente:</span>{" "}
          {project.client_name ?? project.client ?? "N/D"}
        </p>
        <p>
          <span className="text-white/50">Indirizzo:</span>{" "}
          {project.address ?? project.project_address ?? "N/D"}
        </p>
        <p>
          <span className="text-white/50">Ore lavorate:</span>{" "}
          {project.worked_hours ?? project.hours_worked ?? 0}
        </p>
        <p>
          <span className="text-white/50">Task:</span> {completedTasks}/{totalTasks}
        </p>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-white/60">
          <span>Progresso</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#1c1c1e]">
          <div
            className="h-full rounded-full bg-[#0a84ff] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {members.length > 0 ? (
          members.slice(0, 5).map((member) => (
            <div
              key={member.id}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#48484a] bg-[#1c1c1e] text-xs font-semibold text-white"
              title={member.name}
            >
              {initialsFromName(member.name)}
            </div>
          ))
        ) : (
          <p className="text-xs text-white/50">Nessun membro assegnato</p>
        )}
      </div>
    </button>
  );
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { studioId, loading: studioLoading } = useStudio();
  const permissions = usePermissions();
  const [projects, setProjects] = useState([]);
  const [serviceTemplates, setServiceTemplates] = useState([]);
  const [globalContacts, setGlobalContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    address: "",
    startDate: "",
    selectedServices: [],
    createCommessa: false,
  });
  const [commessaModal, setCommessaModal] = useState(false);
  const [commessaForm, setCommessaForm] = useState({});
  const [commessaSaving, setCommessaSaving] = useState(false);
  const [commessaError, setCommessaError] = useState("");

  const loadProjects = async () => {
    if (!studioId) return;
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("projects")
      .select("*")
      .eq("studio", studioId)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setProjects([]);
    } else {
      setProjects(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (studioId) loadProjects();

    const loadServices = async () => {
      const { data, error: templatesError } = await supabase
        .from("service_task_templates")
        .select("*")
        .order("order", { ascending: true });

      if (!templatesError) {
        setServiceTemplates(data ?? []);
      }
    };

    loadServices();

    const loadContacts = async () => {
      const { data } = await supabase.from("global_contacts").select("id,name").order("name", { ascending: true });
      setGlobalContacts(data ?? []);
    };
    loadContacts();
  }, [studioId]);

  const resetForm = () => {
    setFormData({
      name: "",
      client: "",
      address: "",
      startDate: "",
      selectedServices: [],
      createCommessa: false,
    });
    setFormError("");
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saveLoading) {
      return;
    }

    setIsModalOpen(false);
    setFormError("");
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "client") {
      const q = value.trim().toLowerCase();
      if (q.length >= 3) {
        setClientSuggestions(
          globalContacts.filter((c) => (c.name ?? "").toLowerCase().startsWith(q)).slice(0, 8),
        );
      } else {
        setClientSuggestions([]);
      }
    }
  };

  const selectClientSuggestion = (name) => {
    setFormData((prev) => ({ ...prev, client: name }));
    setClientSuggestions([]);
  };

  const upsertContact = async (name) => {
    if (!name.trim()) return;
    const exists = globalContacts.some((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (!exists) {
      const { data } = await supabase.from("global_contacts").insert({ name: name.trim() }).select("id,name").single();
      if (data) setGlobalContacts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const handleSaveProject = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!formData.name.trim() || !formData.client.trim()) {
      setFormError("Nome progetto e cliente sono obbligatori.");
      return;
    }

    setSaveLoading(true);

    const payload = {
      name: formData.name.trim(),
      client: formData.client.trim(),
      address: formData.address.trim() || null,
      start_date: formData.startDate || null,
      status: "planning",
      total_hours: 0,
      servizi_selezionati: formData.selectedServices,
      studio: studioId,
    };

    await upsertContact(formData.client);

    const { error: insertError } = await supabase.from("projects").insert(payload);

    if (insertError) {
      setFormError(insertError.message);
      setSaveLoading(false);
      return;
    }

    const shouldCreateCommessa = formData.createCommessa;
    const prefillName = formData.name.trim();
    const prefillClient = formData.client.trim();
    const prefillAddress = formData.address.trim();

    setIsModalOpen(false);
    resetForm();
    await loadProjects();
    setSaveLoading(false);

    if (shouldCreateCommessa) {
      setCommessaForm({
        numero_offerta: "",
        nome_commessa: prefillName,
        cliente: prefillClient,
        data_commessa: "",
        importo_offerta_base: "",
        note_amministrative: prefillAddress,
      });
      setCommessaError("");
      setCommessaModal(true);
    }
  };

  const handleSaveLinkedCommessa = async (event) => {
    event.preventDefault();
    setCommessaError("");
    if (!commessaForm.numero_offerta.trim() || !commessaForm.nome_commessa.trim() || !commessaForm.cliente.trim() || !commessaForm.importo_offerta_base) {
      setCommessaError("Compila tutti i campi obbligatori.");
      return;
    }
    setCommessaSaving(true);
    const payload = {
      numero_offerta: commessaForm.numero_offerta.trim(),
      nome_commessa: commessaForm.nome_commessa.trim(),
      cliente: commessaForm.cliente.trim(),
      data_commessa: commessaForm.data_commessa || null,
      importo_offerta_base: Number(commessaForm.importo_offerta_base),
      note_amministrative: commessaForm.note_amministrative.trim() || null,
      studio: studioId,
    };
    const { error: insertError } = await supabase.from("commesse").insert(payload);
    if (insertError) {
      setCommessaError(insertError.message);
      setCommessaSaving(false);
      return;
    }
    setCommessaSaving(false);
    setCommessaModal(false);
  };

  const content = useMemo(() => {
    if (studioLoading || !studioId) {
      return (
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
        </div>
      );
    }
    if (loading) {
      return (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
          Caricamento progetti...
        </section>
      );
    }

    if (error) {
      return (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-red-300">
          Errore nel caricamento dei progetti: {error}
        </section>
      );
    }

    if (projects.length === 0) {
      return (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          Nessun progetto disponibile.
        </section>
      );
    }

    return (
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id ?? project.name ?? JSON.stringify(project)}
            project={project}
            onClick={() => navigate(`/progetti/${project.id}`)}
          />
        ))}
      </section>
    );
  }, [error, loading, navigate, projects]);

  const toggleService = (serviceName) => {
    setFormData((prev) => {
      const isSelected = prev.selectedServices.includes(serviceName);
      return {
        ...prev,
        selectedServices: isSelected
          ? prev.selectedServices.filter((item) => item !== serviceName)
          : [...prev.selectedServices, serviceName],
      };
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Progetti</h2>
          <p className="text-sm text-white/60">Panoramica dei progetti attivi</p>
        </div>
        {permissions.canCreateProjects && (
          <button
            onClick={openModal}
            className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Nuovo Progetto
          </button>
        )}
      </div>

      {content}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
            <h3 className="text-xl font-semibold text-white">Nuovo Progetto</h3>
            <p className="mt-1 text-sm text-white/60">
              Inserisci i dati principali del progetto.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSaveProject}>
              <div>
                <label className="mb-1 block text-sm font-medium text-white">
                  Nome progetto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleChange("name")}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  required
                />
              </div>

              <div className="relative">
                <label className="mb-1 block text-sm font-medium text-white">
                  Cliente *
                </label>
                <input
                  type="text"
                  value={formData.client}
                  onChange={handleChange("client")}
                  onBlur={() => setTimeout(() => setClientSuggestions([]), 150)}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  required
                  autoComplete="off"
                />
                {clientSuggestions.length > 0 ? (
                  <ul className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-[#48484a] bg-[#2c2c2e] shadow-xl">
                    {clientSuggestions.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseDown={() => selectClientSuggestion(c.name)}
                          className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10"
                        >
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white">
                  Indirizzo
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={handleChange("address")}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white">
                  Data inizio
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange("startDate")}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                />
              </div>

              <div>
                <p className="mb-2 block text-sm font-medium text-white">Servizi</p>
                <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                  {serviceTemplates.length === 0 ? (
                    <p className="text-sm text-white/50">Nessun servizio disponibile</p>
                  ) : (
                    serviceTemplates.map((service) => {
                      const label = service.service_name ?? "Servizio";
                      const checked = formData.selectedServices.includes(label);
                      return (
                        <label
                          key={service.id ?? label}
                          className="flex cursor-pointer items-center gap-2 text-sm text-white/90"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleService(label)}
                            className="h-4 w-4 rounded border-[#48484a] bg-[#3a3a3c] accent-[#0a84ff]"
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2.5 text-sm text-white/90 hover:border-[#0a84ff]">
                <input
                  type="checkbox"
                  checked={formData.createCommessa}
                  onChange={(e) => setFormData((prev) => ({ ...prev, createCommessa: e.target.checked }))}
                  className="h-4 w-4 accent-[#0a84ff]"
                />
                Crea commessa allegata al progetto
              </label>

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
                  disabled={saveLoading}
                  className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saveLoading ? "Salvataggio..." : "Salva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {commessaModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Nuova Commessa</h3>
                <p className="mt-0.5 text-xs text-white/50">Allegata al progetto appena creato</p>
              </div>
              <button type="button" onClick={() => setCommessaModal(false)} className="text-white/50 hover:text-white">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveLinkedCommessa}>
              {[
                ["numero_offerta", "Numero offerta *", "text"],
                ["nome_commessa", "Nome commessa *", "text"],
                ["cliente", "Cliente *", "text"],
                ["data_commessa", "Data commessa", "date"],
                ["importo_offerta_base", "Importo offerta base *", "number"],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-medium text-white/80">{label}</label>
                  <input
                    type={type}
                    value={commessaForm[key] ?? ""}
                    onChange={(e) => setCommessaForm((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                    required={label.includes("*")}
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Note amministrative</label>
                <textarea
                  rows={3}
                  value={commessaForm.note_amministrative ?? ""}
                  onChange={(e) => setCommessaForm((p) => ({ ...p, note_amministrative: e.target.value }))}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                />
              </div>
              {commessaError ? <p className="text-sm text-red-300">{commessaError}</p> : null}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setCommessaModal(false)} disabled={commessaSaving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">Salta</button>
                <button type="submit" disabled={commessaSaving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{commessaSaving ? "Salvataggio..." : "Salva Commessa"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
