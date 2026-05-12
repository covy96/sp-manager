import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";

// Predefined colors for avatars
const PREDEFINED_COLORS = [
  "#0a84ff", // Blue
  "#30d158", // Green
  "#ff9f0a", // Orange
  "#ff453a", // Red
  "#bf5af2", // Purple
  "#ff375f", // Pink
  "#64d2ff", // Light Blue
  "#ffd60a", // Yellow
  "#8e8e93", // Gray
  "#32ade6", // Cyan
  "#a2845e", // Brown
  "#00c7be", // Teal
];

// Get initials from name or email
function getInitials(text) {
  if (!text) return "?";
  const parts = text.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
}

export default function GestioneUtentiPage() {
  usePageTitleOnMount("Gestione Utenti");
  const { studioId, teamMember: currentMember } = useStudio();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [selectedColor, setSelectedColor] = useState("");

  useEffect(() => {
    if (!studioId) return;
    loadMembers();
  }, [studioId]);

  const loadMembers = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("team_members")
      .select("id, user_name, user_email, color, role, role_internal")
      .eq("studio", studioId)
      .order("user_name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setMembers(data || []);
    }

    setLoading(false);
  };

  const openColorPicker = (member) => {
    setEditingMember(member);
    setSelectedColor(member.color || PREDEFINED_COLORS[0]);
  };

  const closeColorPicker = () => {
    setEditingMember(null);
    setSelectedColor("");
  };

  const saveColor = async () => {
    if (!editingMember) return;

    setSaving(true);

    const { error: updateError } = await supabase
      .from("team_members")
      .update({ color: selectedColor })
      .eq("id", editingMember.id);

    if (updateError) {
      alert("Errore durante il salvataggio: " + updateError.message);
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.id === editingMember.id ? { ...m, color: selectedColor } : m))
      );
      closeColorPicker();
    }

    setSaving(false);
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
        <h2 className="text-xl font-semibold text-white">Gestione Utenti</h2>
        <p className="text-sm text-white/60">
          Personalizza i colori degli avatar per ogni membro del team
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {members.map((member) => {
          const isMe = member.id === currentMember?.id;
          const color = member.color || "#0a84ff";

          return (
            <div
              key={member.id}
              className="flex items-center gap-4 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4"
            >
              {/* Avatar */}
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {getInitials(member.user_name || member.user_email)}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">
                  {member.user_name || "Utente"}
                  {isMe && <span className="ml-2 text-xs text-white/50">(tu)</span>}
                </p>
                <p className="truncate text-sm text-white/50">{member.user_email}</p>
                {(member.role_internal || member.role) && (
                  <span className="mt-1 inline-block rounded bg-[#48484a] px-2 py-0.5 text-xs text-white/70">
                    {member.role_internal || member.role}
                  </span>
                )}
              </div>

              {/* Color picker button */}
              <button
                onClick={() => openColorPicker(member)}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white/80 hover:bg-[#48484a]"
              >
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
                Colore
              </button>
            </div>
          );
        })}
      </div>

      {/* Color Picker Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
            <h3 className="text-lg font-semibold text-white">Scegli colore avatar</h3>
            <p className="mt-1 text-sm text-white/60">
              Per: {editingMember.user_name || editingMember.user_email}
            </p>

            {/* Color grid */}
            <div className="mt-4 grid grid-cols-6 gap-3">
              {PREDEFINED_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`h-10 w-10 rounded-full transition hover:scale-110 ${
                    selectedColor === color
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#2c2c2e]"
                      : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Custom color input */}
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-white">Colore personalizzato</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded-lg border border-[#48484a] bg-transparent"
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="flex-1 rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]"
                  placeholder="#0a84ff"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 flex items-center justify-center gap-3 rounded-lg border border-[#48484a] bg-[#1c1c1e] p-4">
              <span className="text-sm text-white/60">Anteprima:</span>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white"
                style={{ backgroundColor: selectedColor }}
              >
                {getInitials(editingMember.user_name || editingMember.user_email)}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeColorPicker}
                className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Annulla
              </button>
              <button
                onClick={saveColor}
                disabled={saving}
                className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
