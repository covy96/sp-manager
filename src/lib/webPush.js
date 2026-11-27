import { supabase } from "./supabase";

// Notifiche push come nell'app nido: Web Push standard (VAPID), senza Firebase.
// Ogni dispositivo ha la sua iscrizione (tabella web_push_subscriptions), così arrivano
// su telefono E Mac insieme. Le chiavi VAPID le crea il workflow GitHub e stanno nei
// segreti di Supabase; l'app chiede la pubblica alla funzione send-push-notification.
let publicKeyCache = null;
async function vapidKey() {
  if (publicKeyCache) return publicKeyCache;
  const { data, error } = await supabase.functions.invoke("send-push-notification", { method: "GET" });
  if (error || !data?.publicKey) throw new Error("Chiave delle notifiche non disponibile, riprova tra poco.");
  publicKeyCache = urlBase64ToUint8Array(data.publicKey);
  return publicKeyCache;
}

const SW_URL = "/firebase-messaging-sw.js"; // nome storico: è il service worker unico delle notifiche
const OFF_KEY = "asm-push-off";

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function sameKey(buf, expected) {
  if (!buf) return false;
  const a = new Uint8Array(buf);
  if (a.length !== expected.length) return false;
  return a.every((v, i) => v === expected[i]);
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && typeof Notification !== "undefined";
}

export function isPushOff() {
  try { return localStorage.getItem(OFF_KEY) === "1"; } catch { return false; }
}

async function registration() {
  await navigator.serviceWorker.register(SW_URL);
  return navigator.serviceWorker.ready;
}

/** Toglie da team_members il vecchio token Firebase di questo dispositivo (se c'era). */
async function rimuoviVecchioTokenFirebase(teamMemberId) {
  let prev = null;
  try { prev = localStorage.getItem("asm-fcm-token"); } catch { /* niente */ }
  if (!prev || !teamMemberId) return;
  const { data: tm } = await supabase.from("team_members").select("fcm_token, fcm_tokens").eq("id", teamMemberId).single();
  const updates = { fcm_tokens: (tm?.fcm_tokens ?? []).filter((t) => t !== prev) };
  if (tm?.fcm_token === prev) updates.fcm_token = null;
  await supabase.from("team_members").update(updates).eq("id", teamMemberId);
  try { localStorage.removeItem("asm-fcm-token"); } catch { /* niente */ }
}

/** Iscrive questo dispositivo. Ritorna null se ok, altrimenti il messaggio d'errore. */
export async function enablePush(teamMemberId) {
  if (!pushSupported()) return "Questo browser non supporta le notifiche push. Su iPhone aggiungi ASM alla schermata Home e aprila da lì.";
  try {
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") return "Permesso negato: abilita le notifiche per ASM nelle impostazioni del browser o dell'iPhone.";

    const key = await vapidKey();
    const reg = await registration();
    let sub = await reg.pushManager.getSubscription();
    // Un'iscrizione vecchia (Firebase) usa un'altra chiave: va sostituita
    if (sub && !sameKey(sub.options?.applicationServerKey, key)) {
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });

    const json = sub.toJSON();
    const { error } = await supabase.rpc("register_web_push", {
      p_endpoint: json.endpoint, p_p256dh: json.keys.p256dh, p_auth: json.keys.auth,
    });
    if (error) return error.message;
    try { localStorage.removeItem(OFF_KEY); } catch { /* niente */ }
    await rimuoviVecchioTokenFirebase(teamMemberId).catch(() => {});
    return null;
  } catch (e) {
    return e?.message ?? "Iscrizione alle notifiche non riuscita.";
  }
}

/** Spegne le notifiche su questo dispositivo finché non le riattivi. */
export async function disablePush(teamMemberId) {
  try { localStorage.setItem(OFF_KEY, "1"); } catch { /* niente */ }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.rpc("unregister_web_push", { p_endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
  } catch { /* niente */ }
  await rimuoviVecchioTokenFirebase(teamMemberId).catch(() => {});
}

/** Questo dispositivo è iscritto con la chiave giusta? */
export async function isPushActive() {
  if (!pushSupported() || Notification.permission !== "granted" || isPushOff()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return false;
    return sameKey(sub.options?.applicationServerKey, await vapidKey());
  } catch { return false; }
}

/** All'apertura dell'app: se il permesso c'è, rinnova (o crea) l'iscrizione in silenzio. */
// Passa in automatico al nuovo sistema solo i dispositivi che avevano già le notifiche
// attive (token Firebase salvato) o che sono già iscritti: chi le aveva spente resta spento.
export async function refreshPush(teamMemberId) {
  if (!pushSupported() || Notification.permission !== "granted" || isPushOff()) return;
  let avevaFirebase = false;
  try { avevaFirebase = !!localStorage.getItem("asm-fcm-token"); } catch { /* niente */ }
  let iscritto = false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    iscritto = !!(await reg?.pushManager.getSubscription());
  } catch { /* niente */ }
  if (!avevaFirebase && !iscritto) return;
  await enablePush(teamMemberId);
}
