import { useCallback, useEffect, useRef, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";
import { GROTESKA_VARIANTS } from "../../assets/fonts/groteskaFonts";

const inputCss = (T) => ({
  padding: "8px 12px",
  border: `0.5px solid ${T.border}`,
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
  const [projects, setProjects]       = useState([]);   // { id, name, excluded }
  const [loadingProjects, setLoadingProjects] = useState(true);

  // ── carica dati ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!studioId) return;
    const [{ data: st }, { data: reps }, { data: projs }] = await Promise.all([
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
      // Progetti esclusi salvati come array di id
      const excluded = Array.isArray(st.report_excluded_projects) ? st.report_excluded_projects : [];
      setProjects((projs || []).map(p => ({ ...p, excluded: excluded.includes(p.id) })));
    }
    setReportCount(reps?.length ?? 0);
    setLoadingProjects(false);
  }, [studioId]);

  useEffect(() => { load(); }, [load]);

  // ── salva impostazioni ─────────────────────────────────────────────
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
      await supabase.from("report_cantiere")
        .update({ header_snapshot: snapshot })
        .eq("studio", studioId).is("deleted_at", null);
    }
    setSaving(false);
    setMsg(updateExisting ? "Salvato e aggiornato su tutti i report!" : "Impostazioni salvate!");
    setTimeout(() => setMsg(""), 3000);
  };

  const handleSave = () => {
    if (reportCount > 0) setConfirmAll(true);
    else doSave(false);
  };

  // ── upload logo ────────────────────────────────────────────────────
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMsg("");
    const ext  = file.name.split(".").pop();
    const path = `${studioId}/logo.${ext}`;
    const { error: upErr } = await supabase.storage.from("report-logos").upload(path, file, { upsert: true });
    if (upErr) { setMsg("Errore upload: " + upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("report-logos").getPublicUrl(path);
    const newUrl = publicUrl + "?t=" + Date.now();
    setForm(f => ({ ...f, report_logo_url: newUrl }));
    await supabase.from("studios").update({ report_logo_url: newUrl }).eq("id", studioId);
    // Aggiorna anche snapshot esistenti
    const { data: existing } = await supabase.from("report_cantiere").select("id, header_snapshot").eq("studio", studioId).is("deleted_at", null);
    if (existing?.length) {
      await Promise.all(existing.map(r =>
        supabase.from("report_cantiere").update({ header_snapshot: { ...(r.header_snapshot || {}), report_logo_url: newUrl } }).eq("id", r.id)
      ));
    }
    setMsg("Logo caricato!"); setTimeout(() => setMsg(""), 3000);
    setUploading(false);
  };

  const toggleProject = (id) => {
    setProjects(ps => ps.map(p => p.id === id ? { ...p, excluded: !p.excluded } : p));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 780 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: "-0.02em", marginBottom: 4 }}>
          Impostazioni Report di Cantiere
        </h2>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>
          Template PDF applicato a tutti i report del tuo studio.
        </p>
      </div>

      {/* ── LOGO + FONT ─────────────────────────────────────────────── */}
      <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted }}>Intestazione PDF</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          {/* Logo */}
          <div>
            <FL>Logo studio</FL>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {form.report_logo_url && (
                <img src={form.report_logo_url} alt="logo" style={{ height: 44, maxWidth: 140, objectFit: "contain", border: `0.5px solid ${T.border}`, padding: 4, background: "#fff" }} />
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
              <Btn onClick={() => fileRef.current?.click()} disabled={uploading} ghost>
                {uploading ? "..." : form.report_logo_url ? "Cambia" : "Carica logo"}
              </Btn>
              {form.report_logo_url && (
                <Btn ghost onClick={() => setForm(f => ({ ...f, report_logo_url: "" }))}>Rimuovi</Btn>
              )}
            </div>
            {form.report_logo_url && (
              <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                {[["small","S"],["medium","M"],["large","L"]].map(([val,lbl]) => (
                  <button key={val} onClick={() => setForm(f => ({ ...f, report_logo_size: val }))}
                    style={{ width: 28, height: 28, border: `0.5px solid ${form.report_logo_size === val ? T.navy : T.borderMd}`, background: form.report_logo_size === val ? T.navyLight : "transparent", color: form.report_logo_size === val ? T.navy : T.muted, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600 }}>
                    {lbl}
                  </button>
                ))}
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, alignSelf: "center", marginLeft: 4 }}>dimensione</span>
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
                      style={{ padding: "5px 12px", border: `0.5px solid ${sel ? T.navy : T.borderMd}`, background: sel ? T.navyLight : "transparent", color: sel ? T.navy : T.ink, cursor: "pointer", fontSize: 11 }}>
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
                        style={{ padding: "5px 12px", border: `0.5px solid ${sel ? T.navy : T.borderMd}`, background: sel ? T.navyLight : "transparent", color: sel ? T.navy : T.ink, cursor: "pointer", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {GROTESKA_VARIANTS.find(g => g.key === form.report_footer_font) && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, padding: "8px 10px", background: T.bg, border: `0.5px solid ${T.border}` }}>
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
        <div style={{ background: T.bg, border: `0.5px solid ${T.border}`, padding: "14px 18px" }}>
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

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
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
        {/* Anteprima footer */}
        <div style={{ background: T.bg, border: `0.5px solid ${T.border}`, padding: "10px 14px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: T.muted, marginBottom: 6 }}>Anteprima footer</div>
          <div style={{ height: 1, background: "rgba(150,150,150,0.4)", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8, fontSize: 9, color: T.muted }}>
            {[["report_footer_left","SINISTRA","left"],["report_footer_center","CENTRO","center"],["report_footer_right","DESTRA","right"]].map(([field,lbl,align]) => (
              <div key={field} style={{ flex: 1, borderLeft: `2px solid ${T.border}`, paddingLeft: 6, textAlign: align }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: T.muted, marginBottom: 3, opacity: 0.6 }}>{lbl}</div>
                {(form[field] || "").split("\n").map((line,i) => (
                  <div key={i} style={{ minHeight: 13 }}>{line ? line.replace(/\{pagina\}/g,"1").replace(/\{totale\}/g,"3") : <span style={{ opacity: 0.25 }}>—</span>}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROGETTI ────────────────────────────────────────────────── */}
      <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, marginBottom: 4 }}>Applica a questi progetti</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>
            Il template è attivo su tutti i progetti per default. Deseleziona quelli che vuoi escludere.
          </div>
        </div>
        {loadingProjects ? (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
        ) : projects.length === 0 ? (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Nessun progetto attivo.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {projects.map((p, i) => (
              <div key={p.id} onClick={() => toggleProject(p.id)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", cursor: "pointer",
                borderTop: i > 0 ? `0.5px solid ${T.border}` : "none",
                background: p.excluded ? "rgba(255,69,58,0.04)" : "transparent",
              }}>
                <span style={{ fontSize: 13, color: p.excluded ? T.muted : T.ink, textDecoration: p.excluded ? "line-through" : "none" }}>{p.name}</span>
                <div style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", position: "relative", flexShrink: 0, background: p.excluded ? T.borderMd : T.navy }}>
                  <div style={{ position: "absolute", top: 2, left: p.excluded ? 2 : 18, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SALVA ───────────────────────────────────────────────────── */}
      {msg && (
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: msg.startsWith("Errore") ? "#ef4444" : "#16a34a", padding: "8px 12px", background: msg.startsWith("Errore") ? "#fef2f2" : "#f0fdf4", border: `0.5px solid ${msg.startsWith("Errore") ? "#fca5a5" : "#86efac"}` }}>
          {msg}
        </div>
      )}

      {confirmAll && (
        <div style={{ background: T.navyLight, border: `1px solid ${T.navy}`, padding: "16px 18px" }}>
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

      {!confirmAll && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn onClick={handleSave} disabled={saving}>{saving ? "Salvataggio..." : "Salva impostazioni"}</Btn>
        </div>
      )}
    </div>
  );
}
