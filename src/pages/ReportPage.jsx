import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import { formatOre } from "../lib/utils";

const MONTHS = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function getMonthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

function csvEscape(value) {
  const input = String(value ?? "");
  if (input.includes(",") || input.includes('"') || input.includes("\n")) {
    return `"${input.replace(/"/g, '""')}"`;
  }
  return input;
}

export default function ReportPage() {
  const { studioId, loading: studioLoading } = useStudio();
  const permissions = usePermissions();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [timesheetRows, setTimesheetRows] = useState([]);
  const [yearTimesheetRows, setYearTimesheetRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async (year, month) => {
    if (!studioId) return;
    setLoading(true);
    setError("");
    const range = getMonthRange(year, month);
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const [timesheetRes, projectsRes, yearTimesheetRes] = await Promise.all([
      supabase
        .from("timesheet")
        .select("*")
        .eq("studio", studioId)
        .gte("date", range.start)
        .lte("date", range.end)
        .order("date", { ascending: true }),
      supabase.from("projects").select("id,client,archived").eq("studio", studioId).eq("archived", false),
      supabase
        .from("timesheet")
        .select("*")
        .eq("studio", studioId)
        .gte("date", startOfYear)
        .lte("date", endOfYear),
    ]);

    if (timesheetRes.error || projectsRes.error || yearTimesheetRes.error) {
      setError(
        timesheetRes.error?.message ||
          projectsRes.error?.message ||
          yearTimesheetRes.error?.message ||
          "Errore caricamento report",
      );
      setLoading(false);
      return;
    }

    setTimesheetRows(timesheetRes.data ?? []);
    setYearTimesheetRows(yearTimesheetRes.data ?? []);
    setProjects(projectsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (studioId) loadData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, studioId]);

  const summary = useMemo(() => {
    const oreTotali = timesheetRows.reduce((sum, row) => sum + (Number(row.hours) || 0), 0);
    const progettiAttivi = projects.length;
    const clienti = new Set(
      projects.map((p) => p.client).filter(Boolean),
    ).size;

    return { oreTotali, progettiAttivi, clienti };
  }, [projects, timesheetRows]);

  const hoursByClient = useMemo(() => {
    const grouped = {};
    timesheetRows.forEach((row) => {
      const projectName = row.project_name || "Progetto non assegnato";
      grouped[projectName] = (grouped[projectName] || 0) + (Number(row.hours) || 0);
    });

    return Object.entries(grouped)
      .map(([name, hours]) => ({ name, hours }))
      .sort((a, b) => b.hours - a.hours);
  }, [timesheetRows]);

  const hoursByMember = useMemo(() => {
    const grouped = {};
    timesheetRows.forEach((row) => {
      const name = row.user_name || "Membro non assegnato";
      grouped[name] = (grouped[name] || 0) + (Number(row.hours) || 0);
    });
    return Object.entries(grouped)
      .map(([name, hours]) => ({ name, hours }))
      .sort((a, b) => b.hours - a.hours);
  }, [timesheetRows]);

  const tableRows = useMemo(() => {
    const grouped = {};
    timesheetRows.forEach((row) => {
      const name = row.user_name || "Membro non assegnato";
      if (!grouped[name]) {
        grouped[name] = { name, monthHours: 0, yearHours: 0 };
      }
      grouped[name].monthHours += Number(row.hours) || 0;
    });

    yearTimesheetRows.forEach((row) => {
      const name = row.user_name || "Membro non assegnato";
      if (!grouped[name]) {
        grouped[name] = { name, monthHours: 0, yearHours: 0 };
      }
      grouped[name].yearHours += Number(row.hours) || 0;
    });

    return Object.values(grouped).sort((a, b) => b.monthHours - a.monthHours);
  }, [timesheetRows, yearTimesheetRows]);

  const changeMonth = (delta) => {
    const next = new Date(selectedYear, selectedMonth + delta, 1);
    setSelectedYear(next.getFullYear());
    setSelectedMonth(next.getMonth());
  };

  const exportCsv = () => {
    const headers = ["data", "progetto", "membro", "ore", "note"];
    const lines = [
      headers.join(","),
      ...timesheetRows.map((row) =>
        [
          csvEscape(row.date),
          csvEscape(row.project_name),
          csvEscape(row.user_name),
          csvEscape(row.hours),
          csvEscape(row.notes || row.note),
        ].join(","),
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `report-timesheet-${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!studioLoading && !permissions.canViewReport) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
        Non hai i permessi per accedere a questa sezione.
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
        Caricamento report...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-red-300">
        Errore: {error}
      </section>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-[#1c1c1e] text-white">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="rounded-md border border-[#48484a] px-3 py-1 text-sm hover:bg-white/10"
          >
            ←
          </button>
          <p className="min-w-52 text-center text-sm font-medium">
            {MONTHS[selectedMonth]} {selectedYear}
          </p>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="rounded-md border border-[#48484a] px-3 py-1 text-sm hover:bg-white/10"
          >
            →
          </button>
        </div>

        <button
          type="button"
          onClick={exportCsv}
          className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
        >
          Esporta CSV
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <p className="text-sm text-white/70">Ore Totali del mese</p>
          <p className="mt-1 text-2xl font-bold text-[#0a84ff]">{formatOre(summary.oreTotali)}</p>
        </article>
        <article className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <p className="text-sm text-white/70">Progetti Attivi</p>
          <p className="mt-1 text-2xl font-bold text-[#30d158]">{summary.progettiAttivi}</p>
        </article>
        <article className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <p className="text-sm text-white/70">Clienti</p>
          <p className="mt-1 text-2xl font-bold text-white">{summary.clienti}</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <h3 className="mb-3 text-lg font-semibold">Ore per Cliente</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursByClient} layout="vertical">
                <CartesianGrid stroke="#48484a" strokeDasharray="3 3" />
                <XAxis type="number" stroke="#f5f5f7" tick={{ fill: "#f5f5f7", fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  stroke="#f5f5f7"
                  tick={{ fill: "#f5f5f7", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1c1c1e", borderColor: "#48484a" }}
                  formatter={(value) => formatOre(value)}
                />
                <Bar dataKey="hours" fill="#0a84ff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
          <h3 className="mb-3 text-lg font-semibold">Ore per Membro del Team</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursByMember}>
                <CartesianGrid stroke="#48484a" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#f5f5f7" tick={{ fill: "#f5f5f7", fontSize: 12 }} />
                <YAxis stroke="#f5f5f7" tick={{ fill: "#f5f5f7", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1c1c1e", borderColor: "#48484a" }}
                  formatter={(value) => formatOre(value)}
                />
                <Bar dataKey="hours" fill="#0a84ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#48484a] bg-[#2c2c2e]">
        <h3 className="border-b border-[#48484a] px-4 py-3 text-lg font-semibold">Dettaglio ore per membro</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#1c1c1e] text-left text-white/70">
              <tr>
                <th className="px-4 py-3">Nome membro</th>
                <th className="px-4 py-3">Ore del mese</th>
                <th className="px-4 py-3">Ore totali anno</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.name} className="border-t border-[#48484a]">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{formatOre(row.monthHours)}</td>
                  <td className="px-4 py-3">{formatOre(row.yearHours)}</td>
                </tr>
              ))}
              {tableRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-white/60" colSpan={3}>
                    Nessun dato disponibile per il periodo selezionato.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
