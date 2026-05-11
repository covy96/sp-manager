import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
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
  const { studioId } = useStudio();
  const permissions = usePermissions();

  // Menu contestuale 3 puntini
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Popup modifica rata
  const [editRataModal, setEditRataModal] = useState(false);
  const [editRataData, setEditRataData] = useState(null);
  const [editRataForm, setEditRataForm] = useState({});
  const [editRataSaving, setEditRataSaving] = useState(false);

  // Popup modifica costo extra
  const [editCostoModal, setEditCostoModal] = useState(false);
  const [editCostoData, setEditCostoData] = useState(null);
  const [editCostoForm, setEditCostoForm] = useState({});
  const [editCostoSaving, setEditCostoSaving] = useState(false);

  // Popup modifica collaboratore
  const [editCollabModal, setEditCollabModal] = useState(false);
  const [editCollabData, setEditCollabData] = useState(null);
  const [editCollabForm, setEditCollabForm] = useState({});
  const [editCollabSaving, setEditCollabSaving] = useState(false);

  // Popup modifica proforma
  const [editProformaModal, setEditProformaModal] = useState(false);
  const [editProformaData, setEditProformaData] = useState(null);
  const [editProformaForm, setEditProformaForm] = useState({});
  const [editProformaSaving, setEditProformaSaving] = useState(false);

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
  const [proformaPerRata, setProformaPerRata] = useState({});
  const [proformaPerCosto, setProformaPerCosto] = useState({});
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
    costiCollaboratori: 0,
  });
  const [importoPagato, setImportoPagato] = useState(0);
  const [residuo, setResiduo] = useState(0);

  // Collaboratori esterni
  const [collaboratori, setCollaboratori] = useState([]);
  const [showCollaboratori, setShowCollaboratori] = useState(false);
  const [newCollaboratore, setNewCollaboratore] = useState({ ruolo: "", nome_cognome: "", importo: "" });
  const [savingCollaboratore, setSavingCollaboratore] = useState(false);

  const ricalcolaValori = async (importoBaseParam) => {
    const base = importoBaseParam ?? Number(commessa?.importo_offerta_base) ?? 0;

    const { data: tutteProforma, error } = await supabase
      .from("proforma")
      .select("*")
      .eq("commessa_id", id);

    console.log("Proforma trovate:", tutteProforma, "Errore:", error);

    const proformePagate = tutteProforma?.filter((p) => p.pagato) || [];

    let totalePagato = 0;
    for (const pf of proformePagate) {
      let importoCostiExtra = 0;
      if (pf.costo_extra_ids?.length > 0) {
        const { data: costi } = await supabase
          .from("costi_extra")
          .select("importo")
          .in("id", pf.costo_extra_ids);
        importoCostiExtra = costi?.reduce((sum, c) => sum + (c.importo || 0), 0) || 0;
      }
      totalePagato += (pf.importo_totale || 0) - importoCostiExtra;
    }

    console.log("Totale pagato calcolato:", totalePagato);

    await supabase.from("commesse").update({ importo_incassato: totalePagato }).eq("id", id);

    setImportoPagato(totalePagato);
    setResiduo(Math.max(0, base - totalePagato));

    setCommessa((prev) => (prev ? { ...prev, importo_incassato: totalePagato } : prev));

    const { data: costiExtraList } = await supabase
      .from("costi_extra")
      .select("importo")
      .eq("commessa_id", id);

    const totaleCostiExtra = costiExtraList?.reduce((sum, c) => sum + (Number(c.importo) || 0), 0) || 0;

    // Carica costi collaboratori
    const { data: collabList } = await supabase
      .from("collaboratori_esterni")
      .select("importo")
      .eq("commessa_id", id);

    const totaleCollaboratori = collabList?.reduce((sum, c) => sum + (Number(c.importo) || 0), 0) || 0;

    setValoriCommessa((prev) => ({
      ...prev,
      importoBase: base,
      pagato: totalePagato,
      residuo: Math.max(0, base - totalePagato),
      costiExtra: totaleCostiExtra,
      costiCollaboratori: totaleCollaboratori,
    }));
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    const [commessaResult, pagamentiResult, costiResult, suddivisioneResult, proformaResult, collaboratoriResult] =
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
        supabase
          .from("collaboratori_esterni")
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

    const commessaData = commessaResult.data ?? null;
    const proformaData = proformaResult.data ?? [];
    setCommessa(commessaData);
    setPagamenti(pagamentiResult.data ?? []);
    setCostiExtra(costiResult.data ?? []);
    setSuddivisione(suddivisioneResult.data ?? []);
    setProforma(proformaData);
    setCollaboratori(collaboratoriResult.data ?? []);

    // Crea mappe per lookup veloce proforma per rate e costi
    const mapRata = {};
    const mapCosto = {};
    for (const pf of proformaData) {
      for (const rataId of pf.suddivisione_pagamento_ids || []) {
        mapRata[rataId] = pf;
      }
      for (const costoId of pf.costo_extra_ids || []) {
        mapCosto[costoId] = pf;
      }
    }
    setProformaPerRata(mapRata);
    setProformaPerCosto(mapCosto);

    if (commessaData) {
      await ricalcolaValori(commessaData.importo_offerta_base);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const base = Number(commessa?.importo_offerta_base) || 0;
  const totPagato = importoPagato;
  const residuoVal = residuo;

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
      studio: studioId,
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
          .select("percentuale, importo_fisso")
          .in("id", pf.suddivisione_pagamento_ids);
        for (const r of rate || []) {
          totaleIncassato += r.importo_fisso || (importoBase * (Number(r.percentuale) || 0)) / 100;
        }
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

    // Ricarica proforma e ricrea mappe
    const { data: proformaData } = await supabase.from("proforma").select("*").eq("commessa_id", id);
    setProforma(proformaData ?? []);
    const mapRata = {};
    const mapCosto = {};
    for (const pf of proformaData || []) {
      for (const rataId of pf.suddivisione_pagamento_ids || []) {
        mapRata[rataId] = pf;
      }
      for (const costoId of pf.costo_extra_ids || []) {
        mapCosto[costoId] = pf;
      }
    }
    setProformaPerRata(mapRata);
    setProformaPerCosto(mapCosto);

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

    // Ricarica proforma e ricrea mappe
    const { data: proformaData } = await supabase.from("proforma").select("*").eq("commessa_id", id);
    setProforma(proformaData ?? []);
    const mapRata = {};
    const mapCosto = {};
    for (const pf of proformaData || []) {
      for (const rataId of pf.suddivisione_pagamento_ids || []) {
        mapRata[rataId] = pf;
      }
      for (const costoId of pf.costo_extra_ids || []) {
        mapCosto[costoId] = pf;
      }
    }
    setProformaPerRata(mapRata);
    setProformaPerCosto(mapCosto);

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
      return { commessa_id: id, percentuale: perc, studio: studioId };
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
        studio: studioId,
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
        studio: studioId,
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

  // Gestione collaboratori esterni
  const handleAddCollaboratore = async (e) => {
    e.preventDefault();
    if (!newCollaboratore.ruolo.trim() || !newCollaboratore.nome_cognome.trim() || !newCollaboratore.importo) {
      return;
    }
    setSavingCollaboratore(true);
    const payload = {
      commessa_id: id,
      studio: studioId,
      ruolo: newCollaboratore.ruolo.trim(),
      nome_cognome: newCollaboratore.nome_cognome.trim(),
      importo: Number(newCollaboratore.importo) || 0,
    };
    const { data, error: insertError } = await supabase
      .from("collaboratori_esterni")
      .insert(payload)
      .select("*")
      .single();
    if (insertError) {
      setError(insertError.message);
      setSavingCollaboratore(false);
      return;
    }
    setCollaboratori((prev) => [data, ...prev]);
    setNewCollaboratore({ ruolo: "", nome_cognome: "", importo: "" });
    // Aggiorna il totale collaboratori
    const nuovoTotale = [...collaboratori, data].reduce((sum, c) => sum + (Number(c.importo) || 0), 0);
    setValoriCommessa((prev) => ({ ...prev, costiCollaboratori: nuovoTotale }));
    setSavingCollaboratore(false);
  };

  const handleDeleteCollaboratore = async (collabId) => {
    if (!confirm("Sei sicuro di voler eliminare questo collaboratore?")) return;
    const { error: deleteError } = await supabase.from("collaboratori_esterni").delete().eq("id", collabId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    const updated = collaboratori.filter((c) => c.id !== collabId);
    setCollaboratori(updated);
    const nuovoTotale = updated.reduce((sum, c) => sum + (Number(c.importo) || 0), 0);
    setValoriCommessa((prev) => ({ ...prev, costiCollaboratori: nuovoTotale }));
  };

  // Controllo permessi
  const handleAzioneProtetta = (callback) => {
    if (!permissions.canViewFinancials) {
      alert("Non hai le autorizzazioni necessarie per questa operazione.");
      return;
    }
    callback();
  };

  // Chiudi menu su click esterno
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- EDIT/DELETE RATA ---
  const openEditRata = (rata) => {
    setEditRataData(rata);
    setEditRataForm({ percentuale: rata.percentuale ?? "" });
    setEditRataModal(true);
    setOpenMenuId(null);
  };

  const handleSaveRata = async (e) => {
    e.preventDefault();
    setEditRataSaving(true);
    const { error: updateError } = await supabase
      .from("suddivisione_pagamenti")
      .update({ percentuale: Number(editRataForm.percentuale) })
      .eq("id", editRataData.id);
    if (updateError) {
      setError(updateError.message);
      setEditRataSaving(false);
      return;
    }
    setSuddivisione((prev) =>
      prev.map((r) => (r.id === editRataData.id ? { ...r, percentuale: Number(editRataForm.percentuale) } : r))
    );
    setEditRataModal(false);
    setEditRataSaving(false);
  };

  const handleDeleteRata = async (rataId) => {
    if (!confirm("Sei sicuro di voler eliminare questa rata?")) return;
    const { error: deleteError } = await supabase.from("suddivisione_pagamenti").delete().eq("id", rataId);
    if (deleteError) { setError(deleteError.message); return; }
    setSuddivisione((prev) => prev.filter((r) => r.id !== rataId));
    setOpenMenuId(null);
  };

  // --- EDIT/DELETE COSTO EXTRA ---
  const openEditCosto = (costo) => {
    setEditCostoData(costo);
    setEditCostoForm({
      tipo_costo: costo.tipo_costo ?? "",
      description: costo.description ?? "",
      importo: costo.importo ?? "",
      data_costo: costo.data_costo ?? "",
    });
    setEditCostoModal(true);
    setOpenMenuId(null);
  };

  const handleSaveCosto = async (e) => {
    e.preventDefault();
    setEditCostoSaving(true);
    const payload = {
      tipo_costo: editCostoForm.tipo_costo,
      description: editCostoForm.description || null,
      importo: Number(editCostoForm.importo) || 0,
      data_costo: editCostoForm.data_costo || null,
    };
    const { error: updateError } = await supabase.from("costi_extra").update(payload).eq("id", editCostoData.id);
    if (updateError) {
      setError(updateError.message);
      setEditCostoSaving(false);
      return;
    }
    setCostiExtra((prev) => prev.map((c) => (c.id === editCostoData.id ? { ...c, ...payload } : c)));
    setEditCostoModal(false);
    setEditCostoSaving(false);
    await ricalcolaValori(commessa?.importo_offerta_base);
  };

  const handleDeleteCosto = async (costoId) => {
    if (!confirm("Sei sicuro di voler eliminare questo costo extra?")) return;
    const { error: deleteError } = await supabase.from("costi_extra").delete().eq("id", costoId);
    if (deleteError) { setError(deleteError.message); return; }
    setCostiExtra((prev) => prev.filter((c) => c.id !== costoId));
    setOpenMenuId(null);
    await ricalcolaValori(commessa?.importo_offerta_base);
  };

  // --- EDIT/DELETE COLLABORATORE ---
  const openEditCollab = (collab) => {
    setEditCollabData(collab);
    setEditCollabForm({
      ruolo: collab.ruolo ?? "",
      nome_cognome: collab.nome_cognome ?? "",
      importo: collab.importo ?? "",
    });
    setEditCollabModal(true);
    setOpenMenuId(null);
  };

  const handleSaveCollab = async (e) => {
    e.preventDefault();
    setEditCollabSaving(true);
    const payload = {
      ruolo: editCollabForm.ruolo.trim(),
      nome_cognome: editCollabForm.nome_cognome.trim(),
      importo: Number(editCollabForm.importo) || 0,
    };
    const { error: updateError } = await supabase.from("collaboratori_esterni").update(payload).eq("id", editCollabData.id);
    if (updateError) {
      setError(updateError.message);
      setEditCollabSaving(false);
      return;
    }
    const updated = collaboratori.map((c) => (c.id === editCollabData.id ? { ...c, ...payload } : c));
    setCollaboratori(updated);
    const nuovoTotale = updated.reduce((sum, c) => sum + (Number(c.importo) || 0), 0);
    setValoriCommessa((prev) => ({ ...prev, costiCollaboratori: nuovoTotale }));
    setEditCollabModal(false);
    setEditCollabSaving(false);
  };

  const handleDeleteCollaboratoreProtetto = async (collabId) => {
    if (!confirm("Sei sicuro di voler eliminare questo collaboratore?")) return;
    const { error: deleteError } = await supabase.from("collaboratori_esterni").delete().eq("id", collabId);
    if (deleteError) { setError(deleteError.message); return; }
    const updated = collaboratori.filter((c) => c.id !== collabId);
    setCollaboratori(updated);
    const nuovoTotale = updated.reduce((sum, c) => sum + (Number(c.importo) || 0), 0);
    setValoriCommessa((prev) => ({ ...prev, costiCollaboratori: nuovoTotale }));
    setOpenMenuId(null);
  };

  // --- EDIT/DELETE PROFORMA ---
  const openEditProforma = (pf) => {
    setEditProformaData(pf);
    setEditProformaForm({
      numero_proforma: pf.numero_proforma ?? "",
      data_creazione: pf.data_creazione ?? "",
      data_scadenza: pf.data_scadenza ?? "",
      importo_totale: pf.importo_totale ?? "",
    });
    setEditProformaModal(true);
    setOpenMenuId(null);
  };

  const handleSaveProformaEdit = async (e) => {
    e.preventDefault();
    setEditProformaSaving(true);
    const payload = {
      numero_proforma: editProformaForm.numero_proforma.trim(),
      data_creazione: editProformaForm.data_creazione || null,
      data_scadenza: editProformaForm.data_scadenza || null,
      importo_totale: Number(editProformaForm.importo_totale) || 0,
    };
    const { error: updateError } = await supabase.from("proforma").update(payload).eq("id", editProformaData.id);
    if (updateError) {
      setError(updateError.message);
      setEditProformaSaving(false);
      return;
    }
    setProforma((prev) => prev.map((p) => (p.id === editProformaData.id ? { ...p, ...payload } : p)));
    setEditProformaModal(false);
    setEditProformaSaving(false);
  };

  const handleDeleteProforma = async (pfId) => {
    if (!confirm("Sei sicuro di voler eliminare questa proforma?")) return;
    const { error: deleteError } = await supabase.from("proforma").delete().eq("id", pfId);
    if (deleteError) { setError(deleteError.message); return; }
    setProforma((prev) => prev.filter((p) => p.id !== pfId));
    setOpenMenuId(null);
    await ricalcolaValori(commessa?.importo_offerta_base);
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
          {valoriCommessa.costiCollaboratori > 0 && (
            <div className="rounded-xl border border-[#48484a] bg-[#bf5af2]/20 px-5 py-4 min-w-[140px]">
              <p className="text-[13px] text-[#bf5af2]/80">Collaboratori</p>
              <p className="text-2xl font-bold text-[#bf5af2]">{currency(valoriCommessa.costiCollaboratori)}</p>
            </div>
          )}
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
        {(() => {
          const proformeAperte = proforma.filter((p) => !p.pagato);
          const proformePagate = proforma.filter((p) => p.pagato);

          return (
            <div className="space-y-4">
              {/* Proforma aperte */}
              {proformeAperte.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-white/70">Proforma aperte</h4>
                  <ul className="space-y-2">
                    {proformeAperte.map((pf) => (
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
                        <span className="text-xs text-white/40">
                          {(pf.suddivisione_pagamento_ids?.length ?? 0) > 0 ? `${pf.suddivisione_pagamento_ids.length} rat${pf.suddivisione_pagamento_ids.length === 1 ? "a" : "e"}` : ""}
                          {(pf.costo_extra_ids?.length ?? 0) > 0 ? ` · ${pf.costo_extra_ids.length} cost${pf.costo_extra_ids.length === 1 ? "o" : "i"}` : ""}
                        </span>
                        <div className="relative ml-auto" ref={openMenuId === `pf-${pf.id}` ? menuRef : null}>
                          <button type="button" onClick={() => setOpenMenuId(openMenuId === `pf-${pf.id}` ? null : `pf-${pf.id}`)} className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white">⋯</button>
                          {openMenuId === `pf-${pf.id}` && (
                            <div className="absolute right-0 top-full z-30 mt-1 min-w-[130px] overflow-hidden rounded-xl border border-[#48484a] bg-[#2c2c2e] shadow-xl">
                              <button type="button" onClick={() => handleAzioneProtetta(() => openEditProforma(pf))} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10">✏️ Modifica</button>
                              <button type="button" onClick={() => handleAzioneProtetta(() => handleDeleteProforma(pf.id))} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#ff453a] hover:bg-[#ff453a]/10">🗑 Elimina</button>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Proforma pagate */}
              {proformePagate.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-white/70">Proforma pagate</h4>
                  <ul className="space-y-2">
                    {proformePagate.map((pf) => (
                      <li key={pf.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-[#48484a]/50 bg-[#1c1c1e]/50 px-3 py-2.5 text-sm text-white/60">
                        <input
                          type="checkbox"
                          checked={pf.pagato}
                          onChange={() => openPagamentoProformaModal(pf)}
                          className="h-4 w-4 accent-[#30d158] cursor-pointer"
                          title="Rimuovi pagamento"
                        />
                        <span className="font-medium text-white/70">{pf.numero_proforma}</span>
                        <span className="text-sm font-semibold text-[#0a84ff]/70">{currency(pf.importo_totale)}</span>
                        {pf.data_creazione ? <span className="text-xs text-white/40">Creata: {pf.data_creazione}</span> : null}
                        <span className="ml-1 rounded-md bg-[#30d158]/20 px-2 py-0.5 text-xs text-[#30d158]">✓ Pagata</span>
                        {pf.numero_fattura ? <span className="text-xs text-white/50">Fattura: {pf.numero_fattura}</span> : null}
                        {pf.data_pagamento ? <span className="text-xs text-white/50">Pagata il: {pf.data_pagamento}</span> : null}
                        <span className="ml-auto text-xs text-white/30">
                          {(pf.suddivisione_pagamento_ids?.length ?? 0) > 0 ? `${pf.suddivisione_pagamento_ids.length} rat${pf.suddivisione_pagamento_ids.length === 1 ? "a" : "e"}` : ""}
                          {(pf.costo_extra_ids?.length ?? 0) > 0 ? ` · ${pf.costo_extra_ids.length} cost${pf.costo_extra_ids.length === 1 ? "o" : "i"}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {proforma.length === 0 && (
                <p className="py-4 text-center text-sm text-white/40">Nessuna proforma creata.</p>
              )}
            </div>
          );
        })()}
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
                  {costo.description ? <span className="text-xs text-white/50">{costo.description}</span> : null}
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    costo.pagato ? "bg-[#30d158]/20 text-[#30d158]" : "bg-[#ff453a]/20 text-[#ff453a]"
                  }`}>
                    {costo.pagato ? "✓ Pagato" : "Non pagato"}
                  </span>
                  {costo.pagato && proformaPerCosto[costo.id] && (
                    <span className="text-xs text-white/50 ml-2">
                      {proformaPerCosto[costo.id].numero_proforma}
                      {proformaPerCosto[costo.id].data_pagamento &&
                        ` · ${new Date(proformaPerCosto[costo.id].data_pagamento).toLocaleDateString("it-IT")}`
                      }
                    </span>
                  )}
                  <div className="relative ml-auto" ref={openMenuId === `ce-${costo.id}` ? menuRef : null}>
                    <button type="button" onClick={() => setOpenMenuId(openMenuId === `ce-${costo.id}` ? null : `ce-${costo.id}`)} className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white">⋯</button>
                    {openMenuId === `ce-${costo.id}` && (
                      <div className="absolute right-0 top-full z-30 mt-1 min-w-[130px] overflow-hidden rounded-xl border border-[#48484a] bg-[#2c2c2e] shadow-xl">
                        <button type="button" onClick={() => handleAzioneProtetta(() => openEditCosto(costo))} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10">✏️ Modifica</button>
                        <button type="button" onClick={() => handleAzioneProtetta(() => handleDeleteCosto(costo.id))} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#ff453a] hover:bg-[#ff453a]/10">🗑 Elimina</button>
                      </div>
                    )}
                  </div>
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
                    {rata.pagato && proformaPerRata[rata.id] && (
                      <span className="text-xs text-white/50 ml-2">
                        {proformaPerRata[rata.id].numero_proforma}
                        {proformaPerRata[rata.id].data_pagamento &&
                          ` · ${new Date(proformaPerRata[rata.id].data_pagamento).toLocaleDateString("it-IT")}`
                        }
                      </span>
                    )}
                    {!rata.pagato && (
                      <div className="relative" ref={openMenuId === `rata-${rata.id}` ? menuRef : null}>
                        <button type="button" onClick={() => setOpenMenuId(openMenuId === `rata-${rata.id}` ? null : `rata-${rata.id}`)} className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white">⋯</button>
                        {openMenuId === `rata-${rata.id}` && (
                          <div className="absolute right-0 top-full z-30 mt-1 min-w-[130px] overflow-hidden rounded-xl border border-[#48484a] bg-[#2c2c2e] shadow-xl">
                            <button type="button" onClick={() => handleAzioneProtetta(() => openEditRata(rata))} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10">✏️ Modifica</button>
                            <button type="button" onClick={() => handleAzioneProtetta(() => handleDeleteRata(rata.id))} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#ff453a] hover:bg-[#ff453a]/10">🗑 Elimina</button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

      </div>

      {/* COLLABORATORI ESTERNI */}
      <section className="mt-4 rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4">
        <h3 className="mb-3 text-base font-semibold text-white">Collaboratori Esterni</h3>

        {/* Form aggiungi collaboratore */}
        <form onSubmit={handleAddCollaboratore} className="mb-4 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px]">
            <label className="mb-1 block text-xs font-medium text-white/70">Ruolo</label>
            <input
              type="text"
              placeholder="Es. Coordinatore Sicurezza"
              value={newCollaboratore.ruolo}
              onChange={(e) => setNewCollaboratore({ ...newCollaboratore, ruolo: e.target.value })}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="mb-1 block text-xs font-medium text-white/70">Nome Cognome</label>
            <input
              type="text"
              placeholder="Es. Mario Rossi"
              value={newCollaboratore.nome_cognome}
              onChange={(e) => setNewCollaboratore({ ...newCollaboratore, nome_cognome: e.target.value })}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]"
            />
          </div>
          <div className="w-32">
            <label className="mb-1 block text-xs font-medium text-white/70">Importo (€)</label>
            <input
              type="number"
              placeholder="0"
              value={newCollaboratore.importo}
              onChange={(e) => setNewCollaboratore({ ...newCollaboratore, importo: e.target.value })}
              className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]"
            />
          </div>
          <button
            type="submit"
            disabled={savingCollaboratore || !newCollaboratore.ruolo.trim() || !newCollaboratore.nome_cognome.trim() || !newCollaboratore.importo}
            className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            + Aggiungi
          </button>
        </form>

        {/* Toggle lista collaboratori */}
        <button
          type="button"
          onClick={() => setShowCollaboratori((v) => !v)}
          className="mb-2 flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          <span>{showCollaboratori ? "▼" : "▶"}</span>
          Visualizza Collaboratori ({collaboratori.length})
        </button>

        {/* Lista collaboratori */}
        {showCollaboratori && (
          <div className="mt-2">
            {collaboratori.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/40">Nessun collaboratore registrato.</p>
            ) : (
              <ul className="space-y-2">
                {collaboratori.map((collab) => (
                  <li key={collab.id} className="flex items-center gap-3 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2.5 text-sm text-white/80">
                    <div className="flex flex-1 flex-wrap items-center gap-3">
                      <span className="font-medium text-white">{collab.ruolo}</span>
                      <span className="text-white/70">{collab.nome_cognome}</span>
                      <span className="font-medium text-[#bf5af2]">{currency(collab.importo)}</span>
                    </div>
                    <div className="relative" ref={openMenuId === `col-${collab.id}` ? menuRef : null}>
                      <button type="button" onClick={() => setOpenMenuId(openMenuId === `col-${collab.id}` ? null : `col-${collab.id}`)} className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white">⋯</button>
                      {openMenuId === `col-${collab.id}` && (
                        <div className="absolute right-0 top-full z-30 mt-1 min-w-[130px] overflow-hidden rounded-xl border border-[#48484a] bg-[#2c2c2e] shadow-xl">
                          <button type="button" onClick={() => handleAzioneProtetta(() => openEditCollab(collab))} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-white/10">✏️ Modifica</button>
                          <button type="button" onClick={() => handleAzioneProtetta(() => handleDeleteCollaboratoreProtetto(collab.id))} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#ff453a] hover:bg-[#ff453a]/10">🗑 Elimina</button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

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
      {/* POPUP MODIFICA RATA */}
      {editRataModal && editRataData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!editRataSaving) setEditRataModal(false); }}>
          <div className="w-full max-w-sm rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Modifica Rata</h3>
              <button type="button" onClick={() => setEditRataModal(false)} className="text-white/50 hover:text-white">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveRata}>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Percentuale (%)</label>
                <input type="number" step="0.01" value={editRataForm.percentuale} onChange={(e) => setEditRataForm({ ...editRataForm, percentuale: e.target.value })} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Importo calcolato</label>
                <p className="rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2 text-sm text-white/60">{currency((base * (parseFloat(editRataForm.percentuale) || 0)) / 100)}</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditRataModal(false)} disabled={editRataSaving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">Annulla</button>
                <button type="submit" disabled={editRataSaving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{editRataSaving ? "Salvataggio..." : "Salva"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODIFICA COSTO EXTRA */}
      {editCostoModal && editCostoData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!editCostoSaving) setEditCostoModal(false); }}>
          <div className="w-full max-w-sm rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Modifica Costo Extra</h3>
              <button type="button" onClick={() => setEditCostoModal(false)} className="text-white/50 hover:text-white">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveCosto}>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Tipo costo</label>
                <input type="text" value={editCostoForm.tipo_costo} onChange={(e) => setEditCostoForm({ ...editCostoForm, tipo_costo: e.target.value })} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Descrizione</label>
                <input type="text" value={editCostoForm.description} onChange={(e) => setEditCostoForm({ ...editCostoForm, description: e.target.value })} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Importo (€)</label>
                <input type="number" step="0.01" value={editCostoForm.importo} onChange={(e) => setEditCostoForm({ ...editCostoForm, importo: e.target.value })} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Data costo</label>
                <input type="date" value={editCostoForm.data_costo} onChange={(e) => setEditCostoForm({ ...editCostoForm, data_costo: e.target.value })} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditCostoModal(false)} disabled={editCostoSaving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">Annulla</button>
                <button type="submit" disabled={editCostoSaving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{editCostoSaving ? "Salvataggio..." : "Salva"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODIFICA COLLABORATORE */}
      {editCollabModal && editCollabData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!editCollabSaving) setEditCollabModal(false); }}>
          <div className="w-full max-w-sm rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Modifica Collaboratore</h3>
              <button type="button" onClick={() => setEditCollabModal(false)} className="text-white/50 hover:text-white">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveCollab}>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Ruolo</label>
                <input type="text" value={editCollabForm.ruolo} onChange={(e) => setEditCollabForm({ ...editCollabForm, ruolo: e.target.value })} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Nome Cognome</label>
                <input type="text" value={editCollabForm.nome_cognome} onChange={(e) => setEditCollabForm({ ...editCollabForm, nome_cognome: e.target.value })} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Importo (€)</label>
                <input type="number" step="0.01" value={editCollabForm.importo} onChange={(e) => setEditCollabForm({ ...editCollabForm, importo: e.target.value })} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]" required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditCollabModal(false)} disabled={editCollabSaving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">Annulla</button>
                <button type="submit" disabled={editCollabSaving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{editCollabSaving ? "Salvataggio..." : "Salva"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODIFICA PROFORMA */}
      {editProformaModal && editProformaData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { if (!editProformaSaving) setEditProformaModal(false); }}>
          <div className="w-full max-w-sm rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Modifica Proforma</h3>
              <button type="button" onClick={() => setEditProformaModal(false)} className="text-white/50 hover:text-white">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveProformaEdit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Numero proforma</label>
                <input type="text" value={editProformaForm.numero_proforma} onChange={(e) => setEditProformaForm({ ...editProformaForm, numero_proforma: e.target.value })} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Data creazione</label>
                <input type="date" value={editProformaForm.data_creazione} onChange={(e) => setEditProformaForm({ ...editProformaForm, data_creazione: e.target.value })} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Data scadenza</label>
                <input type="date" value={editProformaForm.data_scadenza} onChange={(e) => setEditProformaForm({ ...editProformaForm, data_scadenza: e.target.value })} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Importo totale (€)</label>
                <input type="number" step="0.01" value={editProformaForm.importo_totale} onChange={(e) => setEditProformaForm({ ...editProformaForm, importo_totale: e.target.value })} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]" required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditProformaModal(false)} disabled={editProformaSaving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">Annulla</button>
                <button type="submit" disabled={editProformaSaving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{editProformaSaving ? "Salvataggio..." : "Salva"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
