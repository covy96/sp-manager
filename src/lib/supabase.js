import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

export async function seedServiceTaskTemplates() {
  const { error } = await supabase
    .from("service_task_templates")
    .upsert(DEFAULT_SERVICE_TEMPLATES, { onConflict: "service_name" });

  if (error) {
    console.error("Errore seed service_task_templates:", error.message);
  }
}

export async function getOrCreateTeamMember(user) {
  if (!user?.id) {
    throw new Error("User non valido: impossibile risolvere il team member.");
  }

  const { data: existingMember, error: findError } = await supabase
    .from("team_members")
    .select("*")
    .eq("user_account", user.id)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (existingMember) {
    return existingMember;
  }

  const payload = {
    user_account: user.id,
    user_email: user.email ?? null,
    user_name: user.email ?? "Utente",
    active: true,
  };

  const { data: createdMember, error: createError } = await supabase
    .from("team_members")
    .insert(payload)
    .select("*")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return createdMember;
}
