import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";

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

export default function ProgettiArchiviatiPage() {
  usePageTitleOnMount("Progetti Archiviati");
  const navigate = useNavigate();
  const { studioId, teamMember } = useStudio();

  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      // Load team members
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
    const { error: updateError } = await supabase
      .from("projects")
      .update({ archived: false })
      .eq("id", projectId);

    if (updateError) {
      alert("Errore: " + updateError.message);
    } else {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Progetti Archiviati</h2>
          <p className="text-sm text-white/60">
            Progetti archiviati non più attivi
          </p>
        </div>
        <button
          onClick={() => navigate("/progetti")}
          className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Torna ai Progetti
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          Nessun progetto archiviato.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const assignedMembers = (project.assigned_users || [])
              .map((id) => getMemberById(id))
              .filter(Boolean);

            return (
              <div
                key={project.id}
                className="relative rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5 opacity-75 transition hover:opacity-100"
              >
                {/* Unarchive button */}
                <button
                  onClick={() => handleUnarchive(project.id)}
                  className="absolute right-3 top-3 rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-1.5 text-xs text-white hover:bg-[#0a84ff]"
                >
                  Ripristina
                </button>

                {/* Project name */}
                <h3 className="pr-24 text-lg font-bold text-white">
                  {project.name || "Progetto senza nome"}
                </h3>
                <p className="mt-1 text-sm text-white/60">
                  {project.client || "N/D"}
                </p>

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
                          style={{
                            backgroundColor:
                              member.color || "#0a84ff",
                          }}
                          title={member.user_name || member.user_email}
                        >
                          {getInitials(
                            member.user_name || member.user_email
                          )}
                        </div>
                      ))}
                      {assignedMembers.length > 5 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#2c2c2e] bg-[#48484a] text-[10px] font-semibold text-white">
                          +{assignedMembers.length - 5}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-white/40">
                      Nessun membro assegnato
                    </span>
                  )}
                </div>

                {/* Click to view */}
                <button
                  onClick={() => navigate(`/progetti/${project.id}`)}
                  className="mt-4 w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] py-2 text-sm text-white/80 hover:bg-[#48484a]"
                >
                  Visualizza progetto
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
