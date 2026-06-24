import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { useTheme } from "../contexts/ThemeContext";
import { usePermissions } from "../hooks/usePermissions";
import { usePlan } from "../hooks/usePlan";
import { supabase } from "../lib/supabase";
import SlidingTabs from "../components/SlidingTabs";

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(v) || 0);
}
function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

const PALETTE = [
  "#1e3a5f","#2d5a8e","#4a7cb5","#6d9fd4","#9ec2e8",
  "#1a6b3c","#2d9c5e","#56c98a","#a8e6c3",
  "#7c3aed","#a78bfa","#854d0e","#f59e0b",
];

const TABS = [
  { key: "tutte",     label: "Tutte"    },
  { key: "offerta",   label: "In corso" },
  { key: "accettata", label: "Accettate"},
  { key: "rifiutata", label: "Rifiutate"},
];

const STATI = {
  offerta:   { label: "In corso",  color: "#854d0e", bg: "rgba(253,230,138,0.25)" },
  accettata: { label: "Accettata", color: "#1a6b3c", bg: "rgba(134,239,172,0.20)" },
  rifiutata: { label: "Rifiutata", color: "#b91c1c", bg: "rgba(252,165,165,0.20)" },
};

// ── Componenti riusabili ─────────────────────────────────────────
function KpiCard({ label, value, T }) {
  return (
    <div style={{
      background: T.surface,
      backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius,
      padding: "16px 18px",
      boxShadow: T.shadow,
    }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: T.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function SectionHeader({ title, T }) {
  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 12, letterSpacing: "-0.01em" }}>
      {title}
    </div>
  );
}

function PieVoci({ pieData, totalVoci, hoveredVoce, setHoveredVoce, size, innerRadius, outerRadius, T }) {
  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie
          data={pieData} cx="50%" cy="50%"
          innerRadius={innerRadius} outerRadius={outerRadius}
          paddingAngle={2} dataKey="value"
          onMouseEnter={(_, i) => setHoveredVoce(pieData[i]?.name ?? null)}
          onMouseLeave={() => setHoveredVoce(null)}
        >
          {pieData.map(entry => (
            <Cell key={entry.name} fill={entry.color} stroke="none"
              opacity={hoveredVoce === null || hoveredVoce === entry.name ? 1 : 0.2}
              style={{ cursor: "pointer", filter: hoveredVoce === entry.name ? "brightness(1.15)" : "none", transition: "opacity 200ms" }}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: T.glassBg, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusSm, backdropFilter: T.blur, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink, boxShadow: T.shadowMd }}
          formatter={(value, name) => [currency(value), name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function AnalisiOffertePage() {
  usePageTitleOnMount("Analisi Offerte");
  const navigate = useNavigate();
  const { T } = useTheme();
  const { studioId } = useStudio();
  const permissions = usePermissions();
  const { plan } = usePlan();

  const [offerte, setOfferte]           = useState([]);
  const [commesse, setCommesse]         = useState([]);
  const [vociTemplate, setVociTemplate] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState("tutte");
  const [annoFiltro, setAnnoFiltro]     = useState(new Date().getFullYear());
  const [hoveredVoce, setHoveredVoce]   = useState(null);
  const [pieModal, setPieModal]         = useState(false);

  useEffect(() => {
    if (!studioId) return;
    const load = async () => {
      const [{ data: off }, { data: comm }, { data: tmpl }] = await Promise.all([
        supabase.from("offerte").select("*").eq("studio", studioId).eq("archived", false).is("deleted_at", null),
        supabase.from("commesse").select("id,numero_offerta,importo_offerta_base,importo_totale").eq("studio", studioId).is("deleted_at", null),
        supabase.from("voci_offerta_template").select("*").eq("studio", studioId).order("order", { ascending: true }),
      ]);
      setOfferte(off ?? []);
      setCommesse(comm ?? []);
      setVociTemplate(tmpl ?? []);
      setLoading(false);
    };
    load();
  }, [studioId]);

  const anni = useMemo(() => {
    const set = new Set(offerte.map(o => new Date(o.data_offerta || o.created_at).getFullYear()).filter(Boolean));
    return Array.from(set).sort((a, b) => b - a);
  }, [offerte]);

  const commessaByNumero = useMemo(() => {
    const m = {};
    for (const c of commesse) {
      if (c.numero_offerta) m[c.numero_offerta] = (m[c.numero_offerta] || 0) + (Number(c.importo_offerta_base) || Number(c.importo_totale) || 0);
    }
    return m;
  }, [commesse]);

  const offerteFiltrate = useMemo(() => {
    let res = annoFiltro === 0 ? offerte : offerte.filter(o => new Date(o.data_offerta || o.created_at).getFullYear() === annoFiltro);
    if (tab !== "tutte") res = res.filter(o => o.stato === tab);
    return res;
  }, [offerte, annoFiltro, tab]);

  const righeVoci = useMemo(() => {
    const map = {};
    for (const t of vociTemplate) {
      const key = t.nome.trim().toLowerCase();
      map[key] = { nome: t.nome, order: t.order ?? 0, isTemplate: true, totale: 0, count: 0 };
    }
    for (const off of offerteFiltrate) {
      const sconto = Number(off.sconto) || 0;
      const voci = Array.isArray(off.voci) && off.voci.length > 0
        ? off.voci : [{ nome: off.nome_offerta || "Prestazione", prezzo: Number(off.importo_offerta_base) || 0, attiva: true }];
      const lordiSalvati = voci.filter(v => v.attiva !== false).reduce((s, v) => s + Number(v.prezzo || 0), 0);
      const alreadyDisc = sconto > 0 && Math.abs(lordiSalvati - Number(off.importo_offerta_base)) < 0.5;
      const vociNorm = alreadyDisc ? voci.map(v => ({ ...v, prezzo: Math.round(Number(v.prezzo || 0) / (1 - sconto / 100) * 100) / 100 })) : voci;
      for (const v of vociNorm) {
        if (v.attiva === false) continue;
        const nome = (v.nome || "—").trim();
        const key = nome.toLowerCase();
        if (!map[key]) map[key] = { nome, order: 9999, isTemplate: false, totale: 0, count: 0 };
        map[key].totale += Number(v.prezzo || 0);
        map[key].count++;
      }
    }
    return Object.values(map).sort((a, b) => b.totale - a.totale || a.order - b.order || a.nome.localeCompare(b.nome));
  }, [offerteFiltrate, vociTemplate]);

  const righeTemplate = useMemo(() => righeVoci.filter(r => r.isTemplate), [righeVoci]);
  const righeLibere   = useMemo(() => righeVoci.filter(r => !r.isTemplate && r.totale > 0), [righeVoci]);
  const totalTemplate = useMemo(() => righeTemplate.reduce((s, r) => s + r.totale, 0), [righeTemplate]);
  const totalLibere   = useMemo(() => righeLibere.reduce((s, r) => s + r.totale, 0), [righeLibere]);

  const pieData = useMemo(() =>
    righeTemplate.filter(r => r.totale > 0).map((r, i) => ({ name: r.nome, value: r.totale, color: PALETTE[i % PALETTE.length] })),
  [righeTemplate]);

  // ── GUARDS ───────────────────────────────────────────────────────
  if (!permissions.isProjectManager) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Sezione riservata al project manager.</div>
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

  const nTot   = offerteFiltrate.length;
  const nAcc   = offerteFiltrate.filter(o => o.stato === "accettata").length;
  const nRif   = offerteFiltrate.filter(o => o.stato === "rifiutata").length;
  const nCorso = offerteFiltrate.filter(o => o.stato === "offerta").length;
  const totVal = offerteFiltrate.reduce((s, o) => s + (Number(o.importo_offerta_base) || 0), 0);

  // ── stili tabella ────────────────────────────────────────────────
  const thSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: T.muted, padding: "10px 16px", borderBottom: `1px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap" };
  const tdSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink, padding: "10px 16px", borderBottom: `0.5px solid ${T.border}` };

  // ── riga voce ────────────────────────────────────────────────────
  const VoceRow = ({ r, i, total, last }) => {
    const idx = pieData.findIndex(p => p.name === r.nome);
    const colore = idx >= 0 ? PALETTE[idx % PALETTE.length] : (r.totale > 0 ? PALETTE[(i + 5) % PALETTE.length] : T.border);
    const hasVal = r.totale > 0;
    const isHov  = hoveredVoce === r.nome;
    return (
      <div
        onMouseEnter={() => setHoveredVoce(r.nome)}
        onMouseLeave={() => setHoveredVoce(null)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "11px 18px",
          borderBottom: !last ? `0.5px solid ${T.border}` : "none",
          background: isHov ? T.glassSheen : "transparent",
          transition: "background 150ms ease",
          borderRadius: last ? `0 0 ${T.radiusSm} ${T.radiusSm}` : 0,
        }}
      >
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: hasVal ? colore : T.border, flexShrink: 0, boxShadow: hasVal && isHov ? `0 0 6px ${colore}88` : "none", transition: "box-shadow 150ms" }} />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: hasVal ? T.ink : T.muted, flex: 1, fontWeight: hasVal ? 500 : 400 }}>{r.nome}</div>
        {hasVal && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>{pct(r.totale, total)}%</div>}
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: hasVal ? 600 : 400, color: hasVal ? T.ink : T.muted, textAlign: "right", minWidth: 100 }}>
          {hasVal ? currency(r.totale) : "—"}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 56 }}>

      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <SlidingTabs tabs={TABS} active={tab} onChange={setTab} />
        <div style={{ marginLeft: "auto" }}>
          <select value={annoFiltro} onChange={e => setAnnoFiltro(Number(e.target.value))}
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, padding: "6px 12px", border: `1px solid ${T.border}`, background: T.surface, color: T.ink, cursor: "pointer", outline: "none", borderRadius: T.radiusSm, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm }}>
            <option value={0}>Tutti gli anni</option>
            {anni.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* ── KPI CARDS ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
        <KpiCard label="Totali"    value={nTot}              T={T} />
        <KpiCard label="Accettate" value={nAcc}              T={T} />
        <KpiCard label="Rifiutate" value={nRif}              T={T} />
        <KpiCard label="In corso"  value={nCorso}            T={T} />
        <KpiCard label="Valore"    value={currency(totVal)}  T={T} />
        <KpiCard label="Conv. %"   value={`${pct(nAcc, nTot)}%`} T={T} />
      </div>

      {/* ── VOCI + GRAFICO ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>

        {/* Tabella voci template */}
        <div style={{ background: T.surface, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
            <SectionHeader title="Voci offerta" T={T} />
          </div>
          {righeTemplate.length === 0 ? (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, padding: "28px", textAlign: "center" }}>Nessuna voce configurata</div>
          ) : (
            <>
              {righeTemplate.map((r, i) => <VoceRow key={r.nome} r={r} i={i} total={totalTemplate} last={i === righeTemplate.length - 1} />)}
              {totalTemplate > 0 && (
                <div style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderTop: `1px solid ${T.border}`, background: T.surface2 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.15em", flex: 1 }}>Totale</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 700, color: T.ink }}>{currency(totalTemplate)}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Grafico a torta — cliccabile */}
        <div
          onClick={() => pieData.length > 0 && setPieModal(true)}
          style={{
            background: T.surface, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm,
            border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow,
            overflow: "hidden", cursor: pieData.length > 0 ? "pointer" : "default",
            transition: "box-shadow 200ms, transform 200ms",
          }}
          onMouseEnter={e => { if (pieData.length > 0) { e.currentTarget.style.boxShadow = T.shadowMd; e.currentTarget.style.transform = "translateY(-1px)"; }}}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = T.shadow; e.currentTarget.style.transform = "none"; }}
        >
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <SectionHeader title="Distribuzione voci" T={T} />
            {pieData.length > 0 && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, letterSpacing: "0.05em" }}>↗ espandi</div>}
          </div>
          <div style={{ padding: "12px 16px" }}>
            {pieData.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Nessun dato</div>
            ) : (
              <>
                <PieVoci pieData={pieData} totalVoci={totalTemplate} hoveredVoce={hoveredVoce} setHoveredVoce={setHoveredVoce} size={200} innerRadius={50} outerRadius={82} T={T} />
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
            )}
          </div>
        </div>
      </div>


      {/* ── TABELLA OFFERTE ─────────────────────────────────────── */}
      <div style={{ background: T.surface, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, border: `1px solid ${T.border}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
          <SectionHeader title={`Offerte${tab !== "tutte" ? ` — ${TABS.find(t => t.key === tab)?.label}` : ""}`} T={T} />
        </div>
        {offerteFiltrate.length === 0 ? (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, textAlign: "center", padding: "40px 0" }}>Nessuna offerta</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["N°", "Nome offerta", "Cliente", "Data", "Importo", "Stato", "Commessa"].map((h, i) => (
                    <th key={h} style={{ ...thSt, textAlign: i >= 4 && i !== 5 ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offerteFiltrate.map(o => {
                  const stato = STATI[o.stato] ?? { label: o.stato, color: T.muted, bg: "transparent" };
                  const valComm = commessaByNumero[o.numero_offerta];
                  return (
                    <tr key={o.id} onClick={() => navigate(`/offerte/${o.id}`)}
                      style={{ cursor: "pointer", transition: "background 120ms" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.glassSheen}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ...tdSt, color: T.muted }}>{o.numero_offerta || "—"}</td>
                      <td style={{ ...tdSt, fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>{o.nome_offerta || "—"}</td>
                      <td style={{ ...tdSt, color: T.muted }}>{o.cliente || "—"}</td>
                      <td style={{ ...tdSt, color: T.muted }}>{o.data_offerta ? new Date(o.data_offerta).toLocaleDateString("it-IT") : "—"}</td>
                      <td style={{ ...tdSt, textAlign: "right", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600 }}>{currency(o.importo_offerta_base)}</td>
                      <td style={tdSt}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: stato.color, background: stato.bg, padding: "3px 9px", borderRadius: 99, display: "inline-block" }}>
                          {stato.label}
                        </span>
                      </td>
                      <td style={{ ...tdSt, textAlign: "right", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: valComm ? 600 : 400, color: valComm ? T.ink : T.muted }}>
                        {valComm ? currency(valComm) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL GRAFICO ESPANSO ────────────────────────────────── */}
      {pieModal && (
        <div onClick={() => setPieModal(false)}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
              border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusLg,
              boxShadow: T.shadowLg, width: "100%", maxWidth: 800, maxHeight: "88vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
              animation: "fadeUp 220ms cubic-bezier(0.34,1.56,0.64,1)",
            }}>
            {/* Header modal */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 26px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: T.ink }}>Distribuzione voci offerta</div>
              <button onClick={() => setPieModal(false)}
                style={{ background: "rgba(128,128,128,0.12)", border: "none", cursor: "pointer", color: T.muted, width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, transition: "background 150ms" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(128,128,128,0.22)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(128,128,128,0.12)"}>
                ×
              </button>
            </div>
            {/* Corpo: grafico + lista */}
            <div style={{ display: "flex", overflow: "hidden", flex: 1 }}>
              {/* Grafico grande */}
              <div style={{ flex: "0 0 400px", padding: "28px 12px", borderRight: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PieVoci pieData={pieData} totalVoci={totalTemplate} hoveredVoce={hoveredVoce} setHoveredVoce={setHoveredVoce} size={340} innerRadius={80} outerRadius={148} T={T} />
              </div>
              {/* Lista voci */}
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                {pieData.map((d, i) => (
                  <div key={d.name}
                    onMouseEnter={() => setHoveredVoce(d.name)}
                    onMouseLeave={() => setHoveredVoce(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14, padding: "12px 26px",
                      borderBottom: i < pieData.length - 1 ? `0.5px solid ${T.border}` : "none",
                      background: hoveredVoce === d.name ? T.glassSheen : "transparent",
                      opacity: hoveredVoce === null || hoveredVoce === d.name ? 1 : 0.35,
                      transition: "background 120ms, opacity 120ms",
                    }}>
                    <div style={{ width: 11, height: 11, borderRadius: "50%", background: d.color, flexShrink: 0, boxShadow: hoveredVoce === d.name ? `0 0 8px ${d.color}99` : "none", transition: "box-shadow 150ms" }} />
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: T.ink, flex: 1 }}>{d.name}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginRight: 4 }}>{pct(d.value, totalTemplate)}%</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: T.ink, textAlign: "right", minWidth: 110 }}>{currency(d.value)}</div>
                  </div>
                ))}
                {/* Totale fisso in fondo */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 26px", borderTop: `1px solid ${T.border}`, background: T.surface2, position: "sticky", bottom: 0 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.15em", flex: 1 }}>Totale</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: T.ink }}>{currency(totalTemplate)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
