import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";

function sortTasksForColumn(tasks) {
  const timestamp = (value) => {
    if (!value) {
      return Number.MAX_SAFE_INTEGER;
    }

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
  };

  return [...tasks].sort((a, b) => {
    const aCompleted = a.status === "completed";
    const bCompleted = b.status === "completed";

    if (aCompleted !== bCompleted) {
      return aCompleted ? 1 : -1;
    }

    return timestamp(a.created_at) - timestamp(b.created_at);
  });
}

const TASK_VISIBILITY_KEY = "projectDetailTaskVisibility";

function TaskEditPopup({ task, teamMembers, categories, onSave, onDelete, onClose, isSubtask }) {
  const ref = useRef(null);
  const safeTask = task || {};
  const rawAssigned = safeTask.assigned_member;
  const initialAssigned = (rawAssigned && rawAssigned !== "null" && rawAssigned !== "undefined") ? rawAssigned : "";
  const [form, setForm] = useState({
    title: safeTask.title ?? safeTask.name ?? "",
    categoria: safeTask.categoria ?? "",
    assigned_member: initialAssigned,
    data_pianificata: safeTask.data_pianificata ?? "",
    note: safeTask.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const updates = {
      title: form.title.trim(),
      assigned_member: form.assigned_member || null,  // converte stringa vuota/'null'/undefined in null reale
      data_pianificata: form.data_pianificata || null,
      note: form.note || null,
    };
    if (!isSubtask) updates.categoria = form.categoria || null;
    await onSave(task, updates);
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm("Eliminare questo task?")) return;
    setDeleting(true);
    await onDelete(task);
    setDeleting(false);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">Nome</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-2 py-1.5 text-sm text-white outline-none focus:border-[#0a84ff]"
            autoFocus
          />
        </div>
        {!isSubtask && categories.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-white/60">Categoria</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-2 py-1.5 text-sm text-white outline-none focus:border-[#0a84ff]"
            >
              <option value="">Nessuna</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">Assegnato a</label>
          <select
            value={form.assigned_member}
            onChange={(e) => setForm((p) => ({ ...p, assigned_member: e.target.value }))}
            className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-2 py-1.5 text-sm text-white outline-none focus:border-[#0a84ff]"
          >
            <option value="">Non assegnato</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.user_name || m.user_email || "Membro"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">Data pianificata</label>
          <input
            type="date"
            value={form.data_pianificata}
            onChange={(e) => setForm((p) => ({ ...p, data_pianificata: e.target.value }))}
            className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-2 py-1.5 text-sm text-white outline-none focus:border-[#0a84ff]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/60">Note</label>
          <textarea
            rows={2}
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-2 py-1.5 text-sm text-white outline-none focus:border-[#0a84ff]"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="flex-1 rounded-lg bg-[#0a84ff] py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Salvo..." : "Salva"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-[#ff453a] px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            {deleting ? "..." : "Elimina"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubtaskRow({ task, teamMembers, categories, onToggle, onUpdateTask, onDeleteTask, isUpdating }) {
  const completed = task.status === "completed";
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <div
      className={`relative ml-6 flex items-start gap-2 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-2 py-1.5 ${
        completed ? "opacity-40" : ""
      } ${isUpdating ? "opacity-50" : ""}`}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        disabled={isUpdating}
        className={`mt-0.5 inline-block h-3.5 w-3.5 shrink-0 rounded-full border ${
          completed ? "border-[#0a84ff] bg-[#0a84ff]" : "border-[#8e8e93] bg-transparent"
        }`}
      />
      <button
        type="button"
        onClick={() => setPopupOpen((v) => !v)}
        className={`min-w-0 flex-1 truncate text-left text-xs ${
          completed ? "text-white/45 line-through" : "text-white/85 hover:text-white"
        }`}
      >
        {task.title ?? task.name ?? "Subtask senza titolo"}
      </button>
      {popupOpen && (
        <TaskEditPopup
          task={task}
          teamMembers={teamMembers}
          categories={categories}
          onSave={onUpdateTask}
          onDelete={onDeleteTask}
          onClose={() => setPopupOpen(false)}
          isSubtask
        />
      )}
    </div>
  );
}

function TaskRow({
  task,
  teamMembers,
  categories,
  subtasks,
  subtaskInput,
  subtaskAssignment,
  subtaskDate,
  onToggle,
  onUpdateTask,
  onDeleteTask,
  onSubtaskInputChange,
  onSubtaskAssignmentChange,
  onSubtaskDateChange,
  onCreateSubtask,
  isUpdating,
  isCreatingSubtask,
}) {
  const completed = task.status === "completed";
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div
        className={`relative flex w-full items-start gap-2 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2 text-left transition hover:border-[#0a84ff] ${
          completed ? "opacity-40" : ""
        } ${isUpdating ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <button
          type="button"
          onClick={() => onToggle(task)}
          disabled={isUpdating}
          className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full border ${
            completed ? "border-[#0a84ff] bg-[#0a84ff]" : "border-[#8e8e93] bg-transparent"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPopupOpen((v) => !v)}
              className={`min-w-0 flex-1 truncate text-left text-sm ${
                completed ? "text-white/45 line-through" : "text-white/90 hover:text-white"
              }`}
            >
              {task.title ?? task.name ?? "Task senza titolo"}
            </button>
            {task.assigned_member ? (
              <span className="rounded-md border border-[#48484a] px-2 py-0.5 text-xs text-white/50">
                {teamMembers.find((m) => m.id === task.assigned_member)?.user_name ||
                  teamMembers.find((m) => m.id === task.assigned_member)?.user_email ||
                  ""}
              </span>
            ) : null}
            {task.data_pianificata ? (
              <span className="text-xs text-white/40">{task.data_pianificata}</span>
            ) : null}
          </div>
        </div>
        {popupOpen && (
          <TaskEditPopup
            task={task}
            teamMembers={teamMembers}
            categories={categories}
            onSave={onUpdateTask}
            onDelete={onDeleteTask}
            onClose={() => setPopupOpen(false)}
            isSubtask={false}
          />
        )}
      </div>

      {!completed ? (
        <div className="space-y-1.5">
          {subtasks.map((subtask) => (
            <SubtaskRow
              key={subtask.id}
              task={subtask}
              teamMembers={teamMembers}
              categories={categories}
              onToggle={onToggle}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              isUpdating={isUpdating}
            />
          ))}
          <div className="ml-6 flex items-center gap-2">
            <input
              type="text"
              value={subtaskInput ?? ""}
              onChange={(event) => onSubtaskInputChange(task.id, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onCreateSubtask(task);
                }
              }}
              placeholder="Aggiungi subtask..."
              className="min-w-0 flex-1 rounded-md border border-[#48484a] bg-[#3a3a3c] px-2 py-1.5 text-xs text-white outline-none ring-[#0a84ff]/60 focus:ring"
            />
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#48484a] bg-[#3a3a3c] hover:border-[#0a84ff]">
              <span className="pointer-events-none text-xs">👤</span>
              <select
                value={subtaskAssignment ?? ""}
                onChange={(event) => onSubtaskAssignmentChange(task.id, event.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Assegna membro subtask"
              >
                <option value="">Non assegnato</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.user_name || member.user_email || "Membro"}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#48484a] bg-[#3a3a3c] hover:border-[#0a84ff]">
              <span className="pointer-events-none text-xs">📅</span>
              <input
                type="date"
                value={subtaskDate ?? ""}
                onChange={(event) => onSubtaskDateChange(task.id, event.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Data pianificata subtask"
              />
            </div>
            <button
              type="button"
              onClick={() => onCreateSubtask(task)}
              disabled={isCreatingSubtask}
              className="h-7 w-7 shrink-0 rounded-md bg-[#0a84ff] text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              +
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { studioId } = useStudio();
  const inputRefs = useRef({});
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [completedCategories, setCompletedCategories] = useState({});
  const [hideCompletedTasks, setHideCompletedTasks] = useState(
    () => localStorage.getItem(TASK_VISIBILITY_KEY) === "hide-completed",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [newTaskInputs, setNewTaskInputs] = useState({});
  const [newTaskAssignments, setNewTaskAssignments] = useState({});
  const [newTaskDates, setNewTaskDates] = useState({});
  const [subtaskInputs, setSubtaskInputs] = useState({});
  const [subtaskAssignments, setSubtaskAssignments] = useState({});
  const [subtaskDates, setSubtaskDates] = useState({});
  const [creatingSubtaskId, setCreatingSubtaskId] = useState(null);
  const [creatingCategory, setCreatingCategory] = useState("");
  const [serviceTemplates, setServiceTemplates] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      const [projectResult, tasksResult, membersResult, templatesResult] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("tasks")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: true }),
        supabase.from("team_members").select("id,user_name,user_email").eq("studio", studioId).order("user_name", { ascending: true }),
        supabase.from("service_task_templates").select("*").order("order", { ascending: true }),
      ]);

      if (projectResult.error) {
        setError(projectResult.error.message);
        setProject(null);
        setTasks([]);
        setLoading(false);
        return;
      }

      if (tasksResult.error) {
        setError(tasksResult.error.message);
        setProject(projectResult.data ?? null);
        setTasks([]);
        setLoading(false);
        return;
      }

      if (membersResult.error) {
        setError(membersResult.error.message);
        setProject(projectResult.data ?? null);
        setTasks(tasksResult.data ?? []);
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      setProject(projectResult.data ?? null);
      setTasks(tasksResult.data ?? []);
      setTeamMembers(membersResult.data ?? []);
      setServiceTemplates(templatesResult.data ?? []);
      setCompletedCategories(projectResult.data?.completed_categories ?? {});
      setLoading(false);
    };

    loadData();
  }, [id]);

  const selectedServices = useMemo(
    () => (Array.isArray(project?.servizi_selezionati) ? project.servizi_selezionati : []),
    [project],
  );

  const groupedTasks = useMemo(
    () =>
      selectedServices.map((category) => {
        const categoryTasks = tasks.filter((task) => (task.categoria ?? "") === category);
        const visibleTasks = categoryTasks.filter(
          (task) => !hideCompletedTasks || task.status !== "completed",
        );
        const totalCount = categoryTasks.length;
        const completedCount = categoryTasks.filter((task) => task.status === "completed").length;

        return {
          category,
          completedCount,
          totalCount,
          tasks: sortTasksForColumn(
            visibleTasks.filter((task) => !task.parent_task_id),
          ),
        };
      }),
    [hideCompletedTasks, selectedServices, tasks],
  );

  const subtasksByParent = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!task.parent_task_id) {
        return acc;
      }
      if (!acc[task.parent_task_id]) {
        acc[task.parent_task_id] = [];
      }
      if (!hideCompletedTasks || task.status !== "completed") {
        acc[task.parent_task_id].push(task);
      }
      return acc;
    }, {});
  }, [hideCompletedTasks, tasks]);

  useEffect(() => {
    localStorage.setItem(TASK_VISIBILITY_KEY, hideCompletedTasks ? "hide-completed" : "show-all");
  }, [hideCompletedTasks]);

  const handleToggleTask = async (task) => {
    if (!task?.id) {
      return;
    }

    const nextStatus = task.status === "completed" ? "todo" : "completed";
    const previousTasks = tasks;

    let optimisticTasks = tasks.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item));
    const taskIsSubtask = Boolean(task.parent_task_id);

    if (taskIsSubtask) {
      const siblingSubtasks = optimisticTasks.filter((item) => item.parent_task_id === task.parent_task_id);
      const allSiblingsCompleted =
        siblingSubtasks.length > 0 && siblingSubtasks.every((item) => item.status === "completed");
      optimisticTasks = optimisticTasks.map((item) =>
        item.id === task.parent_task_id
          ? { ...item, status: allSiblingsCompleted ? "completed" : "todo" }
          : item,
      );
    }

    setUpdatingTaskId(task.id);
    setTasks(optimisticTasks);

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ status: nextStatus })
      .eq("id", task.id);

    if (updateError) {
      setTasks(previousTasks);
      setError(updateError.message);
    } else {
      if (taskIsSubtask) {
        const parent = optimisticTasks.find((item) => item.id === task.parent_task_id);
        const { error: parentUpdateError } = await supabase
          .from("tasks")
          .update({ status: parent?.status ?? "todo" })
          .eq("id", task.parent_task_id);

        if (parentUpdateError) {
          setTasks(previousTasks);
          setError(parentUpdateError.message);
        } else {
          setError("");
        }
      } else {
        setError("");
      }
    }

    setUpdatingTaskId(null);
  };

  const handleUpdateTask = async (task, updates) => {
    if (!task?.id || String(task.id).startsWith("tmp-")) {
      return;
    }

    const previousTasks = tasks;
    setUpdatingTaskId(task.id);
    setTasks((prev) =>
      prev.map((item) => (item.id === task.id ? { ...item, ...updates } : item)),
    );

    const { error: updateError } = await supabase.from("tasks").update(updates).eq("id", task.id);

    if (updateError) {
      setTasks(previousTasks);
      setError(updateError.message);
    } else {
      setError("");
    }

    setUpdatingTaskId(null);
  };

  const handleArchiveProject = async () => {
    if (!window.confirm("Archiviare questo progetto? Non sarà più visibile nella lista attiva.")) return;
    setArchiving(true);
    console.log("Archiving project id:", id);
    const { error: archiveError } = await supabase
      .from("projects")
      .update({ archived: true })
      .eq("id", id);
    if (archiveError) {
      console.error("Archive error:", archiveError);
      alert("Errore archiviazione: " + archiveError.message);
      setArchiving(false);
      return;
    }
    navigate("/progetti");
  };

  const handleDeleteTask = async (task) => {
    if (!task?.id) return;
    const { error: delError } = await supabase.from("tasks").delete().eq("id", task.id);
    if (delError) {
      setError(delError.message);
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setError("");
    }
  };

  const openEdit = () => {
    setEditForm({
      name: project?.name ?? "",
      client: project?.client ?? "",
      address: project?.address ?? "",
      start_date: project?.start_date ?? "",
      selectedServices: Array.isArray(project?.servizi_selezionati) ? [...project.servizi_selezionati] : [],
      selectedMembers: Array.isArray(project?.assigned_users) ? [...project.assigned_users] : [],
    });
    setEditError("");
    setEditOpen(true);
    setMenuOpen(false);
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editForm.name.trim() || !editForm.client.trim()) {
      setEditError("Nome e cliente sono obbligatori.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    const payload = {
      name: editForm.name.trim(),
      client: editForm.client.trim(),
      address: editForm.address.trim() || null,
      start_date: editForm.start_date || null,
      servizi_selezionati: editForm.selectedServices,
      assigned_users: editForm.selectedMembers ?? [],
    };
    const { error: updateError } = await supabase.from("projects").update(payload).eq("id", id);
    if (updateError) {
      setEditError(updateError.message);
      setEditSaving(false);
      return;
    }
    setProject((prev) => (prev ? { ...prev, ...payload } : prev));
    setEditSaving(false);
    setEditOpen(false);
  };

  const toggleEditService = (serviceName) => {
    setEditForm((prev) => {
      const has = prev.selectedServices.includes(serviceName);
      return {
        ...prev,
        selectedServices: has
          ? prev.selectedServices.filter((s) => s !== serviceName)
          : [...prev.selectedServices, serviceName],
      };
    });
  };

  const handleToggleCategory = async (category) => {
    const nextCompletedCategories = {
      ...completedCategories,
      [category]: !completedCategories[category],
    };
    const previousCompletedCategories = completedCategories;

    setCompletedCategories(nextCompletedCategories);
    setProject((prev) => (prev ? { ...prev, completed_categories: nextCompletedCategories } : prev));

    const { error: updateError } = await supabase
      .from("projects")
      .update({ completed_categories: nextCompletedCategories })
      .eq("id", id);

    if (updateError) {
      setCompletedCategories(previousCompletedCategories);
      setProject((prev) => (prev ? { ...prev, completed_categories: previousCompletedCategories } : prev));
      setError(updateError.message);
    } else {
      setError("");
    }
  };

  const handleTaskInputChange = (category, value) => {
    setNewTaskInputs((prev) => ({ ...prev, [category]: value }));
  };

  const handleNewTaskAssignmentChange = (category, value) => {
    setNewTaskAssignments((prev) => ({ ...prev, [category]: value }));
  };

  const handleNewTaskDateChange = (category, value) => {
    setNewTaskDates((prev) => ({ ...prev, [category]: value }));
  };

  const handleSubtaskInputChange = (taskId, value) => {
    setSubtaskInputs((prev) => ({ ...prev, [taskId]: value }));
  };

  const handleSubtaskAssignmentChange = (taskId, value) => {
    setSubtaskAssignments((prev) => ({ ...prev, [taskId]: value }));
  };

  const handleSubtaskDateChange = (taskId, value) => {
    setSubtaskDates((prev) => ({ ...prev, [taskId]: value }));
  };

  const createSubtask = async (parentTask) => {
    const title = (subtaskInputs[parentTask.id] ?? "").trim();
    if (!title || creatingSubtaskId) {
      return;
    }

    setCreatingSubtaskId(parentTask.id);
    const rawAssignedId = subtaskAssignments[parentTask.id];
    const assignedMemberId = (rawAssignedId && rawAssignedId !== "null" && rawAssignedId !== "undefined") ? rawAssignedId : null;
    const assignedMember = teamMembers.find((m) => m.id === assignedMemberId);
    const assignedToName = assignedMember ? assignedMember.user_name || assignedMember.user_email || null : null;
    const plannedDate = subtaskDates[parentTask.id] || null;
    const optimisticId = `tmp-subtask-${Date.now()}`;
    const optimisticSubtask = {
      id: optimisticId,
      project_id: id,
      parent_task_id: parentTask.id,
      title,
      categoria: parentTask.categoria,
      status: "todo",
      assigned_member: assignedMemberId,  // già sanitizzato sopra
      assigned_to_name: assignedToName,
      data_pianificata: plannedDate,
      created_at: new Date().toISOString(),
    };

    setTasks((prev) =>
      prev
        .map((task) => (task.id === parentTask.id ? { ...task, status: "todo" } : task))
        .concat(optimisticSubtask),
    );
    setSubtaskInputs((prev) => ({ ...prev, [parentTask.id]: "" }));
    setSubtaskAssignments((prev) => ({ ...prev, [parentTask.id]: "" }));
    setSubtaskDates((prev) => ({ ...prev, [parentTask.id]: "" }));

    const { data, error: insertError } = await supabase
      .from("tasks")
      .insert({
        project_id: id,
        parent_task_id: parentTask.id,
        title,
        categoria: parentTask.categoria,
        status: "todo",
        assigned_member: assignedMemberId || null,  // assicura null reale, non stringa 'null'
        assigned_to_name: assignedToName,
        data_pianificata: plannedDate,
        studio: studioId,
      })
      .select("*")
      .single();

    if (insertError) {
      setTasks((prev) => prev.filter((task) => task.id !== optimisticId));
      setError(insertError.message);
    } else {
      const { error: parentUpdateError } = await supabase
        .from("tasks")
        .update({ status: "todo" })
        .eq("id", parentTask.id);

      if (parentUpdateError) {
        setError(parentUpdateError.message);
      } else {
        setTasks((prev) =>
          prev.map((task) => (task.id === optimisticId ? { ...task, ...data } : task)),
        );
        setError("");
      }
    }

    setCreatingSubtaskId(null);
  };

  const createTaskForCategory = async (category) => {
    const title = (newTaskInputs[category] ?? "").trim();
    if (!title || creatingCategory) {
      return;
    }

    setCreatingCategory(category);
    const optimisticId = `tmp-${Date.now()}`;
    const rawAssignedId = newTaskAssignments[category];
    const assignedMemberId = (rawAssignedId && rawAssignedId !== "null" && rawAssignedId !== "undefined") ? rawAssignedId : null;
    const assignedMember = teamMembers.find((member) => member.id === assignedMemberId);
    const assignedToName = assignedMember ? assignedMember.user_name || assignedMember.user_email || null : null;
    const plannedDate = newTaskDates[category] || null;
    const optimisticTask = {
      id: optimisticId,
      project_id: id,
      title,
      categoria: category,
      status: "todo",
      assigned_member: assignedMemberId,  // già sanitizzato sopra
      assigned_to_name: assignedToName,
      data_pianificata: plannedDate,
      order: 0,
      created_at: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, optimisticTask]);
    setNewTaskInputs((prev) => ({ ...prev, [category]: "" }));
    setNewTaskAssignments((prev) => ({ ...prev, [category]: "" }));
    setNewTaskDates((prev) => ({ ...prev, [category]: "" }));

    const { data, error: insertError } = await supabase
      .from("tasks")
      .insert({
        project_id: id,
        title,
        categoria: category,
        status: "todo",
        assigned_member: assignedMemberId || null,  // assicura null reale, non stringa 'null'
        assigned_to_name: assignedToName,
        data_pianificata: plannedDate,
        order: 0,
        studio: studioId,
      })
      .select("*")
      .single();

    if (insertError) {
      setTasks((prev) => prev.filter((task) => task.id !== optimisticId));
      setError(insertError.message);
    } else {
      setTasks((prev) =>
        prev.map((task) => (task.id === optimisticId ? { ...task, ...data } : task)),
      );
      setError("");
      inputRefs.current[category]?.focus();
    }

    setCreatingCategory("");
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
        Caricamento progetto...
      </section>
    );
  }

  if (error && !project) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-red-300">
        Errore: {error}
      </section>
    );
  }

  if (!project) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
        Progetto non trovato.
      </section>
    );
  }

  return (
    <div>
      <section className="mb-6 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{project.name ?? "Progetto"}</h2>
            <select
              value={hideCompletedTasks ? "hide-completed" : "show-all"}
              onChange={(event) => setHideCompletedTasks(event.target.value === "hide-completed")}
              className="rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]"
            >
              <option value="show-all">Mostra tutte le task</option>
              <option value="hide-completed">Nascondi completate</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/progetti")}
              className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:border-[#0a84ff] hover:bg-white/10"
            >
              Torna ai Progetti
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#48484a] text-lg text-white hover:border-[#0a84ff] hover:bg-white/10"
                aria-label="Opzioni progetto"
              >
                ···
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-30 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-[#48484a] bg-[#2c2c2e] shadow-xl">
                  <button
                    type="button"
                    onClick={openEdit}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10"
                  >
                    ✏️ Modifica
                  </button>
                  <button
                    type="button"
                    onClick={handleArchiveProject}
                    disabled={archiving}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#ff453a] hover:bg-white/10 disabled:opacity-50"
                  >
                    📦 Archivia progetto
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-white/70">
          <span className="text-white/50">Cliente:</span> {project.client ?? "N/D"}
        </p>
        <p className="mt-1 text-sm text-white/70">
          <span className="text-white/50">Indirizzo:</span> {project.address ?? "N/D"}
        </p>
        {Array.isArray(project.assigned_users) && project.assigned_users.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-white/40">Team:</span>
            {project.assigned_users.map((uid) => {
              const m = teamMembers.find((tm) => tm.id === uid);
              if (!m) return null;
              const name = m.user_name || m.user_email || "?";
              const colors = ["#0a84ff","#64d2ff","#5e5ce6","#30d158","#bf5af2","#ff9f0a"];
              let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
              const bg = colors[Math.abs(h) % colors.length];
              const initials = name.trim().split(/\s+/).filter(Boolean).slice(0,2).map((w)=>w[0].toUpperCase()).join("");
              return (
                <span key={uid} title={name} className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: bg }}>
                  {initials}
                </span>
              );
            })}
          </div>
        )}
      </section>

      {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!editSaving) setEditOpen(false); }}>
          <div className="w-full max-w-xl rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Modifica Progetto</h3>
              <button type="button" onClick={() => setEditOpen(false)} className="text-white/50 hover:text-white">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveEdit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Nome progetto *</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Cliente *</label>
                <input type="text" value={editForm.client} onChange={(e) => setEditForm((p) => ({ ...p, client: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Indirizzo</label>
                <input type="text" value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Data inizio</label>
                <input type="date" value={editForm.start_date} onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-white/80">Servizi</p>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                  {serviceTemplates.length === 0 ? (
                    <p className="text-sm text-white/50">Nessun servizio disponibile</p>
                  ) : (
                    serviceTemplates.map((svc) => {
                      const label = svc.service_name ?? "Servizio";
                      return (
                        <label key={svc.id ?? label} className="flex cursor-pointer items-center gap-2 text-sm text-white/90">
                          <input type="checkbox" checked={editForm.selectedServices.includes(label)} onChange={() => toggleEditService(label)} className="h-4 w-4 accent-[#0a84ff]" />
                          <span>{label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-white/80">Membri del team</p>
                <div className="max-h-36 space-y-2 overflow-y-auto rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-white/50">Nessun membro disponibile</p>
                  ) : (
                    teamMembers.map((m) => {
                      const checked = (editForm.selectedMembers ?? []).includes(m.id);
                      return (
                        <label key={m.id} className="flex cursor-pointer items-center gap-2 text-sm text-white/90">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setEditForm((prev) => ({
                              ...prev,
                              selectedMembers: checked
                                ? (prev.selectedMembers ?? []).filter((id) => id !== m.id)
                                : [...(prev.selectedMembers ?? []), m.id],
                            }))}
                            className="h-4 w-4 accent-[#0a84ff]"
                          />
                          <span>{m.user_name || m.user_email}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
              {editError ? <p className="text-sm text-red-300">{editError}</p> : null}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setEditOpen(false)} disabled={editSaving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">Annulla</button>
                <button type="submit" disabled={editSaving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{editSaving ? "Salvataggio..." : "Salva"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedServices.length === 0 ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          Nessun servizio selezionato per questo progetto.
        </section>
      ) : groupedTasks.length === 0 ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          Nessun task per questo progetto.
        </section>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            overflowX: "auto",
            overflowY: "hidden",
            width: "calc(100vw - 220px)",
            height: "calc(100vh - 160px)",
            gap: "16px",
            padding: "16px",
          }}
        >
          {groupedTasks.map((group) => {
            const categoryCompleted = Boolean(completedCategories[group.category]);

            return (
            <div
              key={group.category}
              style={{
                flex: "0 0 calc((100vw - 220px - 64px) / 3)",
                minWidth: "calc((100vw - 220px - 64px) / 3)",
                maxWidth: "calc((100vw - 220px - 64px) / 3)",
                display: "flex",
                flexDirection: "column",
                background: "#2c2c2e",
                borderRadius: "12px",
                border: "1px solid #48484a",
                overflow: "hidden",
                height: "100%",
                opacity: categoryCompleted ? 0.5 : 1,
              }}
            >
              {/* Header colonna — fisso */}
              <div style={{ flexShrink: 0, padding: "12px", borderBottom: "1px solid #48484a" }}>
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={categoryCompleted}
                    onChange={() => handleToggleCategory(group.category)}
                    className="h-4 w-4 accent-[#30d158]"
                  />
                  <h3 className="text-base font-semibold text-white">{group.category}</h3>
                  <span className="ml-auto rounded-md border border-[#48484a] px-2 py-0.5 text-xs text-white/70">
                    {group.completedCount}/{group.totalCount}
                  </span>
                  {categoryCompleted ? <span className="text-sm font-semibold text-[#30d158]">✓</span> : null}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={(node) => { inputRefs.current[group.category] = node; }}
                    type="text"
                    value={newTaskInputs[group.category] ?? ""}
                    onChange={(event) => handleTaskInputChange(group.category, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        createTaskForCategory(group.category);
                      }
                    }}
                    placeholder="Aggiungi task..."
                    className="min-w-0 flex-1 rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  />
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#48484a] bg-[#3a3a3c] text-white hover:border-[#0a84ff]">
                    <span className="pointer-events-none text-base">👤</span>
                    <select
                      value={newTaskAssignments[group.category] ?? ""}
                      onChange={(event) => handleNewTaskAssignmentChange(group.category, event.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Assegna membro"
                    >
                      <option value="">Non assegnato</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.user_name || member.user_email || "Membro"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#48484a] bg-[#3a3a3c] text-white hover:border-[#0a84ff]">
                    <span className="pointer-events-none text-base">📅</span>
                    <input
                      type="date"
                      value={newTaskDates[group.category] ?? ""}
                      onChange={(event) => handleNewTaskDateChange(group.category, event.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Data pianificata"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => createTaskForCategory(group.category)}
                    disabled={creatingCategory === group.category}
                    className="h-9 w-9 shrink-0 rounded-lg bg-[#0a84ff] text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Lista task — scrollabile */}
              <div style={{ flex: 1, overflowY: "auto", padding: "12px", minHeight: 0 }} className="space-y-2">
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id ?? `${group.category}-${task.title}`}
                    task={task}
                    teamMembers={teamMembers}
                    categories={selectedServices}
                    subtasks={sortTasksForColumn(subtasksByParent[task.id] ?? [])}
                    subtaskInput={subtaskInputs[task.id]}
                    subtaskAssignment={subtaskAssignments[task.id]}
                    subtaskDate={subtaskDates[task.id]}
                    onToggle={handleToggleTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onSubtaskInputChange={handleSubtaskInputChange}
                    onSubtaskAssignmentChange={handleSubtaskAssignmentChange}
                    onSubtaskDateChange={handleSubtaskDateChange}
                    onCreateSubtask={createSubtask}
                    isUpdating={updatingTaskId === task.id}
                    isCreatingSubtask={creatingSubtaskId === task.id}
                  />
                ))}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
