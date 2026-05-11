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
  const [rateGiaUsate, setRateGiaUsate] = useState(new Set());
  const [costiGiaUsati, setCostiGiaUsati] = useState(new Set());
  const [rataModal, setRataModal] = useState(false);
  const [rataMode, setRataMode] = useState("percentuale");
  const [rataCount, setRataCount] = useState("2");
  const [rateRows, setRateRows] = useState([]);
  const [rataStep, setRataStep] = useState("config");
  const [rataSaving, setRataSaving] = useState(false);
  const [rataError, setRataError] = useState("");
  const [pagamentoProformaModal, setPagamentoProformaModal] = useState(false);
  const [pagamentoProformaData, setPagamentoProformaData] = useState({ numero_fattura: "", data_pagamento: "" });
  const [pagamentoProformaSaving, setPagamentoProformaSaving] = useState(false);
  const [selectedProforma, setSelectedProforma] = useState(null);
  const [rimuoviPagamentoModal, setRimuoviPagamentoModal] = useState(false);
  const [rimuoviPagamentoSaving, setRimuoviPagamentoSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [valoriCommessa, setValoriCommessa] = useState({
    importoBase: 0,
    pagato: 0,
    residuo: 0,
    costiExtra: 0,
  });

  const ricalcolaValori = async (commessaData) => {
    const commessaId = commessaData?.id || id;
    const importoBase = Number(commessaData?.importo_offerta_base) || 0;

    const { data: tutteProforma } = await supabase
      .from("proforma")
      .select("*")
      .eq("commessa_id", commessaId);

    const proformePagate = tutteProforma?.filter((p) => p.pagato) || [];
    let totalePagato = 0;

    for (const pf of proformePagate) {
      if (pf.suddivisione_pagamento_ids?.length > 0) {
        const { data: rate } = await supabase
          .from("suddivisione_pagamenti")
          .select("percentuale, importo_fisso")
          .in("id", pf.suddivisione_pagamento_ids);

        const importoRate = rate?.reduce((sum, r) => {
          return sum + (r.importo_fisso || (importoBase * (Number(r.percentuale) || 0)) / 100);
        }, 0) || 0;

        totalePagato += importoRate;
      }
    }

    const residuo = Math.max(0, importoBase - totalePagato);

    const { data: costiExtraList } = await supabase
      .from("costi_extra")
      .select("importo")
      .eq("commessa_id", commessaId);

    const totaleCostiExtra = costiExtraList?.reduce((sum, c) => sum + (Number(c.importo) || 0), 0) || 0;

    await supabase.from("commesse").update({ importo_incassato: totalePagato }).eq("id", commessaId);

    setValoriCommessa({
      importoBase: importoBase,
      pagato: totalePagato,
      residuo: residuo,
      costiExtra: totaleCostiExtra,
    });
  };

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
          .eq("pagato", false)
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

    const commessaData = commessaResult.data ?? null;
    setCommessa(commessaData);
    setPagamenti(pagamentiResult.data ?? []);
    setCostiExtra(costiResult.data ?? []);
    setSuddivisione(suddivisioneResult.data ?? []);
    setProforma(proformaResult.data ?? []);

    if (commessaData) {
      await ricalcolaValori(commessaData);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const base = valoriCommessa.importoBase;
  const totPagato = valoriCommessa.pagato;
  const residuo = valoriCommessa.residuo;

  const totalePercentualeEsistente = useMemo(
    () => suddivisione.reduce((s, r) => s + (Number(r.percentuale) || 0), 0),
    [suddivisione],
  );
  const rimanentePercentuale = Math.max(0, 100 - totalePercentualeEsistente);
  const rateComplete = totalePercentualeEsistente >= 99.99;

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

  const openProformaModal = async () => {
    const today = new Date().toISOString().slice(0, 10);
    setProformaForm({
      numero_proforma: "",
      data_creazione: today,
      data_scadenza: "",
    });
    setProformaRateIds([]);
    setProformaCostiIds([]);
    setProformaError("");

    const { data: proformeEsistenti } = await supabase
      .from("proforma")
      .select("suddivisione_pagamento_ids, costo_extra_ids")
      .eq("commessa_id", id);

    const rateUsate = new Set(
      proformeEsistenti?.flatMap((p) => p.suddivisione_pagamento_ids || []) || []
    );
    const costiUsati = new Set(
      proformeEsistenti?.flatMap((p) => p.costo_extra_ids || []) || []
    );
    setRateGiaUsate(rateUsate);
    setCostiGiaUsati(costiUsati);

    setProformaModal(true);
  };

  const calcolaImportoTotaleProforma = () => {
    const importoRate = proformaRateIds.reduce((sum, rataId) => {
      const rata = suddivisione.find((s) => s.id === rataId);
      if (!rata) return sum;
      const importoRata = rata.importo_fisso || (base * (Number(rata.percentuale) || 0)) / 100;
      return sum + importoRata;
    }, 0);

    const importoCostiExtra = proformaCostiIds.reduce((sum, costoId) => {
      const costo = costiExtra.find((c) => c.id === costoId);
      return sum + (costo?.importo || 0);
    }, 0);

    return importoRate + importoCostiExtra;
  };

  const handleSaveProforma = async (event) => {
    event.preventDefault();
    setProformaError("");
    if (!proformaForm.numero_proforma.trim()) {
      setProformaError("Numero proforma obbligatorio.");
      return;
    }
    setProformaSaving(true);

    const importoTotaleCalcolato = calcolaImportoTotaleProforma();

    const payload = {
      commessa_id: id,
      numero_proforma: proformaForm.numero_proforma.trim(),
      data_creazione: proformaForm.data_creazione || null,
      data_scadenza: proformaForm.data_scadenza || null,
      suddivisione_pagamento_ids: proformaRateIds,
      costo_extra_ids: proformaCostiIds,
      importo_totale: importoTotaleCalcolato,
      pagato: false,
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
    await ricalcolaValori(commessa);
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

  const openPagamentoProformaModal = (pf) => {
    setSelectedProforma(pf);
    if (pf.pagato) {
      setRimuoviPagamentoModal(true);
      return;
    }
    setPagamentoProformaData({ numero_fattura: "", data_pagamento: new Date().toISOString().slice(0, 10) });
    setPagamentoProformaModal(true);
  };

  const calcolaIncassatoDaProforme = async (commessaId, importoBase) => {
    const { data: proformePagate } = await supabase
      .from("proforma")
      .select("suddivisione_pagamento_ids")
      .eq("commessa_id", commessaId)
      .eq("pagato", true);

    let totaleIncassato = 0;
    for (const pf of proformePagate || []) {
      if (pf.suddivisione_pagamento_ids?.length > 0) {
        const { data: rate } = await supabase
          .from("suddivisione_pagamenti")
          .select("percentuale")
          .in("id", pf.suddivisione_pagamento_ids);
        const sommaPercentuale = (rate || []).reduce((sum, r) => sum + (Number(r.percentuale) || 0), 0);
        totaleIncassato += (importoBase * sommaPercentuale) / 100;
      }
    }
    return totaleIncassato;
  };

  const handleSavePagamentoProforma = async () => {
    if (!selectedProforma) return;
    setPagamentoProformaSaving(true);

    const { error: updateError } = await supabase
      .from("proforma")
      .update({
        pagato: true,
        numero_fattura: pagamentoProformaData.numero_fattura || null,
        data_pagamento: pagamentoProformaData.data_pagamento || null,
      })
      .eq("id", selectedProforma.id);

    if (updateError) {
      setError(updateError.message);
      setPagamentoProformaSaving(false);
      return;
    }

    const dataPagamento = pagamentoProformaData.data_pagamento || new Date().toISOString().slice(0, 10);

    if (selectedProforma.suddivisione_pagamento_ids?.length > 0) {
      await supabase
        .from("suddivisione_pagamenti")
        .update({ pagato: true, data_pagamento: dataPagamento })
        .in("id", selectedProforma.suddivisione_pagamento_ids);
    }

    if (selectedProforma.costo_extra_ids?.length > 0) {
      await supabase.from("costi_extra").update({ pagato: true }).in("id", selectedProforma.costo_extra_ids);
    }

    const { data: commessaData } = await supabase.from("commesse").select("importo_offerta_base").eq("id", id).maybeSingle();
    const baseVal = Number(commessaData?.importo_offerta_base) || 0;

    const nuovoIncassato = await calcolaIncassatoDaProforme(id, baseVal);

    await supabase.from("commesse").update({ importo_incassato: nuovoIncassato }).eq("id", id);

    setProforma((prev) => prev.filter((p) => p.id !== selectedProforma.id));
    setCommessa((prev) => (prev ? { ...prev, importo_incassato: nuovoIncassato } : prev));

    const suddivisioneRes = await supabase.from("suddivisione_pagamenti").select("*").eq("commessa_id", id);
    setSuddivisione(suddivisioneRes.data ?? []);
    const costiRes = await supabase.from("costi_extra").select("*").eq("commessa_id", id);
    setCostiExtra(costiRes.data ?? []);

    await ricalcolaValori(commessa);

    setPagamentoProformaSaving(false);
    setPagamentoProformaModal(false);
    setSelectedProforma(null);
  };

  const handleRimuoviPagamento = async () => {
    if (!selectedProforma) return;
    setRimuoviPagamentoSaving(true);

    const { error: updateError } = await supabase
      .from("proforma")
      .update({
        pagato: false,
        numero_fattura: null,
        data_pagamento: null,
      })
      .eq("id", selectedProforma.id);

    if (updateError) {
      setError(updateError.message);
      setRimuoviPagamentoSaving(false);
      return;
    }

    if (selectedProforma.suddivisione_pagamento_ids?.length > 0) {
      await supabase
        .from("suddivisione_pagamenti")
        .update({ pagato: false, data_pagamento: null })
        .in("id", selectedProforma.suddivisione_pagamento_ids);
    }

    if (selectedProforma.costo_extra_ids?.length > 0) {
      await supabase.from("costi_extra").update({ pagato: false }).in("id", selectedProforma.costo_extra_ids);
    }

    const { data: commessaData } = await supabase.from("commesse").select("importo_offerta_base").eq("id", id).maybeSingle();
    const baseVal = Number(commessaData?.importo_offerta_base) || 0;

    const nuovoIncassato = await calcolaIncassatoDaProforme(id, baseVal);

    await supabase.from("commesse").update({ importo_incassato: nuovoIncassato }).eq("id", id);

    setProforma((prev) => [{ ...selectedProforma, pagato: false, numero_fattura: null, data_pagamento: null }, ...prev]);
    setCommessa((prev) => (prev ? { ...prev, importo_incassato: nuovoIncassato } : prev));

    const suddivisioneRes = await supabase.from("suddivisione_pagamenti").select("*").eq("commessa_id", id);
    setSuddivisione(suddivisioneRes.data ?? []);
    const costiRes = await supabase.from("costi_extra").select("*").eq("commessa_id", id);
    setCostiExtra(costiRes.data ?? []);

    await ricalcolaValori(commessa);

    setRimuoviPagamentoSaving(false);
    setRimuoviPagamentoModal(false);
    setSelectedProforma(null);
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
  const rataTotalPercentuale = rataMode === "percentuale" ? rataTotal : (base > 0 ? (rataTotal / base) * 100 : 0);
  const sommaPercentualeConEsistenti = totalePercentualeEsistente + rataTotalPercentuale;
  const rataErrorLimite = sommaPercentualeConEsistenti > 100.001 ? `La somma delle rate supera il 100% dell'importo (attuale: ${totalePercentualeEsistente.toFixed(2)}% + nuove: ${rataTotalPercentuale.toFixed(2)}%)` : "";

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
    if (sommaPercentualeConEsistenti > 100.001) {
      setRataError(rataErrorLimite);
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
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-xl border border-[#48484a] bg-black px-5 py-4 min-w-[140px]">
            <p className="text-[13px] text-white/60">Base</p>
            <p className="text-2xl font-bold text-white">{currency(base)}</p>
          </div>
          <div className="rounded-xl border border-[#48484a] bg-[#30d158]/20 px-5 py-4 min-w-[140px]">
            <p className="text-[13px] text-[#30d158]/80">Pagato</p>
            <p className="text-2xl font-bold text-[#30d158]">{currency(totPagato)}</p>
          </div>
          <div className={`rounded-xl border border-[#48484a] px-5 py-4 min-w-[140px] ${residuo > 0 ? "bg-[#ff453a]/20" : "bg-[#30d158]/20"}`}>
            <p className={`text-[13px] ${residuo > 0 ? "text-[#ff453a]/80" : "text-[#30d158]/80"}`}>Residuo</p>
            <p className={`text-2xl font-bold ${residuo > 0 ? "text-[#ff453a]" : "text-[#30d158]"}`}>{currency(residuo)}</p>
          </div>
          <div className="rounded-xl border border-[#48484a] bg-[#ff9f0a]/20 px-5 py-4 min-w-[140px]">
            <p className="text-[13px] text-[#ff9f0a]/80">Costi Extra</p>
            <p className="text-2xl font-bold text-[#ff9f0a]">{currency(valoriCommessa.costiExtra)}</p>
          </div>
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
                <input
                  type="checkbox"
                  checked={pf.pagato}
                  onChange={() => openPagamentoProformaModal(pf)}
                  className="h-4 w-4 accent-[#0a84ff] cursor-pointer"
                  title="Marca come pagata"
                />
                <span className="font-medium text-white">{pf.numero_proforma}</span>
                <span className="text-sm font-semibold text-[#0a84ff]">{currency(pf.importo_totale)}</span>
                {pf.data_creazione ? <span className="text-xs text-white/50">Creata: {pf.data_creazione}</span> : null}
                {pf.data_scadenza ? <span className="text-xs text-white/50">Scadenza: {pf.data_scadenza}</span> : null}
                {pf.pagato ? <span className="ml-1 rounded-md bg-[#30d158]/20 px-2 py-0.5 text-xs text-[#30d158]">✓ Pagata</span> : null}
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
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    costo.pagato ? "bg-[#30d158]/20 text-[#30d158]" : "bg-[#ff453a]/20 text-[#ff453a]"
                  }`}>
                    {costo.pagato ? "✓ Pagato" : "Non pagato"}
                  </span>
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
              {suddivisione.length > 0 ? (
                <p className="mt-0.5 text-xs text-white/50">Totale: {totalePercentualeEsistente.toFixed(2)}% → {currency((base * totalePercentualeEsistente) / 100)}</p>
              ) : null}
              {rateComplete ? (
                <p className="mt-0.5 text-xs text-[#30d158]">Importo già suddiviso al 100%</p>
              ) : (
                <p className="mt-0.5 text-xs text-white/40">Rimanente: {rimanentePercentuale.toFixed(2)}%</p>
              )}
            </div>
            <button
              type="button"
              onClick={openRataModal}
              disabled={rateComplete}
              className="rounded-lg bg-[#0a84ff] px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      rata.pagato ? "bg-[#30d158]/20 text-[#30d158]" : "bg-[#ff453a]/20 text-[#ff453a]"
                    }`}>
                      {rata.pagato ? "✓ Pagata" : "Non pagata"}
                    </span>
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
                      const giaUsata = rateGiaUsate.has(rata.id);
                      return (
                        <label key={rata.id} className={`flex items-center gap-2 text-sm ${giaUsata ? "text-white/30 cursor-not-allowed" : "text-white/80 hover:text-white cursor-pointer"}`}>
                          <input
                            type="checkbox"
                            checked={proformaRateIds.includes(rata.id)}
                            onChange={() => !giaUsata && toggleProformaRata(rata.id)}
                            disabled={giaUsata}
                            className="h-4 w-4 accent-[#0a84ff] disabled:opacity-30"
                          />
                          <span className={giaUsata ? "line-through" : ""}>Rata {idx + 1} — {perc.toFixed(2)}% → {currency(imp)}</span>
                          {giaUsata ? <span className="ml-auto text-xs text-white/40">(già in proforma)</span> : null}
                          {!giaUsata && rata.pagato ? <span className="ml-auto text-xs text-[#30d158]">✓ Pagata</span> : null}
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
                    {costiExtra.map((costo) => {
                      const giaUsato = costiGiaUsati.has(costo.id);
                      return (
                        <label key={costo.id} className={`flex items-center gap-2 text-sm ${giaUsato ? "text-white/30 cursor-not-allowed" : "text-white/80 hover:text-white cursor-pointer"}`}>
                          <input
                            type="checkbox"
                            checked={proformaCostiIds.includes(costo.id)}
                            onChange={() => !giaUsato && toggleProformaCosto(costo.id)}
                            disabled={giaUsato}
                            className="h-4 w-4 accent-[#0a84ff] disabled:opacity-30"
                          />
                          <span className={giaUsato ? "line-through" : ""}>{costo.description || costo.tipo_costo} — {currency(costo.importo)}</span>
                          {giaUsato ? <span className="ml-auto text-xs text-white/40">(già in proforma)</span> : null}
                          {!giaUsato && costo.pagato ? <span className="ml-auto text-xs text-[#30d158]">✓ Pagato</span> : null}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {proformaError ? <p className="text-sm text-red-300">{proformaError}</p> : null}

              {/* IMPORTO TOTALE CALCOLATO */}
              <div className="rounded-lg border border-[#0a84ff]/30 bg-[#0a84ff]/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/80">Importo totale proforma:</span>
                  <span className="text-xl font-bold text-[#0a84ff]">{currency(calcolaImportoTotaleProforma())}</span>
                </div>
                <p className="mt-1 text-xs text-white/50">
                  {proformaRateIds.length > 0 ? `${proformaRateIds.length} rate selezionate` : "Nessuna rata"}
                  {proformaCostiIds.length > 0 ? ` · ${proformaCostiIds.length} costi extra` : ""}
                </p>
              </div>

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

      {pagamentoProformaModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!pagamentoProformaSaving) setPagamentoProformaModal(false); }}>
          <div className="w-full max-w-md rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Conferma Pagamento Proforma</h3>
              <button type="button" onClick={() => setPagamentoProformaModal(false)} className="text-white/50 hover:text-white">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Numero Fattura</label>
                <input type="text" value={pagamentoProformaData.numero_fattura} onChange={(e) => setPagamentoProformaData((p) => ({ ...p, numero_fattura: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" placeholder="es. 123/2024" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Data Ricevuta Pagamento</label>
                <input type="date" value={pagamentoProformaData.data_pagamento} onChange={(e) => setPagamentoProformaData((p) => ({ ...p, data_pagamento: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPagamentoProformaModal(false)} disabled={pagamentoProformaSaving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">Annulla</button>
                <button type="button" onClick={handleSavePagamentoProforma} disabled={pagamentoProformaSaving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{pagamentoProformaSaving ? "Salvataggio..." : "Conferma Pagamento"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {rimuoviPagamentoModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!rimuoviPagamentoSaving) setRimuoviPagamentoModal(false); }}>
          <div className="w-full max-w-md rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Rimuovi Pagamento</h3>
              <button type="button" onClick={() => setRimuoviPagamentoModal(false)} className="text-white/50 hover:text-white">✕</button>
            </div>
            <p className="mb-5 text-sm text-white/80">Sei sicuro di voler rimuovere il pagamento registrato? Verranno cancellati numero fattura e data pagamento.</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setRimuoviPagamentoModal(false)} disabled={rimuoviPagamentoSaving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">Annulla</button>
              <button type="button" onClick={handleRimuoviPagamento} disabled={rimuoviPagamentoSaving} className="rounded-lg bg-[#ff453a] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{rimuoviPagamentoSaving ? "Rimozione..." : "Rimuovi pagamento"}</button>
            </div>
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
                  (rataMode === "importo" && base > 0 && rataTotal > base + 0.01) ||
                  sommaPercentualeConEsistenti > 100.001
                    ? "border-[#ff453a]/40 bg-[#ff453a]/10 text-[#ff453a]"
                    : "border-[#30d158]/30 bg-[#30d158]/10 text-[#30d158]"
                }`}>
                  Totale: {rataMode === "percentuale" ? `${rataTotal.toFixed(2)}%` : currency(rataTotal)}
                  {rataMode === "percentuale" && base > 0 ? ` → ${currency((base * rataTotal) / 100)}` : ""}
                  {sommaPercentualeConEsistenti > 100.001 ? ` • Supera il 100% con esistenti!` : ""}
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
