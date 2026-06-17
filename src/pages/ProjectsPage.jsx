import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from '../contexts/ThemeContext';
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { usePermissions } from "../hooks/usePermissions";
import { usePlan } from "../hooks/usePlan";
import { useStudio } from "../hooks/useStudio";
import { useIsMobile } from "../hooks/useIsMobile";
import { supabase } from "../lib/supabase";
import { formatOre } from "../lib/utils";
import { useEscKey } from "../hooks/useEscKey";

// ── HELPERS ──────────────────────────────────────────────────────
function getInitials(name) {
  const s = name ?? "";
  return String(s).trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}
const AVATAR_COLORS = ["#13315C", "#1a6b3c", "#7c3aed", "#b45309", "#be185d", "#0e7490"];
function avatarColor(member) {
  if (member?.color) return member.color;
  const seed = member?.user_name || member?.user_email || "";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getProgress(completed, total) {
  const t = Number(total) || 0, c = Number(completed) || 0;
  return t > 0 ? Math.min(100, Math.round((c / t) * 100)) : 0;
}

// ── SHARED UI ────────────────────────────────────────────────────
function BtnPrimary({ children, onClick, disabled, type = "button", style = {} }) {
  const { T } = useTheme();
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: T.navy, color: T.bg, border: 'none', borderRadius: T.radiusSm,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
      letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      padding: '8px 18px', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, ...style,
    }}>{children}</button>
  );
}
function BtnGhost({ children, onClick, disabled, danger, style = {} }) {
  const { T } = useTheme();
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      background: 'transparent', border: `1px solid ${danger ? T.red : T.borderMd}`, borderRadius: T.radiusSm,
      color: danger ? T.red : T.ink,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
      letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      padding: '8px 18px', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, ...style,
    }}>{children}</button>
  );
}

function FieldLabel({ children }) {
  const { T } = useTheme();
  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
      letterSpacing: '0.2em', textTransform: 'uppercase',
      color: T.muted, marginBottom: 6,
    }}>{children}</div>
  );
}

function Input({ value, onChange, type = "text", placeholder, required, autoComplete, onBlur }) {
  const { T } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      required={required} autoComplete={autoComplete} onBlur={e => { setFocus(false); onBlur?.(e); }}
      onFocus={() => setFocus(true)}
      style={{
        width: '100%', padding: '8px 12px', boxSizing: 'border-box',
        border: `1px solid ${focus ? T.navy : T.borderMd}`, borderRadius: T.radiusSm,
        background: T.surface, color: T.ink, fontSize: 13,
        fontFamily: "'Space Grotesk', sans-serif", outline: 'none',
      }}
    />
  );
}

function CheckRow({ checked, onChange, disabled, label, avatar, dim }) {
  const { T } = useTheme();
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 0', cursor: disabled ? 'default' : 'pointer',
      opacity: dim ? 0.5 : 1,
    }}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled}
        style={{ accentColor: T.navy, width: 14, height: 14 }} />
      {avatar && (
        <span style={{
          width: 22, height: 22, borderRadius: '50%', background: avatar.bg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 600, color: T.surface, flexShrink: 0,
        }}>{avatar.initials}</span>
      )}
      <span style={{ fontSize: 12, color: T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{label}</span>
    </label>
  );
}

// ── MODAL WRAPPER ────────────────────────────────────────────────
function Modal({ open, onClose, title, subtitle, children, width = 520 }) {
  const { T } = useTheme();
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `rgba(14,14,13,0.5)`, padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: width,
        background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
        border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusLg, padding: 28,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: T.shadowLg,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em' }}>{title}</div>
            {subtitle && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 4, letterSpacing: '0.05em' }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Divider() {
  const { T } = useTheme();
  return <div style={{ height: '0.5px', background: T.border, margin: '16px 0' }} />;
}

function ScrollBox({ children, maxHeight = 160 }) {
  const { T } = useTheme();
  return (
    <div style={{
      border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.bg,
      padding: '8px 12px', maxHeight, overflowY: 'auto',
    }}>{children}</div>
  );
}

// ── PROJECT CARD ─────────────────────────────────────────────────
function ProjectCard({ project, timesheetByProject, tasksByProject, teamMembers, onEdit, onArchive, onDelete, navigate, draggable, isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const { T } = useTheme();
  const hours = timesheetByProject[project.id] || 0;
  const tasks = tasksByProject[project.id] || { total: 0, completed: 0 };
  const progress = getProgress(tasks.completed, tasks.total);
  const assignedMembers = (project.assigned_users || []).map(id => teamMembers.find(m => m.id === id)).filter(Boolean);

  const [menuOpen, setMenuOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handler(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="asm-card"
      draggable={draggable}
      onDragStart={draggable ? e => { e.dataTransfer.effectAllowed = "move"; onDragStart(); } : undefined}
      onDragOver={draggable ? e => { e.preventDefault(); onDragOver(); } : undefined}
      onDrop={draggable ? e => { e.preventDefault(); onDrop(); } : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      style={{
        background: hover ? T.surface2 : T.surface,
        border: `1px solid ${isDragOver ? T.navy : T.border}`,
        borderRadius: T.radius,
        padding: 20, position: 'relative', transition: 'all 0.15s',
        backdropFilter: T.blurSm,
        WebkitBackdropFilter: T.blurSm,
        boxShadow: isDragOver ? T.shadowMd : hover ? T.shadowMd : T.shadow,
        display: 'flex', flexDirection: 'column',
        opacity: isDragging ? 0.35 : 1,
        cursor: draggable ? 'grab' : 'default',
        outline: isDragOver ? `2px dashed ${T.navy}` : 'none',
        outlineOffset: 2,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Menu */}
      <div ref={menuRef} style={{ position: 'absolute', right: 12, top: 12 }}>
        <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: T.muted, fontSize: 18, lineHeight: 1, padding: '2px 6px',
        }}>···</button>
        {menuOpen && (
          <div style={{
            position: 'absolute', right: 0, top: '100%',
            background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
            border: `1px solid ${T.glassBorder}`, borderRadius: 12,
            width: 160, zIndex: 20, marginTop: 4, overflow: 'hidden',
            boxShadow: T.shadowMd,
          }}>
            <button onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(project); }} style={{
              display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink,
              letterSpacing: '0.05em',
            }}>Modifica</button>
            <button onClick={e => { e.stopPropagation(); onArchive(project, e); }} style={{
              display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#b45309',
              letterSpacing: '0.05em',
            }}>Archivia</button>
            <button onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete(project); }} style={{
              display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red,
              letterSpacing: '0.05em',
            }}>Elimina</button>
          </div>
        )}
      </div>

      {/* Content */}
      <div onClick={() => navigate(`/progetti/${project.id}`)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Parte alta: nome + cliente + indirizzo (cresce) */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', paddingRight: 24, marginBottom: 4 }}>
            {project.name || "Progetto senza nome"}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, letterSpacing: '0.05em', marginBottom: 4 }}>
            {project.client || "—"}
          </div>
          {project.address && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, letterSpacing: '0.02em' }}>
              {project.address}
            </div>
          )}
        </div>

        {/* Parte bassa: ore + task + barra + avatars (sempre in fondo) */}
        <div style={{ marginTop: 14 }}>
          {/* Ore e task */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>
              {formatOre(hours)} h
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>
              Task {tasks.completed}/{tasks.total}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 2, background: T.border }}>
              <div style={{ height: 2, background: T.navy, width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>{progress}%</span>
          </div>
        </div>

        {/* Avatars */}
        {assignedMembers.length > 0 ? (
          <div style={{ display: 'flex' }}>
            {assignedMembers.slice(0, 5).map((m, i) => (
              <div key={m.id} title={m.user_name || m.user_email} style={{
                width: 24, height: 24, borderRadius: '50%',
                background: avatarColor(m), border: `1.5px solid ${T.surface}`,
                marginLeft: i > 0 ? -8 : 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 600, color: T.surface,
              }}>{getInitials(m.user_name || m.user_email)}</div>
            ))}
            {assignedMembers.length > 5 && (
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: T.muted,
                border: `1.5px solid ${T.surface}`, marginLeft: -8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: T.surface,
              }}>+{assignedMembers.length - 5}</div>
            )}
          </div>
        ) : (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>
            Nessun membro assegnato
          </div>
        )}
      </div>
    </div>
  );
}

// ── FORM PROGETTO (riutilizzato per nuovo e modifica) ─────────────
export function ProjectForm({ data, onChange, teamMembers, serviceTemplates, globalContacts, currentMemberId, isEdit = false, onToggleMember, onToggleService, clientSuggestions, onSelectClient, onGanttChange }) {
  const { T } = useTheme();
  const { isPro, isStudio } = usePlan();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <FieldLabel>Nome progetto *</FieldLabel>
        <Input value={data.name} onChange={onChange('name')} required />
      </div>
      <div style={{ position: 'relative' }}>
        <FieldLabel>Cliente *</FieldLabel>
        <Input value={data.client} onChange={onChange('client')} required autoComplete="off" />
        {clientSuggestions?.length > 0 && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '100%',
            background: T.surface, border: `1px solid ${T.borderMd}`, zIndex: 40,
          }}>
            {clientSuggestions.map(c => (
              <button key={c.id} onMouseDown={() => onSelectClient(c.full_name)} style={{
                display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: T.ink, fontFamily: "'Space Grotesk', sans-serif",
              }}>{c.full_name}</button>
            ))}
          </div>
        )}
      </div>
      <div>
        <FieldLabel>Indirizzo</FieldLabel>
        <Input value={data.address} onChange={onChange('address')} />
      </div>
      <div>
        <FieldLabel>Data inizio</FieldLabel>
        <Input type="date" value={data.startDate || data.start_date || ''} onChange={onChange(isEdit ? 'start_date' : 'startDate')} />
      </div>
      <div>
        <FieldLabel>Servizi</FieldLabel>
        <ScrollBox maxHeight={140}>
          {serviceTemplates.length === 0
            ? <div style={{ fontSize: 11, color: T.muted }}>Nessun servizio disponibile</div>
            : serviceTemplates.map(s => {
                const label = s.service_name ?? "Servizio";
                return (
                  <CheckRow
                    key={s.id ?? label}
                    checked={(data.selectedServices || []).includes(label)}
                    onChange={() => onToggleService(label)}
                    label={label}
                  />
                );
              })
          }
        </ScrollBox>
        {(isPro || isStudio) && (
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
            <input type="checkbox" id="gantt_enabled" checked={!!data.gantt_enabled}
              onChange={onGanttChange}
              style={{ accentColor: T.navy, width:14, height:14 }}/>
            <label htmlFor="gantt_enabled" style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color: T.ink, cursor:'pointer' }}>
              Abilita Gantt per questo progetto
            </label>
          </div>
        )}
      </div>
      <div>
        <FieldLabel>Membri del team</FieldLabel>
        <ScrollBox maxHeight={130}>
          {teamMembers.length === 0
            ? <div style={{ fontSize: 11, color: T.muted }}>Nessun membro disponibile</div>
            : teamMembers.map(m => {
                const isMe = m.id === currentMemberId;
                return (
                  <CheckRow
                    key={m.id}
                    checked={(data.selectedMembers || []).includes(m.id)}
                    onChange={() => onToggleMember(m.id)}
                    label={`${m.user_name || m.user_email}${isMe ? ' (tu)' : ''}`}
                    avatar={{ bg: avatarColor(m), initials: getInitials(m.user_name || m.user_email) }}
                  />
                );
              })
          }
        </ScrollBox>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
export default function ProjectsPage() {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  usePageTitleOnMount("Progetti");
  const navigate = useNavigate();
  const { teamMember, studioId, studioLoading } = useStudio();
  const permissions = usePermissions();
  const { plan, canAddProject } = usePlan();

  const [projects, setProjects]                 = useState([]);
  const [teamMembers, setTeamMembers]           = useState([]);
  const [serviceTemplates, setServiceTemplates] = useState([]);
  const [globalContacts, setGlobalContacts]     = useState([]);
  const [timesheetByProject, setTimesheetByProject] = useState({});
  const [tasksByProject, setTasksByProject]     = useState({});
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState("");

  const [selectedUserIds, setSelectedUserIds]   = useState([]);
  const [filterOpen, setFilterOpen]             = useState(false);
  const filterRef                               = useRef(null);
  const [searchQuery, setSearchQuery]           = useState("");
  const [userFilterReady, setUserFilterReady]   = useState(false);
  const [clientFilter, setClientFilter]         = useState("");
  const [sortBy, setSortBy]                     = useState("recenti");
  const [customOrder, setCustomOrder]           = useState([]);
  const [dragId, setDragId]                     = useState(null);
  const [dragOverId, setDragOverId]             = useState(null);

  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [modalStep, setModalStep]               = useState(1);
  const [saveLoading, setSaveLoading]           = useState(false);
  const [formError, setFormError]               = useState("");
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [formData, setFormData] = useState({
    name: "", client: "", address: "", startDate: "",
    selectedServices: [], selectedMembers: [],
    createInlineCommessa: false, numero_offerta: "", importo_offerta_base: "",
    selectedCommessaId: "", gantt_enabled: false,
  });

  const [editModalOpen, setEditModalOpen]       = useState(false);
  const [editProject, setEditProject]           = useState(null);
  const [editFormData, setEditFormData]         = useState({});
  const [editLoading, setEditLoading]           = useState(false);

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState(null);
  const [archiveLoading, setArchiveLoading]     = useState(false);
  const [commessaArchiveModal, setCommessaArchiveModal] = useState(null); // { commessa, residuo, canArchive }
  const [commessaArchiving, setCommessaArchiving]       = useState(false);

  useEscKey(() => {
    if (commessaArchiveModal) { setCommessaArchiveModal(null); return; }
    if (archiveModalOpen)     { setArchiveModalOpen(false); return; }
    if (editModalOpen)        { setEditModalOpen(false); return; }
    if (isModalOpen)          { setIsModalOpen(false); return; }
    if (filterOpen)           { setFilterOpen(false); return; }
  }, commessaArchiveModal || archiveModalOpen || editModalOpen || isModalOpen || filterOpen);

  const [commesseList, setCommesseList]         = useState([]);
  const [toast, setToast]                       = useState("");
  const [annoFiltro, setAnnoFiltro]             = useState(new Date().getFullYear());

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  useEffect(() => {
    function handler(e) { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Imposta filtro utente corrente al primo caricamento
  useEffect(() => {
    if (teamMember?.id && !userFilterReady) {
      setSelectedUserIds([teamMember.id]);
      setUserFilterReady(true);
    }
  }, [teamMember?.id]);

  // Carica ordine personalizzato dal localStorage (per-utente)
  useEffect(() => {
    if (!studioId || !teamMember?.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`sp_proj_order_${studioId}_${teamMember.id}`) || "[]");
      if (Array.isArray(saved)) setCustomOrder(saved);
    } catch {}
  }, [studioId, teamMember?.id]);

  const saveCustomOrder = (order) => {
    if (!studioId || !teamMember?.id) return;
    localStorage.setItem(`sp_proj_order_${studioId}_${teamMember.id}`, JSON.stringify(order));
    setCustomOrder(order);
  };

  const handleDragStart = (projectId) => setDragId(projectId);
  const handleDragOver  = (projectId) => { if (projectId !== dragId) setDragOverId(projectId); };
  const handleDrop      = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    // Ottieni l'ordine corrente visibile (ids dei progetti filtrati)
    const ids = filteredProjectsOrdered.map(p => p.id);
    const from = ids.indexOf(dragId);
    const to   = ids.indexOf(targetId);
    if (from === -1 || to === -1) { setDragId(null); setDragOverId(null); return; }
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    // Salva l'ordine completo: unisci con progetti non visibili attualmente
    const allIds = projects.map(p => p.id);
    const unseen = allIds.filter(id => !next.includes(id));
    saveCustomOrder([...next, ...unseen]);
    setDragId(null); setDragOverId(null);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); };

  const loadCommesseList = async () => {
    if (!studioId) return;
    const { data } = await supabase.from("commesse").select("id,nome_commessa,numero_offerta").eq("studio", studioId).is("deleted_at", null).order("created_at", { ascending: false });
    setCommesseList(data ?? []);
  };

  const loadData = async () => {
    if (!studioId) return;
    setLoading(true); setError("");
    try {
      const { data: projectsData, error: pErr } = await supabase.from("projects").select("*").eq("studio", studioId).eq("archived", false).is("deleted_at", null).order("created_at", { ascending: false });
      if (pErr) throw pErr;
      setProjects(projectsData ?? []);

      const { data: tsData } = await supabase.from("timesheet").select("project_id, hours").eq("studio", studioId).is("deleted_at", null);
      setTimesheetByProject((tsData || []).reduce((acc, t) => ({ ...acc, [t.project_id]: (acc[t.project_id] || 0) + (Number(t.hours) || 0) }), {}));

      const { data: taskData } = await supabase.from("tasks").select("project_id, status, parent_task_id").eq("studio", studioId).is("parent_task_id", null);
      setTasksByProject((taskData || []).reduce((acc, t) => {
        if (!acc[t.project_id]) acc[t.project_id] = { total: 0, completed: 0 };
        acc[t.project_id].total += 1;
        if (t.status === "completed") acc[t.project_id].completed += 1;
        return acc;
      }, {}));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!studioId) return;
    loadData(); loadCommesseList();
    supabase.from("service_task_templates").select("*").eq("studio", studioId).order("order", { ascending: true }).then(({ data }) => setServiceTemplates(data ?? []));
    supabase.from("global_contacts").select("id,full_name").eq("studio", studioId).order("full_name", { ascending: true }).then(({ data }) => setGlobalContacts(data ?? []));
    supabase.from("team_members").select("id,user_name,user_email,color").eq("studio", studioId).order("user_name", { ascending: true }).then(({ data }) => setTeamMembers(data ?? []));
  }, [studioId]);

  const clientiDisponibili = useMemo(() => {
    // Dedup case-insensitive: "Mario" e "mario" sono lo stesso cliente
    const map = new Map();
    projects.forEach(p => {
      const c = typeof p.client === "string" ? p.client.trim() : "";
      if (!c) return;
      const k = c.toLowerCase();
      if (!map.has(k)) map.set(k, c);
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
  }, [projects]);

  const filteredProjectsOrdered = useMemo(() => {
    let result = projects;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(p =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.client || "").toLowerCase().includes(q)
      );
    } else {
      result = result.filter(p => {
        const dateStr = p.start_date || p.created_at;
        const year = dateStr ? new Date(dateStr).getFullYear() : null;
        return year === annoFiltro;
      });
      if (selectedUserIds.length > 0) {
        result = result.filter(p => Array.isArray(p.assigned_users) && p.assigned_users.some(id => selectedUserIds.includes(id)));
      }
    }
    // Filtro cliente
    if (clientFilter) {
      const cf = clientFilter.trim().toLowerCase();
      result = result.filter(p => (p.client || "").trim().toLowerCase() === cf);
    }
    // Ordinamento
    if (sortBy === "nome") {
      result = [...result].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "completamento") {
      result = [...result].sort((a, b) => {
        const ta = tasksByProject[a.id] ?? { total:0, completed:0 };
        const tb = tasksByProject[b.id] ?? { total:0, completed:0 };
        const pa = ta.total > 0 ? ta.completed / ta.total : 0;
        const pb = tb.total > 0 ? tb.completed / tb.total : 0;
        return pb - pa;
      });
    } else if (sortBy === "recenti" && customOrder.length > 0) {
      // Applica ordine personalizzato dell'utente
      result = [...result].sort((a, b) => {
        const ai = customOrder.indexOf(a.id);
        const bi = customOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    }
    return result;
  }, [projects, selectedUserIds, annoFiltro, searchQuery, clientFilter, sortBy, tasksByProject, customOrder]);

  const anniDisponibili = useMemo(() => {
    const anni = new Set(projects.map(p => {
      const d = p.start_date || p.created_at;
      return d ? new Date(d).getFullYear() : null;
    }).filter(Boolean));
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) anni.add(currentYear - i);
    return Array.from(anni).sort((a, b) => b - a);
  }, [projects]);

  const resetForm = () => {
    setFormData({ name: "", client: "", address: "", startDate: "", selectedServices: [], selectedMembers: teamMember?.id ? [teamMember.id] : [], createInlineCommessa: false, numero_offerta: "", importo_offerta_base: "", selectedCommessaId: "" });
    setFormError(""); setModalStep(1);
  };

  const handleChange = (field, isEdit = false) => e => {
    const value = e.target.value;
    if (isEdit) { setEditFormData(p => ({ ...p, [field]: value })); }
    else {
      setFormData(p => ({ ...p, [field]: value }));
      if (field === "client") {
        const q = value.trim().toLowerCase();
        setClientSuggestions(q.length >= 2 ? globalContacts.filter(c => (c.full_name ?? "").toLowerCase().includes(q)).slice(0, 8) : []);
      }
    }
  };

  const upsertContact = async (name) => {
    if (!name?.trim() || !studioId) return;
    const exists = globalContacts.some(
      c => (c.full_name || '').toLowerCase() === name.trim().toLowerCase()
    );
    if (!exists) {
      const { data } = await supabase
        .from('global_contacts')
        .insert({ full_name: name.trim(), studio: studioId, company: '' })
        .select('id,full_name')
        .single();
      if (data) setGlobalContacts(prev =>
        [...prev, data].sort((a, b) => a.full_name.localeCompare(b.full_name))
      );
    }
  };

  const toggleMember = (id, isEdit = false) => {
    if (!isEdit && id === teamMember?.id) return;
    const setter = isEdit ? setEditFormData : setFormData;
    setter(p => {
      const list = p.selectedMembers || [];
      return { ...p, selectedMembers: list.includes(id) ? list.filter(x => x !== id) : [...list, id] };
    });
  };

  const toggleService = (name, isEdit = false) => {
    const setter = isEdit ? setEditFormData : setFormData;
    setter(p => {
      const list = p.selectedServices || [];
      return { ...p, selectedServices: list.includes(name) ? list.filter(x => x !== name) : [...list, name] };
    });
  };

  const goToStep2 = e => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.client.trim()) { setFormError("Nome progetto e cliente sono obbligatori."); return; }
    setFormError(""); setModalStep(2);
  };

  const handleSaveProject = async e => {
    e.preventDefault(); setFormError(""); setSaveLoading(true);
    if (!canAddProject(projects.length)) {
      setFormError(`Piano ${plan.name}: hai raggiunto il limite di ${plan.maxProjects} progetti attivi. Archivia i progetti completati o fai l'upgrade.`);
      setSaveLoading(false);
      return;
    }
    const assignedUsers = formData.selectedMembers.length > 0 ? formData.selectedMembers : (teamMember?.id ? [teamMember.id] : []);
    // Aggancia alla grafia di un contatto esistente (no nuove varianti di case)
    const _ct = formData.client.trim();
    const _match = globalContacts.find(c => (c.full_name || "").trim().toLowerCase() === _ct.toLowerCase());
    const clientCanon = _match ? _match.full_name : _ct;
    const payload = { name: formData.name.trim(), client: clientCanon, address: formData.address.trim() || null, start_date: formData.startDate || null, status: "planning", total_hours: 0, servizi_selezionati: formData.selectedServices, assigned_users: assignedUsers, studio: studioId, gantt_enabled: !!formData.gantt_enabled };
    await upsertContact(clientCanon);
    const { data: newProject, error: insertError } = await supabase.from("projects").insert(payload).select("*").single();
    if (insertError) { setFormError(insertError.message); setSaveLoading(false); return; }
    if (formData.selectedCommessaId) {
      await supabase.from("commesse").update({ project_id: newProject.id }).eq("id", formData.selectedCommessaId);
      await supabase.from("projects").update({ commessa_id: formData.selectedCommessaId }).eq("id", newProject.id);
    }
    if (formData.createInlineCommessa && formData.numero_offerta.trim() && formData.importo_offerta_base) {
      const { data: nc, error: ce } = await supabase.from("commesse").insert({ nome_commessa: formData.name.trim(), cliente: formData.client.trim(), numero_offerta: formData.numero_offerta.trim(), importo_offerta_base: Number(formData.importo_offerta_base), project_id: newProject.id, studio: studioId }).select("*").single();
      if (!ce && nc) { await supabase.from("projects").update({ commessa_id: nc.id }).eq("id", newProject.id); showToast("Progetto e commessa creati e collegati correttamente"); }
    }
    // Crea task predefinite per ogni servizio selezionato
    if (formData.selectedServices.length > 0) {
      const taskRows = [];
      for (const serviceName of formData.selectedServices) {
        const template = serviceTemplates.find(t => t.service_name === serviceName);
        const taskList = Array.isArray(template?.task_templates) ? template.task_templates : [];
        for (const taskName of taskList) {
          taskRows.push({ project_id: newProject.id, title: taskName, categoria: serviceName, status: "todo", studio: studioId });
        }
      }
      if (taskRows.length > 0) await supabase.from("tasks").insert(taskRows);
    }
    setIsModalOpen(false); resetForm(); await loadData(); setSaveLoading(false);
  };

  const openEditModal = project => {
    setEditProject(project);
    setEditFormData({ name: project.name || "", client: project.client || "", address: project.address || "", start_date: project.start_date || "", selectedServices: project.servizi_selezionati || [], selectedMembers: project.assigned_users || [], selectedCommessaId: project.commessa_id || "", gantt_enabled: !!project.gantt_enabled });
    loadCommesseList(); setEditModalOpen(true);
  };

  const handleEditProject = async e => {
    e.preventDefault(); if (!editProject) return; setEditLoading(true);
    const _ect = editFormData.client.trim();
    const _ematch = globalContacts.find(c => (c.full_name || "").trim().toLowerCase() === _ect.toLowerCase());
    const editClientCanon = _ematch ? _ematch.full_name : _ect;
    const payload = { name: editFormData.name.trim(), client: editClientCanon, address: editFormData.address?.trim() || null, start_date: editFormData.start_date || null, servizi_selezionati: editFormData.selectedServices, assigned_users: editFormData.selectedMembers, gantt_enabled: !!editFormData.gantt_enabled };
    await upsertContact(editClientCanon);
    const { error: uErr } = await supabase.from("projects").update(payload).eq("id", editProject.id);
    if (!uErr) {
      const newCid = editFormData.selectedCommessaId || null;
      if (editProject.commessa_id && editProject.commessa_id !== newCid) await supabase.from("commesse").update({ project_id: null }).eq("id", editProject.commessa_id);
      await supabase.from("projects").update({ commessa_id: newCid }).eq("id", editProject.id);
      if (newCid) await supabase.from("commesse").update({ project_id: editProject.id }).eq("id", newCid);
      setEditModalOpen(false); setEditProject(null); await loadData();
    }
    setEditLoading(false);
  };

  const openArchiveModal = (project, e) => { e.stopPropagation(); setProjectToArchive(project); setArchiveModalOpen(true); };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Eliminare il progetto "${project.name}"? Verrà spostato nel cestino.`)) return;
    const { error } = await supabase.rpc('elimina_progetto', { p_project_id: project.id });
    if (error) { showToast('Errore: ' + error.message); return; }
    setProjects(prev => prev.filter(p => p.id !== project.id));
    showToast("Progetto eliminato", "success");
  };
  const handleArchiveProject = async () => {
    if (!projectToArchive) return;
    setArchiveLoading(true);

    // Cattura i dati necessari PRIMA degli await per evitare stale closure
    const projectId    = projectToArchive.id;
    const projectName  = projectToArchive.name;
    let   commessaId   = projectToArchive.commessa_id;

    // Se commessa_id non è sul progetto, cerca tramite project_id sulla commessa
    if (!commessaId) {
      const { data: linked } = await supabase
        .from("commesse").select("id").eq("project_id", projectId).eq("archived", false).maybeSingle();
      commessaId = linked?.id || null;
    }

    const { error } = await supabase.from("projects").update({ archived: true }).eq("id", projectId);
    if (error) { setArchiveLoading(false); return; }

    setArchiveModalOpen(false);
    setProjectToArchive(null);
    setArchiveLoading(false);
    showToast("Progetto archiviato", "success");
    await loadData();

    // Controlla commessa collegata
    if (commessaId) {
      const { data: commessa } = await supabase
        .from("commesse").select("id, nome_commessa, importo_offerta_base, archived")
        .eq("id", commessaId).single();
      if (commessa && !commessa.archived) {
        const importoBase = Number(commessa.importo_offerta_base) || 0;
        const { data: ratePagate } = await supabase
          .from("suddivisione_pagamenti")
          .select("percentuale, importo_fisso")
          .eq("commessa_id", commessa.id)
          .eq("pagato", true);
        const incassato = (ratePagate || []).reduce((s, r) =>
          s + (Number(r.importo_fisso) || (importoBase * (Number(r.percentuale) || 0) / 100)), 0);
        const residuo = importoBase - incassato;
        setCommessaArchiveModal({ commessa, residuo, canArchive: Math.abs(residuo) < 0.01 });
      }
    }
  };

  const handleArchiveCommessa = async () => {
    if (!commessaArchiveModal?.commessa) return;
    setCommessaArchiving(true);
    await supabase.from("commesse").update({ archived: true }).eq("id", commessaArchiveModal.commessa.id);
    setCommessaArchiving(false);
    setCommessaArchiveModal(null);
  };

  if (studioLoading || !studioId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
      Caricamento...
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', color: T.ink }}>Progetti</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 2 }}>Panoramica dei progetti attivi</div>
              </div>
              <input type="text" placeholder="Cerca progetto o cliente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: '1 1 0', minWidth: 0, maxWidth: 200, padding: '8px 12px', border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={annoFiltro} onChange={e => setAnnoFiltro(Number(e.target.value))}
                style={{ padding: '8px 10px', border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, cursor: 'pointer', outline: 'none', opacity: searchQuery ? 0.4 : 1 }}>
                {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {clientiDisponibili.length > 0 && (
                <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
                  style={{ padding: '8px 10px', border: `1px solid ${clientFilter ? T.navy : T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: clientFilter ? T.navy : T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, cursor: 'pointer', outline: 'none' }}>
                  <option value="">Tutti i clienti</option>
                  {clientiDisponibili.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ padding: '8px 10px', border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, cursor: 'pointer', outline: 'none' }}>
                <option value="recenti">Più recenti</option>
                <option value="nome">Nome A–Z</option>
                <option value="completamento">% Completamento</option>
              </select>
              <div ref={filterRef} style={{ position: 'relative' }}>
                <BtnGhost onClick={() => setFilterOpen(!filterOpen)}>Utenti ({selectedUserIds.length})</BtnGhost>
                {filterOpen && (
                  <div style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, width: 220, background: T.surface, border: `1px solid ${T.borderMd}`, zIndex: 20 }}>
                    <div style={{ padding: 8, maxHeight: 240, overflowY: 'auto' }}>
                      {teamMembers.map(m => (
                        <CheckRow key={m.id} checked={selectedUserIds.includes(m.id)}
                          onChange={() => setSelectedUserIds(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                          label={`${m.user_name || m.user_email}${m.id === teamMember?.id ? ' (io)' : ''}`}
                          avatar={{ bg: avatarColor(m), initials: getInitials(m.user_name || m.user_email) }}
                        />
                      ))}
                    </div>
                    <div style={{ borderTop: `0.5px solid ${T.border}`, padding: 8 }}>
                      <button onClick={() => { setSelectedUserIds([]); setClientFilter(""); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, letterSpacing: '0.05em' }}>Rimuovi tutti i filtri</button>
                    </div>
                  </div>
                )}
              </div>
              {permissions.canCreateProjects && (
                <BtnPrimary onClick={() => { resetForm(); setIsModalOpen(true); }}>+ Nuovo</BtnPrimary>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', color: T.ink }}>Progetti</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 2, letterSpacing: '0.05em' }}>Panoramica dei progetti attivi</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input type="text" placeholder="Cerca progetto o cliente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: '1 1 160px', minWidth: 0, maxWidth: 240, padding: '8px 12px', border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, outline: 'none', boxSizing: 'border-box' }}
              />
              <select value={annoFiltro} onChange={e => setAnnoFiltro(Number(e.target.value))}
                style={{ padding: '8px 10px', border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, cursor: 'pointer', outline: 'none', appearance: 'auto', opacity: searchQuery ? 0.4 : 1 }}>
                {anniDisponibili.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {clientiDisponibili.length > 0 && (
                <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
                  style={{ padding: '8px 10px', border: `1px solid ${clientFilter ? T.navy : T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: clientFilter ? T.navy : T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, cursor: 'pointer', outline: 'none' }}>
                  <option value="">Tutti i clienti</option>
                  {clientiDisponibili.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ padding: '8px 10px', border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, cursor: 'pointer', outline: 'none' }}>
                <option value="recenti">Più recenti</option>
                <option value="nome">Nome A–Z</option>
                <option value="completamento">% Completamento</option>
              </select>
              <div ref={filterRef} style={{ position: 'relative' }}>
                <BtnGhost onClick={() => setFilterOpen(!filterOpen)}>Utenti ({selectedUserIds.length})</BtnGhost>
                {filterOpen && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 220, background: T.surface, border: `1px solid ${T.borderMd}`, zIndex: 20 }}>
                    <div style={{ padding: 8, maxHeight: 240, overflowY: 'auto' }}>
                      {teamMembers.map(m => (
                        <CheckRow key={m.id} checked={selectedUserIds.includes(m.id)}
                          onChange={() => setSelectedUserIds(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                          label={`${m.user_name || m.user_email}${m.id === teamMember?.id ? ' (io)' : ''}`}
                          avatar={{ bg: avatarColor(m), initials: getInitials(m.user_name || m.user_email) }}
                        />
                      ))}
                    </div>
                    <div style={{ borderTop: `0.5px solid ${T.border}`, padding: 8 }}>
                      <button onClick={() => { setSelectedUserIds([]); setClientFilter(""); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, letterSpacing: '0.05em' }}>Rimuovi tutti i filtri</button>
                    </div>
                  </div>
                )}
              </div>
              {permissions.canCreateProjects && (
                <BtnPrimary onClick={() => { resetForm(); setIsModalOpen(true); }}>+ Nuovo</BtnPrimary>
              )}
            </div>
          </div>
        )}
        {permissions.canCreateProjects && !canAddProject(projects.length) && (
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color: T.red, marginTop:8 }}>
            Limite {plan.maxProjects} progetti attivi raggiunto — archivia i completati o <button onClick={() => navigate('/impostazioni/piano')} style={{ background:'none', border:'none', cursor:'pointer', color: T.navy, fontFamily:"'IBM Plex Mono', monospace", fontSize:10, textDecoration:'underline' }}>fai l'upgrade</button>
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
      ) : error ? (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.surface, padding: 32, textAlign: 'center', color: T.red, fontSize: 13 }}>Errore: {error}</div>
      ) : filteredProjectsOrdered.length === 0 ? (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.surface, padding: 48, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
          {searchQuery ? `Nessun progetto trovato per "${searchQuery}".` : selectedUserIds.length > 0 ? "Nessun progetto per gli utenti selezionati." : "Nessun progetto disponibile."}
        </div>
      ) : (
        <>
          {sortBy === "recenti" && !isMobile && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              ↕ Trascina per riordinare
            </div>
          )}
          <div className="asm-list asm-fade-in" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {filteredProjectsOrdered.map(project => (
              <ProjectCard
                key={project.id} project={project}
                timesheetByProject={timesheetByProject} tasksByProject={tasksByProject}
                teamMembers={teamMembers} onEdit={openEditModal}
                onArchive={openArchiveModal} onDelete={handleDeleteProject} navigate={navigate}
                draggable={sortBy === "recenti" && !isMobile}
                isDragging={dragId === project.id}
                isDragOver={dragOverId === project.id}
                onDragStart={() => handleDragStart(project.id)}
                onDragOver={() => handleDragOver(project.id)}
                onDrop={() => handleDrop(project.id)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: T.navy, color: T.bg, padding: '10px 20px',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.05em', zIndex: 100,
        }}>✓ {toast}</div>
      )}

      {/* MODAL: NUOVO PROGETTO */}
      <Modal open={isModalOpen} onClose={() => { if (!saveLoading) { setIsModalOpen(false); setFormError(""); setModalStep(1); } }}
        title="Nuovo Progetto"
        subtitle={`Step ${modalStep} di 2 — ${modalStep === 1 ? "Dati principali" : "Commessa collegata"}`}
      >
        <form onSubmit={modalStep === 1 ? goToStep2 : handleSaveProject}>
          {modalStep === 1 && (
            <ProjectForm
              data={formData} onChange={handleChange}
              teamMembers={teamMembers} serviceTemplates={serviceTemplates}
              globalContacts={globalContacts} currentMemberId={teamMember?.id}
              onToggleMember={id => toggleMember(id, false)}
              onToggleService={name => toggleService(name, false)}
              clientSuggestions={clientSuggestions}
              onSelectClient={name => { setFormData(p => ({ ...p, client: name })); setClientSuggestions([]); }}
              onGanttChange={e => setFormData(p => ({ ...p, gantt_enabled: e.target.checked }))}
            />
          )}

          {modalStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.bg }}>
                <input type="checkbox" checked={formData.createInlineCommessa} onChange={e => setFormData(p => ({ ...p, createInlineCommessa: e.target.checked }))} style={{ accentColor: T.navy, width: 14, height: 14 }} />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink, letterSpacing: '0.05em' }}>Crea anche la commessa per questo progetto</span>
              </label>

              {formData.createInlineCommessa && (
                <>
                  <div>
                    <FieldLabel>Numero offerta *</FieldLabel>
                    <Input value={formData.numero_offerta} onChange={e => setFormData(p => ({ ...p, numero_offerta: e.target.value }))} placeholder="Es. 01/2026" />
                  </div>
                  <div>
                    <FieldLabel>Importo offerta base *</FieldLabel>
                    <Input type="number" value={formData.importo_offerta_base} onChange={e => setFormData(p => ({ ...p, importo_offerta_base: e.target.value }))} placeholder="0" />
                  </div>
                </>
              )}
            </div>
          )}

          {formError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, marginTop: 12 }}>{formError}</div>}

          <Divider />
          <div style={{ display: 'flex', justifyContent: modalStep === 2 ? 'space-between' : 'flex-end', gap: 10 }}>
            {modalStep === 2 && <BtnGhost onClick={() => { setModalStep(1); setFormError(""); }}>← Indietro</BtnGhost>}
            <div style={{ display: 'flex', gap: 10 }}>
              <BtnGhost onClick={() => { setIsModalOpen(false); setFormError(""); setModalStep(1); }}>Annulla</BtnGhost>
              <BtnPrimary type="submit" disabled={saveLoading}>
                {modalStep === 1 ? "Avanti →" : saveLoading ? "Salvataggio..." : "Salva"}
              </BtnPrimary>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL: MODIFICA PROGETTO */}
      <Modal open={editModalOpen && !!editProject} onClose={() => { if (!editLoading) setEditModalOpen(false); }} title="Modifica Progetto" subtitle="Aggiorna i dati del progetto">
        <form onSubmit={handleEditProject}>
          <ProjectForm
            data={editFormData} onChange={f => handleChange(f, true)}
            teamMembers={teamMembers} serviceTemplates={serviceTemplates}
            globalContacts={globalContacts} currentMemberId={null}
            onToggleMember={id => toggleMember(id, true)}
            onToggleService={name => toggleService(name, true)}
            onGanttChange={e => setEditFormData(p => ({ ...p, gantt_enabled: e.target.checked }))}
            isEdit
          />
          <div style={{ marginTop: 14 }}>
            <FieldLabel>Commessa collegata</FieldLabel>
            <select value={editFormData.selectedCommessaId ?? ""} onChange={e => setEditFormData(p => ({ ...p, selectedCommessaId: e.target.value }))}
              style={{ width: '100%', padding: '8px 12px', border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none' }}>
              <option value="">Nessuna</option>
              {commesseList.map(c => <option key={c.id} value={c.id}>{c.numero_offerta ? `${c.numero_offerta} — ` : ""}{c.nome_commessa}</option>)}
            </select>
          </div>
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <BtnGhost onClick={() => setEditModalOpen(false)} disabled={editLoading}>Annulla</BtnGhost>
            <BtnPrimary type="submit" disabled={editLoading}>{editLoading ? "Salvataggio..." : "Salva"}</BtnPrimary>
          </div>
        </form>
      </Modal>

      {/* MODAL: ARCHIVIA PROGETTO */}
      <Modal open={archiveModalOpen && !!projectToArchive} onClose={() => { if (!archiveLoading) setArchiveModalOpen(false); }} title="Archivia progetto?" width={420}>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, lineHeight: 1.7, marginBottom: 20 }}>
          Il progetto <strong style={{ color: T.ink }}>{projectToArchive?.name}</strong> non sarà più visibile nella lista principale.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <BtnGhost onClick={() => setArchiveModalOpen(false)} disabled={archiveLoading}>Annulla</BtnGhost>
          <BtnGhost danger onClick={handleArchiveProject} disabled={archiveLoading}>{archiveLoading ? "Archiviazione..." : "Archivia"}</BtnGhost>
        </div>
      </Modal>

      {/* MODAL: ARCHIVIA ANCHE COMMESSA? */}
      {commessaArchiveModal && (
        <Modal open={true} onClose={() => setCommessaArchiveModal(null)} title={commessaArchiveModal.canArchive ? "Archiviare anche la commessa?" : "Commessa con saldo in sospeso"} width={440}>
          {commessaArchiveModal.canArchive ? (
            <>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, lineHeight: 1.7, marginBottom: 8 }}>
                La commessa collegata <strong style={{ color: T.ink }}>{commessaArchiveModal.commessa.nome_commessa}</strong> ha saldo a zero.
              </p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, lineHeight: 1.7, marginBottom: 20 }}>
                Vuoi archiviarla insieme al progetto?
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <BtnGhost onClick={() => setCommessaArchiveModal(null)} disabled={commessaArchiving}>No, lascia attiva</BtnGhost>
                <BtnPrimary onClick={handleArchiveCommessa} disabled={commessaArchiving}>{commessaArchiving ? "Archiviazione..." : "Sì, archivia commessa"}</BtnPrimary>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: '#fefce8', border: '0.5px solid #fbbf24', padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#92400e', lineHeight: 1.7 }}>
                  La commessa <strong>{commessaArchiveModal.commessa.nome_commessa}</strong> ha ancora{' '}
                  <strong>{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(Math.abs(commessaArchiveModal.residuo))}</strong>{' '}
                  di residuo non incassato e non verrà archiviata.
                </div>
              </div>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, lineHeight: 1.7, marginBottom: 20 }}>
                Il progetto è stato archiviato. Puoi archiviare la commessa manualmente una volta saldato il pagamento.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <BtnPrimary onClick={() => setCommessaArchiveModal(null)}>Ok, capito</BtnPrimary>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
