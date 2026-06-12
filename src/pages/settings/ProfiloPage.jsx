import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";

function FieldLabel({ children }) {
  const { T } = useTheme();
  return <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>{children}</div>;
}
function Input({ value, onChange, type = "text", placeholder, disabled }) {
  const { T } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: `1px solid ${focus ? T.navy : T.borderMd}`, borderRadius: T.radiusSm, background: disabled ? T.bg : T.inputBg, color: disabled ? T.muted : T.inputText, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', cursor: disabled ? 'not-allowed' : 'auto' }} />
  );
}
function BtnPrimary({ children, type = "button", onClick, disabled }) {
  const { T } = useTheme();
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ background: T.navy, color: T.bg, border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}
function Panel({ title, subtitle, children }) {
  const { T } = useTheme();
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, padding: '20px 22px', marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', marginBottom: 4 }}>{title}</div>
      {subtitle && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginBottom: 18 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

export default function ProfiloPage() {
  const { T } = useTheme();
  usePageTitleOnMount("Profilo");
  const { teamMember } = useStudio();

  const [formData, setFormData]       = useState({ nome: "", email: "", telefono: "", specializzazione: "", avatar_url: "" });
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
  useEffect(() => {
    if (teamMember) setFormData({
      nome:            teamMember.user_name       || "",
      email:           teamMember.user_email      || "",
      telefono:        teamMember.telefono        || "",
      specializzazione: teamMember.specializzazione || "",
      avatar_url:      teamMember.avatar_url      || "",
    });
  }, [teamMember]);

  const handleSaveProfile = async e => {
    e.preventDefault(); setLoading(true); setMessage("");
    const { error } = await supabase.from("team_members").update({
      user_name:        formData.nome             || null,
      telefono:         formData.telefono         || null,
      specializzazione: formData.specializzazione || null,
      avatar_url:       formData.avatar_url       || null,
    }).eq("id", teamMember?.id);
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
      <Panel title="Informazioni personali" subtitle="Visibili dall'Owner e dai Partner dello studio">
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
          <div>
            <FieldLabel>Telefono</FieldLabel>
            <Input value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} placeholder="+39 333 1234567" />
          </div>
          <div>
            <FieldLabel>Specializzazione</FieldLabel>
            <Input value={formData.specializzazione} onChange={e => setFormData({ ...formData, specializzazione: e.target.value })} placeholder="Es. Progettazione residenziale, BIM..." />
          </div>
          <div>
            <FieldLabel>Avatar (URL immagine)</FieldLabel>
            <Input value={formData.avatar_url} onChange={e => setFormData({ ...formData, avatar_url: e.target.value })} placeholder="https://..." />
            {formData.avatar_url && (
              <div style={{ marginTop: 8 }}>
                <img src={formData.avatar_url} alt="avatar"
                  onError={e => e.target.style.display = 'none'}
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${T.border}` }} />
              </div>
            )}
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
                  // 1. Controlla/richiedi permesso
                  let perm = Notification.permission;
                  if (perm === "default") {
                    perm = await Notification.requestPermission();
                  }
                  if (perm === "denied") {
                    setNotifError(
                      "Permesso negato dal browser. Su iPhone/iPad: elimina la PWA dalla schermata Home, riaggiungiila da Safari, abilita le notifiche in Impostazioni → [nome app] → Notifiche, poi riapri l'app e riprova."
                    );
                    setNotifLoading(false); return;
                  }
                  if (perm !== "granted") {
                    setNotifError("Permesso non concesso. Riprova.");
                    setNotifLoading(false); return;
                  }

                  // 2. Prova prima FCM (Chrome/Android/Edge)
                  let fcmToken = null;
                  try {
                    const fb = await import('../../lib/firebase');
                    fcmToken = await fb.richiediFCMToken(import.meta.env.VITE_FIREBASE_VAPID_KEY);
                  } catch(e) { console.warn('FCM non disponibile:', e); }

                  if (fcmToken) {
                    // FCM funziona (Chrome, Edge, Android)
                    const { error } = await supabase.from("team_members")
                      .update({ fcm_token: fcmToken, web_push_subscription: null })
                      .eq("id", teamMember?.id);
                    if (error) throw new Error(error.message);
                    setNotifEnabled(true);
                    setNotifLoading(false); return;
                  }

                  // 3. Fallback Web Push nativo (Safari, Firefox)
                  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                  if (!vapidKey) throw new Error("VAPID key non configurata");

                  const swReg = await navigator.serviceWorker.register('/sw-webpush.js');
                  await navigator.serviceWorker.ready;

                  // Converti VAPID public key da base64url a Uint8Array
                  const keyBytes = Uint8Array.from(
                    atob(vapidKey.replace(/-/g, '+').replace(/_/g, '/')),
                    c => c.charCodeAt(0)
                  );

                  const subscription = await swReg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: keyBytes,
                  });

                  const { error } = await supabase.from("team_members")
                    .update({ web_push_subscription: subscription.toJSON(), fcm_token: null })
                    .eq("id", teamMember?.id);
                  if (error) throw new Error(error.message);
                  setNotifEnabled(true);

                } catch (e) {
                  console.error("Errore notifiche:", e);
                  setNotifError("Errore: " + (e.message ?? "Sconosciuto"));
                }
                setNotifLoading(false);
              }}
              style={{
                background: notifEnabled ? T.greenLight : T.navy, color: notifEnabled ? T.green : T.bg,
                border: `1px solid ${notifEnabled ? T.green : T.navy}`, borderRadius: T.radiusSm,
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
