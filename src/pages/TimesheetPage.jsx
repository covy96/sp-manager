import { useEffect, useMemo, useState, useRef } from "react";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import { formatOre } from "../lib/utils";

// Chevron left icon
function ChevronLeftIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

// Chevron right icon
function ChevronRightIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// Plus icon
function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

// Clock icon
function ClockIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Edit icon
function EditIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

// Trash icon
function TrashIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

// Search icon
function SearchIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

// X icon
function XIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateDisplay(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  
  const options = { weekday: "long", day: "numeric", month: "long" };
  const formatted = date.toLocaleDateString("it-IT", options);
  
  return isToday ? `${formatted} (Oggi)` : formatted;
}

function getInitials(text) {
  if (!text) return "?";
  const parts = text.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
}

// Generate hours options from 0.25 to 12 with step 0.25
const HOURS_OPTIONS = [];
for (let h = 0.25; h <= 12; h += 0.25) {
  HOURS_OPTIONS.push({ value: h, label: formatOre(h) });
}

export default function TimesheetPage() {
  usePageTitleOnMount("Timesheet");
  const { studioId, teamMember: currentMember } = useStudio();

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add entry form state
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [hours, setHours] = useState(1);
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit modal state
  const [editingEntry, setEditingEntry] = useState(null);
  const [editHours, setEditHours] = useState(1);
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const projectSearchRef = useRef(null);

  // Load timesheet entries for selected date
  const loadEntries = async (date) => {
    if (!studioId) return;
    setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("timesheet")
      .select("*")
      .eq("studio", studioId)
      .eq("date", date)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setEntries([]);
    } else {
      setEntries(data ?? []);
    }

    setLoading(false);
  };

  // Load projects
  useEffect(() => {
    if (!studioId) return;
    const loadProjects = async () => {
      const { data, error: projectsError } = await supabase
        .from("projects")
        .select("id, name, client, archived")
        .eq("studio", studioId)
        .eq("archived", false)
        .order("name", { ascending: true });

      if (!projectsError) {
        setProjects(data ?? []);
      }
    };
    loadProjects();
  }, [studioId]);

  // Load team members for avatar colors
  useEffect(() => {
    if (!studioId) return;
    const loadMembers = async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id, user_name, user_email, color")
        .eq("studio", studioId);
      setTeamMembers(data ?? []);
    };
    loadMembers();
  }, [studioId]);

  // Load entries when date changes
  useEffect(() => {
    if (studioId) loadEntries(selectedDate);
  }, [selectedDate, studioId]);

  // Close project dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (projectSearchRef.current && !projectSearchRef.current.contains(e.target)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigateDate = (direction) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + direction);
    setSelectedDate(date.toISOString().slice(0, 10));
  };

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects.slice(0, 10);
    const search = projectSearch.toLowerCase();
    return projects
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(search) ||
          p.client?.toLowerCase().includes(search)
      )
      .slice(0, 10);
  }, [projectSearch, projects]);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setProjectSearch(project.name);
    setShowProjectDropdown(false);
  };

  const handleClearProject = () => {
    setSelectedProject(null);
    setProjectSearch("");
    setShowProjectDropdown(false);
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!selectedProject) {
      setError("Seleziona un progetto");
      return;
    }
    if (!hours || hours <= 0) {
      setError("Inserisci un numero di ore valido");
      return;
    }

    setAdding(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("timesheet")
      .insert({
        project_id: selectedProject.id,
        project_name: selectedProject.name,
        date: selectedDate,
        hours: hours,
        notes: notes.trim() || null,
        team_member: currentMember?.id,
        user_name: currentMember?.user_name || currentMember?.user_email || "Utente",
        studio: studioId,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
    } else {
      setEntries((prev) => [data, ...prev]);
      // Reset form
      setSelectedProject(null);
      setProjectSearch("");
      setHours(1);
      setNotes("");
    }

    setAdding(false);
  };

  const handleEditClick = (entry) => {
    setEditingEntry(entry);
    setEditHours(entry.hours);
    setEditNotes(entry.notes || "");
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingEntry) return;

    setSavingEdit(true);

    const { data, error: updateError } = await supabase
      .from("timesheet")
      .update({ hours: editHours, notes: editNotes.trim() || null })
      .eq("id", editingEntry.id)
      .select("*")
      .single();

    if (updateError) {
      alert("Errore: " + updateError.message);
    } else {
      setEntries((prev) =>
        prev.map((entry) => (entry.id === data.id ? data : entry))
      );
      setEditingEntry(null);
    }

    setSavingEdit(false);
  };

  const handleDeleteEntry = async () => {
    if (!editingEntry) return;
    if (!confirm("Sei sicuro di voler eliminare questa registrazione?")) return;

    const { error: deleteError } = await supabase
      .from("timesheet")
      .delete()
      .eq("id", editingEntry.id);

    if (deleteError) {
      alert("Errore: " + deleteError.message);
    } else {
      setEntries((prev) => prev.filter((entry) => entry.id !== editingEntry.id));
      setEditingEntry(null);
    }
  };

  const totalHours = useMemo(
    () => entries.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0),
    [entries]
  );

  const getMemberColor = (memberId) => {
    const member = teamMembers.find((m) => m.id === memberId);
    return member?.color || "#0a84ff";
  };

  const getMemberName = (memberId) => {
    const member = teamMembers.find((m) => m.id === memberId);
    return member?.user_name || member?.user_email || "Utente";
  };

  // Get client name from projects using project_id
  const getClientName = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.client || null;
  };

  if (!studioId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
      </div>
    );
  }

  return (
    <div>
      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Timesheet</h2>
          <p className="text-sm text-white/60 capitalize">{formatDateDisplay(selectedDate)}</p>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-1">
          <button
            onClick={() => navigateDate(-1)}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10"
            title="Giorno precedente"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent px-2 py-1 text-sm text-white outline-none"
          />
          <button
            onClick={() => navigateDate(1)}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10"
            title="Giorno successivo"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ADD ENTRY BAR */}
      <form
        onSubmit={handleAddEntry}
        className="mb-6 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          {/* Project Search */}
          <div className="relative flex-1" ref={projectSearchRef}>
            <label className="mb-1 block text-xs font-medium text-white/60">Progetto</label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={projectSearch}
                onChange={(e) => {
                  setProjectSearch(e.target.value);
                  setShowProjectDropdown(true);
                  if (selectedProject && e.target.value !== selectedProject.name) {
                    setSelectedProject(null);
                  }
                }}
                onFocus={() => setShowProjectDropdown(true)}
                placeholder="Cerca progetto..."
                className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] py-2 pl-9 pr-8 text-sm text-white placeholder-white/40 outline-none focus:border-[#0a84ff]"
              />
              {selectedProject && (
                <button
                  type="button"
                  onClick={handleClearProject}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Project Dropdown */}
            {showProjectDropdown && filteredProjects.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[#48484a] bg-[#3a3a3c] shadow-lg">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleSelectProject(project)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-white/10"
                  >
                    <span className="text-sm font-medium text-white">{project.name}</span>
                    {project.client && (
                      <span className="text-xs text-white/50">{project.client}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hours Selector */}
          <div className="w-full md:w-40">
            <label className="mb-1 block text-xs font-medium text-white/60">Ore</label>
            <div className="relative">
              <ClockIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <select
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full appearance-none rounded-lg border border-[#48484a] bg-[#3a3a3c] py-2 pl-9 pr-8 text-sm text-white outline-none focus:border-[#0a84ff]"
              >
                {HOURS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronRightIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-white/40" />
            </div>
          </div>

          {/* Notes */}
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-white/60">Note (opzionale)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descrizione attività..."
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#0a84ff]"
            />
          </div>

          {/* Add Button */}
          <button
            type="submit"
            disabled={adding || !selectedProject}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0a84ff] text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </form>

      {/* ENTRIES LIST */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          <ClockIcon className="mx-auto mb-3 h-8 w-8 text-white/30" />
          <p>Nessuna registrazione per questa data.</p>
          <p className="mt-1 text-sm text-white/40">Aggiungi la tua prima attività usando la barra sopra.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <button
              key={entry.id}
              onClick={() => handleEditClick(entry)}
              className="flex w-full items-center gap-4 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4 text-left transition hover:border-[#0a84ff]/50 hover:bg-[#3a3a3c]"
            >
              {/* Avatar with member color */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: getMemberColor(entry.team_member) }}
                title={getMemberName(entry.team_member)}
              >
                {getInitials(entry.user_name)}
              </div>

              {/* Project & Client Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{entry.project_name}</p>
                {getClientName(entry.project_id) && (
                  <p className="truncate text-sm text-white/50">{getClientName(entry.project_id)}</p>
                )}
                {entry.notes && (
                  <p className="mt-1 truncate text-xs text-white/40">{entry.notes}</p>
                )}
              </div>

              {/* Hours */}
              <div className="shrink-0 text-right">
                <span className="text-lg font-semibold text-[#0a84ff]">
                  {formatOre(entry.hours)} h
                </span>
                <p className="text-xs text-white/40">ore</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* TOTAL CARD */}
      {entries.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/70">
              Totale {new Date(selectedDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
            </span>
            <span className="text-2xl font-bold text-[#0a84ff]">{formatOre(totalHours)} h</span>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Modifica registrazione</h3>
              <button
                onClick={() => setEditingEntry(null)}
                className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Project Info (readonly) */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/60">Progetto</label>
                <div className="rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2 text-sm text-white/70">
                  {editingEntry.project_name}
                  {getClientName(editingEntry.project_id) && (
                    <span className="ml-2 text-white/40">• {getClientName(editingEntry.project_id)}</span>
                  )}
                </div>
              </div>

              {/* Hours */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/60">Ore</label>
                <div className="relative">
                  <ClockIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <select
                    value={editHours}
                    onChange={(e) => setEditHours(Number(e.target.value))}
                    className="w-full appearance-none rounded-lg border border-[#48484a] bg-[#3a3a3c] py-2 pl-9 pr-8 text-sm text-white outline-none focus:border-[#0a84ff]"
                  >
                    {HOURS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronRightIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-white/40" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/60">Note</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Descrizione attività..."
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#0a84ff]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleDeleteEntry}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/50 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  <TrashIcon className="h-4 w-4" />
                  Elimina
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEntry(null)}
                    className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
                  >
                    <EditIcon className="h-4 w-4" />
                    {savingEdit ? "Salvataggio..." : "Salva"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
