// supabase/functions/purge-studios/index.ts
// Cron giornaliero — due operazioni:
// 1. Elimina definitivamente gli studi con delete_after < now() (+ tutti i dati collegati)
// 2. Pulisce il cestino: elimina definitivamente gli elementi con deleted_at > 30 giorni fa

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET              = Deno.env.get("CRON_SECRET") ?? "";

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Tabelle con FK diretta su studio (colonna "studio") — ordine safe per FK
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

// Tabelle del cestino con deleted_at (colonna "studio" presente)
const CESTINO_TABLES = [
  "tasks",
  "lavorazioni_gantt",
  "pratiche_edilizie",
  "capex_voci",
  "capex_pagamenti",
  "timesheet",
  "costi_extra",
  "costi_interni",
  "pagamenti",
  "collaboratori_esterni",
  "global_contacts",
  "report_cantiere",
  "commesse",
  "offerte",
  "proforma",
  "fatture",
  "projects",
];

serve(async (req) => {
  if (CRON_SECRET) {
    const auth = req.headers.get("Authorization") ?? "";
    if (auth.replace("Bearer ", "") !== CRON_SECRET) {
      return json({ error: "Non autorizzato" }, 401);
    }
  }

  try {
    const now = new Date().toISOString();
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // ── 1. PURGE STUDI SCADUTI ─────────────────────────────────────────────────
    const { data: studi, error: fetchErr } = await db
      .from("studios")
      .select("id, delete_after")
      .not("deleted_at", "is", null)
      .lte("delete_after", now);

    if (fetchErr) return json({ error: fetchErr.message }, 500);

    const studioResults: { id: string; ok: boolean; error?: string }[] = [];

    for (const studio of studi ?? []) {
      try {
        for (const table of STUDIO_TABLES) {
          const { error } = await db.from(table).delete().eq("studio", studio.id);
          if (error) console.warn(`purge-studios: ${table} studio=${studio.id}: ${error.message}`);
        }
        const { error: delErr } = await db.from("studios").delete().eq("id", studio.id);
        if (delErr) throw new Error(delErr.message);
        studioResults.push({ id: studio.id, ok: true });
        console.log(`purge-studios: studio ${studio.id} eliminato`);
      } catch (e) {
        studioResults.push({ id: studio.id, ok: false, error: (e as Error).message });
        console.error(`purge-studios: errore su ${studio.id}:`, (e as Error).message);
      }
    }

    // ── 2. PURGE CESTINO (elementi > 30 giorni) ────────────────────────────────
    const cestinoPurged: Record<string, number> = {};

    for (const table of CESTINO_TABLES) {
      const { data, error } = await db
        .from(table)
        .delete()
        .not("deleted_at", "is", null)
        .lte("deleted_at", cutoff)
        .select("id");

      if (error) {
        console.warn(`purge-cestino: ${table}: ${error.message}`);
      } else {
        const count = data?.length ?? 0;
        if (count > 0) {
          cestinoPurged[table] = count;
          console.log(`purge-cestino: ${table} — ${count} righe eliminate`);
        }
      }
    }

    const cestinoPurgedTotal = Object.values(cestinoPurged).reduce((a, b) => a + b, 0);

    return json({
      success: true,
      studi_eliminati: studioResults.filter(r => r.ok).length,
      studi_falliti:   studioResults.filter(r => !r.ok).length,
      cestino_eliminati: cestinoPurgedTotal,
      cestino_dettaglio: cestinoPurged,
    });

  } catch (err) {
    console.error("purge-studios error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
