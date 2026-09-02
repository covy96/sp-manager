import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useEscKey } from "../hooks/useEscKey";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import {
  SEZIONI, BLOCCHI_FISSI, INQUADRAMENTO, MODALITA_PAGAMENTO,
  estraiCampi, compilaTesto,
} from "../lib/offertaTemplate";
import {
  normalizzaDocumento, calcolaTotali, importoSezione, euro, quantitaVoce,
} from "../lib/offertaModel";
import { generaOffertaPdf } from "../lib/offertaPdf";
import { generaOffertaDocx } from "../lib/offertaDocx";

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

// Testo senza i marcatori **…**, per l'anteprima nel pannello
const pulisci = (t) => String(t).replace(/\*\*/g, "");

// Data/ora leggibile per l'etichetta delle versioni.
const formattaData = (ts) => {
  try {
    return new Date(ts).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
};

// Campi «…» di un testo → input compilabili. Definito FUORI dal componente:
// se stesse dentro verrebbe ricreato ad ogni render e gli input perderebbero
// il focus dopo un solo carattere.
function CampiTesto({ testo, valori, onChange, inputSt }) {
  const campi = estraiCampi(testo);
  if (campi.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {campi.map(c => (
        <div key={c.key} style={{ flex: "0 1 auto" }}>
          <input
            value={valori?.[c.key] || ""}
            onChange={e => onChange(c.key, e.target.value)}
            placeholder={c.label}
            style={{ ...inputSt, width: Math.max(90, Math.min(240, c.label.length * 7 + 30)), padding: "4px 8px", fontSize: 11 }}
          />
        </div>
      ))}
    </div>
  );
}

export default function OffertaDocumentPanel({
  offerta, studio, onClose, onSaved,
  mode = "edit",
  progetti = [], globalContacts = [], serviceTemplates = [], teamMembers = [],
  onCreate,
}) {
  const { T } = useTheme();
  const showToast = useToast();
  const isCreate = mode === "create";
  useEscKey(onClose, true);
  useBodyScrollLock(true);

  const [doc, setDoc]         = useState(() => normalizzaDocumento(offerta?.documento, offerta));
  const [saving, setSaving]   = useState(false);
  const [busy, setBusy]       = useState("");
  const [aperte, setAperte]   = useState({});

  // Storico versioni: ogni salvataggio aggiunge uno snapshot in cima.
  const [versioni, setVersioni] = useState(() => Array.isArray(offerta?.documento_versioni) ? offerta.documento_versioni : []);
  const [versioneAttiva, setVersioneAttiva] = useState(() => (Array.isArray(offerta?.documento_versioni) && offerta.documento_versioni[0]?.n) || null);
  const [versioniAperte, setVersioniAperte] = useState(false);

  // ── Anagrafica offerta (solo in modalità create) ────────────────────────────
  const [ana, setAna] = useState({
    numero_offerta: "", data_offerta: new Date().toISOString().slice(0, 10),
    nome_offerta: "", cliente: "", project_id: "", note: "",
    creaProgetto: false, nuovoProgettoNome: "", nuovoProgettoIndirizzo: "",
    nuovoProgettoServizi: [], nuovoProgettoMembri: [],
  });
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    setDoc(normalizzaDocumento(offerta?.documento, offerta));
    const vs = Array.isArray(offerta?.documento_versioni) ? offerta.documento_versioni : [];
    setVersioni(vs);
    setVersioneAttiva(vs[0]?.n || null);
  }, [offerta?.id]);

  const tot = useMemo(() => calcolaTotali(doc), [doc]);

  // Oggetto offerta minimo per i generatori (numero/nome) in modalità create.
  const offGen = isCreate ? { numero_offerta: ana.numero_offerta, nome_offerta: ana.nome_offerta } : offerta;

  // Cliente → committente: rispecchia il valore, ma non sovrascrive un
  // committente già modificato a mano.
  const onClienteChange = (val) => {
    setDoc(d => ({
      ...d,
      destinatario: {
        ...d.destinatario,
        nome: (!d.destinatario.nome || d.destinatario.nome === ana.cliente) ? val : d.destinatario.nome,
      },
    }));
    setAna(p => ({ ...p, cliente: val }));
    const q = val.trim().toLowerCase();
    setClientSuggestions(q.length >= 2
      ? globalContacts.filter(c => (c.full_name || "").toLowerCase().includes(q)).slice(0, 8)
      : []);
  };

  // ── stili ──────────────────────────────────────────────────────────────────
  const inputSt = {
    width: "100%", padding: "7px 10px", boxSizing: "border-box",
    border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm,
    background: T.surface, color: T.ink, fontSize: 12,
    fontFamily: "'Space Grotesk', sans-serif", outline: "none",
  };
  const labelSt = { ...mono, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: T.muted, marginBottom: 5 };
  const cardSt = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: "16px 18px", marginBottom: 12 };
  const btn = (primary, extra = {}) => ({
    background: primary ? T.navy : "transparent",
    color: primary ? T.bg : T.ink,
    border: primary ? "none" : `0.5px solid ${T.borderMd}`,
    borderRadius: T.radiusSm, ...mono, fontSize: 11,
    letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "9px 18px", cursor: "pointer", ...extra,
  });

  // ── mutatori ───────────────────────────────────────────────────────────────
  const set = (patch) => setDoc(d => ({ ...d, ...patch }));
  const setDest = (k, v) => setDoc(d => ({ ...d, destinatario: { ...d.destinatario, [k]: v } }));
  const setSez = (sid, patch) => setDoc(d => ({ ...d, sezioni: { ...d.sezioni, [sid]: { ...d.sezioni[sid], ...patch } } }));
  const setVoce = (sid, vid, patch) => setDoc(d => ({
    ...d,
    sezioni: { ...d.sezioni, [sid]: { ...d.sezioni[sid], voci: { ...d.sezioni[sid].voci, [vid]: { ...d.sezioni[sid].voci[vid], ...patch } } } },
  }));
  const setCampoVoce = (sid, vid, key, val) => setDoc(d => {
    const v = d.sezioni[sid].voci[vid];
    return { ...d, sezioni: { ...d.sezioni, [sid]: { ...d.sezioni[sid], voci: { ...d.sezioni[sid].voci, [vid]: { ...v, campi: { ...v.campi, [key]: val } } } } } };
  });
  const setCampoInq = (key, val) => setDoc(d => ({ ...d, inquadramento: { ...d.inquadramento, campi: { ...d.inquadramento.campi, [key]: val } } }));
  const toggleBlocco = (bid) => setDoc(d => ({ ...d, blocchi: { ...d.blocchi, [bid]: !d.blocchi[bid] } }));
  const togglePagamento = (oid) => setDoc(d => {
    const cur = d.pagamento.opzioni || [];
    return { ...d, pagamento: { ...d.pagamento, opzioni: cur.includes(oid) ? cur.filter(x => x !== oid) : [...cur, oid] } };
  });
  const setRateC = (idx, patch) => setDoc(d => ({ ...d, pagamento: { ...d.pagamento, rateC: (d.pagamento.rateC || []).map((r, i) => i === idx ? { ...r, ...patch } : r) } }));
  const addRateC = () => setDoc(d => ({ ...d, pagamento: { ...d.pagamento, rateC: [...(d.pagamento.rateC || []), { percentuale: 0, descrizione: "" }] } }));
  const removeRateC = (idx) => setDoc(d => ({ ...d, pagamento: { ...d.pagamento, rateC: (d.pagamento.rateC || []).filter((_, i) => i !== idx) } }));

  // ── azioni ─────────────────────────────────────────────────────────────────
  const salva = async () => {
    setSaving(true);
    // Ogni salvataggio registra una nuova versione in cima allo storico.
    const nPrec = versioni.reduce((mx, v) => Math.max(mx, Number(v.n) || 0), 0);
    const nuova = { n: nPrec + 1, ts: new Date().toISOString(), doc };
    const nuoveVersioni = [nuova, ...versioni].slice(0, 30);
    const { error } = await supabase.from("offerte")
      .update({ documento: doc, documento_versioni: nuoveVersioni })
      .eq("id", offerta.id);
    setSaving(false);
    if (error) { showToast(`Errore salvataggio: ${error.message}`, "error"); return false; }
    setVersioni(nuoveVersioni);
    setVersioneAttiva(nuova.n);
    showToast(`Versione ${nuova.n} salvata`, "success");
    onSaved?.({ ...offerta, documento: doc, documento_versioni: nuoveVersioni });
    return true;
  };

  const caricaVersione = (v) => {
    setDoc(normalizzaDocumento(v.doc, offerta));
    setVersioneAttiva(v.n);
    setVersioniAperte(false);
    showToast(`Versione ${v.n} caricata — salvando ne creerai una nuova`, "success");
  };

  const generaPdf = async () => {
    setBusy("pdf");
    try { await generaOffertaPdf({ offerta: offGen, studio, documento: doc }); }
    catch (e) { showToast(`Errore PDF: ${e.message}`, "error"); }
    setBusy("");
  };

  const generaWord = async () => {
    setBusy("docx");
    try { await generaOffertaDocx({ offerta: offGen, studio, documento: doc }); }
    catch (e) { showToast(`Errore Word: ${e.message}`, "error"); }
    setBusy("");
  };

  // Crea una nuova offerta a partire dal documento: le sezioni attive diventano
  // le voci dell'offerta (una voce per sezione) e la config documento è salvata.
  const crea = async () => {
    if (!ana.nome_offerta.trim() || !ana.cliente.trim()) {
      setCreateError("Compila nome offerta e cliente");
      return;
    }
    setCreateError("");
    setSaving(true);
    const stamp = Date.now();
    const voci = tot.righe.map((r, i) => ({
      id: `sez${i}_${stamp}`, nome: r.titolo, prezzo: r.importo, attiva: true,
    }));
    await onCreate?.({
      numero_offerta: ana.numero_offerta,
      nome_offerta: ana.nome_offerta,
      cliente: ana.cliente,
      project_id: ana.project_id,
      data_offerta: ana.data_offerta,
      note: ana.note,
      voci,
      sconto: doc.sconto,
      sconto_fisso: doc.scontoFisso,
      documento: doc,
      creaProgetto: ana.creaProgetto,
      nuovoProgettoNome: ana.nuovoProgettoNome,
      nuovoProgettoIndirizzo: ana.nuovoProgettoIndirizzo,
      nuovoProgettoServizi: ana.nuovoProgettoServizi,
      nuovoProgettoMembri: ana.nuovoProgettoMembri,
    });
    setSaving(false);
    // onCreate gestisce la chiusura in caso di successo.
  };

  const Check = ({ checked, onChange }) => (
    <input type="checkbox" checked={!!checked} onChange={onChange}
      style={{ accentColor: T.navy, width: 14, height: 14, flexShrink: 0, cursor: "pointer" }} />
  );

  return (
    <div className="asm-modal-bg" style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="asm-modal-content" style={{
        width: "100%", maxWidth: 860, maxHeight: "92vh", display: "flex", flexDirection: "column",
        background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
        border: `1px solid ${T.glassBorder}`, boxShadow: T.shadowLg, borderRadius: T.radiusLg,
      }}>
        {/* Testata */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 26px 14px", borderBottom: `0.5px solid ${T.border}` }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, marginBottom: 3 }}>{isCreate ? "Nuova offerta" : "Documento offerta"}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {isCreate
                ? (ana.nome_offerta || "Crea offerta dal documento")
                : `${offerta?.numero_offerta} — ${offerta?.nome_offerta}`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {/* Corpo scrollabile */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 26px" }}>

          {/* Anagrafica offerta — solo in creazione */}
          {isCreate && (
            <div style={{ ...cardSt, border: `1px solid ${T.navy}` }}>
              <div style={{ ...labelSt, marginBottom: 12, color: T.navy }}>Dati offerta</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={labelSt}>N° Offerta</div>
                  <input value={ana.numero_offerta} onChange={e => setAna(p => ({ ...p, numero_offerta: e.target.value }))} placeholder="OFF.001" style={inputSt} />
                </div>
                <div>
                  <div style={labelSt}>Data offerta</div>
                  <input type="date" value={ana.data_offerta} onChange={e => setAna(p => ({ ...p, data_offerta: e.target.value }))} style={inputSt} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div style={labelSt}>Nome offerta *</div>
                  <input value={ana.nome_offerta} onChange={e => setAna(p => ({ ...p, nome_offerta: e.target.value }))} autoFocus placeholder="Es. Ristrutturazione appartamento" style={inputSt} />
                </div>
                <div style={{ gridColumn: "span 2", position: "relative" }}>
                  <div style={labelSt}>Cliente *</div>
                  <input value={ana.cliente} autoComplete="off" style={inputSt}
                    onChange={e => onClienteChange(e.target.value)}
                    onBlur={() => setTimeout(() => setClientSuggestions([]), 150)} />
                  {clientSuggestions.length > 0 && (
                    <div style={{ position: "absolute", left: 0, right: 0, top: "100%", background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: 12, boxShadow: T.shadowMd, zIndex: 50, maxHeight: 200, overflowY: "auto" }}>
                      {clientSuggestions.map(c => (
                        <button key={c.id} type="button" onMouseDown={() => { onClienteChange(c.full_name); setClientSuggestions([]); }}
                          style={{ display: "block", width: "100%", padding: "9px 12px", textAlign: "left", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>
                          {c.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div style={labelSt}>Progetto</div>
                  <select value={ana.project_id} onChange={e => setAna(p => ({ ...p, project_id: e.target.value }))} style={{ ...inputSt, cursor: "pointer" }}>
                    <option value="">— Nessun progetto —</option>
                    {progetti.map(p => <option key={p.id} value={p.id}>{p.name} — {p.client}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 10 }}>
                  <Check checked={ana.creaProgetto} onChange={() => setAna(p => ({ ...p, creaProgetto: !p.creaProgetto, project_id: "" }))} />
                  <label style={{ ...mono, fontSize: 11, color: T.ink, cursor: "pointer" }} onClick={() => setAna(p => ({ ...p, creaProgetto: !p.creaProgetto, project_id: "" }))}>
                    Crea nuovo progetto per questa offerta
                  </label>
                </div>
                {ana.creaProgetto && (
                  <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: 10, padding: 14, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radiusSm }}>
                    <div style={{ ...mono, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted }}>Nuovo progetto</div>
                    <div>
                      <div style={labelSt}>Nome progetto *</div>
                      <input value={ana.nuovoProgettoNome} onChange={e => setAna(p => ({ ...p, nuovoProgettoNome: e.target.value }))} placeholder="Es. Ristrutturazione Villa Bianchi" style={inputSt} />
                    </div>
                    <div>
                      <div style={labelSt}>Indirizzo</div>
                      <input value={ana.nuovoProgettoIndirizzo} onChange={e => setAna(p => ({ ...p, nuovoProgettoIndirizzo: e.target.value }))} placeholder="Via Roma 1, Milano" style={inputSt} />
                    </div>
                    {serviceTemplates.length > 0 && (
                      <div>
                        <div style={labelSt}>Servizi</div>
                        <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.bg, padding: "8px 12px", maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                          {serviceTemplates.map(s => {
                            const selected = ana.nuovoProgettoServizi.includes(s.service_name);
                            return (
                              <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "3px 0" }}>
                                <input type="checkbox" checked={selected}
                                  onChange={() => setAna(p => ({ ...p, nuovoProgettoServizi: selected ? p.nuovoProgettoServizi.filter(x => x !== s.service_name) : [...p.nuovoProgettoServizi, s.service_name] }))}
                                  style={{ accentColor: T.navy, width: 13, height: 13 }} />
                                <span style={{ fontSize: 12, color: T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{s.service_name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {teamMembers.length > 0 && (
                      <div>
                        <div style={labelSt}>Assegna a</div>
                        <div style={{ border: `1px solid ${T.border}`, borderRadius: T.radiusSm, background: T.bg, padding: "8px 12px", maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                          {teamMembers.map(m => {
                            const selected = ana.nuovoProgettoMembri.includes(m.id);
                            return (
                              <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "3px 0" }}>
                                <input type="checkbox" checked={selected}
                                  onChange={() => setAna(p => ({ ...p, nuovoProgettoMembri: selected ? p.nuovoProgettoMembri.filter(x => x !== m.id) : [...p.nuovoProgettoMembri, m.id] }))}
                                  style={{ accentColor: T.navy, width: 13, height: 13 }} />
                                <span style={{ fontSize: 12, color: T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{m.user_name || m.user_email}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ gridColumn: "span 2" }}>
                  <div style={labelSt}>Note</div>
                  <input value={ana.note} onChange={e => setAna(p => ({ ...p, note: e.target.value }))} placeholder="Note aggiuntive…" style={inputSt} />
                </div>
              </div>
              <div style={{ ...mono, fontSize: 10, color: T.muted, marginTop: 12, lineHeight: 1.5 }}>
                Le sezioni attive qui sotto diventano le voci dell'offerta. Compila prezzi e testi, poi premi <b>Crea offerta</b>.
              </div>
            </div>
          )}

          {/* Storico versioni — solo in modifica */}
          {!isCreate && versioni.length > 0 && (
            <div style={cardSt}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setVersioniAperte(x => !x)}>
                <div style={{ ...labelSt, marginBottom: 0 }}>Versioni salvate ({versioni.length}){versioneAttiva ? ` · in modifica: v${versioneAttiva}` : ""}</div>
                <span style={{ color: T.muted, fontSize: 11 }}>{versioniAperte ? "▲" : "▼"}</span>
              </div>
              {versioniAperte && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {versioni.map(v => (
                    <div key={v.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", border: `0.5px solid ${T.border}`, borderRadius: T.radiusSm, background: versioneAttiva === v.n ? T.surface2 : "transparent" }}>
                      <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: versioneAttiva === v.n ? T.navy : T.ink }}>Versione {v.n}</span>
                      <span style={{ ...mono, fontSize: 10, color: T.muted, flex: 1 }}>{formattaData(v.ts)}</span>
                      <button type="button" onClick={() => caricaVersione(v)}
                        style={{ ...mono, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent", color: T.navy, padding: "5px 12px", cursor: "pointer" }}>
                        Carica
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Intestazione documento */}
          <div style={cardSt}>
            <div style={{ ...labelSt, marginBottom: 12 }}>Intestazione</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={labelSt}>Committente</div>
                <input value={doc.destinatario.nome} onChange={e => setDest("nome", e.target.value)} placeholder="FUTURA S.R.L." style={inputSt} />
              </div>
              <div>
                <div style={labelSt}>Indirizzo (copertina)</div>
                <input value={doc.destinatario.indirizzo} onChange={e => setDest("indirizzo", e.target.value)} placeholder="Via Gaudenzio Ferrari, Milano" style={inputSt} />
              </div>
              <div>
                <div style={labelSt}>Sede legale</div>
                <input value={doc.destinatario.sede} onChange={e => setDest("sede", e.target.value)} placeholder="Milano" style={inputSt} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={labelSt}>C.F.</div>
                  <input value={doc.destinatario.cf} onChange={e => setDest("cf", e.target.value)} style={inputSt} />
                </div>
                <div>
                  <div style={labelSt}>P.IVA</div>
                  <input value={doc.destinatario.piva} onChange={e => setDest("piva", e.target.value)} style={inputSt} />
                </div>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <div style={labelSt}>Oggetto dell'incarico</div>
                <input value={doc.oggettoIncarico} onChange={e => set({ oggettoIncarico: e.target.value })}
                  placeholder="la progettazione, presentazione di pratiche edilizie, catastali e commerciali…" style={inputSt} />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <div style={labelSt}>Manifestata necessità</div>
                <input value={doc.necessita} onChange={e => set({ necessita: e.target.value })}
                  placeholder="della sua attività / inerente all'unità in oggetto" style={inputSt} />
              </div>
              <div>
                <div style={labelSt}>Luogo</div>
                <input value={doc.luogo} onChange={e => set({ luogo: e.target.value })} style={inputSt} />
              </div>
              <div>
                <div style={labelSt}>Data</div>
                <input type="date" value={doc.data} onChange={e => set({ data: e.target.value })} style={inputSt} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", ...mono, fontSize: 11, color: T.ink }}>
                <Check checked={doc.copertina} onChange={() => set({ copertina: !doc.copertina })} /> Pagina di copertina
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", ...mono, fontSize: 11, color: T.ink }}>
                <Check checked={doc.firma} onChange={() => set({ firma: !doc.firma })} /> Includi firma
              </label>
            </div>
          </div>

          {/* Inquadramento */}
          <div style={cardSt}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: doc.inquadramento.attivo ? 10 : 0 }}>
              <Check checked={doc.inquadramento.attivo}
                onChange={() => setDoc(d => ({ ...d, inquadramento: { ...d.inquadramento, attivo: !d.inquadramento.attivo } }))} />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{INQUADRAMENTO.titolo}</span>
            </label>
            {doc.inquadramento.attivo && (
              <>
                <div style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.55, marginBottom: 4 }}>
                  {compilaTesto(INQUADRAMENTO.testo, doc.inquadramento.campi)}
                </div>
                <CampiTesto testo={INQUADRAMENTO.testo} valori={doc.inquadramento.campi} onChange={setCampoInq} inputSt={inputSt} />
              </>
            )}
          </div>

          {/* Sezioni prestazione */}
          <div style={{ ...labelSt, marginTop: 18, marginBottom: 8 }}>Prestazioni</div>
          {SEZIONI.map(sez => {
            const cfgS = doc.sezioni[sez.id];
            const aperta = aperte[sez.id] ?? false;
            const imp = importoSezione(sez, doc);
            return (
              <div key={sez.id} style={{ ...cardSt, padding: "12px 16px", opacity: cfgS.attiva ? 1 : 0.62 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Check checked={cfgS.attiva} onChange={() => { setSez(sez.id, { attiva: !cfgS.attiva }); setAperte(a => ({ ...a, [sez.id]: !cfgS.attiva })); }} />
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setAperte(a => ({ ...a, [sez.id]: !aperta }))}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sez.titolo}</div>
                    <div style={{ ...mono, fontSize: 9, color: T.muted, marginTop: 2 }}>
                      {sez.modoPrezzo === "voci" ? "prezzo per voce" : "prezzo forfettario"}
                    </div>
                  </div>
                  {sez.modoPrezzo === "forfait" ? (
                    <input type="number" value={cfgS.prezzo} onChange={e => setSez(sez.id, { prezzo: e.target.value })}
                      disabled={!cfgS.attiva} placeholder="€"
                      style={{ ...inputSt, width: 110, padding: "5px 8px", fontSize: 12, textAlign: "right" }} />
                  ) : (
                    <div style={{ ...mono, fontSize: 12, color: T.navy, fontWeight: 600, width: 110, textAlign: "right" }}>{euro(imp)}</div>
                  )}
                  <button onClick={() => setAperte(a => ({ ...a, [sez.id]: !aperta }))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 11, padding: "2px 4px" }}>
                    {aperta ? "▲" : "▼"}
                  </button>
                </div>

                {aperta && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `0.5px solid ${T.border}` }}>
                    {sez.gruppi.map((g, gi) => (
                      <div key={gi} style={{ marginBottom: 10 }}>
                        {g.label && <div style={{ ...mono, fontSize: 9.5, letterSpacing: "0.14em", color: T.muted, marginBottom: 8 }}>{g.label}</div>}
                        {g.voci.map(v => {
                          const vc = cfgS.voci[v.id];
                          return (
                            <div key={v.id} style={{ display: "flex", gap: 9, padding: "7px 0", borderBottom: `0.5px solid ${T.border}`, opacity: vc.attiva ? 1 : 0.5 }}>
                              <div style={{ paddingTop: 2 }}>
                                <Check checked={vc.attiva} onChange={() => setVoce(sez.id, v.id, { attiva: !vc.attiva })} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11.5, color: T.ink, lineHeight: 1.5 }}>
                                  {pulisci(compilaTesto(v.testo, vc.campi))}
                                </div>
                                {vc.attiva && <CampiTesto testo={v.testo} valori={vc.campi} onChange={(k, val) => setCampoVoce(sez.id, v.id, k, val)} inputSt={inputSt} />}
                              </div>
                              {sez.modoPrezzo === "voci" && v.prezzo && (() => {
                                const isCad = /cad/i.test(v.prezzoLabel || "");
                                const q = isCad ? quantitaVoce(v, vc) : 1;
                                const unit = Number(vc.prezzo) || 0;
                                return (
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                                    <input type="number" value={vc.prezzo} onChange={e => setVoce(sez.id, v.id, { prezzo: e.target.value })}
                                      disabled={!vc.attiva} placeholder={v.prezzoLabel || "€"}
                                      style={{ ...inputSt, width: 100, height: 30, padding: "4px 8px", fontSize: 11.5, textAlign: "right" }} />
                                    {isCad && vc.attiva && q > 1 && unit > 0 && (
                                      <span style={{ ...mono, fontSize: 9.5, color: T.navy }}>× {q} = {euro(unit * q)}</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Testi fissi */}
          <div style={{ ...labelSt, marginTop: 18, marginBottom: 8 }}>Testi fissi</div>
          <div style={cardSt}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 22px" }}>
              {BLOCCHI_FISSI.map(b => (
                <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", ...mono, fontSize: 11, color: T.ink }}>
                  <Check checked={doc.blocchi[b.id]} onChange={() => toggleBlocco(b.id)} /> {b.titolo}
                </label>
              ))}
            </div>
          </div>

          {/* Pagamento */}
          <div style={{ ...labelSt, marginTop: 18, marginBottom: 8 }}>Modalità di pagamento</div>
          <div style={cardSt}>
            {MODALITA_PAGAMENTO.map(o => {
              const selected = (doc.pagamento.opzioni || []).includes(o.id);
              return (
                <div key={o.id} style={{ padding: "6px 0" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                    <div style={{ paddingTop: 2 }}><Check checked={selected} onChange={() => togglePagamento(o.id)} /></div>
                    <span style={{ fontSize: 11.5, color: T.ink, lineHeight: 1.5 }}>
                      <b>Opzione {o.id} —</b> {o.rate ? "pagamento a stato avanzamento (percentuali personalizzabili)." : o.testo}
                    </span>
                  </label>
                  {o.rate && selected && (
                    <div style={{ marginTop: 8, marginLeft: 26, display: "flex", flexDirection: "column", gap: 6 }}>
                      {(doc.pagamento.rateC || []).map((r, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input type="number" min={0} max={100} value={r.percentuale}
                            onChange={e => setRateC(i, { percentuale: e.target.value })}
                            style={{ ...inputSt, width: 68, padding: "4px 8px", fontSize: 11.5, textAlign: "right" }} />
                          <span style={{ ...mono, fontSize: 11, color: T.muted }}>%</span>
                          <input value={r.descrizione} onChange={e => setRateC(i, { descrizione: e.target.value })}
                            placeholder="descrizione rata (es. inizio lavori)"
                            style={{ ...inputSt, flex: 1, padding: "4px 8px", fontSize: 11.5 }} />
                          <button type="button" onClick={() => removeRateC(i)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: T.red, fontSize: 15, lineHeight: 1, padding: "0 4px", flexShrink: 0 }}>×</button>
                        </div>
                      ))}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <button type="button" onClick={addRateC}
                          style={{ ...mono, fontSize: 10, letterSpacing: "0.06em", border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent", color: T.muted, padding: "5px 12px", cursor: "pointer" }}>
                          + Aggiungi rata
                        </button>
                        {(() => {
                          const totPerc = (doc.pagamento.rateC || []).reduce((s, r) => s + (Number(r.percentuale) || 0), 0);
                          return <span style={{ ...mono, fontSize: 10, color: totPerc === 100 ? T.green : T.red }}>Totale {totPerc}%{totPerc !== 100 ? " — dev'essere 100%" : ""}</span>;
                        })()}
                      </div>
                      <div style={{ ...mono, fontSize: 9.5, color: T.muted, lineHeight: 1.5 }}>
                        All'accettazione dell'offerta questa suddivisione genera automaticamente le rate della commessa.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ marginTop: 10 }}>
              <div style={labelSt}>Testo libero aggiuntivo</div>
              <textarea value={doc.pagamento.testoLibero} onChange={e => setDoc(d => ({ ...d, pagamento: { ...d.pagamento, testoLibero: e.target.value } }))}
                rows={2} style={{ ...inputSt, resize: "vertical" }} />
            </div>
          </div>

          {/* Riepilogo economico */}
          <div style={{ ...labelSt, marginTop: 18, marginBottom: 8 }}>Compensi e oneri</div>
          <div style={cardSt}>
            {tot.righe.length === 0 && (
              <div style={{ ...mono, fontSize: 11, color: T.muted, textAlign: "center", padding: "10px 0" }}>Nessuna prestazione selezionata</div>
            )}
            {tot.righe.map(r => (
              <div key={r.lettera} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `0.5px solid ${T.border}` }}>
                <span style={{ ...mono, fontSize: 10, color: T.muted, width: 24 }}>({r.lettera})</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: T.ink }}>{r.titolo}</span>
                <span style={{ ...mono, fontSize: 12, color: T.ink }}>{euro(r.importo)}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, paddingTop: 10 }}>
              <span style={{ ...mono, fontSize: 10, color: T.muted }}>IMPONIBILE</span>
              <span style={{ ...mono, fontSize: 12, color: T.ink }}>{euro(tot.lordo)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <span style={{ ...mono, fontSize: 10, color: T.muted }}>SCONTO %</span>
              <input type="number" min={0} max={100} step={0.1} value={doc.sconto} onChange={e => set({ sconto: e.target.value })}
                style={{ ...inputSt, width: 90, padding: "4px 8px", fontSize: 11.5, textAlign: "right" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <span style={{ ...mono, fontSize: 10, color: T.muted }}>SCONTO €</span>
              <input type="number" min={0} step={0.01} value={doc.scontoFisso} onChange={e => set({ scontoFisso: e.target.value })}
                style={{ ...inputSt, width: 90, padding: "4px 8px", fontSize: 11.5, textAlign: "right" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 12, paddingTop: 10, borderTop: `0.5px solid ${T.borderMd}` }}>
              <span style={{ ...mono, fontSize: 10, letterSpacing: "0.14em", color: T.muted }}>TOTALE PARCELLA</span>
              <span style={{ ...mono, fontSize: 15, fontWeight: 700, color: T.navy }}>{euro(tot.totale)}</span>
            </div>
          </div>
        </div>

        {/* Barra azioni */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 26px", borderTop: `0.5px solid ${T.border}`, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onClose} style={btn(false)}>Annulla</button>
            {createError && <span style={{ ...mono, fontSize: 11, color: T.red }}>{createError}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={generaWord} disabled={!!busy} style={btn(false, { borderColor: T.navy, color: T.navy, opacity: busy ? 0.6 : 1 })}>
              {busy === "docx" ? "Genero…" : "Genera Word"}
            </button>
            <button onClick={generaPdf} disabled={!!busy} style={btn(false, { borderColor: T.navy, color: T.navy, opacity: busy ? 0.6 : 1 })}>
              {busy === "pdf" ? "Genero…" : "Genera PDF"}
            </button>
            {isCreate ? (
              <button onClick={crea} disabled={saving} style={btn(true, { opacity: saving ? 0.6 : 1 })}>
                {saving ? "Creo…" : "Crea offerta"}
              </button>
            ) : (
              <button onClick={salva} disabled={saving} style={btn(true, { opacity: saving ? 0.6 : 1 })}>
                {saving ? "Salvo…" : "Salva configurazione"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
