import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, seedServiceTaskTemplates } from "../lib/supabase";

function generateInviteCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading]       = useState(true);  // parte true: controlla pending studio
  const [error, setError]           = useState("");

  // Al mount: gestisce studio in sospeso (crea-studio) o join in sospeso (unisciti)
  useEffect(() => {
    const checkPending = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // ── Caso 1: studio da creare (da /crea-studio) ──
      const rawStudio = localStorage.getItem("asm-pending-studio");
      if (rawStudio) {
        try {
          const pendingStudio = JSON.parse(rawStudio);
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
          console.error("Errore parsing pending studio:", e);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Unisciti allo studio</h1>
          <p className="mt-2 text-sm text-white/50">
            Inserisci il codice invito ricevuto dal titolare del tuo studio.
          </p>
        </div>

        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
          <form onSubmit={handleJoin} className="space-y-4">
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
              className="w-full rounded-lg bg-[#0a84ff] py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 transition"
            >
              {loading ? "Verifica in corso..." : "Accedi allo Studio"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-white/40">
          Vuoi creare un nuovo studio?{" "}
          <button
            onClick={() => navigate("/crea-studio")}
            className="text-[#0a84ff] hover:underline"
          >
            Crea studio
          </button>
        </p>
      </div>
    </div>
  );
}
