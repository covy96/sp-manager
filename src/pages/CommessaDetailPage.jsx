import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";


function currency(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export default function CommessaDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [commessa, setCommessa] = useState(null);
  const [pagamenti, setPagamenti] = useState([]);
  const [costiExtra, setCostiExtra] = useState([]);
  const [suddivisione, setSuddivisione] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalType, setModalType] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({});
  const [proforma, setProforma] = useState([]);
  const [proformaModal, setProformaModal] = useState(false);
  const [proformaForm, setProformaForm] = useState({});
  const [proformaSaving, setProformaSaving] = useState(false);
  const [proformaError, setProformaError] = useState("");
  const [proformaRateIds, setProformaRateIds] = useState([]);
  const [proformaCostiIds, setProformaCostiIds] = useState([]);
  const [rataModal, setRataModal] = useState(false);
  const [rataMode, setRataMode] = useState("percentuale");
  const [rataCount, setRataCount] = useState("2");
  const [rateRows, setRateRows] = useState([]);
  const [rataStep, setRataStep] = useState("config");
  const [rataSaving, setRataSaving] = useState(false);
  const [rataError, setRataError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    const [commessaResult, pagamentiResult, costiResult, suddivisioneResult, proformaResult] =
      await Promise.all([
        supabase.from("commesse").select("*").eq("id", id).maybeSingle(),
        supabase.from("pagamenti").select("*").eq("commessa_id", id).order("data_pagamento"),
        supabase.from("costi_extra").select("*").eq("commessa_id", id).order("data_costo"),
        supabase
          .from("suddivisione_pagamenti")
          .select("*")
          .eq("commessa_id", id)
          .order("created_at"),
        supabase
          .from("proforma")
          .select("*")
          .eq("commessa_id", id)
          .order("created_at", { ascending: false }),
      ]);

    if (commessaResult.error) {
      setError(commessaResult.error.message);
      setLoading(false);
      return;
    }
    if (pagamentiResult.error || costiResult.error || suddivisioneResult.error) {
      setError(
        pagamentiResult.error?.message ||
          costiResult.error?.message ||
          suddivisioneResult.error?.message ||
          "Errore caricamento",
      );
    }

    setCommessa(commessaResult.data ?? null);
    setPagamenti(pagamentiResult.data ?? []);
    setCostiExtra(costiResult.data ?? []);
    setSuddivisione(suddivisioneResult.data ?? []);
    setProforma(proformaResult.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const totPagato = useMemo(
    () => pagamenti.reduce((sum, item) => sum + (Number(item.importo) || 0), 0),
    [pagamenti],
  );
  const base = Number(commessa?.importo_offerta_base) || 0;
  const residuo = Math.max(0, base - totPagato);

  const openModal = (type) => {
    setModalType(type);
    setFormError("");
    if (type === "pagamento") {
      setFormData({
        data_pagamento: "",
        importo: "",
        tipo_pagamento: "normale",
        numero_nota: "",
        note: "",
      });
    }
    if (type === "costo") {
      setFormData({
        data_costo: "",
        tipo_costo: "diritti",
        description: "",
        importo: "",
      });
    }
  };

  const openProformaModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setProformaForm({
      numero_proforma: "",
      data_creazione: today,
      data_scadenza: "",
    });
    setProformaRateIds([]);
    setProformaCostiIds([]);
    setProformaError("");
    setProformaModal(true);
  };

  const handleSaveProforma = async (event) => {
    event.preventDefault();
    setProformaError("");
    if (!proformaForm.numero_proforma.trim()) {
      setProformaError("Numero proforma obbligatorio.");
      return;
    }
    setProformaSaving(true);
    const payload = {
      commessa_id: id,
      numero_proforma: proformaForm.numero_proforma.trim(),
      data_creazione: proformaForm.data_creazione || null,
      data_scadenza: proformaForm.data_scadenza || null,
    };
    const { data, error: insertError } = await supabase
      .from("proforma")
      .insert(payload)
      .select("*")
      .single();
    if (insertError) {
      console.error("Proforma insert error:", insertError);
      setProformaError(insertError.message);
      setProformaSaving(false);
      return;
    }
    setProforma((prev) => [data, ...prev]);
    setProformaSaving(false);
    setProformaModal(false);
  };

  const toggleProformaRata = (rataId) => {
    setProformaRateIds((prev) =>
      prev.includes(rataId) ? prev.filter((x) => x !== rataId) : [...prev, rataId],
    );
  };

  const toggleProformaCosto = (costoId) => {
    setProformaCostiIds((prev) =>
      prev.includes(costoId) ? prev.filter((x) => x !== costoId) : [...prev, costoId],
    );
  };

  const openRataModal = () => {
    setRataMode("percentuale");
    setRataCount("2");
    setRateRows([]);
    setRataStep("config");
    setRataError("");
    setRataModal(true);
  };

  const generateRows = () => {
    const n = Math.max(1, Math.min(50, parseInt(rataCount) || 1));
    if (rataMode === "percentuale") {
      const base = Math.floor(100 / n);
      const remainder = 100 - base * n;
      setRateRows(
        Array.from({ length: n }, (_, i) => ({
          key: i,
          valore: String(i === n - 1 ? base + remainder : base),
          label: `Rata ${i + 1}`,
        })),
      );
    } else {
      const baseVal = Number(commessa?.importo_offerta_base) || 0;
      const rata = baseVal > 0 ? Math.floor((baseVal / n) * 100) / 100 : 0;
      setRateRows(
        Array.from({ length: n }, (_, i) => ({
          key: i,
          valore: String(rata),
          label: `Rata ${i + 1}`,
        })),
      );
    }
    setRataStep("edit");
  };

  const updateRataRow = (idx, value) => {
    setRateRows((prev) => prev.map((r, i) => (i === idx ? { ...r, valore: value } : r)));
  };

  const rataTotal = rateRows.reduce((s, r) => s + (parseFloat(r.valore) || 0), 0);

  const saveRate = async () => {
    setRataError("");
    const baseVal = Number(commessa?.importo_offerta_base) || 0;
    if (rataMode === "percentuale" && rataTotal > 100.001) {
      setRataError(`Totale percentuale ${rataTotal.toFixed(2)}% supera il 100%.`);
      return;
    }
    if (rataMode === "importo" && baseVal > 0 && rataTotal > baseVal + 0.01) {
      setRataError(`Totale importi ${currency(rataTotal)} supera l'importo base ${currency(baseVal)}.`);
      return;
    }
    setRataSaving(true);
    const payload = rateRows.map((r) => {
      const val = parseFloat(r.valore) || 0;
      const perc = rataMode === "percentuale" ? val : (baseVal > 0 ? (val / baseVal) * 100 : 0);
      return { commessa_id: id, percentuale: perc };
    });
    const { data, error: insertError } = await supabase
      .from("suddivisione_pagamenti")
      .insert(payload)
      .select("*");
    if (insertError) {
      setRataError(insertError.message);
      setRataSaving(false);
      return;
    }
    setSuddivisione((prev) => [...prev, ...(data ?? [])]);
    setRataSaving(false);
    setRataModal(false);
  };

  const openEdit = () => {
    setEditForm({
      numero_offerta: commessa?.numero_offerta ?? "",
      nome_commessa: commessa?.nome_commessa ?? "",
      cliente: commessa?.cliente ?? "",
      data_commessa: commessa?.data_commessa ?? "",
      importo_offerta_base: commessa?.importo_offerta_base ?? "",
      note_amministrative: commessa?.note_amministrative ?? "",
    });
    setEditError("");
    setEditOpen(true);
    setMenuOpen(false);
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editForm.numero_offerta.trim() || !editForm.nome_commessa.trim() || !editForm.cliente.trim()) {
      setEditError("Numero offerta, nome commessa e cliente sono obbligatori.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    const payload = {
      numero_offerta: editForm.numero_offerta.trim(),
      nome_commessa: editForm.nome_commessa.trim(),
      cliente: editForm.cliente.trim(),
      data_commessa: editForm.data_commessa || null,
      importo_offerta_base: Number(editForm.importo_offerta_base) || 0,
      note_amministrative: editForm.note_amministrative.trim() || null,
    };
    const { error: updateError } = await supabase.from("commesse").update(payload).eq("id", id);
    if (updateError) {
      setEditError(updateError.message);
      setEditSaving(false);
      return;
    }
    setCommessa((prev) => (prev ? { ...prev, ...payload } : prev));
    setEditSaving(false);
    setEditOpen(false);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }
    setModalType("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);

    if (modalType === "pagamento") {
      const payload = {
        commessa_id: id,
        data_pagamento: formData.data_pagamento || null,
        importo: Number(formData.importo) || 0,
        tipo_pagamento: formData.tipo_pagamento,
        numero_nota: formData.numero_nota || null,
        note: formData.note || null,
      };
      const { data, error: insertError } = await supabase
        .from("pagamenti")
        .insert(payload)
        .select("*")
        .single();
      if (insertError) {
        setFormError(insertError.message);
        setSaving(false);
        return;
      }
      setPagamenti((prev) => [...prev, data]);
    }

    if (modalType === "costo") {
      const payload = {
        commessa_id: id,
        data_costo: formData.data_costo || null,
        tipo_costo: formData.tipo_costo,
        description: formData.description || null,
        importo: Number(formData.importo) || 0,
      };
      const { data, error: insertError } = await supabase
        .from("costi_extra")
        .insert(payload)
        .select("*")
        .single();
      if (insertError) {
        setFormError(insertError.message);
        setSaving(false);
        return;
      }
      setCostiExtra((prev) => [...prev, data]);
    }

    setSaving(false);
    setModalType("");
  };

  const toggleField = async (table, idField, row, field) => {
    const next = !row[field];
    const { error: updateError } = await supabase
      .from(table)
      .update({ [field]: next })
      .eq("id", row[idField]);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (table === "costi_extra") {
      setCostiExtra((prev) => prev.map((item) => (item.id === row.id ? { ...item, [field]: next } : item)));
    }
    if (table === "suddivisione_pagamenti") {
      setSuddivisione((prev) => prev.map((item) => (item.id === row.id ? { ...item, [field]: next } : item)));
    }
  };

  if (loading) {
    return <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">Caricamento commessa...</section>;
  }

  if (!commessa) {
    return <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">Commessa non trovata.</section>;
  }

  return (
    <div>
      <section className="mb-6 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-white/45">{commessa.numero_offerta || "N/A"}</p>
            <h2 className="text-2xl font-bold text-white">{commessa.nome_commessa}</h2>
            <p className="mt-1 text-sm text-white/70">{commessa.cliente}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/commesse")}
              className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:border-[#0a84ff] hover:bg-white/10"
            >
              Torna alle Commesse
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#48484a] text-lg text-white hover:border-[#0a84ff] hover:bg-white/10"
                aria-label="Opzioni commessa"
              >
                ···
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-30 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-[#48484a] bg-[#2c2c2e] shadow-xl">
                  <button
                    type="button"
                    onClick={openEdit}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10"
                  >
                    ✏️ Modifica
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-md border border-[#48484a] bg-black px-2 py-1 text-white">
            Base: {currency(base)}
          </span>
          <span className="rounded-md border border-[#48484a] bg-[#30d158]/20 px-2 py-1 text-[#30d158]">
            Pagato: {currency(totPagato)}
          </span>
          <span
            className={`rounded-md border border-[#48484a] px-2 py-1 ${
              residuo > 0 ? "bg-[#ff453a]/20 text-[#ff453a]" : "bg-[#30d158]/20 text-[#30d158]"
            }`}
          >
            Residuo: {currency(residuo)}
          </span>
          <span className="rounded-md border border-[#48484a] bg-[#ff9f0a]/20 px-2 py-1 text-[#ff9f0a]">
            Data: {commessa.data_commessa || "N/D"}
          </span>
        </div>
        {commessa.note_amministrative ? (
          <p className="mt-3 text-sm text-white/65">{commessa.note_amministrative}</p>
        ) : null}
      </section>

      {error ? <p className="mb-3 text-sm text-red-300">{error}</p> : null}

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!editSaving) setEditOpen(false); }}>
          <div className="w-full max-w-xl rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Modifica Commessa</h3>
              <button type="button" onClick={() => setEditOpen(false)} className="text-white/50 hover:text-white">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveEdit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Numero offerta *</label>
                <input type="text" value={editForm.numero_offerta} onChange={(e) => setEditForm((p) => ({ ...p, numero_offerta: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Nome commessa *</label>
                <input type="text" value={editForm.nome_commessa} onChange={(e) => setEditForm((p) => ({ ...p, nome_commessa: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Cliente *</label>
                <input type="text" value={editForm.cliente} onChange={(e) => setEditForm((p) => ({ ...p, cliente: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Data commessa</label>
                <input type="date" value={editForm.data_commessa} onChange={(e) => setEditForm((p) => ({ ...p, data_commessa: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Importo offerta base *</label>
                <input type="number" value={editForm.importo_offerta_base} onChange={(e) => setEditForm((p) => ({ ...p, importo_offerta_base: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Note amministrative</label>
                <textarea rows={3} value={editForm.note_amministrative} onChange={(e) => setEditForm((p) => ({ ...p, note_amministrative: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" />
              </div>
              {editError ? <p className="text-sm text-red-300">{editError}</p> : null}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setEditOpen(false)} disabled={editSaving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">Annulla</button>
                <button type="submit" disabled={editSaving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{editSaving ? "Salvataggio..." : "Salva"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* PROFORMA */}
      <section className="mb-4 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Proforma</h3>
          <button
            type="button"
            onClick={openProformaModal}
            className="rounded-lg bg-[#0a84ff] px-3 py-1.5 text-sm font-medium text-white hover:brightness-110"
          >
            Crea Proforma
          </button>
        </div>
        {proforma.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/40">Nessuna proforma creata.</p>
        ) : (
          <ul className="space-y-2">
            {proforma.map((pf) => (
              <li key={pf.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2.5 text-sm text-white/80">
                <span className="font-medium text-white">{pf.numero_proforma}</span>
                {pf.data_creazione ? <span className="text-xs text-white/50">Creata: {pf.data_creazione}</span> : null}
                {pf.data_scadenza ? <span className="text-xs text-white/50">Scadenza: {pf.data_scadenza}</span> : null}
                <span className="ml-auto text-xs text-white/40">
                  {(pf.rate_ids?.length ?? 0) > 0 ? `${pf.rate_ids.length} rat${pf.rate_ids.length === 1 ? "a" : "e"}` : ""}
                  {(pf.costi_ids?.length ?? 0) > 0 ? ` · ${pf.costi_ids.length} cost${pf.costi_ids.length === 1 ? "o" : "i"}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

        {/* COSTI EXTRA */}
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">Costi Extra</h3>
            <button
              type="button"
              onClick={() => openModal("costo")}
              className="rounded-lg bg-[#0a84ff] px-3 py-1.5 text-sm font-medium text-white hover:brightness-110"
            >
              + Aggiungi
            </button>
          </div>
          {costiExtra.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/40">Nessun costo extra registrato.</p>
          ) : (
            <ul className="space-y-2">
              {costiExtra.map((costo) => (
                <li key={costo.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2.5 text-sm text-white/80">
                  <span className="w-24 text-white/50">{costo.data_costo || "—"}</span>
                  <span className="font-medium text-white">{currency(costo.importo)}</span>
                  <span className="rounded-md border border-[#48484a] px-2 py-0.5 text-xs text-white/60">{costo.tipo_costo || "—"}</span>
                  {costo.description ? <span className="flex-1 text-xs text-white/50">{costo.description}</span> : null}
                  <button
                    type="button"
                    onClick={() => toggleField("costi_extra", "id", costo, "pagato")}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      costo.pagato ? "bg-[#30d158]/20 text-[#30d158]" : "bg-[#ff453a]/20 text-[#ff453a]"
                    }`}
                  >
                    {costo.pagato ? "✓ Pagato" : "Non pagato"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* SUDDIVISIONE PAGAMENTI */}
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Suddivisione Pagamenti</h3>
              {suddivisione.length > 0 ? (() => {
                const totPerc = suddivisione.reduce((s, r) => s + (Number(r.percentuale) || 0), 0);
                return <p className="mt-0.5 text-xs text-white/50">Totale: {totPerc.toFixed(2)}% → {currency((base * totPerc) / 100)}</p>;
              })() : null}
            </div>
            <button
              type="button"
              onClick={openRataModal}
              className="rounded-lg bg-[#0a84ff] px-3 py-1.5 text-sm font-medium text-white hover:brightness-110"
            >
              Genera Rate
            </button>
          </div>
          {suddivisione.length === 0 ? (
            <p className="py-4 text-center text-sm text-white/40">Nessuna rata configurata.</p>
          ) : (
            <ul className="space-y-2">
              {suddivisione.map((rata, idx) => {
                const perc = Number(rata.percentuale) || 0;
                const importoCalcolato = (base * perc) / 100;
                return (
                  <li key={rata.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2.5 text-sm text-white/80">
                    <span className="w-16 font-medium text-white">Rata {idx + 1}</span>
                    <span className="flex-1 text-white/60">{perc.toFixed(2)}% → {currency(importoCalcolato)}</span>
                    <button
                      type="button"
                      onClick={() => toggleField("suddivisione_pagamenti", "id", rata, "pagato")}
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        rata.pagato ? "bg-[#30d158]/20 text-[#30d158]" : "bg-[#ff453a]/20 text-[#ff453a]"
                      }`}
                    >
                      {rata.pagato ? "✓ Pagata" : "Non pagata"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

      </div>

      {proformaModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!proformaSaving) setProformaModal(false); }}>
          <div className="w-full max-w-xl rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Nuova Proforma</h3>
                <p className="mt-0.5 text-xs text-white/50">{commessa?.nome_commessa}</p>
              </div>
              <button type="button" onClick={() => setProformaModal(false)} className="text-white/50 hover:text-white">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveProforma}>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Numero proforma *</label>
                <input type="text" value={proformaForm.numero_proforma ?? ""} onChange={(e) => setProformaForm((p) => ({ ...p, numero_proforma: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/80">Data creazione</label>
                  <input type="date" value={proformaForm.data_creazione ?? ""} onChange={(e) => setProformaForm((p) => ({ ...p, data_creazione: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/80">Data scadenza</label>
                  <input type="date" value={proformaForm.data_scadenza ?? ""} onChange={(e) => setProformaForm((p) => ({ ...p, data_scadenza: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" />
                </div>
              </div>
              {suddivisione.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-white/80">Rate da associare</p>
                  <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                    {suddivisione.map((rata, idx) => {
                      const perc = Number(rata.percentuale) || 0;
                      const imp = (base * perc) / 100;
                      return (
                        <label key={rata.id} className="flex cursor-pointer items-center gap-2 text-sm text-white/80 hover:text-white">
                          <input type="checkbox" checked={proformaRateIds.includes(rata.id)} onChange={() => toggleProformaRata(rata.id)} className="h-4 w-4 accent-[#0a84ff]" />
                          <span>Rata {idx + 1} — {perc.toFixed(2)}% → {currency(imp)}</span>
                          {rata.pagato ? <span className="ml-auto text-xs text-[#30d158]">✓ Pagata</span> : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {costiExtra.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-white/80">Costi extra da associare</p>
                  <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                    {costiExtra.map((costo) => (
                      <label key={costo.id} className="flex cursor-pointer items-center gap-2 text-sm text-white/80 hover:text-white">
                        <input type="checkbox" checked={proformaCostiIds.includes(costo.id)} onChange={() => toggleProformaCosto(costo.id)} className="h-4 w-4 accent-[#0a84ff]" />
                        <span>{costo.description || costo.tipo_costo} — {currency(costo.importo)}</span>
                        {costo.pagato ? <span className="ml-auto text-xs text-[#30d158]">✓ Pagato</span> : null}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              {proformaError ? <p className="text-sm text-red-300">{proformaError}</p> : null}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setProformaModal(false)} disabled={proformaSaving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">Annulla</button>
                <button type="submit" disabled={proformaSaving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{proformaSaving ? "Salvataggio..." : "Crea Proforma"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalType ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                {modalType === "pagamento" ? "Aggiungi Pagamento" : "Aggiungi Costo Extra"}
              </h3>
              <button type="button" onClick={closeModal} className="text-white/50 hover:text-white">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleSave}>
              {modalType === "pagamento" ? (
                <>
                  <div><label className="mb-1 block text-sm font-medium text-white/80">Data pagamento</label><input className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" type="date" value={formData.data_pagamento} onChange={(e) => setFormData((p) => ({ ...p, data_pagamento: e.target.value }))} /></div>
                  <div><label className="mb-1 block text-sm font-medium text-white/80">Importo *</label><input className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" type="number" placeholder="0" value={formData.importo} onChange={(e) => setFormData((p) => ({ ...p, importo: e.target.value }))} required /></div>
                  <div><label className="mb-1 block text-sm font-medium text-white/80">Tipo</label><select className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none" value={formData.tipo_pagamento} onChange={(e) => setFormData((p) => ({ ...p, tipo_pagamento: e.target.value }))}><option value="normale">Normale</option><option value="diritti">Diritti</option><option value="marca_bollo">Marca bollo</option><option value="altro">Altro</option></select></div>
                  <div><label className="mb-1 block text-sm font-medium text-white/80">Numero nota</label><input className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" type="text" placeholder="N/A" value={formData.numero_nota} onChange={(e) => setFormData((p) => ({ ...p, numero_nota: e.target.value }))} /></div>
                  <div><label className="mb-1 block text-sm font-medium text-white/80">Note</label><textarea className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" rows={3} value={formData.note} onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))} /></div>
                </>
              ) : null}
              {modalType === "costo" ? (
                <>
                  <div><label className="mb-1 block text-sm font-medium text-white/80">Data costo</label><input className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" type="date" value={formData.data_costo} onChange={(e) => setFormData((p) => ({ ...p, data_costo: e.target.value }))} /></div>
                  <div><label className="mb-1 block text-sm font-medium text-white/80">Tipo</label><select className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none" value={formData.tipo_costo} onChange={(e) => setFormData((p) => ({ ...p, tipo_costo: e.target.value }))}><option value="diritti">Diritti</option><option value="marca_bollo">Marca bollo</option><option value="altro">Altro</option></select></div>
                  <div><label className="mb-1 block text-sm font-medium text-white/80">Descrizione</label><input className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" type="text" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} /></div>
                  <div><label className="mb-1 block text-sm font-medium text-white/80">Importo *</label><input className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" type="number" placeholder="0" value={formData.importo} onChange={(e) => setFormData((p) => ({ ...p, importo: e.target.value }))} required /></div>
                </>
              ) : null}
              {formError ? <p className="text-sm text-red-300">{formError}</p> : null}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10">Annulla</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{saving ? "Salvataggio..." : "Salva"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {rataModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Genera Rate</h3>
                <p className="mt-0.5 text-xs text-white/50">Importo base: {currency(base)}</p>
              </div>
              <button type="button" onClick={() => setRataModal(false)} className="text-white/50 hover:text-white">✕</button>
            </div>

            {rataStep === "config" ? (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-sm font-medium text-white/80">Modalità</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setRataMode("percentuale")}
                      className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
                        rataMode === "percentuale"
                          ? "border-[#0a84ff] bg-[#0a84ff]/20 text-[#0a84ff]"
                          : "border-[#48484a] text-white/70 hover:border-[#0a84ff] hover:text-white"
                      }`}
                    >
                      % Percentuale
                    </button>
                    <button
                      type="button"
                      onClick={() => setRataMode("importo")}
                      className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition ${
                        rataMode === "importo"
                          ? "border-[#0a84ff] bg-[#0a84ff]/20 text-[#0a84ff]"
                          : "border-[#48484a] text-white/70 hover:border-[#0a84ff] hover:text-white"
                      }`}
                    >
                      € Importo fisso
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-white/80">Numero di rate</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={rataCount}
                    onChange={(e) => setRataCount(e.target.value)}
                    className="w-32 rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setRataModal(false)} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10">Annulla</button>
                  <button type="button" onClick={generateRows} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110">Continua →</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {rateRows.map((r, idx) => (
                    <div key={r.key} className="flex items-center gap-3 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-4 py-3">
                      <span className="w-20 text-sm font-medium text-white">{r.label}</span>
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="number"
                          value={r.valore}
                          onChange={(e) => updateRataRow(idx, e.target.value)}
                          className="w-32 rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-1.5 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                        />
                        <span className="text-sm text-white/50">{rataMode === "percentuale" ? "%" : "€"}</span>
                        {rataMode === "percentuale" ? (
                          <span className="text-sm text-white/40">→ {currency((base * (parseFloat(r.valore) || 0)) / 100)}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  (rataMode === "percentuale" && rataTotal > 100.001) ||
                  (rataMode === "importo" && base > 0 && rataTotal > base + 0.01)
                    ? "border-[#ff453a]/40 bg-[#ff453a]/10 text-[#ff453a]"
                    : "border-[#30d158]/30 bg-[#30d158]/10 text-[#30d158]"
                }`}>
                  Totale: {rataMode === "percentuale" ? `${rataTotal.toFixed(2)}%` : currency(rataTotal)}
                  {rataMode === "percentuale" && base > 0 ? ` → ${currency((base * rataTotal) / 100)}` : ""}
                </div>

                {rataError ? <p className="text-sm text-red-300">{rataError}</p> : null}
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setRataStep("config")} disabled={rataSaving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">← Indietro</button>
                  <button type="button" onClick={saveRate} disabled={rataSaving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{rataSaving ? "Salvataggio..." : "Salva Rate"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
