import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { ROLE_OPTIONS, ROLE_LABELS, ROLE_DESCRIPTIONS, PERMISSION_SECTIONS } from "../../hooks/usePermissions";
import { useTheme } from '../../contexts/ThemeContext';
import { usePlan } from '../../hooks/usePlan';

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

function getInitials(text) {
  if (!text) return "?";
  const parts = text.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : text.slice(0,2).toUpperCase();
}

function RoleBadge({ role }) {
  const { T } = useTheme();
  const isTop = role === "Owner" || role === "Partner";
  const isPM = role === "Project Manager";
  const c = isTop ? T.navy : isPM ? '#7c3aed' : T.muted;
  return (
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 7px', color: c, border: `0.5px solid ${c}`, display: 'inline-block' }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

export default function GestioneUtentiPage() {
  const { T } = useTheme();
  usePageTitleOnMount("Gestione Utenti");
  const { studioId, teamMember: currentMember } = useStudio();
  const { plan } = usePlan();

  const [members, setMembers]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [saving, setSaving]                 = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editRole, setEditRole]             = useState("");
  const [editColor, setEditColor]           = useState("");
  const [activeTab, setActiveTab]           = useState("role");
  const [confirmRemove, setConfirmRemove]   = useState(false);
  const [removing, setRemoving]             = useState(false);
  const [editPerms, setEditPerms]           = useState({});

  useEffect(() => { if (studioId) loadMembers(); }, [studioId]);

  const loadMembers = async () => {
    setLoading(true); setError("");
    const { data, error: e } = await supabase
      .from("team_members")
      .select("id,user_name,user_email,color,role_internal,custom_permissions")
      .eq("studio", studioId)
      .order("user_name", { ascending: true });
    if (e) setError(e.message); else setMembers(data || []);
    setLoading(false);
  };

  // Permessi di base del ruolo selezionato
  const getRoleBasePerms = (role) => {
    const ROLE_BASE = {
      "Owner":                 { canViewProjects:true, canCreateProjects:true, canEditProjects:true, canArchiveProjects:true, canViewCommesse:true, canManageCommesse:true, canViewFinancials:true, canViewReport:true, canViewMonitoraggio:true, canCompleteOwnTask:true, canViewAllTimesheets:true, canEditTask:true, canAssignTasks:true, canManageUsers:true, canManageSettings:true, canDeleteAnything:true },
      "Partner":               { canViewProjects:true, canCreateProjects:true, canEditProjects:true, canArchiveProjects:true, canViewCommesse:true, canManageCommesse:true, canViewFinancials:true, canViewReport:true, canViewMonitoraggio:true, canCompleteOwnTask:true, canViewAllTimesheets:true, canEditTask:true, canAssignTasks:true, canManageUsers:true, canManageSettings:true, canDeleteAnything:true },
      "Project Manager":       { canViewProjects:true, canCreateProjects:true, canEditProjects:true, canArchiveProjects:false, canViewCommesse:true, canManageCommesse:true, canViewFinancials:true, canViewReport:true, canViewMonitoraggio:true, canCompleteOwnTask:true, canViewAllTimesheets:true, canEditTask:true, canAssignTasks:true, canManageUsers:false, canManageSettings:false, canDeleteAnything:false },
      "Architetto":            { canViewProjects:true, canCreateProjects:false, canEditProjects:false, canArchiveProjects:false, canViewCommesse:false, canManageCommesse:false, canViewFinancials:false, canViewReport:false, canViewMonitoraggio:false, canCompleteOwnTask:true, canViewAllTimesheets:false, canEditTask:true, canAssignTasks:false, canManageUsers:false, canManageSettings:false, canDeleteAnything:false },
      "Ingegnere":             { canViewProjects:true, canCreateProjects:false, canEditProjects:false, canArchiveProjects:false, canViewCommesse:false, canManageCommesse:false, canViewFinancials:false, canViewReport:false, canViewMonitoraggio:false, canCompleteOwnTask:true, canViewAllTimesheets:false, canEditTask:true, canAssignTasks:false, canManageUsers:false, canManageSettings:false, canDeleteAnything:false },
      "Collaboratore Interno": { canViewProjects:true, canCreateProjects:false, canEditProjects:false, canArchiveProjects:false, canViewCommesse:false, canManageCommesse:false, canViewFinancials:false, canViewReport:false, canViewMonitoraggio:false, canCompleteOwnTask:true, canViewAllTimesheets:false, canEditTask:true, canAssignTasks:false, canManageUsers:false, canManageSettings:false, canDeleteAnything:false },
      "Collaboratore Esterno": { canViewProjects:false, canCreateProjects:false, canEditProjects:false, canArchiveProjects:false, canViewCommesse:false, canManageCommesse:false, canViewFinancials:false, canViewReport:false, canViewMonitoraggio:false, canCompleteOwnTask:true, canViewAllTimesheets:false, canEditTask:true, canAssignTasks:false, canManageUsers:false, canManageSettings:false, canDeleteAnything:false },
    };
    return ROLE_BASE[role] || ROLE_BASE["Collaboratore Interno"];
  };

  const openMember = m => {
    setSelectedMember(m);
    setEditRole(m.role_internal || "Architetto");
    setEditColor(m.color || PREDEFINED_COLORS[0]);
    setEditPerms(m.custom_permissions || {});
    setActiveTab("role");
    setConfirmRemove(false);
  };

  const handleSaveRole = async () => {
    if (!selectedMember || selectedMember.id === currentMember?.id) return;
    setSaving(true);
    // Cambiando ruolo, azzera i permessi custom
    const { error: e } = await supabase.from("team_members").update({ role_internal: editRole, custom_permissions: null }).eq("id", selectedMember.id);
    if (e) { alert("Errore: " + e.message); setSaving(false); return; }
    setMembers(p => p.map(m => m.id === selectedMember.id ? { ...m, role_internal: editRole, custom_permissions: null } : m));
    setSelectedMember(p => ({ ...p, role_internal: editRole, custom_permissions: null }));
    setEditPerms({});
    setSaving(false);
  };

  const handleSavePerms = async () => {
    if (!selectedMember || selectedMember.id === currentMember?.id) return;
    setSaving(true);
    // Salva solo le differenze rispetto ai default del ruolo
    const base = getRoleBasePerms(editRole);
    const overrides = {};
    for (const [k, v] of Object.entries(editPerms)) {
      if (base[k] !== undefined && base[k] !== v) overrides[k] = v;
    }
    const toSave = Object.keys(overrides).length > 0 ? overrides : null;
    const { error: e } = await supabase.from("team_members").update({ custom_permissions: toSave }).eq("id", selectedMember.id);
    if (e) { alert("Errore: " + e.message + "\n\nAssicurati di aver aggiunto la colonna custom_permissions (jsonb) alla tabella team_members in Supabase."); setSaving(false); return; }
    setMembers(p => p.map(m => m.id === selectedMember.id ? { ...m, custom_permissions: toSave } : m));
    setSelectedMember(p => ({ ...p, custom_permissions: toSave }));
    setSaving(false);
  };

  const handleSaveColor = async () => {
    if (!selectedMember) return; setSaving(true);
    const { error: e } = await supabase.from("team_members").update({ color: editColor }).eq("id", selectedMember.id);
    if (e) { alert("Errore: " + e.message); setSaving(false); return; }
    setMembers(p => p.map(m => m.id === selectedMember.id ? { ...m, color: editColor } : m));
    setSelectedMember(p => ({ ...p, color: editColor }));
    setSaving(false);
  };

  const handleRemoveUser = async () => {
    if (!selectedMember) return;
    setRemoving(true);
    // Rimuove il membro dallo studio (non cancella task/ore/dati)
    const { error: e } = await supabase
      .from("team_members")
      .delete()
      .eq("id", selectedMember.id);
    if (e) { alert("Errore: " + e.message); setRemoving(false); return; }
    setMembers(p => p.filter(m => m.id !== selectedMember.id));
    setSelectedMember(null);
    setConfirmRemove(false);
    setRemoving(false);
  };

  const canEditRoles = currentMember?.role_internal === "Owner" || currentMember?.role_internal === "Partner";
  const isOwnProfile = selectedMember?.id === currentMember?.id;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
  );

  const btnSt = (active) => ({
    padding: '7px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
    color: active ? T.navy : T.muted,
    borderBottom: `1.5px solid ${active ? T.navy : 'transparent'}`,
    marginBottom: -0.5,
  });

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', marginBottom: 4 }}>Gestione Utenti</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>
          Seleziona un membro per modificarne ruolo e colore avatar
        </div>
      </div>

      {error && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, marginBottom: 14 }}>{error}</div>}

      {/* Banner limite utenti */}
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted,
        marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>Membri attivi: {members.length} / {plan.maxUsers === Infinity ? '∞' : plan.maxUsers}</span>
        {members.length >= plan.maxUsers && plan.maxUsers !== Infinity && (
          <span style={{ color: T.red }}>Limite raggiunto — fai upgrade per aggiungere altri membri</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedMember ? '320px 1fr' : '1fr', gap: 10, alignItems: 'start' }}>

        {/* Lista membri */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {members.map(m => {
            const isMe = m.id === currentMember?.id;
            const isSel = selectedMember?.id === m.id;
            const color = m.color || T.navy;
            return (
              <button key={m.id} onClick={() => isSel ? setSelectedMember(null) : openMember(m)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, background: isSel ? T.navyLight : T.surface, border: `0.5px solid ${isSel ? T.navy : T.border}`, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s' }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = T.bg; }}
                onMouseLeave={e => { e.currentTarget.style.background = isSel ? T.navyLight : T.surface; }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: T.surface }}>
                  {getInitials(m.user_name || m.user_email)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.user_name || "Utente"}{isMe && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: T.muted, marginLeft: 6 }}>(tu)</span>}
                  </div>
                  <div style={{ marginTop: 4 }}><RoleBadge role={m.role_internal} /></div>
                </div>
                <span style={{ color: T.muted, fontSize: 16 }}>{isSel ? '×' : '›'}</span>
              </button>
            );
          })}
        </div>

        {/* Pannello dettaglio */}
        {selectedMember && (
          <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, padding: '20px 22px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: `0.5px solid ${T.border}` }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: editColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: T.surface, flexShrink: 0 }}>
                {getInitials(selectedMember.user_name || selectedMember.user_email)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{selectedMember.user_name || "Utente"}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 2 }}>{selectedMember.user_email}</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `0.5px solid ${T.border}`, marginBottom: 18 }}>
              <button onClick={() => setActiveTab("role")} style={btnSt(activeTab === "role")}>Ruolo & Permessi</button>
              <button onClick={() => setActiveTab("perms")} style={btnSt(activeTab === "perms")}>Permessi Dettagliati</button>
              <button onClick={() => setActiveTab("color")} style={btnSt(activeTab === "color")}>Colore Avatar</button>
            </div>

            {/* TAB: Ruolo */}
            {activeTab === "role" && (
              <div>
                {/* Avvisi */}
                {!canEditRoles && (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, padding: '8px 12px', background: T.bg, border: `0.5px solid ${T.border}`, marginBottom: 14 }}>
                    Solo il Titolare o un Partner possono modificare i ruoli.
                  </div>
                )}
                {isOwnProfile && (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, padding: '8px 12px', background: T.bg, border: `0.5px solid ${T.border}`, marginBottom: 14 }}>
                    Non puoi modificare il tuo stesso ruolo.
                  </div>
                )}

                {/* Lista ruoli */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ROLE_OPTIONS.map(role => {
                    const isSel = editRole === role;
                    const canClick = canEditRoles && !isOwnProfile;
                    const perms = PERM_SUMMARY[role] || [];
                    return (
                      <button key={role} onClick={() => canClick && setEditRole(role)}
                        style={{ padding: '11px 14px', border: `0.5px solid ${isSel ? T.navy : T.border}`, background: isSel ? T.navyLight : T.surface, cursor: canClick ? 'pointer' : 'not-allowed', textAlign: 'left', opacity: canEditRoles ? 1 : 0.6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: isSel ? T.navy : T.ink }}>{ROLE_LABELS[role]}</span>
                          {isSel && <span style={{ color: T.navy, fontSize: 12 }}>✓</span>}
                        </div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginBottom: 6 }}>{ROLE_DESCRIPTIONS[role]}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {perms.map(p => (
                            <span key={p} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: isSel ? T.navy : T.muted, background: isSel ? '#dbeafe' : T.bg, padding: '1px 5px' }}>{p}</span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {canEditRoles && !isOwnProfile && (
                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    {/* Elimina utente */}
                    {!confirmRemove ? (
                      <button onClick={() => setConfirmRemove(true)}
                        style={{ background: 'transparent', color: '#ff453a', border: '0.5px solid #ff453a', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer' }}>
                        Elimina utente
                      </button>
                    ) : (
                      <div style={{ background: 'rgba(255,69,58,0.08)', border: '0.5px solid rgba(255,69,58,0.4)', padding: '10px 14px', flex: 1 }}>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#ff453a', marginBottom: 8, fontWeight: 600 }}>
                          Sei sicuro di voler eliminare {selectedMember.user_name || selectedMember.user_email}?
                        </div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginBottom: 10, lineHeight: 1.6 }}>
                          L'utente verrà rimosso dallo studio. Le ore, le task e i dati inseriti rimarranno. L'account di accesso verrà disattivato.
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={handleRemoveUser} disabled={removing}
                            style={{ background: '#ff453a', color: '#fff', border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', cursor: removing ? 'not-allowed' : 'pointer', opacity: removing ? 0.6 : 1 }}>
                            {removing ? "Rimozione..." : "Sì, elimina"}
                          </button>
                          <button onClick={() => setConfirmRemove(false)}
                            style={{ background: 'transparent', color: T.muted, border: `0.5px solid ${T.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', cursor: 'pointer' }}>
                            Annulla
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Salva ruolo */}
                    {!confirmRemove && (
                      <button onClick={handleSaveRole} disabled={saving || editRole === selectedMember.role_internal}
                        style={{ background: T.navy, color: T.bg, border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: saving || editRole === selectedMember.role_internal ? 'not-allowed' : 'pointer', opacity: saving || editRole === selectedMember.role_internal ? 0.5 : 1 }}>
                        {saving ? "Salvataggio..." : "Salva ruolo"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Permessi Dettagliati */}
            {activeTab === "perms" && (() => {
              const base = getRoleBasePerms(editRole);
              const effective = { ...base, ...editPerms };
              const hasCustom = selectedMember?.custom_permissions && Object.keys(selectedMember.custom_permissions).length > 0;
              const canEdit = canEditRoles && !isOwnProfile;

              const togglePerm = (key) => {
                if (!canEdit) return;
                setEditPerms(prev => ({ ...prev, [key]: !effective[key] }));
              };

              return (
                <div>
                  {!canEdit && (
                    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, padding:'8px 12px', background:T.bg, border:`0.5px solid ${T.border}`, marginBottom:14 }}>
                      Solo il Titolare o un Partner possono modificare i permessi.
                    </div>
                  )}

                  {/* Info ruolo corrente */}
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginBottom:14, padding:'8px 12px', background:T.bg, border:`0.5px solid ${T.border}`, lineHeight:1.7 }}>
                    Base: <span style={{ color:T.navy, fontWeight:600 }}>{ROLE_LABELS[editRole]}</span>
                    {hasCustom && <span style={{ marginLeft:8, color:'#b45309' }}>· permessi personalizzati attivi</span>}
                    <br/>Le modifiche qui sotto sovrascrivono i permessi del ruolo.
                  </div>

                  {/* Griglia sezioni */}
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {PERMISSION_SECTIONS.map(section => (
                      <div key={section.label} style={{ border:`0.5px solid ${T.border}`, background:T.bg }}>
                        {/* Intestazione sezione */}
                        <div style={{ padding:'7px 12px', borderBottom:`0.5px solid ${T.border}`, fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted }}>
                          {section.label}
                        </div>
                        {/* Righe permesso */}
                        <div style={{ display:'flex', flexDirection:'column' }}>
                          {section.perms.map((perm, i) => {
                            const val = effective[perm.key] ?? false;
                            const isOverride = editPerms[perm.key] !== undefined && editPerms[perm.key] !== base[perm.key];
                            return (
                              <div key={perm.key} style={{
                                display:'flex', alignItems:'center', justifyContent:'space-between',
                                padding:'9px 12px',
                                borderTop: i > 0 ? `0.5px solid ${T.border}` : 'none',
                                background: isOverride ? (val ? 'rgba(16,185,129,0.04)' : 'rgba(255,69,58,0.04)') : 'transparent',
                              }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  <span style={{ fontSize:12, color:T.ink }}>{perm.label}</span>
                                  {isOverride && (
                                    <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:'#b45309', letterSpacing:'0.1em', textTransform:'uppercase' }}>
                                      modificato
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => togglePerm(perm.key)}
                                  disabled={!canEdit}
                                  style={{
                                    width:40, height:22, borderRadius:11,
                                    background: val ? '#10b981' : T.border,
                                    border:'none', cursor: canEdit ? 'pointer' : 'not-allowed',
                                    position:'relative', transition:'background 0.15s', flexShrink:0,
                                  }}
                                >
                                  <span style={{
                                    position:'absolute', top:3, left: val ? 21 : 3,
                                    width:16, height:16, borderRadius:'50%', background:'#fff',
                                    transition:'left 0.15s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
                                  }}/>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  {canEdit && (
                    <div style={{ marginTop:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                      {hasCustom && (
                        <button
                          onClick={async () => {
                            setSaving(true);
                            await supabase.from("team_members").update({ custom_permissions: null }).eq("id", selectedMember.id);
                            setMembers(p => p.map(m => m.id === selectedMember.id ? { ...m, custom_permissions: null } : m));
                            setSelectedMember(p => ({ ...p, custom_permissions: null }));
                            setEditPerms({});
                            setSaving(false);
                          }}
                          style={{ background:'transparent', color:T.muted, border:`0.5px solid ${T.border}`, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 14px', cursor:'pointer' }}
                        >
                          Ripristina defaults ruolo
                        </button>
                      )}
                      <button
                        onClick={handleSavePerms}
                        disabled={saving}
                        style={{ marginLeft:'auto', background:T.navy, color:T.bg, border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 18px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}
                      >
                        {saving ? "Salvataggio..." : "Salva permessi"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB: Colore */}
            {activeTab === "color" && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 16 }}>
                  {PREDEFINED_COLORS.map(c => (
                    <button key={c} onClick={() => setEditColor(c)} style={{ width: 34, height: 34, borderRadius: '50%', background: c, border: 'none', outline: editColor === c ? `2px solid ${T.ink}` : 'none', outlineOffset: 2, cursor: 'pointer' }} />
                  ))}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>Personalizzato</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ width: 38, height: 34, border: `0.5px solid ${T.borderMd}`, cursor: 'pointer', padding: 2 }} />
                    <input type="text" value={editColor} onChange={e => setEditColor(e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', border: `0.5px solid ${T.borderMd}`, background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", outline: 'none' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: T.bg, border: `0.5px solid ${T.border}`, marginBottom: 14 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>Anteprima</span>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: editColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: T.surface }}>
                    {getInitials(selectedMember.user_name || selectedMember.user_email)}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleSaveColor} disabled={saving || editColor === selectedMember.color}
                    style={{ background: T.navy, color: T.bg, border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: saving || editColor === selectedMember.color ? 'not-allowed' : 'pointer', opacity: saving || editColor === selectedMember.color ? 0.5 : 1 }}>
                    {saving ? "Salvataggio..." : "Salva colore"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
