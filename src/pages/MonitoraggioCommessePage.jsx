import { useEffect, useMemo, useState } from "react";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function currency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function parseOffertaSortValue(numeroOfferta) {
  if (!numeroOfferta) {
    return Number.NEGATIVE_INFINITY;
  }

  const match = String(numeroOfferta).match(/(\d+)\D+(\d{2,4})/);
  if (!match) {
    return Number.NEGATIVE_INFINITY;
  }

  const progressive = Number(match[1]) || 0;
  const rawYear = Number(match[2]) || 0;
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  return year * 10000 + progressive;
}

function getReferenceDate(item) {
  return item.data_commessa || item.created_at || null;
}

function getDaysOpen(referenceDate) {
  if (!referenceDate) {
    return 0;
  }

  const start = new Date(referenceDate);
  if (Number.isNaN(start.getTime())) {
    return 0;
  }

  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export default function MonitoraggioCommessePage() {
  const { studioId, loading: studioLoading } = useStudio();
  const permissions = usePermissions();
  const [commesse, setCommesse] = useState([]);
  const [pagamentiByCommessa, setPagamentiByCommessa] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sortBy, setSortBy] = useState("offerta");
  const [sortDirection, setSortDirection] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (studioLoading || !studioId) return;
    const loadData = async () => {
      setLoading(true);
      setError("");

      const [commesseResult, pagamentiResult] = await Promise.all([
        supabase.from("commesse").select("*").eq("studio", studioId),
        supabase.from("pagamenti").select("commessa_id,importo"),
      ]);

      if (commesseResult.error) {
        setError(commesseResult.error.message);
        setLoading(false);
        return;
      }

      if (pagamentiResult.error) {
        setError(pagamentiResult.error.message);
        setLoading(false);
        return;
      }

      const groupedPayments = (pagamentiResult.data ?? []).reduce((acc, pagamento) => {
        const key = pagamento.commessa_id;
        acc[key] = (acc[key] || 0) + (Number(pagamento.importo) || 0);
        return acc;
      }, {});

      const loadedCommesse = commesseResult.data ?? [];
      setPagamentiByCommessa(groupedPayments);
      setCommesse(loadedCommesse);

      const years = loadedCommesse
        .map((item) => {
          const refDate = getReferenceDate(item);
          if (!refDate) {
            return null;
          }
          const year = new Date(refDate).getFullYear();
          return Number.isNaN(year) ? null : year;
        })
        .filter(Boolean);

      if (years.length > 0) {
        const maxYear = Math.max(...years);
        setSelectedYear(maxYear);
      }

      setLoading(false);
    };

    loadData();
  }, [studioId, studioLoading]);

  const rows = useMemo(() => {
    return commesse.map((item) => {
      const valoreContratto = Number(item.importo_offerta_base) || 0;
      const incassato = Number(pagamentiByCommessa[item.id]) || 0;
      const residuo = valoreContratto - incassato;
      const giorniApertura = getDaysOpen(getReferenceDate(item));

      return {
        ...item,
        valoreContratto,
        incassato,
        residuo,
        giorniApertura,
        offertaSortValue: parseOffertaSortValue(item.numero_offerta),
        nomeOfferta: `${item.numero_offerta || "-"} - ${item.nome_commessa || ""}`.trim(),
      };
    });
  }, [commesse, pagamentiByCommessa]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.valoreContratti += row.valoreContratto;
        acc.incassato += row.incassato;
        return acc;
      },
      { valoreContratti: 0, incassato: 0 },
    );
  }, [rows]);

  const daIncassare = totals.valoreContratti - totals.incassato;

  const availableYears = useMemo(() => {
    const years = rows
      .map((row) => {
        const refDate = getReferenceDate(row);
        if (!refDate) {
          return null;
        }
        const parsedYear = new Date(refDate).getFullYear();
        return Number.isNaN(parsedYear) ? null : parsedYear;
      })
      .filter(Boolean);

    if (years.length === 0) {
      return [new Date().getFullYear()];
    }

    return [...new Set(years)].sort((a, b) => b - a);
  }, [rows]);

  const chartData = useMemo(() => {
    const monthlyValues = Array.from({ length: 12 }, (_, index) => ({
      month: MONTHS[index],
      valore: 0,
    }));

    rows.forEach((row) => {
      const refDate = getReferenceDate(row);
      if (!refDate) {
        return;
      }
      const date = new Date(refDate);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== selectedYear) {
        return;
      }
      const monthIndex = date.getMonth();
      monthlyValues[monthIndex].valore += row.valoreContratto;
    });

    return monthlyValues;
  }, [rows, selectedYear]);

  const sortedRows = useMemo(() => {
    const multiplier = sortDirection === "asc" ? 1 : -1;
    const nextRows = [...rows];

    nextRows.sort((a, b) => {
      if (sortBy === "offerta") {
        return (a.offertaSortValue - b.offertaSortValue) * multiplier;
      }
      if (sortBy === "cliente") {
        return (
          (a.cliente || "").localeCompare(b.cliente || "", "it", { sensitivity: "base" }) *
          multiplier
        );
      }
      if (sortBy === "valore") {
        return (a.valoreContratto - b.valoreContratto) * multiplier;
      }
      if (sortBy === "incassato") {
        return (a.incassato - b.incassato) * multiplier;
      }
      if (sortBy === "residuo") {
        return (a.residuo - b.residuo) * multiplier;
      }
      if (sortBy === "giorni") {
        return (a.giorniApertura - b.giorniApertura) * multiplier;
      }
      return 0;
    });

    return nextRows;
  }, [rows, sortBy, sortDirection]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDirection(column === "offerta" ? "desc" : "asc");
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
        Caricamento monitoraggio commesse...
      </section>
    );
  }

  if (!studioLoading && !permissions.canViewMonitoraggio) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
        Non hai i permessi per accedere a questa sezione.
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-[#ff453a]">
        Errore: {error}
      </section>
    );
  }

  return (
    <div className="space-y-6 bg-[#1c1c1e] text-white">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-[#0a84ff]/60 bg-[#2c2c2e] p-5">
          <p className="text-sm text-white/70">Valore Contratti totale</p>
          <p className="mt-2 text-2xl font-bold text-[#0a84ff]">{currency(totals.valoreContratti)}</p>
        </article>
        <article className="rounded-xl border border-[#30d158]/60 bg-[#2c2c2e] p-5">
          <p className="text-sm text-white/70">Incassato totale</p>
          <p className="mt-2 text-2xl font-bold text-[#30d158]">{currency(totals.incassato)}</p>
        </article>
        <article className="rounded-xl border border-[#ff453a]/60 bg-[#2c2c2e] p-5">
          <p className="text-sm text-white/70">Da Incassare totale</p>
          <p className="mt-2 text-2xl font-bold text-[#ff453a]">{currency(daIncassare)}</p>
        </article>
      </section>

      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Andamento valore commesse</h2>
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className="rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#48484a" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#f5f5f7" tick={{ fill: "#f5f5f7", fontSize: 12 }} />
              <YAxis
                stroke="#f5f5f7"
                tick={{ fill: "#f5f5f7", fontSize: 12 }}
                tickFormatter={(value) => `${formatNumber(value)}€`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1c1c1e",
                  borderColor: "#48484a",
                  borderRadius: 8,
                  color: "#f5f5f7",
                }}
                formatter={(value) => currency(value)}
              />
              <Line type="monotone" dataKey="valore" stroke="#0a84ff" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#48484a] bg-[#2c2c2e]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-white">
            <thead className="bg-[#1c1c1e] text-left text-xs uppercase tracking-wide text-white/70">
              <tr>
                {[
                  ["offerta", "Nome Offerta"],
                  ["cliente", "Cliente"],
                  ["valore", "Valore Contratto"],
                  ["incassato", "Incassato"],
                  ["residuo", "Residuo"],
                  ["giorni", "Giorni Apertura"],
                ].map(([key, label]) => (
                  <th key={key} className="border-b border-[#48484a] px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                      className="inline-flex items-center gap-1 text-left text-white/80 hover:text-white"
                    >
                      {label}
                      <span className="text-[10px] text-white/50">
                        {sortBy === key ? (sortDirection === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#48484a] bg-[#1c1c1e] font-bold">
                <td className="px-4 py-3">TOTALE COMPLESSIVO</td>
                <td className="px-4 py-3">-</td>
                <td className="px-4 py-3 text-[#0a84ff]">{currency(totals.valoreContratti)}</td>
                <td className="px-4 py-3 text-[#30d158]">{currency(totals.incassato)}</td>
                <td className={`px-4 py-3 ${daIncassare > 0 ? "text-[#ff453a]" : "text-[#30d158]"}`}>
                  {currency(daIncassare)}
                </td>
                <td className="px-4 py-3">-</td>
              </tr>

              {sortedRows.map((row) => {
                const isDelayedUnpaid = row.residuo > 0 && row.giorniApertura > 60;
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-[#48484a] ${
                      isDelayedUnpaid ? "bg-[#ff453a]/10" : "bg-transparent"
                    }`}
                  >
                    <td className="px-4 py-3">{row.nomeOfferta}</td>
                    <td className="px-4 py-3 text-white/85">{row.cliente || "-"}</td>
                    <td className="px-4 py-3">{currency(row.valoreContratto)}</td>
                    <td className="px-4 py-3 text-[#30d158]">{currency(row.incassato)}</td>
                    <td className={`px-4 py-3 ${row.residuo > 0 ? "text-[#ff453a]" : "text-[#30d158]"}`}>
                      {currency(row.residuo)}
                    </td>
                    <td className="px-4 py-3">{row.giorniApertura}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
