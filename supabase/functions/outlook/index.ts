// supabase/functions/outlook/index.ts
// Collegamento della casella Outlook (Microsoft 365 o outlook.com) di un utente
// ad ASM tramite Microsoft Graph, in SOLA LETTURA.
//
// Un'unica funzione, due ingressi:
//  - GET  ?code=…&state=…  → callback OAuth di Microsoft (nessun JWT Supabase:
//    la funzione va deployata con --no-verify-jwt e l'utente è ricavato dallo
//    state firmato). Scambia il code, salva i token e torna all'app.
//  - POST { action, … }    → chiamate dall'app con il JWT dell'utente:
//    status | auth-url | messages | message | disconnect.
//
// I token NON arrivano mai al browser: stanno in outlook_connections (RLS senza
// policy → leggibile solo dal service role) e sono cifrati AES-GCM con
// OUTLOOK_TOKEN_KEY.
//
// Secret richiesti: MS_CLIENT_ID, MS_CLIENT_SECRET, OUTLOOK_TOKEN_KEY
// (opzionale MS_TENANT, default "common" = account di lavoro + personali).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;
const CLIENT_ID     = Deno.env.get('MS_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('MS_CLIENT_SECRET') ?? '';
const TOKEN_KEY     = Deno.env.get('OUTLOOK_TOKEN_KEY') ?? '';
const TENANT        = Deno.env.get('MS_TENANT') || 'common';

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
    const authClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await authClient.auth.getUser(jwt);
    if (!user) return json({ error: 'Non autenticato' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === 'status') {
      const { data } = await admin.from('outlook_connections').select('email, created_at').eq('user_id', user.id).maybeSingle();
      return json({ connected: !!data, email: data?.email ?? null, since: data?.created_at ?? null });
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
