import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function currency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export default function ProformaPage() {
  const [proformaList, setProformaList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [commessaData, setCommessaData] = useState(null);
  const [rateAssociate, setRateAssociate] = useState([]);
  const [costiExtraAssociati, setCostiExtraAssociati] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      const { data, error: err } = await supabase
        .from("proforma")
        .select("*")
        .order("created_at", { ascending: false });
      if (err) {
        setError(err.message);
      } else {
        setProformaList(data ?? []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const selectProforma = async (pf) => {
    setSelected(pf);
    setRateAssociate([]);
    setCostiExtraAssociati([]);
    setCommessaData(null);
    if (!pf) return;
    setLoadingDetail(true);

    const [commessaRes] = await Promise.all([
      pf.commessa_id
        ? supabase.from("commesse").select("nome_commessa, numero_offerta, importo_offerta_base").eq("id", pf.commessa_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setCommessaData(commessaRes.data);

    if (pf.suddivisione_pagamento_ids?.length > 0) {
      const { data: rate } = await supabase
        .from("suddivisione_pagamenti")
        .select("*")
        .in("id", pf.suddivisione_pagamento_ids);
      setRateAssociate(rate || []);
    }

    if (pf.costo_extra_ids?.length > 0) {
      const { data: costiExtra } = await supabase
        .from("costi_extra")
        .select("*")
        .in("id", pf.costo_extra_ids);
      setCostiExtraAssociati(costiExtra || []);
    }

    setLoadingDetail(false);
  };

  const baseCommessa = Number(commessaData?.importo_offerta_base) || 0;

  return (
    <div className="flex gap-5">
      {/* COLONNA SINISTRA — lista proforma */}
      <aside className="w-72 shrink-0">
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-3">
          <h2 className="mb-3 px-1 text-sm font-semibold text-white">Tutte le Proforma</h2>
          {loading ? (
            <p className="py-6 text-center text-sm text-white/50">Caricamento...</p>
          ) : error ? (
            <p className="py-4 text-center text-sm text-red-300">{error}</p>
          ) : proformaList.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/40">Nessuna proforma.</p>
          ) : (
            <ul className="space-y-1">
              {proformaList.map((pf) => (
                <li key={pf.id}>
                  <button
                    type="button"
                    onClick={() => selectProforma(pf)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                      selected?.id === pf.id
                        ? "bg-[#0a84ff]/20 ring-1 ring-[#0a84ff]/60"
                        : "hover:bg-white/8"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{pf.numero_proforma}</p>
                      <p className="text-sm font-bold text-[#0a84ff]">{currency(pf.importo_totale)}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-white/55 truncate">{pf.nome_commessa || "—"}</p>
                    {pf.data_creazione ? (
                      <p className="mt-0.5 text-xs text-white/40">{pf.data_creazione}</p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* COLONNA DESTRA — dettaglio */}
      <div className="flex-1">
        {!selected ? (
          <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-10 text-center">
            <p className="text-sm text-white/50">Seleziona una proforma dalla lista per vedere i dettagli.</p>
          </section>
        ) : (
          <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-white/45">Proforma</p>
                <h2 className="text-2xl font-bold text-white">{selected.numero_proforma}</h2>
                {selected.importo_totale ? (
                  <p className="mt-1 text-xl font-semibold text-[#0a84ff]">{currency(selected.importo_totale)}</p>
                ) : null}

                {/* COMMESA COLLEGATA */}
                {commessaData ? (
                  <div className="mt-3 rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                    <p className="text-xs text-white/50">Commessa collegata</p>
                    <p className="text-sm font-medium text-white">{commessaData.nome_commessa}</p>
                    <p className="text-xs text-white/40">Offerta: {commessaData.numero_offerta || "N/D"}</p>
                  </div>
                ) : selected.nome_commessa ? (
                  <p className="mt-1 text-sm text-white/70">{selected.nome_commessa}</p>
                ) : null}

                {selected.cliente ? (
                  <p className="mt-2 text-sm text-white/50">{selected.cliente}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                {selected.data_creazione ? (
                  <span className="rounded-md border border-[#48484a] bg-[#ff9f0a]/20 px-2 py-1 text-[#ff9f0a]">
                    Creata: {selected.data_creazione}
                  </span>
                ) : null}
                {selected.data_scadenza ? (
                  <span className="rounded-md border border-[#48484a] bg-[#ff453a]/20 px-2 py-1 text-[#ff453a]">
                    Scadenza: {selected.data_scadenza}
                  </span>
                ) : null}
              </div>
            </div>

            {loadingDetail ? (
              <p className="py-6 text-center text-sm text-white/50">Caricamento dettagli...</p>
            ) : (
              <div className="space-y-4">
                {/* RATE ASSOCIATE */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-white/80">Rate associate</h3>
                  {rateAssociate.length === 0 ? (
                    <p className="text-sm text-white/40">Nessuna rata associata.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {rateAssociate.map((rata, idx) => {
                        const perc = Number(rata.percentuale) || 0;
                        const importoCalcolato = baseCommessa > 0 ? (baseCommessa * perc) / 100 : 0;
                        return (
                          <li key={rata.id} className="flex items-center gap-3 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2 text-sm text-white/80">
                            <span className="w-16 font-medium text-white">Rata {idx + 1}</span>
                            <span className="flex-1 text-white/60">{perc.toFixed(2)}% → {currency(importoCalcolato)}</span>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${rata.pagato ? "bg-[#30d158]/20 text-[#30d158]" : "bg-[#ff453a]/20 text-[#ff453a]"}`}>
                              {rata.pagato ? "✓ Pagata" : "Non pagata"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* COSTI EXTRA ASSOCIATI */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-white/80">Costi extra associati</h3>
                  {costiExtraAssociati.length === 0 ? (
                    <p className="text-sm text-white/40">Nessun costo extra associato.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {costiExtraAssociati.map((costo) => (
                        <li key={costo.id} className="flex items-center gap-3 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2 text-sm text-white/80">
                          <span className="flex-1">{costo.description || costo.tipo_costo || "—"}</span>
                          <span className="font-medium text-white">{currency(costo.importo)}</span>
                          {costo.data_costo ? <span className="text-xs text-white/40">{costo.data_costo}</span> : null}
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${costo.pagato ? "bg-[#30d158]/20 text-[#30d158]" : "bg-[#ff453a]/20 text-[#ff453a]"}`}>
                            {costo.pagato ? "✓ Pagato" : "Non pagato"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
