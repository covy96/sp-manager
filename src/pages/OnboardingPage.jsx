import { useState } from "react";
import { supabase } from "../lib/supabase";

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

export default function OnboardingPage() {
  const [mode, setMode]               = useState(null); // "create" | "join"
  const [step, setStep]               = useState(1);    // 1=nome, 2=tipo fatturazione
  const [studioName, setStudioName]   = useState("");
  const [tipoFatturazione, setTipoFatturazione] = useState("proforma");
  const [inviteCode, setInviteCode]   = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [confirmCreate, setConfirmCreate] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!studioName.trim()) return;

    // Step 1 → Step 2
    if (step === 1) { setStep(2); return; }

    // Step 2 → salva
    setLoading(true); setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Utente non autenticato."); setLoading(false); return; }

    const { data: existing } = await supabase.from("team_members").select("*").eq("user_account", user.id).maybeSingle();

    if (existing?.studio && !confirmCreate) { setConfirmCreate(true); setLoading(false); return; }

    const code = generateInviteCode();
    const { data: studio, error: studioError } = await supabase.from("studios").insert({
      name: studioName.trim(),
      owner_id: user.id,
      invite_code: code,
      piano: "free",
      tipo_fatturazione: tipoFatturazione,
    }).select("*").single();

    if (studioError || !studio) { setError(studioError?.message || "Errore creazione studio."); setLoading(false); return; }

    if (existing) {
      await supabase.from("team_members").update({ studio: studio.id, role_internal: "Owner" }).eq("id", existing.id);
    } else {
      await supabase.from("team_members").insert({
        user_account: user.id, user_email: user.email, user_name: user.email,
        studio: studio.id, role_internal: "Owner", active: true,
      });
    }

    localStorage.setItem("asm-active-studio", studio.id);
    window.location.href = "/dashboard";
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true); setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Utente non autenticato."); setLoading(false); return; }

    const { data: studio, error: studioError } = await supabase.from("studios").select("*").eq("invite_code", code).single();
    if (studioError || !studio) { setError("Codice non valido"); setLoading(false); return; }

    const { data: existing } = await supabase.from("team_members").select("*").eq("user_account", user.id).maybeSingle();

    if (existing) {
      await supabase.from("team_members").update({ studio: studio.id }).eq("id", existing.id);
    } else {
      await supabase.from("team_members").insert({
        user_account: user.id, user_email: user.email, user_name: user.email,
        studio: studio.id, role_internal: "Collaboratore Interno", active: true,
      });
    }

    localStorage.setItem("asm-active-studio", studio.id);
    window.location.href = "/dashboard";
  };

  const inputCls = "w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]";
  const btnCls   = "w-full rounded-lg bg-[#0a84ff] py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Benvenuto in ASM</h1>
          <p className="mt-2 text-sm text-white/50">Per iniziare, crea il tuo studio oppure unisciti a uno esistente.</p>
        </div>

        {/* Selezione modalità */}
        {!mode && (
          <div className="space-y-3">
            <button type="button" onClick={()=>setMode("create")} className="flex w-full flex-col items-start gap-1 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5 text-left transition hover:border-[#0a84ff] hover:bg-[#0a84ff]/10">
              <span className="text-lg font-semibold text-white">🏛️ Crea il tuo studio</span>
              <span className="text-sm text-white/50">Sei il titolare? Crea un nuovo spazio studio e invita i colleghi.</span>
            </button>
            <button type="button" onClick={()=>setMode("join")} className="flex w-full flex-col items-start gap-1 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5 text-left transition hover:border-[#0a84ff] hover:bg-[#0a84ff]/10">
              <span className="text-lg font-semibold text-white">🔗 Unisciti a uno studio</span>
              <span className="text-sm text-white/50">Hai un codice invito? Inseriscilo per accedere allo studio del tuo team.</span>
            </button>
          </div>
        )}

        {/* Crea studio */}
        {mode === "create" && (
          <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {step===1 ? "Crea il tuo studio" : "Tipo di fatturazione"}
              </h2>
              <button type="button" onClick={()=>{ if(step===2){setStep(1);}else{setMode(null);setError("");} }} className="text-sm text-white/50 hover:text-white">
                ← Indietro
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {step === 1 ? (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-white/80">Nome dello studio *</label>
                    <input type="text" value={studioName} onChange={e=>setStudioName(e.target.value)}
                      placeholder="Es. Studio Rossi Architetti" className={inputCls} required autoFocus/>
                  </div>
                  {error && <p className="text-sm text-[#ff453a]">{error}</p>}
                  <button type="submit" disabled={!studioName.trim()} className={btnCls}>
                    Continua →
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-white/50 mb-4">
                    Scegli come gestisci la fatturazione con i tuoi clienti. Potrai cambiarlo in seguito.
                  </p>

                  <div className="space-y-3">
                    {TIPO_FATTURAZIONE.map(t=>(
                      <button key={t.id} type="button" onClick={()=>setTipoFatturazione(t.id)}
                        className={`flex w-full flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition ${tipoFatturazione===t.id ? 'border-[#0a84ff] bg-[#0a84ff]/15' : 'border-[#48484a] bg-[#3a3a3c] hover:border-[#0a84ff]/50'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{t.emoji}</span>
                          <span className="text-sm font-semibold text-white">{t.titolo}</span>
                          {tipoFatturazione===t.id && <span className="ml-auto text-[#0a84ff] text-xs font-bold">✓</span>}
                        </div>
                        <div className="ml-7">
                          <div className="text-xs font-mono text-[#0a84ff] mb-1">{t.descrizione}</div>
                          <div className="text-xs text-white/40">{t.sub}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {confirmCreate && (
                    <div className="rounded-lg border border-[#ff9f0a]/40 bg-[#ff9f0a]/10 p-3">
                      <p className="text-sm text-[#ff9f0a]">Sei già associato a uno studio. Creando un nuovo studio passerai a quello nuovo.</p>
                      <div className="mt-2 flex gap-2">
                        <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-[#ff9f0a] py-1.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
                          {loading ? "Creazione..." : "Conferma e continua"}
                        </button>
                        <button type="button" onClick={()=>setConfirmCreate(false)} className="rounded-lg border border-[#48484a] px-3 py-1.5 text-sm text-white/70 hover:bg-white/10">Annulla</button>
                      </div>
                    </div>
                  )}

                  {error && <p className="text-sm text-[#ff453a]">{error}</p>}

                  {!confirmCreate && (
                    <button type="submit" disabled={loading} className={btnCls}>
                      {loading ? "Creazione in corso..." : "Crea Studio"}
                    </button>
                  )}
                </>
              )}
            </form>
          </div>
        )}

        {/* Unisciti */}
        {mode === "join" && (
          <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Unisciti a uno studio</h2>
              <button type="button" onClick={()=>{ setMode(null); setError(""); }} className="text-sm text-white/50 hover:text-white">← Indietro</button>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Codice invito *</label>
                <input type="text" value={inviteCode} onChange={e=>setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Es. ABC123" maxLength={6}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2.5 text-center font-mono text-lg tracking-widest text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]"
                  required autoFocus/>
              </div>
              {error && <p className="text-sm text-[#ff453a]">{error}</p>}
              <button type="submit" disabled={loading||inviteCode.trim().length<6} className={btnCls}>
                {loading ? "Verifica in corso..." : "Accedi allo Studio"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
