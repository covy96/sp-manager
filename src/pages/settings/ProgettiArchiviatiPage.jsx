import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";

// Get initials from name or email
function getInitials(text) {
  if (!text) return "?";
  const parts = text.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
}

// Pin icon
function PinIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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

// Refresh icon
function RefreshIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

export default function ProgettiArchiviatiPage() {
  usePageTitleOnMount("Progetti Archiviati");
  const navigate = useNavigate();
  const { studioId } = useStudio();

  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    if (!studioId) return;
    loadData();
  }, [studioId]);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      // Load archived projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("studio", studioId)
        .eq("archived", true)
        .order("created_at", { ascending: false });

      if (projectsError) throw projectsError;

      // Load team members for avatars
      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select("id, user_name, user_email, color")
        .eq("studio", studioId);

      if (membersError) throw membersError;

      setProjects(projectsData || []);
      setTeamMembers(membersData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMemberById = (id) => teamMembers.find((m) => m.id === id);

  const handleUnarchive = async (projectId) => {
    setRestoring(projectId);

    const { error: updateError } = await supabase
      .from("projects")
      .update({ archived: false })
      .eq("id", projectId);

    if (updateError) {
      alert("Errore: " + updateError.message);
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }

    setRestoring(null);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Progetti Archiviati</h2>
        <p className="text-sm text-white/60">Progetti archiviati non più attivi</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          <p>Nessun progetto archiviato.</p>
          <button
            onClick={() => navigate("/progetti")}
            className="mt-4 rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Vai ai Progetti
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((project) => {
            const assignedMembers = (project.assigned_users || [])
              .map((id) => getMemberById(id))
              .filter(Boolean);

            return (
              <div
                key={project.id}
                className="relative rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5"
              >
                {/* Project name */}
                <h3 className="text-lg font-bold text-white">
                  {project.name || "Progetto senza nome"}
                </h3>
                <p className="mt-1 text-sm text-white/60">{project.client || "N/D"}</p>

                {/* Address */}
                {project.address && (
                  <div className="mt-3 flex items-center gap-1.5 text-sm text-white/50">
                    <PinIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{project.address}</span>
                  </div>
                )}

                {/* Hours */}
                <div className="mt-4 flex items-center gap-1.5 text-sm text-white/60">
                  <ClockIcon className="h-4 w-4" />
                  <span>{project.total_hours || 0}h</span>
                </div>

                {/* Assigned members avatars */}
                <div className="mt-4 flex items-center gap-1.5">
                  {assignedMembers.length > 0 ? (
                    <div className="flex -space-x-2">
                      {assignedMembers.slice(0, 5).map((member) => (
                        <div
                          key={member.id}
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#2c2c2e] text-[10px] font-semibold text-white"
                          style={{ backgroundColor: member.color || "#0a84ff" }}
                          title={member.user_name || member.user_email}
                        >
                          {getInitials(member.user_name || member.user_email)}
                        </div>
                      ))}
                      {assignedMembers.length > 5 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#2c2c2e] bg-[#48484a] text-[10px] font-semibold text-white">
                          +{assignedMembers.length - 5}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-white/40">Nessun membro assegnato</span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => navigate(`/progetti/${project.id}`)}
                    className="flex-1 rounded-lg border border-[#48484a] bg-[#3a3a3c] py-2 text-sm text-white/80 hover:bg-[#48484a]"
                  >
                    Visualizza
                  </button>
                  <button
                    onClick={() => handleUnarchive(project.id)}
                    disabled={restoring === project.id}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-[#0a84ff] bg-[#0a84ff]/20 px-3 py-2 text-sm text-[#0a84ff] hover:bg-[#0a84ff]/30 disabled:opacity-60"
                  >
                    <RefreshIcon className="h-4 w-4" />
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
