import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { loadStripe } from "@stripe/stripe-js";

const T = {
  ink: '#0E0E0D', navy: '#13315C', brass: '#D9C98A', paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33', green: '#1a6b3c',
};

const PLANS = [
  {
    id: "free", name: "Free", price: "€0", period: "/mese",
    description: "Per piccoli studi che iniziano",
    features: ["3 utenti", "5 progetti", "10 commesse", "Calendario e task", "Timesheet base"],
    disabled: true,
  },
  {
    id: "studio", name: "Studio", price: "€19,99", period: "/mese",
    description: "Per studi in crescita",
    features: ["Utenti illimitati", "Progetti illimitati", "Commesse illimitate", "Report avanzati", "Gantt progetti", "Proforma e fatturazione", "Priorità supporto"],
    priceIdEnv: "VITE_STRIPE_STUDIO_PRICE_ID",
  },
  {
    id: "pro", name: "Pro", price: "€49,99", period: "/mese",
    description: "Per studi professionisti",
    features: ["Tutto di Studio", "API access", "White-label reports", "Backup automatici", "Account manager dedicato", "SLA garantito"],
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
    if (searchParams.get("success") === "true") {
      setSuccessMessage("Abbonamento attivato con successo!");
      const p = new URLSearchParams(searchParams); p.delete("success");
      setSearchParams(p, { replace: true });
      loadCurrentPlan();
    } else { loadCurrentPlan(); }
  }, [teamMember?.id, searchParams]);

  const loadCurrentPlan = async () => {
    if (!teamMember?.studio_id) return;
    const { data } = await supabase.from("studios").select("piano").eq("id", teamMember.studio_id).single();
    if (data?.piano) setCurrentPlan(data.piano);
  };

  const handleUpgrade = async plan => {
    if (!teamMember?.id || !studioId) { alert("Errore: utente o studio non trovato"); return; }
    setLoading(true);
    try {
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { priceId: import.meta.env[plan.priceIdEnv], studioId, userId: teamMember.id, successUrl: window.location.origin + "/impostazioni/piano?success=true", cancelUrl: window.location.origin + "/impostazioni/piano" },
      });
      if (error) throw new Error(error.message);
      if (data?.sessionId) await stripe.redirectToCheckout({ sessionId: data.sessionId });
      else throw new Error("Session ID non ricevuto");
    } catch (e) { alert("Errore durante l'upgrade: " + e.message); setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', marginBottom: 4 }}>Piano</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>Gestisci il tuo abbonamento</div>
      </div>

      {successMessage && (
        <div style={{ background: '#f0fdf4', border: `0.5px solid ${T.green}`, padding: '12px 16px', marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.green }}>
          {successMessage}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
          Caricamento...
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id;
          const canUpgrade = !plan.disabled && !isCurrent;
          return (
            <div key={plan.id} style={{ background: '#fff', border: `0.5px solid ${isCurrent ? T.navy : T.ink10}`, padding: '22px 20px' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: isCurrent ? T.navy : T.muted, marginBottom: 8 }}>{plan.name}</div>
              <div style={{ fontSize: 10, color: T.muted, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>{plan.description}</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 28, fontWeight: 600, color: T.ink, letterSpacing: '-0.04em', fontFamily: "'Space Grotesk', sans-serif" }}>{plan.price}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>{plan.period}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ color: T.green, fontSize: 14, lineHeight: '18px', flexShrink: 0 }}>✓</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.ink, lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
              {isCurrent ? (
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.navy, border: `0.5px solid ${T.navy}`, padding: '6px 10px', display: 'inline-block' }}>
                  Piano attuale
                </div>
              ) : (
                <button onClick={() => canUpgrade && handleUpgrade(plan)} disabled={!canUpgrade || loading}
                  style={{ width: '100%', padding: '9px 0', background: canUpgrade ? T.navy : T.paper, color: canUpgrade ? '#EEF1F6' : T.muted, border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: canUpgrade ? 'pointer' : 'not-allowed', opacity: loading ? 0.6 : 1 }}>
                  {plan.id === "studio" ? "Upgrade a Studio" : "Upgrade a Pro"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 6 }}>Hai bisogno di aiuto?</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, lineHeight: 1.7 }}>
          Contatta il supporto per assistenza con il tuo abbonamento o per richieste personalizzate.
        </div>
      </div>
    </div>
  );
}
