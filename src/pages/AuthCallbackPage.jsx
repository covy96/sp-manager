import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, seedServiceTaskTemplates } from "../lib/supabase";

function generateInviteCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

async function createStudioForUser(user, pendingStudio) {
  const code = generateInviteCode();
  const { data: studio, error: studioError } = await supabase
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

  if (studioError || !studio) {
    console.error("Errore creazione studio:", studioError);
    return null;
  }

  const { error: memberError } = await supabase.from("team_members").insert({
    user_account: user.id,
    user_email: user.email,
    user_name: pendingStudio.ownerName || user.email,
    studio: studio.id,
    role_internal: "Owner",
    active: true,
  });

  if (memberError) {
    console.error("Errore creazione team_member:", memberError);
    return null;
  }

  await seedServiceTaskTemplates(studio.id);
  localStorage.setItem("asm-active-studio", studio.id);
  localStorage.removeItem("asm-pending-studio");
  return studio;
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      let session = null;

      // PKCE flow: ?code=...
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError("Link non valido o scaduto. Richiedi una nuova email di conferma.");
          return;
        }
        session = data.session;
      } else {
        // Implicit flow: #access_token=...
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !data.session) {
            setError("Link non valido o scaduto. Richiedi una nuova email di conferma.");
            return;
          }
          session = data.session;
        }
      }

      if (!session) {
        setError("Link non valido. Torna al login e riprova.");
        return;
      }

      const user = session.user;

      // ── Caso 1: studio da creare (da /crea-studio) ──
      const rawStudio = localStorage.getItem("asm-pending-studio");
      if (rawStudio) {
        try {
          const pendingStudio = JSON.parse(rawStudio);
          const studio = await createStudioForUser(user, pendingStudio);
          if (!studio) {
            setError("Account confermato, ma si è verificato un errore nella creazione dello studio. Accedi e riprova.");
            return;
          }
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
        } catch (e) {
          console.error("Errore parsing pending join:", e);
        }
      }

      navigate("/dashboard", { replace: true });
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
        <p className="text-sm text-white/50">Attivazione account in corso...</p>
      </div>
    </main>
  );
}
