import { useCallback, useEffect, useRef, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";
import { GROTESKA_VARIANTS } from "../../assets/fonts/groteskaFonts";
import { useEscKey } from "../../hooks/useEscKey";
import SlidingTabs from "../../components/SlidingTabs";

const inputCss = (T) => ({
  padding: "8px 12px",
  border: `1px solid ${T.border}`, borderRadius: T.radiusSm,
  background: T.surface,
  color: T.ink,
  fontSize: 12,
  fontFamily: "'Space Grotesk', sans-serif",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
});

function FL({ children }) {
  const { T } = useTheme();
  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, disabled, ghost, style = {} }) {
  const { T } = useTheme();
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "8px 18px", border: ghost ? `0.5px solid ${T.borderMd}` : "none",
      background: ghost ? "transparent" : T.navy, color: ghost ? T.ink : T.bg,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em",
      textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, ...style,
    }}>{children}</button>
  );
}

// ── Modale anteprima A4 — layout identico al PDF reale ───────────
function PreviewModal({ form, onClose }) {
  const footerFont =
    form.report_footer_font === "times"   ? "Georgia, serif" :
    form.report_footer_font === "courier" ? "'Courier New', monospace" :
    "'Space Grotesk', Arial, sans-serif";

  const PAGE_W = 794;  // 210mm @ 96dpi
  const PAGE_H = 1123; // 297mm @ 96dpi
  const ML = 72; const MR = 72; const MT = 52; const MB = 52;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#4a4a4a", display: "flex", flexDirection: "column", overflow: "hidden" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      {/* barra */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", background: "#333", borderBottom: "1px solid #222" }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#aaa" }}>
          Anteprima PDF — A4 (210 × 297 mm)
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#aaa", lineHeight: 1, padding: "0 4px" }}>×</button>
      </div>

      {/* area scroll */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", display: "flex", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{
          width: PAGE_W, minHeight: PAGE_H, flexShrink: 0,
          background: "#fff", boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column",
          paddingTop: MT, paddingBottom: MB, paddingLeft: ML, paddingRight: MR,
          boxSizing: "border-box", fontFamily: footerFont,
        }}>

          {/* ── TOP: logo in alto a destra ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            {form.report_logo_url ? (
              <img src={form.report_logo_url} alt="logo" style={{
                height: form.report_logo_size === "small" ? 32 : form.report_logo_size === "large" ? 60 : 44,
                maxWidth: form.report_logo_size === "small" ? 90 : form.report_logo_size === "large" ? 160 : 120,
                objectFit: "contain",
              }} />
            ) : (
              <div style={{ width: 44, height: 44, background: "#f0f0f0", border: "0.5px dashed #ccc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 9, color: "#bbb", fontFamily: "'IBM Plex Mono', monospace" }}>LOGO</span>
              </div>
            )}
          </div>

          {/* ── Linea blu ── */}
          <div style={{ borderTop: "1.5px solid #13315C", marginBottom: 16 }} />

          {/* ── Titolo centrato (report_header_name) ── */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#13315C", letterSpacing: "0.02em", fontFamily: "'Space Grotesk', sans-serif" }}>
              {form.report_header_name || <span style={{ color: "#ccc", fontStyle: "italic", fontWeight: 400 }}>Nome studio nel PDF</span>}
            </span>
          </div>

          {/* ── Tabella info progetto ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
            {[
              ["Progetto:",   "Nome del progetto"],
              ["Cliente:",    "Nome del cliente"],
              ["Luogo:",      "Via Example 1, Milano"],
              ["Data e ora:", "04/06/2026, 13:10"],
              ["Report N.:",  "1"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", gap: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#222", minWidth: 120, fontFamily: footerFont }}>{label}</span>
                <span style={{ fontSize: 12, color: "#444", fontFamily: footerFont }}>{value}</span>
              </div>
            ))}
          </div>

          {/* ── Sezione REPORT (titolo + note) ── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#13315C", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
              Report
            </div>
            <div style={{ fontSize: 12, color: "#444", lineHeight: 1.8 }}>
              Testo delle note del sopralluogo...
            </div>
          </div>

          {/* ── Foto placeholder ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            {[1,2].map(n => (
              <div key={n} style={{ height: 140, background: "#f5f5f5", border: "0.5px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 10, color: "#ccc", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.1em" }}>FOTO {n}</span>
              </div>
            ))}
          </div>

          {/* spacer */}
          <div style={{ flex: 1 }} />

          {/* ── Footer ── */}
          <div style={{ borderTop: "0.5px solid #ccc", paddingTop: 10 }}>
            {(() => {
              const L = (form.report_footer_left  || "").replace(/\{pagina\}/g,"1").replace(/\{totale\}/g,"3").trim();
              const C = (form.report_footer_center|| "").replace(/\{pagina\}/g,"1").replace(/\{totale\}/g,"3").trim();
              const R = (form.report_footer_right || "").replace(/\{pagina\}/g,"1").replace(/\{totale\}/g,"3").trim();
              const hasFooter = L || C || R;
              // Se solo centro (o nessuno) → testo centrato a larghezza piena, come nel PDF reale
              if (!L && !R && C) {
                return (
                  <div style={{ textAlign: "center", fontSize: 10, color: "#888", whiteSpace: "pre-line", lineHeight: 1.7 }}>{C}</div>
                );
              }
              // Se compilate più colonne → layout 3 colonne proporzionale
              if (hasFooter) {
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 10, color: "#888" }}>
                    <div style={{ textAlign: "left",   whiteSpace: "pre-line", lineHeight: 1.6 }}>{L}</div>
                    <div style={{ textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.6 }}>{C}</div>
                    <div style={{ textAlign: "right",  whiteSpace: "pre-line", lineHeight: 1.6 }}>{R}</div>
                  </div>
                );
              }
              // Fallback: report_header_text centrato
              return form.report_header_text ? (
                <div style={{ textAlign: "center", fontSize: 10, color: "#888", whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.report_header_text}</div>
              ) : (
                <div style={{ textAlign: "center", fontSize: 10, color: "#ddd", fontStyle: "italic" }}>footer</div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportImpostazioniPage() {
  usePageTitleOnMount("Impostazioni Report");
  const { T } = useTheme();
  const { studioId } = useStudio();
  const fileRef = useRef(null);
  const inputSt = inputCss(T);

  const [form, setForm] = useState({
    report_header_name: "",
    report_header_text: "",
    report_logo_url: "",
    report_logo_size: "medium",
    report_footer_left: "",
    report_footer_center: "",
    report_footer_right: "",
    report_footer_font: "helvetica",
    report_body_font_enabled: false,
  });

  const [saving, setSaving]           = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [msg, setMsg]                 = useState("");
  const [confirmAll, setConfirmAll]   = useState(false);
  const [reportCount, setReportCount] = useState(0);
  const [projects, setProjects]       = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [search, setSearch]           = useState("");
  const [showPreview, setShowPreview] = useState(false);
  useEscKey(() => setShowPreview(false), showPreview);

  // ── carica dati ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!studioId) return;
    const [{ data: st }, , { data: projs }] = await Promise.all([
      supabase.from("studios")
        .select("report_header_name,report_header_text,report_logo_url,report_logo_size,report_footer_left,report_footer_center,report_footer_right,report_footer_font,report_body_font_enabled,report_excluded_projects")
        .eq("id", studioId).single(),
      supabase.from("report_cantiere").select("id", { count: "exact", head: true }).eq("studio", studioId).is("deleted_at", null),
      supabase.from("projects").select("id,name").eq("studio", studioId).eq("archived", false).order("name", { ascending: true }),
    ]);
    if (st) {
      setForm({
        report_header_name:       st.report_header_name       ?? "",
        report_header_text:       st.report_header_text       ?? "",
        report_logo_url:          st.report_logo_url          ?? "",
        report_logo_size:         st.report_logo_size         ?? "medium",
        report_footer_left:       st.report_footer_left       ?? "",
        report_footer_center:     st.report_footer_center     ?? "",
        report_footer_right:      st.report_footer_right      ?? "",
        report_footer_font:       st.report_footer_font       ?? "helvetica",
        report_body_font_enabled: st.report_body_font_enabled ?? false,
      });
      const excluded = Array.isArray(st.report_excluded_projects) ? st.report_excluded_projects : [];
      setProjects((projs || []).map(p => ({ ...p, excluded: excluded.includes(p.id) })));
    }
    setLoadingProjects(false);
  }, [studioId]);

  useEffect(() => { load(); }, [load]);

  // conta report separatamente
  useEffect(() => {
    if (!studioId) return;
    supabase.from("report_cantiere").select("id", { count: "exact", head: true }).eq("studio", studioId).is("deleted_at", null)
      .then(({ count }) => setReportCount(count ?? 0));
  }, [studioId]);

  // ── salva ─────────────────────────────────────────────────────────
  const doSave = async (updateExisting) => {
    setSaving(true); setMsg(""); setConfirmAll(false);
    const snapshot = {
      report_header_name:       form.report_header_name       || null,
      report_header_text:       form.report_header_text       || null,
      report_logo_url:          form.report_logo_url          || null,
      report_logo_size:         form.report_logo_size         || "medium",
      report_footer_left:       form.report_footer_left       || null,
      report_footer_center:     form.report_footer_center     || null,
      report_footer_right:      form.report_footer_right      || null,
      report_footer_font:       form.report_footer_font       || "helvetica",
      report_body_font_enabled: form.report_body_font_enabled ?? false,
      report_excluded_projects: projects.filter(p => p.excluded).map(p => p.id),
    };
    const { error } = await supabase.from("studios").update(snapshot).eq("id", studioId);
    if (error) { setSaving(false); setMsg("Errore: " + error.message); return; }
    if (updateExisting) {
      await supabase.from("report_cantiere").update({ header_snapshot: snapshot }).eq("studio", studioId).is("deleted_at", null);
    }
    setSaving(false);
    setMsg(updateExisting ? "Salvato e aggiornato su tutti i report!" : "Impostazioni salvate!");
    setTimeout(() => setMsg(""), 3000);
  };

  const handleSave = () => { if (reportCount > 0) setConfirmAll(true); else doSave(false); };

  // ── upload logo ────────────────────────────────────────────────────
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setMsg("");
    const ext = file.name.split(".").pop();
    const path = `${studioId}/logo.${ext}`;
    const { error: upErr } = await supabase.storage.from("report-logos").upload(path, file, { upsert: true });
    if (upErr) { setMsg("Errore upload: " + upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("report-logos").getPublicUrl(path);
    const newUrl = publicUrl + "?t=" + Date.now();
    setForm(f => ({ ...f, report_logo_url: newUrl }));
    await supabase.from("studios").update({ report_logo_url: newUrl }).eq("id", studioId);
    const { data: existing } = await supabase.from("report_cantiere").select("id, header_snapshot").eq("studio", studioId).is("deleted_at", null);
    if (existing?.length) {
      await Promise.all(existing.map(r =>
        supabase.from("report_cantiere").update({ header_snapshot: { ...(r.header_snapshot || {}), report_logo_url: newUrl } }).eq("id", r.id)
      ));
    }
    setMsg("Logo caricato!"); setTimeout(() => setMsg(""), 3000);
    setUploading(false);
  };

  const toggleProject = (id) => setProjects(ps => ps.map(p => p.id === id ? { ...p, excluded: !p.excluded } : p));

  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header con titolo + azioni */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: "-0.02em", marginBottom: 4 }}>
            Impostazioni Report di Cantiere
          </h2>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>
            Template PDF applicato a tutti i report del tuo studio.
          </p>
        </div>
        {/* Azioni in alto a destra */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <Btn ghost onClick={() => setShowPreview(true)}>⬚ Anteprima</Btn>
          <Btn onClick={handleSave} disabled={saving}>{saving ? "Salvataggio..." : "Salva impostazioni"}</Btn>
        </div>
      </div>

      {/* msg */}
      {msg && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: msg.startsWith("Errore") ? "#ef4444" : "#16a34a", padding: "8px 12px", background: msg.startsWith("Errore") ? "#fef2f2" : "#f0fdf4", border: `1px solid ${msg.startsWith("Errore") ? "#fca5a5" : "#86efac"}` }}>
          {msg}
        </div>
      )}

      {/* confirmAll */}
      {confirmAll && (
        <div style={{ background: T.navyLight, border: `1px solid ${T.navy}`, borderRadius: T.radiusSm, padding: "16px 18px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 6 }}>Aggiornare anche i report esistenti?</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginBottom: 14 }}>
            Hai {reportCount} report salvati. Vuoi applicare la nuova intestazione anche a quelli già creati?
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => doSave(true)} disabled={saving}>{saving ? "..." : "Sì, aggiorna tutti"}</Btn>
            <Btn ghost onClick={() => doSave(false)} disabled={saving}>No, solo i nuovi</Btn>
            <Btn ghost onClick={() => setConfirmAll(false)} disabled={saving}>Annulla</Btn>
          </div>
        </div>
      )}

      {/* Layout principale: sinistra (form) + destra (progetti) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" }}>

        {/* ── COLONNA SINISTRA ──────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* INTESTAZIONE PDF */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted }}>Intestazione PDF</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
              {/* Logo */}
              <div>
                <FL>Logo studio</FL>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {form.report_logo_url && (
                    <img src={form.report_logo_url} alt="logo" style={{ height: 44, maxWidth: 140, objectFit: "contain", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 4, background: "#fff" }} />
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                  <Btn onClick={() => fileRef.current?.click()} disabled={uploading} ghost>
                    {uploading ? "..." : form.report_logo_url ? "Cambia" : "Carica logo"}
                  </Btn>
                  {form.report_logo_url && <Btn ghost onClick={() => setForm(f => ({ ...f, report_logo_url: "" }))}>Rimuovi</Btn>}
                </div>
                {form.report_logo_url && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                    <SlidingTabs
                      tabs={[{ key:"small", label:"S" }, { key:"medium", label:"M" }, { key:"large", label:"L" }]}
                      active={form.report_logo_size || "medium"}
                      onChange={val => setForm(f => ({ ...f, report_logo_size: val }))}
                    />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>dimensione logo</span>
                  </div>
                )}
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 6 }}>PNG consigliato · appare in alto a destra</div>
              </div>

              {/* Font */}
              <div>
                <FL>Font documento</FL>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[{ val:"helvetica", label:"Helvetica" },{ val:"times", label:"Times" },{ val:"courier", label:"Courier" }].map(({ val, label }) => {
                      const sel = form.report_footer_font === val;
                      return (
                        <button key={val} onClick={() => setForm(f => ({ ...f, report_footer_font: val, report_body_font_enabled: false }))}
                          style={{ padding: "5px 12px", border: `1px solid ${sel ? T.navy : T.borderMd}`, borderRadius: T.radiusSm, background: sel ? T.navyLight : "transparent", color: sel ? T.navy : T.ink, cursor: "pointer", fontSize: 11 }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: T.muted, marginBottom: 4, letterSpacing: "0.1em" }}>GROTESKA</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {GROTESKA_VARIANTS.map(g => {
                        const sel = form.report_footer_font === g.key;
                        return (
                          <button key={g.key} onClick={() => setForm(f => ({ ...f, report_footer_font: g.key }))}
                            style={{ padding: "5px 12px", border: `1px solid ${sel ? T.navy : T.borderMd}`, borderRadius: T.radiusSm, background: sel ? T.navyLight : "transparent", color: sel ? T.navy : T.ink, cursor: "pointer", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>
                            {g.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {GROTESKA_VARIANTS.find(g => g.key === form.report_footer_font) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, padding: "8px 10px", background: T.bg, border: `1px solid ${T.border}` }}>
                      <button onClick={() => setForm(f => ({ ...f, report_body_font_enabled: !f.report_body_font_enabled }))}
                        style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s", background: form.report_body_font_enabled ? T.navy : T.borderMd }}>
                        <div style={{ position: "absolute", top: 2, left: form.report_body_font_enabled ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                      </button>
                      <div>
                        <div style={{ fontSize: 12, color: T.ink, fontWeight: 500 }}>Applica a tutto il documento</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: T.muted, marginTop: 1 }}>Titolo → Bold · Etichette → Regular · Testo → Book</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Nome studio + testo */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <FL>Nome studio nel PDF</FL>
                <input type="text" value={form.report_header_name} onChange={e => setForm(f => ({ ...f, report_header_name: e.target.value }))} placeholder="Es. Studio Prini" style={inputSt} />
              </div>
              <div>
                <FL>Testo sotto il nome</FL>
                <textarea value={form.report_header_text} onChange={e => setForm(f => ({ ...f, report_header_text: e.target.value }))} rows={3} style={{ ...inputSt, resize: "vertical", lineHeight: 1.5 }} placeholder="Via, telefono, email, P.IVA..." />
              </div>
            </div>

            {/* Anteprima intestazione */}
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "14px 18px" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, marginBottom: 10 }}>Anteprima intestazione</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.navy, minHeight: 20 }}>{form.report_header_name || ""}</div>
                  <div style={{ fontSize: 9, color: T.muted, marginTop: 4, whiteSpace: "pre-line", lineHeight: 1.7 }}>{form.report_header_text || ""}</div>
                </div>
                {form.report_logo_url && (
                  <img src={form.report_logo_url} alt="logo" style={{ height: 36, maxWidth: 110, objectFit: "contain", marginLeft: 12 }} />
                )}
              </div>
              <div style={{ borderTop: `0.5px solid ${T.navy}`, marginTop: 10, paddingTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.navy, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>Titolo del report PDF</div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted }}>Piè di pagina (footer)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[["report_footer_left","Sinistra"],["report_footer_center","Centro"],["report_footer_right","Destra"]].map(([field,label]) => (
                <div key={field}>
                  <FL>{label}</FL>
                  <textarea value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    rows={3} style={{ ...inputSt, resize: "vertical", lineHeight: 1.6 }} />
                </div>
              ))}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>
              Usa <strong style={{ color: T.ink }}>{"{pagina}"}</strong> e <strong style={{ color: T.ink }}>{"{totale}"}</strong> per la numerazione automatica.
            </div>
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "10px 14px" }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>Anteprima footer</div>
              <div style={{ height: 1, background: "rgba(150,150,150,0.4)", marginBottom: 8 }} />
              {(() => {
                const L = form.report_footer_left?.trim();
                const C = form.report_footer_center?.trim();
                const R = form.report_footer_right?.trim();
                if (!L && !R && C) {
                  // solo centro → larghezza piena centrata
                  return (
                    <div style={{ textAlign: "center", fontSize: 9, color: T.muted, whiteSpace: "pre-line", lineHeight: 1.6 }}>
                      {C.replace(/\{pagina\}/g,"1").replace(/\{totale\}/g,"3")}
                    </div>
                  );
                }
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 9, color: T.muted }}>
                    {[["report_footer_left","SINISTRA","left"],["report_footer_center","CENTRO","center"],["report_footer_right","DESTRA","right"]].map(([field,lbl,align]) => (
                      <div key={field} style={{ borderLeft: `2px solid ${T.border}`, paddingLeft: 6, textAlign: align }}>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: T.muted, marginBottom: 3, opacity: 0.6 }}>{lbl}</div>
                        {(form[field] || "").split("\n").map((line,i) => (
                          <div key={i} style={{ minHeight: 13 }}>{line ? line.replace(/\{pagina\}/g,"1").replace(/\{totale\}/g,"3") : <span style={{ opacity: 0.25 }}>—</span>}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ── COLONNA DESTRA: PROGETTI ──────────────────────────────── */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 16 }}>
          <div style={{ padding: "14px 16px", borderBottom: `0.5px solid ${T.border}` }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, marginBottom: 8 }}>Applica a questi progetti</div>
            {/* Barra ricerca */}
            <input
              type="text"
              placeholder="Cerca progetto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputSt, fontSize: 11, padding: "6px 10px" }}
            />
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 8, lineHeight: 1.5 }}>
              Attivo su tutti per default. Disattiva quelli da escludere.
            </div>
          </div>

          <div style={{ overflowY: "auto", maxHeight: 480 }}>
            {loadingProjects ? (
              <div style={{ padding: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
            ) : filteredProjects.length === 0 ? (
              <div style={{ padding: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
                {search ? "Nessun risultato." : "Nessun progetto attivo."}
              </div>
            ) : (
              filteredProjects.map((p, i) => (
                <div key={p.id} onClick={() => toggleProject(p.id)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 16px", cursor: "pointer",
                  borderTop: i > 0 ? `0.5px solid ${T.border}` : "none",
                  background: p.excluded ? "rgba(255,69,58,0.04)" : "transparent",
                }}>
                  <span style={{ fontSize: 12, color: p.excluded ? T.muted : T.ink, textDecoration: p.excluded ? "line-through" : "none", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 10 }}>{p.name}</span>
                  <div style={{ width: 32, height: 18, borderRadius: 9, border: "none", cursor: "pointer", position: "relative", flexShrink: 0, background: p.excluded ? T.borderMd : T.navy, transition: "background 0.15s" }}>
                    <div style={{ position: "absolute", top: 1, left: p.excluded ? 1 : 15, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* contatore */}
          <div style={{ padding: "10px 16px", borderTop: `0.5px solid ${T.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>
            {projects.filter(p => !p.excluded).length}/{projects.length} progetti attivi
          </div>
        </div>
      </div>

      {/* Anteprima modale */}
      {showPreview && <PreviewModal form={form} onClose={() => setShowPreview(false)} />}
    </div>
  );
}
