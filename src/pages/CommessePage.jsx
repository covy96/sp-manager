import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import { calcolaIncassato } from "../lib/utils";

// ── BRAND TOKENS ─────────────────────────────────────────────────
const T = {
  ink: '#0E0E0D', navy: '#13315C', brass: '#D9C98A',
  paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33', ink05: '#0E0E0D0D',
  red: '#b91c1c', green: '#1a6b3c',
};

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(v) || 0);
}

// ── SHARED UI ────────────────────────────────────────────────────
function BtnPrimary({ children, onClick, disabled, type = "button", style = {} }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: T.navy, color: '#EEF1F6', border: 'none',
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '8px 18px', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, ...style,
    }}>{children}</button>
  );
}

function BtnGhost({ children, onClick, disabled, danger, style = {} }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      background: 'transparent', border: `0.5px solid ${danger ? T.red : T.ink20}`,
      color: danger ? T.red : T.ink,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '8px 18px', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, ...style,
    }}>{children}</button>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>{children}</div>;
}

function Input({ value, onChange, type = "text", placeholder, required, style = {} }) {
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: `0.5px solid ${focus ? T.navy : T.ink20}`, background: '#fff', color: T.ink, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', ...style }} />
  );
}

function Modal({ open, onClose, title, subtitle, children, width = 520 }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,14,13,0.5)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: width, background: '#fff', border: `0.5px solid ${T.ink20}`, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em' }}>{title}</div>
            {subtitle && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 4 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Divider() { return <div style={{ height: '0.5px', background: T.ink10, margin: '16px 0' }} />; }

// ── COMMESSA CARD ─────────────────────────────────────────────────
function CommessaCard({ commessa, incassato, onClick }) {
  const base = Number(commessa.importo_offerta_base) || 0;
  const pagato = incassato || 0;
  const residuo = base - pagato;
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? '#f8f7f4' : '#fff',
        border: `0.5px solid ${T.ink10}`,
        padding: '18px 20px', cursor: 'pointer', transition: 'background 0.12s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
            {commessa.numero_offerta || "—"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em' }}>
            {commessa.nome_commessa || "Commessa senza nome"}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 2 }}>
            {commessa.cliente || "—"}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.03em' }}>{currency(base)}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 2 }}>offerta base</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: T.ink10, marginBottom: 10 }}>
        <div style={{ height: 2, background: base > 0 ? T.navy : T.ink10, width: `${base > 0 ? Math.min(100, Math.round((pagato / base) * 100)) : 0}%`, transition: 'width 0.3s' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Pagato', value: currency(pagato), color: T.green },
          { label: 'Residuo', value: currency(residuo), color: residuo > 0 ? T.navy : T.muted },
          { label: 'Data', value: commessa.data_commessa ? new Date(commessa.data_commessa).toLocaleDateString('it-IT') : '—', color: T.muted },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 2 }}>{label}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 500, color }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function CommessePage() {
  usePageTitleOnMount("Commesse");
  const navigate = useNavigate();
  const { studioId, studioLoading } = useStudio();
  const permissions = usePermissions();

  const [commesse, setCommesse] = useState([]);
  const [incassatoMap, setIncassatoMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    numero_offerta: "", nome_commessa: "", cliente: "",
    data_commessa: "", importo_offerta_base: "", note_amministrative: "",
  });

  const loadData = async () => {
    if (!studioId) return;
    setLoading(true); setError("");
    try {
      const { data, error: dErr } = await supabase.from("commesse").select("*").eq("studio", studioId).order("created_at", { ascending: false });
      if (dErr) throw dErr;
      setCommesse(data ?? []);
      const ids = (data ?? []).map(c => c.id);
      if (ids.length > 0) {
        const map = await calcolaIncassato(ids, studioId, supabase);
        setIncassatoMap(map);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (studioId) loadData(); }, [studioId]);

  const handleChange = field => e => setFormData(p => ({ ...p, [field]: e.target.value }));

  const handleSave = async e => {
    e.preventDefault(); setFormError(""); setSaving(true);
    const payload = {
      numero_offerta: formData.numero_offerta.trim(),
      nome_commessa: formData.nome_commessa.trim(),
      cliente: formData.cliente.trim(),
      data_commessa: formData.data_commessa || null,
      importo_offerta_base: Number(formData.importo_offerta_base) || 0,
      note_amministrative: formData.note_amministrative.trim() || null,
      studio: studioId,
    };
    if (!payload.nome_commessa || !payload.cliente) { setFormError("Nome commessa e cliente sono obbligatori."); setSaving(false); return; }
    const { error: iErr } = await supabase.from("commesse").insert(payload);
    if (iErr) { setFormError(iErr.message); setSaving(false); return; }
    setModalOpen(false);
    setFormData({ numero_offerta: "", nome_commessa: "", cliente: "", data_commessa: "", importo_offerta_base: "", note_amministrative: "" });
    await loadData(); setSaving(false);
  };

  if (studioLoading || !studioId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', color: T.ink }}>Commesse</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 2, letterSpacing: '0.05em' }}>
            {commesse.length} commesse · {currency(commesse.reduce((s, c) => s + (Number(c.importo_offerta_base) || 0), 0))} totale offerte
          </div>
        </div>
        {permissions.canManageCommesse && (
          <BtnPrimary onClick={() => setModalOpen(true)}>+ Nuova</BtnPrimary>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
      ) : error ? (
        <div style={{ border: `0.5px solid ${T.ink10}`, background: '#fff', padding: 32, color: T.red, fontSize: 13 }}>Errore: {error}</div>
      ) : commesse.length === 0 ? (
        <div style={{ border: `0.5px solid ${T.ink10}`, background: '#fff', padding: 48, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
          Nessuna commessa disponibile.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {commesse.map(c => (
            <CommessaCard
              key={c.id} commessa={c}
              incassato={incassatoMap[c.id] || 0}
              onClick={() => navigate(`/commesse/${c.id}`)}
            />
          ))}
        </div>
      )}

      {/* MODAL: NUOVA COMMESSA */}
      <Modal open={modalOpen} onClose={() => { if (!saving) setModalOpen(false); }} title="Nuova Commessa" subtitle="Inserisci i dati della commessa">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            ['numero_offerta', 'Numero offerta', 'text'],
            ['nome_commessa', 'Nome commessa *', 'text'],
            ['cliente', 'Cliente *', 'text'],
            ['data_commessa', 'Data commessa', 'date'],
            ['importo_offerta_base', 'Importo offerta base', 'number'],
          ].map(([f, l, t]) => (
            <div key={f}>
              <FieldLabel>{l}</FieldLabel>
              <Input type={t} value={formData[f]} onChange={handleChange(f)} required={l.includes('*')} />
            </div>
          ))}
          <div>
            <FieldLabel>Note amministrative</FieldLabel>
            <textarea value={formData.note_amministrative} onChange={handleChange('note_amministrative')} rows={3}
              style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: `0.5px solid ${T.ink20}`, background: '#fff', color: T.ink, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", outline: 'none', resize: 'vertical' }} />
          </div>
          {formError && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red }}>{formError}</div>}
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <BtnGhost onClick={() => setModalOpen(false)} disabled={saving}>Annulla</BtnGhost>
            <BtnPrimary type="submit" disabled={saving}>{saving ? "Salvataggio..." : "Salva"}</BtnPrimary>
          </div>
        </form>
      </Modal>
    </div>
  );
}
