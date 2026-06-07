import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { useStudio } from "../hooks/useStudio";
import { useTheme } from "../contexts/ThemeContext";
import { usePermissions } from "../hooks/usePermissions";
import { usePlan } from "../hooks/usePlan";
import { supabase } from "../lib/supabase";
import SlidingTabs from "../components/SlidingTabs";

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(v) || 0);
}
function pct(a, b) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

const PALETTE = [
  "#1e3a5f", "#2d5a8e", "#4a7cb5", "#6d9fd4", "#9ec2e8",
  "#1a6b3c", "#2d9c5e", "#56c98a", "#a8e6c3",
  "#7c3aed", "#a78bfa", "#854d0e", "#f59e0b",
];

const TABS = [
  { key: "tutte",     label: "Tutte" },
  { key: "offerta",   label: "In corso" },
  { key: "accettata", label: "Accettate" },
  { key: "rifiutata", label: "Rifiutate" },
];

const STATI = {
  offerta:   { label: "In corso",  color: "#854d0e", bg: "#fefce8" },
  accettata: { label: "Accettata", color: "#1a6b3c", bg: "#f0fdf4" },
  rifiutata: { label: "Rifiutata", color: "#b91c1c", bg: "#fef2f2" },
};

// ── Grafico torta riutilizzabile ─────────────────────────────────
function PieVoci({ pieData, totalVoci, hoveredVoce, setHoveredVoce, size = 220, innerRadius = 55, outerRadius = 90, T }) {
  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%" cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          onMouseEnter={(_, i) => setHoveredVoce(pieData[i]?.name ?? null)}
          onMouseLeave={() => setHoveredVoce(null)}
        >
          {pieData.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.color}
              opacity={hoveredVoce === null || hoveredVoce === entry.name ? 1 : 0.25}
              stroke="none"
              style={{ cursor: "pointer" }}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: T.surface,
            border: `0.5px solid ${T.border}`,
            borderRadius: 0,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: T.ink,
          }}
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
        supabase.from("commesse").select("id,numero_offerta,importo_totale").eq("studio", studioId).is("deleted_at", null),
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
      if (c.numero_offerta) m[c.numero_offerta] = (m[c.numero_offerta] || 0) + (Number(c.importo_totale) || 0);
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
        ? off.voci
        : [{ nome: off.nome_offerta || "Prestazione", prezzo: Number(off.importo_offerta_base) || 0, attiva: true }];
      const lordiSalvati = voci.filter(v => v.attiva !== false).reduce((s, v) => s + Number(v.prezzo || 0), 0);
      const alreadyDisc = sconto > 0 && Math.abs(lordiSalvati - Number(off.importo_offerta_base)) < 0.5;
      const vociNorm = alreadyDisc
        ? voci.map(v => ({ ...v, prezzo: Math.round(Number(v.prezzo || 0) / (1 - sconto / 100) * 100) / 100 }))
        : voci;
      for (const v of vociNorm) {
        if (v.attiva === false) continue;
        const nome = (v.nome || "—").trim();
        const key = nome.toLowerCase();
        if (!map[key]) map[key] = { nome, order: 9999, isTemplate: false, totale: 0, count: 0 };
        map[key].totale += Number(v.prezzo || 0);
        map[key].count++;
      }
    }
    return Object.values(map).sort((a, b) => a.order - b.order || a.nome.localeCompare(b.nome));
  }, [offerteFiltrate, vociTemplate]);

  const righeTemplate = useMemo(() => righeVoci.filter(r => r.isTemplate), [righeVoci]);
  const righeLibere   = useMemo(() => righeVoci.filter(r => !r.isTemplate && r.totale > 0), [righeVoci]);

  const totalTemplate = useMemo(() => righeTemplate.reduce((s, r) => s + r.totale, 0), [righeTemplate]);
  const totalLibere   = useMemo(() => righeLibere.reduce((s, r) => s + r.totale, 0), [righeLibere]);

  const pieData = useMemo(() =>
    righeTemplate.filter(r => r.totale > 0).map((r, i) => ({
      name: r.nome,
      value: r.totale,
      color: PALETTE[i % PALETTE.length],
    })),
  [righeTemplate]);

  // ── GUARDS ───────────────────────────────────────────────────────
  if (!permissions.isProjectManager) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ ...mono, fontSize: 11, color: T.muted }}>Sezione riservata al project manager.</div>
    </div>
  );
  if (plan.id !== "pro") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 16 }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>Funzionalità Pro</div>
      <div style={{ ...mono, fontSize: 11, color: T.muted, textAlign: "center", maxWidth: 360 }}>Disponibile solo per il piano Pro.</div>
      <button onClick={() => navigate("/impostazioni/piano")} style={{ background: T.navy, color: "#EEF1F6", border: "none", ...mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", padding: "10px 24px", cursor: "pointer" }}>Vedi piani →</button>
    </div>
  );
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, ...mono, fontSize: 11, color: T.muted }}>Caricamento...</div>
  );

  // ── STILI ────────────────────────────────────────────────────────
  const thSt = { ...mono, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: T.muted, padding: "8px 14px", borderBottom: `1px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap" };
  const tdSt = { ...mono, fontSize: 11, color: T.ink, padding: "9px 14px", borderBottom: `0.5px solid ${T.border}` };

  const nTot   = offerteFiltrate.length;
  const nAcc   = offerteFiltrate.filter(o => o.stato === "accettata").length;
  const nRif   = offerteFiltrate.filter(o => o.stato === "rifiutata").length;
  const nCorso = offerteFiltrate.filter(o => o.stato === "offerta").length;
  const totVal = offerteFiltrate.reduce((s, o) => s + (Number(o.importo_offerta_base) || 0), 0);

  // Riga voce riutilizzabile
  const VoceRow = ({ r, i, total, last, colored }) => {
    const idx = pieData.findIndex(p => p.name === r.nome);
    const colore = idx >= 0 ? PALETTE[idx % PALETTE.length] : (colored ? PALETTE[(i + 4) % PALETTE.length] : T.border);
    const hasVal = r.totale > 0;
    const isHov = hoveredVoce === r.nome;
    return (
      <div
        onMouseEnter={() => setHoveredVoce(r.nome)}
        onMouseLeave={() => setHoveredVoce(null)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
          borderBottom: !last ? `0.5px solid ${T.border}` : "none",
          background: isHov ? T.surface2 : "transparent",
          transition: "background 150ms",
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: hasVal ? colore : T.border, flexShrink: 0 }} />
        <div style={{ ...mono, fontSize: 12, color: hasVal ? T.ink : T.muted, flex: 1 }}>{r.nome}</div>
        {hasVal && <div style={{ ...mono, fontSize: 10, color: T.muted, marginRight: 6 }}>{pct(r.totale, total)}%</div>}
        <div style={{ ...mono, fontSize: 12, fontWeight: hasVal ? 600 : 400, color: hasVal ? T.ink : T.muted, textAlign: "right", minWidth: 90 }}>
          {hasVal ? currency(r.totale) : "—"}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 48 }}>

      {/* ── TOP ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <SlidingTabs tabs={TABS} active={tab} onChange={setTab} />
        <div style={{ marginLeft: "auto" }}>
          <select value={annoFiltro} onChange={e => setAnnoFiltro(Number(e.target.value))}
            style={{ ...mono, fontSize: 11, padding: "5px 10px", border: `1px solid ${T.border}`, background: T.surface, color: T.ink, cursor: "pointer", outline: "none" }}>
            <option value={0}>Tutti gli anni</option>
            {anni.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* ── KPI ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        {[
          { label: "Totali",    value: nTot },
          { label: "Accettate", value: nAcc },
          { label: "Rifiutate", value: nRif },
          { label: "In corso",  value: nCorso },
          { label: "Valore",    value: currency(totVal) },
          { label: "Conv. %",   value: `${pct(nAcc, nTot)}%` },
        ].map(k => (
          <div key={k.label} style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "12px 14px" }}>
            <div style={{ ...mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 5 }}>{k.label}</div>
            <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: T.ink }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── VOCI TEMPLATE + GRAFICO ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>

        {/* Tabella 1: voci template */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div style={{ ...mono, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: T.muted, padding: "10px 14px", borderBottom: `1px solid ${T.border}` }}>
            Voci offerta
          </div>
          {righeTemplate.length === 0 && (
            <div style={{ ...mono, fontSize: 11, color: T.muted, padding: "24px 14px", textAlign: "center" }}>Nessuna voce configurata</div>
          )}
          {righeTemplate.map((r, i) => (
            <VoceRow key={r.nome} r={r} i={i} total={totalTemplate} last={i === righeTemplate.length - 1} colored={false} />
          ))}
          {totalTemplate > 0 && (
            <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderTop: `1px solid ${T.border}`, background: T.surface2 }}>
              <div style={{ ...mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em", flex: 1 }}>Totale</div>
              <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: T.ink }}>{currency(totalTemplate)}</div>
            </div>
          )}
        </div>

        {/* Grafico a torta — cliccabile */}
        <div
          onClick={() => pieData.length > 0 && setPieModal(true)}
          style={{
            background: T.surface, border: `1px solid ${T.border}`, padding: "16px",
            cursor: pieData.length > 0 ? "pointer" : "default",
            transition: "box-shadow 150ms",
          }}
          onMouseEnter={e => { if (pieData.length > 0) e.currentTarget.style.boxShadow = `0 0 0 1.5px ${T.navy}`; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: T.muted }}>Distribuzione voci</div>
            {pieData.length > 0 && <div style={{ ...mono, fontSize: 9, color: T.muted }}>↗ espandi</div>}
          </div>
          {pieData.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, ...mono, fontSize: 11, color: T.muted }}>Nessun dato</div>
          ) : (
            <>
              <PieVoci pieData={pieData} totalVoci={totalTemplate} hoveredVoce={hoveredVoce} setHoveredVoce={setHoveredVoce} size={200} innerRadius={50} outerRadius={82} T={T} />
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
                {pieData.map(d => (
                  <div key={d.name}
                    onMouseEnter={() => setHoveredVoce(d.name)}
                    onMouseLeave={() => setHoveredVoce(null)}
                    style={{ display: "flex", alignItems: "center", gap: 7, opacity: hoveredVoce === null || hoveredVoce === d.name ? 1 : 0.35, transition: "opacity 150ms" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                    <div style={{ ...mono, fontSize: 9, color: T.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                    <div style={{ ...mono, fontSize: 9, color: T.muted }}>{pct(d.value, totalTemplate)}%</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── TABELLA 2: offerte libere (non template) ─────────────── */}
      {righeLibere.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div style={{ ...mono, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: T.muted, padding: "10px 14px", borderBottom: `1px solid ${T.border}` }}>
            Voci libere (fuori template)
          </div>
          {righeLibere.map((r, i) => (
            <VoceRow key={r.nome} r={r} i={i} total={totalLibere} last={i === righeLibere.length - 1} colored={true} />
          ))}
          {totalLibere > 0 && (
            <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderTop: `1px solid ${T.border}`, background: T.surface2 }}>
              <div style={{ ...mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em", flex: 1 }}>Totale</div>
              <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: T.ink }}>{currency(totalLibere)}</div>
            </div>
          )}
        </div>
      )}

      {/* ── TABELLA OFFERTE ─────────────────────────────────────── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, overflowX: "auto" }}>
        <div style={{ ...mono, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: T.muted, padding: "10px 14px", borderBottom: `1px solid ${T.border}` }}>
          Offerte{tab !== "tutte" ? ` — ${TABS.find(t => t.key === tab)?.label}` : ""}
        </div>
        {offerteFiltrate.length === 0 ? (
          <div style={{ ...mono, fontSize: 11, color: T.muted, textAlign: "center", padding: "32px 0" }}>Nessuna offerta</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thSt}>N°</th>
                <th style={thSt}>Nome offerta</th>
                <th style={thSt}>Cliente</th>
                <th style={thSt}>Data</th>
                <th style={{ ...thSt, textAlign: "right" }}>Importo</th>
                <th style={thSt}>Stato</th>
                <th style={{ ...thSt, textAlign: "right" }}>Commessa</th>
              </tr>
            </thead>
            <tbody>
              {offerteFiltrate.map(o => {
                const stato = STATI[o.stato] ?? { label: o.stato, color: T.muted, bg: "transparent" };
                const valComm = commessaByNumero[o.numero_offerta];
                return (
                  <tr key={o.id} onClick={() => navigate(`/offerte/${o.id}`)} style={{ cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...tdSt, color: T.muted }}>{o.numero_offerta || "—"}</td>
                    <td style={tdSt}>{o.nome_offerta || "—"}</td>
                    <td style={{ ...tdSt, color: T.muted }}>{o.cliente || "—"}</td>
                    <td style={{ ...tdSt, color: T.muted }}>{o.data_offerta ? new Date(o.data_offerta).toLocaleDateString("it-IT") : "—"}</td>
                    <td style={{ ...tdSt, textAlign: "right", fontWeight: 600 }}>{currency(o.importo_offerta_base)}</td>
                    <td style={tdSt}>
                      <span style={{ ...mono, fontSize: 10, color: stato.color, background: stato.bg, padding: "2px 8px", display: "inline-block" }}>
                        {stato.label}
                      </span>
                    </td>
                    <td style={{ ...tdSt, textAlign: "right", color: valComm ? T.ink : T.muted, fontWeight: valComm ? 600 : 400 }}>
                      {valComm ? currency(valComm) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── MODAL GRAFICO ESPANSO ────────────────────────────────── */}
      {pieModal && (
        <div
          onClick={() => setPieModal(false)}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: T.surface, border: `1px solid ${T.border}`, width: "100%", maxWidth: 780, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            {/* Header modal */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: T.ink }}>Distribuzione voci offerta</div>
              <button onClick={() => setPieModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            {/* Corpo modal: grafico grande + lista */}
            <div style={{ display: "flex", gap: 0, overflow: "hidden", flex: 1 }}>
              {/* Grafico grande */}
              <div style={{ flex: "0 0 400px", padding: "24px 16px", borderRight: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PieVoci pieData={pieData} totalVoci={totalTemplate} hoveredVoce={hoveredVoce} setHoveredVoce={setHoveredVoce} size={340} innerRadius={80} outerRadius={145} T={T} />
              </div>
              {/* Lista voci con valori */}
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
                {pieData.map((d, i) => (
                  <div
                    key={d.name}
                    onMouseEnter={() => setHoveredVoce(d.name)}
                    onMouseLeave={() => setHoveredVoce(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "11px 24px",
                      borderBottom: i < pieData.length - 1 ? `0.5px solid ${T.border}` : "none",
                      background: hoveredVoce === d.name ? T.surface2 : "transparent",
                      opacity: hoveredVoce === null || hoveredVoce === d.name ? 1 : 0.4,
                      transition: "background 120ms, opacity 120ms",
                    }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                    <div style={{ ...mono, fontSize: 11, color: T.ink, flex: 1 }}>{d.name}</div>
                    <div style={{ ...mono, fontSize: 11, color: T.muted, marginRight: 10 }}>{pct(d.value, totalTemplate)}%</div>
                    <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: T.ink, textAlign: "right", minWidth: 100 }}>{currency(d.value)}</div>
                  </div>
                ))}
                {/* Totale */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 24px", borderTop: `1px solid ${T.border}`, marginTop: 4, background: T.surface2 }}>
                  <div style={{ ...mono, fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em", flex: 1 }}>Totale</div>
                  <div style={{ ...mono, fontSize: 14, fontWeight: 700, color: T.ink }}>{currency(totalTemplate)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
