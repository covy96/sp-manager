import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useStudio } from "../../hooks/useStudio";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useToast } from "../../contexts/ToastContext";
import { supabase } from "../../lib/supabase";

// ── UI ATOMS ────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  const { T } = useTheme();
  return <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>{children}</div>;
}
function Input({ value, onChange, type = "text", placeholder, style = {} }) {
  const { T } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        width: "100%", padding: "8px 12px", boxSizing: "border-box",
        border: `0.5px solid ${focus ? T.navy : T.borderMd}`, background: T.inputBg,
        color: T.ink, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif",
        outline: "none", borderRadius: 6, ...style,
      }} />
  );
}
function SectionCard({ title, children }) {
  const { T } = useTheme();
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "14px 20px", borderBottom: `0.5px solid ${T.borderMd}` }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: T.navy, fontWeight: 600 }}>{title}</div>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

const EMPTY_SCAGLIONE = { soglia_max: "", tariffa_settimanale: "" };

export default function PreventivoConfigPage() {
  usePageTitleOnMount("Config Preventivi");
  const navigate = useNavigate();
  const { T } = useTheme();
  const { studioId } = useStudio();
  const toast = useToast();

  const [tariffaMq, setTariffaMq] = useState("");
  const [rivalsa, setRivalsa] = useState("4");
  const [scaglioni, setScaglioni] = useState([
    { soglia_max: "100000", tariffa_settimanale: "250" },
    { soglia_max: null, tariffa_settimanale: "500" },
  ]);
  const [catalogo, setCatalogo] = useState([]);
  const [newVoce, setNewVoce] = useState({ label: "", importo_default: "", attiva: true });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studioId) return;
    Promise.all([
      supabase.from("preventivo_config").select("*").eq("studio", studioId).maybeSingle(),
      supabase.from("voci_fisse_catalogo").select("*").eq("studio", studioId).order("ordine"),
    ]).then(([{ data: cfg }, { data: cat }]) => {
      if (cfg) {
        setTariffaMq(String(cfg.tariffa_mq ?? ""));
        setRivalsa(String(cfg.rivalsa_inarcassa_pct ?? "4"));
        if (Array.isArray(cfg.dl_scaglioni) && cfg.dl_scaglioni.length > 0) {
          setScaglioni(cfg.dl_scaglioni.map(s => ({
            soglia_max: s.soglia_max === null ? null : String(s.soglia_max),
            tariffa_settimanale: String(s.tariffa_settimanale),
          })));
        }
      }
      setCatalogo(cat ?? []);
      setLoading(false);
    });
  }, [studioId]);

  // ── Scaglioni ──────────────────────────────────────────────────
  const updateScaglione = (idx, field, val) =>
    setScaglioni(ss => ss.map((s, i) => i === idx ? { ...s, [field]: val } : s));

  const addScaglione = () => {
    setScaglioni(ss => {
      // Inserisci prima dell'ultimo (quello "oltre")
      const ultimo = ss[ss.length - 1];
      return [...ss.slice(0, -1), { ...EMPTY_SCAGLIONE }, ultimo];
    });
  };

  const removeScaglione = (idx) =>
    setScaglioni(ss => ss.filter((_, i) => i !== idx));

  // ── Catalogo voci ───────────────────────────────────────────────
  const toggleAttiva = async (voce) => {
    const next = !voce.attiva;
    setCatalogo(cs => cs.map(v => v.id === voce.id ? { ...v, attiva: next } : v));
    await supabase.from("voci_fisse_catalogo").update({ attiva: next }).eq("id", voce.id);
  };

  const deleteVoce = async (voce) => {
    setCatalogo(cs => cs.filter(v => v.id !== voce.id));
    await supabase.from("voci_fisse_catalogo").delete().eq("id", voce.id);
  };

  const addVoce = async () => {
    if (!newVoce.label.trim()) return;
    const ordine = catalogo.length;
    const { data, error } = await supabase.from("voci_fisse_catalogo").insert({
      studio: studioId,
      label: newVoce.label.trim(),
      importo_default: Number(newVoce.importo_default) || 0,
      attiva: true,
      ordine,
    }).select().single();
    if (error) { toast?.error("Errore aggiunta voce"); return; }
    setCatalogo(cs => [...cs, data]);
    setNewVoce({ label: "", importo_default: "", attiva: true });
  };

  const updateVoceImporto = async (voce, val) => {
    const importo = Number(val) || 0;
    setCatalogo(cs => cs.map(v => v.id === voce.id ? { ...v, importo_default: importo } : v));
    await supabase.from("voci_fisse_catalogo").update({ importo_default: importo }).eq("id", voce.id);
  };

  // ── Salvataggio config ─────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const dl_scaglioni = scaglioni.map(s => ({
      soglia_max: s.soglia_max === null || s.soglia_max === "" ? null : Number(s.soglia_max),
      tariffa_settimanale: Number(s.tariffa_settimanale) || 0,
    }));
    const { error } = await supabase.from("preventivo_config").upsert({
      studio: studioId,
      tariffa_mq: Number(tariffaMq) || 0,
      dl_scaglioni,
      rivalsa_inarcassa_pct: Number(rivalsa) || 4,
      updated_at: new Date().toISOString(),
    }, { onConflict: "studio" });
    setSaving(false);
    if (error) toast?.error("Errore salvataggio: " + error.message);
    else toast?.success("Configurazione salvata");
  };

  const mono = { fontFamily: "'IBM Plex Mono', monospace" };

  return (
    <div style={{ padding: "28px 24px", maxWidth: 720, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={() => navigate("/preventivi")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 18, padding: "4px 8px" }}>←</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>
          Configurazione Preventivi
        </h1>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", ...mono, fontSize: 11, color: T.muted }}>Caricamento…</div>
      ) : (
        <>
          {/* Tariffa MQ e rivalsa */}
          <SectionCard title="Tariffa base">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              <div>
                <FieldLabel>Tariffa €/mq</FieldLabel>
                <Input type="number" value={tariffaMq} onChange={e => setTariffaMq(e.target.value)} placeholder="es. 80" />
              </div>
              <div>
                <FieldLabel>Rivalsa Inarcassa (%)</FieldLabel>
                <Input type="number" value={rivalsa} onChange={e => setRivalsa(e.target.value)} placeholder="4" />
              </div>
            </div>
          </SectionCard>

          {/* Scaglioni DL */}
          <SectionCard title="Scaglioni Direzione Lavori">
            <div style={{ marginBottom: 14, fontSize: 12, color: T.muted, fontFamily: "'Space Grotesk', sans-serif" }}>
              Per ogni fascia di importo lavori, definisci la tariffa settimanale DL applicabile. L'ultimo scaglione senza soglia copre tutto il resto.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 32px", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <div style={{ ...mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted }}>Soglia max (€)</div>
              <div style={{ ...mono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: T.muted }}>Tariffa settimanale (€)</div>
              <div />
            </div>
            {scaglioni.map((s, idx) => {
              const isUltimo = idx === scaglioni.length - 1;
              return (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 32px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  {isUltimo ? (
                    <div style={{ padding: "8px 12px", border: `0.5px solid ${T.border}`, borderRadius: 6, background: T.bg, ...mono, fontSize: 12, color: T.muted }}>
                      Oltre (tutti)
                    </div>
                  ) : (
                    <Input type="number" value={s.soglia_max ?? ""} onChange={e => updateScaglione(idx, "soglia_max", e.target.value)} placeholder="es. 100000" />
                  )}
                  <Input type="number" value={s.tariffa_settimanale} onChange={e => updateScaglione(idx, "tariffa_settimanale", e.target.value)} placeholder="es. 350" />
                  {isUltimo ? <div /> : (
                    <button onClick={() => removeScaglione(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                  )}
                </div>
              );
            })}
            <button onClick={addScaglione} style={{
              marginTop: 6, background: "transparent", border: `0.5px dashed ${T.borderMd}`,
              borderRadius: 6, color: T.navy, ...mono, fontSize: 10, letterSpacing: "0.08em",
              textTransform: "uppercase", padding: "7px 14px", cursor: "pointer", width: "100%",
            }}>
              + Aggiungi scaglione
            </button>
          </SectionCard>

          {/* Catalogo voci fisse */}
          <SectionCard title="Catalogo voci fisse">
            <div style={{ marginBottom: 14, fontSize: 12, color: T.muted, fontFamily: "'Space Grotesk', sans-serif" }}>
              Voci sempre disponibili nella checklist del preventivo (es. rilievo, pratiche, sicurezza).
            </div>

            {catalogo.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {catalogo.map(v => (
                  <div key={v.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px 80px 32px 32px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, color: v.attiva ? T.ink : T.muted, fontFamily: "'Space Grotesk', sans-serif", textDecoration: v.attiva ? "none" : "line-through" }}>{v.label}</div>
                    <Input type="number" value={String(v.importo_default)} onChange={e => updateVoceImporto(v, e.target.value)} placeholder="0" />
                    <div style={{ textAlign: "center" }}>
                      <button onClick={() => toggleAttiva(v)} style={{
                        background: v.attiva ? T.greenLight : T.surface2,
                        border: `0.5px solid ${v.attiva ? "#1a6b3c40" : T.border}`,
                        borderRadius: 99, ...mono, fontSize: 9, letterSpacing: "0.08em",
                        textTransform: "uppercase", color: v.attiva ? "#1a6b3c" : T.muted,
                        padding: "4px 10px", cursor: "pointer",
                      }}>{v.attiva ? "Attiva" : "Off"}</button>
                    </div>
                    <div />
                    <button onClick={() => deleteVoce(v)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 16, padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Aggiungi nuova voce */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: 8, alignItems: "center" }}>
              <Input value={newVoce.label} onChange={e => setNewVoce(p => ({ ...p, label: e.target.value }))} placeholder="Nome voce (es. Rilievo)" />
              <Input type="number" value={newVoce.importo_default} onChange={e => setNewVoce(p => ({ ...p, importo_default: e.target.value }))} placeholder="Importo €" />
              <button onClick={addVoce} style={{
                background: T.navy, border: "none", borderRadius: 6, color: T.bg,
                ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                padding: "8px 16px", cursor: "pointer", whiteSpace: "nowrap",
              }}>Aggiungi</button>
            </div>
          </SectionCard>

          {/* Salva */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={() => navigate("/preventivi")} style={{
              background: "transparent", border: `0.5px solid ${T.borderMd}`, borderRadius: 8,
              ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
              color: T.muted, padding: "9px 18px", cursor: "pointer",
            }}>Annulla</button>
            <button onClick={handleSave} disabled={saving} style={{
              background: T.navy, border: "none", borderRadius: 8, color: T.bg,
              ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "9px 22px", cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}>{saving ? "Salvataggio…" : "Salva configurazione"}</button>
          </div>
        </>
      )}
    </div>
  );
}
