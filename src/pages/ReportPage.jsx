import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import { formatOre } from "../lib/utils";

// ── BRAND TOKENS ─────────────────────────────────────────────────
const T = {
  ink: '#0E0E0D', navy: '#13315C', brass: '#D9C98A',
  paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33',
  red: '#b91c1c', green: '#1a6b3c',
};

const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

function toISODate(d) { return d.toISOString().slice(0, 10); }
function getMonthRange(year, month) {
  return { start: toISODate(new Date(year, month, 1)), end: toISODate(new Date(year, month+1, 0)) };
}
function csvEscape(v) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g,'""')}"` : s;
}

// ── SHARED UI ────────────────────────────────────────────────────
function KpiCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '18px 20px' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.04em', color: color || T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    </div>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '18px 20px' }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: T.muted, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function ReportPage() {
  const { studioId, loading: studioLoading } = useStudio();
  const permissions = usePermissions();
  const now = new Date();

  const [selectedYear, setSelectedYear]     = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth]   = useState(now.getMonth());
  const [timesheetRows, setTimesheetRows]   = useState([]);
  const [yearRows, setYearRows]             = useState([]);
  const [projects, setProjects]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");

  const loadData = async (year, month) => {
    if (!studioId) return;
    setLoading(true); setError("");
    const range = getMonthRange(year, month);
    const [tsRes, pRes, yrRes] = await Promise.all([
      supabase.from("timesheet").select("*").eq("studio", studioId).gte("date", range.start).lte("date", range.end).order("date", { ascending: true }),
      supabase.from("projects").select("id,client,archived").eq("studio", studioId).eq("archived", false),
      supabase.from("timesheet").select("*").eq("studio", studioId).gte("date", `${year}-01-01`).lte("date", `${year}-12-31`),
    ]);
    if (tsRes.error || pRes.error || yrRes.error) { setError(tsRes.error?.message || pRes.error?.message || yrRes.error?.message || "Errore"); setLoading(false); return; }
    setTimesheetRows(tsRes.data ?? []);
    setYearRows(yrRes.data ?? []);
    setProjects(pRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (studioId) loadData(selectedYear, selectedMonth); }, [selectedYear, selectedMonth, studioId]);

  const summary = useMemo(() => ({
    oreTotali: timesheetRows.reduce((s, r) => s + (Number(r.hours)||0), 0),
    progettiAttivi: projects.length,
    clienti: new Set(projects.map(p => p.client).filter(Boolean)).size,
  }), [projects, timesheetRows]);

  const hoursByClient = useMemo(() => {
    const g = {};
    timesheetRows.forEach(r => { const n = r.project_name || "Progetto non assegnato"; g[n] = (g[n]||0) + (Number(r.hours)||0); });
    return Object.entries(g).map(([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours);
  }, [timesheetRows]);

  const hoursByMember = useMemo(() => {
    const g = {};
    timesheetRows.forEach(r => { const n = r.user_name || "Membro non assegnato"; g[n] = (g[n]||0) + (Number(r.hours)||0); });
    return Object.entries(g).map(([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours);
  }, [timesheetRows]);

  const tableRows = useMemo(() => {
    const g = {};
    timesheetRows.forEach(r => { const n = r.user_name || "Membro non assegnato"; if (!g[n]) g[n] = { name: n, monthHours: 0, yearHours: 0 }; g[n].monthHours += Number(r.hours)||0; });
    yearRows.forEach(r => { const n = r.user_name || "Membro non assegnato"; if (!g[n]) g[n] = { name: n, monthHours: 0, yearHours: 0 }; g[n].yearHours += Number(r.hours)||0; });
    return Object.values(g).sort((a, b) => b.monthHours - a.monthHours);
  }, [timesheetRows, yearRows]);

  const changeMonth = delta => { const next = new Date(selectedYear, selectedMonth + delta, 1); setSelectedYear(next.getFullYear()); setSelectedMonth(next.getMonth()); };

  const exportCsv = () => {
    const headers = ["data","progetto","membro","ore","note"];
    const lines = [headers.join(","), ...timesheetRows.map(r => [csvEscape(r.date), csvEscape(r.project_name), csvEscape(r.user_name), csvEscape(r.hours), csvEscape(r.notes||r.note)].join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `report-timesheet-${selectedYear}-${String(selectedMonth+1).padStart(2,"0")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const tooltipStyle = { contentStyle: { background: '#fff', border: `0.5px solid ${T.ink20}`, borderRadius: 0, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.ink }, formatter: v => formatOre(v) };
  const axisStyle = { tick: { fill: T.muted, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }, axisLine: false, tickLine: false };

  if (!studioLoading && !permissions.canViewReport) return (
    <div style={{ border: `0.5px solid ${T.ink10}`, background: '#fff', padding: 32, textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Non hai i permessi per accedere a questa sezione.</div>
  );
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento report...</div>
  );
  if (error) return (
    <div style={{ border: `0.5px solid ${T.ink10}`, background: '#fff', padding: 32, color: T.red, fontSize: 13 }}>Errore: {error}</div>
  );

  const thSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, padding: '8px 14px', borderBottom: `0.5px solid ${T.ink10}`, textAlign: 'left' };
  const tdSt = { padding: '9px 14px', borderBottom: `0.5px solid ${T.ink10}`, fontSize: 12, color: T.ink, fontFamily: "'Space Grotesk', sans-serif" };
  const monoSt = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Navigazione mese */}
      <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: `0.5px solid ${T.ink20}`, cursor: 'pointer', color: T.ink, padding: '5px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>←</button>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', minWidth: 180, textAlign: 'center' }}>
            {MONTHS[selectedMonth]} {selectedYear}
          </div>
          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: `0.5px solid ${T.ink20}`, cursor: 'pointer', color: T.ink, padding: '5px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>→</button>
        </div>
        <button onClick={exportCsv} style={{ background: T.navy, border: 'none', cursor: 'pointer', color: '#EEF1F6', padding: '8px 18px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Esporta CSV
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <KpiCard label="Ore totali del mese" value={formatOre(summary.oreTotali)} color={T.navy} />
        <KpiCard label="Progetti attivi"     value={summary.progettiAttivi}       color={T.green} />
        <KpiCard label="Clienti"             value={summary.clienti}              color={T.ink} />
      </div>

      {/* Grafici */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <ChartPanel title="Ore per progetto">
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursByClient} layout="vertical">
                <CartesianGrid stroke={T.ink10} strokeDasharray="3 3" />
                <XAxis type="number" {...axisStyle} stroke="transparent" />
                <YAxis type="category" dataKey="name" width={150} {...axisStyle} stroke="transparent" tick={{ ...axisStyle.tick, fontSize: 9 }} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="hours" fill={T.navy} radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel title="Ore per membro del team">
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursByMember}>
                <CartesianGrid stroke={T.ink10} strokeDasharray="3 3" />
                <XAxis dataKey="name" {...axisStyle} stroke="transparent" tick={{ ...axisStyle.tick, fontSize: 9 }} />
                <YAxis {...axisStyle} stroke="transparent" />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="hours" fill={T.navy} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>
      </div>

      {/* Tabella dettaglio */}
      <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, overflowX: 'auto' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: T.muted, padding: '12px 14px', borderBottom: `0.5px solid ${T.ink10}` }}>
          Dettaglio ore per membro
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thSt}>Nome membro</th>
              <th style={thSt}>Ore del mese</th>
              <th style={thSt}>Ore totali anno</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr><td colSpan={3} style={{ ...tdSt, color: T.muted, textAlign: 'center', padding: '32px 0' }}>Nessun dato disponibile per il periodo selezionato.</td></tr>
            ) : tableRows.map(row => (
              <tr key={row.name}>
                <td style={{ ...tdSt, fontWeight: 600 }}>{row.name}</td>
                <td style={{ ...tdSt, ...monoSt }}>{formatOre(row.monthHours)}</td>
                <td style={{ ...tdSt, ...monoSt, color: T.muted }}>{formatOre(row.yearHours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
