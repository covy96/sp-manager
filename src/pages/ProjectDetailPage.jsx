import { useEffect, useMemo, useRef, useState } from "react";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useNavigate, useParams } from "react-router-dom";
import { useStudio } from "../hooks/useStudio";
import { usePermissions } from "../hooks/usePermissions";
import { usePlan } from "../hooks/usePlan";
import { supabase } from "../lib/supabase";
import PraticaEdiliziaPanel from '../components/PraticaEdiliziaPanel';
import AnagraficaPanel from '../components/AnagraficaPanel';
import OrePanel from '../components/OrePanel';
import CommessePanel from '../components/CommessePanel';
import ReportCantierePanel from '../components/ReportCantierePanel';
import { ProjectForm } from './ProjectsPage';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { notifyTaskAssigned } from '../lib/notifications';

const AVATAR_COLORS = ["#13315C","#1a6b3c","#7c3aed","#b45309","#be185d","#0e7490"];
function avatarColor(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name = "") {
  return name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");
}

const TASK_VISIBILITY_KEY = "projectDetailTaskVisibility";

function sortTasksForColumn(tasks) {
  return [...tasks].sort((a, b) => {
    const ac = a.status === "completed", bc = b.status === "completed";
    if (ac !== bc) return ac ? 1 : -1;
    const ts = v => v ? new Date(v).getTime() : Number.MAX_SAFE_INTEGER;
    return ts(a.created_at) - ts(b.created_at);
  });
}

// ── TASK EDIT POPUP ───────────────────────────────────────────────
function TaskEditPopup({ task, teamMembers, categories, onSave, onDelete, onClose, isSubtask }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  const ref = useRef(null);
  const [form, setForm] = useState({
    title: task.title ?? task.name ?? "",
    categoria: task.categoria ?? "",
    assigned_member: task.assigned_member ?? "",
    data_pianificata: task.data_pianificata ?? "",
    note: task.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useBodyScrollLock(true);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const updates = { title: form.title.trim(), assigned_member: form.assigned_member || null, data_pianificata: form.data_pianificata || null, note: form.note || null };
    if (!isSubtask) updates.categoria = form.categoria || null;
    await onSave(task, updates);
    setSaving(false); onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm("Eliminare questo task?")) return;
    setDeleting(true); await onDelete(task); setDeleting(false); onClose();
  };

  const inputSt = {
    width: '100%', padding: '6px 10px', border: `0.5px solid ${T.borderMd}`,
    background: T.surface, color: T.ink, fontSize: 12,
    fontFamily: "'Space Grotesk', sans-serif", outline: 'none', boxSizing: 'border-box',
  };
  const labelSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 4 };

  // Form condiviso tra mobile e desktop
  const formContent = (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div>
        <label style={labelSt}>Nome</label>
        <input type="text" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={inputSt} autoFocus/>
      </div>
      {!isSubtask && categories.length > 0 && (
        <div>
          <label style={labelSt}>Categoria</label>
          <select value={form.categoria} onChange={e=>setForm(p=>({...p,categoria:e.target.value}))} style={inputSt}>
            <option value="">Nessuna</option>
            {categories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
      <div>
        <label style={labelSt}>Assegnato a</label>
        <select value={form.assigned_member} onChange={e=>setForm(p=>({...p,assigned_member:e.target.value}))} style={inputSt}>
          <option value="">Non assegnato</option>
          {teamMembers.map(m=><option key={m.id} value={m.id}>{m.user_name||m.user_email||"Membro"}</option>)}
        </select>
      </div>
      <div>
        <label style={labelSt}>Data pianificata</label>
        <input type="date" value={form.data_pianificata} onChange={e=>setForm(p=>({...p,data_pianificata:e.target.value}))} style={inputSt}/>
      </div>
      <div>
        <label style={labelSt}>Note</label>
        <textarea rows={2} value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} style={{...inputSt,resize:'vertical'}}/>
      </div>
      <div style={{ display:'flex', gap:8, paddingTop:4 }}>
        <button onClick={handleSave} disabled={saving||!form.title.trim()} style={{ flex:1, padding:'7px 0', background:T.navy, color:T.bg, border:'none', cursor:saving?'not-allowed':'pointer', fontSize:11, fontFamily:"'IBM Plex Mono', monospace", letterSpacing:'0.08em', opacity:saving||!form.title.trim()?0.6:1 }}>{saving?"Salvo...":"Salva"}</button>
        <button onClick={handleDelete} disabled={deleting} style={{ padding:'7px 12px', background:T.red, color:T.surface, border:'none', cursor:'pointer', fontSize:11, fontFamily:"'IBM Plex Mono', monospace" }}>{deleting?"...":"Elimina"}</button>
      </div>
    </div>
  );

  // Su mobile: modal centrato fullscreen
  if (isMobile) return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(14,14,13,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div ref={ref} onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:380, background:T.surface, border:`0.5px solid ${T.borderMd}`, padding:20, maxHeight:'85vh', overflowY:'auto' }}>
        {formContent}
      </div>
    </div>
  );

  // Desktop: dropdown assoluto
  return (
    <div ref={ref} onClick={e=>e.stopPropagation()} style={{
      position:'absolute', left:0, top:'100%', zIndex:50, marginTop:4,
      width:280, background:T.surface, border:`0.5px solid ${T.borderMd}`,
      padding:14, boxShadow:`0 4px 16px ${T.border}`,
    }}>
      {formContent}
    </div>
  );
}

// ── SUBTASK ROW ───────────────────────────────────────────────────
function SubtaskRow({ task, teamMembers, categories, onToggle, onUpdateTask, onDeleteTask, isUpdating }) {
  const { T } = useTheme();
  const done = task.status === "completed";
  const [popupOpen, setPopupOpen] = useState(false);
  return (
    <div style={{
      position: 'relative', marginLeft: 20,
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '5px 8px', background: T.bg,
      border: `0.5px solid ${T.border}`,
      opacity: done ? 0.4 : isUpdating ? 0.5 : 1,
    }}>
      <button onClick={() => onToggle(task)} disabled={isUpdating} style={{
        marginTop: 2, width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
        border: `1px solid ${done ? T.navy : T.borderMd}`,
        background: done ? T.navy : 'transparent',
        cursor: 'pointer', padding: 0,
      }} />
      <button onClick={() => setPopupOpen(v => !v)} style={{
        flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 11, color: done ? T.muted : T.ink,
        textDecoration: done ? 'line-through' : 'none',
        fontFamily: "'Space Grotesk', sans-serif",
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{task.title ?? task.name ?? "Subtask"}</button>
      {popupOpen && <TaskEditPopup task={task} teamMembers={teamMembers} categories={categories} onSave={onUpdateTask} onDelete={onDeleteTask} onClose={() => setPopupOpen(false)} isSubtask />}
    </div>
  );
}

// ── TASK ROW ──────────────────────────────────────────────────────
function TaskRow({ task, teamMembers, categories, subtasks, subtaskInput, subtaskAssignment, subtaskDate, onToggle, onUpdateTask, onDeleteTask, onSubtaskInputChange, onSubtaskAssignmentChange, onSubtaskDateChange, onCreateSubtask, isUpdating, isCreatingSubtask, currentMemberId }) {
  const { T } = useTheme();
  const done = task.status === "completed";
  const [popupOpen, setPopupOpen] = useState(false);

  const assignedName = task.assigned_member ? (teamMembers.find(m => m.id === task.assigned_member)?.user_name || teamMembers.find(m => m.id === task.assigned_member)?.user_email) : null;

  const inputSt = {
    padding: '6px 10px', border: `0.5px solid ${T.border}`, background: T.surface,
    color: T.ink, fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", outline: 'none',
  };
  const miniBtn = {
    width: 28, height: 28, flexShrink: 0, border: `0.5px solid ${T.border}`,
    background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', position: 'relative', overflow: 'hidden',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '8px 10px', background: T.surface, border: `0.5px solid ${T.border}`,
        opacity: done ? 0.4 : isUpdating ? 0.5 : 1,
        cursor: isUpdating ? 'not-allowed' : 'default',
      }}>
        <button onClick={() => onToggle(task)} disabled={isUpdating} style={{
          marginTop: 2, width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
          border: `1px solid ${done ? T.navy : T.borderMd}`,
          background: done ? T.navy : 'transparent',
          cursor: 'pointer', padding: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setPopupOpen(v => !v)} style={{
              flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: done ? T.muted : T.ink,
              textDecoration: done ? 'line-through' : 'none',
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{task.title ?? task.name ?? "Task"}</button>
            {assignedName && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, letterSpacing: '0.05em', border: `0.5px solid ${T.border}`, padding: '1px 6px', flexShrink: 0 }}>
                {assignedName}
              </span>
            )}
            {task.data_pianificata && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, flexShrink: 0 }}>
                {task.data_pianificata}
              </span>
            )}
          </div>
        </div>
        {popupOpen && <TaskEditPopup task={task} teamMembers={teamMembers} categories={categories} onSave={onUpdateTask} onDelete={onDeleteTask} onClose={() => setPopupOpen(false)} isSubtask={false} />}
      </div>

      {!done && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {subtasks.map(st => (
            <SubtaskRow key={st.id} task={st} teamMembers={teamMembers} categories={categories}
              onToggle={onToggle} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} isUpdating={isUpdating} />
          ))}
          <div style={{ marginLeft: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="text" value={subtaskInput ?? ""} onChange={e => onSubtaskInputChange(task.id, e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onCreateSubtask(task); } }}
              placeholder="Aggiungi subtask..." style={{ ...inputSt, flex: 1, minWidth: 0 }} />
            <div style={miniBtn} aria-label="Assegna membro subtask" title={teamMembers.find(m=>m.id===(subtaskAssignment??currentMemberId))?.user_name || 'Assegna'}>
              <span style={{ pointerEvents: 'none', fontSize: 12 }}>👤</span>
              <select value={subtaskAssignment ?? (currentMemberId ?? "")} onChange={e => onSubtaskAssignmentChange(task.id, e.target.value)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}>
                <option value="">Non assegnato</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.user_name || m.user_email}</option>)}
              </select>
            </div>
            <div style={miniBtn}>
              <span style={{ pointerEvents: 'none', fontSize: 12 }}>📅</span>
              <input type="date" value={subtaskDate ?? ""} onChange={e => onSubtaskDateChange(task.id, e.target.value)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            </div>
            <button onClick={() => onCreateSubtask(task)} disabled={isCreatingSubtask} style={{
              width: 28, height: 28, background: T.navy, color: T.bg,
              border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>+</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { T } = useTheme();
  usePageTitleOnMount("Progetto");
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { id: projectId } = useParams();
  const { studioId, teamMember } = useStudio();
  const permissions = usePermissions();
  const { isPro } = usePlan();
  const id = projectId;
  const inputRefs = useRef({});

  const [project, setProject]         = useState(null);
  const [tasks, setTasks]             = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [completedCategories, setCompletedCategories] = useState({});
  const [hideCompletedTasks, setHideCompletedTasks] = useState(
    () => localStorage.getItem(TASK_VISIBILITY_KEY) === "hide-completed"
  );
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [newTaskInputs, setNewTaskInputs]   = useState({});
  const [newTaskAssignments, setNewTaskAssignments] = useState({});
  const [newTaskDates, setNewTaskDates]     = useState({});
  const [subtaskInputs, setSubtaskInputs]   = useState({});
  const [subtaskAssignments, setSubtaskAssignments] = useState({});
  const [subtaskDates, setSubtaskDates]     = useState({});
  const [creatingSubtaskId, setCreatingSubtaskId] = useState(null);
  const [creatingCategory, setCreatingCategory]   = useState("");
  const [serviceTemplates, setServiceTemplates]   = useState([]);
  const [globalContacts, setGlobalContacts]       = useState([]);
  const [editOpen, setEditOpen]       = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [archiving, setArchiving]     = useState(false);
  const [editForm, setEditForm]       = useState({});
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState("");
  const [commesseProgetto, setCommesseProgetto] = useState([]);
  const [addColInput, setAddColInput]           = useState("");
  const [addColOpen, setAddColOpen]             = useState(false);
  // drag-to-reorder columns
  const [dragColIdx, setDragColIdx]             = useState(null);
  const [dragOverIdx, setDragOverIdx]           = useState(null);
  const touchDragRef = useRef({ active: false, timer: null, fromIdx: null, phantom: null });

  useEffect(() => {
    if (!projectId || projectId === "null" || projectId === "undefined") { navigate("/progetti"); return; }
    const loadData = async () => {
      setLoading(true); setError("");
      const membersQ = studioId
        ? supabase.from("team_members").select("id,user_name,user_email").eq("studio", studioId).order("user_name", { ascending: true })
        : Promise.resolve({ data: [], error: null });
      const gcQ = studioId
        ? supabase.from("global_contacts").select("id,full_name").eq("studio", studioId).order("full_name", { ascending: true })
        : Promise.resolve({ data: [], error: null });
      const [pR, tR, mR, sR, gcR] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
        supabase.from("tasks").select("*").eq("project_id", projectId).order("created_at", { ascending: true }),
        membersQ,
        supabase.from("service_task_templates").select("*").eq("studio", studioId).order("order", { ascending: true }),
        gcQ,
      ]);
      if (pR.error) { setError(pR.error.message); setProject(null); setTasks([]); setLoading(false); return; }
      if (tR.error) { setError(tR.error.message); setProject(pR.data ?? null); setTasks([]); setLoading(false); return; }
      setProject(pR.data ?? null);
      setTasks(tR.data ?? []);
      setTeamMembers(mR.data ?? []);
      setServiceTemplates(sR.data ?? []);
      setGlobalContacts(gcR.data ?? []);
      setCompletedCategories(pR.data?.completed_categories ?? {});
      const { data: commProg } = await supabase.from('commesse').select('id,nome_commessa,cliente,importo_offerta_base,importo_totale,importo_incassato,stato_pagamento,archived').eq('project_id', projectId).eq('studio', studioId).order('created_at', { ascending: false });
      setCommesseProgetto(commProg ?? []);
      setLoading(false);
    };
    loadData();
  }, [projectId, studioId]);

  const selectedServices = useMemo(() => {
    // Deduplicazione case-insensitive: mantieni la prima occorrenza per ogni nome normalizzato
    const dedup = (arr) => {
      const seen = new Map();
      return arr.filter(s => {
        const key = s.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.set(key, true);
        return true;
      });
    };
    // Prima usa servizi_selezionati salvati nel progetto
    if (Array.isArray(project?.servizi_selezionati) && project.servizi_selezionati.length > 0) {
      return dedup(project.servizi_selezionati);
    }
    // Fallback: ricava le categorie dalle task esistenti
    const cats = dedup([...new Set(tasks.map(t => t.categoria).filter(Boolean))]);
    // Se ci sono anche task senza categoria, aggiungi un bucket generico
    const hasUncategorized = tasks.some(t => !t.categoria);
    if (hasUncategorized) cats.push("__uncategorized__");
    return cats;
  }, [project, tasks]);

  const groupedTasks = useMemo(() => selectedServices.map(category => {
    const isUncategorized = category === "__uncategorized__";
    // Confronto case-insensitive + trim: "Design" e "DESIGN" vanno nella stessa colonna
    const catTasks = isUncategorized
      ? tasks.filter(t => !t.categoria)
      : tasks.filter(t => (t.categoria ?? "").trim().toLowerCase() === category.trim().toLowerCase());
    const visible = catTasks.filter(t => !hideCompletedTasks || t.status !== "completed");
    return {
      category,
      completedCount: catTasks.filter(t => t.status === "completed").length,
      totalCount: catTasks.length,
      tasks: sortTasksForColumn(visible.filter(t => !t.parent_task_id)),
    };
  }), [hideCompletedTasks, selectedServices, tasks]);

  const subtasksByParent = useMemo(() => tasks.reduce((acc, t) => {
    if (!t.parent_task_id) return acc;
    if (!acc[t.parent_task_id]) acc[t.parent_task_id] = [];
    if (!hideCompletedTasks || t.status !== "completed") acc[t.parent_task_id].push(t);
    return acc;
  }, {}), [hideCompletedTasks, tasks]);

  useEffect(() => {
    localStorage.setItem(TASK_VISIBILITY_KEY, hideCompletedTasks ? "hide-completed" : "show-all");
  }, [hideCompletedTasks]);

  const handleToggleTask = async task => {
    if (!task?.id) return;
    const nextStatus = task.status === "completed" ? "todo" : "completed";
    const prev = tasks;
    let optimistic = tasks.map(i => i.id === task.id ? { ...i, status: nextStatus } : i);
    if (task.parent_task_id) {
      const siblings = optimistic.filter(i => i.parent_task_id === task.parent_task_id);
      const allDone = siblings.length > 0 && siblings.every(i => i.status === "completed");
      optimistic = optimistic.map(i => i.id === task.parent_task_id ? { ...i, status: allDone ? "completed" : "todo" } : i);
    }
    setUpdatingTaskId(task.id); setTasks(optimistic);
    const { error: uErr } = await supabase.from("tasks").update({ status: nextStatus }).eq("id", task.id);
    if (uErr) { setTasks(prev); setError(uErr.message); }
    else if (task.parent_task_id) {
      const parent = optimistic.find(i => i.id === task.parent_task_id);
      const { error: pErr } = await supabase.from("tasks").update({ status: parent?.status ?? "todo" }).eq("id", task.parent_task_id);
      if (pErr) { setTasks(prev); setError(pErr.message); } else setError("");
    } else setError("");
    setUpdatingTaskId(null);
  };

  const handleUpdateTask = async (task, updates) => {
    if (!task?.id || String(task.id).startsWith("tmp-")) return;
    const prev = tasks; setUpdatingTaskId(task.id);
    setTasks(p => p.map(i => i.id === task.id ? { ...i, ...updates } : i));
    const { error: uErr } = await supabase.from("tasks").update(updates).eq("id", task.id);
    if (uErr) { setTasks(prev); setError(uErr.message); }
    else {
      setError("");
      if (updates.assigned_member && updates.assigned_member !== task.assigned_member && updates.assigned_member !== teamMember?.id) {
        const assignedMember = teamMembers.find(m => m.id === updates.assigned_member);
        if (assignedMember?.user_email) notifyTaskAssigned({ studioId, assignedEmail: assignedMember.user_email, taskTitle: task.title, projectName: project?.name || "", taskId: task.id, projectId: task.project_id || null });
      }
    }
    setUpdatingTaskId(null);
  };

  const handleDeleteTask = async task => {
    if (!task?.id) return;
    const { error: dErr } = await supabase.rpc('elimina_task', { p_task_id: task.id });
    if (dErr) setError(dErr.message);
    else { setTasks(p => p.filter(t => t.id !== task.id)); setError(""); }
  };

  const handleArchiveProject = async () => {
    if (!window.confirm("Archiviare questo progetto?")) return;
    setArchiving(true);
    const { error: aErr } = await supabase.from("projects").update({ archived: true }).eq("id", id);
    if (aErr) { alert("Errore: " + aErr.message); setArchiving(false); return; }
    navigate("/progetti");
  };

  const openEdit = () => {
    setEditForm({
      name: project?.name ?? "",
      client: project?.client ?? "",
      address: project?.address ?? "",
      start_date: project?.start_date ?? "",
      gantt_enabled: project?.gantt_enabled ?? false,
      selectedServices: Array.isArray(project?.servizi_selezionati) ? [...project.servizi_selezionati] : [],
      selectedMembers: Array.isArray(project?.assigned_users) ? [...project.assigned_users] : [],
    });
    setEditError(""); setEditOpen(true); setMenuOpen(false);
  };

  const handleSaveEdit = async e => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.client.trim()) { setEditError("Nome e cliente sono obbligatori."); return; }
    setEditSaving(true); setEditError("");
    const payload = {
      name: editForm.name.trim(),
      client: editForm.client.trim(),
      address: editForm.address?.trim() || null,
      start_date: editForm.start_date || null,
      gantt_enabled: !!editForm.gantt_enabled,
      servizi_selezionati: editForm.selectedServices,
      assigned_users: editForm.selectedMembers ?? [],
    };
    const { error: uErr } = await supabase.from("projects").update(payload).eq("id", id);
    if (uErr) { setEditError(uErr.message); setEditSaving(false); return; }
    setProject(p => p ? { ...p, ...payload } : p);
    setEditSaving(false); setEditOpen(false);
  };

  const handleToggleCategory = async category => {
    const next = { ...completedCategories, [category]: !completedCategories[category] };
    const prev = completedCategories;
    setCompletedCategories(next); setProject(p => p ? { ...p, completed_categories: next } : p);
    const { error: uErr } = await supabase.from("projects").update({ completed_categories: next }).eq("id", id);
    if (uErr) { setCompletedCategories(prev); setProject(p => p ? { ...p, completed_categories: prev } : p); setError(uErr.message); } else setError("");
  };

  const handleAddColumn = async () => {
    const name = addColInput.trim();
    if (!name) return;
    const current = Array.isArray(project?.servizi_selezionati) ? project.servizi_selezionati : selectedServices;
    const alreadyExists = current.some(s => s.trim().toLowerCase() === name.toLowerCase());
    if (alreadyExists) { setAddColInput(""); setAddColOpen(false); return; }
    const next = [...current, name];
    setProject(p => p ? { ...p, servizi_selezionati: next } : p);
    setAddColInput(""); setAddColOpen(false);
    await supabase.from("projects").update({ servizi_selezionati: next }).eq("id", id);
  };

  const handleReorderColumns = async (newOrder) => {
    setProject(p => p ? { ...p, servizi_selezionati: newOrder } : p);
    await supabase.from("projects").update({ servizi_selezionati: newOrder }).eq("id", id);
  };

  const createTaskForCategory = async category => {
    const title = (newTaskInputs[category] ?? "").trim();
    if (!title || creatingCategory) return;
    setCreatingCategory(category);
    // Default: assegna al creatore; se l'utente ha scelto esplicitamente usa quella scelta
    const memberId = category in newTaskAssignments
      ? (newTaskAssignments[category] || null)
      : (teamMember?.id || null);
    const member = teamMembers.find(m => m.id === memberId);
    const plannedDate = newTaskDates[category] || null;
    const optimisticId = `tmp-${Date.now()}`;
    const dbCategoria = category === "__uncategorized__" ? null : category;
    setTasks(p => [...p, { id: optimisticId, project_id: id, title, categoria: dbCategoria, status: "todo", assigned_member: memberId, assigned_to_name: member?.user_name || member?.user_email || null, data_pianificata: plannedDate, order: 0, created_at: new Date().toISOString() }]);
    // Reset: elimina la chiave così il prossimo task torna a defaultare al creatore
    setNewTaskInputs(p => ({ ...p, [category]: "" }));
    setNewTaskAssignments(p => { const n = {...p}; delete n[category]; return n; });
    setNewTaskDates(p => ({ ...p, [category]: "" }));
    const { data, error: iErr } = await supabase.from("tasks").insert({ project_id: projectId || null, title, categoria: dbCategoria, status: "todo", assigned_member: memberId || null, assigned_to_name: member?.user_name || member?.user_email || null, data_pianificata: plannedDate || null, order: 0, studio: studioId || null }).select("*").single();
    if (iErr) { setTasks(p => p.filter(t => t.id !== optimisticId)); setError(iErr.message); }
    else {
      setTasks(p => p.map(t => t.id === optimisticId ? { ...t, ...data } : t)); setError(""); inputRefs.current[category]?.focus();
      if (memberId && memberId !== teamMember?.id) {
        const assignedMember = teamMembers.find(m => m.id === memberId);
        if (assignedMember?.user_email) notifyTaskAssigned({ studioId, assignedEmail: assignedMember.user_email, taskTitle: title, projectName: project?.name || "", taskId: data.id, projectId: projectId || null });
      }
    }
    setCreatingCategory("");
  };

  const createSubtask = async parentTask => {
    const title = (subtaskInputs[parentTask.id] ?? "").trim();
    if (!title || creatingSubtaskId) return;
    setCreatingSubtaskId(parentTask.id);
    const memberId = parentTask.id in subtaskAssignments
      ? (subtaskAssignments[parentTask.id] || null)
      : (teamMember?.id || null);
    const member = teamMembers.find(m => m.id === memberId);
    const plannedDate = subtaskDates[parentTask.id] || null;
    const optimisticId = `tmp-subtask-${Date.now()}`;
    setTasks(p => p.map(t => t.id === parentTask.id ? { ...t, status: "todo" } : t).concat({ id: optimisticId, project_id: id, parent_task_id: parentTask.id, title, categoria: parentTask.categoria, status: "todo", assigned_member: memberId, assigned_to_name: member?.user_name || member?.user_email || null, data_pianificata: plannedDate, created_at: new Date().toISOString() }));
    setSubtaskInputs(p => ({ ...p, [parentTask.id]: "" }));
    setSubtaskAssignments(p => { const n = {...p}; delete n[parentTask.id]; return n; });
    setSubtaskDates(p => ({ ...p, [parentTask.id]: "" }));
    const { data, error: iErr } = await supabase.from("tasks").insert({ project_id: projectId || null, parent_task_id: parentTask.id || null, title, categoria: parentTask.categoria || null, status: "todo", assigned_member: memberId || null, assigned_to_name: member?.user_name || member?.user_email || null, data_pianificata: plannedDate || null, studio: studioId || null }).select("*").single();
    if (iErr) { setTasks(p => p.filter(t => t.id !== optimisticId)); setError(iErr.message); }
    else {
      await supabase.from("tasks").update({ status: "todo" }).eq("id", parentTask.id);
      setTasks(p => p.map(t => t.id === optimisticId ? { ...t, ...data } : t)); setError("");
      if (memberId && memberId !== teamMember?.id) {
        const assignedMember = teamMembers.find(m => m.id === memberId);
        if (assignedMember?.user_email) notifyTaskAssigned({ studioId, assignedEmail: assignedMember.user_email, taskTitle: title, projectName: project?.name || "", taskId: data.id, projectId: projectId || null });
      }
    }
    setCreatingSubtaskId(null);
  };

  const inputSt = {
    padding: '7px 10px', border: `0.5px solid ${T.border}`, background: T.surface,
    color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', flex: 1, minWidth: 0,
  };
  const miniBtn = {
    width: 32, height: 32, flexShrink: 0, border: `0.5px solid ${T.border}`, background: T.surface,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', position: 'relative', overflow: 'hidden',
  };
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
      Caricamento progetto...
    </div>
  );
  if (error && !project) return <div style={{ border: `0.5px solid ${T.border}`, background: T.surface, padding: 32, color: T.red, fontSize: 13 }}>Errore: {error}</div>;
  if (!project) return <div style={{ border: `0.5px solid ${T.border}`, background: T.surface, padding: 32, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Progetto non trovato.</div>;

  return (
    <div>
      {/* PROJECT HEADER */}
      <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, padding: '18px 22px', marginBottom: 16 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          {/* Titolo + filtro */}
          <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
            <div style={{ fontSize:20, fontWeight:600, letterSpacing:'-0.02em', color:T.ink }}>{project.name ?? "Progetto"}</div>
            <select value={hideCompletedTasks ? "hide-completed" : "show-all"}
              onChange={e => setHideCompletedTasks(e.target.value === "hide-completed")}
              style={{ padding:'5px 10px', border:`0.5px solid ${T.borderMd}`, background:T.bg, color:T.ink, fontSize:11, fontFamily:"'IBM Plex Mono', monospace", outline:'none', cursor:'pointer' }}>
              <option value="show-all">Tutte le task</option>
              <option value="hide-completed">Nascondi completate</option>
            </select>
          </div>
          {/* Pulsanti */}
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            {selectedServices.some(s => s.toUpperCase().includes('PRATICA EDILIZIA')) && (
              <PraticaEdiliziaPanel projectId={id} studioId={studioId} />
            )}
            <OrePanel projectId={id} studioId={studioId} />
            {isPro && permissions.canViewReportCantiere && (
              <ReportCantierePanel
                projectId={id}
                studioId={studioId}
                canManage={permissions.canManageReportCantiere}
              />
            )}
            <AnagraficaPanel projectId={id} studioId={studioId} />
            <CommessePanel commesse={commesseProgetto} />
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(p => !p)} style={{
                border: `0.5px solid ${T.borderMd}`, background: 'transparent', color: T.ink,
                width: 34, height: 34, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>···</button>
              {menuOpen && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 180, background: T.surface, border: `0.5px solid ${T.borderMd}`, zIndex: 30 }}>
                  <button onClick={openEdit} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink, letterSpacing: '0.05em' }}>
                    Modifica
                  </button>
                  <button onClick={handleArchiveProject} disabled={archiving} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, letterSpacing: '0.05em' }}>
                    {archiving ? "Archiviazione..." : "Archivia progetto"}
                  </button>
                  <button onClick={async () => {
                    if (!window.confirm(`Eliminare il progetto "${project?.name}"? Verrà spostato nel cestino.`)) return;
                    setMenuOpen(false);
                    const { error: dErr } = await supabase.rpc('elimina_progetto', { p_project_id: id });
                    if (dErr) { alert('Errore: ' + dErr.message); return; }
                    navigate('/progetti');
                  }} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, letterSpacing: '0.05em' }}>
                    Elimina progetto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Meta */}
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>
            <span style={{ marginRight: 6 }}>Cliente:</span>{project.client ?? "N/D"}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>
            <span style={{ marginRight: 6 }}>Indirizzo:</span>{project.address ?? "N/D"}
          </div>
        </div>

        {/* Team avatars */}
        {Array.isArray(project.assigned_users) && project.assigned_users.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, letterSpacing: '0.15em' }}>TEAM</span>
            {project.assigned_users.map((uid, i) => {
              const m = teamMembers.find(tm => tm.id === uid);
              if (!m) return null;
              const name = m.user_name || m.user_email || "?";
              const initials = name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");
              return (
                <span key={uid} title={name} style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: avatarColor(name), border: `1.5px solid ${T.surface}`, marginLeft: i > 0 ? -8 : 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 600, color: T.surface,
                }}>{initials}</span>
              );
            })}
          </div>
        )}
      </div>

      {error && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, marginBottom: 12 }}>{error}</div>}

      {/* EDIT MODAL */}
      {editOpen && (
        <div onClick={() => { if (!editSaving) setEditOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,14,13,0.5)', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: T.surface, border: `0.5px solid ${T.borderMd}`, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>Modifica Progetto</div>
              <button onClick={() => setEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 18 }}>×</button>
            </div>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <ProjectForm
                data={{ ...editForm, selectedServices: editForm.selectedServices, selectedMembers: editForm.selectedMembers }}
                onChange={field => e => setEditForm(p => ({ ...p, [field]: e.target.value }))}
                teamMembers={teamMembers}
                serviceTemplates={serviceTemplates}
                globalContacts={globalContacts}
                currentMemberId={teamMember?.id ?? null}
                isEdit={true}
                onToggleMember={id => setEditForm(p => ({ ...p, selectedMembers: (p.selectedMembers ?? []).includes(id) ? (p.selectedMembers ?? []).filter(x => x !== id) : [...(p.selectedMembers ?? []), id] }))}
                onToggleService={label => setEditForm(p => ({ ...p, selectedServices: (p.selectedServices ?? []).includes(label) ? (p.selectedServices ?? []).filter(s => s !== label) : [...(p.selectedServices ?? []), label] }))}
                clientSuggestions={[]}
                onSelectClient={name => setEditForm(p => ({ ...p, client: name }))}
                onGanttChange={e => setEditForm(p => ({ ...p, gantt_enabled: e.target.checked }))}
              />
              {editError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red }}>{editError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: `0.5px solid ${T.border}` }}>
                <button type="button" onClick={() => setEditOpen(false)} disabled={editSaving} style={{ border: `0.5px solid ${T.borderMd}`, background: 'transparent', color: T.ink, padding: '8px 18px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer' }}>Annulla</button>
                <button type="submit" disabled={editSaving} style={{ border: 'none', background: T.navy, color: T.bg, padding: '8px 18px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer' }}>{editSaving ? "Salvataggio..." : "Salva"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KANBAN COLUMNS */}
      {selectedServices.length === 0 ? (
        <div style={{ border: `0.5px solid ${T.border}`, background: T.surface, padding: 48, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
          Nessun servizio selezionato per questo progetto.
        </div>
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'row', overflowX: 'auto', overflowY: 'hidden',
          width: isMobile ? '100%' : 'calc(100vw - 220px - 56px)',
          height: isMobile ? 'auto' : 'calc(100vh - 180px)',
          scrollSnapType: isMobile ? 'x mandatory' : 'none',
          WebkitOverflowScrolling: 'touch',
          gap: 10, paddingBottom: isMobile ? 16 : 8,
          paddingLeft: isMobile ? 16 : 0,
          paddingRight: isMobile ? 16 : 0,
          boxSizing: 'border-box',
        }}>
          {groupedTasks.map((group, gi) => {
            const catDone = Boolean(completedCategories[group.category]);
            const isDragging  = dragColIdx  === gi;
            const isDropTarget = dragOverIdx === gi && dragColIdx !== gi;

            // ── Touch drag handlers ─────────────────────────────────
            const handleTouchStart = (e) => {
              const ref = touchDragRef.current;
              ref.fromIdx = gi;
              ref.timer = setTimeout(() => {
                ref.active = true;
                // haptic feedback if available
                if (navigator.vibrate) navigator.vibrate(40);
                setDragColIdx(gi);
              }, 500);
            };
            const handleTouchMove = (e) => {
              const ref = touchDragRef.current;
              if (!ref.active) { clearTimeout(ref.timer); return; }
              e.preventDefault();
              const touch = e.touches[0];
              const el = document.elementFromPoint(touch.clientX, touch.clientY);
              const colEl = el?.closest('[data-col-idx]');
              if (colEl) {
                const idx = parseInt(colEl.dataset.colIdx, 10);
                if (!isNaN(idx)) setDragOverIdx(idx);
              }
            };
            const handleTouchEnd = () => {
              const ref = touchDragRef.current;
              clearTimeout(ref.timer);
              if (ref.active && dragOverIdx !== null && dragOverIdx !== ref.fromIdx) {
                const next = [...selectedServices];
                const [moved] = next.splice(ref.fromIdx, 1);
                next.splice(dragOverIdx, 0, moved);
                handleReorderColumns(next);
              }
              ref.active = false; ref.fromIdx = null;
              setDragColIdx(null); setDragOverIdx(null);
            };

            return (
              <div
                key={group.category}
                data-col-idx={gi}
                draggable
                onDragStart={() => { setDragColIdx(gi); setDragOverIdx(gi); }}
                onDragOver={e => { e.preventDefault(); setDragOverIdx(gi); }}
                onDrop={() => {
                  if (dragColIdx !== null && dragColIdx !== gi) {
                    const next = [...selectedServices];
                    const [moved] = next.splice(dragColIdx, 1);
                    next.splice(gi, 0, moved);
                    handleReorderColumns(next);
                  }
                  setDragColIdx(null); setDragOverIdx(null);
                }}
                onDragEnd={() => { setDragColIdx(null); setDragOverIdx(null); }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  flex: isMobile ? `0 0 calc(100vw - 48px)` : '0 0 calc((100vw - 220px - 56px - 20px) / 3)',
                  minWidth: isMobile ? 'calc(100vw - 48px)' : 'calc((100vw - 220px - 56px - 20px) / 3)',
                  maxWidth: isMobile ? 'calc(100vw - 48px)' : 'calc((100vw - 220px - 56px - 20px) / 3)',
                  scrollSnapAlign: isMobile ? 'start' : 'none',
                  display: 'flex', flexDirection: 'column',
                  background: T.surface,
                  border: isDropTarget ? `1.5px solid ${T.navy}` : `0.5px solid ${T.border}`,
                  overflow: 'hidden',
                  height: isMobile ? 'auto' : '100%',
                  maxHeight: isMobile ? 'none' : '100%',
                  opacity: isDragging ? 0.4 : catDone ? 0.5 : 1,
                  transition: 'opacity 0.15s, border-color 0.15s',
                  cursor: 'default',
                }}>
                {/* Column header */}
                <div style={{ flexShrink: 0, padding: 12, borderBottom: `0.5px solid ${T.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    {/* Drag handle */}
                    <span
                      title="Trascina per riordinare"
                      style={{ fontSize: 13, color: T.muted, cursor: 'grab', userSelect: 'none', flexShrink: 0, lineHeight: 1, touchAction: 'none' }}>
                      ⠿
                    </span>
                    <input type="checkbox" checked={catDone} onChange={() => handleToggleCategory(group.category)}
                      style={{ accentColor: T.navy, width: 13, height: 13 }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 500, color: T.ink, letterSpacing: '0.05em', flex: 1 }}>
                      {group.category === "__uncategorized__" ? "Generali" : group.category}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, border: `0.5px solid ${T.border}`, padding: '1px 6px' }}>
                      {group.completedCount}/{group.totalCount}
                    </span>
                    {catDone && <span style={{ fontSize: 11, color: T.navy, fontWeight: 600 }}>✓</span>}
                  </div>
                  {/* Add task input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input ref={node => { inputRefs.current[group.category] = node; }}
                      type="text" value={newTaskInputs[group.category] ?? ""}
                      onChange={e => setNewTaskInputs(p => ({ ...p, [group.category]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createTaskForCategory(group.category); } }}
                      placeholder="Aggiungi task..."
                      style={{ ...inputSt, fontSize: 11 }} />
                    <div style={miniBtn} title={teamMembers.find(m=>m.id===(newTaskAssignments[group.category]??teamMember?.id))?.user_name || 'Assegna'}>
                      <span style={{ pointerEvents: 'none', fontSize: 12 }}>👤</span>
                      <select value={newTaskAssignments[group.category] ?? (teamMember?.id ?? "")} onChange={e => setNewTaskAssignments(p => ({ ...p, [group.category]: e.target.value }))}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}>
                        <option value="">Non assegnato</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.user_name || m.user_email}</option>)}
                      </select>
                    </div>
                    <div style={miniBtn}>
                      <span style={{ pointerEvents: 'none', fontSize: 12 }}>📅</span>
                      <input type="date" value={newTaskDates[group.category] ?? ""} onChange={e => setNewTaskDates(p => ({ ...p, [group.category]: e.target.value }))}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                    </div>
                    <button onClick={() => createTaskForCategory(group.category)} disabled={creatingCategory === group.category}
                      style={{ width: 32, height: 32, background: T.navy, color: T.bg, border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 600, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      +
                    </button>
                  </div>
                </div>

                {/* Task list */}
                <div style={{ flex: isMobile ? '0 0 auto' : 1, overflowY: isMobile ? 'visible' : 'auto', padding: 10, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {group.tasks.map(task => (
                    <TaskRow
                      key={task.id ?? `${group.category}-${task.title}`}
                      task={task} teamMembers={teamMembers} categories={selectedServices}
                      subtasks={sortTasksForColumn(subtasksByParent[task.id] ?? [])}
                      subtaskInput={subtaskInputs[task.id]} subtaskAssignment={subtaskAssignments[task.id]} subtaskDate={subtaskDates[task.id]}
                      onToggle={handleToggleTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask}
                      onSubtaskInputChange={(id, v) => setSubtaskInputs(p => ({ ...p, [id]: v }))}
                      onSubtaskAssignmentChange={(id, v) => setSubtaskAssignments(p => ({ ...p, [id]: v }))}
                      onSubtaskDateChange={(id, v) => setSubtaskDates(p => ({ ...p, [id]: v }))}
                      onCreateSubtask={createSubtask}
                      isUpdating={updatingTaskId === task.id}
                      isCreatingSubtask={creatingSubtaskId === task.id}
                      currentMemberId={teamMember?.id ?? null}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Colonna "Aggiungi colonna" — sempre in fondo */}
          {addColOpen ? (
            <div style={{
              flex: isMobile ? `0 0 calc(100vw - 48px)` : '0 0 220px',
              minWidth: isMobile ? 'calc(100vw - 48px)' : '220px',
              maxWidth: isMobile ? 'calc(100vw - 48px)' : '220px',
              scrollSnapAlign: isMobile ? 'start' : 'none',
              display: 'flex', flexDirection: 'column',
              background: T.surface, border: `0.5px solid ${T.border}`,
              height: isMobile ? 'auto' : 'fit-content',
              padding: 14, gap: 8, alignSelf: 'flex-start',
            }}>
              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:T.muted }}>Nome nuova colonna</span>
              <input autoFocus type="text" value={addColInput}
                onChange={e => setAddColInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddColumn(); } if (e.key === 'Escape') { setAddColOpen(false); setAddColInput(""); } }}
                placeholder="es. In revisione"
                style={{ padding:'7px 10px', border:`0.5px solid ${T.border}`, background:T.bg, color:T.ink, fontSize:12, fontFamily:"'Space Grotesk',sans-serif", outline:'none' }} />
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={handleAddColumn}
                  style={{ flex:1, padding:'7px 0', background:T.navy, color:T.bg, border:'none', cursor:'pointer', fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>
                  Crea
                </button>
                <button onClick={() => { setAddColOpen(false); setAddColInput(""); }}
                  style={{ flex:1, padding:'7px 0', background:'transparent', color:T.muted, border:`0.5px solid ${T.border}`, cursor:'pointer', fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <div onClick={() => setAddColOpen(true)} style={{
              flex: isMobile ? `0 0 calc(100vw - 48px)` : '0 0 160px',
              minWidth: isMobile ? 'calc(100vw - 48px)' : '160px',
              maxWidth: isMobile ? 'calc(100vw - 48px)' : '160px',
              scrollSnapAlign: isMobile ? 'start' : 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
              background: 'transparent', border: `0.5px dashed ${T.border}`,
              cursor: 'pointer', padding: 20, gap: 8,
              alignSelf: 'flex-start', minHeight: 80,
            }}>
              <span style={{ fontSize: 22, color: T.muted, lineHeight: 1 }}>+</span>
              <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:T.muted, textAlign:'center' }}>Aggiungi colonna</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
