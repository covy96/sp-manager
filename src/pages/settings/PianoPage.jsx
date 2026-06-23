import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { usePlan, PLANS } from "../../hooks/usePlan";
import { usePermissions } from "../../hooks/usePermissions";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";

export default function PianoPage() {
  const { T } = useTheme();
  const showToast = useToast();
  usePageTitleOnMount("Piano");
  const navigate = useNavigate();
  const { teamMember, studioId } = useStudio();
  const permissions = usePermissions();

  // Solo Owner e Partner possono vedere questa pagina
  const role = teamMember?.role_internal;
  useEffect(() => {
    if (role && role !== "Owner" && role !== "Partner") {
      navigate("/dashboard", { replace: true });
    }
  }, [role]);
  const { pianoId, plan: currentPlanData } = usePlan();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading]           = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [stripeCustomerId, setStripeCustomerId] = useState(null);

  // Carica stripe_customer_id per sapere se esiste un abbonamento Stripe attivo
  useEffect(() => {
    if (!studioId) return;
    supabase.from("studios").select("stripe_customer_id").eq("id", studioId).single()
      .then(({ data }) => setStripeCustomerId(data?.stripe_customer_id ?? null));
  }, [studioId]);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessMessage("Abbonamento attivato con successo! Grazie.");
      const p = new URLSearchParams(searchParams); p.delete("success");
      setSearchParams(p, { replace:true });
    }
  }, [searchParams]);

  const handleUpgrade = async (planId) => {
    if (!teamMember?.id || !studioId) { showToast("Errore: utente o studio non trovato"); return; }

    const priceEnvMap = { studio:"VITE_STRIPE_STUDIO_PRICE_ID", pro:"VITE_STRIPE_PRO_PRICE_ID" };
    const priceId = import.meta.env[priceEnvMap[planId]];

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId,
          studioId,
          userId: teamMember.id,
          successUrl: window.location.origin + "/impostazioni/piano?success=true",
          cancelUrl:  window.location.origin + "/impostazioni/piano",
        },
      });
      if (error) throw new Error(error.message);
      if (data?.url) window.location.href = data.url;
      else throw new Error("Nessun URL di checkout ricevuto");
    } catch(e) { showToast("Errore durante l'upgrade: "+e.message); setLoading(false); }
  };

  const handleManageSubscription = async () => {
    if (!teamMember?.id || !studioId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { studioId, returnUrl: window.location.origin + "/impostazioni/piano" },
      });
      if (error) throw new Error(error.message);
      if (data?.url) window.location.href = data.url;
    } catch(e) { showToast("Errore: "+e.message); setLoading(false); }
  };

  const planOrder = ["free","studio","pro"];

  return (
    <div style={{ maxWidth:820 }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em', marginBottom:4 }}>Piano</div>
        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted }}>
          Piano attuale: <strong style={{ color:T.navy }}>{currentPlanData.name}</strong>
        </div>
      </div>

      {successMessage && (
        <div style={{ background:T.greenLight, border:`0.5px solid ${T.green}`, borderRadius: T.radiusSm, padding:'12px 16px', marginBottom:16, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.green }}>
          ✓ {successMessage}
        </div>
      )}

      {/* Cards piani */}
      <div style={{ display:'grid', gridTemplateColumns:window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)', gap:10, marginBottom:14 }}>
        {planOrder.map(pid => {
          const p = PLANS[pid];
          const isCurrent = pianoId === pid;
          const isUpgrade = planOrder.indexOf(pid) > planOrder.indexOf(pianoId);
          const isDowngrade = planOrder.indexOf(pid) < planOrder.indexOf(pianoId);

          return (
            <div key={pid} style={{ background:T.surface, border:`0.5px solid ${isCurrent?T.navy:T.border}`, borderRadius: T.radiusSm, padding:'22px 20px', position:'relative', display:'flex', flexDirection:'column' }}>
              {isCurrent && (
                <div style={{ position:'absolute', top:12, right:12, fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.15em', textTransform:'uppercase', color:T.navy, border:`0.5px solid ${T.navy}`, borderRadius: T.radiusSm, padding:'2px 6px' }}>
                  Attuale
                </div>
              )}

              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.25em', textTransform:'uppercase', color:isCurrent?T.navy:T.muted, marginBottom:8 }}>
                {p.name}
              </div>
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginBottom:16 }}>
                {p.description}
              </div>

              {/* Prezzo */}
              <div style={{ marginBottom:20 }}>
                <span style={{ fontSize:28, fontWeight:600, color:T.ink, letterSpacing:'-0.04em', fontFamily:"'Space Grotesk', sans-serif" }}>{p.price}</span>
                <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted }}>{p.period}</span>
              </div>

              {/* Limiti chiave */}
              <div style={{ marginBottom:16, padding:'12px 14px', background:T.bg, border:`1px solid ${T.border}` }}>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    { label:'Utenti', value: p.maxUsers === Infinity ? 'Illimitati' : `${p.maxUsers}` },
                    { label:'Progetti', value: p.maxProjects === Infinity ? 'Illimitati' : `${p.maxProjects}` },
                    { label:'Commesse', value: p.maxCommesse === Infinity ? 'Illimitate' : `${p.maxCommesse}` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, letterSpacing:'0.1em' }}>{label}</span>
                      <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, fontWeight:600, color:T.ink }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature list */}
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20, flex:1 }}>
                {p.features.map((f,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <span style={{ color:T.green, fontSize:12, flexShrink:0, marginTop:1 }}>✓</span>
                    <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.ink, lineHeight:1.5 }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {isCurrent ? (
                pid !== "free" && stripeCustomerId ? (
                  <button onClick={handleManageSubscription} disabled={loading} style={{ width:'100%', padding:'9px 0', background:'transparent', border:`0.5px solid ${T.navy}`, color:T.navy, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer', opacity:loading?0.6:1 }}>
                    {loading ? "Caricamento..." : "Gestisci abbonamento"}
                  </button>
                ) : (
                  <div style={{ width:'100%', padding:'9px 0', background:T.bg, border:`1px solid ${T.border}`, color:T.muted, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', textAlign:'center' }}>
                    Piano attuale
                  </div>
                )
              ) : stripeCustomerId ? (
                // Esiste già un abbonamento Stripe attivo: upgrade, downgrade tra piani
                // pagati e cancellazione (downgrade a free) passano tutti dal Billing
                // Portal, che mostra la differenza di prezzo/proration in autonomia.
                <button onClick={handleManageSubscription} disabled={loading} style={{ width:'100%', padding:'9px 0', background:isUpgrade?T.navy:'transparent', border:isUpgrade?'none':`0.5px solid ${T.navy}`, color:isUpgrade?T.bg:T.navy, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:loading?'not-allowed':'pointer', opacity:loading?0.6:1 }}>
                  {loading ? "Caricamento..." : pid === "free" ? "Annulla abbonamento" : `Passa a ${p.name}`}
                </button>
              ) : isUpgrade ? (
                <button onClick={() => handleUpgrade(pid)} disabled={loading} style={{ width:'100%', padding:'9px 0', background:T.navy, border:'none', color:T.bg, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', cursor:loading?'not-allowed':'pointer', opacity:loading?0.6:1 }}>
                  {loading ? "Caricamento..." : `Passa a ${p.name}`}
                </button>
              ) : (
                <div style={{ width:'100%', padding:'9px 0', background:T.bg, border:`1px solid ${T.border}`, color:T.muted, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', textAlign:'center' }}>
                  Piano inferiore
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info box */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius: T.radiusSm, padding:'16px 20px' }}>
        <div style={{ fontSize:13, fontWeight:600, color:T.ink, marginBottom:6 }}>Hai bisogno di aiuto?</div>
        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, lineHeight:1.7 }}>
          Contattaci per assistenza con il tuo abbonamento, richieste personalizzate o codici sconto.
        </div>
      </div>
    </div>
  );
}
