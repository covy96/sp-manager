// supabase/functions/delete-studio/index.ts
// Cancellazione studio: verifica owner, annulla Stripe, soft-delete + retention 30gg, caccia i membri.
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;

// Client privilegiato (bypassa RLS) per le operazioni distruttive
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const RETENTION_DAYS = 30;
const CONFIRM_PHRASE = 'CANCELLA STUDIO';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { studioId, confirmText } = await req.json();
    if (!studioId) return json({ error: 'studioId mancante' }, 400);

    // Frase di conferma obbligatoria
    if ((confirmText || '').trim().toUpperCase() !== CONFIRM_PHRASE) {
      return json({ error: 'Conferma non valida. Scrivi "CANCELLA STUDIO".' }, 400);
    }

    // ── 1. Autenticazione: ricava l'utente dal JWT ─────────────────
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Non autenticato' }, 401);

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !user) return json({ error: 'Sessione non valida' }, 401);

    // ── 2. Verifica che l'utente sia OWNER dello studio ────────────
    const { data: studio, error: stErr } = await admin
      .from('studios')
      .select('id, owner_id, stripe_subscription_id, deleted_at')
      .eq('id', studioId)
      .single();
    if (stErr || !studio) return json({ error: 'Studio non trovato' }, 404);
    if (studio.deleted_at) return json({ error: 'Studio già cancellato' }, 409);

    let isOwner = studio.owner_id === user.id;
    if (!isOwner) {
      const { data: tm } = await admin
        .from('team_members')
        .select('id')
        .eq('user_account', user.id)
        .eq('studio', studioId)
        .eq('role_internal', 'Owner')
        .maybeSingle();
      isOwner = !!tm;
    }
    if (!isOwner) return json({ error: 'Solo il titolare può cancellare lo studio.' }, 403);

    // ── 3. Annulla l'abbonamento Stripe (se presente) ──────────────
    if (studio.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(studio.stripe_subscription_id);
      } catch (e) {
        // Se la subscription è già cancellata/inesistente proseguiamo comunque
        console.error('Stripe cancel error:', e?.message || e);
      }
    }

    // ── 4. Soft-delete dello studio con retention di 30 giorni ─────
    const now = new Date();
    const deleteAfter = new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const { error: updErr } = await admin
      .from('studios')
      .update({
        deleted_at: now.toISOString(),
        delete_after: deleteAfter.toISOString(),
        piano: 'free',
        stripe_subscription_id: null,
      })
      .eq('id', studioId);
    if (updErr) return json({ error: 'Errore durante la cancellazione: ' + updErr.message }, 500);

    // ── 5. Caccia tutti i membri (disattiva) ───────────────────────
    await admin.from('team_members').update({ active: false }).eq('studio', studioId);

    return json({ success: true, deleteAfter: deleteAfter.toISOString() });
  } catch (err) {
    console.error('delete-studio error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
