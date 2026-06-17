// supabase/functions/check-scadenze/index.ts
// Cron giornaliero (es. ogni giorno alle 08:00 Europe/Rome)
// Controlla: task in scadenza oggi, task scadute, proforma in scadenza, commesse con residuo >60gg

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const todayISO = new Date().toISOString().slice(0, 10);

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Crea notifica in DB + invia push. Gestisce preferenze e dedup (non duplica se già inviata oggi). */
async function notify({
  studioId, userEmail, type, title, message, link, taskId,
}: {
  studioId: string; userEmail: string; type: string;
  title: string; message: string; link?: string; taskId?: string;
}) {
  // Leggi preferenze e token del destinatario
  const { data: member } = await db
    .from("team_members")
    .select("notification_preferences, fcm_token, fcm_tokens, web_push_subscription")
    .eq("user_email", userEmail)
    .eq("studio", studioId)
    .single();

  if (!member) return;
  if (member.notification_preferences?.[type] === false) return;

  // Dedup: non inviare più di una volta lo stesso tipo per lo stesso item oggi
  const dedupQ = db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("studio", studioId)
    .eq("user_email", userEmail)
    .eq("type", type)
    .gte("created_at", todayISO);

  if (taskId) {
    dedupQ.eq("task_id", taskId);
  } else if (link) {
    dedupQ.eq("link", link);
  }

  const { count } = await dedupQ;
  if (count && count > 0) return;

  const { data: notif, error } = await db
    .from("notifications")
    .insert({
      studio: studioId, user_email: userEmail, type,
      title, message, link: link ?? null,
      task_id: taskId ?? null, read: false,
    })
    .select("id")
    .single();

  if (error) { console.error(`[notify] ${type}:`, error.message); return; }

  // Push FCM
  const tokens: string[] = member.fcm_tokens?.length
    ? member.fcm_tokens
    : (member.fcm_token ? [member.fcm_token] : []);

  for (const fcm_token of tokens) {
    await db.functions.invoke("send-push-notification", {
      body: { fcm_token, title, message, link: link ?? "/", notification_id: notif.id },
    }).catch((e: Error) => console.warn("[push FCM]", e.message));
  }

  if (member.web_push_subscription) {
    await db.functions.invoke("send-push-notification", {
      body: {
        web_push_subscription: member.web_push_subscription,
        title, body: message, link: link ?? "/", notification_id: notif.id,
      },
    }).catch((e: Error) => console.warn("[push Web]", e.message));
  }
}

// ── 1. Task in scadenza oggi ──────────────────────────────────────────────────

async function checkTaskScadenze() {
  // Carica task con data_pianificata <= oggi, non completate, con membro assegnato
  const { data: tasks, error } = await db
    .from("tasks")
    .select("id, title, studio, project_id, assigned_member, data_pianificata, status")
    .lte("data_pianificata", todayISO)
    .neq("status", "completed")
    .is("deleted_at", null)
    .not("assigned_member", "is", null)
    .not("data_pianificata", "is", null);

  if (error) { console.error("[tasks]", error.message); return; }
  if (!tasks?.length) return;

  // Raccoglie gli id dei team_members coinvolti → email in un colpo solo
  const memberIds = [...new Set(tasks.map((t) => t.assigned_member))];
  const { data: members } = await db
    .from("team_members")
    .select("id, user_email, studio")
    .in("id", memberIds);

  const emailByMemberId: Record<string, string> = {};
  (members ?? []).forEach((m) => { emailByMemberId[m.id] = m.user_email; });

  for (const task of tasks) {
    const userEmail = emailByMemberId[task.assigned_member];
    if (!userEmail) continue;

    const isToday = task.data_pianificata === todayISO;
    const type = isToday ? "task_scadenza_oggi" : "task_scaduta";
    const title = isToday ? "Task in scadenza oggi" : "Task scaduta";
    const message = isToday
      ? `La task "${task.title}" scade oggi`
      : `La task "${task.title}" era pianificata per il ${task.data_pianificata} ed è ancora aperta`;
    const link = task.project_id ? `/progetti/${task.project_id}` : "/scrivania";

    await notify({ studioId: task.studio, userEmail, type, title, message, link, taskId: task.id });
  }
}

// ── 2. Proforma in scadenza ───────────────────────────────────────────────────

async function checkProformaScadenze() {
  // Carica proforma non pagate con data_scadenza impostata
  const { data: proformas, error } = await db
    .from("proforma")
    .select("id, numero_proforma, studio, commessa_id, data_scadenza")
    .eq("pagato", false)
    .is("deleted_at", null)
    .not("data_scadenza", "is", null);

  if (error) { console.error("[proforma]", error.message); return; }
  if (!proformas?.length) return;

  // Per ogni studio, carica gli owner e le loro preferenze proforma_days
  const studioIds = [...new Set(proformas.map((p) => p.studio))];
  const { data: owners } = await db
    .from("team_members")
    .select("studio, user_email, notification_preferences")
    .in("studio", studioIds)
    .eq("role_internal", "Owner")
    .eq("active", true);

  // Mappa studioId → lista owner
  const ownersByStudio: Record<string, { user_email: string; proforma_days: number }[]> = {};
  for (const o of (owners ?? [])) {
    const days = Number(o.notification_preferences?.proforma_days ?? 3);
    if (!ownersByStudio[o.studio]) ownersByStudio[o.studio] = [];
    ownersByStudio[o.studio].push({ user_email: o.user_email, proforma_days: days });
  }

  // Carica nome commesse
  const commessaIds = [...new Set(proformas.map((p) => p.commessa_id).filter(Boolean))];
  let commessaNomeById: Record<string, string> = {};
  if (commessaIds.length) {
    const { data: commesse } = await db
      .from("commesse")
      .select("id, nome_commessa")
      .in("id", commessaIds);
    (commesse ?? []).forEach((c) => { commessaNomeById[c.id] = c.nome_commessa; });
  }

  for (const proforma of proformas) {
    const studioOwners = ownersByStudio[proforma.studio] ?? [];
    for (const owner of studioOwners) {
      const targetDate = addDays(todayISO, owner.proforma_days);
      if (proforma.data_scadenza !== targetDate) continue;

      const commessaNome = commessaNomeById[proforma.commessa_id] ?? "";
      const daysLeft = owner.proforma_days;
      const message = `La proforma ${proforma.numero_proforma ?? ""}${commessaNome ? ` (${commessaNome})` : ""} scade tra ${daysLeft} giorn${daysLeft === 1 ? "o" : "i"}`;
      const link = proforma.commessa_id ? `/commesse/${proforma.commessa_id}` : "/proforma";

      await notify({
        studioId: proforma.studio, userEmail: owner.user_email,
        type: "proforma_in_scadenza",
        title: "Proforma in scadenza",
        message, link,
      });
    }
  }
}

// ── 3. Commesse con residuo da +60 giorni ────────────────────────────────────

async function checkCommesseResiduo() {
  const sixtyDaysAgo = addDays(todayISO, -60);

  // Commesse create da più di 60 giorni, non eliminate
  const { data: commesse, error } = await db
    .from("commesse")
    .select("id, studio, nome_commessa, importo_offerta_base, data_commessa")
    .lte("data_commessa", sixtyDaysAgo)
    .is("deleted_at", null);

  if (error) { console.error("[commesse]", error.message); return; }
  if (!commesse?.length) return;

  // Calcola pagato per ogni commessa (rate pagate)
  const ids = commesse.map((c) => c.id);
  const { data: ratePagate } = await db
    .from("suddivisione_pagamenti")
    .select("commessa_id, percentuale, importo_fisso")
    .in("commessa_id", ids)
    .eq("pagato", true)
    .is("deleted_at", null);

  const baseById: Record<string, number> = {};
  commesse.forEach((c) => { baseById[c.id] = Number(c.importo_offerta_base) || 0; });

  const incassatoById: Record<string, number> = {};
  for (const r of (ratePagate ?? [])) {
    const base = baseById[r.commessa_id] || 0;
    const importoRata = Number(r.importo_fisso) || (base * (Number(r.percentuale) || 0) / 100);
    incassatoById[r.commessa_id] = (incassatoById[r.commessa_id] || 0) + importoRata;
  }

  // Filtra commesse con residuo > 0
  const conResiduo = commesse.filter((c) => {
    const residuo = baseById[c.id] - (incassatoById[c.id] || 0);
    return residuo > 0.01;
  });

  if (!conResiduo.length) return;

  const studioIds = [...new Set(conResiduo.map((c) => c.studio))];
  const { data: owners } = await db
    .from("team_members")
    .select("studio, user_email")
    .in("studio", studioIds)
    .eq("role_internal", "Owner")
    .eq("active", true);

  const ownersByStudio: Record<string, string[]> = {};
  (owners ?? []).forEach((o) => {
    if (!ownersByStudio[o.studio]) ownersByStudio[o.studio] = [];
    ownersByStudio[o.studio].push(o.user_email);
  });

  for (const c of conResiduo) {
    const residuo = baseById[c.id] - (incassatoById[c.id] || 0);
    const studioOwners = ownersByStudio[c.studio] ?? [];
    for (const userEmail of studioOwners) {
      const giorni = Math.floor((Date.now() - new Date(c.data_commessa).getTime()) / 86400000);
      const message = `La commessa "${c.nome_commessa}" ha un residuo non incassato da ${giorni} giorni (€${Math.round(residuo).toLocaleString("it-IT")})`;

      await notify({
        studioId: c.studio, userEmail,
        type: "commessa_residuo_60gg",
        title: "Residuo commessa in sospeso",
        message, link: `/commesse/${c.id}`,
      });
    }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

serve(async (req) => {
  // Autorizzazione: solo chiamate con il CRON_SECRET (o GET dalla Dashboard Supabase)
  if (req.method === "GET") {
    return new Response("check-scadenze OK", { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const secret = authHeader.replace("Bearer ", "");
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    console.log(`[check-scadenze] avvio per data ${todayISO}`);
    await Promise.all([
      checkTaskScadenze(),
      checkProformaScadenze(),
      checkCommesseResiduo(),
    ]);
    console.log(`[check-scadenze] completato`);
    return new Response(JSON.stringify({ success: true, date: todayISO }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[check-scadenze] errore:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
