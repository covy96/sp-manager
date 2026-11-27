// supabase/functions/send-push-notification/index.ts
//
// Invio delle notifiche push, come nell'app nido: Web Push standard (VAPID),
// una iscrizione per dispositivo nella tabella web_push_subscriptions.
//
// Modo principale — body: { user_email, studio, title, message, link, notification_id }
//   → manda a TUTTI i dispositivi dell'utente (telefono, Mac, …).
//   Finché qualche dispositivo non è ancora passato al nuovo sistema, manda anche
//   ai vecchi token Firebase / web_push_subscription salvati su team_members.
//
// GET → { publicKey }: la chiave pubblica VAPID per iscrivere i dispositivi.
//
// Modi vecchi (compatibilità con versioni dell'app ancora in cache):
//   body: { fcm_token, ... }  oppure  body: { web_push_subscription, ... }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webPush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FCM_URL = "https://fcm.googleapis.com/v1/projects/asm-studio-35538/messages:send";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const admin = (SUPABASE_URL && SERVICE_ROLE) ? createClient(SUPABASE_URL, SERVICE_ROLE) : null;

interface Msg { title: string; body: string; link: string; notification_id: string }

// ── Web Push (VAPID) ─────────────────────────────────────────────────────────
let vapidReady = false;
function setupVapid(): boolean {
  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return false;
  if (!vapidReady) {
    webPush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:noreply@sp-manager.app", pub, priv);
    vapidReady = true;
  }
  return true;
}

/** Ritorna "ok", "expired" (iscrizione da cancellare) o "error". */
async function sendWebPush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, msg: Msg) {
  const payload = JSON.stringify({ ...msg, icon: "/icon-192.png" });
  try {
    await webPush.sendNotification(sub, payload, { urgency: "high", TTL: 86400 });
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) return "expired";
    console.warn("[webpush]", status, (e as Error).message);
    return "error";
  }
}

// ── FCM (vecchio sistema) ────────────────────────────────────────────────────
let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.value;
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const pemKey = serviceAccount.private_key.replace(/\\n/g, "\n");
  const keyData = pemKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signingInput));
  const jwt = `${signingInput}.${
    btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
  }`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenRes.json();
  cachedToken = { value: tokenData.access_token, exp: now + 3500 };
  return tokenData.access_token;
}

/** Ritorna "ok", "expired" o "error". */
async function sendFcm(fcm_token: string, msg: Msg) {
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) return "error";
  const accessToken = await getAccessToken(JSON.parse(serviceAccountJson));
  // Messaggio DATA-ONLY: è il service worker a mostrare l'unica notifica.
  const res = await fetch(FCM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
    body: JSON.stringify({
      message: {
        token: fcm_token,
        webpush: { fcm_options: { link: msg.link }, headers: { Urgency: "high" } },
        data: { ...msg, icon: "/icon-192.png" },
      },
    }),
  });
  if (res.ok) return "ok";
  const data = await res.json().catch(() => ({}));
  console.error("FCM error:", data);
  const st = data?.error?.status;
  if (res.status === 404 || st === "NOT_FOUND" || st === "UNREGISTERED") return "expired";
  return "error";
}

async function removeDeadFcmToken(token: string) {
  if (!admin || !token) return;
  try {
    const { data } = await admin
      .from("team_members")
      .select("id, fcm_token, fcm_tokens")
      .or(`fcm_token.eq.${token},fcm_tokens.cs.{"${token}"}`);
    for (const m of data ?? []) {
      const updates: Record<string, unknown> = { fcm_tokens: (m.fcm_tokens ?? []).filter((t: string) => t !== token) };
      if (m.fcm_token === token) updates.fcm_token = null;
      await admin.from("team_members").update(updates).eq("id", m.id);
    }
  } catch (e) {
    console.warn("removeDeadFcmToken error:", (e as Error).message);
  }
}

async function removeDeadLegacyWebPush(endpoint: string) {
  if (!admin || !endpoint) return;
  await admin.from("team_members").update({ web_push_subscription: null })
    .eq("web_push_subscription->>endpoint", endpoint);
}

// ── A tutti i dispositivi di un utente ───────────────────────────────────────
async function sendToUser(user_email: string, studio: string, msg: Msg) {
  if (!admin) throw new Error("Service role non disponibile");
  const { data: member } = await admin
    .from("team_members")
    .select("user_account, fcm_token, fcm_tokens, web_push_subscription")
    .eq("user_email", user_email)
    .eq("studio", studio)
    .maybeSingle();
  if (!member) return { web: 0, fcm: 0, note: "membro non trovato" };

  let web = 0, fcm = 0;
  const vapid = setupVapid();
  if (!vapid) console.warn("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY non impostate: Web Push saltato");

  if (vapid && member.user_account) {
    const { data: subs } = await admin
      .from("web_push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", member.user_account);
    for (const s of subs ?? []) {
      const r = await sendWebPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, msg);
      if (r === "ok") web++;
      if (r === "expired") await admin.from("web_push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }

  const tokens: string[] = member.fcm_tokens?.length ? member.fcm_tokens : (member.fcm_token ? [member.fcm_token] : []);
  for (const t of tokens) {
    const r = await sendFcm(t, msg);
    if (r === "ok") fcm++;
    if (r === "expired") await removeDeadFcmToken(t);
  }

  if (vapid && member.web_push_subscription) {
    const r = await sendWebPush(member.web_push_subscription, msg);
    if (r === "ok") web++;
    if (r === "expired") await removeDeadLegacyWebPush(member.web_push_subscription?.endpoint);
  }
  return { web, fcm };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  const json = (o: unknown, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // L'app chiede qui la chiave pubblica VAPID per iscrivere il dispositivo
  if (req.method === "GET") return json({ publicKey: Deno.env.get("VAPID_PUBLIC_KEY") ?? null });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    const body = await req.json();
    const msg: Msg = {
      title: body.title || "ASM",
      body: body.message || body.body || "",
      link: body.link || "/",
      notification_id: body.notification_id || "",
    };

    if (body.user_email && body.studio) {
      return json({ success: true, ...(await sendToUser(body.user_email, body.studio, msg)) });
    }

    if (body.web_push_subscription) {
      if (!setupVapid()) return json({ error: "VAPID keys not configured" }, 500);
      const r = await sendWebPush(body.web_push_subscription, msg);
      if (r === "expired") await removeDeadLegacyWebPush(body.web_push_subscription?.endpoint);
      return json({ success: r === "ok", via: "webpush" }, r === "ok" ? 200 : 500);
    }

    if (body.fcm_token) {
      const r = await sendFcm(body.fcm_token, msg);
      if (r === "expired") await removeDeadFcmToken(body.fcm_token);
      return json({ success: r === "ok", via: "fcm" }, r === "ok" ? 200 : 500);
    }

    return json({ error: "Serve user_email+studio, fcm_token o web_push_subscription" }, 400);
  } catch (err) {
    console.error("Error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
