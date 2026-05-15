import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { getOrCreateTeamMember, supabase } from "../lib/supabase";
import { formatOre } from "../lib/utils";
import { ROLE_OPTIONS, ROLE_LABELS } from "../hooks/usePermissions";

// ── BRAND TOKENS ─────────────────────────────────────────────────
const T = {
  ink: '#0E0E0D', navy: '#13315C', brass: '#D9C98A',
  paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33',
  red: '#b91c1c', green: '#1a6b3c',
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

function FieldLabel({ children }) {
  return <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>{children}</div>;
}
function Input({ value, onChange, type = "text", required }) {
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} required={required}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: `0.5px solid ${focus ? T.navy : T.ink20}`, background: '#fff', color: T.ink, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", outline: 'none' }} />
  );
}
function BtnPrimary({ children, onClick, disabled, type = "button" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ background: T.navy, color: '#EEF1F6', border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}
function BtnGhost({ children, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ background: 'transparent', border: `0.5px solid ${T.ink20}`, color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

export default function TeamPage() {
  const { studioId, loading: studioLoading } = useStudio();
  const permissions = usePermissions();

  const [members, setMembers]             = useState([]);
  const [statsByMember, setStatsByMember] = useState({});
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [modalOpen, setModalOpen]         = useState(false);
  const [saving, setSaving]               = useState(false);
  const [formError, setFormError]         = useState("");
  const [formData, setFormData]           = useState({ user_name: "", user_email: "", role_internal: "Architetto" });

  const loadData = async () => {
    if (!studioId) return;
    setLoading(true); setError("");
    const monday = getMondayISODate();
    const [{ data: authData, error: authError }, membersR, tsR, tasksR] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("team_members").select("*").eq("studio", studioId).order("user_name", { ascending: true }),
      supabase.from("timesheet").select("team_member,date,hours").gte("date", monday),
      supabase.from("tasks").select("assigned_member,status,project_id"),
    ]);
    if (authError || !authData?.user?.id) { setError(authError?.message || "Utente non autenticato."); setLoading(false); return; }
    if (membersR.error) { setError(membersR.error.message); setLoading(false); return; }

    const loadedMembers = membersR.data ?? [];
    const stats = {};
    loadedMembers.forEach(m => { stats[m.id] = { weeklyHours: 0, activeTasks: 0, totalTasks: 0, completedTasks: 0, projectsSet: new Set() }; });
    (tsR.data ?? []).forEach(e => { if (stats[e.team_member]) stats[e.team_member].weeklyHours += Number(e.hours) || 0; });
    (tasksR.data ?? []).forEach(t => {
      if (!stats[t.assigned_member]) return;
      stats[t.assigned_member].totalTasks += 1;
      if (t.status === "completed") stats[t.assigned_member].completedTasks += 1;
      else stats[t.assigned_member].activeTasks += 1;
      if (t.project_id) stats[t.assigned_member].projectsSet.add(t.project_id);
    });
    const normalized = {};
    Object.entries(stats).forEach(([id, v]) => { normalized[id] = { weeklyHours: v.weeklyHours, activeTasks: v.activeTasks, totalTasks: v.totalTasks, completedTasks: v.completedTasks, projects: v.projectsSet.size }; });

    let current = loadedMembers.find(m => m.user_account === authData.user.id);
    if (!current) {
      try { current = await getOrCreateTeamMember(authData.user); loadedMembers.push(current); }
      catch (e) { setError(e.message); setLoading(false); return; }
    }
    setMembers(loadedMembers); setStatsByMember(normalized); setLoading(false);
  };

  useEffect(() => { if (studioId) loadData(); }, [studioId]);

  const cards = useMemo(() => members.map(m => {
    const s = statsByMember[m.id] ?? { weeklyHours: 0, activeTasks: 0, projects: 0, completedTasks: 0, totalTasks: 0 };
    const progress = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
    return { member: m, stats: s, progress };
  }), [members, statsByMember]);

  const handleSaveMember = async e => {
    e.preventDefault(); setFormError("");
    if (!formData.user_name.trim() || !formData.user_email.trim() || !formData.role_internal) { setFormError("Compila tutti i campi."); return; }
    setSaving(true);
    const { data, error: iErr } = await supabase.from("team_members").insert({ user_name: formData.user_name.trim(), user_email: formData.user_email.trim(), role_internal: formData.role_internal, studio: studioId }).select("*").single();
    if (iErr) { setFormError(iErr.message); setSaving(false); return; }
    setMembers(p => [...p, data].sort((a, b) => a.user_name.localeCompare(b.user_name, "it")));
    setStatsByMember(p => ({ ...p, [data.id]: { weeklyHours: 0, activeTasks: 0, totalTasks: 0, completedTasks: 0, projects: 0 } }));
    setSaving(false); setModalOpen(false);
  };

  if (studioLoading || !studioId || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento team...</div>
  );
  if (error) return (
    <div style={{ border: `0.5px solid ${T.ink10}`, background: '#fff', padding: 32, color: T.red, fontSize: 13 }}>Errore: {error}</div>
  );

  const statSt = { background: T.paper, border: `0.5px solid ${T.ink10}`, padding: '12px 14px' };
  const statLabel = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 };
  const statValue = { fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: '-0.03em', fontFamily: "'Space Grotesk', sans-serif" };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', color: T.ink }}>Team</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 2 }}>Panoramica membri e produttività settimanale</div>
        </div>
        {permissions.canManageUsers && (
          <BtnPrimary onClick={() => { setFormError(""); setFormData({ user_name: "", user_email: "", role_internal: "Architetto" }); setModalOpen(true); }}>
            + Aggiungi membro
          </BtnPrimary>
        )}
      </div>

      {cards.length === 0 ? (
        <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '48px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Nessun membro presente.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {cards.map(({ member: m, stats: s, progress }) => (
            <div key={m.id} style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: m.color || avatarColor(m.user_name || m.user_email || ""), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#fff' }}>
                  {getInitials(m.user_name || m.user_email)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.user_name || "—"}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.user_email || "—"}</div>
                  <div style={{ display: 'inline-block', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.navy, border: `0.5px solid ${T.navy}`, padding: '2px 6px', marginTop: 4 }}>
                    {ROLE_LABELS[m.role_internal] || m.role_internal || "—"}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                <div style={statSt}><div style={statLabel}>Ore sett.</div><div style={statValue}>{formatOre(s.weeklyHours)}</div></div>
                <div style={statSt}><div style={statLabel}>Task attivi</div><div style={statValue}>{s.activeTasks}</div></div>
                <div style={statSt}><div style={statLabel}>Progetti</div><div style={statValue}>{s.projects}</div></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginBottom: 6 }}>
                  <span>Task completati</span><span>{s.completedTasks}/{s.totalTasks}</span>
                </div>
                <div style={{ height: 2, background: T.ink10 }}>
                  <div style={{ height: 2, background: T.navy, width: `${progress}%`, transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal aggiungi membro */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,14,13,0.5)', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 480, background: '#fff', border: `0.5px solid ${T.ink20}`, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>Aggiungi Membro</div>
              <button onClick={() => { if (!saving) setModalOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleSaveMember} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><FieldLabel>Nome *</FieldLabel><Input value={formData.user_name} onChange={e => setFormData(p => ({ ...p, user_name: e.target.value }))} required /></div>
              <div><FieldLabel>Email *</FieldLabel><Input type="email" value={formData.user_email} onChange={e => setFormData(p => ({ ...p, user_email: e.target.value }))} required /></div>
              <div>
                <FieldLabel>Ruolo *</FieldLabel>
                <select value={formData.role_internal} onChange={e => setFormData(p => ({ ...p, role_internal: e.target.value }))} required
                  style={{ width: '100%', padding: '8px 12px', border: `0.5px solid ${T.ink20}`, background: '#fff', color: T.ink, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", outline: 'none' }}>
                  {/* Owner non assegnabile manualmente — solo chi fonda lo studio */}
                  {ROLE_OPTIONS.filter(r => r !== "Owner").map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              {formError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red }}>{formError}</div>}
              <div style={{ height: '0.5px', background: T.ink10, margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
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
