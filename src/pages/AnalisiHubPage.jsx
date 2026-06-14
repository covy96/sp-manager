/**
 * AnalisiHubPage — BETA
 * Unifica Analisi Offerte, Monitoraggio Commesse e Analisi Economica
 * in un'unica pagina con SlidingTabs.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { useTheme } from "../contexts/ThemeContext";
import { usePermissions } from "../hooks/usePermissions";
import { usePlan } from "../hooks/usePlan";
import { useIsMobile } from "../hooks/useIsMobile";
import { supabase } from "../lib/supabase";
import { calcolaIncassato } from "../lib/utils";
import SlidingTabs from "../components/SlidingTabs";

// ── helpers ──────────────────────────────────────────────────────
function currency(v, decimals = 0) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: decimals }).format(Number(v) || 0);
}
function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function fmtOre(h) {
  const tot = Math.round(h * 60);
  return `${Math.floor(tot / 60)}:${String(tot % 60).padStart(2, "0")}`;
}
function getReferenceDate(c) { return c.data_commessa || c.created_at || null; }
function getDaysOpen(d) {
  if (!d) return 0;
  const s = new Date(d);
  return isNaN(s.getTime()) ? 0 : Math.max(0, Math.floor((Date.now() - s.getTime()) / 86400000));
}
function parseOffertaSortValue(n) {
  if (!n) return Number.NEGATIVE_INFINITY;
  const m = String(n).match(/(\d+)\D+(\d{2,4})/);
  if (!m) return Number.NEGATIVE_INFINITY;
  const y = Number(m[2]) < 100 ? 2000 + Number(m[2]) : Number(m[2]);
  return y * 10000 + Number(m[1]);
}

const MONTHS = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

const PALETTE = [
  "#1e3a5f","#2d5a8e","#4a7cb5","#6d9fd4","#9ec2e8",
  "#1a6b3c","#2d9c5e","#56c98a","#a8e6c3",
  "#7c3aed","#a78bfa","#854d0e","#f59e0b",
];

const OFFERTA_TABS = [
  { key: "tutte",     label: "Tutte"     },
  { key: "offerta",   label: "In corso"  },
  { key: "accettata", label: "Accettate" },
  { key: "rifiutata", label: "Rifiutate" },
];

const STATI = {
  offerta:   { label: "In corso",  color: "#854d0e", bg: "rgba(253,230,138,0.25)" },
  accettata: { label: "Accettata", color: "#1a6b3c", bg: "rgba(134,239,172,0.20)" },
  rifiutata: { label: "Rifiutata", color: "#b91c1c", bg: "rgba(252,165,165,0.20)" },
};

// ── Shared UI ─────────────────────────────────────────────────────
function KpiCard({ label, value, color, T, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? T.navy : T.surface,
        backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm,
        border: `1px solid ${active ? T.navy : T.border}`,
        borderRadius: T.radius,
        boxShadow: active ? T.shadowMd : T.shadow,
        padding: "16px 18px",
        cursor: onClick ? "pointer" : "default",
        transition: "background 180ms, box-shadow 180ms, transform 150ms",
        transform: active ? "translateY(-1px)" : "none",
      }}
      onMouseEnter={e => { if (onClick && !active) e.currentTarget.style.boxShadow = T.shadowMd; }}
      onMouseLeave={e => { if (onClick && !active) e.currentTarget.style.boxShadow = T.shadow; }}
    >
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: active ? "rgba(255,255,255,0.65)" : T.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", color: active ? "#fff" : (color || T.ink), lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, T, style = {} }) {
  return (
    <div style={{ background: T.surface, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: "hidden", ...style }}>
      {title && (
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600, color: T.ink }}>{title}</div>
        </div>
      )}
      {children}
    </div>
  );
}

// ── TAB 1: Analisi Offerte ────────────────────────────────────────
function TabOfferte({ offerte, commessaByNumero, vociTemplate, T, navigate, anno, isMobile }) {
  const [ofTab, setOfTab]           = useState("tutte");
  const [hoveredVoce, setHoveredVoce] = useState(null);
  const [pieModal, setPieModal]     = useState(false);
  const [voceModal, setVoceModal]   = useState(null); // { nome, color, offerte[] }
  const [sortBy, setSortBy]         = useState("data");
  const [sortDir, setSortDir]       = useState("desc");

  const handleSort = col => {
    if (sortBy === col) setSortDir(p => p === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };
  const SortBtn = ({ col, label, align = "left" }) => (
    <button onClick={() => handleSort(col)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: sortBy === col ? T.navy : T.muted, display: "inline-flex", alignItems: "center", gap: 4, width: "100%", justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
      {label} <span style={{ fontSize: 9 }}>{sortBy === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
    </button>
  );

  const offerteFiltrate = useMemo(() => {
    let r = anno === 0 ? offerte : offerte.filter(o => new Date(o.data_offerta || o.created_at).getFullYear() === anno);
    if (ofTab !== "tutte") r = r.filter(o => o.stato === ofTab);
    return r;
  }, [offerte, anno, ofTab]);

  const righeVoci = useMemo(() => {
    const map = {};
    for (const t of vociTemplate) {
      map[t.nome.trim().toLowerCase()] = { nome: t.nome, order: t.order ?? 0, isTemplate: true, totale: 0, count: 0 };
    }
    for (const off of offerteFiltrate) {
      const sconto = Number(off.sconto) || 0;
      const voci = Array.isArray(off.voci) && off.voci.length > 0
        ? off.voci : [{ nome: off.nome_offerta || "Prestazione", prezzo: Number(off.importo_offerta_base) || 0, attiva: true }];
      const lordi = voci.filter(v => v.attiva !== false).reduce((s, v) => s + Number(v.prezzo || 0), 0);
      const alreadyDisc = sconto > 0 && Math.abs(lordi - Number(off.importo_offerta_base)) < 0.5;
      const norm = alreadyDisc ? voci.map(v => ({ ...v, prezzo: Math.round(Number(v.prezzo || 0) / (1 - sconto / 100) * 100) / 100 })) : voci;
      for (const v of norm) {
        if (v.attiva === false) continue;
        const k = (v.nome || "—").trim().toLowerCase();
        if (!map[k]) map[k] = { nome: (v.nome || "—").trim(), order: 9999, isTemplate: false, totale: 0, count: 0 };
        map[k].totale += Number(v.prezzo || 0);
        map[k].count++;
      }
    }
    return Object.values(map).filter(r => r.isTemplate).sort((a, b) => a.order - b.order);
  }, [offerteFiltrate, vociTemplate]);

  const totalTemplate = useMemo(() => righeVoci.reduce((s, r) => s + r.totale, 0), [righeVoci]);

  // mappa voce_key → lista offerte che la contengono
  const voceOfferteMap = useMemo(() => {
    const map = {};
    for (const off of offerteFiltrate) {
      const sconto = Number(off.sconto) || 0;
      const voci = Array.isArray(off.voci) && off.voci.length > 0
        ? off.voci : [{ nome: off.nome_offerta || "Prestazione", prezzo: Number(off.importo_offerta_base) || 0, attiva: true }];
      const lordi = voci.filter(v => v.attiva !== false).reduce((s, v) => s + Number(v.prezzo || 0), 0);
      const alreadyDisc = sconto > 0 && Math.abs(lordi - Number(off.importo_offerta_base)) < 0.5;
      const norm = alreadyDisc ? voci.map(v => ({ ...v, prezzo: Math.round(Number(v.prezzo || 0) / (1 - sconto / 100) * 100) / 100 })) : voci;
      for (const v of norm) {
        if (v.attiva === false) continue;
        const k = (v.nome || "—").trim().toLowerCase();
        if (!map[k]) map[k] = [];
        map[k].push({ offerta: off, prezzoVoce: Number(v.prezzo || 0) });
      }
    }
    return map;
  }, [offerteFiltrate]);
  const pieData = useMemo(() =>
    righeVoci.filter(r => r.totale > 0).map((r, i) => ({ name: r.nome, value: r.totale, color: PALETTE[i % PALETTE.length] })),
  [righeVoci]);

  // calcoli su TUTTE le offerte dell'anno (non filtrate per stato) per i contatori
  const offerteTutte = useMemo(() => anno === 0 ? offerte : offerte.filter(o => new Date(o.data_offerta || o.created_at).getFullYear() === anno), [offerte, anno]);
  const nTot   = offerteTutte.length;
  const nAcc   = offerteTutte.filter(o => o.stato === "accettata").length;
  const nRif   = offerteTutte.filter(o => o.stato === "rifiutata").length;
  const nCorso = offerteTutte.filter(o => o.stato === "offerta").length;
  const totVal = offerteFiltrate.reduce((s, o) => s + (Number(o.importo_offerta_base) || 0), 0);

  const thSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: T.muted, padding: "10px 16px", borderBottom: `1px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap" };
  const tdSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink, padding: "10px 16px", borderBottom: `0.5px solid ${T.border}` };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* KPI cliccabili come filtro */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(120px, 1fr))", gap: isMobile ? 8 : 12 }}>
        <KpiCard label="Tutte"     value={nTot}              T={T} active={ofTab === "tutte"}     onClick={() => setOfTab("tutte")} />
        <KpiCard label="Accettate" value={nAcc}              T={T} active={ofTab === "accettata"} onClick={() => setOfTab("accettata")} />
        <KpiCard label="Rifiutate" value={nRif}              T={T} active={ofTab === "rifiutata"} onClick={() => setOfTab("rifiutata")} />
        <KpiCard label="In corso"  value={nCorso}            T={T} active={ofTab === "offerta"}   onClick={() => setOfTab("offerta")} />
        <KpiCard label="Valore"    value={currency(totVal)}  T={T} />
        <KpiCard label="Conv. %"   value={`${pct(nAcc, nTot)}%`} T={T} />
      </div>

      {/* Voci + torta */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 16, alignItems: "start" }}>
        <Panel title="Voci offerta" T={T}>
          {righeVoci.length === 0
            ? <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, padding: 28, textAlign: "center" }}>Nessuna voce configurata</div>
            : <>
                {righeVoci.map((r, i) => {
                  const idx = pieData.findIndex(p => p.name === r.nome);
                  const colore = idx >= 0 ? PALETTE[idx % PALETTE.length] : T.border;
                  const hasVal = r.totale > 0;
                  const k = r.nome.trim().toLowerCase();
                  return (
                    <div key={r.nome}
                      onMouseEnter={() => setHoveredVoce(r.nome)} onMouseLeave={() => setHoveredVoce(null)}
                      onClick={() => hasVal && setVoceModal({ nome: r.nome, color: colore, offerte: voceOfferteMap[k] || [] })}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < righeVoci.length - 1 ? `0.5px solid ${T.border}` : "none", background: hoveredVoce === r.nome && hasVal ? T.glassSheen : "transparent", transition: "background 150ms", cursor: hasVal ? "pointer" : "default" }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: hasVal ? colore : T.border, flexShrink: 0 }} />
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: hasVal ? T.ink : T.muted, flex: 1 }}>{r.nome}</div>
                      {hasVal && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>{pct(r.totale, totalTemplate)}%</div>}
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: hasVal ? 600 : 400, color: hasVal ? T.ink : T.muted, minWidth: 100, textAlign: "right" }}>{hasVal ? currency(r.totale) : "—"}</div>
                      {hasVal && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, opacity: hoveredVoce === r.nome ? 1 : 0, transition: "opacity 150ms" }}>↗</div>}
                    </div>
                  );
                })}
                {totalTemplate > 0 && (
                  <div style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderTop: `1px solid ${T.border}`, background: T.surface2 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.15em", flex: 1 }}>Totale</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, color: T.ink }}>{currency(totalTemplate)}</div>
                  </div>
                )}
              </>
          }
        </Panel>

        {/* Torta */}
        <div onClick={() => pieData.length > 0 && setPieModal(true)}
          style={{ background: T.surface, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: "hidden", cursor: pieData.length > 0 ? "pointer" : "default", transition: "box-shadow 200ms, transform 200ms" }}
          onMouseEnter={e => { if (pieData.length > 0) { e.currentTarget.style.boxShadow = T.shadowMd; e.currentTarget.style.transform = "translateY(-1px)"; }}}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = T.shadow; e.currentTarget.style.transform = "none"; }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600, color: T.ink }}>Distribuzione voci</div>
            {pieData.length > 0 && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>↗ espandi</div>}
          </div>
          <div style={{ padding: "12px 16px" }}>
            {pieData.length === 0
              ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Nessun dato</div>
              : <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={2} dataKey="value"
                        onMouseEnter={(_, i) => setHoveredVoce(pieData[i]?.name ?? null)} onMouseLeave={() => setHoveredVoce(null)}>
                        {pieData.map(e => <Cell key={e.name} fill={e.color} stroke="none" opacity={hoveredVoce === null || hoveredVoce === e.name ? 1 : 0.2} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: T.glassBg, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusSm, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }} formatter={(v, n) => [currency(v), n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {pieData.map(d => (
                      <div key={d.name} onMouseEnter={() => setHoveredVoce(d.name)} onMouseLeave={() => setHoveredVoce(null)}
                        style={{ display: "flex", alignItems: "center", gap: 8, opacity: hoveredVoce === null || hoveredVoce === d.name ? 1 : 0.3, transition: "opacity 150ms" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: T.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>{pct(d.value, totalTemplate)}%</div>
                      </div>
                    ))}
                  </div>
                </>
            }
          </div>
        </div>
      </div>

      {/* Tabella offerte */}
      <Panel title={`Offerte${ofTab !== "tutte" ? ` — ${OFFERTA_TABS.find(t => t.key === ofTab)?.label}` : ""}`} T={T}>
        {offerteFiltrate.length === 0
          ? <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, textAlign: "center", padding: "40px 0" }}>Nessuna offerta</div>
          : <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thSt, cursor: "pointer" }}><SortBtn col="numero" label="N°" /></th>
                    <th style={{ ...thSt, cursor: "pointer" }}><SortBtn col="nome" label="Nome offerta" /></th>
                    <th style={{ ...thSt, cursor: "pointer" }}><SortBtn col="cliente" label="Cliente" /></th>
                    <th style={{ ...thSt, cursor: "pointer" }}><SortBtn col="data" label="Data" /></th>
                    <th style={{ ...thSt, cursor: "pointer", textAlign: "right" }}><SortBtn col="importo" label="Importo" align="right" /></th>
                    <th style={{ ...thSt, cursor: "pointer" }}><SortBtn col="stato" label="Stato" /></th>
                    <th style={{ ...thSt, cursor: "pointer", textAlign: "right" }}><SortBtn col="commessa" label="Commessa" align="right" /></th>
                  </tr>
                </thead>
                <tbody>
                  {[...offerteFiltrate].sort((a, b) => {
                    const m = sortDir === "asc" ? 1 : -1;
                    if (sortBy === "numero")   return (parseOffertaSortValue(a.numero_offerta) - parseOffertaSortValue(b.numero_offerta)) * m;
                    if (sortBy === "nome")     return (a.nome_offerta || "").localeCompare(b.nome_offerta || "", "it") * m;
                    if (sortBy === "cliente")  return (a.cliente || "").localeCompare(b.cliente || "", "it") * m;
                    if (sortBy === "data")     return (new Date(a.data_offerta || a.created_at) - new Date(b.data_offerta || b.created_at)) * m;
                    if (sortBy === "importo")  return ((Number(a.importo_offerta_base) || 0) - (Number(b.importo_offerta_base) || 0)) * m;
                    if (sortBy === "stato")    return (a.stato || "").localeCompare(b.stato || "", "it") * m;
                    if (sortBy === "commessa") return ((commessaByNumero[a.numero_offerta] || 0) - (commessaByNumero[b.numero_offerta] || 0)) * m;
                    return 0;
                  }).map(o => {
                    const stato = STATI[o.stato] ?? { label: o.stato, color: T.muted, bg: "transparent" };
                    const valComm = commessaByNumero[o.numero_offerta];
                    return (
                      <tr key={o.id} onClick={() => navigate(`/offerte/${o.id}`)} style={{ cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = T.glassSheen}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ ...tdSt, color: T.muted }}>{o.numero_offerta || "—"}</td>
                        <td style={{ ...tdSt, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>{o.nome_offerta || "—"}</td>
                        <td style={{ ...tdSt, color: T.muted }}>{o.cliente || "—"}</td>
                        <td style={{ ...tdSt, color: T.muted }}>{o.data_offerta ? new Date(o.data_offerta).toLocaleDateString("it-IT") : "—"}</td>
                        <td style={{ ...tdSt, textAlign: "right", fontWeight: 600 }}>{currency(o.importo_offerta_base)}</td>
                        <td style={tdSt}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: stato.color, background: stato.bg, padding: "3px 9px", borderRadius: 99, display: "inline-block" }}>{stato.label}</span>
                        </td>
                        <td style={{ ...tdSt, textAlign: "right", fontWeight: valComm ? 600 : 400, color: valComm ? T.ink : T.muted }}>{valComm ? currency(valComm) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </Panel>

      {/* Modal offerte per voce */}
      {voceModal && (
        <div onClick={() => setVoceModal(null)}
          style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusLg, boxShadow: T.shadowLg, width: "100%", maxWidth: 680, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 24px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ width: 11, height: 11, borderRadius: "50%", background: voceModal.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: T.ink }}>{voceModal.nome}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 2 }}>{voceModal.offerte.length} offert{voceModal.offerte.length === 1 ? "a" : "e"}</div>
              </div>
              <button onClick={() => setVoceModal(null)} style={{ background: "rgba(128,128,128,0.12)", border: "none", cursor: "pointer", color: T.muted, width: 28, height: 28, borderRadius: "50%", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            {/* lista offerte */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {voceModal.offerte.length === 0
                ? <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Nessuna offerta trovata</div>
                : voceModal.offerte.map(({ offerta: o, prezzoVoce }, i) => {
                    const stato = STATI[o.stato] ?? { label: o.stato, color: T.muted, bg: "transparent" };
                    return (
                      <div key={o.id} onClick={() => { setVoceModal(null); navigate(`/offerte/${o.id}`); }}
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 24px", borderBottom: i < voceModal.offerte.length - 1 ? `0.5px solid ${T.border}` : "none", cursor: "pointer", transition: "background 120ms" }}
                        onMouseEnter={e => e.currentTarget.style.background = T.glassSheen}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        {/* numero */}
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, minWidth: 60 }}>{o.numero_offerta || "—"}</div>
                        {/* nome + cliente */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.nome_offerta || "—"}</div>
                          {o.cliente && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 2 }}>{o.cliente}</div>}
                        </div>
                        {/* stato */}
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: stato.color, background: stato.bg, padding: "3px 9px", borderRadius: 99, flexShrink: 0 }}>{stato.label}</span>
                        {/* importo voce */}
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: T.ink, minWidth: 90, textAlign: "right" }}>{currency(prezzoVoce)}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>→</div>
                      </div>
                    );
                  })
              }
            </div>
            {/* footer totale */}
            {voceModal.offerte.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderTop: `1px solid ${T.border}`, background: T.surface2 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.15em" }}>Totale voce</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: T.ink }}>{currency(voceModal.offerte.reduce((s, x) => s + x.prezzoVoce, 0))}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal torta */}
      {pieModal && (
        <div onClick={() => setPieModal(false)}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusLg, boxShadow: T.shadowLg, width: "100%", maxWidth: 800, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 26px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: T.ink }}>Distribuzione voci offerta</div>
              <button onClick={() => setPieModal(false)} style={{ background: "rgba(128,128,128,0.12)", border: "none", cursor: "pointer", color: T.muted, width: 28, height: 28, borderRadius: "50%", fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: "flex", overflow: "hidden", flex: 1 }}>
              <div style={{ flex: "0 0 400px", padding: "28px 12px", borderRight: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ResponsiveContainer width="100%" height={340}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={148} paddingAngle={2} dataKey="value"
                      onMouseEnter={(_, i) => setHoveredVoce(pieData[i]?.name ?? null)} onMouseLeave={() => setHoveredVoce(null)}>
                      {pieData.map(e => <Cell key={e.name} fill={e.color} stroke="none" opacity={hoveredVoce === null || hoveredVoce === e.name ? 1 : 0.2} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: T.glassBg, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusSm, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }} formatter={(v, n) => [currency(v), n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                {pieData.map((d, i) => (
                  <div key={d.name} onMouseEnter={() => setHoveredVoce(d.name)} onMouseLeave={() => setHoveredVoce(null)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 26px", borderBottom: i < pieData.length - 1 ? `0.5px solid ${T.border}` : "none", background: hoveredVoce === d.name ? T.glassSheen : "transparent", opacity: hoveredVoce === null || hoveredVoce === d.name ? 1 : 0.35, transition: "all 120ms" }}>
                    <div style={{ width: 11, height: 11, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: T.ink, flex: 1 }}>{d.name}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>{pct(d.value, totalTemplate)}%</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: T.ink, minWidth: 110, textAlign: "right" }}>{currency(d.value)}</div>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 26px", borderTop: `1px solid ${T.border}`, background: T.surface2, position: "sticky", bottom: 0 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.15em", flex: 1 }}>Totale</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: T.ink }}>{currency(totalTemplate)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TAB 2: Monitoraggio Commesse ──────────────────────────────────
function TabCommesse({ commesse, incassatoPerCommessa, permissions, T, navigate, isMobile }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy]             = useState("offerta");
  const [sortDir, setSortDir]           = useState("desc");

  const rows = useMemo(() => commesse.map(c => ({
    ...c,
    valoreContratto: Number(c.importo_offerta_base) || 0,
    incassato: incassatoPerCommessa[c.id] || 0,
    giorniApertura: getDaysOpen(getReferenceDate(c)),
    offertaSortValue: parseOffertaSortValue(c.numero_offerta),
    nomeOfferta: `${c.numero_offerta || "—"} — ${c.nome_commessa || ""}`.trim(),
  })), [commesse, incassatoPerCommessa]);

  const availableYears = useMemo(() => {
    const ys = [...new Set(rows.map(r => { const d = getReferenceDate(r); return d ? new Date(d).getFullYear() : null; }).filter(Boolean))];
    return ys.sort((a, b) => b - a);
  }, [rows]);

  const filtered = useMemo(() => {
    if (!selectedYear) return rows;
    return rows.filter(r => { const d = getReferenceDate(r); return d && new Date(d).getFullYear() === selectedYear; });
  }, [rows, selectedYear]);

  const totals = useMemo(() => filtered.reduce((a, r) => ({ val: a.val + r.valoreContratto, inc: a.inc + r.incassato }), { val: 0, inc: 0 }), [filtered]);

  const chartData = useMemo(() => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: MONTHS[i], valore: 0 }));
    rows.forEach(r => {
      const d = getReferenceDate(r); if (!d) return;
      const dt = new Date(d); if (dt.getFullYear() !== selectedYear) return;
      monthly[dt.getMonth()].valore += r.valoreContratto;
    });
    return monthly;
  }, [rows, selectedYear]);

  const sorted = useMemo(() => {
    const m = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortBy === "offerta") return (a.offertaSortValue - b.offertaSortValue) * m;
      if (sortBy === "cliente") return (a.cliente || "").localeCompare(b.cliente || "", "it") * m;
      if (sortBy === "valore")    return (a.valoreContratto - b.valoreContratto) * m;
      if (sortBy === "incassato") return (a.incassato - b.incassato) * m;
      if (sortBy === "residuo")   return ((a.valoreContratto - a.incassato) - (b.valoreContratto - b.incassato)) * m;
      if (sortBy === "giorni")    return (a.giorniApertura - b.giorniApertura) * m;
      return 0;
    });
  }, [filtered, sortBy, sortDir]);

  const handleSort = col => { if (sortBy === col) setSortDir(p => p === "asc" ? "desc" : "asc"); else { setSortBy(col); setSortDir("asc"); } };
  const SortBtn = ({ col, label }) => (
    <button onClick={() => handleSort(col)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: sortBy === col ? T.navy : T.muted, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {label} <span style={{ fontSize: 9 }}>{sortBy === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
    </button>
  );

  const thSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, padding: "8px 14px", borderBottom: `0.5px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap" };
  const tdSt = { padding: "10px 14px", borderBottom: `0.5px solid ${T.border}`, fontSize: 12, color: T.ink, fontFamily: "'Space Grotesk', sans-serif", verticalAlign: "middle" };
  const monoSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 };
  const daIncassare = totals.val - totals.inc;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : (permissions.canViewFinancials ? "repeat(3,1fr)" : "1fr"), gap: isMobile ? 8 : 12 }}>
        <KpiCard label={`Valore contratti ${selectedYear || ""}`} value={currency(totals.val, 2)} color={T.navy} T={T} />
        {permissions.canViewFinancials && <>
          <KpiCard label="Incassato"   value={currency(totals.inc, 2)} color={T.green} T={T} />
          <KpiCard label="Da incassare" value={currency(daIncassare, 2)} color={T.red}  T={T} />
        </>}
      </div>

      {/* Grafico */}
      <Panel T={T}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted }}>Andamento valore commesse — {selectedYear}</div>
            <select value={selectedYear ?? "all"} onChange={e => setSelectedYear(e.target.value === "all" ? null : Number(e.target.value))}
              style={{ padding: "5px 10px", border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.bg, color: T.ink, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", outline: "none", cursor: "pointer" }}>
              <option value="all">Tutti gli anni</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fill: T.muted, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }} axisLine={{ stroke: T.border }} tickLine={false} />
                <YAxis tick={{ fill: T.muted, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.borderMd}`, borderRadius: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }} formatter={v => currency(v, 2)} />
                <Line type="monotone" dataKey="valore" stroke={T.navy} strokeWidth={2} dot={{ r: 3, fill: T.navy, strokeWidth: 0 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Panel>

      {/* Tabella */}
      <Panel T={T} style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr>
              <th style={thSt}><SortBtn col="offerta"   label="Offerta" /></th>
              <th style={thSt}><SortBtn col="cliente"   label="Cliente" /></th>
              <th style={thSt}><SortBtn col="valore"    label="Valore" /></th>
              {permissions.canViewFinancials && <>
                <th style={thSt}><SortBtn col="incassato" label="Incassato" /></th>
                <th style={thSt}><SortBtn col="residuo"   label="Residuo" /></th>
              </>}
              <th style={thSt}><SortBtn col="giorni" label="Giorni" /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => {
              const residuo = r.valoreContratto - r.incassato;
              const delayed = residuo > 0 && r.giorniApertura > 60;
              return (
                <tr key={r.id} onClick={() => navigate(`/commesse/${r.id}`)}
                  style={{ cursor: "pointer", background: delayed ? T.redLight : "transparent", transition: "background 120ms" }}
                  onMouseEnter={e => e.currentTarget.style.background = delayed ? T.redLight : T.glassSheen}
                  onMouseLeave={e => e.currentTarget.style.background = delayed ? T.redLight : "transparent"}>
                  <td style={{ ...tdSt, fontWeight: 600 }}>{r.nomeOfferta}</td>
                  <td style={{ ...tdSt, color: T.muted }}>{r.cliente || "—"}</td>
                  <td style={{ ...tdSt, ...monoSt }}>{currency(r.valoreContratto, 2)}</td>
                  {permissions.canViewFinancials && <>
                    <td style={{ ...tdSt, ...monoSt, color: T.green }}>{currency(r.incassato, 2)}</td>
                    <td style={{ ...tdSt, ...monoSt, color: residuo > 0 ? T.red : T.green }}>{currency(residuo, 2)}</td>
                  </>}
                  <td style={{ ...tdSt, ...monoSt, color: r.giorniApertura > 60 ? T.red : T.muted }}>{r.giorniApertura}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

// ── TAB 3: Analisi Economica (identica ad AnalisiPage) ───────────
function TabEconomica({ T, studioId, navigate, anno: annoFiltro, setAnno: setAnnoFiltro, search, setSearch, onAnniReady, costiPanel, setCostiPanel, isMobile }) {
  const mono  = { fontFamily: "'IBM Plex Mono', monospace" };
  const lbl   = { ...mono, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted };
  const thSt  = { ...mono, fontSize: 8, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, padding: "8px 14px", borderBottom: `0.5px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap" };
  const tdSt  = { padding: "10px 14px", borderBottom: `0.5px solid ${T.border}`, fontSize: 12, color: T.ink };

  const [members, setMembers]           = useState([]);
  const [timesheet, setTimesheet]       = useState([]);
  const [commesse, setCommesse]         = useState([]);
  const [costiExtra, setCostiExtra]     = useState([]);
  const [collab, setCollab]             = useState([]);
  const [ratePagate, setRatePagate]     = useState([]);
  const [costiInterni, setCostiInterni] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedCommessa, setSelectedCommessa] = useState(null);
  const [editCosti, setEditCosti]               = useState({});
  const [savingCosti, setSavingCosti]           = useState(false);
  const [sortCol, setSortCol]                   = useState("margine");
  const [sortAsc, setSortAsc]                   = useState(false);
  const handleSortCol = col => { if (sortCol === col) setSortAsc(p => !p); else { setSortCol(col); setSortAsc(false); } };

  useEffect(() => {
    if (!studioId) return;
    const load = async () => {
      const [{ data: mem }, { data: ts }, { data: comm }, { data: ce }, { data: co }, { data: rp }, { data: ci }] = await Promise.all([
        supabase.from("team_members").select("id,user_name,user_email,color,costo_orario").eq("studio", studioId).eq("active", true),
        supabase.from("timesheet").select("project_id,hours,team_member").eq("studio", studioId).is("deleted_at", null),
        supabase.from("commesse").select("id,project_id,nome_commessa,cliente,numero_offerta,importo_offerta_base,importo_totale,data_commessa,created_at,archived").eq("studio", studioId).is("deleted_at", null),
        supabase.from("costi_extra").select("commessa_id,importo").eq("studio", studioId).is("deleted_at", null),
        supabase.from("collaboratori_esterni").select("commessa_id,importo").eq("studio", studioId),
        supabase.from("suddivisione_pagamenti").select("commessa_id,percentuale,importo_fisso").eq("pagato", true).is("deleted_at", null),
        supabase.from("costi_interni").select("*").eq("studio", studioId).is("deleted_at", null),
      ]);
      setMembers(mem ?? []); setTimesheet(ts ?? []); setCommesse(comm ?? []);
      setCostiExtra(ce ?? []); setCollab(co ?? []); setRatePagate(rp ?? []); setCostiInterni(ci ?? []);
      const map = {};
      (mem ?? []).forEach(m => { map[m.id] = m.costo_orario || 0; });
      setEditCosti(map);
      setLoading(false);
    };
    load();
  }, [studioId]);

  const anniDisponibili = useMemo(() => {
    const s = new Set([new Date().getFullYear()]);
    commesse.forEach(c => { const d = c.data_commessa || c.created_at; if (d) s.add(new Date(d).getFullYear()); });
    return Array.from(s).sort((a, b) => b - a);
  }, [commesse]);

  useEffect(() => { onAnniReady?.([0, ...anniDisponibili]); }, [anniDisponibili]);

  const commesseFiltrate = useMemo(() => {
    if (annoFiltro === 0) return commesse;
    return commesse.filter(c => { const d = c.data_commessa || c.created_at; return d && new Date(d).getFullYear() === annoFiltro; });
  }, [commesse, annoFiltro]);

  const commessaStats = useMemo(() => commesseFiltrate.map(c => {
    const tsProj = c.project_id ? timesheet.filter(t => t.project_id === c.project_id) : [];
    const orePerMembro = {};
    tsProj.forEach(t => { orePerMembro[t.team_member] = (orePerMembro[t.team_member] || 0) + Number(t.hours || 0); });
    const oreTotali = Object.values(orePerMembro).reduce((s, v) => s + v, 0);
    let costoOre = 0;
    const membroBreakdown = members.map(m => {
      const ore   = orePerMembro[m.id] || 0;
      const costo = ore * Number(editCosti[m.id] || m.costo_orario || 0);
      costoOre += costo;
      return { ...m, ore, costo };
    }).filter(m => m.ore > 0);
    const valoreBase   = Number(c.importo_offerta_base) || 0;
    const valoreTotale = Number(c.importo_totale) || valoreBase;
    const costExtra    = costiExtra.filter(x => x.commessa_id === c.id).reduce((s, x) => s + Number(x.importo || 0), 0);
    const costCollab   = collab.filter(x => x.commessa_id === c.id).reduce((s, x) => s + Number(x.importo || 0), 0);
    const costoEsterni = costExtra + costCollab;
    const costoInterno = costiInterni.filter(x => x.commessa_id === c.id).reduce((s, x) => s + Number(x.importo || 0), 0);
    const paid         = ratePagate.filter(r => r.commessa_id === c.id);
    const incassato    = paid.reduce((rs, r) => rs + (Number(r.importo_fisso) || (valoreBase * (Number(r.percentuale) || 0) / 100)), 0);
    const costoTotale  = costoOre + costoEsterni + costoInterno;
    const margine      = valoreBase - costoTotale;
    const marginePerc  = valoreBase > 0 ? (margine / valoreBase) * 100 : null;
    return { commessa: c, oreTotali, costoOre, costoEsterni, costoInterno, costoTotale, valoreBase, valoreTotale, incassato, margine, marginePerc, membroBreakdown };
  }), [commesseFiltrate, timesheet, members, costiExtra, collab, ratePagate, costiInterni, editCosti]);

  const handleSaveCosti = async () => {
    setSavingCosti(true);
    await Promise.all(members.map(m => supabase.from("team_members").update({ costo_orario: Number(editCosti[m.id]) || 0 }).eq("id", m.id)));
    setSavingCosti(false);
    setCostiPanel(false);
  };

  if (loading) return <div style={{ ...mono, fontSize: 11, color: T.muted, textAlign: "center", padding: 40 }}>Caricamento...</div>;

  // ── DETTAGLIO COMMESSA ────────────────────────────────────────────
  if (selectedCommessa) {
    const stat = commessaStats.find(s => s.commessa.id === selectedCommessa.id);
    if (!stat) return null;
    const c = stat.commessa;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSelectedCommessa(null)} style={{ background: "none", border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor: "pointer", color: T.muted, padding: "5px 12px", ...mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>← Analisi</button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: "-0.02em" }}>{c.nome_commessa}</div>
              {c.numero_offerta && <span style={{ ...mono, fontSize: 9, color: T.muted, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "2px 6px" }}>{c.numero_offerta}</span>}
              {c.archived && <span style={{ ...mono, fontSize: 9, color: "#854d0e", background: "#fefce8", padding: "2px 8px", borderRadius: 2 }}>ARCHIVIATA</span>}
            </div>
            <div style={{ ...mono, fontSize: 10, color: T.muted, marginTop: 2 }}>{c.cliente || "—"}</div>
          </div>
        </div>

        {/* KPI riga 1 */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 10 }}>
          {[
            { l: "Valore base offerta",    v: stat.valoreBase,   color: T.ink,   sub: "senza IVA / contributi" },
            ...(stat.valoreTotale !== stat.valoreBase ? [{ l: "Valore con IVA/contributi", v: stat.valoreTotale, color: T.ink }] : []),
            { l: "Incassato", v: stat.incassato, color: T.green, sub: stat.valoreBase > 0 ? `${((stat.incassato / stat.valoreBase) * 100).toFixed(0)}% del valore base` : undefined },
          ].map(k => (
            <div key={k.l} style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "16px 20px", borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow }}>
              <div style={{ ...lbl, marginBottom: 8 }}>{k.l}</div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.03em", color: k.color }}>{currency(k.v, 2)}</div>
              {k.sub && <div style={{ ...mono, fontSize: 9, color: T.muted, marginTop: 4 }}>{k.sub}</div>}
            </div>
          ))}
        </div>
        {/* KPI riga 2 */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 10 }}>
          {[
            { l: "Costo ore interne", v: stat.costoOre,     color: T.navy },
            { l: "Costi esterni",     v: stat.costoEsterni, color: T.muted },
            { l: "Margine stimato",   v: stat.margine,      color: stat.margine >= 0 ? T.green : T.red, sub: stat.marginePerc != null ? `${stat.marginePerc.toFixed(1)}%` : undefined },
          ].map(k => (
            <div key={k.l} style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "16px 20px", borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow }}>
              <div style={{ ...lbl, marginBottom: 8 }}>{k.l}</div>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em", color: k.color }}>{currency(k.v, 2)}</div>
              {k.sub && <div style={{ ...mono, fontSize: 9, color: T.muted, marginTop: 4 }}>{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* Costo ore interne */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow }}>
          <div style={{ padding: "14px 20px", borderBottom: `0.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Costo ore interne</div>
            <div style={{ ...mono, fontSize: 10, color: T.muted }}>{fmtOre(stat.oreTotali)} ore totali{!c.project_id && <span style={{ marginLeft: 8 }}>(nessun progetto collegato)</span>}</div>
          </div>
          {stat.membroBreakdown.length === 0
            ? <div style={{ padding: "32px 0", textAlign: "center", ...mono, fontSize: 11, color: T.muted }}>Nessuna ora registrata</div>
            : <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  {["Membro","Ore","Costo/ora","Costo totale","% del costo"].map(h => <th key={h} style={thSt}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {stat.membroBreakdown.map(m => (
                    <tr key={m.id}>
                      <td style={tdSt}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: m.color || T.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600, color: "#fff", flexShrink: 0 }}>{(m.user_name || "?").slice(0, 2).toUpperCase()}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{m.user_name || m.user_email}</div>
                        </div>
                      </td>
                      <td style={{ ...tdSt, ...mono, fontSize: 12 }}>{fmtOre(m.ore)}</td>
                      <td style={{ ...tdSt, ...mono, fontSize: 12, color: T.muted }}>{Number(editCosti[m.id] || m.costo_orario || 0) > 0 ? currency(Number(editCosti[m.id] || m.costo_orario), 2) + "/h" : <span style={{ color: T.muted, fontSize: 10 }}>non impostato</span>}</td>
                      <td style={{ ...tdSt, ...mono, fontSize: 13, fontWeight: 600, color: T.navy }}>{currency(m.costo, 2)}</td>
                      <td style={tdSt}>
                        {stat.costoOre > 0
                          ? <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 4, background: T.border, maxWidth: 80 }}><div style={{ height: 4, background: T.navy, width: `${(m.costo / stat.costoOre) * 100}%` }} /></div>
                              <span style={{ ...mono, fontSize: 10, color: T.muted }}>{((m.costo / stat.costoOre) * 100).toFixed(0)}%</span>
                            </div>
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} style={{ ...tdSt, fontWeight: 600, color: T.ink }}>Totale ore interne</td>
                    <td style={{ ...tdSt, ...mono, fontSize: 14, fontWeight: 600, color: T.navy }}>{currency(stat.costoOre, 2)}</td>
                    <td style={tdSt} />
                  </tr>
                </tbody>
              </table>
          }
        </div>

        {/* Costi esterni */}
        {stat.costoEsterni > 0 && (() => {
          const ceRows = costiExtra.filter(x => x.commessa_id === c.id);
          const coRows = collab.filter(x => x.commessa_id === c.id);
          return (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow }}>
              <div style={{ padding: "14px 20px", borderBottom: `0.5px solid ${T.border}` }}><div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Costi esterni</div></div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Tipo","Importo"].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                <tbody>
                  {ceRows.map((x, i) => <tr key={`ce-${i}`}><td style={tdSt}>Costo extra</td><td style={{ ...tdSt, ...mono, fontSize: 12, color: T.red }}>{currency(x.importo, 2)}</td></tr>)}
                  {coRows.map((x, i) => <tr key={`co-${i}`}><td style={tdSt}>Collaboratore esterno</td><td style={{ ...tdSt, ...mono, fontSize: 12, color: T.red }}>{currency(x.importo, 2)}</td></tr>)}
                  <tr><td style={{ ...tdSt, fontWeight: 600 }}>Totale esterni</td><td style={{ ...tdSt, ...mono, fontSize: 14, fontWeight: 600, color: T.red }}>{currency(stat.costoEsterni, 2)}</td></tr>
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* Costi interni */}
        {costiInterni.filter(x => x.commessa_id === c.id).length > 0 && (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow }}>
            <div style={{ padding: "14px 20px", borderBottom: `0.5px solid ${T.border}` }}><div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Costi interni</div></div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Membro","Descrizione","Data","Importo"].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
              <tbody>
                {costiInterni.filter(x => x.commessa_id === c.id).map(x => (
                  <tr key={x.id}>
                    <td style={tdSt}>{x.nome_membro || "—"}</td>
                    <td style={tdSt}>{x.descrizione}</td>
                    <td style={{ ...tdSt, ...mono, fontSize: 11, color: T.muted }}>{x.data ? new Date(x.data).toLocaleDateString("it-IT") : "—"}</td>
                    <td style={{ ...tdSt, ...mono, fontSize: 12, fontWeight: 600, color: T.red }}>{currency(x.importo, 2)}</td>
                  </tr>
                ))}
                <tr><td colSpan={3} style={{ ...tdSt, fontWeight: 600 }}>Totale costi interni</td><td style={{ ...tdSt, ...mono, fontSize: 14, fontWeight: 600, color: T.red }}>{currency(stat.costoInterno, 2)}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Riepilogo */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 16 }}>Riepilogo economico</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400 }}>
            {[
              ["Valore base offerta", currency(stat.valoreBase, 2), T.ink],
              ...(stat.valoreTotale !== stat.valoreBase ? [["  + IVA / contributi", currency(stat.valoreTotale, 2), T.muted]] : []),
              ["Incassato",           currency(stat.incassato, 2),    T.green],
              ["− Costo ore interne", currency(stat.costoOre, 2),     T.navy],
              ["− Costi esterni",     currency(stat.costoEsterni, 2), T.muted],
              ["− Costi interni",     currency(stat.costoInterno, 2), T.muted],
            ].map(([l, v, col]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `0.5px solid ${T.border}` }}>
                <span style={{ ...mono, fontSize: 11, color: T.muted }}>{l}</span>
                <span style={{ ...mono, fontSize: 12, fontWeight: 600, color: col }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", marginTop: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Margine stimato</span>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: stat.margine >= 0 ? T.green : T.red }}>{currency(stat.margine, 2)}</span>
                {stat.marginePerc != null && <div style={{ ...mono, fontSize: 10, color: T.muted }}>{stat.marginePerc.toFixed(1)}%</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LISTA COMMESSE ────────────────────────────────────────────────
  const q        = search.trim().toLowerCase();
  const filtered = commessaStats.filter(({ commessa: c }) => !q || (c.nome_commessa || "").toLowerCase().includes(q) || (c.cliente || "").toLowerCase().includes(q) || (c.numero_offerta || "").toLowerCase().includes(q));
  const sorted   = [...filtered].sort((a, b) => {
    const getVal = row => sortCol === "nome" ? (row.commessa.nome_commessa || "").toLowerCase() : Number(row[sortCol]) || 0;
    const vA = getVal(a), vB = getVal(b);
    return vA < vB ? (sortAsc ? -1 : 1) : vA > vB ? (sortAsc ? 1 : -1) : 0;
  });

  const totOre       = commessaStats.reduce((s, p) => s + p.oreTotali, 0);
  const totCosto     = commessaStats.reduce((s, p) => s + p.costoTotale, 0);
  const totValore    = commessaStats.reduce((s, p) => s + p.valoreBase, 0);
  const totIncassato = commessaStats.reduce((s, p) => s + p.incassato, 0);
  const totMargine   = totValore - totCosto;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Search su mobile */}
      {isMobile && (
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca commessa…"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "8px 12px", border: `1px solid ${T.border}`, background: T.surface, color: T.ink, outline: "none", borderRadius: T.radiusSm, width: "100%" }} />
      )}

      {/* KPI totali */}
      {commessaStats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,1fr)", gap: isMobile ? 8 : 10 }}>
          {[
            { label: "Ore totali studio",   value: fmtOre(totOre),         color: T.ink   },
            { label: "Costo totale",        value: currency(totCosto, 2),  color: T.navy  },
            { label: "Valore commesse",     value: currency(totValore, 2), color: T.green },
            { label: "Incassato totale",    value: currency(totIncassato, 2), color: T.green },
            { label: "Margine complessivo", value: currency(totMargine, 2), color: totMargine >= 0 ? T.green : T.red },
          ].map((k, i) => (
            <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "16px 20px", borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow }}>
              <div style={{ ...lbl, marginBottom: 8 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.03em", color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabella commesse */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[["nome","Commessa"],["oreTotali","Ore totali"],["costoOre","Costo ore"],["costoEsterni","Costi esterni"],["costoInterno","Costi interni"],["costoTotale","Costo totale"],["valoreBase","Valore offerta"],["incassato","Incassato"],["margine","Margine"]].map(([col, label]) => (
                <th key={col} style={{ ...thSt, cursor: "pointer", userSelect: "none" }} onClick={() => handleSortCol(col)}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: sortCol === col ? T.navy : T.muted }}>
                    {label} <span style={{ fontSize: 9, opacity: sortCol === col ? 1 : 0.3 }}>{sortCol === col ? (sortAsc ? "↑" : "↓") : "↕"}</span>
                  </span>
                </th>
              ))}
              <th style={thSt} />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0
              ? <tr><td colSpan={10} style={{ ...tdSt, textAlign: "center", color: T.muted, padding: "32px 0" }}>{q ? `Nessun risultato per "${search}"` : "Nessuna commessa"}</td></tr>
              : sorted.map(({ commessa: c, oreTotali, costoOre, costoEsterni, costoInterno, costoTotale, valoreBase, incassato, margine, marginePerc }) => (
                  <tr key={c.id} onClick={() => setSelectedCommessa(c)} style={{ cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={tdSt}>
                      <div style={{ fontWeight: 600, color: T.ink }}>{c.nome_commessa || "—"}</div>
                      <div style={{ ...mono, fontSize: 9, color: T.muted, marginTop: 2 }}>
                        {c.cliente || "—"}
                        {c.numero_offerta && <span style={{ marginLeft: 6 }}>{c.numero_offerta}</span>}
                        {c.archived && <span style={{ marginLeft: 6, color: "#854d0e" }}>archiviata</span>}
                      </div>
                    </td>
                    <td style={{ ...tdSt, ...mono, fontSize: 12 }}>{fmtOre(oreTotali)}</td>
                    <td style={{ ...tdSt, ...mono, fontSize: 12, color: T.navy }}>{currency(costoOre, 2)}</td>
                    <td style={{ ...tdSt, ...mono, fontSize: 12, color: T.muted }}>{currency(costoEsterni, 2)}</td>
                    <td style={{ ...tdSt, ...mono, fontSize: 12, color: T.muted }}>{currency(costoInterno, 2)}</td>
                    <td style={{ ...tdSt, ...mono, fontSize: 12, fontWeight: 600, color: T.ink }}>{currency(costoTotale, 2)}</td>
                    <td style={{ ...tdSt, ...mono, fontSize: 12, color: T.green }}>{currency(valoreBase, 2)}</td>
                    <td style={{ ...tdSt, ...mono, fontSize: 12, color: T.green }}>{currency(incassato, 2)}</td>
                    <td style={tdSt}>
                      <div style={{ ...mono, fontSize: 13, fontWeight: 600, color: margine >= 0 ? T.green : T.red }}>{currency(margine, 2)}</div>
                      {marginePerc != null && <div style={{ ...mono, fontSize: 9, color: T.muted }}>{marginePerc.toFixed(1)}%</div>}
                    </td>
                    <td style={{ ...tdSt, ...mono, fontSize: 10, color: T.navy }}>→</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Panel costi orari */}
      {costiPanel && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(14,14,13,0.5)" }}>
          <div style={{ width: "100%", maxWidth: 480, background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, boxShadow: T.shadowLg, borderRadius: T.radiusLg, padding: 28, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>Costi orari del team</div>
                <div style={{ ...mono, fontSize: 10, color: T.muted, marginTop: 2 }}>Imposta il costo orario per ogni membro</div>
              </div>
              <button onClick={() => setCostiPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 20 }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {members.map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: T.surface2, border: `1px solid ${T.border}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: m.color || T.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", flexShrink: 0 }}>{(m.user_name || "?").slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{m.user_name || m.user_email}</div>
                    <div style={{ ...mono, fontSize: 9, color: T.muted }}>{m.user_email}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ ...mono, fontSize: 11, color: T.muted }}>€</span>
                    <input type="number" min={0} step={0.5} value={editCosti[m.id] ?? 0} onChange={e => setEditCosti(p => ({ ...p, [m.id]: e.target.value }))}
                      style={{ width: 70, padding: "6px 8px", border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.inputBg, color: T.inputText, fontSize: 13, ...mono, outline: "none", textAlign: "right" }} />
                    <span style={{ ...mono, fontSize: 11, color: T.muted }}>/h</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 14, borderTop: `0.5px solid ${T.border}` }}>
              <button onClick={() => setCostiPanel(false)} style={{ border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: "transparent", color: T.ink, ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 18px", cursor: "pointer" }}>Annulla</button>
              <button onClick={handleSaveCosti} disabled={savingCosti} style={{ background: T.navy, border: "none", color: T.bg, ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 20px", cursor: savingCosti ? "not-allowed" : "pointer", opacity: savingCosti ? 0.6 : 1, borderRadius: T.radiusSm }}>
                {savingCosti ? "Salvataggio..." : "Salva costi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────
const HUB_TABS = [
  { key: "offerte",   label: "Offerte"    },
  { key: "commesse",  label: "Commesse"   },
  { key: "economica", label: "Economica"  },
];

export default function AnalisiHubPage() {
  usePageTitleOnMount("Analisi");
  const navigate = useNavigate();
  const { T } = useTheme();
  const { studioId, loading: studioLoading } = useStudio();
  const permissions = usePermissions();
  const { plan } = usePlan();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState("offerte");
  const [offerte, setOfferte]           = useState([]);
  const [commesse, setCommesse]         = useState([]);
  const [vociTemplate, setVociTemplate] = useState([]);
  const [incassatoPerCommessa, setIncassatoPerCommessa] = useState({});
  const [loading, setLoading]           = useState(true);
  const [annoOfferte, setAnnoOfferte]   = useState(new Date().getFullYear());
  const [annoEco, setAnnoEco]           = useState(0);
  const [searchEco, setSearchEco]       = useState("");
  const [anniEco, setAnniEco]           = useState([0]);
  const [costiEcoPanel, setCostiEcoPanel] = useState(false);

  useEffect(() => {
    if (studioLoading || !studioId) return;
    const load = async () => {
      const [{ data: off }, { data: comm }, { data: tmpl }] = await Promise.all([
        supabase.from("offerte").select("*").eq("studio", studioId).eq("archived", false).is("deleted_at", null),
        supabase.from("commesse").select("*").eq("studio", studioId).is("deleted_at", null),
        supabase.from("voci_offerta_template").select("*").eq("studio", studioId).order("order", { ascending: true }),
      ]);
      setOfferte(off ?? []);
      setCommesse(comm ?? []);
      setVociTemplate(tmpl ?? []);
      const loaded = comm ?? [];
      if (loaded.length > 0) {
        const map = await calcolaIncassato(loaded.map(c => c.id), studioId, supabase);
        setIncassatoPerCommessa(map);
      }
      setLoading(false);
    };
    load();
  }, [studioId, studioLoading]);

  const commessaByNumero = useMemo(() => {
    const m = {};
    for (const c of commesse) {
      if (c.numero_offerta) m[c.numero_offerta] = (m[c.numero_offerta] || 0) + (Number(c.importo_totale) || 0);
    }
    return m;
  }, [commesse]);

  const anniOfferte = useMemo(() => {
    const s = new Set(offerte.map(o => new Date(o.data_offerta || o.created_at).getFullYear()).filter(Boolean));
    return [...s].sort((a, b) => b - a);
  }, [offerte]);

  // ── guards ───────────────────────────────────────────────────────
  if (!permissions.isProjectManager) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
      Sezione riservata al project manager.
    </div>
  );
  if (plan.id !== "pro") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 16 }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, color: T.ink }}>Funzionalità Pro</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, textAlign: "center", maxWidth: 360 }}>Disponibile solo per il piano Pro.</div>
      <button onClick={() => navigate("/impostazioni/piano")} style={{ background: T.navy, color: T.bg, border: "none", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 24px", cursor: "pointer", borderRadius: T.radiusSm }}>Vedi piani →</button>
    </div>
  );
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 56 }}>

      {/* Tabs + filtri */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <SlidingTabs tabs={permissions.isOwner ? HUB_TABS : HUB_TABS.filter(t => t.key !== "economica")} active={activeTab} onChange={setActiveTab} />
        {activeTab === "offerte" && (
          <select value={annoOfferte} onChange={e => setAnnoOfferte(Number(e.target.value))}
            style={{ marginLeft: isMobile ? 0 : "auto", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 10px", border: `1px solid ${T.border}`, background: T.surface, color: T.ink, cursor: "pointer", outline: "none", borderRadius: T.radiusSm }}>
            <option value={0}>Tutti gli anni</option>
            {anniOfferte.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        {activeTab === "economica" && permissions.isOwner && (
          <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {!isMobile && (
              <input value={searchEco} onChange={e => setSearchEco(e.target.value)} placeholder="Cerca commessa…"
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 12px", border: `1px solid ${T.border}`, background: T.surface, color: T.ink, outline: "none", borderRadius: T.radiusSm, width: 180 }} />
            )}
            <select value={annoEco} onChange={e => setAnnoEco(Number(e.target.value))}
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 10px", border: `1px solid ${T.border}`, background: T.surface, color: T.ink, cursor: "pointer", outline: "none", borderRadius: T.radiusSm }}>
              {anniEco.map(a => <option key={a} value={a}>{a === 0 ? "Tutti gli anni" : a}</option>)}
            </select>
            <button onClick={() => setCostiEcoPanel(true)}
              style={{ background: T.navy, color: T.bg, border: "none", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "7px 14px", cursor: "pointer", borderRadius: T.radiusSm, whiteSpace: "nowrap" }}>
              ⚙ Costi orari
            </button>
          </div>
        )}
      </div>

      {/* Contenuto tab */}
      {activeTab === "offerte" && (
        <TabOfferte offerte={offerte} commessaByNumero={commessaByNumero} vociTemplate={vociTemplate} T={T} navigate={navigate} anno={annoOfferte} isMobile={isMobile} />
      )}
      {activeTab === "commesse" && (
        <TabCommesse commesse={commesse} incassatoPerCommessa={incassatoPerCommessa} permissions={permissions} T={T} navigate={navigate} isMobile={isMobile} />
      )}
      {activeTab === "economica" && permissions.isOwner && (
        <TabEconomica T={T} studioId={studioId} navigate={navigate} anno={annoEco} setAnno={setAnnoEco} search={searchEco} setSearch={setSearchEco} onAnniReady={setAnniEco} costiPanel={costiEcoPanel} setCostiPanel={setCostiEcoPanel} isMobile={isMobile} />
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
