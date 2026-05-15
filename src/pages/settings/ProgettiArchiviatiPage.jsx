import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";

const T = {
  ink: '#0E0E0D', navy: '#13315C', paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33', red: '#b91c1c',
};

function getInitials(text) {
  if (!text) return "?";
  const parts = text.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : text.slice(0,2).toUpperCase();
}

const AVATAR_COLORS = ["#13315C","#1a6b3c","#7c3aed","#b45309","#be185d","#0e7490"];
function avatarColor(seed = "") {
  let h = 0; for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function ProgettiArchiviatiPage() {
  usePageTitleOnMount("Progetti Archiviati");
  const navigate = useNavigate();
  const { studioId } = useStudio();

  const [projects, setProjects]       = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [restoring, setRestoring]     = useState(null);

  useEffect(() => { if (studioId) loadData(); }, [studioId]);

  const loadData = async () => {
    setLoading(true); setError("");
    try {
      const [{ data: p, error: pErr }, { data: m, error: mErr }] = await Promise.all([
        supabase.from("projects").select("*").eq("studio", studioId).eq("archived", true).order("created_at", { ascending: false }),
        supabase.from("team_members").select("id,user_name,user_email,color").eq("studio", studioId),
      ]);
      if (pErr) throw pErr; if (mErr) throw mErr;
      setProjects(p || []); setTeamMembers(m || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const getMemberById = id => teamMembers.find(m => m.id === id);

  const handleUnarchive = async id => {
    setRestoring(id);
    const { error: e } = await supabase.from("projects").update({ archived: false }).eq("id", id);
    if (e) alert("Errore: " + e.message); else setProjects(p => p.filter(x => x.id !== id));
    setRestoring(null);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
  );

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', marginBottom: 4 }}>Progetti Archiviati</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>Progetti archiviati non più attivi</div>
      </div>

      {error && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, marginBottom: 14 }}>{error}</div>}

      {projects.length === 0 ? (
        <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '48px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, marginBottom: 16 }}>Nessun progetto archiviato.</div>
          <button onClick={() => navigate("/progetti")} style={{ background: T.navy, color: '#EEF1F6', border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: 'pointer' }}>Vai ai Progetti</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {projects.map(project => {
            const assignedMembers = (project.assigned_users || []).map(id => getMemberById(id)).filter(Boolean);
            return (
              <div key={project.id} style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '18px 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', marginBottom: 4 }}>
                  {project.name || "Progetto senza nome"}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginBottom: 10 }}>
                  {project.client || "—"}
                </div>
                {project.address && (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginBottom: 8 }}>{project.address}</div>
                )}
                {/* Avatars */}
                {assignedMembers.length > 0 && (
                  <div style={{ display: 'flex', marginBottom: 14 }}>
                    {assignedMembers.slice(0, 5).map((m, i) => (
                      <div key={m.id} title={m.user_name || m.user_email} style={{
                        width: 24, height: 24, borderRadius: '50%', background: m.color || avatarColor(m.user_name || m.user_email || ""),
                        border: '1.5px solid #fff', marginLeft: i > 0 ? -8 : 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: '#fff',
                      }}>{getInitials(m.user_name || m.user_email)}</div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => navigate(`/progetti/${project.id}`)} style={{ flex: 1, padding: '7px 0', background: T.paper, border: `0.5px solid ${T.ink20}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer' }}>Visualizza</button>
                  <button onClick={() => handleUnarchive(project.id)} disabled={restoring === project.id} style={{ padding: '7px 14px', background: 'transparent', border: `0.5px solid ${T.navy}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.navy, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: restoring === project.id ? 'not-allowed' : 'pointer', opacity: restoring === project.id ? 0.6 : 1 }}>
                    {restoring === project.id ? "..." : "Ripristina"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
