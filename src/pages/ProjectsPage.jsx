import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";

function getInitials(name = "") {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

const AVATAR_COLORS = ["#0a84ff", "#64d2ff", "#5e5ce6", "#30d158", "#bf5af2", "#ff9f0a"];
function avatarColor(member) {
  // Usa il colore salvato se disponibile
  if (member?.color) return member.color;

  // Fallback: calcola colore in base al nome/email
  const seed = member?.user_name || member?.user_email || "";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getProgress(completedTasks, totalTasks) {
  const safeTotal = Number(totalTasks) || 0;
  const safeCompleted = Number(completedTasks) || 0;
  if (safeTotal <= 0) return 0;
  return Math.min(100, Math.round((safeCompleted / safeTotal) * 100));
}

// Icons
function PinIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function MoreIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

function ChevronDownIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function ProjectsPage() {
  usePageTitleOnMount("Progetti");
  const navigate = useNavigate();
  const { teamMember, studioId, studioLoading } = useStudio();
  const permissions = usePermissions();

  // Data states
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [serviceTemplates, setServiceTemplates] = useState([]);
  const [globalContacts, setGlobalContacts] = useState([]);
  const [timesheetByProject, setTimesheetByProject] = useState({});
  const [tasksByProject, setTasksByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter states
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  // Create modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    address: "",
    startDate: "",
    selectedServices: [],
    selectedMembers: [],
    createCommessa: false,
  });

  // Edit modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Archive confirmation
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Linked commessa modal
  const [commessaModal, setCommessaModal] = useState(false);
  const [commessaForm, setCommessaForm] = useState({});
  const [commessaSaving, setCommessaSaving] = useState(false);
  const [commessaError, setCommessaError] = useState("");

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pre-select current user when team members load
  useEffect(() => {
    if (teamMember?.id && selectedUserIds.length === 0) {
      setSelectedUserIds([teamMember.id]);
    }
  }, [teamMember?.id]);

  const loadData = async () => {
    if (!studioId) return;
    setLoading(true);
    setError("");

    try {
      // Load all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("studio", studioId)
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData ?? []);

      // Load all timesheet for this studio and group by project_id
      const { data: timesheetData } = await supabase
        .from("timesheet")
        .select("project_id, hours")
        .eq("studio", studioId);

      const hoursMap = (timesheetData || []).reduce((acc, t) => {
        acc[t.project_id] = (acc[t.project_id] || 0) + (Number(t.hours) || 0);
        return acc;
      }, {});
      setTimesheetByProject(hoursMap);

      // Load all tasks for this studio and group by project_id
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("project_id, status, parent_task_id")
        .eq("studio", studioId)
        .is("parent_task_id", null); // Only parent tasks

      const tasksMap = (tasksData || []).reduce((acc, t) => {
        if (!acc[t.project_id]) {
          acc[t.project_id] = { total: 0, completed: 0 };
        }
        acc[t.project_id].total += 1;
        if (t.status === "completed") {
          acc[t.project_id].completed += 1;
        }
        return acc;
      }, {});
      setTasksByProject(tasksMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studioId) loadData();

    // Load services and contacts
    const loadServices = async () => {
      const { data } = await supabase
        .from("service_task_templates")
        .select("*")
        .order("order", { ascending: true });
      setServiceTemplates(data ?? []);
    };
    loadServices();

    const loadContacts = async () => {
      const { data } = await supabase.from("global_contacts").select("id,name").order("name", { ascending: true });
      setGlobalContacts(data ?? []);
    };
    loadContacts();

    // Load team members (con color)
    if (studioId) {
      const loadMembers = async () => {
        const { data } = await supabase
          .from("team_members")
          .select("id,user_name,user_email,color")
          .eq("studio", studioId)
          .order("user_name", { ascending: true });
        setTeamMembers(data ?? []);
      };
      loadMembers();
    }
  }, [studioId]);

  // Filter handlers
  const toggleUserFilter = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const clearAllFilters = () => {
    setSelectedUserIds([]);
  };

  const filteredProjects = useMemo(() => {
    if (selectedUserIds.length === 0) return projects;
    return projects.filter((p) =>
      Array.isArray(p.assigned_users) &&
      p.assigned_users.some((id) => selectedUserIds.includes(id))
    );
  }, [projects, selectedUserIds]);

  // Get member info by ID
  const getMemberById = (id) => teamMembers.find((m) => m.id === id);

  // Form handlers
  const resetForm = () => {
    setFormData({
      name: "",
      client: "",
      address: "",
      startDate: "",
      selectedServices: [],
      selectedMembers: teamMember?.id ? [teamMember.id] : [],
      createCommessa: false,
    });
    setFormError("");
  };

  const resetEditForm = () => {
    setEditFormData({
      name: "",
      client: "",
      address: "",
      startDate: "",
      selectedServices: [],
      selectedMembers: [],
    });
  };

  const toggleMember = (memberId, isEdit = false) => {
    if (isEdit) {
      setEditFormData((prev) => ({
        ...prev,
        selectedMembers: prev.selectedMembers?.includes(memberId)
          ? prev.selectedMembers.filter((id) => id !== memberId)
          : [...(prev.selectedMembers || []), memberId],
      }));
    } else {
      if (memberId === teamMember?.id) return;
      setFormData((prev) => ({
        ...prev,
        selectedMembers: prev.selectedMembers.includes(memberId)
          ? prev.selectedMembers.filter((id) => id !== memberId)
          : [...prev.selectedMembers, memberId],
      }));
    }
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saveLoading) return;
    setIsModalOpen(false);
    setFormError("");
  };

  const openEditModal = (project) => {
    setEditProject(project);
    setEditFormData({
      name: project.name || "",
      client: project.client || "",
      address: project.address || "",
      startDate: project.start_date || "",
      selectedServices: project.servizi_selezionati || [],
      selectedMembers: project.assigned_users || [],
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (editLoading) return;
    setEditModalOpen(false);
    setEditProject(null);
    resetEditForm();
  };

  const openArchiveModal = (project, e) => {
    e.stopPropagation();
    setProjectToArchive(project);
    setArchiveModalOpen(true);
  };

  const closeArchiveModal = () => {
    if (archiveLoading) return;
    setArchiveModalOpen(false);
    setProjectToArchive(null);
  };

  const handleChange = (field, isEdit = false) => (event) => {
    const value = event.target.value;
    if (isEdit) {
      setEditFormData((prev) => ({ ...prev, [field]: value }));
    } else {
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

  const toggleService = (serviceName, isEdit = false) => {
    if (isEdit) {
      setEditFormData((prev) => {
        const isSelected = prev.selectedServices?.includes(serviceName);
        return {
          ...prev,
          selectedServices: isSelected
            ? prev.selectedServices.filter((item) => item !== serviceName)
            : [...(prev.selectedServices || []), serviceName],
        };
      });
    } else {
      setFormData((prev) => {
        const isSelected = prev.selectedServices.includes(serviceName);
        return {
          ...prev,
          selectedServices: isSelected
            ? prev.selectedServices.filter((item) => item !== serviceName)
            : [...prev.selectedServices, serviceName],
        };
      });
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

    const assignedUsers = formData.selectedMembers.length > 0
      ? formData.selectedMembers
      : (teamMember?.id ? [teamMember.id] : []);

    const payload = {
      name: formData.name.trim(),
      client: formData.client.trim(),
      address: formData.address.trim() || null,
      start_date: formData.startDate || null,
      status: "planning",
      total_hours: 0,
      servizi_selezionati: formData.selectedServices,
      assigned_users: assignedUsers,
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
    await loadData();
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

  const handleEditProject = async (event) => {
    event.preventDefault();
    if (!editProject) return;

    setEditLoading(true);

    const payload = {
      name: editFormData.name.trim(),
      client: editFormData.client.trim(),
      address: editFormData.address.trim() || null,
      start_date: editFormData.startDate || null,
      servizi_selezionati: editFormData.selectedServices,
      assigned_users: editFormData.selectedMembers,
    };

    await upsertContact(editFormData.client);

    const { error: updateError } = await supabase
      .from("projects")
      .update(payload)
      .eq("id", editProject.id);

    if (updateError) {
      alert("Errore durante la modifica: " + updateError.message);
    } else {
      setEditModalOpen(false);
      setEditProject(null);
      resetEditForm();
      await loadData();
    }

    setEditLoading(false);
  };

  const handleArchiveProject = async () => {
    if (!projectToArchive) return;

    setArchiveLoading(true);

    const { error } = await supabase
      .from("projects")
      .update({ archived: true })
      .eq("id", projectToArchive.id);

    if (error) {
      alert("Errore durante l'archiviazione: " + error.message);
    } else {
      setArchiveModalOpen(false);
      setProjectToArchive(null);
      await loadData();
    }

    setArchiveLoading(false);
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

  // Project card component
  const ProjectCard = ({ project }) => {
    const hours = timesheetByProject[project.id] || 0;
    const tasks = tasksByProject[project.id] || { total: 0, completed: 0 };
    const progress = getProgress(tasks.completed, tasks.total);
    const assignedMembers = (project.assigned_users || [])
      .map((id) => getMemberById(id))
      .filter(Boolean);

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
      function handleClickOutside(event) {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setMenuOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div className="relative rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5 transition hover:border-[#0a84ff] hover:bg-[#343436]">
        {/* Menu button */}
        <div ref={menuRef} className="absolute right-3 top-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <MoreIcon className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-lg border border-[#48484a] bg-[#2c2c2e] shadow-xl">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  openEditModal(project);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10"
              >
                Modifica progetto
              </button>
              <button
                onClick={(e) => openArchiveModal(project, e)}
                className="w-full px-4 py-2.5 text-left text-sm text-[#ff453a] hover:bg-white/10"
              >
                Archivia progetto
              </button>
            </div>
          )}
        </div>

        {/* Clickable area */}
        <div className="cursor-pointer" onClick={() => navigate(`/progetti/${project.id}`)}>
          {/* Project name and client */}
          <h3 className="pr-8 text-lg font-bold text-white">{project.name || "Progetto senza nome"}</h3>
          <p className="mt-1 text-sm text-white/60">{project.client || "N/D"}</p>

          {/* Address */}
          {project.address && (
            <div className="mt-3 flex items-center gap-1.5 text-sm text-white/50">
              <PinIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{project.address}</span>
            </div>
          )}

          {/* Hours and tasks row */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-white/60">
              <ClockIcon className="h-4 w-4" />
              <span>{hours}h</span>
            </div>
            <div className="text-white/60">
              Task {tasks.completed}/{tasks.total}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1c1c1e]">
              <div
                className="h-full rounded-full bg-[#0a84ff] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-white/60">{progress}%</span>
          </div>

          {/* Assigned members avatars */}
          <div className="mt-4 flex items-center gap-1.5">
            {assignedMembers.length > 0 ? (
              <div className="flex -space-x-2">
                {assignedMembers.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#2c2c2e] text-[10px] font-semibold text-white"
                    style={{ backgroundColor: avatarColor(member) }}
                    title={member.user_name || member.user_email}
                  >
                    {getInitials(member.user_name || member.user_email)}
                  </div>
                ))}
                {assignedMembers.length > 5 && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#2c2c2e] bg-[#48484a] text-[10px] font-semibold text-white">
                    +{assignedMembers.length - 5}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-white/40">Nessun membro assegnato</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (studioLoading || !studioId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
      </div>
    );
  }

  return (
    <div>
      {/* Header with filter and new project button */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Progetti</h2>
          <p className="text-sm text-white/60">Panoramica dei progetti attivi</p>
        </div>
        <div className="flex items-center gap-3">
          {/* User filter dropdown */}
          <div ref={filterDropdownRef} className="relative">
            <button
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-[#48484a] bg-[#2c2c2e] px-3 py-2 text-sm text-white hover:bg-[#3a3a3c]"
            >
              Utenti ({selectedUserIds.length})
              <ChevronDownIcon className="h-4 w-4" />
            </button>
            {filterDropdownOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-lg border border-[#48484a] bg-[#2c2c2e] shadow-xl">
                <div className="max-h-64 overflow-y-auto p-2">
                  {teamMembers.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-white/50">Nessun membro</p>
                  ) : (
                    teamMembers.map((m) => {
                      const isMe = m.id === teamMember?.id;
                      const isSelected = selectedUserIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 hover:bg-white/10"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUserFilter(m.id)}
                            className="h-4 w-4 accent-[#0a84ff]"
                          />
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: avatarColor(m) }}
                          >
                            {getInitials(m.user_name || m.user_email)}
                          </span>
                          <span className="text-sm text-white">
                            {m.user_name || m.user_email}
                            {isMe && <span className="ml-1 text-white/50">(io)</span>}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
                <div className="border-t border-[#48484a] p-2">
                  <button
                    onClick={clearAllFilters}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-[#ff453a] hover:bg-white/10"
                  >
                    Rimuovi tutti i filtri
                  </button>
                </div>
              </div>
            )}
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
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
        </div>
      ) : error ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-red-300">
          Errore: {error}
        </section>
      ) : filteredProjects.length === 0 ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          {selectedUserIds.length > 0
            ? "Nessun progetto trovato per gli utenti selezionati."
            : "Nessun progetto disponibile."}
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </section>
      )}

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

              <div>
                <p className="mb-2 block text-sm font-medium text-white">Membri del team</p>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-white/50">Nessun membro disponibile</p>
                  ) : (
                    teamMembers.map((m) => {
                      const isMe = m.id === teamMember?.id;
                      const checked = formData.selectedMembers.includes(m.id);
                      return (
                        <label key={m.id} className={`flex cursor-pointer items-center gap-2 text-sm text-white/90 ${isMe ? "opacity-60" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isMe}
                            onChange={() => toggleMember(m.id)}
                            className="h-4 w-4 accent-[#0a84ff]"
                          />
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: avatarColor(m) }}
                          >
                            {getInitials(m.user_name || m.user_email)}
                          </span>
                          <span>{m.user_name || m.user_email}{isMe ? " (tu)" : ""}</span>
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

      {/* Edit Project Modal */}
      {editModalOpen && editProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
            <h3 className="text-xl font-semibold text-white">Modifica Progetto</h3>
            <p className="mt-1 text-sm text-white/60">
              Modifica i dati del progetto.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleEditProject}>
              <div>
                <label className="mb-1 block text-sm font-medium text-white">
                  Nome progetto *
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={handleChange("name", true)}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white">
                  Cliente *
                </label>
                <input
                  type="text"
                  value={editFormData.client}
                  onChange={handleChange("client", true)}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white">
                  Indirizzo
                </label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={handleChange("address", true)}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white">
                  Data inizio
                </label>
                <input
                  type="date"
                  value={editFormData.startDate}
                  onChange={handleChange("startDate", true)}
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
                      const checked = editFormData.selectedServices?.includes(label);
                      return (
                        <label
                          key={service.id ?? label}
                          className="flex cursor-pointer items-center gap-2 text-sm text-white/90"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleService(label, true)}
                            className="h-4 w-4 rounded border-[#48484a] bg-[#3a3a3c] accent-[#0a84ff]"
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 block text-sm font-medium text-white">Membri del team</p>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-white/50">Nessun membro disponibile</p>
                  ) : (
                    teamMembers.map((m) => {
                      const checked = editFormData.selectedMembers?.includes(m.id);
                      return (
                        <label key={m.id} className="flex cursor-pointer items-center gap-2 text-sm text-white/90">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMember(m.id, true)}
                            className="h-4 w-4 accent-[#0a84ff]"
                          />
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: avatarColor(m) }}
                          >
                            {getInitials(m.user_name || m.user_email)}
                          </span>
                          <span>{m.user_name || m.user_email}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editLoading ? "Salvataggio..." : "Salva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {archiveModalOpen && projectToArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
            <h3 className="text-lg font-semibold text-white">Archivia progetto?</h3>
            <p className="mt-2 text-sm text-white/60">
              Sei sicuro di voler archiviare il progetto <strong className="text-white">{projectToArchive.name}</strong>?
              <br />
              Il progetto non sarà più visibile nella lista principale.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeArchiveModal}
                disabled={archiveLoading}
                className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleArchiveProject}
                disabled={archiveLoading}
                className="rounded-lg bg-[#ff453a] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
              >
                {archiveLoading ? "Archiviazione..." : "Archivia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
