import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useStudio } from "../hooks/useStudio";

function currency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("it-IT");
}

function isScaduta(dataScadenza, pagato) {
  if (!dataScadenza || pagato) return false;
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const scadenza = new Date(dataScadenza);
  scadenza.setHours(0, 0, 0, 0);
  return scadenza < oggi;
}

function getStatoBadge(proforma) {
  if (proforma.pagato) {
    return { label: "Pagata", className: "bg-[#30d158]/20 text-[#30d158]" };
  }
  if (isScaduta(proforma.data_scadenza, proforma.pagato)) {
    return { label: "Scaduta", className: "bg-[#ff9f0a]/20 text-[#ff9f0a]" };
  }
  return { label: "In attesa", className: "bg-[#48484a]/40 text-white/60" };
}

export default function ProformaPage() {
  const navigate = useNavigate();
  const { studioId } = useStudio();
  const [proformaList, setProformaList] = useState([]);
  const [commesseMap, setCommesseMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mostraPagate, setMostraPagate] = useState(false);
  const [sortField, setSortField] = useState("data_creazione");
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!studioId) return;
      setLoading(true);
      setError("");

      try {
        const { data: proforma, error: proformaErr } = await supabase
          .from("proforma")
          .select("*")
          .eq("studio", studioId)
          .order("data_creazione", { ascending: false });

        if (proformaErr) {
          setError(proformaErr.message);
          setLoading(false);
          return;
        }

        const proformaData = proforma || [];
        setProformaList(proformaData);

        // Carica le commesse associate
        const commessaIds = [...new Set(proformaData.map((p) => p.commessa_id).filter(Boolean))];
        if (commessaIds.length > 0) {
          const { data: commesse } = await supabase
            .from("commesse")
            .select("id, nome_commessa, cliente")
            .in("id", commessaIds);

          const map = Object.fromEntries((commesse || []).map((c) => [c.id, c]));
          setCommesseMap(map);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studioId]);

  const filteredProforma = useMemo(() => {
    let list = mostraPagate ? proformaList : proformaList.filter((p) => !p.pagato);

    // Ordinamento
    list = [...list].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Gestione campi numerici
      if (sortField === "importo_totale") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      // Gestione date
      if (sortField === "data_creazione" || sortField === "data_scadenza") {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      // Gestione commessa/cliente (lookup)
      if (sortField === "nome_commessa" || sortField === "cliente") {
        const commA = commesseMap[a.commessa_id];
        const commB = commesseMap[b.commessa_id];
        valA = commA?.[sortField] || "";
        valB = commB?.[sortField] || "";
      }

      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });

    return list;
  }, [proformaList, mostraPagate, sortField, sortDesc, commesseMap]);

  const stats = useMemo(() => {
    const totale = proformaList.reduce((sum, p) => sum + (Number(p.importo_totale) || 0), 0);
    const pagato = proformaList.filter((p) => p.pagato).reduce((sum, p) => sum + (Number(p.importo_totale) || 0), 0);
    const daIncassare = totale - pagato;
    return { totale, pagato, daIncassare };
  }, [proformaList]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(true);
    }
  };

  const SortHeader = ({ field, children }) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide transition ${
          isActive ? "text-white" : "text-white/60 hover:text-white"
        }`}
      >
        {children}
        {isActive && <span className="text-[#0a84ff]">{sortDesc ? "↓" : "↑"}</span>}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {/* HEADER CON TOGGLE */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Proforma</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={mostraPagate}
            onChange={(e) => setMostraPagate(e.target.checked)}
            className="h-4 w-4 accent-[#0a84ff]"
          />
          Mostra anche pagate
        </label>
      </div>

      {/* TRE CARD IN CIMA */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#48484a] bg-[#0a84ff]/10 p-5">
          <p className="text-xs font-medium text-[#0a84ff]">Totale Proforma</p>
          <p className="mt-2 text-2xl font-bold text-white">{currency(stats.totale)}</p>
          <p className="mt-1 text-xs text-white/50">{proformaList.length} proforma</p>
        </div>
        <div className="rounded-xl border border-[#48484a] bg-[#30d158]/10 p-5">
          <p className="text-xs font-medium text-[#30d158]">Pagate</p>
          <p className="mt-2 text-2xl font-bold text-white">{currency(stats.pagato)}</p>
          <p className="mt-1 text-xs text-white/50">
            {proformaList.filter((p) => p.pagato).length} pagate
          </p>
        </div>
        <div className="rounded-xl border border-[#48484a] bg-[#ff453a]/10 p-5">
          <p className="text-xs font-medium text-[#ff453a]">Da Incassare</p>
          <p className="mt-2 text-2xl font-bold text-white">{currency(stats.daIncassare)}</p>
          <p className="mt-1 text-xs text-white/50">
            {proformaList.filter((p) => !p.pagato).length} aperte
          </p>
        </div>
      </div>

      {/* TABELLA */}
      <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] overflow-hidden">
        {loading ? (
          <p className="py-10 text-center text-sm text-white/50">Caricamento...</p>
        ) : error ? (
          <p className="py-10 text-center text-sm text-red-300">{error}</p>
        ) : filteredProforma.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/40">
            {mostraPagate ? "Nessuna proforma." : "Nessuna proforma da incassare."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#48484a] bg-[#1c1c1e]">
                <tr>
                  <th className="w-32">
                    <SortHeader field="numero_proforma">N° Proforma</SortHeader>
                  </th>
                  <th>
                    <SortHeader field="nome_commessa">Commessa</SortHeader>
                  </th>
                  <th className="w-40">
                    <SortHeader field="cliente">Cliente</SortHeader>
                  </th>
                  <th className="w-28">
                    <SortHeader field="importo_totale">Valore</SortHeader>
                  </th>
                  <th className="w-32">
                    <SortHeader field="data_creazione">Data Creazione</SortHeader>
                  </th>
                  <th className="w-32">
                    <SortHeader field="data_scadenza">Data Scadenza</SortHeader>
                  </th>
                  <th className="w-28">
                    <span className="block px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-white/60">
                      Stato
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#48484a]/50">
                {filteredProforma.map((proforma) => {
                  const commessa = commesseMap[proforma.commessa_id];
                  const scaduta = isScaduta(proforma.data_scadenza, proforma.pagato);
                  const stato = getStatoBadge(proforma);

                  return (
                    <tr
                      key={proforma.id}
                      onClick={() => navigate(`/commesse/${proforma.commessa_id}`)}
                      className="cursor-pointer transition hover:bg-white/5"
                    >
                      <td className="px-3 py-3">
                        <span className="font-medium text-white">{proforma.numero_proforma}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-white/80">{commessa?.nome_commessa || "—"}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-white/60">{commessa?.cliente || "—"}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-[#0a84ff]">{currency(proforma.importo_totale)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-sm text-white/60">{formatDate(proforma.data_creazione)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`text-sm ${scaduta ? "font-medium text-[#ff453a]" : "text-white/60"}`}
                        >
                          {formatDate(proforma.data_scadenza)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${stato.className}`}
                        >
                          {stato.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
