// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Mappa price ID → piano
const PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get("STRIPE_STUDIO_PRICE_ID") || ""]: "studio",
  [Deno.env.get("STRIPE_PRO_PRICE_ID") || ""]:    "pro",
};

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret!);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const getStudioId = async (customerId: string) => {
    const { data } = await supabase
      .from("studios")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();
    return data?.id;
  };

  const updatePiano = async (studioId: string, piano: string) => {
    await supabase.from("studios").update({ piano }).eq("id", studioId);
  };

  switch (event.type) {

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const studioId = session.metadata?.studioId;
      if (!studioId) break;

      // Salva customer ID
      await supabase.from("studios").update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      }).eq("id", studioId);

      // Aggiorna piano
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = sub.items.data[0]?.price.id;
      const piano = PRICE_TO_PLAN[priceId] || "free";
      await updatePiano(studioId, piano);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const studioId = await getStudioId(sub.customer as string);
      if (!studioId) break;
      const priceId = sub.items.data[0]?.price.id;
      const piano = sub.status === "active"
        ? (PRICE_TO_PLAN[priceId] || "free")
        : "free";
      await updatePiano(studioId, piano);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const studioId = await getStudioId(sub.customer as string);
      if (!studioId) break;
      await updatePiano(studioId, "free");
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
