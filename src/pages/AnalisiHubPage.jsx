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
function TabOfferte({ offerte, commessaByNumero, vociTemplate, T, navigate }) {
  const [ofTab, setOfTab]           = useState("tutte");
  const [anno, setAnno]             = useState(new Date().getFullYear());
  const [hoveredVoce, setHoveredVoce] = useState(null);
  const [pieModal, setPieModal]     = useState(false);

  const anni = useMemo(() => {
    const s = new Set(offerte.map(o => new Date(o.data_offerta || o.created_at).getFullYear()).filter(Boolean));
    return [...s].sort((a, b) => b - a);
  }, [offerte]);

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

      {/* Anno selector */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <select value={anno} onChange={e => setAnno(Number(e.target.value))}
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 12px", border: `1px solid ${T.border}`, background: T.surface, color: T.ink, cursor: "pointer", outline: "none", borderRadius: T.radiusSm }}>
          <option value={0}>Tutti gli anni</option>
          {anni.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* KPI cliccabili come filtro */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
        <KpiCard label="Tutte"     value={nTot}              T={T} active={ofTab === "tutte"}     onClick={() => setOfTab("tutte")} />
        <KpiCard label="Accettate" value={nAcc}              T={T} active={ofTab === "accettata"} onClick={() => setOfTab("accettata")} />
        <KpiCard label="Rifiutate" value={nRif}              T={T} active={ofTab === "rifiutata"} onClick={() => setOfTab("rifiutata")} />
        <KpiCard label="In corso"  value={nCorso}            T={T} active={ofTab === "offerta"}   onClick={() => setOfTab("offerta")} />
        <KpiCard label="Valore"    value={currency(totVal)}  T={T} />
        <KpiCard label="Conv. %"   value={`${pct(nAcc, nTot)}%`} T={T} />
      </div>

      {/* Voci + torta */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
        <Panel title="Voci offerta" T={T}>
          {righeVoci.length === 0
            ? <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, padding: 28, textAlign: "center" }}>Nessuna voce configurata</div>
            : <>
                {righeVoci.map((r, i) => {
                  const idx = pieData.findIndex(p => p.name === r.nome);
                  const colore = idx >= 0 ? PALETTE[idx % PALETTE.length] : T.border;
                  const hasVal = r.totale > 0;
                  return (
                    <div key={r.nome} onMouseEnter={() => setHoveredVoce(r.nome)} onMouseLeave={() => setHoveredVoce(null)}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < righeVoci.length - 1 ? `0.5px solid ${T.border}` : "none", background: hoveredVoce === r.nome ? T.glassSheen : "transparent", transition: "background 150ms" }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: hasVal ? colore : T.border, flexShrink: 0 }} />
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: hasVal ? T.ink : T.muted, flex: 1 }}>{r.nome}</div>
                      {hasVal && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>{pct(r.totale, totalTemplate)}%</div>}
                      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: hasVal ? 600 : 400, color: hasVal ? T.ink : T.muted, minWidth: 100, textAlign: "right" }}>{hasVal ? currency(r.totale) : "—"}</div>
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
                    {["N°","Nome offerta","Cliente","Data","Importo","Stato","Commessa"].map((h, i) => (
                      <th key={h} style={{ ...thSt, textAlign: i >= 4 && i !== 5 ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {offerteFiltrate.map(o => {
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
function TabCommesse({ commesse, incassatoPerCommessa, permissions, T, navigate }) {
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
      <div style={{ display: "grid", gridTemplateColumns: permissions.canViewFinancials ? "repeat(3,1fr)" : "1fr", gap: 12 }}>
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

// ── TAB 3: Analisi Economica (estratta da AnalisiPage) ────────────
function TabEconomica({ T, studioId, navigate }) {
  const [members, setMembers]       = useState([]);
  const [timesheet, setTimesheet]   = useState([]);
  const [commesse, setCommesse]     = useState([]);
  const [costiExtra, setCostiExtra] = useState([]);
  const [collab, setCollab]         = useState([]);
  const [ratePagate, setRatePagate] = useState([]);
  const [costiInterni, setCostiInterni] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [annoFiltro, setAnnoFiltro] = useState(0);
  const [search, setSearch]         = useState("");
  const [sortCol, setSortCol]       = useState("margine");
  const [sortAsc, setSortAsc]       = useState(false);
  const [selectedCommessa, setSelectedCommessa] = useState(null);

  useEffect(() => {
    if (!studioId) return;
    const load = async () => {
      const [{ data: mem }, { data: ts }, { data: comm }, { data: ce }, { data: co }, { data: rp }, { data: ci }] = await Promise.all([
        supabase.from("team_members").select("id,user_name,user_email,color,costo_orario").eq("studio", studioId).eq("active", true),
        supabase.from("timesheet").select("project_id,hours,team_member").eq("studio", studioId),
        supabase.from("commesse").select("id,project_id,nome_commessa,cliente,numero_offerta,importo_offerta_base,importo_totale,data_commessa,created_at,archived").eq("studio", studioId).is("deleted_at", null),
        supabase.from("costi_extra").select("commessa_id,importo").eq("studio", studioId),
        supabase.from("collaboratori_esterni").select("commessa_id,importo").eq("studio", studioId),
        supabase.from("suddivisione_pagamenti").select("commessa_id,percentuale,importo_fisso").eq("pagato", true),
        supabase.from("costi_interni").select("*").eq("studio", studioId),
      ]);
      setMembers(mem ?? []); setTimesheet(ts ?? []); setCommesse(comm ?? []);
      setCostiExtra(ce ?? []); setCollab(co ?? []); setRatePagate(rp ?? []); setCostiInterni(ci ?? []);
      setLoading(false);
    };
    load();
  }, [studioId]);

  const anni = useMemo(() => {
    const s = new Set([0]);
    commesse.forEach(c => { const d = c.data_commessa || c.created_at; if (d) s.add(new Date(d).getFullYear()); });
    return [...s].sort((a, b) => b - a);
  }, [commesse]);

  const commesseFiltrate = useMemo(() => {
    if (annoFiltro === 0) return commesse;
    return commesse.filter(c => { const d = c.data_commessa || c.created_at; return d && new Date(d).getFullYear() === annoFiltro; });
  }, [commesse, annoFiltro]);

  const memberMap = useMemo(() => Object.fromEntries(members.map(m => [m.id, m])), [members]);
  const tsMap     = useMemo(() => {
    const m = {};
    timesheet.forEach(t => { if (!m[t.project_id]) m[t.project_id] = {}; m[t.project_id][t.team_member] = (m[t.project_id][t.team_member] || 0) + t.hours; });
    return m;
  }, [timesheet]);

  const stats = useMemo(() => commesseFiltrate.map(c => {
    const totaleOre = Object.values(tsMap[c.project_id] || {}).reduce((s, h) => s + h, 0);
    const costoOre  = Object.entries(tsMap[c.project_id] || {}).reduce((s, [mid, h]) => s + h * (memberMap[mid]?.costo_orario || 0), 0);
    const costiExtraC = costiExtra.filter(x => x.commessa_id === c.id).reduce((s, x) => s + Number(x.importo || 0), 0);
    const collabC     = collab.filter(x => x.commessa_id === c.id).reduce((s, x) => s + Number(x.importo || 0), 0);
    const costiInC    = costiInterni.filter(x => x.commessa_id === c.id).reduce((s, x) => s + Number(x.importo || 0), 0);
    const incassato   = ratePagate.filter(r => r.commessa_id === c.id).reduce((s, r) => {
      const base = Number(c.importo_totale || c.importo_offerta_base) || 0;
      if (r.importo_fisso) return s + Number(r.importo_fisso);
      return s + base * (Number(r.percentuale) / 100);
    }, 0);
    const ricavi  = Number(c.importo_totale || c.importo_offerta_base) || 0;
    const costi   = costoOre + costiExtraC + collabC + costiInC;
    const margine = ricavi - costi;
    const margPct = ricavi > 0 ? Math.round((margine / ricavi) * 100) : 0;
    return { commessa: c, totaleOre, costoOre, costiExtra: costiExtraC, collab: collabC, costiInt: costiInC, ricavi, costi, margine, margPct, incassato };
  }), [commesseFiltrate, tsMap, memberMap, costiExtra, collab, costiInterni, ratePagate]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return stats.filter(s => !q || s.commessa.nome_commessa?.toLowerCase().includes(q) || s.commessa.cliente?.toLowerCase().includes(q));
  }, [stats, search]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const va = a[sortCol] ?? 0, vb = b[sortCol] ?? 0;
    return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  }), [filtered, sortCol, sortAsc]);

  const handleSort = col => { if (sortCol === col) setSortAsc(p => !p); else { setSortCol(col); setSortAsc(false); } };
  const arr = col => sortCol === col ? (sortAsc ? " ↑" : " ↓") : "";

  const thSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, padding: "8px 14px", borderBottom: `1px solid ${T.border}`, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" };
  const tdSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink, padding: "9px 14px", borderBottom: `0.5px solid ${T.border}` };

  if (loading) return <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, textAlign: "center", padding: 40 }}>Caricamento...</div>;

  // Dettaglio commessa selezionata
  if (selectedCommessa) {
    const stat = stats.find(s => s.commessa.id === selectedCommessa.id);
    if (!stat) return null;
    const c = stat.commessa;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <button onClick={() => setSelectedCommessa(null)} style={{ background: "none", border: `0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, cursor: "pointer", color: T.ink, padding: "6px 14px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, alignSelf: "flex-start" }}>← Torna all'elenco</button>
        <Panel title={`${c.nome_commessa} — ${c.cliente || "—"}`} T={T}>
          <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            {[
              { label: "Ricavi", value: currency(stat.ricavi, 2), color: T.navy },
              { label: "Costi totali", value: currency(stat.costi, 2), color: T.red },
              { label: "Margine", value: currency(stat.margine, 2), color: stat.margine >= 0 ? T.green : T.red },
              { label: "Margine %", value: `${stat.margPct}%`, color: stat.margPct >= 0 ? T.green : T.red },
              { label: "Ore tot.", value: fmtOre(stat.totaleOre) },
              { label: "Incassato", value: currency(stat.incassato, 2), color: T.green },
            ].map(k => <KpiCard key={k.label} label={k.label} value={k.value} color={k.color} T={T} />)}
          </div>
          <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Costo ore team", v: stat.costoOre },
              { label: "Costi extra",    v: stat.costiExtra },
              { label: "Collaboratori",  v: stat.collab },
              { label: "Costi interni",  v: stat.costiInt },
            ].map(k => (
              <div key={k.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `0.5px solid ${T.border}` }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>{k.label}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink }}>{currency(k.v, 2)}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca commessa…"
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 12px", border: `1px solid ${T.border}`, background: T.surface, color: T.ink, outline: "none", borderRadius: T.radiusSm, width: 200 }} />
        <select value={annoFiltro} onChange={e => setAnnoFiltro(Number(e.target.value))}
          style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 12px", border: `1px solid ${T.border}`, background: T.surface, color: T.ink, cursor: "pointer", outline: "none", borderRadius: T.radiusSm }}>
          {anni.map(a => <option key={a} value={a}>{a === 0 ? "Tutti gli anni" : a}</option>)}
        </select>
      </div>

      <Panel T={T} style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[["nome_commessa","Commessa"],["ricavi","Ricavi"],["costi","Costi"],["margine","Margine"],["margPct","Marg. %"],["totaleOre","Ore"],["incassato","Incassato"]].map(([col, label]) => (
                <th key={col} style={{ ...thSt, textAlign: col !== "nome_commessa" ? "right" : "left" }} onClick={() => handleSort(col)}>{label}{arr(col)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && <tr><td colSpan={7} style={{ ...tdSt, textAlign: "center", color: T.muted, padding: 32 }}>Nessun dato</td></tr>}
            {sorted.map(s => (
              <tr key={s.commessa.id} onClick={() => setSelectedCommessa(s.commessa)} style={{ cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = T.glassSheen}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={tdSt}><div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 500 }}>{s.commessa.nome_commessa}</div><div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>{s.commessa.cliente}</div></td>
                <td style={{ ...tdSt, textAlign: "right", color: T.navy, fontWeight: 600 }}>{currency(s.ricavi, 2)}</td>
                <td style={{ ...tdSt, textAlign: "right", color: T.red }}>{currency(s.costi, 2)}</td>
                <td style={{ ...tdSt, textAlign: "right", fontWeight: 700, color: s.margine >= 0 ? T.green : T.red }}>{currency(s.margine, 2)}</td>
                <td style={{ ...tdSt, textAlign: "right", color: s.margPct >= 0 ? T.green : T.red }}>{s.margPct}%</td>
                <td style={{ ...tdSt, textAlign: "right", color: T.muted }}>{fmtOre(s.totaleOre)}</td>
                <td style={{ ...tdSt, textAlign: "right", color: T.green }}>{currency(s.incassato, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
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

  const [activeTab, setActiveTab] = useState("offerte");
  const [offerte, setOfferte]           = useState([]);
  const [commesse, setCommesse]         = useState([]);
  const [vociTemplate, setVociTemplate] = useState([]);
  const [incassatoPerCommessa, setIncassatoPerCommessa] = useState({});
  const [loading, setLoading]           = useState(true);

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
      <button onClick={() => navigate("/impostazioni/piano")} style={{ background: T.navy, color: "#EEF1F6", border: "none", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 24px", cursor: "pointer", borderRadius: T.radiusSm }}>Vedi piani →</button>
    </div>
  );
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 56 }}>

      {/* Badge beta + tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <SlidingTabs tabs={HUB_TABS} active={activeTab} onChange={setActiveTab} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7c3aed", background: "rgba(124,58,237,0.1)", padding: "3px 9px", borderRadius: 99 }}>beta</span>
      </div>

      {/* Contenuto tab */}
      {activeTab === "offerte" && (
        <TabOfferte offerte={offerte} commessaByNumero={commessaByNumero} vociTemplate={vociTemplate} T={T} navigate={navigate} />
      )}
      {activeTab === "commesse" && (
        <TabCommesse commesse={commesse} incassatoPerCommessa={incassatoPerCommessa} permissions={permissions} T={T} navigate={navigate} />
      )}
      {activeTab === "economica" && (
        <TabEconomica T={T} studioId={studioId} navigate={navigate} />
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
