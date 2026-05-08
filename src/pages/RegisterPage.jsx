import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function RegisterPage({ session }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [conferma, setConferma] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!nome.trim()) {
      setError("Inserisci il tuo nome.");
      return;
    }
    if (password.length < 6) {
      setError("La password deve contenere almeno 6 caratteri.");
      return;
    }
    if (password !== conferma) {
      setError("Le password non coincidono.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: nome.trim() },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data?.session) {
      return;
    }

    setSuccess("Controlla la tua email per confermare la registrazione.");
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
      <div className="w-full max-w-md rounded-xl bg-[#2c2c2e] p-6 shadow">
        <h1 className="text-2xl font-semibold text-white">SP Manager</h1>
        <p className="mt-1 text-sm text-white/60">Crea il tuo account gratuito.</p>

        {success ? (
          <div className="mt-6 rounded-lg border border-[#30d158]/40 bg-[#30d158]/10 p-4">
            <p className="text-sm text-[#30d158]">{success}</p>
            <Link to="/login" className="mt-3 block text-center text-sm text-[#0a84ff] hover:underline">
              Torna al login
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#1c1c1e] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                placeholder="Mario Rossi"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#1c1c1e] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                placeholder="nome@studio.com"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#1c1c1e] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                placeholder="Almeno 6 caratteri"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">Conferma password</label>
              <input
                type="password"
                value={conferma}
                onChange={(e) => setConferma(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#1c1c1e] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                placeholder="********"
                required
              />
            </div>

            {error ? <p className="text-sm text-[#ff453a]">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Registrazione in corso..." : "Registrati"}
            </button>

            <p className="text-center text-sm text-white/50">
              Hai già un account?{" "}
              <Link to="/login" className="text-[#0a84ff] hover:underline">
                Accedi
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
