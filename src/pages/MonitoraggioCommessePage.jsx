import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import { calcolaIncassato } from "../lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── BRAND TOKENS ─────────────────────────────────────────────────
const T = {
  ink: '#0E0E0D', navy: '#13315C', brass: '#D9C98A',
  paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33',
  red: '#b91c1c', green: '#1a6b3c',
};

const MONTHS = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

function currency(v) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(v) || 0);
}
function formatNumber(v) {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(Number(v) || 0);
}
function parseOffertaSortValue(n) {
  if (!n) return Number.NEGATIVE_INFINITY;
  const m = String(n).match(/(\d+)\D+(\d{2,4})/);
  if (!m) return Number.NEGATIVE_INFINITY;
  const prog = Number(m[1]) || 0;
  const rawY = Number(m[2]) || 0;
  const year = rawY < 100 ? 2000 + rawY : rawY;
  return year * 10000 + prog;
}
function getReferenceDate(item) { return item.data_commessa || item.created_at || null; }
function getDaysOpen(d) {
  if (!d) return 0;
  const start = new Date(d);
  if (isNaN(start.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
}

// ── SHARED UI ────────────────────────────────────────────────────
function KpiCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '18px 20px' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.04em', color: color || T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    </div>
  );
}

function SortButton({ label, col, sortBy, sortDir, onSort }) {
  const active = sortBy === col;
  return (
    <button onClick={() => onSort(col)} style={{
      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
      letterSpacing: '0.2em', textTransform: 'uppercase',
      color: active ? T.navy : T.muted,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {label}
      <span style={{ fontSize: 9 }}>{active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
    </button>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function MonitoraggioCommessePage() {
  const navigate = useNavigate();
  const { studioId, loading: studioLoading } = useStudio();
  const permissions = usePermissions();

  const [commesse, setCommesse]                   = useState([]);
  const [pagamentiByCommessa, setPagamentiByCommessa] = useState({});
  const [incassatoPerCommessa, setIncassatoPerCommessa] = useState({});
  const [selectedYear, setSelectedYear]           = useState(new Date().getFullYear());
  const [sortBy, setSortBy]                       = useState("offerta");
  const [sortDirection, setSortDirection]         = useState("desc");
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState("");

  useEffect(() => {
    if (studioLoading || !studioId) return;
    const loadData = async () => {
      setLoading(true); setError("");
      const [cR, pR] = await Promise.all([
        supabase.from("commesse").select("*").eq("studio", studioId),
        supabase.from("pagamenti").select("commessa_id,importo"),
      ]);
      if (cR.error) { setError(cR.error.message); setLoading(false); return; }
      if (pR.error) { setError(pR.error.message); setLoading(false); return; }

      const grouped = (pR.data ?? []).reduce((acc, p) => {
        acc[p.commessa_id] = (acc[p.commessa_id] || 0) + (Number(p.importo) || 0);
        return acc;
      }, {});

      const loaded = cR.data ?? [];
      setPagamentiByCommessa(grouped);
      setCommesse(loaded);

      const incassatoMap = await calcolaIncassato(loaded.map(c => c.id), studioId, supabase);
      setIncassatoPerCommessa(incassatoMap);

      const years = loaded.map(c => {
        const d = getReferenceDate(c);
        if (!d) return null;
        const y = new Date(d).getFullYear();
        return isNaN(y) ? null : y;
      }).filter(Boolean);
      if (years.length > 0) setSelectedYear(Math.max(...years));
      setLoading(false);
    };
    loadData();
  }, [studioId, studioLoading]);

  const rows = useMemo(() => commesse.map(item => {
    const valoreContratto = Number(item.importo_offerta_base) || 0;
    const incassato = permissions.canViewFinancials
      ? (incassatoPerCommessa[item.id] || 0)
      : (Number(pagamentiByCommessa[item.id]) || 0);
    return {
      ...item,
      valoreContratto,
      incassato,
      residuo: valoreContratto - incassato,
      giorniApertura: getDaysOpen(getReferenceDate(item)),
      offertaSortValue: parseOffertaSortValue(item.numero_offerta),
      nomeOfferta: `${item.numero_offerta || "-"} — ${item.nome_commessa || ""}`.trim(),
    };
  }), [commesse, pagamentiByCommessa, incassatoPerCommessa, permissions.canViewFinancials]);

  const totals = useMemo(() => rows.reduce((acc, r) => {
    acc.valoreContratti += r.valoreContratto;
    acc.incassato += r.incassato;
    return acc;
  }, { valoreContratti: 0, incassato: 0 }), [rows]);

  const daIncassare = totals.valoreContratti - totals.incassato;

  const availableYears = useMemo(() => {
    const years = rows.map(r => {
      const d = getReferenceDate(r);
      if (!d) return null;
      const y = new Date(d).getFullYear();
      return isNaN(y) ? null : y;
    }).filter(Boolean);
    return years.length === 0 ? [new Date().getFullYear()] : [...new Set(years)].sort((a, b) => b - a);
  }, [rows]);

  const chartData = useMemo(() => {
    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: MONTHS[i], valore: 0 }));
    rows.forEach(r => {
      const d = getReferenceDate(r);
      if (!d) return;
      const date = new Date(d);
      if (isNaN(date.getTime()) || date.getFullYear() !== selectedYear) return;
      monthly[date.getMonth()].valore += r.valoreContratto;
    });
    return monthly;
  }, [rows, selectedYear]);

  const sortedRows = useMemo(() => {
    const mult = sortDirection === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortBy === "offerta") return (a.offertaSortValue - b.offertaSortValue) * mult;
      if (sortBy === "cliente") return (a.cliente || "").localeCompare(b.cliente || "", "it", { sensitivity: "base" }) * mult;
      if (sortBy === "valore")    return (a.valoreContratto - b.valoreContratto) * mult;
      if (sortBy === "incassato") return (a.incassato - b.incassato) * mult;
      if (sortBy === "residuo")   return (a.residuo - b.residuo) * mult;
      if (sortBy === "giorni")    return (a.giorniApertura - b.giorniApertura) * mult;
      return 0;
    });
  }, [rows, sortBy, sortDirection]);

  const handleSort = col => {
    if (sortBy === col) { setSortDirection(p => p === "asc" ? "desc" : "asc"); return; }
    setSortBy(col); setSortDirection(col === "offerta" ? "desc" : "asc");
  };

  const thSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, padding: '8px 14px', borderBottom: `0.5px solid ${T.ink10}`, textAlign: 'left', whiteSpace: 'nowrap' };
  const tdSt = { padding: '10px 14px', borderBottom: `0.5px solid ${T.ink10}`, fontSize: 12, color: T.ink, fontFamily: "'Space Grotesk', sans-serif", verticalAlign: 'middle' };
  const monoSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
      Caricamento monitoraggio...
    </div>
  );

  if (!studioLoading && !permissions.canViewMonitoraggio) return (
    <div style={{ border: `0.5px solid ${T.ink10}`, background: '#fff', padding: 32, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
      Non hai i permessi per accedere a questa sezione.
    </div>
  );

  if (error) return (
    <div style={{ border: `0.5px solid ${T.ink10}`, background: '#fff', padding: 32, color: T.red, fontSize: 13 }}>Errore: {error}</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: permissions.canViewFinancials ? 'repeat(3, 1fr)' : '1fr', gap: 10 }}>
        <KpiCard label="Valore contratti totale" value={currency(totals.valoreContratti)} color={T.navy} />
        {permissions.canViewFinancials && (
          <>
            <KpiCard label="Incassato totale"    value={currency(totals.incassato)} color={T.green} />
            <KpiCard label="Da incassare totale" value={currency(daIncassare)}      color={T.red} />
          </>
        )}
      </div>

      {/* GRAFICO */}
      <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: T.muted }}>
            Andamento valore commesse
          </div>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            style={{ padding: '5px 10px', border: `0.5px solid ${T.ink20}`, background: T.paper, color: T.ink, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", outline: 'none', cursor: 'pointer' }}>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke={T.ink10} strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: T.muted, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }} axisLine={{ stroke: T.ink10 }} tickLine={false} />
              <YAxis tick={{ fill: T.muted, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => `${formatNumber(v)}€`} />
              <Tooltip
                contentStyle={{ background: '#fff', border: `0.5px solid ${T.ink20}`, borderRadius: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink }}
                formatter={v => currency(v)}
                labelStyle={{ color: T.muted, fontSize: 10, letterSpacing: '0.1em' }}
              />
              <Line type="monotone" dataKey="valore" stroke={T.navy} strokeWidth={2} dot={{ r: 3, fill: T.navy, strokeWidth: 0 }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABELLA */}
      <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr>
              {[
                ['offerta', 'Nome Offerta'],
                ['cliente', 'Cliente'],
                ['valore', 'Valore Contratto'],
                ...(permissions.canViewFinancials ? [['incassato', 'Incassato'], ['residuo', 'Residuo']] : []),
                ['giorni', 'Giorni Apertura'],
              ].map(([col, label]) => (
                <th key={col} style={thSt}>
                  <SortButton label={label} col={col} sortBy={sortBy} sortDir={sortDirection} onSort={handleSort} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Totali */}
            <tr style={{ background: T.paper }}>
              <td style={{ ...tdSt, fontWeight: 600, ...monoSt }}>TOTALE COMPLESSIVO</td>
              <td style={tdSt}>—</td>
              <td style={{ ...tdSt, ...monoSt, fontWeight: 600, color: T.navy }}>{currency(totals.valoreContratti)}</td>
              {permissions.canViewFinancials && (
                <>
                  <td style={{ ...tdSt, ...monoSt, fontWeight: 600, color: T.green }}>{currency(totals.incassato)}</td>
                  <td style={{ ...tdSt, ...monoSt, fontWeight: 600, color: daIncassare > 0 ? T.red : T.green }}>{currency(daIncassare)}</td>
                </>
              )}
              <td style={tdSt}>—</td>
            </tr>

            {/* Righe */}
            {sortedRows.map(row => {
              const delayed = row.residuo > 0 && row.giorniApertura > 60;
              return (
                <tr key={row.id} onClick={() => navigate(`/commesse/${row.id}`)}
                  style={{ cursor: 'pointer', background: delayed ? '#fef2f2' : 'transparent', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = delayed ? '#fee2e2' : T.paper}
                  onMouseLeave={e => e.currentTarget.style.background = delayed ? '#fef2f2' : 'transparent'}
                >
                  <td style={{ ...tdSt, fontWeight: 600 }}>{row.nomeOfferta}</td>
                  <td style={{ ...tdSt, color: T.muted }}>{row.cliente || '—'}</td>
                  <td style={{ ...tdSt, ...monoSt }}>{currency(row.valoreContratto)}</td>
                  {permissions.canViewFinancials && (
                    <>
                      <td style={{ ...tdSt, ...monoSt, color: T.green }}>{currency(row.incassato)}</td>
                      <td style={{ ...tdSt, ...monoSt, color: row.residuo > 0 ? T.red : T.green }}>{currency(row.residuo)}</td>
                    </>
                  )}
                  <td style={{ ...tdSt, ...monoSt, color: row.giorniApertura > 60 ? T.red : T.muted }}>{row.giorniApertura}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
