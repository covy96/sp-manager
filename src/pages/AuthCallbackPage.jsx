import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      // PKCE flow: il codice arriva come query param ?code=...
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError("Link non valido o scaduto. Richiedi una nuova email di conferma.");
          return;
        }
        navigate("/dashboard", { replace: true });
        return;
      }

      // Implicit flow: il token arriva nel hash #access_token=...
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        // Supabase JS v2 legge automaticamente il hash alla getSession
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session) {
          setError("Link non valido o scaduto. Richiedi una nuova email di conferma.");
          return;
        }
        navigate("/dashboard", { replace: true });
        return;
      }

      // Nessun parametro valido
      setError("Link non valido. Torna al login e riprova.");
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
        <div className="w-full max-w-md rounded-xl bg-[#2c2c2e] p-6 text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <h2 className="text-lg font-semibold text-white">Conferma non riuscita</h2>
          <p className="mt-2 text-sm text-white/60">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-5 w-full rounded-lg bg-[#0a84ff] py-2.5 text-sm font-semibold text-white hover:brightness-110"
          >
            Torna al login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
        <p className="text-sm text-white/50">Conferma in corso...</p>
      </div>
    </main>
  );
}
