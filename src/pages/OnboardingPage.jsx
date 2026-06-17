import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, seedServiceTaskTemplates } from "../lib/supabase";

function generateInviteCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

const TIPO_FATTURAZIONE = [
  { id: "proforma", emoji: "👤", titolo: "Privati / Persone fisiche", sub: "Proforma → Pagamento → Fattura" },
  { id: "fattura",  emoji: "🏢", titolo: "Società (Srl, Spa, ecc.)",  sub: "Fattura → Pagamento sulla fattura" },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [tab, setTab]                     = useState("crea"); // "crea" | "unisciti"
  const [inviteCode, setInviteCode]       = useState("");
  const [nuovoStudio, setNuovoStudio]     = useState("");
  const [tipoFatt, setTipoFatt]           = useState("proforma");
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  // Al mount: gestisce studio in sospeso (crea-studio) o join in sospeso (unisciti)
  useEffect(() => {
    const checkPending = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // ── Caso 1: studio da creare (da /crea-studio) ──
      // Fallback ai metadati utente se localStorage è assente (browser diverso)
      let pendingStudio = null;
      const rawStudio = localStorage.getItem("asm-pending-studio");
      if (rawStudio) {
        try { pendingStudio = JSON.parse(rawStudio); } catch (e) { /* ignorato */ }
      }
      if (!pendingStudio && user.user_metadata?.pending_studio_name) {
        pendingStudio = {
          name: user.user_metadata.pending_studio_name,
          tipo_fatturazione: user.user_metadata.pending_studio_tipo_fatturazione || "proforma",
          ownerName: user.user_metadata.pending_studio_owner_name || user.user_metadata.full_name || user.email,
        };
      }
      if (pendingStudio) {
        try {
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
            console.error("Errore creazione studio da pending:", studioErr);
            setLoading(false);
            return;
          }

          await supabase.from("team_members").insert({
            user_account: user.id,
            user_email: user.email,
            user_name: pendingStudio.ownerName || user.email,
            studio: studio.id,
            role_internal: "Owner",
            active: true,
          });

          await seedServiceTaskTemplates(studio.id);
          localStorage.setItem("asm-active-studio", studio.id);
          localStorage.removeItem("asm-pending-studio");
          window.location.href = "/dashboard";
          return;
        } catch (e) {
          console.error("Errore creazione studio da pending:", e);
        }
      }

      // ── Caso 2: join in sospeso (da /unisciti) ──
      const rawJoin = localStorage.getItem("asm-pending-join");
      if (rawJoin) {
        try {
          const pendingJoin = JSON.parse(rawJoin);

          const { data: existing } = await supabase
            .from("team_members").select("*").eq("user_account", user.id).maybeSingle();

          if (existing) {
            await supabase.from("team_members")
              .update({ studio: pendingJoin.studioId }).eq("id", existing.id);
          } else {
            await supabase.from("team_members").insert({
              user_account: user.id,
              user_email: user.email,
              user_name: pendingJoin.memberName || user.email,
              studio: pendingJoin.studioId,
              role_internal: "Collaboratore Interno",
              active: true,
            });
          }

          await seedServiceTaskTemplates(pendingJoin.studioId);
          localStorage.setItem("asm-active-studio", pendingJoin.studioId);
          localStorage.removeItem("asm-pending-join");
          window.location.href = "/dashboard";
          return;
        } catch (e) {
          console.error("Errore parsing pending join:", e);
        }
      }

      setLoading(false);
    };

    checkPending();
  }, []);

  const handleCreaStudio = async (e) => {
    e.preventDefault();
    const nome = nuovoStudio.trim();
    if (!nome) return;
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Utente non autenticato."); setLoading(false); return; }

    const code = generateInviteCode();
    const { data: studio, error: studioErr } = await supabase
      .from("studios")
      .insert({ name: nome, owner_id: user.id, invite_code: code, piano: "free", tipo_fatturazione: tipoFatt })
      .select("*").single();

    if (studioErr || !studio) {
      setError("Errore creazione studio: " + (studioErr?.message || "riprova"));
      setLoading(false);
      return;
    }

    const ownerName = user.user_metadata?.full_name || user.email;
    await supabase.from("team_members").insert({
      user_account: user.id,
      user_email: user.email,
      user_name: ownerName,
      studio: studio.id,
      role_internal: "Owner",
      active: true,
    });

    await seedServiceTaskTemplates(studio.id);
    localStorage.setItem("asm-active-studio", studio.id);
    localStorage.removeItem("asm-pending-studio");
    window.location.href = "/dashboard";
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Utente non autenticato."); setLoading(false); return; }

    const { data: studio, error: studioError } = await supabase
      .from("studios").select("*").eq("invite_code", code).single();
    if (studioError || !studio) { setError("Codice non valido o studio non trovato."); setLoading(false); return; }

    // Controlla limite utenti del piano
    const { count } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("studio", studio.id)
      .eq("active", true);

    const limiti = { free: 1, studio: 10, pro: Infinity };
    const maxUtenti = limiti[studio.piano ?? "free"] ?? 1;

    if (count >= maxUtenti) {
      setError(`Lo studio ha raggiunto il limite di ${maxUtenti} utenti per il piano ${studio.piano}. Contatta l'amministratore per fare l'upgrade.`);
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("team_members").select("*").eq("user_account", user.id).maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from("team_members").update({ studio: studio.id }).eq("id", existing.id);
      if (updateErr) { setError("Errore aggiornamento: " + updateErr.message); setLoading(false); return; }
    } else {
      const { error: insertErr } = await supabase.from("team_members").insert({
        user_account: user.id,
        user_email: user.email,
        user_name: user.user_metadata?.full_name || user.email,
        studio: studio.id,
        role_internal: "Collaboratore Interno",
        active: true,
      });
      if (insertErr) { setError("Errore accesso: " + insertErr.message); setLoading(false); return; }
    }

    await seedServiceTaskTemplates(studio.id);
    localStorage.setItem("asm-active-studio", studio.id);
    window.location.href = "/dashboard";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1c1c1e]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
          <p className="text-sm text-white/40">Configurazione studio in corso...</p>
        </div>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#0a84ff]";
  const btnPrimary = "w-full rounded-lg bg-[#0a84ff] py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 transition";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white">Configura il tuo accesso</h1>
          <p className="mt-2 text-sm text-white/50">Crea un nuovo studio o unisciti a uno esistente.</p>
        </div>

        {/* Tab switcher */}
        <div className="mb-4 flex rounded-xl border border-[#48484a] bg-[#2c2c2e] p-1">
          <button
            onClick={() => { setTab("crea"); setError(""); }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${tab === "crea" ? "bg-[#0a84ff] text-white" : "text-white/50 hover:text-white"}`}
          >
            Crea studio
          </button>
          <button
            onClick={() => { setTab("unisciti"); setError(""); }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${tab === "unisciti" ? "bg-[#0a84ff] text-white" : "text-white/50 hover:text-white"}`}
          >
            Unisciti con codice
          </button>
        </div>

        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
          {tab === "crea" ? (
            <form onSubmit={handleCreaStudio} className="space-y-4">
              <p className="text-xs text-white/40">Crea un nuovo studio e diventa il titolare.</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Nome dello studio *</label>
                <input
                  type="text"
                  value={nuovoStudio}
                  onChange={e => setNuovoStudio(e.target.value)}
                  placeholder="Es. Studio Rossi Architetti"
                  className={inputCls}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Tipo di fatturazione</label>
                <div className="space-y-2 mt-1">
                  {TIPO_FATTURAZIONE.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipoFatt(t.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                        tipoFatt === t.id
                          ? "border-[#0a84ff] bg-[#0a84ff]/15"
                          : "border-[#48484a] bg-[#3a3a3c] hover:border-[#0a84ff]/50"
                      }`}
                    >
                      <span>{t.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white">{t.titolo}</div>
                        <div className="text-[11px] text-white/40">{t.sub}</div>
                      </div>
                      {tipoFatt === t.id && <span className="text-[#0a84ff] text-xs font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-[#ff453a]">{error}</p>}
              <button type="submit" disabled={loading || !nuovoStudio.trim()} className={btnPrimary}>
                {loading ? "Creazione in corso..." : "Crea Studio →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <p className="text-xs text-white/40">Inserisci il codice invito ricevuto dal titolare del tuo studio.</p>
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
              <button
                type="submit"
                disabled={loading || inviteCode.trim().length < 6}
                className={btnPrimary}
              >
                {loading ? "Verifica in corso..." : "Accedi allo Studio"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-white/30">
          <button onClick={() => supabase.auth.signOut().then(() => navigate("/login"))} className="hover:text-white/60 transition">
            Esci dall'account
          </button>
        </p>
      </div>
    </div>
  );
}
