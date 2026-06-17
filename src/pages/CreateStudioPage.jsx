import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase, seedServiceTaskTemplates } from "../lib/supabase";
import { useToast } from "../contexts/ToastContext";

function generateInviteCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

const TIPO_FATTURAZIONE = [
  {
    id: "proforma",
    emoji: "👤",
    titolo: "Privati / Persone fisiche / Studio associato",
    descrizione: "Proforma → Pagamento → Fattura",
    sub: "Il cliente paga la proforma, poi emetti la fattura fiscale.",
  },
  {
    id: "fattura",
    emoji: "🏢",
    titolo: "Società (Srl, Spa, ecc.)",
    descrizione: "Fattura → Pagamento sulla fattura",
    sub: "Emetti direttamente fattura fiscale con termini di pagamento (es. 60 giorni).",
  },
];

const PIANI = [
  {
    id: "free",
    nome: "Free",
    prezzo: "€0",
    periodo: "/mese",
    desc: "Per iniziare",
    trial: false,
    features: ["1 utente", "5 progetti", "5 commesse", "Task e timesheet", "Calendario"],
  },
  {
    id: "studio",
    nome: "Studio",
    prezzo: "€19,99",
    periodo: "/mese",
    desc: "Per studi in crescita",
    trial: true,
    features: ["Fino a 5 utenti", "15 progetti", "15 commesse", "Analisi Hub", "Proforma, fatture e CAPEX"],
  },
  {
    id: "pro",
    nome: "Pro",
    prezzo: "€29,99",
    periodo: "/mese",
    desc: "Per studi professionali",
    trial: true,
    highlight: true,
    features: ["Tutto di Studio", "Utenti illimitati", "Progetti/commesse illimitati", "Gantt", "Report di cantiere"],
  },
];

async function avviaStripe(studioId, memberId, planId) {
  const priceEnvMap = {
    studio: import.meta.env.VITE_STRIPE_STUDIO_PRICE_ID,
    pro: import.meta.env.VITE_STRIPE_PRO_PRICE_ID,
  };
  const priceId = priceEnvMap[planId];
  if (!priceId) return null;

  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: {
      priceId,
      studioId,
      userId: memberId,
      successUrl: window.location.origin + "/impostazioni/piano?success=true",
      cancelUrl: window.location.origin + "/dashboard",
    },
  });
  if (error || !data?.url) return null;
  return data.url;
}

export default function CreateStudioPage({ session }) {
  const navigate = useNavigate();
  const showToast = useToast();
  const [step, setStep]                         = useState(1);
  const [studioName, setStudioName]             = useState("");
  const [tipoFatturazione, setTipoFatturazione] = useState("proforma");
  const [selectedPlan, setSelectedPlan]         = useState("free");
  const [nome, setNome]                         = useState("");
  const [cognome, setCognome]                   = useState("");
  const [email, setEmail]                       = useState("");
  const [password, setPassword]                 = useState("");
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState("");
  const [done, setDone]                         = useState(false);

  if (session) return <Navigate to="/dashboard" replace />;

  const inputCls = "w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]";
  const btnPrimary = "w-full rounded-lg bg-[#0a84ff] py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 transition";

  const handleSubmitAccount = async (e) => {
    e.preventDefault();
    setError("");
    if (!nome.trim() || !cognome.trim()) { setError("Inserisci nome e cognome."); return; }
    if (password.length < 6) { setError("La password deve contenere almeno 6 caratteri."); return; }

    setLoading(true);

    const pendingStudio = {
      name: studioName.trim(),
      tipo_fatturazione: tipoFatturazione,
      ownerName: `${nome.trim()} ${cognome.trim()}`,
      piano: selectedPlan,
    };

    localStorage.setItem("asm-pending-studio", JSON.stringify(pendingStudio));

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: `${nome.trim()} ${cognome.trim()}`,
          pending_studio_name: pendingStudio.name,
          pending_studio_tipo_fatturazione: pendingStudio.tipo_fatturazione,
          pending_studio_owner_name: pendingStudio.ownerName,
          pending_studio_piano: pendingStudio.piano,
        },
      },
    });

    if (signUpError) {
      const msg = signUpError.message?.toLowerCase() ?? "";
      const alreadyExists = msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already");
      if (alreadyExists) {
        setLoading(false);
        navigate(`/login?pending_studio=1&email=${encodeURIComponent(email.trim())}`);
        return;
      }
      localStorage.removeItem("asm-pending-studio");
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Sessione immediata (email confirmation disabilitata) → crea studio ora
    if (data?.session?.user) {
      const user = data.session.user;
      const code = generateInviteCode();

      const { data: studio, error: studioErr } = await supabase
        .from("studios")
        .insert({
          name: pendingStudio.name,
          owner_id: user.id,
          invite_code: code,
          piano: "free",
          tipo_fatturazione: pendingStudio.tipo_fatturazione,
        })
        .select("*")
        .single();

      if (studioErr || !studio) {
        setError("Errore nella creazione dello studio: " + (studioErr?.message || ""));
        setLoading(false);
        return;
      }

      const { data: member, error: memberErr } = await supabase.from("team_members").insert({
        user_account: user.id,
        user_email: user.email,
        user_name: pendingStudio.ownerName,
        studio: studio.id,
        role_internal: "Owner",
        active: true,
      }).select("id").single();

      if (memberErr) {
        setError("Errore registrazione membro: " + memberErr.message);
        setLoading(false);
        return;
      }

      await seedServiceTaskTemplates(studio.id);
      localStorage.setItem("asm-active-studio", studio.id);
      localStorage.removeItem("asm-pending-studio");

      if (selectedPlan !== "free") {
        const stripeUrl = await avviaStripe(studio.id, member.id, selectedPlan);
        if (stripeUrl) { window.location.href = stripeUrl; return; }
        showToast("Studio creato. Potrai attivare il piano da Impostazioni → Piano.", "info");
      }

      window.location.href = "/dashboard";
      return;
    }

    // Email confirmation abilitata → mostra schermata "controlla email"
    setLoading(false);
    setDone(true);
  };

  // ── Schermata post-registrazione ──────────────────────────────────
  if (done) {
    const pianoScelto = PIANI.find(p => p.id === selectedPlan);
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-5 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0a84ff]/10 text-4xl">
              📧
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Controlla la tua email</h2>
          <p className="mt-3 text-sm text-white/60">
            Abbiamo inviato un link di conferma a{" "}
            <span className="font-semibold text-white">{email}</span>.
          </p>
          <p className="mt-2 text-xs text-white/35">
            Clicca il link nell'email per attivare il tuo account.
            {selectedPlan !== "free" && " Dopo la conferma verrai portato su Stripe per impostare il pagamento (primo mese gratis)."}
          </p>
          <div className="mt-8 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Riepilogo</p>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Studio</span>
              <span className="text-white font-medium">{studioName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Piano</span>
              <span className="text-white font-medium">
                {pianoScelto?.nome}{pianoScelto?.trial && " · 1° mese gratis"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Titolare</span>
              <span className="text-white font-medium">{nome} {cognome}</span>
            </div>
          </div>
          <p className="mt-6 text-xs text-white/30">
            Non hai ricevuto l'email?{" "}
            <button
              className="text-[#0a84ff] hover:underline"
              onClick={async () => {
                await supabase.auth.resend({ type: "signup", email });
                showToast("Email inviata!", "success");
              }}
            >
              Rinvia
            </button>
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 text-sm text-white/40 hover:text-white/70 transition"
          >
            Torna al login
          </button>
        </div>
      </div>
    );
  }

  const stepLabels = ["Studio", "Fatturazione", "Piano", "Account"];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white">Crea il tuo studio</h1>
          <p className="mt-2 text-sm text-white/50">
            {step === 1 && "Come si chiama il tuo studio di architettura?"}
            {step === 2 && "Come gestisci la fatturazione con i tuoi clienti?"}
            {step === 3 && "Scegli il piano più adatto al tuo studio."}
            {step === 4 && "Crea il tuo account per accedere allo studio."}
          </p>
        </div>

        {/* Step bar */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {stepLabels.map((label, i) => {
            const s = i + 1;
            return (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  s < step ? "bg-[#0a84ff] text-white" :
                  s === step ? "bg-[#0a84ff] text-white ring-2 ring-[#0a84ff]/30" :
                  "bg-[#3a3a3c] text-white/30"
                }`}>
                  {s < step ? "✓" : s}
                </div>
                <span className={`text-xs transition-all ${s === step ? "text-white font-medium" : "text-white/30"}`}>
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <div className={`ml-1 h-px w-5 transition-all ${s < step ? "bg-[#0a84ff]" : "bg-[#48484a]"}`}/>
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {step === 1 && "Nome dello studio"}
              {step === 2 && "Tipo di fatturazione"}
              {step === 3 && "Scegli il piano"}
              {step === 4 && "Dati account"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setError("");
                if (step > 1) setStep(step - 1);
                else navigate("/");
              }}
              className="text-sm text-white/50 hover:text-white transition"
            >
              ← Indietro
            </button>
          </div>

          {/* ── Step 1: nome studio ── */}
          {step === 1 && (
            <form
              onSubmit={(e) => { e.preventDefault(); if (studioName.trim()) setStep(2); }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Nome dello studio *</label>
                <input
                  type="text"
                  value={studioName}
                  onChange={e => setStudioName(e.target.value)}
                  placeholder="Es. Studio Rossi Architetti"
                  className={inputCls}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" disabled={!studioName.trim()} className={btnPrimary}>
                Continua →
              </button>
            </form>
          )}

          {/* ── Step 2: tipo fatturazione ── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-white/50">Scegli come gestisci la fatturazione. Potrai cambiarlo in seguito.</p>
              <div className="space-y-3">
                {TIPO_FATTURAZIONE.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipoFatturazione(t.id)}
                    className={`flex w-full flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition ${
                      tipoFatturazione === t.id
                        ? "border-[#0a84ff] bg-[#0a84ff]/15"
                        : "border-[#48484a] bg-[#3a3a3c] hover:border-[#0a84ff]/50"
                    }`}
                  >
                    <div className="flex w-full items-center gap-2">
                      <span className="text-lg">{t.emoji}</span>
                      <span className="text-sm font-semibold text-white">{t.titolo}</span>
                      {tipoFatturazione === t.id && (
                        <span className="ml-auto text-[#0a84ff] text-xs font-bold">✓</span>
                      )}
                    </div>
                    <div className="ml-7">
                      <div className="text-xs font-mono text-[#0a84ff] mb-0.5">{t.descrizione}</div>
                      <div className="text-xs text-white/40">{t.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setStep(3)} className={btnPrimary}>
                Continua →
              </button>
            </div>
          )}

          {/* ── Step 3: scegli piano ── */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-white/50">Puoi cambiare piano in qualsiasi momento.</p>
              {PIANI.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlan(p.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition relative ${
                    selectedPlan === p.id
                      ? "border-[#0a84ff] bg-[#0a84ff]/15"
                      : "border-[#48484a] bg-[#3a3a3c] hover:border-[#0a84ff]/50"
                  }`}
                >
                  {p.highlight && (
                    <span className="absolute -top-2 right-3 rounded-full bg-[#0a84ff] px-2 py-0.5 text-[10px] font-bold text-white">
                      Consigliato
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{p.nome}</span>
                      <span className="text-base font-bold text-white">{p.prezzo}</span>
                      <span className="text-xs text-white/40">{p.periodo}</span>
                      {p.trial && (
                        <span className="rounded bg-[#30d158]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#30d158]">
                          1° mese gratis
                        </span>
                      )}
                    </div>
                    <ul className="mt-1.5 space-y-0.5">
                      {p.features.map(f => (
                        <li key={f} className="text-xs text-white/50">· {f}</li>
                      ))}
                    </ul>
                  </div>
                  {selectedPlan === p.id && (
                    <span className="text-[#0a84ff] font-bold text-sm mt-0.5">✓</span>
                  )}
                </button>
              ))}
              <button type="button" onClick={() => setStep(4)} className={`${btnPrimary} mt-2`}>
                Continua →
              </button>
            </div>
          )}

          {/* ── Step 4: crea account ── */}
          {step === 4 && (
            <form onSubmit={handleSubmitAccount} className="space-y-4">
              <div className="flex gap-2 text-xs bg-[#3a3a3c] rounded-lg px-3 py-2">
                <span className="text-white/40">Studio:</span>
                <span className="text-white font-medium">{studioName}</span>
                <span className="text-white/20 mx-1">·</span>
                <span className="text-white/40">Piano:</span>
                <span className="text-white font-medium">{PIANI.find(p => p.id === selectedPlan)?.nome}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/80">Nome *</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Mario"
                    className={inputCls}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/80">Cognome *</label>
                  <input
                    type="text"
                    value={cognome}
                    onChange={e => setCognome(e.target.value)}
                    placeholder="Rossi"
                    className={inputCls}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="mario@studiorossi.it"
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Password *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Almeno 6 caratteri"
                  className={inputCls}
                  required
                  minLength={6}
                />
              </div>
              {error && <p className="text-sm text-[#ff453a]">{error}</p>}
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading
                  ? "Creazione in corso..."
                  : selectedPlan === "free"
                    ? "Crea Studio e Account →"
                    : "Crea Studio e vai su Stripe →"}
              </button>
              <p className="text-center text-xs text-white/30">
                Hai già un account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-[#0a84ff] hover:underline"
                >
                  Accedi
                </button>
              </p>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
