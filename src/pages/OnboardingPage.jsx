import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, seedServiceTaskTemplates } from "../lib/supabase";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

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
