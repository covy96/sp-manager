import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function LoginPage({ session }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    }

    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1c1c1e] p-4">
      <div className="w-full max-w-md rounded-xl bg-[#2c2c2e] p-6 shadow">
        <h1 className="text-2xl font-semibold text-white">SP Manager</h1>
        <p className="mt-1 text-sm text-white/60">
          Accedi al gestionale del tuo studio di architettura.
        </p>

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

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

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
