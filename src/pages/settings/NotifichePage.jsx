import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { richiediFCMToken } from "../../lib/firebase";

// ─── Apple-style Toggle ──────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${
        disabled ? "cursor-not-allowed opacity-40" : ""
      } ${checked ? "bg-[#30d158]" : "bg-[#48484a]"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Default prefs ────────────────────────────────────────────────────────────
const DEFAULT_PREFS = {
  task_assegnata: true,
  task_scadenza_oggi: true,
  task_scaduta: true,
  nuovo_membro: true,
  proforma_in_scadenza: true,
  commessa_residuo_60gg: true,
};

const NOTIF_ITEMS = [
  { key: "task_assegnata", emoji: "🔔", label: "Task assegnata a me" },
  { key: "task_scadenza_oggi", emoji: "📅", label: "Task con scadenza oggi" },
  { key: "task_scaduta", emoji: "⚠️", label: "Task scaduta non completata" },
  { key: "nuovo_membro", emoji: "👤", label: "Nuovo membro aggiunto allo studio" },
  { key: "proforma_in_scadenza", emoji: "📄", label: "Proforma in scadenza", hasDays: true },
  { key: "commessa_residuo_60gg", emoji: "💰", label: "Commessa con residuo da +60 giorni" },
];

export default function NotifichePage() {
  usePageTitleOnMount("Notifiche");
  const { teamMember } = useStudio();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState("");

  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [proformaDays, setProformaDays] = useState(3);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  // ── Load initial state ────────────────────────────────────────────────────
  useEffect(() => {
    setPushEnabled(Notification.permission === "granted");
  }, []);

  useEffect(() => {
    if (!teamMember?.id) return;
    const load = async () => {
      setPrefsLoading(true);
      const { data } = await supabase
        .from("team_members")
        .select("notification_preferences, fcm_token")
        .eq("id", teamMember.id)
        .single();
      if (data) {
        const merged = { ...DEFAULT_PREFS, ...(data.notification_preferences ?? {}) };
        setPrefs(merged);
        if (data.notification_preferences?.proforma_days) {
          setProformaDays(data.notification_preferences.proforma_days);
        }
        if (data.fcm_token && Notification.permission === "granted") {
          setPushEnabled(true);
        }
      }
      setPrefsLoading(false);
    };
    load();
  }, [teamMember?.id]);

  // ── Enable push ───────────────────────────────────────────────────────────
  const handleEnablePush = async () => {
    setPushLoading(true);
    setPushError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushError("Permesso negato. Abilitalo nelle impostazioni del browser.");
        setPushLoading(false);
        return;
      }
      const token = await richiediFCMToken(import.meta.env.VITE_FIREBASE_VAPID_KEY);
      if (!token) {
        setPushError("Impossibile ottenere il token FCM. Riprova.");
        setPushLoading(false);
        return;
      }
      if (!teamMember?.id) {
        setPushError("Utente non trovato.");
        setPushLoading(false);
        return;
      }
      const { error } = await supabase
        .from("team_members")
        .update({ fcm_token: token })
        .eq("id", teamMember.id);
      if (error) {
        setPushError("Errore salvataggio token: " + error.message);
      } else {
        setPushEnabled(true);
      }
    } catch (err) {
      setPushError("Errore: " + (err.message ?? "Sconosciuto"));
    }
    setPushLoading(false);
  };

  // ── Disable push ──────────────────────────────────────────────────────────
  const handleDisablePush = async () => {
    setPushLoading(true);
    setPushError("");
    if (teamMember?.id) {
      await supabase
        .from("team_members")
        .update({ fcm_token: null })
        .eq("id", teamMember.id);
    }
    setPushEnabled(false);
    setPushLoading(false);
  };

  // ── Toggle single pref ────────────────────────────────────────────────────
  const handleTogglePref = async (key, value) => {
    if (!teamMember?.id) return;
    setSavingKey(key);
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    await supabase
      .from("team_members")
      .update({ notification_preferences: newPrefs })
      .eq("id", teamMember.id);
    setSavingKey(null);
  };

  // ── Update proforma days ──────────────────────────────────────────────────
  const handleProformaDays = async (days) => {
    if (!teamMember?.id) return;
    const parsed = Math.max(1, Math.min(30, Number(days) || 3));
    setProformaDays(parsed);
    const newPrefs = { ...prefs, proforma_days: parsed };
    setPrefs(newPrefs);
    await supabase
      .from("team_members")
      .update({ notification_preferences: newPrefs })
      .eq("id", teamMember.id);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Notifiche</h2>
        <p className="text-sm text-white/60">Gestisci le notifiche push per questo dispositivo</p>
      </div>

      {/* ── Toggle principale ── */}
      <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-white">Notifiche push</p>
            <p className="mt-0.5 text-sm text-white/50">
              {pushEnabled ? "Attive su questo dispositivo" : "Disattivate su questo dispositivo"}
            </p>
          </div>
          <Toggle
            checked={pushEnabled}
            disabled={pushLoading}
            onChange={(val) => (val ? handleEnablePush() : handleDisablePush())}
          />
        </div>
        {pushLoading && (
          <p className="mt-3 flex items-center gap-2 text-sm text-white/50">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#48484a] border-t-white/60" />
            {pushEnabled ? "Disattivazione..." : "Attivazione..."}
          </p>
        )}
        {pushError && <p className="mt-3 text-sm text-red-300">{pushError}</p>}
      </div>

      {/* ── Lista notifiche singole ── */}
      <div
        className={`rounded-xl border border-[#48484a] bg-[#2c2c2e] divide-y divide-[#48484a] transition-opacity ${
          pushEnabled ? "opacity-100" : "opacity-40 pointer-events-none"
        }`}
      >
        <div className="px-5 py-3">
          <p className="text-xs font-medium uppercase text-white/40">Tipo di notifica</p>
        </div>

        {prefsLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
          </div>
        ) : (
          NOTIF_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center gap-4 px-5 py-4">
              <span className="text-xl leading-none">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{item.label}</p>
                {item.hasDays && prefs[item.key] && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-white/50">Avvisami</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={proformaDays}
                      onChange={(e) => handleProformaDays(e.target.value)}
                      disabled={!pushEnabled}
                      className="w-14 rounded-md border border-[#48484a] bg-[#3a3a3c] px-2 py-1 text-center text-sm text-white outline-none focus:border-[#0a84ff] disabled:opacity-50"
                    />
                    <span className="text-xs text-white/50">giorni prima</span>
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {savingKey === item.key ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#48484a] border-t-white/60" />
                ) : (
                  <Toggle
                    checked={!!prefs[item.key]}
                    disabled={!pushEnabled}
                    onChange={(val) => handleTogglePref(item.key, val)}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* SQL reminder (only in development, hidden in UI) */}
      {/* alter table team_members add column if not exists notification_preferences jsonb
          default '{"task_assegnata":true,"task_scadenza_oggi":true,"task_scaduta":true,
          "nuovo_membro":true,"proforma_in_scadenza":true,"commessa_residuo_60gg":true}'; */}
    </div>
  );
}
