import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let done = false;
    const markReady = () => { done = true; setReady(true); };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) markReady();
    });
    // Link PKCE (?code=) oppure sessione già stabilita dal client
    const code = new URLSearchParams(window.location.search).get("code");
    (async () => {
      if (code) await supabase.auth.exchangeCodeForSession(code).catch(() => {});
      const { data } = await supabase.auth.getSession();
      if (data.session) markReady();
      else setTimeout(() => { if (!done) setExpired(true); }, 2500);
    })();
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("La password deve contenere almeno 6 caratteri."); return; }
    setLoading(true);
    const { error: uErr } = await supabase.auth.updateUser({ password });
    if (uErr) { setError(uErr.message); setLoading(false); return; }
    window.location.href = "/dashboard";
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
      <div className="w-full max-w-md rounded-xl bg-[#2c2c2e] p-6 shadow">
        <h1 className="text-2xl font-semibold text-white">Imposta la password</h1>
        {ready ? (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#1c1c1e] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
              placeholder="Nuova password (min. 6 caratteri)"
              autoFocus
              required
            />
            {error && <p className="text-sm text-[#ff453a]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Salvataggio..." : "Salva e accedi"}
            </button>
          </form>
        ) : expired ? (
          <>
            <p className="mt-4 text-sm text-white/60">Link non valido o scaduto. Richiedine uno nuovo dal login.</p>
            <button onClick={() => navigate("/login")} className="mt-5 w-full rounded-lg bg-[#0a84ff] py-2.5 text-sm font-semibold text-white">
              Vai al login
            </button>
          </>
        ) : (
          <p className="mt-4 text-sm text-white/50">Verifica del link in corso...</p>
        )}
      </div>
    </main>
  );
}
