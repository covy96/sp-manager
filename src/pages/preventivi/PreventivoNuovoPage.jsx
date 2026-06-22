import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useStudio } from "../../hooks/useStudio";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useToast } from "../../contexts/ToastContext";
import { supabase } from "../../lib/supabase";
import { tariffaSettimanale, calcPreventivo } from "../../lib/preventivoCalc";

// ── UI ATOMS ────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  const { T } = useTheme();
  return <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>{children}</div>;
}
function Input({ value, onChange, type = "text", placeholder, style = {}, disabled }) {
  const { T } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        width: "100%", padding: "8px 12px", boxSizing: "border-box",
        border: `0.5px solid ${focus ? T.navy : T.borderMd}`, background: disabled ? T.bg : T.inputBg,
        color: T.ink, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif",
        outline: "none", borderRadius: 6, ...style,
      }} />
  );
}
function SectionCard({ num, title, children }) {
  const { T } = useTheme();
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "13px 20px", borderBottom: `0.5px solid ${T.borderMd}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>{num}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: T.navy, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}
function TotalRow({ label, value, bold, dimmed }) {
  const { T } = useTheme();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `0.5px solid ${T.border}` }}>
      <span style={{ fontSize: 12, color: dimmed ? T.muted : T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{label}</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: bold ? 15 : 12, fontWeight: bold ? 700 : 400, color: dimmed ? T.muted : T.ink }}>
        {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value)}
      </span>
    </div>
  );
}

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(v) || 0);
}

export default function PreventivoNuovoPage() {
  usePageTitleOnMount("Nuovo Preventivo");
  const navigate = useNavigate();
  const { T } = useTheme();
  const { studioId } = useStudio();
  const toast = useToast();

  // Config dal DB
  const [config, setConfig] = useState(null);
  const [catalogoAttivo, setCatalogoAttivo] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [cliente, setCliente] = useState("");
  const [commessaId, setCommessaId] = useState("");
  const [mq, setMq] = useState("");
  const [tariffaMq, setTariffaMq] = useState("");
  const [importoLavori, setImportoLavori] = useState("");
  const [durataSettimane, setDurataSettimane] = useState("");
  // Voci fisse: [{ catalogo_id, label, importo, selected }]
  const [vociFisse, setVociFisse] = useState([]);

  useEffect(() => {
    if (!studioId) return;
    Promise.all([
      supabase.from("preventivo_config").select("*").eq("studio", studioId).maybeSingle(),
      supabase.from("voci_fisse_catalogo").select("*").eq("studio", studioId).eq("attiva", true).order("ordine"),
      supabase.from("commesse").select("id,nome_commessa,numero_offerta,cliente").eq("studio", studioId).is("deleted_at", null).order("created_at", { ascending: false }),
    ]).then(([{ data: cfg }, { data: cat }, { data: comm }]) => {
      setConfig(cfg ?? { tariffa_mq: 0, dl_scaglioni: [], rivalsa_inarcassa_pct: 4 });
      setTariffaMq(String(cfg?.tariffa_mq ?? ""));
      setCatalogoAttivo(cat ?? []);
      setVociFisse((cat ?? []).map(v => ({
        catalogo_id: v.id,
        label: v.label,
        importo: v.importo_default,
        selected: false,
      })));
      setCommesse(comm ?? []);
      setLoading(false);
    });
  }, [studioId]);

  // ── Calcolo live ───────────────────────────────────────────────
  const calc = useMemo(() => {
    const scaglioni = config?.dl_scaglioni ?? [];
    const rivalsaPct = Number(config?.rivalsa_inarcassa_pct) || 4;
    const input = {
      mq: Number(mq) || 0,
      tariffa_mq: Number(tariffaMq) || 0,
      importo_lavori: Number(importoLavori) || 0,
      durata_settimane: Number(durataSettimane) || 0,
      dl_scaglioni: scaglioni,
      voci_fisse: vociFisse.filter(v => v.selected).map(v => ({ importo: Number(v.importo) || 0 })),
      rivalsa_inarcassa_pct: rivalsaPct,
    };
    return calcPreventivo(input);
  }, [mq, tariffaMq, importoLavori, durataSettimane, vociFisse, config]);

  const tariffaRisolta = useMemo(() => {
    if (!config?.dl_scaglioni?.length) return null;
    return tariffaSettimanale(Number(importoLavori) || 0, config.dl_scaglioni);
  }, [importoLavori, config]);

  // ── Salvataggio ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!studioId) return;
    setSaving(true);
    const payload = {
      studio: studioId,
      commessa_id: commessaId || null,
      cliente: cliente.trim() || null,
      mq: Number(mq) || 0,
      tariffa_mq_snapshot: Number(tariffaMq) || 0,
      importo_lavori: Number(importoLavori) || 0,
      durata_settimane: Number(durataSettimane) || 0,
      tariffa_settimanale_snapshot: calc.tariffa_settimanale,
      tot_progettazione: calc.tot_progettazione,
      tot_dl: calc.tot_dl,
      tot_fisse: calc.tot_fisse,
      imponibile: calc.imponibile,
      rivalsa_inarcassa: calc.rivalsa_inarcassa,
      totale: calc.totale,
      stato: "bozza",
    };
    const { data: prev, error } = await supabase.from("preventivi").insert(payload).select().single();
    if (error) { toast?.error("Errore salvataggio: " + error.message); setSaving(false); return; }

    // Righe preventivo_voci
    const voci = [
      { tipo: "progettazione", label: "Progettazione", importo: calc.tot_progettazione, ordine: 1 },
      { tipo: "dl", label: "Direzione Lavori", importo: calc.tot_dl, ordine: 2 },
      ...vociFisse
        .filter(v => v.selected)
        .map((v, i) => ({ tipo: "fissa", label: v.label, importo: Number(v.importo) || 0, ordine: 10 + i })),
    ].map(v => ({ ...v, preventivo_id: prev.id, studio: studioId }));

    if (voci.length) {
      const { error: ve } = await supabase.from("preventivo_voci").insert(voci);
      if (ve) toast?.error("Preventivo creato ma errore voci: " + ve.message);
    }

    toast?.success("Preventivo creato");
    navigate(`/preventivi/${prev.id}`);
  };

  const mono = { fontFamily: "'IBM Plex Mono', monospace" };
  const fg = { fontFamily: "'Space Grotesk', sans-serif" };

  return (
    <div style={{ padding: "28px 24px", maxWidth: 820, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={() => navigate("/preventivi")} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 18, padding: "4px 8px" }}>←</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.ink, ...fg }}>Nuovo Preventivo</h1>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", ...mono, fontSize: 11, color: T.muted }}>Caricamento…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, alignItems: "start" }}>
          <div>
            {/* ── SEZIONE 1: Progettazione ── */}
            <SectionCard num="01" title="Progettazione">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <FieldLabel>Superficie (mq)</FieldLabel>
                  <Input type="number" value={mq} onChange={e => setMq(e.target.value)} placeholder="es. 120" />
                </div>
                <div>
                  <FieldLabel>Tariffa €/mq</FieldLabel>
                  <Input type="number" value={tariffaMq} onChange={e => setTariffaMq(e.target.value)} placeholder="es. 80" />
                </div>
              </div>
              {calc.tot_progettazione > 0 && (
                <div style={{ marginTop: 14, padding: "10px 14px", background: T.navyLight, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ ...mono, fontSize: 10, color: T.navy, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tot. Progettazione</span>
                  <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: T.navy }}>{currency(calc.tot_progettazione)}</span>
                </div>
              )}
            </SectionCard>

            {/* ── SEZIONE 2: Direzione Lavori ── */}
            <SectionCard num="02" title="Direzione Lavori">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <FieldLabel>Importo lavori (€)</FieldLabel>
                  <Input type="number" value={importoLavori} onChange={e => setImportoLavori(e.target.value)} placeholder="es. 200000" />
                </div>
                <div>
                  <FieldLabel>Durata (settimane)</FieldLabel>
                  <Input type="number" value={durataSettimane} onChange={e => setDurataSettimane(e.target.value)} placeholder="es. 12" />
                </div>
              </div>
              {tariffaRisolta !== null && importoLavori && (
                <div style={{ marginTop: 14, display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, padding: "10px 14px", background: T.surface2, borderRadius: 8, border: `0.5px solid ${T.border}` }}>
                    <div style={{ ...mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Tariffa settimanale applicata</div>
                    <div style={{ ...mono, fontSize: 14, fontWeight: 600, color: T.ink }}>{currency(tariffaRisolta)}<span style={{ fontSize: 10, fontWeight: 400, color: T.muted }}>/sett.</span></div>
                  </div>
                  {calc.tot_dl > 0 && (
                    <div style={{ flex: 1, padding: "10px 14px", background: T.navyLight, borderRadius: 8 }}>
                      <div style={{ ...mono, fontSize: 9, color: T.navy, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Tot. Direzione Lavori</div>
                      <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: T.navy }}>{currency(calc.tot_dl)}</div>
                    </div>
                  )}
                </div>
              )}
              {!config?.dl_scaglioni?.length && (
                <div style={{ marginTop: 12, fontSize: 11, color: T.muted, ...fg }}>
                  ⚠ Nessuno scaglione configurato.{" "}
                  <button onClick={() => navigate("/preventivi/config")} style={{ background: "none", border: "none", color: T.navy, cursor: "pointer", fontSize: 11, textDecoration: "underline", padding: 0 }}>
                    Configura →
                  </button>
                </div>
              )}
            </SectionCard>

            {/* ── SEZIONE 3: Voci Fisse ── */}
            <SectionCard num="03" title="Voci fisse">
              {catalogoAttivo.length === 0 ? (
                <div style={{ fontSize: 12, color: T.muted, ...fg }}>
                  Nessuna voce nel catalogo.{" "}
                  <button onClick={() => navigate("/preventivi/config")} style={{ background: "none", border: "none", color: T.navy, cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 0 }}>
                    Aggiungi voci →
                  </button>
                </div>
              ) : (
                vociFisse.map((v, idx) => (
                  <div key={v.catalogo_id} style={{ display: "grid", gridTemplateColumns: "auto 1fr 120px", gap: 12, alignItems: "center", marginBottom: 10 }}>
                    <input type="checkbox" checked={v.selected} onChange={e => setVociFisse(ps => ps.map((x, i) => i === idx ? { ...x, selected: e.target.checked } : x))}
                      style={{ accentColor: T.navy, width: 15, height: 15, cursor: "pointer" }} />
                    <span style={{ fontSize: 13, color: v.selected ? T.ink : T.muted, ...fg, transition: "color 150ms" }}>{v.label}</span>
                    <Input type="number" value={String(v.importo)} onChange={e => setVociFisse(ps => ps.map((x, i) => i === idx ? { ...x, importo: e.target.value } : x))} disabled={!v.selected} style={{ opacity: v.selected ? 1 : 0.5 }} />
                  </div>
                ))
              )}
              {calc.tot_fisse > 0 && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: T.navyLight, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ ...mono, fontSize: 10, color: T.navy, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tot. Voci fisse</span>
                  <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: T.navy }}>{currency(calc.tot_fisse)}</span>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── RIEPILOGO (sticky) ── */}
          <div style={{ position: "sticky", top: 24 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadowMd, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `0.5px solid ${T.borderMd}` }}>
                <div style={{ ...mono, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: T.navy, fontWeight: 600 }}>Riepilogo</div>
              </div>
              <div style={{ padding: "18px" }}>
                <TotalRow label="Progettazione" value={calc.tot_progettazione} dimmed={calc.tot_progettazione === 0} />
                <TotalRow label="Direzione Lavori" value={calc.tot_dl} dimmed={calc.tot_dl === 0} />
                <TotalRow label="Voci fisse" value={calc.tot_fisse} dimmed={calc.tot_fisse === 0} />
                <div style={{ height: 1, background: T.borderMd, margin: "10px 0" }} />
                <TotalRow label="Imponibile" value={calc.imponibile} />
                <TotalRow label="Rivalsa Inarcassa (4%)" value={calc.rivalsa_inarcassa} dimmed />
                <div style={{ height: 1, background: T.borderHeavy, margin: "10px 0" }} />
                <TotalRow label="Totale" value={calc.totale} bold />
              </div>

              {/* Cliente e commessa */}
              <div style={{ padding: "0 18px 18px" }}>
                <div style={{ marginBottom: 12 }}>
                  <FieldLabel>Cliente</FieldLabel>
                  <Input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nome cliente" />
                </div>
                <div>
                  <FieldLabel>Commessa (opzionale)</FieldLabel>
                  <select value={commessaId} onChange={e => setCommessaId(e.target.value)} style={{
                    width: "100%", padding: "8px 12px", border: `0.5px solid ${T.borderMd}`,
                    background: T.inputBg, color: T.ink, fontSize: 13, ...mono, borderRadius: 6, outline: "none",
                  }}>
                    <option value="">— nessuna —</option>
                    {commesse.map(c => (
                      <option key={c.id} value={c.id}>{c.nome_commessa || c.numero_offerta || c.cliente || c.id.slice(0, 8)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ padding: "0 18px 18px" }}>
                <button onClick={handleSave} disabled={saving || calc.totale === 0} style={{
                  width: "100%", background: T.navy, border: "none", borderRadius: 8, color: T.bg,
                  ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
                  padding: "11px 0", cursor: (saving || calc.totale === 0) ? "not-allowed" : "pointer",
                  opacity: (saving || calc.totale === 0) ? 0.5 : 1,
                }}>{saving ? "Salvataggio…" : "Salva preventivo"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
