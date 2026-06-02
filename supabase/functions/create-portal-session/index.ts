import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { studioId, returnUrl } = await req.json();
    if (!studioId) return new Response(JSON.stringify({ error: 'studioId mancante' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });

    // Recupera stripe_customer_id dallo studio
    const { data: studio, error: dbErr } = await supabase
      .from('studios')
      .select('stripe_customer_id')
      .eq('id', studioId)
      .single();

    if (dbErr || !studio?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Nessun abbonamento attivo trovato per questo studio.' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: studio.stripe_customer_id,
      return_url: returnUrl || 'https://app.sp-manager.it/impostazioni/piano',
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Errore portal session:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
