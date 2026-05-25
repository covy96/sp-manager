import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function LoginPage({ session }) {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const confirmed = searchParams.get("confirmed") === "1";

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    setEmailNotConfirmed(false);
    setResendSuccess(false);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("Login error:", signInError);
        if (signInError.message?.toLowerCase().includes("email not confirmed")) {
          setEmailNotConfirmed(true);
        } else if (signInError.message?.toLowerCase().includes("invalid login credentials")) {
          setError("Email o password non corretti.");
        } else {
          setError(signInError.message || "Errore durante il login.");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Errore imprevisto. Riprova.");
    }

    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
      <div className="w-full max-w-md rounded-xl bg-[#2c2c2e] p-6 shadow">
        <h1 className="text-2xl font-semibold text-white">ASM</h1>
        <p className="text-xs text-white/40">Architect Studio Management</p>
        <p className="mt-1 text-sm text-white/60">
          Accedi al gestionale del tuo studio di architettura.
        </p>

        {confirmed && (
          <div className="mt-4 rounded-lg border border-[#30d158]/40 bg-[#30d158]/10 p-3">
            <p className="text-sm font-medium text-[#30d158]">✅ Email confermata!</p>
            <p className="mt-0.5 text-xs text-white/60">
              Il tuo account è attivo. Inserisci la password per accedere.
            </p>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#1c1c1e] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
              placeholder="nome@studio.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#1c1c1e] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
              placeholder="********"
              required
            />
          </div>

          {emailNotConfirmed && (
            <div className="rounded-lg border border-[#ff9f0a]/40 bg-[#ff9f0a]/10 p-3 space-y-2">
              <p className="text-sm text-[#ff9f0a] font-medium">📧 Email non confermata</p>
              <p className="text-xs text-white/60">
                Controlla la tua casella email e clicca il link di conferma che ti abbiamo inviato.
              </p>
              {resendSuccess ? (
                <p className="text-xs text-[#30d158] font-medium">✓ Email inviata! Controlla la tua casella.</p>
              ) : (
                <button
                  type="button"
                  disabled={resendLoading}
                  onClick={async () => {
                    setResendLoading(true);
                    await supabase.auth.resend({ type: "signup", email });
                    setResendLoading(false);
                    setResendSuccess(true);
                  }}
                  className="text-xs text-[#0a84ff] hover:underline disabled:opacity-50"
                >
                  {resendLoading ? "Invio in corso..." : "Rinvia email di conferma"}
                </button>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-[#ff453a]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>

          <p className="text-center text-sm text-white/50">
            Non hai un account?{" "}
            <Link to="/register" className="text-[#0a84ff] hover:underline">
              Registrati
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
