import { useEffect, useMemo, useState } from "react";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { usePermissions } from "../hooks/usePermissions";
import { usePlan } from "../hooks/usePlan";
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";
import { formatOre } from "../lib/utils";
import { ROLE_OPTIONS, ROLE_LABELS, ROLE_DESCRIPTIONS, PERMISSION_SECTIONS } from "../hooks/usePermissions";
import { useTheme } from "../contexts/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { useEscKey } from "../hooks/useEscKey";
import SlidingTabs from "../components/SlidingTabs";
import { useToast } from "../contexts/ToastContext";

// ── COLORI / HELPERS ─────────────────────────────────────────────
const PREDEFINED_COLORS = ["#13315C","#1a6b3c","#7c3aed","#b45309","#be185d","#0e7490","#0a84ff","#30d158","#ff9f0a","#ff453a","#bf5af2","#64d2ff"];

const PERM_SUMMARY = {
  "Owner":                 ["Tutto — gestione completa"],
  "Partner":               ["Tutto — stesso del Titolare"],
  "Project Manager":       ["Progetti e commesse", "Finanziari e report", "Timesheet team"],
  "Architetto":            ["Progetti (lettura)", "Task e timesheet propri"],
  "Ingegnere":             ["Progetti (lettura)", "Task e timesheet propri"],
  "Collaboratore Interno": ["Task assegnate", "Timesheet proprio"],
  "Collaboratore Esterno": ["Task assegnate", "Timesheet proprio"],
};

const ROLE_BASE_PERMS = {
  "Owner":                 { canViewProjects:true, canCreateProjects:true, canEditProjects:true, canArchiveProjects:true, canViewCommesse:true, canManageCommesse:true, canViewFinancials:true, canViewReport:true, canViewMonitoraggio:true, canCompleteOwnTask:true, canViewAllTimesheets:true, canEditTask:true, canAssignTasks:true, canManageUsers:true, canManageSettings:true, canDeleteAnything:true, canViewReportCantiere:true, canManageReportCantiere:true },
  "Partner":               { canViewProjects:true, canCreateProjects:true, canEditProjects:true, canArchiveProjects:true, canViewCommesse:true, canManageCommesse:true, canViewFinancials:true, canViewReport:true, canViewMonitoraggio:true, canCompleteOwnTask:true, canViewAllTimesheets:true, canEditTask:true, canAssignTasks:true, canManageUsers:true, canManageSettings:true, canDeleteAnything:true, canViewReportCantiere:true, canManageReportCantiere:true },
  "Project Manager":       { canViewProjects:true, canCreateProjects:true, canEditProjects:true, canArchiveProjects:false, canViewCommesse:true, canManageCommesse:true, canViewFinancials:true, canViewReport:true, canViewMonitoraggio:true, canCompleteOwnTask:true, canViewAllTimesheets:true, canEditTask:true, canAssignTasks:true, canManageUsers:false, canManageSettings:false, canDeleteAnything:false, canViewReportCantiere:true, canManageReportCantiere:true },
  "Architetto":            { canViewProjects:true, canCreateProjects:false, canEditProjects:false, canArchiveProjects:false, canViewCommesse:false, canManageCommesse:false, canViewFinancials:false, canViewReport:false, canViewMonitoraggio:false, canCompleteOwnTask:true, canViewAllTimesheets:false, canEditTask:true, canAssignTasks:false, canManageUsers:false, canManageSettings:false, canDeleteAnything:false, canViewReportCantiere:true, canManageReportCantiere:false },
  "Ingegnere":             { canViewProjects:true, canCreateProjects:false, canEditProjects:false, canArchiveProjects:false, canViewCommesse:false, canManageCommesse:false, canViewFinancials:false, canViewReport:false, canViewMonitoraggio:false, canCompleteOwnTask:true, canViewAllTimesheets:false, canEditTask:true, canAssignTasks:false, canManageUsers:false, canManageSettings:false, canDeleteAnything:false, canViewReportCantiere:true, canManageReportCantiere:false },
  "Collaboratore Interno": { canViewProjects:true, canCreateProjects:false, canEditProjects:false, canArchiveProjects:false, canViewCommesse:false, canManageCommesse:false, canViewFinancials:false, canViewReport:false, canViewMonitoraggio:false, canCompleteOwnTask:true, canViewAllTimesheets:false, canEditTask:true, canAssignTasks:false, canManageUsers:false, canManageSettings:false, canDeleteAnything:false, canViewReportCantiere:true, canManageReportCantiere:false },
  "Collaboratore Esterno": { canViewProjects:false, canCreateProjects:false, canEditProjects:false, canArchiveProjects:false, canViewCommesse:false, canManageCommesse:false, canViewFinancials:false, canViewReport:false, canViewMonitoraggio:false, canCompleteOwnTask:true, canViewAllTimesheets:false, canEditTask:true, canAssignTasks:false, canManageUsers:false, canManageSettings:false, canDeleteAnything:false, canViewReportCantiere:true, canManageReportCantiere:false },
};

function getInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

const AVATAR_COLORS = ["#13315C","#1a6b3c","#7c3aed","#b45309","#be185d","#0e7490"];
function avatarColor(seed = "") {
  let h = 0; for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getMondayISODate() {
  const now = new Date(); const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + diff); now.setHours(0,0,0,0);
  return now.toISOString().slice(0, 10);
}

// ── UI ATOMS ─────────────────────────────────────────────────────
function FieldLabel({ children }) {
  const { T } = useTheme();
  return <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:6 }}>{children}</div>;
}
function Input({ value, onChange, type = "text", required }) {
  const { T } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} required={required}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ width:'100%', padding:'8px 12px', boxSizing:'border-box', border:`0.5px solid ${focus ? T.navy : T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontSize:13, fontFamily:"'Space Grotesk', sans-serif", outline:'none' }} />
  );
}
function BtnPrimary({ children, onClick, disabled, type = "button" }) {
  const { T } = useTheme();
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ background:T.navy, color:T.bg, border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:disabled ? 'not-allowed' : 'pointer', opacity:disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}
function BtnGhost({ children, onClick, disabled }) {
  const { T } = useTheme();
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ background:'transparent', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:disabled ? 'not-allowed' : 'pointer', opacity:disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

function RoleBadge({ role }) {
  const { T } = useTheme();
  const isTop = role === "Owner" || role === "Partner";
  const isPM  = role === "Project Manager";
  const c = isTop ? T.navy : isPM ? '#7c3aed' : T.muted;
  return (
    <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', padding:'2px 6px', color:c, border:`0.5px solid ${c}`, display:'inline-block' }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────
export default function TeamPage() {
  usePageTitleOnMount("Team");
  const { T } = useTheme();
  const showToast = useToast();
  const isMobile = useIsMobile();
  const { studioId, loading: studioLoading, teamMember: currentMember } = useStudio();
  const permissions = usePermissions();
  const { plan, canAddUser } = usePlan();

  // ── dati ────────────────────────────────────────────────────────
  const [members, setMembers]             = useState([]);
  const [statsByMember, setStatsByMember] = useState({});
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [annoFiltro, setAnnoFiltro]       = useState(new Date().getFullYear());

  // ── selezione/editing ────────────────────────────────────────────
  const [selectedMember, setSelectedMember] = useState(null);
  const [editRole, setEditRole]             = useState("");
  const [editColor, setEditColor]           = useState("");
  const [editPerms, setEditPerms]           = useState({});
  const [activeTab, setActiveTab]           = useState("role");
  const [saving, setSaving]                 = useState(false);
  const [confirmRemove, setConfirmRemove]   = useState(false);
  const [removing, setRemoving]             = useState(false);

  // ── modale aggiungi ──────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  useEscKey(() => setModalOpen(false), modalOpen);
  const [formError, setFormError] = useState("");
  const [formData, setFormData]   = useState({ user_name:"", user_email:"", role_internal:"Architetto" });

  // ── load ─────────────────────────────────────────────────────────
  const loadData = async (anno) => {
    if (!studioId) return;
    setLoading(true); setError("");
    const currentAnno = anno ?? annoFiltro;
    const monday = getMondayISODate();
    const sundayDate = new Date(monday); sundayDate.setDate(sundayDate.getDate() + 6);
    const sunday = sundayDate.toISOString().slice(0, 10);

    const [{ data: authData, error: authError }, membersR, weekTsR, tasksR] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("team_members").select("*").eq("studio", studioId).order("user_name", { ascending: true }),
      supabase.from("timesheet").select("team_member,hours").is("deleted_at", null).gte("date", monday).lte("date", sunday),
      supabase.from("tasks").select("assigned_member,status,project_id").eq("studio", studioId).is("deleted_at", null),
    ]);

    if (authError || !authData?.user?.id) { setError(authError?.message || "Utente non autenticato."); setLoading(false); return; }
    if (membersR.error) { setError(membersR.error.message); setLoading(false); return; }

    const loadedMembers = membersR.data ?? [];
    const stats = {};
    loadedMembers.forEach(m => { stats[m.id] = { weeklyHours:0, activeTasks:0, totalTasks:0, completedTasks:0, projectsSet:new Set() }; });
    (weekTsR.data ?? []).forEach(e => { if (stats[e.team_member]) stats[e.team_member].weeklyHours += Number(e.hours) || 0; });
    (tasksR.data ?? []).forEach(t => {
      if (!stats[t.assigned_member]) return;
      stats[t.assigned_member].totalTasks += 1;
      if (t.status === "completed") stats[t.assigned_member].completedTasks += 1;
      else stats[t.assigned_member].activeTasks += 1;
      if (t.project_id) stats[t.assigned_member].projectsSet.add(t.project_id);
    });
    const normalized = {};
    Object.entries(stats).forEach(([id, v]) => {
      normalized[id] = { weeklyHours:v.weeklyHours, activeTasks:v.activeTasks, totalTasks:v.totalTasks, completedTasks:v.completedTasks, projects:v.projectsSet.size };
    });

    let current = loadedMembers.find(m => m.user_account === authData.user.id);
    if (!current) {
      try { current = await getOrCreateTeamMember(authData.user); loadedMembers.push(current); }
      catch (e) { setError(e.message); setLoading(false); return; }
    }
    setMembers(loadedMembers);
    setStatsByMember(normalized);
    // aggiorna anche il pannello di dettaglio se aperto
    setSelectedMember(prev => prev ? loadedMembers.find(m => m.id === prev.id) || null : null);
    setLoading(false);
  };

  useEffect(() => { if (studioId) loadData(annoFiltro); }, [studioId, annoFiltro]);

  const cards = useMemo(() => members.map(m => {
    const s = statsByMember[m.id] ?? { weeklyHours:0, activeTasks:0, projects:0, completedTasks:0, totalTasks:0 };
    const progress = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
    return { member:m, stats:s, progress };
  }), [members, statsByMember]);

  // ── apertura pannello ─────────────────────────────────────────────
  const openMember = (m) => {
    setSelectedMember(m);
    setEditRole(m.role_internal || "Architetto");
    setEditColor(m.color || PREDEFINED_COLORS[0]);
    setEditPerms(m.custom_permissions || {});
    setActiveTab("role");
    setConfirmRemove(false);
  };

  // ── salvataggio ruolo ─────────────────────────────────────────────
  const handleSaveRole = async () => {
    if (!selectedMember || selectedMember.id === currentMember?.id) return;
    setSaving(true);
    const { error: e } = await supabase.from("team_members").update({ role_internal:editRole, custom_permissions:null }).eq("id", selectedMember.id);
    if (e) { showToast("Errore: " + e.message); setSaving(false); return; }
    setMembers(p => p.map(m => m.id === selectedMember.id ? { ...m, role_internal:editRole, custom_permissions:null } : m));
    setSelectedMember(p => ({ ...p, role_internal:editRole, custom_permissions:null }));
    setEditPerms({});
    setSaving(false);
  };

  // ── salvataggio permessi ──────────────────────────────────────────
  const handleSavePerms = async () => {
    if (!selectedMember || selectedMember.id === currentMember?.id) return;
    setSaving(true);
    const base = ROLE_BASE_PERMS[editRole] || ROLE_BASE_PERMS["Collaboratore Interno"];
    const overrides = {};
    for (const [k, v] of Object.entries(editPerms)) {
      if (base[k] !== undefined && base[k] !== v) overrides[k] = v;
    }
    const toSave = Object.keys(overrides).length > 0 ? overrides : null;
    const { error: e } = await supabase.from("team_members").update({ custom_permissions:toSave }).eq("id", selectedMember.id);
    if (e) { showToast("Errore: " + e.message); setSaving(false); return; }
    setMembers(p => p.map(m => m.id === selectedMember.id ? { ...m, custom_permissions:toSave } : m));
    setSelectedMember(p => ({ ...p, custom_permissions:toSave }));
    setSaving(false);
  };

  // ── salvataggio colore ────────────────────────────────────────────
  const handleSaveColor = async () => {
    if (!selectedMember) return;
    setSaving(true);
    const { error: e } = await supabase.from("team_members").update({ color:editColor }).eq("id", selectedMember.id);
    if (e) { showToast("Errore: " + e.message); setSaving(false); return; }
    setMembers(p => p.map(m => m.id === selectedMember.id ? { ...m, color:editColor } : m));
    setSelectedMember(p => ({ ...p, color:editColor }));
    setSaving(false);
  };

  // ── rimozione utente ──────────────────────────────────────────────
  const handleRemoveUser = async () => {
    if (!selectedMember) return;
    setRemoving(true);
    const { error: e } = await supabase.from("team_members").delete().eq("id", selectedMember.id);
    if (e) { showToast("Errore: " + e.message); setRemoving(false); return; }
    setMembers(p => p.filter(m => m.id !== selectedMember.id));
    setSelectedMember(null);
    setConfirmRemove(false);
    setRemoving(false);
  };

  // ── aggiungi membro ───────────────────────────────────────────────
  const handleSaveMember = async (e) => {
    e.preventDefault(); setFormError("");
    if (!formData.user_name.trim() || !formData.user_email.trim() || !formData.role_internal) { setFormError("Compila tutti i campi."); return; }
    if (!canAddUser(members.length)) {
      setFormError(`Piano ${plan.name}: hai raggiunto il limite di ${plan.maxUsers} utenti.`);
      return;
    }
    setSaving(true);
    const { data, error: iErr } = await supabase.from("team_members").insert({ user_name:formData.user_name.trim(), user_email:formData.user_email.trim(), role_internal:formData.role_internal, studio:studioId }).select("*").single();
    if (iErr) { setFormError(iErr.message); setSaving(false); return; }
    setMembers(p => [...p, data].sort((a, b) => a.user_name.localeCompare(b.user_name, "it")));
    setStatsByMember(p => ({ ...p, [data.id]:{ weeklyHours:0, activeTasks:0, totalTasks:0, completedTasks:0, projects:0 } }));
    setSaving(false); setModalOpen(false);
  };

  const canEditRoles = currentMember?.role_internal === "Owner" || currentMember?.role_internal === "Partner";
  const isOwnProfile = selectedMember?.id === currentMember?.id;

  // ── stili comuni ──────────────────────────────────────────────────
  const statSt  = { background:T.bg, border:`1px solid ${T.border}`, padding:'10px 12px', borderRadius:T.radiusSm };
  const statLbl = { fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:5 };
  const statVal = { fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.03em', fontFamily:"'Space Grotesk', sans-serif" };
  const tabBtn  = (active) => ({ padding:'7px 14px', border:'none', background:'transparent', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:active ? T.navy : T.muted, borderBottom:`1.5px solid ${active ? T.navy : 'transparent'}`, marginBottom:-0.5 });

  if (studioLoading || !studioId || loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>Caricamento team...</div>
  );
  if (error) return (
    <div style={{ border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, background:T.surface, padding:32, color:T.red, fontSize:13 }}>Errore: {error}</div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.03em', color:T.ink }}>Team</div>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:2 }}>
            Ore e produttività — {annoFiltro}
            {" · "}
            <span>{members.length} / {plan.maxUsers === Infinity ? '∞' : plan.maxUsers} membri</span>
            {members.length >= plan.maxUsers && plan.maxUsers !== Infinity && (
              <span style={{ color:T.red, marginLeft:8 }}>· limite raggiunto</span>
            )}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <select value={annoFiltro} onChange={e => setAnnoFiltro(Number(e.target.value))}
            style={{ padding:'4px 8px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, cursor:'pointer', outline:'none', appearance:'auto' }}>
            {Array.from({ length:5 }, (_, i) => new Date().getFullYear() - i).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          {permissions.canManageUsers && (
            <BtnPrimary onClick={() => { setFormError(""); setFormData({ user_name:"", user_email:"", role_internal:"Architetto" }); setModalOpen(true); }}>
              + Aggiungi membro
            </BtnPrimary>
          )}
        </div>
      </div>

      {/* ── BODY: griglia card (nessuna selezione) o split view ── */}
      {!selectedMember ? (

        /* ── CARD GRID ── */
        <div className="asm-list asm-fade-in" style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : 'repeat(2, 1fr)', gap:10 }}>
          {cards.length === 0 ? (
            <div style={{ gridColumn:'1/-1', background:T.surface, border:`1px solid ${T.border}`, padding:'48px 0', textAlign:'center', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, borderRadius:T.radius }}>
              Nessun membro presente.
            </div>
          ) : cards.map(({ member:m, stats:s, progress }) => (
            <div key={m.id}
              onClick={() => canEditRoles ? openMember(m) : undefined}
              className="asm-card" style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'20px 22px', cursor: canEditRoles ? 'pointer' : 'default', transition:'border-color 0.1s', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}
              onMouseEnter={e => { if (canEditRoles) e.currentTarget.style.borderColor = T.navy; }}
              onMouseLeave={e => { if (canEditRoles) e.currentTarget.style.borderColor = T.border; }}
            >
              {/* Avatar + info */}
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18 }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:m.color || avatarColor(m.user_name || m.user_email || ""), flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, color:'#fff' }}>
                  {getInitials(m.user_name || m.user_email)}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:600, color:T.ink, letterSpacing:'-0.01em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {m.user_name || "—"}
                    {m.id === currentMember?.id && <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted, marginLeft:8 }}>(tu)</span>}
                  </div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.user_email || "—"}</div>
                  <div style={{ marginTop:5 }}><RoleBadge role={m.role_internal} /></div>
                </div>
              </div>
              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:14 }}>
                <div style={statSt}><div style={statLbl}>Ore sett.</div><div style={statVal}>{formatOre(s.weeklyHours)}</div></div>
                <div style={statSt}><div style={statLbl}>Task attivi</div><div style={statVal}>{s.activeTasks}</div></div>
                <div style={statSt}><div style={statLbl}>Progetti</div><div style={statVal}>{s.projects}</div></div>
              </div>
              {/* Progress task */}
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginBottom:5 }}>
                  <span>Task completati</span><span>{s.completedTasks}/{s.totalTasks}</span>
                </div>
                <div style={{ height:2, background:T.border }}>
                  <div style={{ height:2, background:T.navy, width:`${progress}%`, transition:'width 0.3s' }}/>
                </div>
              </div>
            </div>
          ))}
        </div>

      ) : (

        /* ── SPLIT VIEW: lista compatta + pannello dettaglio ── */
        <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '280px 1fr', gap:10, alignItems:'start' }}>

          {/* Lista compatta */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {members.map(m => {
              const isSel = selectedMember?.id === m.id;
              return (
                <button key={m.id} onClick={() => isSel ? setSelectedMember(null) : openMember(m)}
                  style={{ display:'flex', alignItems:'center', gap:10, background:isSel ? T.navyLight : T.surface, border:`0.5px solid ${isSel ? T.navy : T.border}`, borderRadius: T.radiusSm, padding:'11px 13px', cursor:'pointer', textAlign:'left', transition:'all 0.1s' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = T.bg; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSel ? T.navyLight : T.surface; }}
                >
                  <div style={{ width:34, height:34, borderRadius:'50%', background:m.color || avatarColor(m.user_name || ""), flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff' }}>
                    {getInitials(m.user_name || m.user_email)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {m.user_name || "Utente"}
                      {m.id === currentMember?.id && <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted, marginLeft:6 }}>(tu)</span>}
                    </div>
                    <div style={{ marginTop:3 }}><RoleBadge role={m.role_internal} /></div>
                  </div>
                  <span style={{ color:T.muted, fontSize:14 }}>{isSel ? '×' : '›'}</span>
                </button>
              );
            })}
          </div>

          {/* Pannello dettaglio */}
          {(() => {
            const s = statsByMember[selectedMember.id] ?? { weeklyHours:0, activeTasks:0, projects:0, completedTasks:0, totalTasks:0 };
            const progress = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
            const base = ROLE_BASE_PERMS[editRole] || ROLE_BASE_PERMS["Collaboratore Interno"];
            const effective = { ...base, ...editPerms };
            const hasCustom = selectedMember?.custom_permissions && Object.keys(selectedMember.custom_permissions).length > 0;

            return (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, padding:'20px 22px', borderRadius:T.radius, backdropFilter:T.blurSm, WebkitBackdropFilter:T.blurSm, boxShadow:T.shadow }}>

                {/* Header membro */}
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18, paddingBottom:16, borderBottom:`0.5px solid ${T.border}` }}>
                  <div style={{ width:48, height:48, borderRadius:'50%', background:editColor, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:600, color:'#fff' }}>
                    {getInitials(selectedMember.user_name || selectedMember.user_email)}
                  </div>
                  <div>
                    <div style={{ fontSize:16, fontWeight:600, color:T.ink }}>{selectedMember.user_name || "Utente"}</div>
                    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:2 }}>{selectedMember.user_email}</div>
                  </div>
                </div>

                {/* Stats mini */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:8 }}>
                  <div style={statSt}><div style={statLbl}>Ore sett.</div><div style={statVal}>{formatOre(s.weeklyHours)}</div></div>
                  <div style={statSt}><div style={statLbl}>Task attivi</div><div style={statVal}>{s.activeTasks}</div></div>
                  <div style={statSt}><div style={statLbl}>Progetti</div><div style={statVal}>{s.projects}</div></div>
                </div>
                <div style={{ marginBottom:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginBottom:5 }}>
                    <span>Task completati</span><span>{s.completedTasks}/{s.totalTasks}</span>
                  </div>
                  <div style={{ height:2, background:T.border }}>
                    <div style={{ height:2, background:T.navy, width:`${progress}%`, transition:'width 0.3s' }}/>
                  </div>
                </div>

                {/* Tabs gestione */}
                <div style={{ borderTop:`0.5px solid ${T.border}`, paddingTop:16 }}>
                  <div style={{ marginBottom:18 }}>
                    <SlidingTabs
                      tabs={[
                        { key:"role",  label:"Ruolo" },
                        { key:"perms", label:"Permessi" },
                        { key:"color", label:"Colore" },
                      ]}
                      active={activeTab}
                      onChange={setActiveTab}
                    />
                  </div>

                  {/* ── TAB: Ruolo ── */}
                  {activeTab === "role" && (
                    <div>
                      {!canEditRoles && (
                        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, padding:'8px 12px', background:T.bg, border:`0.5px solid ${T.border}`, marginBottom:14 }}>
                          Solo il Titolare o un Partner possono modificare i ruoli.
                        </div>
                      )}
                      {isOwnProfile && (
                        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, padding:'8px 12px', background:T.bg, border:`0.5px solid ${T.border}`, marginBottom:14 }}>
                          Non puoi modificare il tuo stesso ruolo.
                        </div>
                      )}
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {ROLE_OPTIONS.map(role => {
                          const isSel = editRole === role;
                          const canClick = canEditRoles && !isOwnProfile;
                          const perms = PERM_SUMMARY[role] || [];
                          return (
                            <button key={role} onClick={() => canClick && setEditRole(role)}
                              style={{ padding:'10px 13px', border:`0.5px solid ${isSel ? T.navy : T.border}`, borderRadius: T.radiusSm, background:isSel ? T.navyLight : T.surface, cursor:canClick ? 'pointer' : 'not-allowed', textAlign:'left', opacity:canEditRoles ? 1 : 0.6 }}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                                <span style={{ fontSize:12, fontWeight:600, color:isSel ? T.navy : T.ink }}>{ROLE_LABELS[role]}</span>
                                {isSel && <span style={{ color:T.navy, fontSize:12 }}>✓</span>}
                              </div>
                              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginBottom:5 }}>{ROLE_DESCRIPTIONS[role]}</div>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                                {perms.map(p => (
                                  <span key={p} style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:isSel ? T.navy : T.muted, background:isSel ? '#dbeafe' : T.bg, padding:'1px 5px' }}>{p}</span>
                                ))}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {canEditRoles && !isOwnProfile && (
                        <div style={{ marginTop:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                          {!confirmRemove ? (
                            <button onClick={() => setConfirmRemove(true)}
                              style={{ background:'transparent', color:'#ff453a', border:'0.5px solid #ff453a', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 14px', cursor:'pointer' }}>
                              Elimina utente
                            </button>
                          ) : (
                            <div style={{ background:'rgba(255,69,58,0.08)', border:'0.5px solid rgba(255,69,58,0.4)', padding:'10px 14px', flex:1 }}>
                              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:'#ff453a', marginBottom:8, fontWeight:600 }}>
                                Eliminare {selectedMember.user_name || selectedMember.user_email}?
                              </div>
                              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginBottom:10, lineHeight:1.6 }}>
                                Le ore, task e dati inseriti rimarranno. L'account verrà disattivato.
                              </div>
                              <div style={{ display:'flex', gap:6 }}>
                                <button onClick={handleRemoveUser} disabled={removing}
                                  style={{ background:'#ff453a', color:'#fff', border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 14px', cursor:removing ? 'not-allowed' : 'pointer', opacity:removing ? 0.6 : 1 }}>
                                  {removing ? "Rimozione..." : "Sì, elimina"}
                                </button>
                                <button onClick={() => setConfirmRemove(false)}
                                  style={{ background:'transparent', color:T.muted, border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 14px', cursor:'pointer' }}>
                                  Annulla
                                </button>
                              </div>
                            </div>
                          )}
                          {!confirmRemove && (
                            <button onClick={handleSaveRole} disabled={saving || editRole === selectedMember.role_internal}
                              style={{ background:T.navy, color:T.bg, border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:saving || editRole === selectedMember.role_internal ? 'not-allowed' : 'pointer', opacity:saving || editRole === selectedMember.role_internal ? 0.5 : 1 }}>
                              {saving ? "Salvataggio..." : "Salva ruolo"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TAB: Permessi ── */}
                  {activeTab === "perms" && (
                    <div>
                      {(!canEditRoles || isOwnProfile) && (
                        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, padding:'8px 12px', background:T.bg, border:`0.5px solid ${T.border}`, marginBottom:14 }}>
                          {!canEditRoles ? "Solo il Titolare o un Partner possono modificare i permessi." : "Non puoi modificare i tuoi stessi permessi."}
                        </div>
                      )}
                      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginBottom:14, padding:'8px 12px', background:T.bg, border:`0.5px solid ${T.border}`, lineHeight:1.7 }}>
                        Base: <span style={{ color:T.navy, fontWeight:600 }}>{ROLE_LABELS[editRole]}</span>
                        {hasCustom && <span style={{ marginLeft:8, color:'#b45309' }}>· permessi personalizzati attivi</span>}
                        <br/>Le modifiche sovrascrivono i permessi del ruolo.
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {PERMISSION_SECTIONS.map(section => (
                          <div key={section.label} style={{ border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, background:T.bg }}>
                            <div style={{ padding:'6px 12px', borderBottom:`0.5px solid ${T.border}`, fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted }}>
                              {section.label}
                            </div>
                            {section.perms.map((perm, i) => {
                              const val = effective[perm.key] ?? false;
                              const isOverride = editPerms[perm.key] !== undefined && editPerms[perm.key] !== base[perm.key];
                              const canEdit = canEditRoles && !isOwnProfile;
                              return (
                                <div key={perm.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderTop:i > 0 ? `0.5px solid ${T.border}` : 'none', background:isOverride ? (val ? 'rgba(16,185,129,0.04)' : 'rgba(255,69,58,0.04)') : 'transparent' }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                    <span style={{ fontSize:12, color:T.ink }}>{perm.label}</span>
                                    {isOverride && <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:'#b45309', letterSpacing:'0.1em', textTransform:'uppercase' }}>modificato</span>}
                                  </div>
                                  <button onClick={() => { if (!canEdit) return; setEditPerms(prev => ({ ...prev, [perm.key]:!effective[perm.key] })); }}
                                    disabled={!canEdit}
                                    style={{ width:40, height:22, borderRadius:11, background:val ? '#10b981' : T.border, border:'none', cursor:canEdit ? 'pointer' : 'not-allowed', position:'relative', transition:'background 0.15s', flexShrink:0 }}>
                                    <span style={{ position:'absolute', top:3, left:val ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.15s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                      {canEditRoles && !isOwnProfile && (
                        <div style={{ marginTop:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                          {hasCustom && (
                            <button onClick={async () => {
                              setSaving(true);
                              await supabase.from("team_members").update({ custom_permissions:null }).eq("id", selectedMember.id);
                              setMembers(p => p.map(m => m.id === selectedMember.id ? { ...m, custom_permissions:null } : m));
                              setSelectedMember(p => ({ ...p, custom_permissions:null }));
                              setEditPerms({});
                              setSaving(false);
                            }} style={{ background:'transparent', color:T.muted, border:`0.5px solid ${T.border}`, borderRadius: T.radiusSm, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 14px', cursor:'pointer' }}>
                              Ripristina defaults
                            </button>
                          )}
                          <button onClick={handleSavePerms} disabled={saving}
                            style={{ marginLeft:'auto', background:T.navy, color:T.bg, border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:saving ? 'not-allowed' : 'pointer', opacity:saving ? 0.5 : 1 }}>
                            {saving ? "Salvataggio..." : "Salva permessi"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TAB: Colore ── */}
                  {activeTab === "color" && (
                    <div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:8, marginBottom:14 }}>
                        {PREDEFINED_COLORS.map(c => (
                          <button key={c} onClick={() => setEditColor(c)} style={{ width:34, height:34, borderRadius:'50%', background:c, border:'none', outline:editColor === c ? `2px solid ${T.ink}` : 'none', outlineOffset:2, cursor:'pointer' }}/>
                        ))}
                      </div>
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:8 }}>Personalizzato</div>
                        <div style={{ display:'flex', gap:8 }}>
                          <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width:38, height:34, border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor:'pointer', padding:2 }}/>
                          <input type="text" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ flex:1, padding:'6px 10px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontSize:12, fontFamily:"'IBM Plex Mono', monospace", outline:'none' }}/>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:T.bg, border:`0.5px solid ${T.border}`, marginBottom:14 }}>
                        <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>Anteprima</span>
                        <div style={{ width:38, height:38, borderRadius:'50%', background:editColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, color:'#fff' }}>
                          {getInitials(selectedMember.user_name || selectedMember.user_email)}
                        </div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'flex-end' }}>
                        <button onClick={handleSaveColor} disabled={saving || editColor === selectedMember.color}
                          style={{ background:T.navy, color:T.bg, border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor:saving || editColor === selectedMember.color ? 'not-allowed' : 'pointer', opacity:saving || editColor === selectedMember.color ? 0.5 : 1 }}>
                          {saving ? "Salvataggio..." : "Salva colore"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── MODALE AGGIUNGI MEMBRO ── */}
      {modalOpen && (
        <div className="asm-modal-bg" style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div className="asm-modal-content" style={{ width:'100%', maxWidth:480, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, boxShadow:T.shadowLg, borderRadius:T.radiusLg, padding:28 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:600, color:T.ink }}>Aggiungi Membro</div>
              <button onClick={() => { if (!saving) setModalOpen(false); }} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:20, lineHeight:1 }}>×</button>
            </div>
            <form onSubmit={handleSaveMember} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div><FieldLabel>Nome *</FieldLabel><Input value={formData.user_name} onChange={e => setFormData(p => ({ ...p, user_name:e.target.value }))} required/></div>
              <div><FieldLabel>Email *</FieldLabel><Input type="email" value={formData.user_email} onChange={e => setFormData(p => ({ ...p, user_email:e.target.value }))} required/></div>
              <div>
                <FieldLabel>Ruolo *</FieldLabel>
                <select value={formData.role_internal} onChange={e => setFormData(p => ({ ...p, role_internal:e.target.value }))} required
                  style={{ width:'100%', padding:'8px 12px', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontSize:13, fontFamily:"'Space Grotesk', sans-serif", outline:'none' }}>
                  {ROLE_OPTIONS.filter(r => r !== "Owner").map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              {formError && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.red }}>{formError}</div>}
              <div style={{ height:'0.5px', background:T.border, margin:'4px 0' }}/>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                <BtnGhost onClick={() => setModalOpen(false)} disabled={saving}>Annulla</BtnGhost>
                <BtnPrimary type="submit" disabled={saving}>{saving ? "Salvataggio..." : "Salva"}</BtnPrimary>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
