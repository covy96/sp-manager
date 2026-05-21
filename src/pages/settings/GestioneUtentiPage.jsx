import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { ROLE_OPTIONS, ROLE_LABELS, ROLE_DESCRIPTIONS } from "../../hooks/usePermissions";
import { useTheme } from '../../contexts/ThemeContext';

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

  const [members, setMembers]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [saving, setSaving]                 = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editRole, setEditRole]             = useState("");
  const [editColor, setEditColor]           = useState("");
  const [activeTab, setActiveTab]           = useState("role");

  useEffect(() => { if (studioId) loadMembers(); }, [studioId]);

  const loadMembers = async () => {
    setLoading(true); setError("");
    const { data, error: e } = await supabase
      .from("team_members")
      .select("id,user_name,user_email,color,role_internal")
      .eq("studio", studioId)
      .order("user_name", { ascending: true });
    if (e) setError(e.message); else setMembers(data || []);
    setLoading(false);
  };

  const openMember = m => {
    setSelectedMember(m);
    setEditRole(m.role_internal || "Architetto");
    setEditColor(m.color || PREDEFINED_COLORS[0]);
    setActiveTab("role");
  };

  const handleSaveRole = async () => {
    if (!selectedMember || selectedMember.id === currentMember?.id) return;
    setSaving(true);
    const { error: e } = await supabase.from("team_members").update({ role_internal: editRole }).eq("id", selectedMember.id);
    if (e) { alert("Errore: " + e.message); setSaving(false); return; }
    setMembers(p => p.map(m => m.id === selectedMember.id ? { ...m, role_internal: editRole } : m));
    setSelectedMember(p => ({ ...p, role_internal: editRole }));
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
                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleSaveRole} disabled={saving || editRole === selectedMember.role_internal}
                      style={{ background: T.navy, color: T.bg, border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: saving || editRole === selectedMember.role_internal ? 'not-allowed' : 'pointer', opacity: saving || editRole === selectedMember.role_internal ? 0.5 : 1 }}>
                      {saving ? "Salvataggio..." : "Salva ruolo"}
                    </button>
                  </div>
                )}
              </div>
            )}

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
