// @ts-nocheck — contiene una copia JS (non tipizzata) di src/lib/mailDates.js e mailMatch.js
// supabase/functions/outlook/index.ts
// Collegamento della casella Outlook (Microsoft 365 o outlook.com) di un utente
// ad ASM tramite Microsoft Graph, in SOLA LETTURA.
//
// Un'unica funzione, due ingressi:
//  - GET  ?code=…&state=…  → callback OAuth di Microsoft (nessun JWT Supabase:
//    la funzione va deployata con --no-verify-jwt e l'utente è ricavato dallo
//    state firmato). Scambia il code, salva i token e torna all'app.
//  - POST { action, … }    → chiamate dall'app con il JWT dell'utente:
//    status | auth-url | messages | message | disconnect | settings | sync.
//  - POST { action: "sync-all" } con Authorization: Bearer CRON_SECRET →
//    lettura automatica per tutti gli utenti con auto_sync attivo (pg_cron).
//
// Lettura automatica: le mail nuove vengono abbinate a un progetto con regole
// (contatti, nome, indirizzo, cliente) e le date trovate nel testo diventano
// attività in calendario. Ogni mail elaborata finisce in outlook_mail_items:
// creata | collegata | da_rivedere | ignorata.
//
// I token NON arrivano mai al browser: stanno in outlook_connections (RLS senza
// policy → leggibile solo dal service role) e sono cifrati AES-GCM con
// OUTLOOK_TOKEN_KEY.
//
// Secret richiesti: MS_CLIENT_ID, MS_CLIENT_SECRET, OUTLOOK_TOKEN_KEY
// (opzionale MS_TENANT, default "common" = account di lavoro + personali;
// CRON_SECRET, lo stesso di check-scadenze, per la lettura automatica).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;
const CLIENT_ID     = Deno.env.get('MS_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('MS_CLIENT_SECRET') ?? '';
const TOKEN_KEY     = Deno.env.get('OUTLOOK_TOKEN_KEY') ?? '';
const TENANT        = Deno.env.get('MS_TENANT') || 'common';
const CRON_SECRET   = Deno.env.get('CRON_SECRET') ?? '';

const AUTHORITY    = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0`;
const GRAPH        = 'https://graph.microsoft.com/v1.0';
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/outlook`;
const SCOPES       = 'offline_access openid profile email User.Read Mail.Read';
const STATE_TTL_MS = 10 * 60_000;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ── Crypto: chiave derivata da OUTLOOK_TOKEN_KEY ─────────────────────
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64u = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

let keysPromise: Promise<{ aes: CryptoKey; hmac: CryptoKey }> | null = null;
function keys() {
  if (!keysPromise) {
    keysPromise = (async () => {
      const raw = await crypto.subtle.digest('SHA-256', enc.encode(TOKEN_KEY));
      const aes  = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
      const hmac = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
      return { aes, hmac };
    })();
  }
  return keysPromise;
}

async function encrypt(text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, (await keys()).aes, enc.encode(text));
  return `${b64u(iv)}.${b64u(ct)}`;
}
async function decrypt(blob: string) {
  const [iv, ct] = blob.split('.');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(iv) }, (await keys()).aes, unb64u(ct));
  return dec.decode(pt);
}

// state = payload base64url + firma HMAC: evita una tabella di appoggio e
// impedisce che qualcuno colleghi la propria casella all'account di un altro.
async function signState(payload: Record<string, unknown>) {
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', (await keys()).hmac, enc.encode(body));
  return `${body}.${b64u(sig)}`;
}
async function readState(state: string) {
  const [body, sig] = (state || '').split('.');
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify('HMAC', (await keys()).hmac, unb64u(sig), enc.encode(body));
  if (!ok) return null;
  const p = JSON.parse(dec.decode(unb64u(body)));
  if (!p.exp || Date.now() > p.exp) return null;
  return p as { uid: string; ret: string; exp: number };
}

// Torna solo a pagine https (o localhost in sviluppo): niente open redirect
// verso schemi strani.
function safeReturn(url: unknown) {
  try {
    const u = new URL(String(url));
    if (u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1') return u.toString();
  } catch { /* ignora */ }
  return null;
}

// ── Token Microsoft ──────────────────────────────────────────────────
async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(`${AUTHORITY}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT_URI, scope: SCOPES, ...params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || 'Errore token Microsoft');
  return data as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
}

async function saveTokens(userId: string, tok: { access_token: string; refresh_token?: string; expires_in: number; scope?: string }, email?: string | null) {
  const row: Record<string, unknown> = {
    user_id: userId,
    access_token: await encrypt(tok.access_token),
    expires_at: new Date(Date.now() + (tok.expires_in - 60) * 1000).toISOString(),
    scope: tok.scope ?? null,
    updated_at: new Date().toISOString(),
  };
  if (tok.refresh_token) row.refresh_token = await encrypt(tok.refresh_token);
  if (email !== undefined) row.email = email;
  const { error } = await admin.from('outlook_connections').upsert(row, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

// Restituisce un access token valido, rinnovandolo se scaduto.
async function accessTokenFor(userId: string) {
  const { data: conn } = await admin.from('outlook_connections').select('*').eq('user_id', userId).maybeSingle();
  if (!conn) return null;
  if (new Date(conn.expires_at).getTime() > Date.now()) return await decrypt(conn.access_token);
  const tok = await tokenRequest({ grant_type: 'refresh_token', refresh_token: await decrypt(conn.refresh_token) });
  await saveTokens(userId, tok);
  return tok.access_token;
}

async function graph(token: string, pathOrUrl: string, extraHeaders: Record<string, string> = {}) {
  const url = pathOrUrl.startsWith('https://') ? pathOrUrl : `${GRAPH}${pathOrUrl}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, ...extraHeaders } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Errore Microsoft Graph (${res.status})`);
  return data;
}

const LIST_FIELDS = 'id,subject,from,toRecipients,receivedDateTime,bodyPreview,isRead,hasAttachments,webLink,conversationId';

// <shared> — generato da scripts/inline-outlook-shared.mjs, non modificare a mano
// ── src/lib/mailDates.js ──
// Riconosce date e orari nel testo di una mail (italiano), senza servizi
// esterni: serve a precompilare un'attività in calendario. È solo un aiuto,
// l'utente rivede sempre data e ora prima di salvare.

const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
const MESI_RE = MESI.map(m => m.slice(0, 3) + `(?:${m.slice(3)})?`).join("|");
const GIORNI = ["domenica","lunedì","martedì","mercoledì","giovedì","venerdì","sabato"];

const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const strip = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

function validDate(y, m, d) {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null;
}

// Anno mancante: la prossima occorrenza a partire dal giorno di riferimento
function withYear(m, d, ref) {
  let dt = validDate(ref.getFullYear(), m, d);
  if (dt && dt < new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())) dt = validDate(ref.getFullYear() + 1, m, d);
  return dt;
}

const fullYear = y => (y < 100 ? 2000 + y : y);

// Orario subito dopo la data (entro pochi caratteri): "alle 10:30", "ore 9", "h 15.00"
const TIME_AFTER = /^[^\n\d]{0,20}?(?:ore|alle|h\.?|dalle)?\s*([01]?\d|2[0-3])(?:[:.]([0-5]\d))?\b/i;
const TIME_ANY = /\b(?:ore|alle|dalle|h\.?)\s*([01]?\d|2[0-3])(?:[:.]([0-5]\d))?\b|\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/gi;

function timeNear(text, from) {
  const m = TIME_AFTER.exec(text.slice(from, from + 30));
  if (!m) return null;
  // Senza "ore/alle" un numero nudo (es. "12 2026") non è un orario
  const hasKeyword = /ore|alle|dalle|h/i.test(m[0].replace(/\d.*/, ""));
  if (!m[2] && !hasKeyword) return null;
  return `${pad(m[1])}:${m[2] ?? "00"}`;
}

// Taglia la cronologia citata sotto la risposta ("Da: … Inviato: …",
// "Il giorno … ha scritto:", "-----Messaggio originale-----", righe con ">"):
// le sue date/ore sono quelle delle mail precedenti, non appuntamenti.
const QUOTE_START = /^\s*(?:-{2,}\s*(?:messaggio originale|original message|messaggio inoltrato|forwarded message)|(?:da|from)\s*:\s.+|il giorno .+ ha scritto\s*:?|on .+ wrote\s*:?|>.*)\s*$/im;
function stripQuoted(text) {
  const s = String(text ?? "");
  const m = QUOTE_START.exec(s);
  return m ? s.slice(0, m.index) : s;
}

/**
 * @param {string} text testo della mail (oggetto + corpo)
 * @param {Date} ref data di ricezione, per "domani", giorni della settimana e anno mancante
 * @returns {{date: string, time: string|null, match: string}[]} senza duplicati, in ordine di apparizione
 */
function findMailDates(text, ref = new Date()) {
  if (!text) return [];
  const src = strip(text);
  const found = [];
  const add = (dt, index, len) => {
    if (!dt) return;
    found.push({ date: iso(dt), time: timeNear(src, index + len), match: text.slice(index, index + len), index });
  };

  // 12/11/2026, 12-11-26, 12.11.2026, 12/11
  for (const m of src.matchAll(/(?<![\d./-])(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?(?![\d]|[./-]\d)/g)) {
    const d = +m[1], mo = +m[2];
    if (!m[3] && m[0].includes(".")) continue; // "10.30" è un orario
    add(m[3] ? validDate(fullYear(+m[3]), mo, d) : withYear(mo, d, ref), m.index, m[0].length);
  }
  // 12 novembre (2026), 3 nov
  for (const m of src.matchAll(new RegExp(`\\b(\\d{1,2})\\s+(${MESI_RE})\\.?(?:\\s+(\\d{4}))?\\b`, "gi"))) {
    const mo = MESI.findIndex(x => x.startsWith(m[2].toLowerCase().slice(0, 3))) + 1;
    add(m[3] ? validDate(+m[3], mo, +m[1]) : withYear(mo, +m[1], ref), m.index, m[0].length);
  }
  // oggi, domani, dopodomani
  for (const m of src.matchAll(/\b(oggi|dopodomani|domani)\b/gi)) {
    const off = { oggi: 0, domani: 1, dopodomani: 2 }[m[1].toLowerCase()];
    add(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + off), m.index, m[0].length);
  }
  // lunedì / martedi prossimo… (se non è già seguito da una data esplicita)
  for (const m of src.matchAll(new RegExp(`\\b(${GIORNI.map(strip).join("|")})(?!\\s+\\d)`, "gi"))) {
    const wd = GIORNI.map(strip).indexOf(m[1].toLowerCase());
    const diff = ((wd - ref.getDay() + 7) % 7) || 7;
    add(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diff), m.index, m[0].length);
  }

  found.sort((a, b) => a.index - b.index);
  const seen = new Set();
  return found.filter(f => {
    const k = `${f.date}|${f.time}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).map(({ index, ...f }) => f); // eslint-disable-line no-unused-vars
}

// Primo orario citato nel testo, se non ce n'è uno vicino alla data
function firstTime(text) {
  TIME_ANY.lastIndex = 0;
  const m = TIME_ANY.exec(strip(text || ""));
  if (!m) return null;
  return m[1] ? `${pad(m[1])}:${m[2] ?? "00"}` : `${pad(m[3])}:${m[4]}`;
}

// ── src/lib/mailMatch.js ──
// Abbina una mail a un progetto con regole semplici (nessun servizio esterno):
// indirizzi email dei contatti del progetto, nome, indirizzo e cliente citati
// nell'oggetto o nel testo. Se il risultato non è netto, restituisce null e
// la mail va nella lista "Da rivedere".

function normText(s) {
  return ` ${String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

const has = (hay, needle) => needle.trim().length >= 4 && hay.includes(needle);

// Parole che da sole non identificano un progetto
const STOP = new Set(["via", "viale", "piazza", "corso", "largo", "del", "della", "dei", "delle", "di", "da", "per", "the", "and", "srl", "spa", "snc", "progetto", "lavori", "nuovo", "nuova"]);
const nameWords = (name) => normText(name).trim().split(" ").filter(w => w.length >= 2 && !STOP.has(w) && !(w.length < 3 && !/\d/.test(w)));

// Prima parte dell'indirizzo ("Via Roma 12, Milano" → "via roma 12")
const street = (addr) => normText(String(addr ?? "").split(",")[0]);

// Toglie RE:/R:/FW:/I:/Fwd: dall'oggetto
function cleanSubject(s) {
  return String(s ?? "").replace(/^(\s*(re|r|fw|fwd|i|inoltra)\s*:\s*)+/i, "").trim();
}

/**
 * @param {{subject?: string, body?: string, participants?: string[]}} mail
 * @param {{id: string, name?: string, client?: string, address?: string}[]} projects
 * @param {{project_id: string, email?: string}[]} contacts
 * @returns {{projectId: string|null, reason: string, candidates: {id: string, score: number, why: string[]}[]}}
 */
function matchProject(mail, projects, contacts = []) {
  const subject = normText(cleanSubject(mail.subject));
  const body = normText(mail.body);
  const people = new Set((mail.participants ?? []).map(e => String(e).trim().toLowerCase()).filter(Boolean));

  const emailsByProject = {};
  for (const c of contacts) {
    const e = String(c.email ?? "").trim().toLowerCase();
    if (e) (emailsByProject[c.project_id] ??= new Set()).add(e);
  }

  // Il nome del progetto vale se tutte le sue parole significative compaiono
  // (in qualsiasi ordine): "Woolrich Milano" riconosce "WOOLRICH - Milano".
  const nameHits = {};
  for (const p of projects) {
    const words = nameWords(p.name);
    if (!words.length) continue;
    if (words.every(w => subject.includes(` ${w} `))) nameHits[p.id] = { where: "subject", words };
    else if (words.every(w => body.includes(` ${w} `))) nameHits[p.id] = { where: "body", words };
  }
  // Se "Woolrich" e "Woolrich Milano" corrispondono entrambi, vale il più specifico
  for (const [id, hit] of Object.entries(nameHits)) {
    const moreSpecific = Object.entries(nameHits).some(([other, h]) =>
      other !== id && h.where === hit.where && h.words.length > hit.words.length && hit.words.every(w => h.words.includes(w)));
    if (moreSpecific) delete nameHits[id];
  }

  const candidates = [];
  for (const p of projects) {
    let score = 0;
    const why = [];
    const hit = nameHits[p.id];
    if (hit?.where === "subject") { score += 12; why.push("nome nell'oggetto"); }
    else if (hit?.where === "body") { score += 5; why.push("nome nel testo"); }
    const emails = emailsByProject[p.id];
    if (emails && [...people].some(e => emails.has(e))) { score += 8; why.push("contatto del progetto"); }
    const st = street(p.address);
    if (/\d/.test(st) || st.trim().split(" ").length >= 3) {
      if (has(subject, st) || has(body, st)) { score += 6; why.push("indirizzo"); }
    }
    const client = normText(p.client);
    if (has(subject, client) || has(body, client)) { score += 3; why.push("cliente"); }
    if (score > 0) candidates.push({ id: p.id, score, why });
  }
  candidates.sort((a, b) => b.score - a.score);

  const [best, second] = candidates;
  if (!best) return { projectId: null, reason: "nessun progetto riconosciuto", candidates };
  if (best.score < 8) return { projectId: null, reason: "progetto incerto", candidates };
  if (second && best.score - second.score < 4) return { projectId: null, reason: "più progetti possibili", candidates };
  return { projectId: best.id, reason: best.why.join(", "), candidates };
}
// </shared>

// ── Lettura automatica ───────────────────────────────────────────────
const FIRST_SYNC_DAYS = 3;
const SYNC_MAX = 50;
const dayOf = (iso: string) => iso.slice(0, 10);

async function syncUser(conn: { user_id: string; email: string | null; last_sync_at: string | null }) {
  const token = await accessTokenFor(conn.user_id);
  if (!token) return { processed: 0 };

  // Studio e membro dell'utente (per i progetti e l'assegnazione delle attività)
  const { data: members } = await admin.from('team_members')
    .select('id, studio, user_name, user_email').eq('user_account', conn.user_id)
    .not('studio', 'is', null).order('created_at', { ascending: false }).limit(1);
  const tm = members?.[0];
  if (!tm) return { processed: 0 };

  // Un po' di sovrapposizione con il giro precedente (le mail già viste vengono
  // saltate): copre quelle consegnate in ritardo rispetto a receivedDateTime.
  const startedAt = new Date().toISOString();
  const since = conn.last_sync_at
    ? new Date(new Date(conn.last_sync_at).getTime() - 15 * 60_000).toISOString()
    : new Date(Date.now() - FIRST_SYNC_DAYS * 86400_000).toISOString();
  const q = new URLSearchParams({
    $filter: `receivedDateTime gt ${since}`,
    $orderby: 'receivedDateTime asc',
    $top: String(SYNC_MAX),
    $select: `${LIST_FIELDS},ccRecipients,body,uniqueBody`,
  });
  const data = await graph(token, `/me/mailFolders/inbox/messages?${q}`, { Prefer: 'outlook.body-content-type="text"' });
  const own = (conn.email || '').toLowerCase();
  const mails = (data.value ?? []).filter((m: any) => (m.from?.emailAddress?.address || '').toLowerCase() !== own);
  const lastSeen = data.value?.length ? data.value[data.value.length - 1].receivedDateTime : null;

  if (mails.length) {
    const { data: done } = await admin.from('outlook_mail_items')
      .select('message_id').eq('user_id', conn.user_id).in('message_id', mails.map((m: any) => m.id));
    const doneIds = new Set((done ?? []).map((d: any) => d.message_id));
    const todo = mails.filter((m: any) => !doneIds.has(m.id));

    const { data: projects } = await admin.from('projects')
      .select('id, name, client, address').eq('studio', tm.studio).eq('archived', false);
    const projIds = (projects ?? []).map((p: any) => p.id);
    const { data: pcs } = projIds.length
      ? await admin.from('project_contacts').select('project_id, global_contacts(email)').in('project_id', projIds)
      : { data: [] };
    const contacts = (pcs ?? []).map((c: any) => ({ project_id: c.project_id, email: c.global_contacts?.email }));

    for (const m of todo) {
      const body = String(m.body?.content || '').slice(0, 20000);
      const participants = [m.from, ...(m.toRecipients ?? []), ...(m.ccRecipients ?? [])]
        .map((r: any) => r?.emailAddress?.address).filter(Boolean)
        .filter((e: string) => e.toLowerCase() !== own);
      const match = matchProject({ subject: m.subject, body, participants }, projects ?? [], contacts);
      const received = new Date(m.receivedDateTime);
      // Date solo dal testo nuovo della mail, senza la cronologia citata
      const fresh = stripQuoted(String(m.uniqueBody?.content || body)).slice(0, 20000);
      const dates = findMailDates(`${m.subject || ''}\n${fresh}`, received)
        .filter((d: any) => d.date >= dayOf(m.receivedDateTime));
      // Conta solo un appuntamento preciso: data E ora (es. "il 4/11 alle 10:30")
      const when = dates.find((d: any) => d.time) ?? null;
      const time = when?.time ?? null;

      const item: Record<string, unknown> = {
        user_id: conn.user_id, studio: tm.studio, message_id: m.id, conversation_id: m.conversationId ?? null,
        received_at: m.receivedDateTime, subject: m.subject ?? null,
        from_email: m.from?.emailAddress?.address ?? null, from_name: m.from?.emailAddress?.name ?? null,
        web_link: m.webLink ?? null, preview: m.bodyPreview ?? null,
        project_id: match.projectId, suggested_date: when?.date ?? null, suggested_time: time,
        reason: match.reason,
      };

      if (match.projectId && when) {
        // Stessa conversazione, stesso giorno: è una risposta, non un nuovo appuntamento
        const { data: dup } = m.conversationId
          ? await admin.from('outlook_mail_items').select('id').eq('user_id', conn.user_id)
              .eq('conversation_id', m.conversationId).eq('status', 'creata').eq('suggested_date', when.date).limit(1)
          : { data: [] };
        if (dup?.length) {
          item.status = 'collegata';
          item.reason = `${match.reason}; attività già creata da questa conversazione`;
        } else {
          const from = m.from?.emailAddress;
          const note = [`Da mail di ${from?.name || from?.address || '?'} del ${received.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' })}: ${m.subject || ''}`, m.webLink].filter(Boolean).join('\n');
          const { data: task, error } = await admin.from('tasks').insert({
            project_id: match.projectId, title: cleanSubject(m.subject) || 'Da mail', categoria: null, status: 'todo',
            assigned_member: tm.id, assigned_to_name: tm.user_name || tm.user_email || null,
            data_pianificata: when.date, ora_pianificata: time, note, order: 0, studio: tm.studio,
          }).select('id').single();
          if (error) { item.status = 'da_rivedere'; item.reason = `errore creazione attività: ${error.message}`; }
          else { item.status = 'creata'; item.task_id = task.id; }
        }
      } else if (match.projectId) {
        item.status = 'collegata';
      } else if (when) {
        item.status = 'da_rivedere';
        item.project_id = match.candidates[0]?.score >= 4 ? match.candidates[0].id : null; // suggerimento
      } else {
        item.status = 'ignorata';
      }
      await admin.from('outlook_mail_items').upsert(item, { onConflict: 'user_id,message_id', ignoreDuplicates: true });
    }
  }

  // Se la pagina era piena riprende dall'ultima mail vista, altrimenti da quando è partito questo giro
  const next = (data.value?.length ?? 0) >= SYNC_MAX && lastSeen ? lastSeen : startedAt;
  await admin.from('outlook_connections').update({ last_sync_at: next }).eq('user_id', conn.user_id);
  return { processed: mails.length };
}

// ── Callback OAuth (GET) ─────────────────────────────────────────────
async function handleCallback(url: URL) {
  const state = await readState(url.searchParams.get('state') || '').catch(() => null);
  const back = (ret: string | undefined, qs: Record<string, string>) => {
    const target = new URL(safeReturn(ret) || 'https://localhost/');
    for (const [k, v] of Object.entries(qs)) target.searchParams.set(k, v);
    return Response.redirect(target.toString(), 302);
  };
  if (!state) return new Response('Richiesta di collegamento scaduta o non valida. Torna in ASM e riprova.', { status: 400 });

  const err = url.searchParams.get('error');
  if (err) return back(state.ret, { outlook: 'error', msg: url.searchParams.get('error_description') || err });

  try {
    const tok = await tokenRequest({ grant_type: 'authorization_code', code: url.searchParams.get('code') || '' });
    const me = await graph(tok.access_token, '/me?$select=mail,userPrincipalName');
    await saveTokens(state.uid, tok, me.mail || me.userPrincipalName || null);
    return back(state.ret, { outlook: 'connected' });
  } catch (e) {
    console.error('Callback Outlook:', e);
    return back(state.ret, { outlook: 'error', msg: (e as Error).message });
  }
}

// ── Azioni dall'app (POST) ───────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  if (!CLIENT_ID || !CLIENT_SECRET || !TOKEN_KEY) {
    return json({ error: 'Collegamento Outlook non configurato: mancano i secret MS_CLIENT_ID / MS_CLIENT_SECRET / OUTLOOK_TOKEN_KEY.' }, 500);
  }

  const url = new URL(req.url);
  if (req.method === 'GET') return handleCallback(url);

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');

    // Chiamata del cron: lettura automatica per tutti gli utenti che l'hanno attivata
    if (CRON_SECRET && jwt === CRON_SECRET) {
      const { data: conns } = await admin.from('outlook_connections').select('user_id, email, last_sync_at').eq('auto_sync', true);
      const results = [];
      for (const c of conns ?? []) {
        try { results.push({ user: c.user_id, ...(await syncUser(c)) }); }
        catch (e) { console.error('Sync Outlook', c.user_id, e); results.push({ user: c.user_id, error: (e as Error).message }); }
      }
      return json({ ok: true, results });
    }

    const authClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await authClient.auth.getUser(jwt);
    if (!user) return json({ error: 'Non autenticato' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'status') {
      const { data } = await admin.from('outlook_connections').select('email, created_at, auto_sync, last_sync_at').eq('user_id', user.id).maybeSingle();
      return json({
        connected: !!data, email: data?.email ?? null, since: data?.created_at ?? null,
        autoSync: !!data?.auto_sync, lastSyncAt: data?.last_sync_at ?? null,
      });
    }

    if (action === 'settings') {
      const patch: Record<string, unknown> = {};
      if (typeof body.autoSync === 'boolean') patch.auto_sync = body.autoSync;
      if (Object.keys(patch).length) await admin.from('outlook_connections').update(patch).eq('user_id', user.id);
      return json({ ok: true });
    }

    if (action === 'auth-url') {
      const ret = safeReturn(body.returnTo);
      if (!ret) return json({ error: 'returnTo non valido' }, 400);
      const state = await signState({ uid: user.id, ret, exp: Date.now() + STATE_TTL_MS });
      const auth = new URL(`${AUTHORITY}/authorize`);
      auth.search = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        response_mode: 'query',
        scope: SCOPES,
        state,
        prompt: 'select_account',
      }).toString();
      return json({ url: auth.toString() });
    }

    if (action === 'disconnect') {
      await admin.from('outlook_connections').delete().eq('user_id', user.id);
      return json({ ok: true });
    }

    const token = await accessTokenFor(user.id);
    if (!token) return json({ error: 'Outlook non collegato', notConnected: true }, 404);

    if (action === 'sync') {
      const { data: conn } = await admin.from('outlook_connections').select('user_id, email, last_sync_at').eq('user_id', user.id).single();
      return json(await syncUser(conn));
    }

    if (action === 'messages') {
      // Pagina successiva: accettiamo solo nextLink di Graph sulla casella dell'utente
      if (body.next) {
        const next = String(body.next);
        if (!next.startsWith(`${GRAPH}/me/`)) return json({ error: 'next non valido' }, 400);
        const data = await graph(token, next);
        return json({ messages: data.value ?? [], next: data['@odata.nextLink'] ?? null });
      }
      const top = Math.min(Math.max(Number(body.top) || 25, 1), 50);
      const q = new URLSearchParams({ $top: String(top), $select: LIST_FIELDS });
      // addresses: mail scambiate con questi indirizzi (base per collegarle a clienti/commesse)
      const addresses = Array.isArray(body.addresses) ? body.addresses.filter((a: unknown) => typeof a === 'string' && a.includes('@')).slice(0, 10) : [];
      const search = typeof body.search === 'string' ? body.search.trim().replace(/"/g, '') : '';
      const terms = [
        ...(search ? [search] : []),
        ...(addresses.length ? [addresses.map((a: string) => `participants:${a}`).join(' OR ')] : []),
      ];
      let path: string;
      if (terms.length) {
        // $search non si combina con $orderby: Graph ordina già per data
        q.set('$search', `"${terms.join(' AND ')}"`);
        path = `/me/messages?${q}`;
      } else {
        q.set('$orderby', 'receivedDateTime desc');
        path = `/me/mailFolders/inbox/messages?${q}`;
      }
      const data = await graph(token, path);
      return json({ messages: data.value ?? [], next: data['@odata.nextLink'] ?? null });
    }

    if (action === 'message') {
      if (!body.id) return json({ error: 'id mancante' }, 400);
      // Corpo in testo semplice: niente HTML della mail renderizzato nell'app
      const data = await graph(
        token,
        `/me/messages/${encodeURIComponent(String(body.id))}?$select=${LIST_FIELDS},ccRecipients,body`,
        { Prefer: 'outlook.body-content-type="text"' },
      );
      return json({ message: data });
    }

    return json({ error: 'Azione sconosciuta' }, 400);
  } catch (e) {
    console.error('Outlook:', e);
    return json({ error: (e as Error).message }, 500);
  }
});
