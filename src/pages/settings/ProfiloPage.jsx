import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { richiediFCMToken } from "../../lib/firebase";

export default function ProfiloPage() {
  usePageTitleOnMount("Profilo");
  const { teamMember, studioId } = useStudio();

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState("");

  useEffect(() => {
    setNotifEnabled(Notification.permission === "granted");
  }, []);

  useEffect(() => {
    if (teamMember) {
      setFormData({
        nome: teamMember.user_name || "",
        email: teamMember.user_email || "",
      });
    }
  }, [teamMember]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase
      .from("team_members")
      .update({ user_name: formData.nome })
      .eq("id", teamMember?.id);

    if (error) {
      setMessage("Errore: " + error.message);
    } else {
      setMessage("Profilo aggiornato con successo!");
    }

    setLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Le password non coincidono");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("La password deve essere di almeno 6 caratteri");
      return;
    }

    setPasswordLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    });

    if (error) {
      setPasswordError("Errore: " + error.message);
    } else {
      setPasswordSuccess("Password aggiornata con successo!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    }

    setPasswordLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Profilo</h2>
        <p className="text-sm text-white/60">Gestisci le informazioni del tuo account</p>
      </div>

      {/* Info Profilo */}
      <form onSubmit={handleSaveProfile} className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
        <h3 className="mb-4 text-lg font-medium text-white">Informazioni personali</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">Email</label>
            <input
              type="email"
              value={formData.email}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2 text-sm text-white/50"
            />
            <p className="mt-1 text-xs text-white/40">L&apos;email non può essere modificata</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">Nome visualizzato</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]"
              placeholder="Il tuo nome"
            />
          </div>
        </div>

        {message && (
          <p className={`mt-4 text-sm ${message.includes("Errore") ? "text-red-300" : "text-green-300"}`}>
            {message}
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Salvataggio..." : "Salva modifiche"}
          </button>
        </div>
      </form>

      {/* Notifiche Push */}
      <div className="mt-6 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
        <h3 className="mb-1 text-lg font-medium text-white">Notifiche push</h3>
        <p className="mb-5 text-sm text-white/60">
          Ricevi notifiche anche quando l&apos;app è in background.
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                notifEnabled ? "bg-[#30d158]" : "bg-[#48484a]"
              }`}
            />
            <span className="text-sm text-white/80">
              {notifEnabled ? "Notifiche attive" : "Notifiche non attive"}
            </span>
          </div>

          <button
            type="button"
            disabled={notifLoading || notifEnabled}
            onClick={async () => {
              setNotifLoading(true);
              setNotifError("");
              try {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") {
                  setNotifError("Permesso notifiche negato. Abilitalo nelle impostazioni del browser.");
                  setNotifLoading(false);
                  return;
                }
                const token = await richiediFCMToken(import.meta.env.VITE_FIREBASE_VAPID_KEY);
                if (!token) {
                  setNotifError("Impossibile ottenere il token FCM. Riprova.");
                  setNotifLoading(false);
                  return;
                }
                const { error: updateError } = await supabase
                  .from("team_members")
                  .update({ fcm_token: token })
                  .eq("id", teamMember?.id);
                if (updateError) {
                  setNotifError("Errore salvataggio token: " + updateError.message);
                } else {
                  setNotifEnabled(true);
                }
              } catch (err) {
                setNotifError("Errore: " + (err.message ?? "Sconosciuto"));
              }
              setNotifLoading(false);
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              notifEnabled
                ? "cursor-default border border-[#30d158]/40 bg-[#30d158]/10 text-[#30d158]"
                : "bg-[#0a84ff] text-white hover:brightness-110 disabled:opacity-60"
            }`}
          >
            {notifLoading ? "Attivazione..." : notifEnabled ? "Attive ✓" : "Abilita notifiche"}
          </button>
        </div>

        {notifError && <p className="mt-3 text-sm text-red-300">{notifError}</p>}
      </div>

      {/* Cambia Password */}
      <form onSubmit={handleChangePassword} className="mt-6 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
        <h3 className="mb-4 text-lg font-medium text-white">Cambia password</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">Nuova password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">Conferma password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]"
              placeholder="••••••••"
            />
          </div>
        </div>

        {passwordError && <p className="mt-4 text-sm text-red-300">{passwordError}</p>}
        {passwordSuccess && <p className="mt-4 text-sm text-green-300">{passwordSuccess}</p>}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={passwordLoading}
            className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
          >
            {passwordLoading ? "Aggiornamento..." : "Cambia password"}
          </button>
        </div>
      </form>
    </div>
  );
}
