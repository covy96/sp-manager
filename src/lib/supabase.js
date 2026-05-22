import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('ENV CHECK:', {
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'presente' : 'MANCANTE',
  mode: import.meta.env.MODE
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase env vars missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY",
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");

const DEFAULT_SERVICE_TEMPLATES = [
  { service_name: "DIREZIONE LAVORI", order: 1 },
  { service_name: "PROJECT MANAGEMENT", order: 2 },
  { service_name: "INSEGNE", order: 3 },
  { service_name: "OSAP", order: 4 },
  { service_name: "SCIA COMMERCIALE", order: 5 },
  { service_name: "PRATICA EDILIZIA", order: 6 },
  { service_name: "CATASTO", order: 7 },
  { service_name: "PROGETTO ARCHITETTONICO", order: 8 },
  { service_name: "GESTIONE FORNITURE", order: 8 },
];

export async function seedServiceTaskTemplates(studioId) {
  if (!studioId) return;
  const rows = DEFAULT_SERVICE_TEMPLATES.map(t => ({ ...t, studio: studioId }));
  const { error } = await supabase
    .from("service_task_templates")
    .upsert(rows, { onConflict: "studio,service_name" });

  if (error) {
    console.error("Errore seed service_task_templates:", error.message);
  }
}

export async function getOrCreateTeamMember(user) {
  if (!user?.id) throw new Error("User non valido.");

  const { data: members, error: findError } = await supabase
    .from("team_members")
    .select("*")
    .eq("user_account", user.id)
    .order("created_at", { ascending: true });

  if (findError) throw new Error(findError.message);

  if (members && members.length > 0) {
    const savedStudioId = localStorage.getItem("asm-active-studio");
    if (savedStudioId) {
      const match = members.find(m => m.studio === savedStudioId);
      if (match) return match;
    }
    return members[0];
  }

  const { data: created, error: createError } = await supabase
    .from("team_members")
    .insert({ user_account: user.id, user_email: user.email ?? null, user_name: user.email ?? "Utente", active: true })
    .select("*")
    .single();

  if (createError) throw new Error(createError.message);
  return created;
}

export async function getUserStudios(userId) {
  const { data: members } = await supabase
    .from("team_members")
    .select("id, studio, role_internal, studios(id, name)")
    .eq("user_account", userId)
    .not("studio", "is", null);
  return members ?? [];
}
