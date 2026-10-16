import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useStudio } from "../hooks/useStudio";
import { usePermissions } from "../hooks/usePermissions";
import { usePlan } from "../hooks/usePlan";
import { supabase } from "../lib/supabase";
import PraticaEdiliziaPanel from '../components/PraticaEdiliziaPanel';
import AnagraficaPanel from '../components/AnagraficaPanel';
import OrePanel from '../components/OrePanel';
import CommessePanel from '../components/CommessePanel';
import ReportCantierePanel from '../components/ReportCantierePanel';
import CapexPanel from '../components/CapexPanel';
import CapitolatoPanel from '../components/CapitolatoPanel';
import DocumentiPanel from '../components/DocumentiPanel';
import ProjectNotes from '../components/ProjectNotes';
import LinkedCommesseField from '../components/LinkedCommesseField';
import SlidingTabs from '../components/SlidingTabs';
import { ProjectForm } from './ProjectsPage';
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { notifyTaskAssigned } from '../lib/notifications';
import { useToast } from "../contexts/ToastContext";
import { usePresence } from "../hooks/usePresence";

const AVATAR_COLORS = ["#13315C","#1a6b3c","#7c3aed","#b45309","#be185d","#0e7490"];
function avatarColor(name) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name = "") {
  return name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");
}

const TASK_VISIBILITY_KEY = "projectDetailTaskVisibility";

const MESI_BREVI = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
// "2026-10-17" → "17 ott" (anno solo se diverso da quello corrente)
function formatShortDate(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(iso);
  const sameYear = y === new Date().getFullYear();
  return `${d} ${MESI_BREVI[m - 1]}${sameYear ? "" : ` ${y}`}`;
}
function formatEuro(n, compact = false) {
  const v = Number(n) || 0;
  if (compact && Math.abs(v) >= 10000) return `${(v / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })}k €`;
  return `${Math.round(v).toLocaleString("it-IT")} €`;
}
function todayIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ProgressBar({ perc, color, T }) {
  return (
    <div style={{ height: 4, background: T.borderMd, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
      <div style={{ height: 4, width: `${Math.max(0, Math.min(100, perc))}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
    </div>
  );
}

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
    title:            task.title ?? task.name ?? "",
    categoria:        task.categoria ?? "",
    assigned_member:  task.assigned_member ?? "",
    data_pianificata: task.data_pianificata ?? "",
    ora_pianificata:  task.ora_pianificata ?? "",
    note:             task.note ?? "",
    priority:         task.priority ?? "",
    is_recurring:     task.is_recurring ?? false,
    recurrence_rule:  task.recurrence_rule ?? "weekly",
    recurrence_end:   task.recurrence_end ?? "",
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
    const updates = { title: form.title.trim(), assigned_member: form.assigned_member || null, data_pianificata: form.data_pianificata || null, ora_pianificata: form.data_pianificata ? (form.ora_pianificata || null) : null, note: form.note || null, priority: form.priority || null, is_recurring: form.is_recurring, recurrence_rule: form.is_recurring ? form.recurrence_rule : null, recurrence_end: form.is_recurring && form.recurrence_end ? form.recurrence_end : null };
    if (!isSubtask) updates.categoria = form.categoria || null;
    await onSave(task, updates);
    setSaving(false); onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm("Eliminare questo task?")) return;
    setDeleting(true); await onDelete(task); setDeleting(false); onClose();
  };

  const inputSt = {
    width: '100%', padding: '6px 10px', border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm,
    background: T.surface, color: T.ink, fontSize: 12,
    fontFamily: "var(--font-ui)", outline: 'none', boxSizing: 'border-box',
  };
  const labelSt = { fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 4 };

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
      <div style={{ display:'flex', gap:8 }}>
        <div style={{ flex:1 }}>
          <label style={labelSt}>Data pianificata</label>
          <input type="date" value={form.data_pianificata} onChange={e=>setForm(p=>({...p,data_pianificata:e.target.value}))} style={inputSt}/>
        </div>
        <div style={{ width:100 }}>
          <label style={labelSt}>Ora</label>
          <input type="time" value={form.ora_pianificata} disabled={!form.data_pianificata}
            onChange={e=>setForm(p=>({...p,ora_pianificata:e.target.value}))}
            style={{...inputSt, opacity: form.data_pianificata ? 1 : 0.5}}
            title={form.data_pianificata ? "Ti avviso a quest'ora" : "Imposta prima la data"}/>
        </div>
      </div>
      {/* Priorità */}
      <div>
        <label style={labelSt}>Priorità</label>
        <div style={{ display:'flex', gap:6 }}>
          {[{id:"", label:"Normale", color:"#6b7280"},{id:"bassa", label:"Bassa", color:"#2563eb"},{id:"media", label:"Media", color:"#d97706"},{id:"alta", label:"Alta", color:"#dc2626"}].map(p => (
            <button key={p.id} type="button" onClick={()=>setForm(f=>({...f,priority:p.id}))}
              style={{ flex:1, padding:'6px 0', fontFamily:"var(--font-label)", fontSize:10, letterSpacing:'0.05em',
                border:`0.5px solid ${form.priority===p.id ? p.color : T.border}`,
                borderRadius:T.radiusSm, cursor:'pointer',
                background: form.priority===p.id ? p.color+"22" : "transparent",
                color: form.priority===p.id ? p.color : T.muted }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={labelSt}>Note</label>
        <textarea rows={2} value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} style={{...inputSt,resize:'vertical'}}/>
      </div>
      {/* Ricorrenza */}
      {!isSubtask && (
        <div style={{ borderTop:`0.5px solid ${T.border}`, paddingTop:10 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: form.is_recurring ? 8 : 0 }}>
            <label style={labelSt}>Ricorrente</label>
            <button type="button" onClick={()=>setForm(p=>({...p,is_recurring:!p.is_recurring}))} style={{ width:36, height:20, borderRadius:10, background:form.is_recurring?T.navy:T.border, border:'none', cursor:'pointer', position:'relative', transition:'background 0.15s', flexShrink:0 }}>
              <span style={{ position:'absolute', top:2, left:form.is_recurring?18:2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.15s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
            </button>
          </div>
          {form.is_recurring && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <select value={form.recurrence_rule} onChange={e=>setForm(p=>({...p,recurrence_rule:e.target.value}))} style={inputSt}>
                <option value="daily">Ogni giorno</option>
                <option value="weekly">Ogni settimana</option>
                <option value="biweekly">Ogni 2 settimane</option>
                <option value="monthly">Ogni mese</option>
              </select>
              <div>
                <label style={labelSt}>Termina il (opzionale)</label>
                <input type="date" value={form.recurrence_end} onChange={e=>setForm(p=>({...p,recurrence_end:e.target.value}))} style={inputSt}/>
              </div>
            </div>
          )}
        </div>
      )}
      <div style={{ display:'flex', gap:8, paddingTop:4 }}>
        <button onClick={handleSave} disabled={saving||!form.title.trim()} style={{ flex:1, padding:'8px 0', background:T.navy, color:T.bg, border:'none', cursor:saving?'not-allowed':'pointer', fontSize:11, fontFamily:"var(--font-label)", letterSpacing:'0.08em', opacity:saving||!form.title.trim()?0.6:1 }}>{saving?"Salvo...":"Salva"}</button>
        <button onClick={handleDelete} disabled={deleting} style={{ padding:'8px 12px', background:T.red, color:T.surface, border:'none', cursor:'pointer', fontSize:11, fontFamily:"var(--font-label)" }}>{deleting?"...":"Elimina"}</button>
      </div>
    </div>
  );

  // Su mobile: modal centrato fullscreen. Portal su <body>: le colonne hanno
  // backdrop-filter, che altrimenti farebbe da riferimento al position:fixed.
  if (isMobile) return createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(14,14,13,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div ref={ref} onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:380, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, borderRadius: T.radiusSm, boxShadow:T.shadowLg, padding:20, maxHeight:'85vh', overflowY:'auto' }}>
        {formContent}
      </div>
    </div>,
    document.body
  );

  // Desktop: dropdown assoluto
  return (
    <div ref={ref} onClick={e=>e.stopPropagation()} style={{
      position:'absolute', left:0, top:'100%', zIndex:50, marginTop:4,
      width:280, background:T.surface, border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm,
      padding:16, boxShadow:`0 4px 16px ${T.border}`,
    }}>
      {formContent}
    </div>
  );
}

// ── PICCOLI ELEMENTI DELLE RIGHE ──────────────────────────────────
function MemberAvatar({ name, size = 20 }) {
  if (!name) return null;
  return (
    <span title={name} style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: avatarColor(name), color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "var(--font-ui)", fontSize: Math.round(size * 0.42), fontWeight: 700,
    }}>{getInitials(name)}</span>
  );
}

function DueChip({ task, T }) {
  if (!task.data_pianificata) return null;
  const today = todayIsoDate();
  const overdue = task.status !== "completed" && task.data_pianificata < today;
  const isToday = task.data_pianificata === today;
  const color = overdue ? '#ff3b30' : isToday ? '#ff9500' : T.muted;
  return (
    <span title={task.data_pianificata} style={{ fontFamily: "var(--font-label)", fontSize: 10, color, flexShrink: 0, whiteSpace: 'nowrap' }}>
      {isToday ? "Oggi" : formatShortDate(task.data_pianificata)}{task.ora_pianificata ? ` · ${String(task.ora_pianificata).slice(0,5)}` : ""}
    </span>
  );
}

function CheckCircle({ done, size, onClick, disabled, T }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={done ? "Riapri" : "Completa"} style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, padding: 0,
      border: `1.5px solid ${done ? T.navy : T.borderHeavy}`,
      background: done ? T.navy : 'transparent', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size - 6, lineHeight: 1, cursor: 'pointer',
    }}>{done ? "✓" : ""}</button>
  );
}

// ── SUBTASK ROW ───────────────────────────────────────────────────
function SubtaskRow({ task, teamMembers, categories, onToggle, onUpdateTask, onDeleteTask, isUpdating }) {
  const { T } = useTheme();
  const done = task.status === "completed";
  const [popupOpen, setPopupOpen] = useState(false);
  const assigned = task.assigned_member ? teamMembers.find(m => m.id === task.assigned_member) : null;
  return (
    <div className="pd-row" style={{
      position: 'relative', marginLeft: 26,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 8px', borderRadius: 8,
      opacity: done ? 0.45 : isUpdating ? 0.5 : 1,
    }}>
      <CheckCircle done={done} size={14} onClick={() => onToggle(task)} disabled={isUpdating} T={T} />
      <button onClick={() => setPopupOpen(v => !v)} style={{
        flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        fontSize: 12, color: done ? T.muted : T.ink,
        textDecoration: done ? 'line-through' : 'none',
        fontFamily: "var(--font-ui)",
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{task.title ?? task.name ?? "Subtask"}</button>
      <DueChip task={task} T={T} />
      <MemberAvatar name={assigned?.user_name || assigned?.user_email} size={18} />
      {popupOpen && <TaskEditPopup task={task} teamMembers={teamMembers} categories={categories} onSave={onUpdateTask} onDelete={onDeleteTask} onClose={() => setPopupOpen(false)} isSubtask />}
    </div>
  );
}

// ── TASK ROW ──────────────────────────────────────────────────────
function TaskRow({ task, teamMembers, categories, subtasks, subtaskInput, subtaskAssignment, subtaskDate, onToggle, onUpdateTask, onDeleteTask, onSubtaskInputChange, onSubtaskAssignmentChange, onSubtaskDateChange, onCreateSubtask, isUpdating, isCreatingSubtask, currentMemberId }) {
  const { T } = useTheme();
  const done = task.status === "completed";
  const [popupOpen, setPopupOpen] = useState(false);
  // Il campo "aggiungi subtask" resta nascosto finché non serve
  const [addingSub, setAddingSub] = useState(false);

  const assigned = task.assigned_member ? teamMembers.find(m => m.id === task.assigned_member) : null;
  const assignedName = assigned?.user_name || assigned?.user_email || null;
  const subDone = subtasks.filter(s => s.status === "completed").length;

  const inputSt = {
    height: 28, padding: '0 10px', border: `0.5px solid ${T.borderMd}`, borderRadius: 999, background: T.inputBg,
    color: T.ink, fontSize: 12, fontFamily: "var(--font-ui)", outline: 'none', boxSizing: 'border-box',
  };
  const miniBtn = {
    width: 28, height: 28, flexShrink: 0, border: `0.5px solid ${T.borderMd}`, borderRadius: '50%',
    background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', position: 'relative', overflow: 'hidden',
  };
  const priorityColor = { alta: '#ff3b30', media: '#ff9500', bassa: '#007aff' }[task.priority];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="pd-row" style={{
        position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 8px', borderRadius: 10,
        opacity: done ? 0.45 : isUpdating ? 0.5 : 1,
        cursor: isUpdating ? 'not-allowed' : 'default',
      }}>
        <CheckCircle done={done} size={18} onClick={() => onToggle(task)} disabled={isUpdating} T={T} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {priorityColor && <span title={`Priorità ${task.priority}`} style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor, flexShrink: 0 }}/>}
            <button onClick={() => setPopupOpen(v => !v)} style={{
              flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 13, color: done ? T.muted : T.ink,
              textDecoration: done ? 'line-through' : 'none',
              fontFamily: "var(--font-ui)", fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{task.title ?? task.name ?? "Task"}</button>
          </div>
          {(task.data_pianificata || task.is_recurring || subtasks.length > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, marginLeft: priorityColor ? 12 : 0 }}>
              <DueChip task={task} T={T} />
              {task.is_recurring && <span title={`Ricorrente: ${task.recurrence_rule}`} style={{ fontFamily: "var(--font-label)", fontSize: 10, color: T.navy }}>↻ ricorrente</span>}
              {subtasks.length > 0 && <span style={{ fontFamily: "var(--font-label)", fontSize: 10, color: T.muted }}>☰ {subDone}/{subtasks.length}</span>}
            </div>
          )}
        </div>
        {!done && (
          <button className="pd-row-action" aria-pressed={addingSub} onClick={() => setAddingSub(v => !v)} title="Aggiungi subtask" aria-label="Aggiungi subtask" style={{
            width: 24, height: 24, borderRadius: '50%', border: 'none', background: addingSub ? T.navyLight : 'transparent',
            color: addingSub ? T.navy : T.muted, cursor: 'pointer', fontSize: 15, lineHeight: 1, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>+</button>
        )}
        <MemberAvatar name={assignedName} size={22} />
        {popupOpen && <TaskEditPopup task={task} teamMembers={teamMembers} categories={categories} onSave={onUpdateTask} onDelete={onDeleteTask} onClose={() => setPopupOpen(false)} isSubtask={false} />}
      </div>

      {!done && (subtasks.length > 0 || addingSub) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 4 }}>
          {subtasks.map(st => (
            <SubtaskRow key={st.id} task={st} teamMembers={teamMembers} categories={categories}
              onToggle={onToggle} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} isUpdating={isUpdating} />
          ))}
          {addingSub && (
            <div style={{ marginLeft: 26, display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px' }}>
              <input type="text" autoFocus value={subtaskInput ?? ""} onChange={e => onSubtaskInputChange(task.id, e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); onCreateSubtask(task); }
                  if (e.key === 'Escape') setAddingSub(false);
                }}
                placeholder="Nuova subtask…" style={{ ...inputSt, flex: 1, minWidth: 0 }} />
              <div style={miniBtn} aria-label="Assegna membro subtask" title={teamMembers.find(m=>m.id===(subtaskAssignment??currentMemberId))?.user_name || 'Assegna'}>
                <span style={{ pointerEvents: 'none', fontSize: 11 }}>👤</span>
                <select value={subtaskAssignment ?? (currentMemberId ?? "")} onChange={e => onSubtaskAssignmentChange(task.id, e.target.value)}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}>
                  <option value="">Non assegnato</option>
                  {teamMembers.map(m => <option key={m.id} value={m.id}>{m.user_name || m.user_email}</option>)}
                </select>
              </div>
              <div style={{ ...miniBtn, borderColor: subtaskDate ? T.navy : T.borderMd }}>
                <span style={{ pointerEvents: 'none', fontSize: 11 }}>📅</span>
                <input type="date" value={subtaskDate ?? ""} onChange={e => onSubtaskDateChange(task.id, e.target.value)}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
              </div>
              <button onClick={() => onCreateSubtask(task)} disabled={isCreatingSubtask} aria-label="Aggiungi subtask" style={{
                width: 28, height: 28, borderRadius: '50%', background: T.navy, color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>+</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { T, isDark } = useTheme();
  const showToast = useToast();
  usePageTitleOnMount("Progetto");
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  // Apertura di un documento dal Centro documenti: offerte via rotta, gli altri
  // aprendo il pannello corrispondente (openSignal come nonce).
  const [docOpenReq, setDocOpenReq] = useState({ type: null, n: 0 });
  const openDoc = (type, docId) => {
    if (type === "offerte") { navigate(`/offerte/${docId}`, { state: { openDoc: true } }); return; }
    setDocOpenReq({ type, n: Date.now() });
  };
  const { id: projectId } = useParams();
  const { studioId, teamMember } = useStudio();
  const permissions = usePermissions();
  const { isPro } = usePlan();
  const id = projectId;
  const inputRefs = useRef({});

  // Se arriviamo qui da una commessa ("vuoi inserire una pratica?"), apri
  // automaticamente il form Nuova pratica. Consumiamo lo state una sola volta.
  const [autoOpenPratica] = useState(!!location.state?.openPraticaForm);
  useEffect(() => {
    if (location.state?.openPraticaForm) {
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── PRESENZA REALTIME ──────────────────────────────────────────
  const mePresence = teamMember ? {
    id:    teamMember.id,
    name:  teamMember.user_name || teamMember.user_email || "Anonimo",
    color: teamMember.color || "#13315C",
  } : null;
  const othersPresent = usePresence(projectId ? `project:${projectId}` : null, mePresence);

  const [project, setProject]         = useState(null);
  const [tasks, setTasks]             = useState([]);
  const [totaleOreProgetto, setTotaleOreProgetto] = useState(0);
  const [budgetEditOpen, setBudgetEditOpen]        = useState(false);
  const [budgetInput, setBudgetInput]              = useState("");
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
  const [newTaskTimes, setNewTaskTimes]     = useState({});
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
  const [commesseList, setCommesseList]         = useState([]); // per il select collegamento
  const [addColInput, setAddColInput]           = useState("");
  const [addColOpen, setAddColOpen]             = useState(false);
  // drag-to-reorder columns
  const [dragColIdx, setDragColIdx]             = useState(null);
  const [dragOverIdx, setDragOverIdx]           = useState(null);
  const touchDragRef = useRef({ active: false, timer: null, fromIdx: null, phantom: null });

  useEffect(() => {
    if (!projectId || projectId === "null" || projectId === "undefined") { navigate("/progetti"); return; }
    if (!studioId) return;
    const loadData = async () => {
      setLoading(true); setError("");
      const membersQ = supabase.from("team_members").select("id,user_name,user_email").eq("studio", studioId).order("user_name", { ascending: true });
      const gcQ = supabase.from("global_contacts").select("id,full_name").eq("studio", studioId).order("full_name", { ascending: true });
      const [pR, tR, mR, sR, gcR] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).eq("studio", studioId).maybeSingle(),
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
      // Incassato live dalle RATE PAGATE (il campo importo_incassato può essere disallineato)
      const commIds = (commProg ?? []).map(c => c.id);
      let rateMap = {};
      if (commIds.length) {
        const { data: rate } = await supabase
          .from('suddivisione_pagamenti')
          .select('commessa_id,pagato,importo_fisso,percentuale')
          .in('commessa_id', commIds)
          .is('deleted_at', null);
        (rate ?? []).filter(r => r.pagato).forEach(r => {
          const base = Number((commProg ?? []).find(c => c.id === r.commessa_id)?.importo_offerta_base || 0);
          rateMap[r.commessa_id] = (rateMap[r.commessa_id] || 0) + (Number(r.importo_fisso) || (base * (Number(r.percentuale) || 0) / 100));
        });
      }
      setCommesseProgetto((commProg ?? []).map(c => ({ ...c, _incassato: rateMap[c.id] || 0 })));
      const { data: allComm } = await supabase.from('commesse').select('id,nome_commessa,numero_offerta').eq('studio', studioId).eq('archived', false).order('created_at', { ascending: false });
      setCommesseList(allComm ?? []);
      const { data: tsRows } = await supabase.from('timesheet').select('hours').eq('project_id', projectId).is('deleted_at', null);
      setTotaleOreProgetto((tsRows || []).reduce((s, r) => s + (Number(r.hours) || 0), 0));
      setLoading(false);
    };
    loadData();
  }, [projectId, studioId]);

  const selectedServices = useMemo(() => {
    // Deduplicazione case-insensitive: mantieni la prima occorrenza per ogni nome normalizzato
    const dedup = (arr) => {
      const seen = new Map();
      return arr.filter(s => {
        if (!s || typeof s !== "string") return false; // ignora null/non-stringhe
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
    const catStr = (category && typeof category === "string") ? category.trim().toLowerCase() : "";
    // Confronto case-insensitive + trim: "Design" e "DESIGN" vanno nella stessa colonna
    const catTasks = isUncategorized
      ? tasks.filter(t => !t.categoria)
      : tasks.filter(t => (t.categoria ?? "").trim().toLowerCase() === catStr);
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

  // Task senza data pianificata (backlog)
  const backlogTasks = useMemo(() =>
    tasks.filter(t => !t.parent_task_id && !t.data_pianificata && (!hideCompletedTasks || t.status !== "completed"))
  , [hideCompletedTasks, tasks]);

  // ── Indicatori dell'header ──────────────────────────────────────
  const todayIso = todayIsoDate();
  const taskStats = useMemo(() => {
    const top = tasks.filter(t => !t.parent_task_id);
    const done = top.filter(t => t.status === "completed").length;
    return { done, total: top.length, perc: top.length ? (done / top.length) * 100 : 0 };
  }, [tasks]);
  const moneyStats = useMemo(() => {
    const attive = commesseProgetto.filter(c => !c.archived);
    const totale = attive.reduce((s, c) => s + Number(c.importo_offerta_base || 0), 0);
    const incassato = attive.reduce((s, c) => s + Number(c._incassato ?? c.importo_incassato ?? 0), 0);
    return { totale, incassato, perc: totale > 0 ? (incassato / totale) * 100 : 0 };
  }, [commesseProgetto]);
  const nextDeadline = useMemo(() => tasks
    .filter(t => t.status !== "completed" && t.data_pianificata)
    .sort((a, b) => String(a.data_pianificata).localeCompare(String(b.data_pianificata))
      || String(a.ora_pianificata || "").localeCompare(String(b.ora_pianificata || "")))[0] ?? null
  , [tasks]);
  // Team assegnato + chi è online ora (anche se non assegnato)
  const teamAvatars = useMemo(() => {
    const onlineIds = new Set(othersPresent.map(p => p.id));
    const list = (Array.isArray(project?.assigned_users) ? project.assigned_users : [])
      .map(uid => teamMembers.find(tm => tm.id === uid))
      .filter(Boolean)
      .map(m => { const name = m.user_name || m.user_email || "?"; return { id: m.id, name, color: avatarColor(name), online: onlineIds.has(m.id) }; });
    othersPresent.forEach(p => {
      if (!list.some(a => a.id === p.id)) list.push({ id: p.id, name: p.name || "?", color: p.color || avatarColor(p.name || "?"), online: true });
    });
    return list.sort((a, b) => Number(b.online) - Number(a.online));
  }, [project, teamMembers, othersPresent]);

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
    // Completando o riaprendo un task padre, propaga lo stato a tutte le subtask
    const propagaSubtask = !task.parent_task_id
      && optimistic.some(i => i.parent_task_id === task.id && i.status !== nextStatus);
    if (propagaSubtask) {
      optimistic = optimistic.map(i => i.parent_task_id === task.id ? { ...i, status: nextStatus } : i);
    }
    setUpdatingTaskId(task.id); setTasks(optimistic);
    const { error: uErr } = await supabase.from("tasks").update({ status: nextStatus }).eq("id", task.id);
    if (uErr) { setTasks(prev); setError(uErr.message); }
    else if (propagaSubtask && (await supabase.from("tasks").update({ status: nextStatus }).eq("parent_task_id", task.id)).error) {
      setTasks(prev); setError("Errore nell'aggiornamento delle subtask");
    }
    else {
      // Auto-crea prossima occorrenza se task ricorrente completata
      if (nextStatus === "completed" && task.is_recurring && task.recurrence_rule && task.data_pianificata) {
        const base = new Date(task.data_pianificata);
        const offsets = { daily:1, weekly:7, biweekly:14, monthly:30 };
        const days = offsets[task.recurrence_rule] || 7;
        base.setDate(base.getDate() + days);
        const nextDate = base.toISOString().slice(0,10);
        const endDate = task.recurrence_end;
        if (!endDate || nextDate <= endDate) {
          const { data: nextTask } = await supabase.from("tasks").insert({
            project_id: task.project_id, title: task.title, categoria: task.categoria,
            status:"todo", assigned_member: task.assigned_member || null,
            assigned_to_name: task.assigned_to_name || null,
            data_pianificata: nextDate, ora_pianificata: task.ora_pianificata || null, order: 0, studio: studioId,
            is_recurring: true, recurrence_rule: task.recurrence_rule, recurrence_end: endDate || null,
          }).select("*").single();
          if (nextTask) setTasks(p => [...p, nextTask]);
        }
      }
      if (task.parent_task_id) {
        const parent = optimistic.find(i => i.id === task.parent_task_id);
        const { error: pErr } = await supabase.from("tasks").update({ status: parent?.status ?? "todo" }).eq("id", task.parent_task_id);
        if (pErr) { setTasks(prev); setError(pErr.message); } else setError("");
      } else setError("");
    }
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
    else {
      setTasks(p => p.filter(t => t.id !== task.id)); setError("");
    }
  };

  const handleArchiveProject = async () => {
    if (!window.confirm("Archiviare questo progetto?")) return;
    setArchiving(true);
    const { error: aErr } = await supabase.from("projects").update({ archived: true }).eq("id", id);
    if (aErr) { showToast("Errore: " + aErr.message); setArchiving(false); return; }
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
      selectedCommessaIds: commesseProgetto.map(c => c.id),
      originalCommessaIds: commesseProgetto.map(c => c.id),
    });
    setEditError(""); setEditOpen(true); setMenuOpen(false);
  };

  const handleSaveEdit = async e => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.client.trim()) { setEditError("Nome e cliente sono obbligatori."); return; }
    setEditSaving(true); setEditError("");
    const origIds = editForm.originalCommessaIds || [];
    const newIds = editForm.selectedCommessaIds || [];
    const payload = {
      name: editForm.name.trim(),
      client: editForm.client.trim(),
      address: editForm.address?.trim() || null,
      start_date: editForm.start_date || null,
      gantt_enabled: !!editForm.gantt_enabled,
      servizi_selezionati: editForm.selectedServices,
      assigned_users: editForm.selectedMembers ?? [],
      commessa_id: newIds[0] || null,
    };
    const { error: uErr } = await supabase.from("projects").update(payload).eq("id", id);
    if (uErr) { setEditError(uErr.message); setEditSaving(false); return; }
    // Crea le task predefinite per i servizi appena aggiunti in modifica
    const prevServices = Array.isArray(project?.servizi_selezionati) ? project.servizi_selezionati : [];
    const addedServices = (editForm.selectedServices ?? []).filter(s => !prevServices.includes(s));
    if (addedServices.length > 0) {
      const taskRows = [];
      for (const serviceName of addedServices) {
        const template = serviceTemplates.find(t => t.service_name === serviceName);
        const taskList = Array.isArray(template?.task_templates) ? template.task_templates : [];
        for (const taskName of taskList) {
          taskRows.push({ project_id: id, title: taskName, categoria: serviceName, status: "todo", studio: studioId });
        }
      }
      if (taskRows.length > 0) {
        const { data: newTasks } = await supabase.from("tasks").insert(taskRows).select("*");
        if (Array.isArray(newTasks) && newTasks.length) setTasks(prev => [...prev, ...newTasks]);
      }
    }
    // Gestisci collegamento bidirezionale commesse ↔ project
    const removed = origIds.filter(cid => !newIds.includes(cid));
    const added = newIds.filter(cid => !origIds.includes(cid));
    if (removed.length) await supabase.from("commesse").update({ project_id: null }).in("id", removed);
    if (added.length) await supabase.from("commesse").update({ project_id: id }).in("id", added);
    setProject(p => p ? { ...p, ...payload } : p);
    if (removed.length || added.length) {
      const { data: commProg } = await supabase.from("commesse").select("id,nome_commessa,cliente,importo_offerta_base,importo_totale,importo_incassato,stato_pagamento,archived").eq("project_id", id).order("created_at", { ascending: false });
      setCommesseProgetto((commProg ?? []).map(c => ({ ...c, _incassato: commesseProgetto.find(o => o.id === c.id)?._incassato || 0 })));
    }
    setEditSaving(false); setEditOpen(false);
  };

  const handleSaveBudgetOre = async () => {
    const val = parseFloat(budgetInput) || 0;
    await supabase.from("projects").update({ budget_ore: val }).eq("id", id);
    setProject(p => p ? { ...p, budget_ore: val } : p);
    setBudgetEditOpen(false);
    showToast(`Budget ore aggiornato: ${val}h`, "success");
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
    const plannedTime = plannedDate ? (newTaskTimes[category] || null) : null;
    const optimisticId = `tmp-${Date.now()}`;
    const dbCategoria = category === "__uncategorized__" ? null : category;
    setTasks(p => [...p, { id: optimisticId, project_id: id, title, categoria: dbCategoria, status: "todo", assigned_member: memberId, assigned_to_name: member?.user_name || member?.user_email || null, data_pianificata: plannedDate, ora_pianificata: plannedTime, order: 0, created_at: new Date().toISOString() }]);
    // Reset: elimina la chiave così il prossimo task torna a defaultare al creatore
    setNewTaskInputs(p => ({ ...p, [category]: "" }));
    setNewTaskAssignments(p => { const n = {...p}; delete n[category]; return n; });
    setNewTaskDates(p => ({ ...p, [category]: "" }));
    setNewTaskTimes(p => ({ ...p, [category]: "" }));
    const { data, error: iErr } = await supabase.from("tasks").insert({ project_id: projectId || null, title, categoria: dbCategoria, status: "todo", assigned_member: memberId || null, assigned_to_name: member?.user_name || member?.user_email || null, data_pianificata: plannedDate || null, ora_pianificata: plannedTime, order: 0, studio: studioId || null }).select("*").single();
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
    padding: '8px 10px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.surface,
    color: T.ink, fontSize: 12, fontFamily: "var(--font-ui)", outline: 'none', flex: 1, minWidth: 0,
  };
  const miniBtn = {
    width: 32, height: 32, flexShrink: 0, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.surface,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', position: 'relative', overflow: 'hidden',
  };
  const kicker = { fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted };
  const statValue = { marginTop: 6, fontFamily: "var(--font-label)", fontSize: 15, fontWeight: 600, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
  const menuItem = (color) => ({ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: "var(--font-ui)", fontSize: 13, color });
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, fontFamily: "var(--font-label)", fontSize: 11, color: T.muted }}>
      Caricamento progetto...
    </div>
  );
  if (error && !project) return <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.surface, padding: 32, color: T.red, fontSize: 13 }}>Errore: {error}</div>;
  if (!project) return <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.surface, padding: 32, textAlign: 'center', fontFamily: "var(--font-label)", fontSize: 11, color: T.muted }}>Progetto non trovato.</div>;

  return (
    <div>
      {/* PROJECT HEADER — titolo, team e indicatori chiave (stile schermata commessa) */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, padding: isMobile ? '16px' : '20px 24px', marginBottom: 16 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={kicker}>
              {[project.client, project.address].filter(Boolean).join(" · ") || "Progetto"}
            </div>
            <div style={{ marginTop: 6, fontSize: isMobile ? 22 : 26, fontWeight: 700, letterSpacing:'-0.02em', color: T.ink, lineHeight: 1.15 }}>
              {project.name ?? "Progetto"}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink: 0 }}>
            {/* Chi sta guardando ora (presenza realtime) */}
            {othersPresent.length > 0 && !isMobile && (
              <span style={{ display:'flex', alignItems:'center', gap:6, fontFamily:"var(--font-label)", fontSize:10, color:T.muted }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#34c759' }}/>
                {othersPresent.length === 1 ? `${othersPresent[0].name?.split(" ")[0]} sta guardando` : `${othersPresent.length} persone qui`}
              </span>
            )}
            {/* Team assegnato (+ presenti non in team) */}
            {(teamAvatars.length > 0) && (
              <div style={{ display:'flex', alignItems:'center' }}>
                {teamAvatars.slice(0, 5).map((a, i) => (
                  <span key={a.id} title={a.online ? `${a.name} · online` : a.name} style={{
                    position:'relative', width: 28, height: 28, borderRadius: '50%',
                    background: a.color, border: `2px solid ${isDark ? '#28282f' : '#fff'}`, marginLeft: i > 0 ? -6 : 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily:"var(--font-ui)", fontSize: 10, fontWeight: 700, color: '#fff',
                  }}>
                    {getInitials(a.name)}
                    {a.online && <span style={{ position:'absolute', right:-1, bottom:-1, width:8, height:8, borderRadius:'50%', background:'#34c759', border:`1.5px solid ${isDark ? '#28282f' : '#fff'}` }}/>}
                  </span>
                ))}
                {teamAvatars.length > 5 && (
                  <span style={{ marginLeft:-8, width:28, height:28, borderRadius:'50%', background:T.borderMd, display:'inline-flex', alignItems:'center', justifyContent:'center', fontFamily:"var(--font-label)", fontSize:10, color:T.muted }}>
                    +{teamAvatars.length - 5}
                  </span>
                )}
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(p => !p)} aria-label="Altre azioni" style={{
                border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.ink,
                width: 34, height: 34, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>···</button>
              {menuOpen && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, width: 200, background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, boxShadow: T.shadowMd, zIndex: 30, overflow: 'hidden', padding: 4 }}>
                  <button onClick={openEdit} style={menuItem(T.ink)}>Modifica progetto</button>
                  <button onClick={() => { setMenuOpen(false); setBudgetInput(String(Number(project.budget_ore) || "")); setBudgetEditOpen(true); }} style={menuItem(T.ink)}>Budget ore</button>
                  <button onClick={handleArchiveProject} disabled={archiving} style={menuItem(T.ink)}>
                    {archiving ? "Archiviazione..." : "Archivia progetto"}
                  </button>
                  <button onClick={async () => {
                    if (!window.confirm(`Eliminare il progetto "${project?.name}"? Verrà spostato nel cestino.`)) return;
                    setMenuOpen(false);
                    const { error: dErr } = await supabase.rpc('elimina_progetto', { p_project_id: id });
                    if (dErr) { showToast('Errore: ' + dErr.message); return; }
                    navigate('/progetti');
                  }} style={menuItem(T.red)}>
                    Elimina progetto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Indicatori: avanzamento, ore, incassi, prossima scadenza */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `0.5px solid ${T.borderMd}`, display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: isMobile ? 16 : 24 }}>
          {/* Avanzamento task */}
          <div style={{ minWidth: 0 }}>
            <div style={kicker}>Avanzamento</div>
            <div style={statValue}>
              {taskStats.done}<span style={{ color: T.muted, fontWeight: 500 }}> / {taskStats.total} task</span>
            </div>
            <ProgressBar perc={taskStats.perc} color={T.navy} T={T} />
          </div>

          {/* Ore vs budget */}
          {(() => {
            const budget = Number(project.budget_ore) || 0;
            const perc   = budget > 0 ? Math.min((totaleOreProgetto / budget) * 100, 100) : 0;
            const over   = budget > 0 && totaleOreProgetto > budget;
            const barColor = over ? '#ff3b30' : perc > 80 ? '#ff9500' : '#34c759';
            return (
              <div style={{ minWidth: 0 }}>
                <div style={{ ...kicker, display:'flex', alignItems:'center', gap:8 }}>
                  Ore
                  {over && <span style={{ color:'#ff3b30', border:'0.5px solid #ff3b30', borderRadius:4, padding:'0 4px', letterSpacing:'0.08em' }}>Sforato</span>}
                  <button onClick={() => { setBudgetInput(String(budget||"")); setBudgetEditOpen(v=>!v); }}
                    style={{ marginLeft:'auto', background:'none', border:'none', padding:0, cursor:'pointer', fontFamily:"var(--font-label)", fontSize:10, color:T.navy, letterSpacing:'0.04em', textTransform:'none' }}>
                    {budget > 0 ? "Modifica" : "Imposta budget"}
                  </button>
                </div>
                {budgetEditOpen ? (
                  <div style={{ display:'flex', gap:6, marginTop:6, alignItems:'center', minWidth:0 }}>
                    <input type="number" min="0" value={budgetInput} onChange={e=>setBudgetInput(e.target.value)}
                      placeholder="Es. 120" autoFocus
                      style={{ flex:'1 1 auto', minWidth:0, width:80, boxSizing:'border-box', padding:'4px 8px', border:`0.5px solid ${T.borderMd}`, borderRadius:T.radiusSm, background:T.inputBg, color:T.ink, fontFamily:"var(--font-label)", fontSize:12, outline:'none' }}
                      onKeyDown={e=>{ if(e.key==='Enter') handleSaveBudgetOre(); if(e.key==='Escape') setBudgetEditOpen(false); }}/>
                    {!isMobile && <span style={{ fontFamily:"var(--font-label)", fontSize:10, color:T.muted }}>ore</span>}
                    <button onClick={handleSaveBudgetOre} style={{ flexShrink:0, padding:'4px 10px', background:T.navy, color:'#fff', border:'none', borderRadius:T.radiusSm, fontFamily:"var(--font-label)", fontSize:10, cursor:'pointer' }}>Salva</button>
                    <button onClick={()=>setBudgetEditOpen(false)} aria-label="Annulla" style={{ flexShrink:0, padding:'4px 6px', background:'transparent', color:T.muted, border:'none', cursor:'pointer', fontFamily:"var(--font-label)", fontSize:12 }}>×</button>
                  </div>
                ) : (
                  <>
                    <div style={{ ...statValue, color: over ? '#ff3b30' : T.ink }}>
                      {totaleOreProgetto.toLocaleString('it-IT', { maximumFractionDigits: 1 })}h
                      {budget > 0 && <span style={{ color: T.muted, fontWeight: 500 }}> / {budget}h</span>}
                    </div>
                    {budget > 0 ? <ProgressBar perc={perc} color={barColor} T={T} /> : <div style={{ height: 4, marginTop: 8 }} />}
                  </>
                )}
              </div>
            );
          })()}

          {/* Incassi dalle commesse collegate */}
          <div style={{ minWidth: 0 }}>
            <div style={kicker}>Incassato</div>
            {moneyStats.totale > 0 ? (
              <>
                <div style={statValue}>
                  <span style={{ color: '#34c759' }}>{formatEuro(moneyStats.incassato, isMobile)}</span>
                  <span style={{ color: T.muted, fontWeight: 500 }}> / {formatEuro(moneyStats.totale, isMobile)}</span>
                </div>
                <ProgressBar perc={moneyStats.perc} color="#34c759" T={T} />
              </>
            ) : (
              <div style={{ ...statValue, color: T.muted, fontWeight: 500 }}>Nessuna commessa</div>
            )}
          </div>

          {/* Prossima scadenza tra i task aperti */}
          <div style={{ minWidth: 0 }}>
            <div style={kicker}>Prossima scadenza</div>
            {nextDeadline ? (
              <>
                <div style={{ ...statValue, color: nextDeadline.data_pianificata < todayIso ? '#ff3b30' : T.ink }}>
                  {formatShortDate(nextDeadline.data_pianificata)}
                  {nextDeadline.ora_pianificata && <span style={{ color: T.muted, fontWeight: 500 }}> · {String(nextDeadline.ora_pianificata).slice(0,5)}</span>}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nextDeadline.title ?? nextDeadline.name}
                </div>
              </>
            ) : (
              <div style={{ ...statValue, color: T.muted, fontWeight: 500 }}>Nessuna</div>
            )}
          </div>
        </div>
      </div>

      {/* STRUMENTI — tutti i pannelli del progetto in un'unica barra uniforme */}
      <div className="pd-tools" style={{ marginBottom: 16 }}>
        <PraticaEdiliziaPanel projectId={id} studioId={studioId} commesse={commesseProgetto.filter(c => !c.archived)} autoOpenForm={autoOpenPratica} openSignal={docOpenReq.type === "pratiche" ? docOpenReq.n : 0} />
        <DocumentiPanel projectId={id} studioId={studioId} project={project} commesse={commesseProgetto} onOpen={openDoc} />
        <CapitolatoPanel projectId={id} studioId={studioId} project={project} openSignal={docOpenReq.type === "capitolati" ? docOpenReq.n : 0} />
        {isPro && permissions.canViewReportCantiere && (
          <ReportCantierePanel
            projectId={id}
            studioId={studioId}
            canManage={permissions.canManageReportCantiere}
            openSignal={docOpenReq.type === "report" ? docOpenReq.n : 0}
          />
        )}
        <CommessePanel commesse={commesseProgetto} />
        {isPro && <CapexPanel projectId={id} studioId={studioId} projectName={project?.name} />}
        <AnagraficaPanel projectId={id} studioId={studioId} />
        <OrePanel projectId={id} studioId={studioId} projectName={project?.name} />
      </div>

      {/* Note di progetto — bacheca condivisa del team */}
      {teamMember?.id && (
        <ProjectNotes projectId={id} studioId={studioId} currentMemberId={teamMember.id} currentMemberName={teamMember.user_name || teamMember.user_email} teamMembers={teamMembers} />
      )}

      {error && <div style={{ fontFamily: "var(--font-label)", fontSize: 11, color: T.red, marginBottom: 12 }}>{error}</div>}

      {/* EDIT MODAL */}
      {editOpen && (
        <div onClick={() => { if (!editSaving) setEditOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,14,13,0.5)', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusSm, boxShadow:T.shadowLg, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>Modifica Progetto</div>
              <button onClick={() => setEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 18 }}>×</button>
            </div>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              {selectedServices.filter(s => completedCategories[s]).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 6 }}>Servizi completati</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedServices.filter(s => completedCategories[s]).map(cat => (
                      <button key={cat} type="button" onClick={() => handleToggleCategory(cat)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: 'transparent', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = T.border}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontFamily: "var(--font-label)", fontSize: 12, color: T.muted, textDecoration: 'line-through' }}>
                          {cat === "__uncategorized__" ? "Generali" : cat}
                        </span>
                        <span style={{ fontFamily: "var(--font-label)", fontSize: 10, color: T.navy, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Riattiva</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ fontFamily: "var(--font-label)", fontSize: 10, color: T.muted, marginTop: 6 }}>
                    Nascosti dalla board. Clicca per riattivarli.
                  </div>
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                <label style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.muted, display: 'block', marginBottom: 4 }}>Commesse collegate</label>
                <LinkedCommesseField
                  selectedIds={editForm.selectedCommessaIds}
                  commesseList={commesseList}
                  onChange={ids => setEditForm(p => ({ ...p, selectedCommessaIds: ids }))}
                />
              </div>
              {editError && <div style={{ fontFamily: "var(--font-label)", fontSize: 11, color: T.red }}>{editError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8, borderTop: `0.5px solid ${T.border}` }}>
                <button type="button" onClick={() => setEditOpen(false)} disabled={editSaving} style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.ink, padding: '8px 20px', fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer' }}>Annulla</button>
                <button type="submit" disabled={editSaving} style={{ border: 'none', background: T.navy, color: T.bg, padding: '8px 20px', fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer' }}>{editSaving ? "Salvataggio..." : "Salva"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOARD — barra con filtro (segmented control) e nuova colonna */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: T.ink }}>Attività</div>
        <SlidingTabs
          tabs={[{ key: "all", label: "Tutte" }, { key: "open", label: "Da fare" }]}
          active={hideCompletedTasks ? "open" : "all"}
          onChange={k => setHideCompletedTasks(k === "open")}
        />
        <button onClick={() => setAddColOpen(true)} style={{
          marginLeft: 'auto', height: 32, padding: '0 14px', borderRadius: 999,
          border: `0.5px solid ${T.borderMd}`, background: 'transparent', color: T.navy, cursor: 'pointer',
          fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: '0.04em',
        }}>+ Colonna</button>
      </div>

      {/* KANBAN COLUMNS */}
      {selectedServices.filter(s => !completedCategories[s]).length === 0 && !addColOpen ? (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.surface, padding: 48, textAlign: 'center', fontFamily: "var(--font-label)", fontSize: 11, color: T.muted }}>
          {selectedServices.length === 0
            ? "Nessun servizio selezionato per questo progetto."
            : "Tutti i servizi sono completati. Riattivali da “Modifica progetto”."}
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
            // Colonna completata → nascosta dalla board (riattivabile da Modifica progetto)
            if (catDone) return null;
            const isDragging  = dragColIdx  === gi;
            const isDropTarget = dragOverIdx === gi && dragColIdx !== gi;

            // ── Touch drag handlers ─────────────────────────────────
            const handleTouchStart = (e) => {
              const tag = e.target.tagName.toLowerCase();
              if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
              const ref = touchDragRef.current;
              ref.fromIdx = gi;
              ref.timer = setTimeout(() => {
                ref.active = true;
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
                  flex: isMobile ? `0 0 calc(100vw - 48px)` : '1 0 300px',
                  minWidth: isMobile ? 'calc(100vw - 48px)' : 300,
                  maxWidth: isMobile ? 'calc(100vw - 48px)' : 460,
                  scrollSnapAlign: isMobile ? 'start' : 'none',
                  display: 'flex', flexDirection: 'column',
                  background: T.surface,
                  backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm,
                  border: isDropTarget ? `2px solid ${T.navy}` : `1px solid ${T.border}`,
                  borderRadius: T.radius,
                  overflow: 'hidden',
                  height: isMobile ? 'auto' : '100%',
                  maxHeight: isMobile ? 'none' : '100%',
                  opacity: isDragging ? 0.4 : catDone ? 0.5 : 1,
                  transition: 'opacity 0.15s, border-color 0.15s',
                  boxShadow: T.shadow,
                  cursor: 'default',
                }}>
                {/* Column header */}
                <div style={{ flexShrink: 0, padding: '14px 14px 12px', borderBottom: `0.5px solid ${T.borderMd}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Drag handle */}
                    <span
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); setDragColIdx(gi); setDragOverIdx(gi); }}
                      title="Trascina per riordinare"
                      style={{ fontSize: 13, color: T.muted, cursor: 'grab', userSelect: 'none', flexShrink: 0, lineHeight: 1, touchAction: 'none', opacity: 0.6 }}>
                      ⠿
                    </span>
                    <span style={{ fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 600, color: T.ink, letterSpacing: '0.08em', textTransform: 'uppercase', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {group.category === "__uncategorized__" ? "Generali" : group.category}
                    </span>
                    <span style={{ fontFamily: "var(--font-label)", fontSize: 10, color: T.muted }}>
                      {group.completedCount}/{group.totalCount}
                    </span>
                    <button onClick={() => handleToggleCategory(group.category)} title="Segna il servizio come completato (lo nasconde dalla board)"
                      style={{ height: 24, padding: '0 8px', borderRadius: 999, border: `0.5px solid ${T.borderMd}`, background: 'transparent', color: T.muted, cursor: 'pointer', fontFamily: "var(--font-label)", fontSize: 10, flexShrink: 0 }}>
                      ✓ Chiudi
                    </button>
                  </div>
                  <ProgressBar perc={group.totalCount ? (group.completedCount / group.totalCount) * 100 : 0} color={T.navy} T={T} />
                  {/* Add task input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                    <input ref={node => { inputRefs.current[group.category] = node; }}
                      type="text" value={newTaskInputs[group.category] ?? ""}
                      onChange={e => setNewTaskInputs(p => ({ ...p, [group.category]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createTaskForCategory(group.category); } }}
                      placeholder="Nuovo task…"
                      style={{ ...inputSt, fontSize: 12, height: 32, padding: '0 12px', borderRadius: 999, border: `0.5px solid ${T.borderMd}`, background: T.inputBg }} />
                    <div style={{ ...miniBtn, borderRadius: '50%', borderColor: (newTaskAssignments[group.category] ?? teamMember?.id) ? T.borderMd : T.border }} title={teamMembers.find(m=>m.id===(newTaskAssignments[group.category]??teamMember?.id))?.user_name || 'Assegna'}>
                      {(() => {
                        const m = teamMembers.find(x => x.id === (newTaskAssignments[group.category] ?? teamMember?.id));
                        const name = m?.user_name || m?.user_email;
                        return name
                          ? <span style={{ pointerEvents: 'none', width: 24, height: 24, borderRadius: '50%', background: avatarColor(name), color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{getInitials(name)}</span>
                          : <span style={{ pointerEvents: 'none', fontSize: 12 }}>👤</span>;
                      })()}
                      <select value={newTaskAssignments[group.category] ?? (teamMember?.id ?? "")} onChange={e => setNewTaskAssignments(p => ({ ...p, [group.category]: e.target.value }))}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}>
                        <option value="">Non assegnato</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.user_name || m.user_email}</option>)}
                      </select>
                    </div>
                    <div style={{ ...miniBtn, borderRadius: '50%', borderColor: newTaskDates[group.category] ? T.navy : T.borderMd }}
                      title={newTaskDates[group.category] ? `Data: ${newTaskDates[group.category]}` : "Imposta data"}>
                      <span style={{ pointerEvents: 'none', fontSize: 12 }}>📅</span>
                      <input type="date" value={newTaskDates[group.category] ?? ""} onChange={e => setNewTaskDates(p => ({ ...p, [group.category]: e.target.value }))}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                    </div>
                    {newTaskDates[group.category] && (
                      <input type="time" value={newTaskTimes[group.category] ?? ""}
                        onChange={e => setNewTaskTimes(p => ({ ...p, [group.category]: e.target.value }))}
                        title="Ora (facoltativa): ti avviso a quest'ora"
                        style={{ width: 84, height: 32, flexShrink: 0, boxSizing: 'border-box', padding: '0 6px',
                          border: `0.5px solid ${newTaskTimes[group.category] ? T.navy : T.borderMd}`, borderRadius: 999,
                          background: T.inputBg, color: T.ink, fontFamily: "var(--font-label)", fontSize: 11, outline: 'none' }} />
                    )}
                    <button onClick={() => createTaskForCategory(group.category)} disabled={creatingCategory === group.category} aria-label="Aggiungi task"
                      style={{ width: 32, height: 32, borderRadius: '50%', background: T.navy, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 500, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      +
                    </button>
                  </div>
                </div>

                {/* Task list */}
                <div style={{ flex: isMobile ? '0 0 auto' : 1, overflowY: isMobile ? 'visible' : 'auto', padding: 8, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
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

          {/* Colonna Backlog nascosta su richiesta: i task senza data restano
              comunque visibili nelle loro colonne commessa (niente doppioni). */}
          {false && backlogTasks.length > 0 && (
            <div style={{
              flex: isMobile ? `0 0 calc(100vw - 48px)` : '0 0 calc((100vw - 220px - 56px - 20px) / 3)',
              minWidth: isMobile ? 'calc(100vw - 48px)' : 'calc((100vw - 220px - 56px - 20px) / 3)',
              maxWidth: isMobile ? 'calc(100vw - 48px)' : 'calc((100vw - 220px - 56px - 20px) / 3)',
              scrollSnapAlign: isMobile ? 'start' : 'none',
              display: 'flex', flexDirection: 'column',
              background: T.surface,
              backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm,
              border: `1px dashed ${T.borderMd}`,
              borderRadius: T.radius,
              overflow: 'hidden',
              height: isMobile ? 'auto' : '100%',
              maxHeight: isMobile ? 'none' : '100%',
              boxShadow: T.shadow,
            }}>
              {/* Header backlog */}
              <div style={{ flexShrink: 0, padding: 12, borderBottom: `0.5px solid ${T.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: T.muted }}>📥</span>
                  <span style={{ fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 500, color: T.muted, letterSpacing: '0.05em', flex: 1 }}>
                    Backlog
                  </span>
                  <span style={{ fontFamily: "var(--font-label)", fontSize: 10, color: T.muted, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: '1px 6px' }}>
                    {backlogTasks.filter(t=>t.status!=="completed").length} senza data
                  </span>
                </div>
              </div>
              {/* Task list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {backlogTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    teamMembers={teamMembers}
                    categories={selectedServices}
                    subtasks={subtasksByParent[task.id] || []}
                    subtaskInput={subtaskInputs[task.id] ?? ""}
                    subtaskAssignment={subtaskAssignments[task.id]}
                    subtaskDate={subtaskDates[task.id]}
                    onToggle={handleToggleTask}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onSubtaskInputChange={(pid, v) => setSubtaskInputs(p => ({ ...p, [pid]: v }))}
                    onSubtaskAssignmentChange={(pid, v) => setSubtaskAssignments(p => ({ ...p, [pid]: v }))}
                    onSubtaskDateChange={(pid, v) => setSubtaskDates(p => ({ ...p, [pid]: v }))}
                    onCreateSubtask={createSubtask}
                    isUpdating={updatingTaskId === task.id}
                    isCreatingSubtask={creatingSubtaskId === task.id}
                    currentMemberId={teamMember?.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Nuova colonna: si apre dal pulsante "+ Colonna" nella barra della board */}
          {addColOpen ? (
            <div style={{
              flex: isMobile ? `0 0 calc(100vw - 48px)` : '0 0 220px',
              minWidth: isMobile ? 'calc(100vw - 48px)' : '220px',
              maxWidth: isMobile ? 'calc(100vw - 48px)' : '220px',
              scrollSnapAlign: isMobile ? 'start' : 'none',
              display: 'flex', flexDirection: 'column',
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
              height: isMobile ? 'auto' : 'fit-content',
              padding: 16, gap: 8, alignSelf: 'flex-start',
            }}>
              <span style={{ fontFamily:"var(--font-label)", fontSize:11, color:T.muted }}>Nome nuova colonna</span>
              <input autoFocus type="text" value={addColInput}
                onChange={e => setAddColInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddColumn(); } if (e.key === 'Escape') { setAddColOpen(false); setAddColInput(""); } }}
                placeholder="es. In revisione"
                style={{ padding:'8px 10px', border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, background:T.bg, color:T.ink, fontSize:12, fontFamily:"var(--font-ui)", outline:'none' }} />
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={handleAddColumn}
                  style={{ flex:1, padding:'8px 0', background:T.navy, color:T.bg, border:'none', cursor:'pointer', fontSize:11, fontFamily:"var(--font-label)" }}>
                  Crea
                </button>
                <button onClick={() => { setAddColOpen(false); setAddColInput(""); }}
                  style={{ flex:1, padding:'8px 0', background:'transparent', color:T.muted, border:`0.5px solid ${T.border}`, cursor:'pointer', fontSize:11, fontFamily:"var(--font-label)" }}>
                  Annulla
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
