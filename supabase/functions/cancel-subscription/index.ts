// supabase/functions/cancel-subscription/index.ts
// Annulla immediatamente l'abbonamento Stripe attivo di uno studio e riporta il piano a "free".
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

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { studioId } = await req.json();
    if (!studioId) return json({ error: 'studioId mancante' }, 400);

    // ── Autenticazione ──────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Non autenticato' }, 401);

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !user) return json({ error: 'Sessione non valida' }, 401);

    // ── Verifica che l'utente sia Owner/Partner dello studio ───────
    const { data: studio, error: stErr } = await admin
      .from('studios')
      .select('id, owner_id, stripe_subscription_id')
      .eq('id', studioId)
      .single();
    if (stErr || !studio) return json({ error: 'Studio non trovato' }, 404);

    let isAuthorized = studio.owner_id === user.id;
    if (!isAuthorized) {
      const { data: tm } = await admin
        .from('team_members')
        .select('id')
        .eq('user_account', user.id)
        .eq('studio', studioId)
        .in('role_internal', ['Owner', 'Partner'])
        .maybeSingle();
      isAuthorized = !!tm;
    }
    if (!isAuthorized) return json({ error: 'Non autorizzato a modificare il piano.' }, 403);

    // ── Annulla l'abbonamento Stripe, se presente ──────────────────
    if (studio.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(studio.stripe_subscription_id);
      } catch (e) {
        console.error('Stripe cancel error:', e?.message || e);
      }
    }

    const { error: updErr } = await admin
      .from('studios')
      .update({ piano: 'free', stripe_subscription_id: null })
      .eq('id', studioId);
    if (updErr) return json({ error: 'Errore aggiornamento piano: ' + updErr.message }, 500);

    return json({ success: true });
  } catch (err) {
    console.error('cancel-subscription error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
