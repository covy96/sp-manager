/**
 * Nuove sezioni della pagina Statistiche (Analisi → Statistiche):
 *  - StatCommesseIncassi: incassi previsti, tempi di incasso, fatturato per cliente/prestazione
 *  - StatOre: ore per progetto rispetto al valore della commessa (€/ora, sforamenti)
 *  - StatCantieri: Gantt, report di cantiere, imprese e scadenze pratiche
 * I calcoli stanno in src/lib/statisticheModel.js.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { supabase } from "../lib/supabase";
import {
  calcolaIncassiPrevisti, calcolaTempiIncasso, calcolaFatturato,
  calcolaOreProgetti, calcolaCantieri,
} from "../lib/statisticheModel";

// ── helpers ──────────────────────────────────────────────────────
const eur = (v, d = 0) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: d }).format(Number(v) || 0);
const eurK = v => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)));
const num = (v, d = 0) => new Intl.NumberFormat("it-IT", { maximumFractionDigits: d }).format(Number(v) || 0);
const dataIt = d => (d ? d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const gg = v => (v == null ? "—" : `${Math.round(v)} gg`);

const PAGE = 1000;
// Supabase restituisce al massimo 1000 righe per richiesta: pagina sempre.
async function fetchAll(build) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) { console.warn("[statistiche]", error.message); break; }
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}
// .in() con tanti id: a blocchi, per non superare la lunghezza dell'URL.
async function fetchIn(build, col, ids, size = 150) {
  const out = [];
  for (let i = 0; i < ids.length; i += size) {
    const chunk = ids.slice(i, i + size);
    out.push(...await fetchAll(() => build().in(col, chunk)));
  }
  return out;
}
const dedupe = rows => [...new Map(rows.map(r => [r.id, r])).values()];

// ── UI condivisa (stesso stile della pagina) ──────────────────────
function Kpi({ label, value, sub, color, T }) {
  return (
    <div style={{ background: T.surface, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, padding: "16px 20px", minWidth: 0 }}>
      <div style={{ fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: color || T.ink, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--font-label)", fontSize: 10, color: T.muted, marginTop: 8 }}>{sub}</div>}
    </div>
  );
}
function Panel({ title, right, children, T, style = {}, foot }) {
  return (
    <div style={{ background: T.surface, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: "hidden", minWidth: 0, ...style }}>
      {title && (
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: T.ink, flex: 1 }}>{title}</div>
          {right}
        </div>
      )}
      {children}
      {foot && <div style={{ fontFamily: "var(--font-label)", fontSize: 10, color: T.muted, padding: "10px 20px", borderTop: `1px solid ${T.border}`, background: T.surface2, lineHeight: 1.5 }}>{foot}</div>}
    </div>
  );
}
const Vuoto = ({ T, children }) => <div style={{ fontFamily: "var(--font-label)", fontSize: 11, color: T.muted, textAlign: "center", padding: 28 }}>{children}</div>;
const Caricamento = ({ T }) => <Vuoto T={T}>Caricamento…</Vuoto>;
function Pill({ children, color, T }) {
  return <span style={{ display: "inline-block", fontFamily: "var(--font-label)", fontSize: 10, fontWeight: 600, color, background: `${color}1f`, borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>{children}</span>;
}
function Barra({ value, color, T, max = 1 }) {
  const w = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div style={{ height: 6, borderRadius: 3, background: T.surface3 || T.border, overflow: "hidden", minWidth: 60 }}>
      <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 3 }} />
    </div>
  );
}
const useStili = T => ({
  th: { fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, padding: "10px 16px", borderBottom: `0.5px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap" },
  td: { fontFamily: "var(--font-label)", fontSize: 11, color: T.ink, padding: "10px 16px", borderBottom: `0.5px solid ${T.border}` },
  tdNome: { fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600 },
});
const griglia = (isMobile, min = 160) => ({ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: isMobile ? 8 : 12 });
const tooltipStyle = T => ({ background: T.surface, border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, fontFamily: "var(--font-label)", fontSize: 11 });

// ══ COMMESSE E INCASSI ════════════════════════════════════════════
export function StatCommesseIncassi({ T, studioId, commesse, offerte, anno, isMobile }) {
  const navigate = useNavigate();
  const st = useStili(T);
  const [dati, setDati] = useState(null);
  const [vistaFatt, setVistaFatt] = useState("cliente");

  useEffect(() => {
    if (!studioId) return;
    let alive = true;
    (async () => {
      const ids = commesse.map(c => c.id);
      const [rate, pfStudio, pfComm] = await Promise.all([
        fetchIn(() => supabase.from("suddivisione_pagamenti").select("id,commessa_id,percentuale,importo_fisso,pagato,data_pagamento,label").is("deleted_at", null).order("id"), "commessa_id", ids),
        fetchAll(() => supabase.from("proforma").select("*").eq("studio", studioId).is("deleted_at", null).order("id")),
        // proforma vecchie senza colonna studio: le prende dalla commessa
        fetchIn(() => supabase.from("proforma").select("*").is("studio", null).is("deleted_at", null).order("id"), "commessa_id", ids),
      ]);
      if (alive) setDati({ rate, proforma: dedupe([...pfStudio, ...pfComm]) });
    })();
    return () => { alive = false; };
  }, [studioId, commesse]);

  const previsti = useMemo(() => dati && calcolaIncassiPrevisti({ commesse, rate: dati.rate, proforma: dati.proforma }), [dati, commesse]);
  const tempi = useMemo(() => dati && calcolaTempiIncasso({ commesse, proforma: dati.proforma, anno }), [dati, commesse, anno]);
  const fatt = useMemo(() => dati && calcolaFatturato({ commesse, rate: dati.rate, proforma: dati.proforma, offerte, anno }), [dati, commesse, offerte, anno]);

  if (!dati) return <Caricamento T={T} />;
  const periodo = anno === 0 ? "tutti gli anni" : String(anno);
  const chartPrev = [
    ...(previsti.totScaduto > 0 ? [{ label: "Scaduti", importo: previsti.totScaduto, scaduto: true }] : []),
    ...previsti.mesi,
  ];
  const righeFatt = vistaFatt === "cliente" ? fatt.perCliente : fatt.perPrestazione;
  const maxFatt = Math.max(1, ...righeFatt.map(r => r.fatturato));
  const tabBtn = (k, l) => (
    <button key={k} onClick={() => setVistaFatt(k)} style={{ border: "none", cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 10, letterSpacing: "0.06em", padding: "5px 12px", borderRadius: 999, background: vistaFatt === k ? T.navy : "transparent", color: vistaFatt === k ? "#fff" : T.muted }}>{l}</button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={griglia(isMobile)}>
        <Kpi T={T} label="Da incassare (3 mesi)" value={eur(previsti.prossimi3)} sub="proforma in scadenza" />
        <Kpi T={T} label="Scaduto" value={eur(previsti.totScaduto)} color={previsti.totScaduto > 0 ? T.red : T.ink} sub={`${previsti.scadute.length} proforma`} />
        <Kpi T={T} label="Rate da fatturare" value={eur(previsti.totDaFatturare)} sub={`${previsti.nRateDaFatturare} rate, senza proforma`} />
        <Kpi T={T} label="Giorni medi d'incasso" value={gg(tempi.mediaIncasso)} sub={`dall'emissione · ${periodo}`} />
        <Kpi T={T} label="Ritardo medio" value={gg(tempi.mediaRitardo)} color={tempi.mediaRitardo > 0 ? T.red : T.ink} sub={tempi.pctInRitardo == null ? "sulla scadenza" : `${tempi.pctInRitardo}% pagate in ritardo`} />
        <Kpi T={T} label={`Fatturato ${periodo}`} value={eur(fatt.totFatt)} sub={`incassato ${eur(fatt.totInc)}`} />
      </div>

      {/* Incassi previsti mese per mese */}
      <Panel T={T} title="Incassi previsti mese per mese"
        foot={<>Proforma emesse e non pagate, nel mese della loro scadenza{previsti.oltre > 0 ? ` (oltre 12 mesi: ${eur(previsti.oltre)})` : ""}{previsti.senzaScad > 0 ? ` · senza scadenza: ${eur(previsti.senzaScad)}` : ""}. Le rate non ancora in proforma non hanno una data: sono nel riquadro "Rate da fatturare".</>}>
        <div style={{ padding: "16px 12px 8px 4px", height: 250 }}>
          {previsti.totMesi + previsti.totScaduto === 0
            ? <Vuoto T={T}>Nessuna proforma da incassare.</Vuoto>
            : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartPrev} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" interval={isMobile ? 1 : 0} tick={{ fill: T.muted, fontSize: 10, fontFamily: "var(--font-label)" }} axisLine={{ stroke: T.border }} tickLine={false} />
                  <YAxis width={44} tickFormatter={eurK} tick={{ fill: T.muted, fontSize: 10, fontFamily: "var(--font-label)" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: T.surface2 }} contentStyle={tooltipStyle(T)} formatter={v => [eur(v), "Da incassare"]} />
                  <Bar dataKey="importo" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {chartPrev.map(d => <Cell key={d.label} fill={d.scaduto ? T.red : T.navy} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Proforma scadute */}
        <Panel T={T} title="Proforma scadute non pagate" right={previsti.scadute.length > 0 && <Pill T={T} color={T.red}>{previsti.scadute.length}</Pill>} style={{ overflowX: "auto" }}>
          {previsti.scadute.length === 0
            ? <Vuoto T={T}>Nessuna proforma scaduta. 👍</Vuoto>
            : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 380 }}>
                <thead><tr><th style={st.th}>Cliente</th><th style={st.th}>Proforma</th><th style={{ ...st.th, textAlign: "right" }}>Importo</th><th style={{ ...st.th, textAlign: "right" }}>Ritardo</th></tr></thead>
                <tbody>
                  {previsti.scadute.slice(0, 10).map(s => (
                    <tr key={s.id} onClick={() => s.commessaId && navigate(`/commesse/${s.commessaId}`)} style={{ cursor: s.commessaId ? "pointer" : "default" }}>
                      <td style={{ ...st.td, ...st.tdNome }}>{s.cliente}<div style={{ fontFamily: "var(--font-label)", fontSize: 10, fontWeight: 400, color: T.muted, marginTop: 2 }}>{s.commessa}</div></td>
                      <td style={{ ...st.td, color: T.muted }}>{s.numero}<div style={{ fontSize: 10 }}>scad. {dataIt(s.scadenza)}</div></td>
                      <td style={{ ...st.td, textAlign: "right", fontWeight: 600 }}>{eur(s.importo)}</td>
                      <td style={{ ...st.td, textAlign: "right", color: T.red, fontWeight: 600 }}>{s.giorni} gg</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </Panel>

        {/* Rate ancora da fatturare */}
        <Panel T={T} title="Rate ancora da fatturare" style={{ overflowX: "auto" }}
          foot="Rate non pagate e non ancora inserite in una proforma, delle commesse attive (non archiviate).">
          {previsti.daFatturare.length === 0
            ? <Vuoto T={T}>Nessuna rata in sospeso.</Vuoto>
            : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 340 }}>
                <thead><tr><th style={st.th}>Commessa</th><th style={{ ...st.th, textAlign: "right" }}>Rate</th><th style={{ ...st.th, textAlign: "right" }}>Importo</th></tr></thead>
                <tbody>
                  {previsti.daFatturare.slice(0, 10).map(r => (
                    <tr key={r.commessaId} onClick={() => navigate(`/commesse/${r.commessaId}`)} style={{ cursor: "pointer" }}>
                      <td style={{ ...st.td, ...st.tdNome }}>{r.commessa}<div style={{ fontFamily: "var(--font-label)", fontSize: 10, fontWeight: 400, color: T.muted, marginTop: 2 }}>{r.cliente}</div></td>
                      <td style={{ ...st.td, textAlign: "right", color: T.muted }}>{r.n}</td>
                      <td style={{ ...st.td, textAlign: "right", fontWeight: 600 }}>{eur(r.importo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </Panel>
      </div>

      {/* Fatturato vs incassato nel tempo */}
      <Panel T={T} title={`Fatturato e incassato — ${anno === 0 ? "per anno" : `per mese, ${anno}`}`}
        foot="Fatturato = proforma emesse (data di emissione). Incassato = proforma pagate (data di pagamento).">
        <div style={{ padding: "16px 12px 8px 4px", height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fatt.andamento} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" interval={isMobile ? 1 : 0} tick={{ fill: T.muted, fontSize: 10, fontFamily: "var(--font-label)" }} axisLine={{ stroke: T.border }} tickLine={false} />
              <YAxis width={44} tickFormatter={eurK} tick={{ fill: T.muted, fontSize: 10, fontFamily: "var(--font-label)" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: T.surface2 }} contentStyle={tooltipStyle(T)} formatter={(v, n) => [eur(v), n]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: "var(--font-label)", fontSize: 10 }} />
              <Bar dataKey="fatturato" name="Fatturato" fill={T.navy} radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="incassato" name="Incassato" fill={T.green} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Fatturato per cliente / prestazione */}
        <Panel T={T} title={`Fatturato per ${vistaFatt === "cliente" ? "cliente" : "prestazione"} — ${periodo}`}
          right={<div style={{ display: "flex", gap: 2, background: T.surface2, borderRadius: 999, padding: 2 }}>{tabBtn("cliente", "Cliente")}{tabBtn("prestazione", "Prestazione")}</div>}
          style={{ overflowX: "auto" }}
          foot={vistaFatt === "prestazione" ? "La quota di ogni proforma è divisa tra le prestazioni dell'offerta accettata collegata alla commessa, in proporzione ai prezzi delle voci." : null}>
          {righeFatt.length === 0
            ? <Vuoto T={T}>Nessuna proforma emessa nel periodo.</Vuoto>
            : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
                <thead><tr>
                  <th style={st.th}>{vistaFatt === "cliente" ? "Cliente" : "Prestazione"}</th>
                  <th style={{ ...st.th, width: "28%" }}></th>
                  <th style={{ ...st.th, textAlign: "right" }}>Fatturato</th>
                  <th style={{ ...st.th, textAlign: "right" }}>Incassato</th>
                </tr></thead>
                <tbody>
                  {righeFatt.slice(0, 15).map(r => (
                    <tr key={r.cliente || r.nome}>
                      <td style={{ ...st.td, ...st.tdNome }}>{r.cliente || r.nome}{r.commesse ? <span style={{ fontFamily: "var(--font-label)", fontSize: 10, fontWeight: 400, color: T.muted, marginLeft: 6 }}>{r.commesse} comm.</span> : null}</td>
                      <td style={st.td}><Barra T={T} value={r.fatturato} max={maxFatt} color={T.navy} /></td>
                      <td style={{ ...st.td, textAlign: "right", fontWeight: 600 }}>{eur(r.fatturato)}</td>
                      <td style={{ ...st.td, textAlign: "right", color: T.green }}>{eur(r.incassato)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </Panel>

        {/* Chi paga più tardi */}
        <Panel T={T} title={`Tempi di pagamento per cliente — ${periodo}`} style={{ overflowX: "auto" }}
          foot={<>Giorni = dall'emissione della proforma al pagamento. Ritardo = giorni oltre la scadenza (0 se pagata in tempo). Su {tempi.n} proforma pagate{anno ? ` nel ${anno}` : ""}.</>}>
          {tempi.perCliente.length === 0
            ? <Vuoto T={T}>Nessuna proforma pagata con data.</Vuoto>
            : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 320 }}>
                <thead><tr><th style={st.th}>Cliente</th><th style={{ ...st.th, textAlign: "right" }}>Pag.</th><th style={{ ...st.th, textAlign: "right" }}>Giorni</th><th style={{ ...st.th, textAlign: "right" }}>Ritardo</th></tr></thead>
                <tbody>
                  {tempi.perCliente.slice(0, 12).map(r => (
                    <tr key={r.cliente}>
                      <td style={{ ...st.td, ...st.tdNome }}>{r.cliente}</td>
                      <td style={{ ...st.td, textAlign: "right", color: T.muted }}>{r.n}</td>
                      <td style={{ ...st.td, textAlign: "right" }}>{gg(r.mediaIncasso)}</td>
                      <td style={{ ...st.td, textAlign: "right", fontWeight: 600, color: r.mediaRitardo > 0 ? T.red : T.green }}>{gg(r.mediaRitardo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </Panel>
      </div>
    </div>
  );
}

// ══ ORE PER PROGETTO ══════════════════════════════════════════════
const SOGLIA_KEY = "asm_stat_soglia_euro_ora";
export function StatOre({ T, studioId, commesse, isMobile }) {
  const navigate = useNavigate();
  const st = useStili(T);
  const [dati, setDati] = useState(null);
  const [soglia, setSoglia] = useState(() => { try { return Number(localStorage.getItem(SOGLIA_KEY)) || 50; } catch { return 50; } });
  const [soloSfora, setSoloSfora] = useState(false);
  const [mostraArch, setMostraArch] = useState(false);
  useEffect(() => { try { localStorage.setItem(SOGLIA_KEY, String(soglia || "")); } catch { /* storage non disponibile */ } }, [soglia]);

  useEffect(() => {
    if (!studioId) return;
    let alive = true;
    (async () => {
      const projects = await fetchAll(() => supabase.from("projects").select("id,name,client,budget_ore,archived").eq("studio", studioId).is("deleted_at", null).order("id"));
      // ore contate per progetto (come nel dettaglio progetto), non per studio
      const ids = projects.map(p => p.id);
      const ts = await fetchIn(() => supabase.from("timesheet").select("id,project_id,hours").is("deleted_at", null).order("id"), "project_id", ids, 100);
      const ore = {};
      ts.forEach(t => { ore[t.project_id] = (ore[t.project_id] || 0) + (Number(t.hours) || 0); });
      if (alive) setDati({ projects, ore });
    })();
    return () => { alive = false; };
  }, [studioId]);

  const res = useMemo(() => dati && calcolaOreProgetti({
    projects: dati.projects.filter(p => mostraArch || !p.archived), commesse, orePerProgetto: dati.ore, soglia: Number(soglia) || 0,
  }), [dati, commesse, soglia, mostraArch]);

  if (!dati) return <Caricamento T={T} />;
  const righe = soloSfora ? res.righe.filter(r => r.sfora) : res.righe;
  const chk = (val, set, label) => (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-label)", fontSize: 11, color: T.muted, cursor: "pointer", whiteSpace: "nowrap" }}>
      <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} style={{ accentColor: T.navy }} /> {label}
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={griglia(isMobile)}>
        <Kpi T={T} label="€/ora medio" value={res.euroOraMedio == null ? "—" : eur(res.euroOraMedio)} sub="valore commesse ÷ ore" />
        <Kpi T={T} label="Ore registrate" value={num(res.oreTotali)} sub={`${res.righe.length} progetti`} />
        <Kpi T={T} label="Sotto soglia" value={String(res.nSottoSoglia)} color={res.nSottoSoglia ? T.red : T.ink} sub={`meno di ${eur(soglia)}/ora`} />
        <Kpi T={T} label="Oltre budget ore" value={String(res.nOltreBudget)} color={res.nOltreBudget ? T.red : T.ink} sub={`su ${res.nConBudget} con budget`} />
      </div>

      <Panel T={T} title="Ore spese rispetto al valore della commessa" style={{ overflowX: "auto" }}
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-label)", fontSize: 11, color: T.muted }}>
              Soglia
              <input type="number" min={0} step={5} value={soglia} onChange={e => setSoglia(e.target.value === "" ? "" : Number(e.target.value))}
                style={{ width: 64, fontFamily: "var(--font-label)", fontSize: 11, padding: "5px 8px", border: `1px solid ${T.border}`, background: T.inputBg || T.surface, color: T.ink, borderRadius: T.radiusSm, outline: "none" }} />
              €/ora
            </label>
            {chk(soloSfora, setSoloSfora, "Solo chi sfora")}
            {chk(mostraArch, setMostraArch, "Archiviati")}
          </div>
        }
        foot={<>€/ora effettivi = valore delle commesse del progetto ÷ ore registrate nel timesheet (tutti gli anni). Sfora = €/ora sotto la soglia, oppure ore oltre il budget ore del progetto (si imposta dal menu del progetto → Budget ore). La soglia resta salvata su questo dispositivo.</>}>
        {righe.length === 0
          ? <Vuoto T={T}>{soloSfora ? "Nessun progetto sfora. 👍" : "Nessun progetto con ore o commesse."}</Vuoto>
          : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead><tr>
                <th style={st.th}>Progetto</th>
                <th style={{ ...st.th, textAlign: "right" }}>Valore</th>
                <th style={{ ...st.th, textAlign: "right" }}>Ore</th>
                <th style={{ ...st.th, textAlign: "right" }}>€/ora</th>
                <th style={{ ...st.th, minWidth: 130 }}>Budget ore</th>
                <th style={st.th}></th>
              </tr></thead>
              <tbody>
                {righe.map(r => (
                  <tr key={r.id} onClick={() => navigate(`/progetti/${r.id}`)} style={{ cursor: "pointer" }}>
                    <td style={{ ...st.td, ...st.tdNome }}>{r.nome}<div style={{ fontFamily: "var(--font-label)", fontSize: 10, fontWeight: 400, color: T.muted, marginTop: 2 }}>{r.cliente}{r.archiviato ? " · archiviato" : ""}</div></td>
                    <td style={{ ...st.td, textAlign: "right" }}>{r.importo > 0 ? eur(r.importo) : "—"}</td>
                    <td style={{ ...st.td, textAlign: "right" }}>{num(r.ore, 1)}</td>
                    <td style={{ ...st.td, textAlign: "right", fontWeight: 700, color: r.sottoSoglia ? T.red : r.euroOra != null ? T.green : T.muted }}>{r.euroOra == null ? "—" : eur(r.euroOra)}</td>
                    <td style={st.td}>
                      {r.budget > 0
                        ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1 }}><Barra T={T} value={r.pctBudget} color={r.oltreBudget ? T.red : r.pctBudget > 0.85 ? (T.yellow || T.brass) : T.navy} /></div>
                            <span style={{ fontSize: 10, color: r.oltreBudget ? T.red : T.muted, whiteSpace: "nowrap" }}>{Math.round(r.pctBudget * 100)}% di {num(r.budget)}</span>
                          </div>
                        : <span style={{ color: T.muted }}>—</span>}
                    </td>
                    <td style={{ ...st.td, textAlign: "right" }}>
                      {r.oltreBudget && <Pill T={T} color={T.red}>Oltre budget</Pill>}
                      {r.sottoSoglia && <> {" "}<Pill T={T} color={T.red}>Sotto soglia</Pill></>}
                      {r.senzaImporto && <Pill T={T} color={T.muted}>Senza commessa</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>}
      </Panel>
    </div>
  );
}

// ══ CANTIERI ══════════════════════════════════════════════════════
const STATO_CANTIERE = {
  in_corso:    { label: "In corso",    key: "navy" },
  da_iniziare: { label: "Da iniziare", key: "muted" },
  concluso:    { label: "Concluso",    key: "green" },
  senza_gantt: { label: "Senza Gantt", key: "muted" },
};
const STATO_PRATICA_COL = { in_istruttoria: "navy", approvata: "green", sospesa: "brass", respinta: "red", ritirata: "muted" };

export function StatCantieri({ T, studioId, isMobile }) {
  const navigate = useNavigate();
  const st = useStili(T);
  const [dati, setDati] = useState(null);
  const [mostraConclusi, setMostraConclusi] = useState(false);

  useEffect(() => {
    if (!studioId) return;
    let alive = true;
    (async () => {
      const [projects, versions, lavorazioni, reports, pratiche] = await Promise.all([
        fetchAll(() => supabase.from("projects").select("id,name,client,archived").eq("studio", studioId).is("deleted_at", null).order("id")),
        fetchAll(() => supabase.from("gantt_versions").select("id,project_id,created_at").eq("studio", studioId).is("deleted_at", null).order("id")),
        fetchAll(() => supabase.from("lavorazioni_gantt").select("id,project_id,version_id,descrizione,operatore,data_inizio,data_fine").eq("studio", studioId).is("deleted_at", null).order("id")),
        fetchAll(() => supabase.from("report_cantiere").select("id,project_id,data_ora").eq("studio", studioId).is("deleted_at", null).order("id")),
        fetchAll(() => supabase.from("pratiche_edilizie").select("id,project_id,tipo_pratica,note").eq("studio", studioId).order("id")),
      ]);
      if (alive) setDati({ projects, versions, lavorazioni, reports, pratiche });
    })();
    return () => { alive = false; };
  }, [studioId]);

  const res = useMemo(() => {
    if (!dati) return null;
    const attivi = new Set(dati.projects.filter(p => !p.archived).map(p => p.id));
    return calcolaCantieri({ ...dati, pratiche: dati.pratiche.filter(p => attivi.has(p.project_id)) });
  }, [dati]);

  if (!res) return <Caricamento T={T} />;
  const col = k => T[k] || T.muted;
  const lista = res.cantieri.filter(c => (mostraConclusi || c.stato !== "concluso") && !(c.archiviato && c.stato !== "in_corso"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={griglia(isMobile)}>
        <Kpi T={T} label="Cantieri in corso" value={String(res.nInCorso)} sub="secondo il Gantt" />
        <Kpi T={T} label="Fine lavori entro 30 gg" value={String(res.nFineEntro30)} />
        <Kpi T={T} label="Report ultimi 30 gg" value={String(res.report30)} sub="sopralluoghi registrati" />
        <Kpi T={T} label="Senza report da 14+ gg" value={String(res.nSenzaReport)} color={res.nSenzaReport ? T.red : T.ink} sub="cantieri in corso" />
        <Kpi T={T} label="Scadenze pratiche 30 gg" value={String(res.nScadenze30)} sub={res.nScadute ? `${res.nScadute} già scadute` : "nessuna scaduta"} color={res.nScadute ? T.red : T.ink} />
      </div>

      <Panel T={T} title="Cantieri" style={{ overflowX: "auto" }}
        right={<label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-label)", fontSize: 11, color: T.muted, cursor: "pointer" }}>
          <input type="checkbox" checked={mostraConclusi} onChange={e => setMostraConclusi(e.target.checked)} style={{ accentColor: T.navy }} /> Conclusi
        </label>}
        foot="Date dall'ultima versione del Gantt di ogni progetto. Avanzamento = tempo trascorso sul totale previsto (il Gantt non registra la % di lavoro fatto). Ultimo report = ultimo report di cantiere.">
        {lista.length === 0
          ? <Vuoto T={T}>Nessun cantiere con Gantt o report.</Vuoto>
          : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead><tr>
                <th style={st.th}>Progetto</th>
                <th style={st.th}>Stato</th>
                <th style={{ ...st.th, minWidth: 150 }}>Tempo trascorso</th>
                <th style={st.th}>Fine prevista</th>
                <th style={st.th}>Oggi in cantiere</th>
                <th style={{ ...st.th, textAlign: "right" }}>Ultimo report</th>
              </tr></thead>
              <tbody>
                {lista.map(c => {
                  const s = STATO_CANTIERE[c.stato];
                  const imprese = [...new Set(c.lavOggi.map(l => l.impresa).filter(Boolean))];
                  return (
                    <tr key={c.id} onClick={() => navigate(`/progetti/${c.id}`)} style={{ cursor: "pointer" }}>
                      <td style={{ ...st.td, ...st.tdNome }}>{c.nome}<div style={{ fontFamily: "var(--font-label)", fontSize: 10, fontWeight: 400, color: T.muted, marginTop: 2 }}>{c.cliente}</div></td>
                      <td style={st.td}><Pill T={T} color={col(s.key)}>{s.label}</Pill></td>
                      <td style={st.td}>
                        {c.pctTempo == null ? <span style={{ color: T.muted }}>—</span> : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1 }}><Barra T={T} value={c.pctTempo} color={c.stato === "concluso" ? T.green : T.navy} /></div>
                            <span style={{ fontSize: 10, color: T.muted }}>{Math.round(c.pctTempo * 100)}%</span>
                          </div>
                        )}
                      </td>
                      <td style={st.td}>
                        {dataIt(c.fine)}
                        {c.giorniAllaFine != null && <div style={{ fontSize: 10, color: c.giorniAllaFine <= 30 ? (T.brass || T.navy) : T.muted }}>tra {c.giorniAllaFine} gg</div>}
                      </td>
                      <td style={{ ...st.td, color: c.lavOggi.length ? T.ink : T.muted }}>
                        {c.lavOggi.length ? `${c.lavOggi.length} lavoraz.` : "—"}
                        {imprese.length > 0 && <div style={{ fontSize: 10, color: T.muted, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{imprese.join(", ")}</div>}
                      </td>
                      <td style={{ ...st.td, textAlign: "right", color: c.senzaReport ? T.red : T.ink, fontWeight: c.senzaReport ? 600 : 400 }}>
                        {c.giorniDaReport == null ? "mai" : c.giorniDaReport === 0 ? "oggi" : `${c.giorniDaReport} gg fa`}
                        <div style={{ fontSize: 10, color: T.muted, fontWeight: 400 }}>{c.nReport} report</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>}
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr", gap: 16, alignItems: "start" }}>
        <Panel T={T} title="Scadenze pratiche (prossimi 60 gg)" style={{ overflowX: "auto" }}
          foot="Scadenze impostate nelle pratiche edilizie dei progetti attivi; escluse le pratiche approvate, respinte o ritirate.">
          {res.scadenze.length === 0
            ? <Vuoto T={T}>Nessuna scadenza in arrivo.</Vuoto>
            : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
                <thead><tr><th style={st.th}>Progetto</th><th style={st.th}>Pratica</th><th style={{ ...st.th, textAlign: "right" }}>Scadenza</th></tr></thead>
                <tbody>
                  {res.scadenze.map(s => (
                    <tr key={s.id} onClick={() => navigate(`/progetti/${s.projectId}`)} style={{ cursor: "pointer" }}>
                      <td style={{ ...st.td, ...st.tdNome }}>{s.progetto}</td>
                      <td style={st.td}>{s.pratica}{s.label && <div style={{ fontSize: 10, color: T.muted }}>{s.label}</div>}</td>
                      <td style={{ ...st.td, textAlign: "right", fontWeight: 600, color: s.giorni < 0 ? T.red : s.giorni <= 7 ? (T.brass || T.red) : T.ink }}>
                        {dataIt(s.data)}
                        <div style={{ fontSize: 10, fontWeight: 400 }}>{s.giorni < 0 ? `scaduta da ${-s.giorni} gg` : s.giorni === 0 ? "oggi" : `tra ${s.giorni} gg`}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </Panel>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel T={T} title="Imprese in cantiere" style={{ overflowX: "auto" }} foot="Lavorazioni del Gantt in corso oggi e in partenza nei prossimi 14 giorni.">
            {res.imprese.length === 0
              ? <Vuoto T={T}>Nessuna impresa al lavoro.</Vuoto>
              : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 300 }}>
                  <thead><tr><th style={st.th}>Impresa</th><th style={{ ...st.th, textAlign: "right" }}>Oggi</th><th style={{ ...st.th, textAlign: "right" }}>14 gg</th></tr></thead>
                  <tbody>
                    {res.imprese.slice(0, 10).map(i => (
                      <tr key={i.impresa}>
                        <td style={{ ...st.td, ...st.tdNome }}>{i.impresa}<div style={{ fontFamily: "var(--font-label)", fontSize: 10, fontWeight: 400, color: T.muted, marginTop: 2 }}>{i.cantieri.join(", ")}</div></td>
                        <td style={{ ...st.td, textAlign: "right", fontWeight: 600 }}>{i.oggi || "—"}</td>
                        <td style={{ ...st.td, textAlign: "right", color: T.muted }}>{i.prossimi || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>}
          </Panel>

          <Panel T={T} title={`Pratiche edilizie (${res.nPratiche})`}>
            {res.praticheStato.map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: i < res.praticheStato.length - 1 ? `0.5px solid ${T.border}` : "none" }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: col(STATO_PRATICA_COL[s.id]), flexShrink: 0 }} />
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: T.ink, flex: 1 }}>{s.label}</div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: T.ink }}>{s.n}</div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}
