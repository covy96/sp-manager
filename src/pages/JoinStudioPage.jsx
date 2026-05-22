import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function JoinStudioPage({ session }) {
  const navigate = useNavigate();

  if (session) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const [step, setStep]         = useState(1); // 1=codice invito, 2=crea account
  const [inviteCode, setInviteCode] = useState("");
  const [studio, setStudio]     = useState(null);
  const [nome, setNome]         = useState("");
  const [cognome, setCognome]   = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);

  const inputCls = "w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]";
  const btnPrimary = "w-full rounded-lg bg-[#0a84ff] py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 transition";

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError("");

    const { data: st, error: stErr } = await supabase
      .from("studios")
      .select("id, name, piano")
      .eq("invite_code", code)
      .maybeSingle();

    if (stErr || !st) {
      setError("Codice non valido. Controlla il codice ricevuto dal titolare dello studio.");
      setLoading(false);
      return;
    }

    // Controlla limite utenti
    const { count } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("studio", st.id)
      .eq("active", true);

    const limiti = { free: 1, studio: 10, pro: Infinity };
    const max = limiti[st.piano ?? "free"] ?? 1;
    if (count >= max) {
      setError(`Lo studio ha raggiunto il limite di ${max} utenti per il piano ${st.piano}. Contatta l'amministratore.`);
      setLoading(false);
      return;
    }

    setStudio(st);
    setLoading(false);
    setStep(2);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!nome.trim() || !cognome.trim()) { setError("Inserisci nome e cognome."); return; }
    if (password.length < 6) { setError("La password deve contenere almeno 6 caratteri."); return; }

    setLoading(true);

    // Salva il join in sospeso in localStorage
    localStorage.setItem("asm-pending-join", JSON.stringify({
      inviteCode: inviteCode.trim().toUpperCase(),
      studioId: studio.id,
      studioName: studio.name,
      memberName: `${nome.trim()} ${cognome.trim()}`,
    }));

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: `${nome.trim()} ${cognome.trim()}` } },
    });

    if (signUpError) {
      localStorage.removeItem("asm-pending-join");
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
            Clicca il link per attivare il tuo account. Verrai reindirizzato direttamente nello studio.
          </p>
          <div className="mt-8 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Riepilogo</p>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Studio</span>
              <span className="text-white font-medium">{studio?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Nome</span>
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Entra nello studio</h1>
          <p className="mt-2 text-sm text-white/50">
            {step === 1 && "Inserisci il codice invito ricevuto dal titolare dello studio."}
            {step === 2 && `Crea il tuo account per accedere a ${studio?.name}.`}
          </p>
        </div>

        {/* Step bar */}
        <div className="mb-6 flex items-center justify-center gap-3">
          {["Codice invito", "Account"].map((label, i) => {
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
                {i < 1 && (
                  <div className={`ml-1 h-px w-6 transition-all ${s < step ? "bg-[#0a84ff]" : "bg-[#48484a]"}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {step === 1 && "Codice invito"}
              {step === 2 && "Dati account"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setError("");
                if (step > 1) { setStep(1); setStudio(null); }
                else navigate("/");
              }}
              className="text-sm text-white/50 hover:text-white transition"
            >
              ← Indietro
            </button>
          </div>

          {/* ── Step 1: codice invito ── */}
          {step === 1 && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Codice invito *</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Es. ABC123"
                  maxLength={6}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2.5 text-center font-mono text-xl tracking-widest text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-[#ff453a]">{error}</p>}
              <button type="submit" disabled={loading || inviteCode.trim().length < 6} className={btnPrimary}>
                {loading ? "Verifica..." : "Verifica codice →"}
              </button>
              <p className="text-center text-xs text-white/30">
                Vuoi creare un nuovo studio?{" "}
                <button type="button" onClick={() => navigate("/crea-studio")} className="text-[#0a84ff] hover:underline">
                  Crea studio
                </button>
              </p>
            </form>
          )}

          {/* ── Step 2: crea account ── */}
          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-4">
              {studio && (
                <div className="flex items-center gap-2 rounded-lg bg-[#30d158]/10 border border-[#30d158]/30 px-3 py-2">
                  <span className="text-[#30d158] text-sm">✓</span>
                  <span className="text-sm text-white/70">
                    Studio trovato: <span className="font-semibold text-white">{studio.name}</span>
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/80">Nome *</label>
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Mario" className={inputCls} required autoFocus />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/80">Cognome *</label>
                  <input type="text" value={cognome} onChange={e => setCognome(e.target.value)} placeholder="Rossi" className={inputCls} required />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mario@email.it" className={inputCls} required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Password *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Almeno 6 caratteri" className={inputCls} required minLength={6} />
              </div>
              {error && <p className="text-sm text-[#ff453a]">{error}</p>}
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? "Registrazione in corso..." : "Crea account ed entra →"}
              </button>
              <p className="text-center text-xs text-white/30">
                Hai già un account?{" "}
                <button type="button" onClick={() => navigate("/login")} className="text-[#0a84ff] hover:underline">
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
