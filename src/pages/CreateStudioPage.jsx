import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

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

export default function CreateStudioPage({ session }) {
  const navigate = useNavigate();

  // Se già loggato e ha uno studio, vai a dashboard
  if (session) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const [step, setStep]                     = useState(1);
  const [studioName, setStudioName]         = useState("");
  const [tipoFatturazione, setTipoFatturazione] = useState("proforma");
  const [nome, setNome]                     = useState("");
  const [cognome, setCognome]               = useState("");
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [done, setDone]                     = useState(false);

  const inputCls = "w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]";
  const btnPrimary = "w-full rounded-lg bg-[#0a84ff] py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 transition";

  const handleSubmitAccount = async (e) => {
    e.preventDefault();
    setError("");
    if (!nome.trim() || !cognome.trim()) { setError("Inserisci nome e cognome."); return; }
    if (password.length < 6) { setError("La password deve contenere almeno 6 caratteri."); return; }

    setLoading(true);

    // Salva i dati dello studio in localStorage — verranno usati in /auth/callback
    localStorage.setItem("asm-pending-studio", JSON.stringify({
      name: studioName.trim(),
      tipo_fatturazione: tipoFatturazione,
      ownerName: `${nome.trim()} ${cognome.trim()}`,
    }));

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: `${nome.trim()} ${cognome.trim()}` } },
    });

    if (signUpError) {
      localStorage.removeItem("asm-pending-studio");
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setDone(true);
  };

  // ── Schermata post-registrazione ──────────────────────────────────
  if (done) {
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
            Clicca il link nell'email per attivare il tuo account. Verrai rimandato direttamente al tuo studio.
          </p>
          <div className="mt-8 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Riepilogo studio</p>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Studio</span>
              <span className="text-white font-medium">{studioName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Fatturazione</span>
              <span className="text-white font-medium">
                {tipoFatturazione === "proforma" ? "Proforma → Fattura" : "Fattura diretta"}
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
                alert("Email inviata!");
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

  // ── Indicatore step ───────────────────────────────────────────────
  const stepLabels = ["Studio", "Fatturazione", "Account"];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Crea il tuo studio</h1>
          <p className="mt-2 text-sm text-white/50">
            {step === 1 && "Come si chiama il tuo studio di architettura?"}
            {step === 2 && "Come gestisci la fatturazione con i tuoi clienti?"}
            {step === 3 && "Crea il tuo account per accedere allo studio."}
          </p>
        </div>

        {/* Step bar */}
        <div className="mb-6 flex items-center justify-center gap-3">
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
                  <div className={`ml-1 h-px w-6 transition-all ${s < step ? "bg-[#0a84ff]" : "bg-[#48484a]"}`}/>
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
              {step === 3 && "Dati account"}
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
              <p className="text-sm text-white/50">
                Scegli come gestisci la fatturazione. Potrai cambiarlo in seguito.
              </p>
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

          {/* ── Step 3: crea account ── */}
          {step === 3 && (
            <form onSubmit={handleSubmitAccount} className="space-y-4">
              <p className="text-xs text-white/40 bg-[#3a3a3c] rounded-lg px-3 py-2">
                Studio: <span className="text-white font-medium">{studioName}</span>
              </p>
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
                {loading ? "Creazione in corso..." : "Crea Studio e Account →"}
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
