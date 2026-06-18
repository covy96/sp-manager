// supabase/functions/purge-studios/index.ts
// Cron giornaliero — elimina in modo permanente gli studi con delete_after < now().
// Cancella in cascade tutti i dati collegati allo studio prima di rimuovere il record.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL            = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET             = Deno.env.get("CRON_SECRET") ?? "";

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Tabelle con FK diretta su studio (colonna "studio")
const STUDIO_TABLES = [
  "notifications",
  "tasks",
  "lavorazioni_gantt",
  "pratiche_edilizie",
  "capex_voci",
  "capex_pagamenti",
  "timesheet",
  "costi_extra",
  "costi_interni",
  "pagamenti",
  "suddivisione_pagamenti",
  "voci_offerta_template",
  "service_task_templates",
  "collaboratori_esterni",
  "global_contacts",
  "project_contacts",
  "report_cantiere",
  "report_cantiere_foto",
  "commesse",
  "offerte",
  "proforma",
  "fatture",
  "projects",
  "team_members",
];

serve(async (req) => {
  // Autenticazione con CRON_SECRET
  if (CRON_SECRET) {
    const auth = req.headers.get("Authorization") ?? "";
    if (auth.replace("Bearer ", "") !== CRON_SECRET) {
      return json({ error: "Non autorizzato" }, 401);
    }
  }

  try {
    const now = new Date().toISOString();

    // Trova tutti gli studi da eliminare definitivamente
    const { data: studi, error: fetchErr } = await db
      .from("studios")
      .select("id, delete_after")
      .not("deleted_at", "is", null)
      .lte("delete_after", now);

    if (fetchErr) return json({ error: fetchErr.message }, 500);
    if (!studi || studi.length === 0) {
      return json({ success: true, purged: 0, message: "Nessuno studio da eliminare" });
    }

    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const studio of studi) {
      try {
        // Cancella ogni tabella collegata allo studio
        for (const table of STUDIO_TABLES) {
          const { error } = await db.from(table).delete().eq("studio", studio.id);
          if (error) {
            // Log ma prosegui — alcune tabelle potrebbero non avere righe
            console.warn(`purge-studios: ${table} studio=${studio.id}: ${error.message}`);
          }
        }

        // Cancella infine il record studio stesso
        const { error: delErr } = await db.from("studios").delete().eq("id", studio.id);
        if (delErr) throw new Error(delErr.message);

        results.push({ id: studio.id, ok: true });
        console.log(`purge-studios: studio ${studio.id} eliminato`);
      } catch (e) {
        results.push({ id: studio.id, ok: false, error: (e as Error).message });
        console.error(`purge-studios: errore su ${studio.id}:`, (e as Error).message);
      }
    }

    const purged = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;
    return json({ success: true, purged, failed, results });

  } catch (err) {
    console.error("purge-studios error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
