import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";

const DEFAULT_PREFS = {
  task_assegnata: true, task_scadenza_oggi: true, task_scaduta: true,
  nuovo_membro: true, proforma_in_scadenza: true, commessa_residuo_60gg: true,
};

const NOTIF_ITEMS = [
  { key: "task_assegnata",        emoji: "🔔", label: "Task assegnata a me" },
  { key: "task_scadenza_oggi",    emoji: "📅", label: "Task con scadenza oggi" },
  { key: "task_scaduta",          emoji: "⚠️", label: "Task scaduta non completata" },
  { key: "nuovo_membro",          emoji: "👤", label: "Nuovo membro aggiunto allo studio" },
  { key: "proforma_in_scadenza",  emoji: "📄", label: "Proforma in scadenza", hasDays: true },
  { key: "commessa_residuo_60gg", emoji: "💰", label: "Commessa con residuo da +60 giorni" },
];

function Toggle({ checked, onChange, disabled = false }) {
  const { T } = useTheme();
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => !disabled && onChange(!checked)}
      style={{
        position: 'relative', width: 44, height: 26, borderRadius: 13,
        background: checked ? T.navy : T.muted,
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1, transition: 'background 0.2s', flexShrink: 0,
      }}>
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%', background: T.surface,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

export default function NotifichePage() {
  const { T } = useTheme();
  console.log('NotifichePage rendering');
  usePageTitleOnMount("Notifiche");
  const { teamMember } = useStudio();

  const [pushEnabled, setPushEnabled]   = useState(false);
  const [pushLoading, setPushLoading]   = useState(false);
  const [pushError, setPushError]       = useState("");
  const [prefs, setPrefs]               = useState(DEFAULT_PREFS);
  const [proformaDays, setProformaDays] = useState(3);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingKey, setSavingKey]       = useState(null);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPushEnabled(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    if (!teamMember?.id) return;
    const load = async () => {
      setPrefsLoading(true);
      const { data } = await supabase.from("team_members").select("notification_preferences,fcm_token").eq("id", teamMember.id).single();
      if (data) {
        setPrefs({ ...DEFAULT_PREFS, ...(data.notification_preferences ?? {}) });
        if (data.notification_preferences?.proforma_days) setProformaDays(data.notification_preferences.proforma_days);
        if (data.fcm_token && Notification.permission === "granted") setPushEnabled(true);
      }
      setPrefsLoading(false);
    };
    load();
  }, [teamMember?.id]);

  const handleEnablePush = async () => {
    if (typeof Notification === 'undefined') {
      setPushError('Le notifiche push non sono supportate su questo browser.');
      return;
    }
    try {
      setPushLoading(true); setPushError("");
      let perm = Notification.permission;
      if (perm === "default") perm = await Notification.requestPermission();
      if (perm !== "granted") { alert("Abilita le notifiche nelle impostazioni del browser."); setPushLoading(false); return; }
      await Promise.race([navigator.serviceWorker.register("/firebase-messaging-sw.js"), new Promise((_,r) => setTimeout(() => r(new Error("SW timeout")), 5000))]);
      let richiediFCMToken;
      try {
        const fb = await import('../../lib/firebase');
        richiediFCMToken = fb.richiediFCMToken;
      } catch(e) {
        console.warn('Firebase non disponibile:', e);
      }
      const token = richiediFCMToken
        ? await Promise.race([richiediFCMToken(import.meta.env.VITE_FIREBASE_VAPID_KEY), new Promise((_,r) => setTimeout(() => r(new Error("Token timeout")), 10000))])
        : null;
      if (!teamMember?.id) { setPushError("Utente non trovato."); setPushLoading(false); return; }
      if (token) {
        localStorage.setItem('asm-fcm-token', token);
        // Leggi i token esistenti e aggiungi quello corrente (evita duplicati)
        const { data: tm } = await supabase.from("team_members").select("fcm_tokens").eq("id", teamMember.id).single();
        const existing = tm?.fcm_tokens ?? [];
        const updated = existing.includes(token) ? existing : [...existing, token];
        const { error } = await supabase.from("team_members").update({ fcm_token: token, fcm_tokens: updated }).eq("id", teamMember.id);
        if (error) setPushError("Errore: " + error.message); else setPushEnabled(true);
      }
    } catch (e) { alert("Errore: " + e.message); }
    finally { setPushLoading(false); }
  };

  const handleDisablePush = async () => {
    setPushLoading(true); setPushError("");
    if (teamMember?.id) {
      const currentToken = localStorage.getItem('asm-fcm-token');
      const { data: tm } = await supabase.from("team_members").select("fcm_tokens").eq("id", teamMember.id).single();
      const updated = (tm?.fcm_tokens ?? []).filter(t => t !== currentToken);
      await supabase.from("team_members").update({ fcm_token: null, fcm_tokens: updated }).eq("id", teamMember.id);
      localStorage.removeItem('asm-fcm-token');
    }
    setPushEnabled(false); setPushLoading(false);
  };

  const handleTogglePref = async (key, value) => {
    if (!teamMember?.id) return; setSavingKey(key);
    const newPrefs = { ...prefs, [key]: value }; setPrefs(newPrefs);
    await supabase.from("team_members").update({ notification_preferences: newPrefs }).eq("id", teamMember.id);
    setSavingKey(null);
  };

  const handleProformaDays = async days => {
    if (!teamMember?.id) return;
    const parsed = Math.max(1, Math.min(30, Number(days) || 3)); setProformaDays(parsed);
    const newPrefs = { ...prefs, proforma_days: parsed }; setPrefs(newPrefs);
    await supabase.from("team_members").update({ notification_preferences: newPrefs }).eq("id", teamMember.id);
  };

  const supportsNotifications = 'Notification' in window && 'serviceWorker' in navigator;

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', marginBottom: 4 }}>Notifiche</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>Gestisci le notifiche push per questo dispositivo</div>
      </div>

      {!supportsNotifications && (
        <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, padding: '20px 22px' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, lineHeight: 1.7 }}>
            Le notifiche push non sono supportate su questo browser.<br/>
            Su iPhone, aggiungi l'app alla schermata home e aprila da lì.
          </div>
        </div>
      )}

      {supportsNotifications && (
      <>
      {/* Toggle principale */}
      <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Notifiche push</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>
              {pushEnabled ? "Attive su questo dispositivo" : "Disattivate su questo dispositivo"}
            </div>
          </div>
          <Toggle checked={pushEnabled} disabled={pushLoading} onChange={v => v ? handleEnablePush() : handleDisablePush()} />
        </div>
        {pushLoading && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 10 }}>{pushEnabled ? "Disattivazione..." : "Attivazione..."}</div>}
        {pushError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, marginTop: 10 }}>{pushError}</div>}
      </div>

      {/* Lista preferenze */}
      <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, opacity: pushEnabled ? 1 : 0.4, pointerEvents: pushEnabled ? 'auto' : 'none' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, padding: '10px 18px', borderBottom: `0.5px solid ${T.border}` }}>Tipo di notifica</div>
        {prefsLoading ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
        ) : NOTIF_ITEMS.map(item => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: `0.5px solid ${T.border}` }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: T.ink, marginBottom: item.hasDays && prefs[item.key] ? 8 : 0 }}>{item.label}</div>
              {item.hasDays && prefs[item.key] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>Avvisami</span>
                  <input type="number" min={1} max={30} value={proformaDays} onChange={e => handleProformaDays(e.target.value)}
                    style={{ width: 48, padding: '4px 8px', border: `0.5px solid ${T.borderMd}`, background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", outline: 'none', textAlign: 'center' }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>giorni prima</span>
                </div>
              )}
            </div>
            <div style={{ flexShrink: 0 }}>
              {savingKey === item.key
                ? <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>...</span>
                : <Toggle checked={!!prefs[item.key]} disabled={!pushEnabled} onChange={v => handleTogglePref(item.key, v)} />
              }
            </div>
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  );
}
