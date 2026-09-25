// supabase/functions/check-promemoria/index.ts
// Cron ad alta frequenza (ogni 5 minuti) — invia il promemoria PUNTUALE delle task
// che hanno un orario preciso impostato (tasks.ora_pianificata = "HH:MM").
//
// A differenza di check-scadenze (giornaliero, raggruppa le scadenze del giorno),
// qui si notifica al minuto: quando l'ora impostata (Europe/Rome) è arrivata.
// La deduplica del tipo notifica + task_id evita invii ripetuti nei run successivi.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ROME_TZ = "Europe/Rome";

// ── "Non disturbare" — stesso comportamento del client (src/lib/notifications.js) ──
const _romeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: ROME_TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
});
const _dayIdx: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function _hmToMin(hm: string): number {
  const [h, m] = String(hm ?? "").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function _romeWeekMinutes(now: Date): number {
  const parts = _romeFmt.formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hh = Number(parts.find((p) => p.type === "hour")?.value) % 24;
  const mm = Number(parts.find((p) => p.type === "minute")?.value);
  return (_dayIdx[wd] ?? 0) * 1440 + hh * 60 + mm;
}

function isMuted(prefs: any, now: Date = new Date()): boolean {
  if (!prefs) return false;
  const m = prefs.mute_until;
  if (m === "indefinite") return true;
  if (m && !Number.isNaN(Date.parse(m)) && now < new Date(m)) return true;
  const q = prefs.quiet_hours;
  if (q?.enabled) {
    const cur = _romeWeekMinutes(now);
    const s = (q.startDay ?? 0) * 1440 + _hmToMin(q.startTime);
    const e = (q.endDay ?? 0) * 1440 + _hmToMin(q.endTime);
    if (s === e) return false;
    return s < e ? (cur >= s && cur < e) : (cur >= s || cur < e);
  }
  return false;
}

// Data (YYYY-MM-DD) e minuti-del-giorno correnti nel fuso Europe/Rome
function romeNow(): { dateISO: string; minutes: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dateISO = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  return { dateISO, minutes };
}

/** Crea notifica in DB + invia push. Gestisce preferenze e dedup (non duplica se già inviata oggi). */
async function notify({
  studioId, userEmail, type, title, message, link, taskId, todayISO,
}: {
  studioId: string; userEmail: string; type: string;
  title: string; message: string; link?: string; taskId?: string; todayISO: string;
}) {
  const { data: member } = await db
    .from("team_members")
    .select("notification_preferences, fcm_token, fcm_tokens, web_push_subscription")
    .eq("user_email", userEmail)
    .eq("studio", studioId)
    .single();

  if (!member) return;
  if (member.notification_preferences?.[type] === false) return;

  // Dedup: non più di una notifica dello stesso tipo per la stessa task oggi
  let dedupQ = db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("studio", studioId)
    .eq("user_email", userEmail)
    .eq("type", type)
    .gte("created_at", todayISO);
  if (taskId) dedupQ = dedupQ.eq("task_id", taskId);
  const { count } = await dedupQ;
  if ((count ?? 0) > 0) return;

  const { data: notif, error } = await db
    .from("notifications")
    .insert({
      studio: studioId, user_email: userEmail, type,
      title, message, link: link ?? null, task_id: taskId ?? null, read: false,
    })
    .select("id")
    .single();

  if (error) { console.error(`[notify] ${type}:`, error.message); return; }

  if (isMuted(member.notification_preferences)) return;

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

// ── Promemoria puntuale delle task con orario ────────────────────────────────
async function checkTaskPromemoria() {
  const { dateISO, minutes: nowMin } = romeNow();

  // Task di oggi (Rome) con orario impostato, non completate, assegnate
  const { data: tasks, error } = await db
    .from("tasks")
    .select("id, title, studio, project_id, assigned_member, data_pianificata, ora_pianificata, status")
    .eq("data_pianificata", dateISO)
    .not("ora_pianificata", "is", null)
    .neq("status", "completed")
    .is("deleted_at", null)
    .not("assigned_member", "is", null);

  if (error) { console.error("[promemoria]", error.message); return; }
  if (!tasks?.length) return;

  // Solo quelle il cui orario è già arrivato (entro la giornata di oggi)
  const due = tasks.filter((t) => _hmToMin(t.ora_pianificata) <= nowMin);
  if (!due.length) return;

  const memberIds = [...new Set(due.map((t) => t.assigned_member))];
  const { data: members } = await db
    .from("team_members")
    .select("id, user_email")
    .in("id", memberIds);

  const emailByMemberId: Record<string, string> = {};
  (members ?? []).forEach((m) => { emailByMemberId[m.id] = m.user_email; });

  for (const task of due) {
    const userEmail = emailByMemberId[task.assigned_member];
    if (!userEmail) continue;
    const ora = String(task.ora_pianificata).slice(0, 5);
    await notify({
      studioId: task.studio,
      userEmail,
      type: "task_promemoria",
      title: "Promemoria task",
      message: `La task "${task.title}" è pianificata per le ${ora}`,
      link: task.project_id ? `/progetti/${task.project_id}` : "/scrivania",
      taskId: task.id,
      todayISO: dateISO,
    });
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "GET") return new Response("check-promemoria OK", { status: 200 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  if (CRON_SECRET) {
    const auth = req.headers.get("Authorization") ?? "";
    if (auth.replace("Bearer ", "") !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), { status: 401 });
    }
  }

  try {
    await checkTaskPromemoria();
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[check-promemoria] errore:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
