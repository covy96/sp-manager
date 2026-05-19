import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";

const T = {
  ink: '#0E0E0D', navy: '#13315C', paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33', red: '#b91c1c', green: '#1a6b3c',
};

function FieldLabel({ children }) {
  return <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>{children}</div>;
}
function Input({ value, onChange, type = "text", placeholder, disabled }) {
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: `0.5px solid ${focus ? T.navy : T.ink20}`, background: disabled ? T.paper : '#fff', color: disabled ? T.muted : T.ink, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', cursor: disabled ? 'not-allowed' : 'auto' }} />
  );
}
function BtnPrimary({ children, type = "button", onClick, disabled }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ background: T.navy, color: '#EEF1F6', border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}
function Panel({ title, subtitle, children }) {
  return (
    <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '20px 22px', marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginBottom: 18 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

export default function ProfiloPage() {
  console.log('ProfiloPage rendering');
  usePageTitleOnMount("Profilo");
  const { teamMember } = useStudio();

  const [formData, setFormData]       = useState({ nome: "", email: "" });
  const [pwData, setPwData]           = useState({ newPassword: "", confirmPassword: "" });
  const [loading, setLoading]         = useState(false);
  const [pwLoading, setPwLoading]     = useState(false);
  const [message, setMessage]         = useState("");
  const [pwError, setPwError]         = useState("");
  const [pwSuccess, setPwSuccess]     = useState("");
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError]   = useState("");

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifEnabled(Notification.permission === "granted");
    }
  }, []);
  useEffect(() => { if (teamMember) setFormData({ nome: teamMember.user_name || "", email: teamMember.user_email || "" }); }, [teamMember]);

  const handleSaveProfile = async e => {
    e.preventDefault(); setLoading(true); setMessage("");
    const { error } = await supabase.from("team_members").update({ user_name: formData.nome }).eq("id", teamMember?.id);
    setMessage(error ? "Errore: " + error.message : "Profilo aggiornato con successo!");
    setLoading(false);
  };

  const handleChangePw = async e => {
    e.preventDefault(); setPwError(""); setPwSuccess("");
    if (pwData.newPassword !== pwData.confirmPassword) { setPwError("Le password non coincidono"); return; }
    if (pwData.newPassword.length < 6) { setPwError("La password deve essere di almeno 6 caratteri"); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwData.newPassword });
    if (error) setPwError("Errore: " + error.message);
    else { setPwSuccess("Password aggiornata con successo!"); setPwData({ newPassword: "", confirmPassword: "" }); }
    setPwLoading(false);
  };

  const msgColor = message.includes("Errore") ? T.red : T.green;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', marginBottom: 4 }}>Profilo</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>Gestisci le informazioni del tuo account</div>
      </div>

      {/* Info personali */}
      <Panel title="Informazioni personali">
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input type="email" value={formData.email} disabled />
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 4 }}>L'email non può essere modificata</div>
          </div>
          <div>
            <FieldLabel>Nome visualizzato</FieldLabel>
            <Input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Il tuo nome" />
          </div>
          {message && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: msgColor }}>{message}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <BtnPrimary type="submit" disabled={loading}>{loading ? "Salvataggio..." : "Salva modifiche"}</BtnPrimary>
          </div>
        </form>
      </Panel>

      {/* Notifiche push */}
      {('Notification' in window && 'serviceWorker' in navigator) && (
        <Panel title="Notifiche push" subtitle="Ricevi notifiche anche quando l'app è in background.">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: notifEnabled ? T.green : T.muted, display: 'inline-block' }} />
              <span style={{ fontSize: 13, color: T.ink }}>{notifEnabled ? "Notifiche attive" : "Notifiche non attive"}</span>
            </div>
            <button type="button" disabled={notifLoading || notifEnabled}
              onClick={async () => {
                setNotifLoading(true); setNotifError("");
                try {
                  const perm = await Notification.requestPermission();
                  if (perm !== "granted") { setNotifError("Permesso negato. Abilitalo nelle impostazioni del browser."); setNotifLoading(false); return; }
                  let token = null;
                  try {
                    const fb = await import('../../lib/firebase');
                    token = await fb.richiediFCMToken(import.meta.env.VITE_FIREBASE_VAPID_KEY);
                  } catch(e) {
                    console.warn('Firebase non disponibile:', e);
                  }
                  if (!token) { setNotifError("Impossibile ottenere il token FCM."); setNotifLoading(false); return; }
                  const { error } = await supabase.from("team_members").update({ fcm_token: token }).eq("id", teamMember?.id);
                  if (error) setNotifError("Errore: " + error.message); else setNotifEnabled(true);
                } catch (e) { setNotifError("Errore: " + (e.message ?? "Sconosciuto")); }
                setNotifLoading(false);
              }}
              style={{
                background: notifEnabled ? '#f0fdf4' : T.navy, color: notifEnabled ? T.green : '#EEF1F6',
                border: `0.5px solid ${notifEnabled ? T.green : T.navy}`,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '7px 16px', cursor: notifEnabled ? 'default' : 'pointer', opacity: notifLoading ? 0.6 : 1,
              }}>
              {notifLoading ? "Attivazione..." : notifEnabled ? "Attive ✓" : "Abilita"}
            </button>
          </div>
          {notifError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, marginTop: 10 }}>{notifError}</div>}
        </Panel>
      )}

      {/* Cambia password */}
      <Panel title="Cambia password">
        <form onSubmit={handleChangePw} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <FieldLabel>Nuova password</FieldLabel>
            <Input type="password" value={pwData.newPassword} onChange={e => setPwData({ ...pwData, newPassword: e.target.value })} placeholder="••••••••" />
          </div>
          <div>
            <FieldLabel>Conferma password</FieldLabel>
            <Input type="password" value={pwData.confirmPassword} onChange={e => setPwData({ ...pwData, confirmPassword: e.target.value })} placeholder="••••••••" />
          </div>
          {pwError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red }}>{pwError}</div>}
          {pwSuccess && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.green }}>{pwSuccess}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <BtnPrimary type="submit" disabled={pwLoading}>{pwLoading ? "Aggiornamento..." : "Cambia password"}</BtnPrimary>
          </div>
        </form>
      </Panel>
    </div>
  );
}
