import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { loadStripe } from "@stripe/stripe-js";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "€0",
    period: "/mese",
    description: "Per piccoli studi che iniziano",
    features: [
      "3 utenti",
      "5 progetti",
      "10 commesse",
      "Calendario e task",
      "Timesheet base",
    ],
    cta: "Piano attuale",
    disabled: true,
  },
  {
    id: "studio",
    name: "Studio",
    price: "€19,99",
    period: "/mese",
    description: "Per studi in crescita",
    features: [
      "Utenti illimitati",
      "Progetti illimitati",
      "Commesse illimitate",
      "Report avanzati",
      "Gantt progetti",
      "Proforma e fatturazione",
      "Priorità supporto",
    ],
    cta: "Upgrade a Studio",
    priceIdEnv: "VITE_STRIPE_STUDIO_PRICE_ID",
  },
  {
    id: "pro",
    name: "Pro",
    price: "€49,99",
    period: "/mese",
    description: "Per studi professionisti",
    features: [
      "Tutto di Studio",
      "API access",
      "White-label reports",
      "Backup automatici giornalieri",
      "Account manager dedicato",
      "SLA garantito",
    ],
    cta: "Upgrade a Pro",
    priceIdEnv: "VITE_STRIPE_PRO_PRICE_ID",
  },
];

export default function PianoPage() {
  usePageTitleOnMount("Piano");
  const { teamMember, studioId } = useStudio();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState("free");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!teamMember?.id) return;

    // Check for success parameter from Stripe
    if (searchParams.get("success") === "true") {
      setSuccessMessage("Abbonamento attivato con successo!");
      // Clear success param from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("success");
      setSearchParams(newParams, { replace: true });

      // Refresh plan from database
      loadCurrentPlan();
    } else {
      loadCurrentPlan();
    }
  }, [teamMember?.id, searchParams]);

  const loadCurrentPlan = async () => {
    if (!teamMember?.studio_id) return;

    const { data } = await supabase
      .from("studios")
      .select("piano")
      .eq("id", teamMember.studio_id)
      .single();

    if (data?.piano) {
      setCurrentPlan(data.piano);
    }
  };

  const handleUpgrade = async (plan) => {
    if (!teamMember?.id || !studioId) {
      alert("Errore: utente o studio non trovato");
      return;
    }

    const priceId = import.meta.env[plan.priceIdEnv];
    if (!priceId) {
      alert("Errore: configurazione Stripe mancante");
      return;
    }

    setLoading(true);
    try {
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId: priceId,
          studioId: studioId,
          userId: teamMember.id,
          successUrl: window.location.origin + "/impostazioni/piano?success=true",
          cancelUrl: window.location.origin + "/impostazioni/piano",
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.sessionId) {
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
      } else {
        throw new Error("Session ID non ricevuto");
      }
    } catch (err) {
      console.error("Errore upgrade:", err);
      alert("Errore durante l'upgrade: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Piano</h2>
        <p className="text-sm text-white/60">Gestisci il tuo abbonamento</p>
      </div>

      {successMessage && (
        <div className="rounded-lg bg-[#30d158]/20 border border-[#30d158]/40 p-4">
          <p className="text-sm text-[#30d158]">{successMessage}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
          <span className="ml-2 text-sm text-white/60">Caricamento...</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isUpgradeable = !plan.disabled && !isCurrent;

          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 ${
                isCurrent
                  ? "border-[#0a84ff] bg-[#0a84ff]/10"
                  : "border-[#48484a] bg-[#2c2c2e]"
              }`}
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="text-sm text-white/50">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-white/50">{plan.period}</span>
              </div>

              <ul className="mb-6 space-y-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-white/80">
                    <svg
                      className="h-5 w-5 shrink-0 text-[#30d158]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <span className="inline-flex items-center rounded-full bg-[#30d158]/20 px-3 py-1 text-xs font-medium text-[#30d158]">
                  Piano attuale
                </span>
              ) : (
                <button
                  onClick={() => isUpgradeable && handleUpgrade(plan)}
                  disabled={!isUpgradeable || loading}
                  className={`w-full rounded-lg py-2.5 text-sm font-medium transition ${
                    isUpgradeable
                      ? "bg-[#0a84ff] text-white hover:bg-[#0a84ff]/90 disabled:opacity-50"
                      : "cursor-not-allowed bg-[#48484a] text-white/40"
                  }`}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
        <h3 className="mb-2 text-sm font-medium text-white">Hai bisogno di aiuto?</h3>
        <p className="text-sm text-white/60">
          Contatta il supporto per assistenza con il tuo abbonamento o per richieste personalizzate.
        </p>
      </div>
    </div>
  );
}
