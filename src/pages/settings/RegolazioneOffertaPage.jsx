import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import {
  SEZIONI, BLOCCHI_FISSI, MODALITA_PAGAMENTO, INQUADRAMENTO,
  RATE_C_DEFAULT, DEFAULTS_BASE,
} from "../../lib/offertaTemplate";

const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const pulisci = (t) => String(t).replace(/\*\*/g, "");

export default function RegolazioneOffertaPage() {
  const { T } = useTheme();
  const showToast = useToast();
  usePageTitleOnMount("Regolazione offerta");
  const { studioId, studio } = useStudio();

  const [ov, setOv]         = useState({});     // override su studio.offerta_template
  const [saving, setSaving] = useState(false);
  const [open, setOpen]     = useState({ flag: true }); // sezioni collassabili
  const [sezOpen, setSezOpen] = useState({});   // sotto-sezioni "Sezioni e voci"

  // Preset rapidi (voci_offerta_template)
  const [preset, setPreset]       = useState([]);
  const [newNome, setNewNome]     = useState("");
  const [newPrezzo, setNewPrezzo] = useState("");
  // Logo copertina
  const [coverLogoUrl, setCoverLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    setOv(studio?.offerta_template && typeof studio.offerta_template === "object"
      ? JSON.parse(JSON.stringify(studio.offerta_template)) : {});
    setCoverLogoUrl(studio?.offerta_logo_url || "");
  }, [studio?.id]);

  const handleCoverLogoUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingLogo(true);
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${studioId}/offerta-cover-logo.${ext}`;
    const { error: upErr } = await supabase.storage.from("report-logos").upload(path, file, { upsert: true });
    if (upErr) { showToast("Errore upload: " + upErr.message, "error"); setUploadingLogo(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("report-logos").getPublicUrl(path);
    const newUrl = publicUrl + "?t=" + Date.now();
    await supabase.from("studios").update({ offerta_logo_url: newUrl }).eq("id", studioId);
    setCoverLogoUrl(newUrl);
    showToast("Logo copertina caricato", "success");
    setUploadingLogo(false);
  };
  const removeCoverLogo = async () => {
    await supabase.from("studios").update({ offerta_logo_url: null }).eq("id", studioId);
    setCoverLogoUrl("");
    showToast("Logo copertina rimosso", "success");
  };

  useEffect(() => { if (studioId) loadPreset(); }, [studioId]);
  const loadPreset = async () => {
    const { data } = await supabase.from("voci_offerta_template").select("*").eq("studio", studioId).order("order", { ascending: true }).order("created_at", { ascending: true });
    setPreset(data || []);
  };

  // ── stili ────────────────────────────────────────────────────────────────
  const inputSt = { width: "100%", padding: "7px 10px", boxSizing: "border-box", border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12.5, fontFamily: "'Space Grotesk', sans-serif", outline: "none" };
  const labelSt = { ...mono, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: T.muted, marginBottom: 6 };
  const cardSt = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, marginBottom: 14, overflow: "hidden" };

  const Check = ({ checked, onChange }) => (
    <input type="checkbox" checked={!!checked} onChange={onChange} style={{ accentColor: T.navy, width: 14, height: 14, flexShrink: 0, cursor: "pointer" }} />
  );

  // ── accessor / mutatori override ───────────────────────────────────────────
  const getDefault = (k) => { const d = ov.defaults || {}; return d[k] !== undefined ? d[k] : DEFAULTS_BASE[k]; };
  const setDefault = (k, v) => setOv(o => ({ ...o, defaults: { ...(o.defaults || {}), [k]: v } }));
  const toggleInArray = (k, id) => {
    const cur = getDefault(k) || [];
    setDefault(k, cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };

  const getSez = (sid) => ov.sezioni?.[sid] || {};
  const setSez = (sid, patch) => setOv(o => ({ ...o, sezioni: { ...(o.sezioni || {}), [sid]: { ...(o.sezioni?.[sid] || {}), ...patch } } }));
  const setVoceOv = (sid, vid, patch) => setOv(o => {
    const sez = o.sezioni?.[sid] || {};
    return { ...o, sezioni: { ...(o.sezioni || {}), [sid]: { ...sez, voci: { ...(sez.voci || {}), [vid]: { ...(sez.voci?.[vid] || {}), ...patch } } } } };
  });
  const addVoceExtra = (sid) => setOv(o => {
    const sez = o.sezioni?.[sid] || {};
    const extra = Array.isArray(sez.vociExtra) ? sez.vociExtra : [];
    return { ...o, sezioni: { ...(o.sezioni || {}), [sid]: { ...sez, vociExtra: [...extra, { id: `x${Date.now().toString(36)}`, testo: "", prezzo: true, prezzoLabel: "", prezzoDefault: "" }] } } };
  });
  const setVoceExtra = (sid, idx, patch) => setOv(o => {
    const sez = o.sezioni?.[sid] || {};
    return { ...o, sezioni: { ...(o.sezioni || {}), [sid]: { ...sez, vociExtra: (sez.vociExtra || []).map((v, i) => i === idx ? { ...v, ...patch } : v) } } };
  });
  const removeVoceExtra = (sid, idx) => setOv(o => {
    const sez = o.sezioni?.[sid] || {};
    return { ...o, sezioni: { ...(o.sezioni || {}), [sid]: { ...sez, vociExtra: (sez.vociExtra || []).filter((_, i) => i !== idx) } } };
  });
  // Riordina le voci di una sezione salvando l'ordine completo degli id.
  const moveVoce = (sid, ord, pos, dir) => {
    const j = pos + dir;
    if (j < 0 || j >= ord.length) return;
    const arr = [...ord];
    [arr[pos], arr[j]] = [arr[j], arr[pos]];
    setSez(sid, { ordine: arr });
  };

  const getBloc = (id, field, def) => { const b = ov.blocchi?.[id] || {}; return b[field] !== undefined ? b[field] : def; };
  const setBloc = (id, patch) => setOv(o => ({ ...o, blocchi: { ...(o.blocchi || {}), [id]: { ...(o.blocchi?.[id] || {}), ...patch } } }));

  const rateC = ov.pagamento?.rateCDefault || RATE_C_DEFAULT;
  const setRateC = (arr) => setOv(o => ({ ...o, pagamento: { ...(o.pagamento || {}), rateCDefault: arr } }));

  // ── salvataggio ────────────────────────────────────────────────────────────
  const salva = async () => {
    setSaving(true);
    const { error } = await supabase.from("studios").update({ offerta_template: ov }).eq("id", studioId);
    setSaving(false);
    if (error) { showToast("Errore salvataggio: " + error.message, "error"); return; }
    showToast("Regolazione salvata", "success");
  };

  const resetTutto = async () => {
    if (!confirm("Ripristinare tutti i valori di default? Le personalizzazioni verranno perse.")) return;
    setOv({});
    setSaving(true);
    await supabase.from("studios").update({ offerta_template: {} }).eq("id", studioId);
    setSaving(false);
    showToast("Ripristinato ai default", "success");
  };

  // Preset rapidi CRUD
  const addPreset = async (e) => {
    e.preventDefault();
    if (!newNome.trim()) return;
    await supabase.from("voci_offerta_template").insert({ studio: studioId, nome: newNome.trim(), prezzo_default: Number(newPrezzo) || 0, order: preset.length });
    setNewNome(""); setNewPrezzo(""); await loadPreset();
  };
  const delPreset = async (id) => { if (!confirm("Eliminare questa voce preset?")) return; await supabase.from("voci_offerta_template").delete().eq("id", id); await loadPreset(); };

  const Header = ({ id, titolo, sub }) => (
    <div onClick={() => setOpen(o => ({ ...o, [id]: !o[id] }))}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", cursor: "pointer", borderBottom: open[id] ? `0.5px solid ${T.border}` : "none" }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{titolo}</div>
        {sub && <div style={{ ...mono, fontSize: 9.5, color: T.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <span style={{ color: T.muted, fontSize: 12 }}>{open[id] ? "▲" : "▼"}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 760, paddingBottom: 80 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: "-0.02em", marginBottom: 4 }}>Regolazione offerta</div>
        <div style={{ ...mono, fontSize: 10, color: T.muted, lineHeight: 1.6 }}>
          Personalizza il documento d'offerta per il tuo studio: testi fissi, flag di default, prezzi
          precompilati e voci. Le modifiche valgono per le nuove offerte. Nei testi: <b>«…»</b> = campo
          da compilare, <b>**…**</b> = grassetto.
        </div>
      </div>

      {/* ── Logo copertina ─────────────────────────────────────────────────── */}
      <div style={cardSt}>
        <div style={{ padding: "14px 18px" }}>
          <div style={{ ...labelSt, marginBottom: 8 }}>Logo copertina</div>
          <div style={{ ...mono, fontSize: 9.5, color: T.muted, marginBottom: 12, lineHeight: 1.5 }}>
            Immagine mostrata in copertina del documento d'offerta (PDF/Word). Se vuoto, si usa il logo dei report. PNG con sfondo trasparente consigliato.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {coverLogoUrl
              ? <img src={coverLogoUrl} alt="logo copertina" style={{ height: 48, maxWidth: 240, objectFit: "contain", border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: 6, background: "#fff" }} />
              : <div style={{ ...mono, fontSize: 10, color: T.muted, height: 48, display: "flex", alignItems: "center" }}>Nessun logo copertina</div>}
            <label style={{ ...mono, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", border: `0.5px solid ${T.navy}`, borderRadius: T.radiusSm, color: T.navy, padding: "8px 14px", cursor: uploadingLogo ? "default" : "pointer", background: "transparent" }}>
              {uploadingLogo ? "Carico…" : (coverLogoUrl ? "Cambia" : "Carica logo")}
              <input type="file" accept="image/*" onChange={handleCoverLogoUpload} disabled={uploadingLogo} style={{ display: "none" }} />
            </label>
            {coverLogoUrl && <button onClick={removeCoverLogo} style={{ ...mono, fontSize: 10, background: "none", border: "none", color: T.red, cursor: "pointer" }}>Rimuovi</button>}
          </div>
        </div>
      </div>

      {/* ── 1. Flag di default ─────────────────────────────────────────────── */}
      <div style={cardSt}>
        <Header id="flag" titolo="Flag di default" sub="Cosa è attivo quando crei una nuova offerta" />
        {open.flag && (
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", ...mono, fontSize: 11.5, color: T.ink }}>
                <Check checked={getDefault("copertina")} onChange={() => setDefault("copertina", !getDefault("copertina"))} /> Pagina di copertina
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", ...mono, fontSize: 11.5, color: T.ink }}>
                <Check checked={getDefault("firma")} onChange={() => setDefault("firma", !getDefault("firma"))} /> Includi firma
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", ...mono, fontSize: 11.5, color: T.ink }}>
                <Check checked={getDefault("inquadramentoAttivo")} onChange={() => setDefault("inquadramentoAttivo", !getDefault("inquadramentoAttivo"))} /> Inquadramento progetto
              </label>
            </div>

            <div>
              <div style={labelSt}>Prestazioni attive di default</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
                {SEZIONI.map(s => (
                  <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", ...mono, fontSize: 11, color: T.ink }}>
                    <Check checked={(getDefault("sezioniAttive") || []).includes(s.id)} onChange={() => toggleInArray("sezioniAttive", s.id)} /> {s.titolo}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={labelSt}>Testi fissi attivi di default</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
                {BLOCCHI_FISSI.map(b => (
                  <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", ...mono, fontSize: 11, color: T.ink }}>
                    <Check checked={(getDefault("blocchiAttivi") || []).includes(b.id)} onChange={() => toggleInArray("blocchiAttivi", b.id)} /> {b.titolo}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={labelSt}>Opzioni di pagamento attive di default</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
                {MODALITA_PAGAMENTO.map(o => (
                  <label key={o.id} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", ...mono, fontSize: 11, color: T.ink }}>
                    <Check checked={(getDefault("opzioniPagamento") || []).includes(o.id)} onChange={() => toggleInArray("opzioniPagamento", o.id)} /> Opzione {o.id}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div style={labelSt}>Rate opzione C (default)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rateC.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="number" value={r.percentuale} onChange={e => setRateC(rateC.map((x, j) => j === i ? { ...x, percentuale: e.target.value } : x))} style={{ ...inputSt, width: 70, textAlign: "right" }} />
                    <span style={{ ...mono, fontSize: 11, color: T.muted }}>%</span>
                    <input value={r.descrizione} onChange={e => setRateC(rateC.map((x, j) => j === i ? { ...x, descrizione: e.target.value } : x))} placeholder="descrizione rata" style={{ ...inputSt, flex: 1 }} />
                    <button onClick={() => setRateC(rateC.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, fontSize: 15, padding: "0 4px" }}>×</button>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button onClick={() => setRateC([...rateC, { percentuale: 0, descrizione: "" }])} style={{ ...mono, fontSize: 10, border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent", color: T.muted, padding: "5px 12px", cursor: "pointer" }}>+ Aggiungi rata</button>
                  {(() => { const t = rateC.reduce((s, r) => s + (Number(r.percentuale) || 0), 0); return <span style={{ ...mono, fontSize: 10, color: t === 100 ? T.green : T.red }}>Totale {t}%</span>; })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Sezioni e voci (prezzi + testi + aggiungi) ──────────────────── */}
      <div style={cardSt}>
        <Header id="voci" titolo="Sezioni e voci" sub="Riordina (▲▼), testi, prezzo fisso o a cadauno, aggiungi/nascondi voci" />
        {open.voci && (
          <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
            {SEZIONI.map(sez => {
              const so = getSez(sez.id);
              const isOpen = sezOpen[sez.id];
              return (
                <div key={sez.id} style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm }}>
                  <div onClick={() => setSezOpen(s => ({ ...s, [sez.id]: !s[sez.id] }))}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", cursor: "pointer" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{sez.titolo}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ ...mono, fontSize: 9, color: T.muted }}>{sez.modoPrezzo === "voci" ? "prezzo per voce" : "forfait"}</span>
                      <span style={{ color: T.muted, fontSize: 11 }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ padding: "10px 12px", borderTop: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
                      {sez.modoPrezzo === "forfait" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ ...mono, fontSize: 10, color: T.muted }}>Prezzo forfait default</span>
                          <input type="number" value={so.prezzoDefault ?? ""} onChange={e => setSez(sez.id, { prezzoDefault: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="€" style={{ ...inputSt, width: 120, textAlign: "right" }} />
                        </div>
                      )}
                      {/* voci in ordine, riordinabili */}
                      {(() => {
                        const defVoci = sez.gruppi.flatMap(g => g.voci);
                        const extraVoci = so.vociExtra || [];
                        const defMap = Object.fromEntries(defVoci.map(v => [v.id, v]));
                        const extraIdxMap = Object.fromEntries(extraVoci.map((v, i) => [v.id, i]));
                        const allIds = [...defVoci.map(v => v.id), ...extraVoci.map(v => v.id)];
                        const ord = Array.isArray(so.ordine) && so.ordine.length
                          ? [...so.ordine.filter(id => allIds.includes(id)), ...allIds.filter(id => !so.ordine.includes(id))]
                          : allIds;
                        const conPrezzoSez = sez.modoPrezzo === "voci";
                        return ord.map((id, pos) => {
                          const isExtra = id in extraIdxMap;
                          const arrows = (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, paddingTop: 2 }}>
                              <button onClick={() => moveVoce(sez.id, ord, pos, -1)} disabled={pos === 0} style={{ background: "none", border: "none", cursor: pos === 0 ? "default" : "pointer", color: pos === 0 ? T.border : T.muted, fontSize: 11, lineHeight: 1, padding: "1px 3px" }}>▲</button>
                              <button onClick={() => moveVoce(sez.id, ord, pos, 1)} disabled={pos === ord.length - 1} style={{ background: "none", border: "none", cursor: pos === ord.length - 1 ? "default" : "pointer", color: pos === ord.length - 1 ? T.border : T.muted, fontSize: 11, lineHeight: 1, padding: "1px 3px" }}>▼</button>
                            </div>
                          );
                          if (isExtra) {
                            const idx = extraIdxMap[id];
                            const v = extraVoci[idx];
                            const isCad = /cad/i.test(v.prezzoLabel || "");
                            return (
                              <div key={id} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `0.5px solid ${T.border}`, background: T.surface2 }}>
                                {arrows}
                                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                                  <div style={{ ...mono, fontSize: 8.5, letterSpacing: "0.1em", color: T.navy }}>VOCE AGGIUNTA</div>
                                  <textarea value={v.testo} onChange={e => setVoceExtra(sez.id, idx, { testo: e.target.value })} rows={2} placeholder="Testo della voce…" style={{ ...inputSt, resize: "vertical", fontSize: 11.5 }} />
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", ...mono, fontSize: 10, color: T.muted }}>
                                      <Check checked={v.prezzo !== false} onChange={() => setVoceExtra(sez.id, idx, { prezzo: v.prezzo === false })} /> Con prezzo
                                    </label>
                                    {v.prezzo !== false && (
                                      <select value={isCad ? "cad" : "fisso"} onChange={e => setVoceExtra(sez.id, idx, { prezzoLabel: e.target.value === "cad" ? "Cad. €" : "" })} style={{ ...inputSt, width: 160, fontSize: 10.5, cursor: "pointer" }}>
                                        <option value="fisso">Prezzo fisso</option>
                                        <option value="cad">A numero (Cad. €)</option>
                                      </select>
                                    )}
                                    {v.prezzo !== false && isCad && <span style={{ ...mono, fontSize: 9, color: T.muted }}>usa «_» nel testo per il numero</span>}
                                    <button onClick={() => removeVoceExtra(sez.id, idx)} style={{ ...mono, fontSize: 9, background: "none", border: "none", color: T.red, cursor: "pointer", padding: 0 }}>rimuovi</button>
                                  </div>
                                </div>
                                {v.prezzo !== false && (
                                  <input type="number" value={v.prezzoDefault ?? ""} onChange={e => setVoceExtra(sez.id, idx, { prezzoDefault: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="€ default" style={{ ...inputSt, width: 100, height: 30, textAlign: "right", flexShrink: 0 }} />
                                )}
                              </div>
                            );
                          }
                          const v = defMap[id];
                          const vo = so.voci?.[v.id] || {};
                          const nascosta = !!vo.nascosta;
                          const testo = vo.testo != null && vo.testo !== "" ? vo.testo : v.testo;
                          const labelEff = vo.prezzoLabel !== undefined ? vo.prezzoLabel : v.prezzoLabel;
                          const isCad = /cad/i.test(labelEff || "");
                          const hasPrezzo = conPrezzoSez && v.prezzo;
                          return (
                            <div key={id} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: `0.5px solid ${T.border}`, opacity: nascosta ? 0.5 : 1 }}>
                              {arrows}
                              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                                <textarea value={testo} onChange={e => setVoceOv(sez.id, v.id, { testo: e.target.value })} rows={2} style={{ ...inputSt, resize: "vertical", fontSize: 11.5 }} />
                                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                  <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", ...mono, fontSize: 10, color: T.muted }}>
                                    <Check checked={nascosta} onChange={() => setVoceOv(sez.id, v.id, { nascosta: !nascosta })} /> Nascondi
                                  </label>
                                  {hasPrezzo && (
                                    <select value={isCad ? "cad" : "fisso"} onChange={e => setVoceOv(sez.id, v.id, { prezzoLabel: e.target.value === "cad" ? "Cad. €" : "" })} style={{ ...inputSt, width: 160, fontSize: 10.5, cursor: "pointer" }}>
                                      <option value="fisso">Prezzo fisso</option>
                                      <option value="cad">A numero (Cad. €)</option>
                                    </select>
                                  )}
                                  {hasPrezzo && isCad && <span style={{ ...mono, fontSize: 9, color: T.muted }}>usa «_» nel testo per il numero</span>}
                                  {vo.testo != null && vo.testo !== v.testo && (
                                    <button onClick={() => setVoceOv(sez.id, v.id, { testo: undefined })} style={{ ...mono, fontSize: 9, background: "none", border: "none", color: T.navy, cursor: "pointer", padding: 0 }}>ripristina testo</button>
                                  )}
                                </div>
                              </div>
                              {hasPrezzo && (
                                <input type="number" value={vo.prezzoDefault ?? ""} onChange={e => setVoceOv(sez.id, v.id, { prezzoDefault: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder={labelEff || "€ default"} style={{ ...inputSt, width: 100, height: 30, textAlign: "right", flexShrink: 0 }} />
                              )}
                            </div>
                          );
                        });
                      })()}
                      <button onClick={() => addVoceExtra(sez.id)} style={{ ...mono, fontSize: 10, border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent", color: T.muted, padding: "6px 12px", cursor: "pointer", alignSelf: "flex-start" }}>+ Aggiungi voce a questa sezione</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 3. Testi fissi ─────────────────────────────────────────────────── */}
      <div style={cardSt}>
        <Header id="testi" titolo="Testi fissi" sub="Titolo, paragrafi ed elenchi dei blocchi finali" />
        {open.testi && (
          <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
            {BLOCCHI_FISSI.map(b => {
              const isOpen = sezOpen["b_" + b.id];
              const paragrafi = getBloc(b.id, "paragrafi", b.paragrafi);
              const elenco = getBloc(b.id, "elenco", b.elenco);
              const titolo = getBloc(b.id, "titolo", b.titolo);
              return (
                <div key={b.id} style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm }}>
                  <div onClick={() => setSezOpen(s => ({ ...s, ["b_" + b.id]: !s["b_" + b.id] }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", cursor: "pointer" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{titolo}</div>
                    <span style={{ color: T.muted, fontSize: 11 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: "10px 12px", borderTop: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <div style={labelSt}>Titolo</div>
                        <input value={titolo} onChange={e => setBloc(b.id, { titolo: e.target.value })} style={inputSt} />
                      </div>
                      <div>
                        <div style={labelSt}>Paragrafi</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {paragrafi.map((p, i) => (
                            <div key={i} style={{ display: "flex", gap: 6 }}>
                              <textarea value={p} onChange={e => setBloc(b.id, { paragrafi: paragrafi.map((x, j) => j === i ? e.target.value : x) })} rows={2} style={{ ...inputSt, resize: "vertical", fontSize: 11.5 }} />
                              <button onClick={() => setBloc(b.id, { paragrafi: paragrafi.filter((_, j) => j !== i) })} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, fontSize: 15, padding: "0 4px", flexShrink: 0 }}>×</button>
                            </div>
                          ))}
                          <button onClick={() => setBloc(b.id, { paragrafi: [...paragrafi, ""] })} style={{ ...mono, fontSize: 10, border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent", color: T.muted, padding: "5px 12px", cursor: "pointer", alignSelf: "flex-start" }}>+ Paragrafo</button>
                        </div>
                      </div>
                      <div>
                        <div style={labelSt}>Elenco puntato</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {elenco.map((p, i) => (
                            <div key={i} style={{ display: "flex", gap: 6 }}>
                              <input value={p} onChange={e => setBloc(b.id, { elenco: elenco.map((x, j) => j === i ? e.target.value : x) })} style={inputSt} />
                              <button onClick={() => setBloc(b.id, { elenco: elenco.filter((_, j) => j !== i) })} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, fontSize: 15, padding: "0 4px", flexShrink: 0 }}>×</button>
                            </div>
                          ))}
                          <button onClick={() => setBloc(b.id, { elenco: [...elenco, ""] })} style={{ ...mono, fontSize: 10, border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent", color: T.muted, padding: "5px 12px", cursor: "pointer", alignSelf: "flex-start" }}>+ Voce elenco</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div>
              <div style={labelSt}>Inquadramento progetto (testo)</div>
              <textarea value={ov.inquadramento?.testo != null ? ov.inquadramento.testo : INQUADRAMENTO.testo}
                onChange={e => setOv(o => ({ ...o, inquadramento: { ...(o.inquadramento || {}), testo: e.target.value } }))}
                rows={3} style={{ ...inputSt, resize: "vertical", fontSize: 11.5 }} />
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Preset rapidi ───────────────────────────────────────────────── */}
      <div style={cardSt}>
        <Header id="preset" titolo="Preset voci rapide" sub="Voci pronte per il form di inserimento rapido offerta" />
        {open.preset && (
          <div style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {preset.length === 0 && <div style={{ ...mono, fontSize: 10, color: T.muted }}>Nessun preset. Aggiungine uno qui sotto.</div>}
              {preset.map(v => (
                <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: `0.5px solid ${T.border}`, borderRadius: T.radiusSm }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.nome}</div>
                  <div style={{ ...mono, fontSize: 11.5, color: T.navy, fontWeight: 600 }}>{Number(v.prezzo_default) > 0 ? Number(v.prezzo_default).toLocaleString("it-IT", { minimumFractionDigits: 2 }) + " €" : "—"}</div>
                  <button onClick={() => delPreset(v.id)} style={{ background: "none", border: `0.5px solid ${T.red}`, borderRadius: T.radiusSm, ...mono, fontSize: 10, color: T.red, padding: "4px 9px", cursor: "pointer" }}>×</button>
                </div>
              ))}
            </div>
            <form onSubmit={addPreset} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={labelSt}>Nome voce *</div>
                <input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="es. Progetto esecutivo" style={inputSt} required />
              </div>
              <div style={{ flex: "0 0 130px" }}>
                <div style={labelSt}>Prezzo default</div>
                <input type="number" value={newPrezzo} onChange={e => setNewPrezzo(e.target.value)} placeholder="0" style={inputSt} />
              </div>
              <button type="submit" style={{ background: T.navy, color: T.bg, border: "none", borderRadius: T.radiusSm, ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 18px", cursor: "pointer", whiteSpace: "nowrap" }}>+ Aggiungi</button>
            </form>
          </div>
        )}
      </div>

      {/* ── Barra salvataggio ──────────────────────────────────────────────── */}
      <div style={{ position: "sticky", bottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 0", background: T.bg }}>
        <button onClick={resetTutto} style={{ background: "none", border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, ...mono, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, padding: "9px 16px", cursor: "pointer" }}>Ripristina default</button>
        <button onClick={salva} disabled={saving} style={{ background: T.navy, color: T.bg, border: "none", borderRadius: T.radiusSm, ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 26px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Salvo…" : "Salva regolazione"}
        </button>
      </div>
    </div>
  );
}
