import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function CommessePage() {
  const navigate = useNavigate();
  const { studioId, loading: studioLoading } = useStudio();
  const permissions = usePermissions();
  const [commesse, setCommesse] = useState([]);
  const [pagamentiByCommessa, setPagamentiByCommessa] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    numero_offerta: "",
    nome_commessa: "",
    cliente: "",
    data_commessa: "",
    importo_offerta_base: "",
    note_amministrative: "",
    createProgetto: false,
  });
  const [serviceTemplates, setServiceTemplates] = useState([]);
  const [globalContacts, setGlobalContacts] = useState([]);
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [progettoModal, setProgettoModal] = useState(false);
  const [progettoForm, setProgettoForm] = useState({});
  const [progettoSaving, setProgettoSaving] = useState(false);
  const [progettoError, setProgettoError] = useState("");

  const loadData = async () => {
    if (!studioId) return;
    setLoading(true);
    setError("");
    const [commesseResult, pagamentiResult] = await Promise.all([
      supabase.from("commesse").select("*").eq("studio", studioId).order("created_at", { ascending: false }),
      supabase.from("pagamenti").select("commessa_id,importo"),
    ]);

    if (commesseResult.error) {
      setError(commesseResult.error.message);
      setCommesse([]);
      setLoading(false);
      return;
    }

    if (pagamentiResult.error) {
      setError(pagamentiResult.error.message);
      setCommesse(commesseResult.data ?? []);
      setLoading(false);
      return;
    }

    const grouped = (pagamentiResult.data ?? []).reduce((acc, pagamento) => {
      const key = pagamento.commessa_id;
      acc[key] = (acc[key] || 0) + (Number(pagamento.importo) || 0);
      return acc;
    }, {});

    setPagamentiByCommessa(grouped);
    setCommesse(commesseResult.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (studioId) loadData();
    const loadServices = async () => {
      const { data, error: templatesError } = await supabase
        .from("service_task_templates")
        .select("*")
        .order("order", { ascending: true });
      if (!templatesError) {
        setServiceTemplates(data ?? []);
      }
    };
    loadServices();

    const loadContacts = async () => {
      const { data } = await supabase.from("global_contacts").select("id,name").order("name", { ascending: true });
      setGlobalContacts(data ?? []);
    };
    loadContacts();
  }, [studioId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return commesse;
    }
    return commesse.filter((item) => {
      const nome = (item.nome_commessa ?? "").toLowerCase();
      const cliente = (item.cliente ?? "").toLowerCase();
      return nome.includes(q) || cliente.includes(q);
    });
  }, [commesse, search]);

  const handleClientChange = (value) => {
    setFormData((prev) => ({ ...prev, cliente: value }));
    const q = value.trim().toLowerCase();
    if (q.length >= 3) {
      setClientSuggestions(
        globalContacts.filter((c) => (c.name ?? "").toLowerCase().startsWith(q)).slice(0, 8),
      );
    } else {
      setClientSuggestions([]);
    }
  };

  const selectClientSuggestion = (name) => {
    setFormData((prev) => ({ ...prev, cliente: name }));
    setClientSuggestions([]);
  };

  const upsertContact = async (name) => {
    if (!name.trim()) return;
    const exists = globalContacts.some((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (!exists) {
      const { data } = await supabase.from("global_contacts").insert({ name: name.trim() }).select("id,name").single();
      if (data) setGlobalContacts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const openModal = () => {
    setFormError("");
    setFormData({
      numero_offerta: "",
      nome_commessa: "",
      cliente: "",
      data_commessa: "",
      importo_offerta_base: "",
      note_amministrative: "",
      createProgetto: false,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }
    setIsModalOpen(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFormError("");
    if (
      !formData.numero_offerta.trim() ||
      !formData.nome_commessa.trim() ||
      !formData.cliente.trim() ||
      !formData.importo_offerta_base
    ) {
      setFormError("Compila tutti i campi obbligatori.");
      return;
    }

    await upsertContact(formData.cliente);

    setSaving(true);
    const payload = {
      numero_offerta: formData.numero_offerta.trim(),
      nome_commessa: formData.nome_commessa.trim(),
      cliente: formData.cliente.trim(),
      data_commessa: formData.data_commessa || null,
      importo_offerta_base: Number(formData.importo_offerta_base),
      note_amministrative: formData.note_amministrative.trim() || null,
      studio: studioId,
    };

    const { data, error: insertError } = await supabase
      .from("commesse")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) {
      setFormError(insertError.message);
      setSaving(false);
      return;
    }

    const shouldCreateProgetto = formData.createProgetto;
    const prefillName = formData.nome_commessa.trim();
    const prefillClient = formData.cliente.trim();
    const prefillAddress = formData.note_amministrative.trim();

    setCommesse((prev) => [data, ...prev]);
    setIsModalOpen(false);
    setSaving(false);

    if (shouldCreateProgetto) {
      setProgettoForm({
        name: prefillName,
        client: prefillClient,
        address: prefillAddress,
        startDate: formData.data_commessa || "",
        selectedServices: [],
      });
      setProgettoError("");
      setProgettoModal(true);
    }
  };

  const handleSaveLinkedProgetto = async (event) => {
    event.preventDefault();
    setProgettoError("");
    if (!progettoForm.name.trim() || !progettoForm.client.trim()) {
      setProgettoError("Nome progetto e cliente sono obbligatori.");
      return;
    }
    setProgettoSaving(true);
    const payload = {
      name: progettoForm.name.trim(),
      client: progettoForm.client.trim(),
      address: progettoForm.address.trim() || null,
      start_date: progettoForm.startDate || null,
      status: "planning",
      total_hours: 0,
      servizi_selezionati: progettoForm.selectedServices,
      studio: studioId,
    };
    const { error: insertError } = await supabase.from("projects").insert(payload);
    if (insertError) {
      setProgettoError(insertError.message);
      setProgettoSaving(false);
      return;
    }
    setProgettoSaving(false);
    setProgettoModal(false);
  };

  const toggleProgettoService = (serviceName) => {
    setProgettoForm((prev) => {
      const has = prev.selectedServices.includes(serviceName);
      return {
        ...prev,
        selectedServices: has
          ? prev.selectedServices.filter((s) => s !== serviceName)
          : [...prev.selectedServices, serviceName],
      };
    });
  };

  if (studioLoading || !studioId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
      </div>
    );
  }

  if (!permissions.canViewCommesse) {
    return (
      <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
        Non hai i permessi per accedere a questa sezione.
      </section>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="w-full max-w-xl">
          <label className="mb-2 block text-sm text-white/80">Cerca commessa</label>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtra per nome o cliente..."
            className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
          />
        </div>
        <button
          type="button"
          onClick={openModal}
          className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
        >
          Nuova Commessa
        </button>
      </div>

      {loading ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
          Caricamento commesse...
        </section>
      ) : error ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-red-300">
          Errore: {error}
        </section>
      ) : filtered.length === 0 ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          Nessuna commessa trovata.
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filtered.map((commessa) => {
            const base = Number(commessa.importo_offerta_base) || 0;
            const pagato = pagamentiByCommessa[commessa.id] || 0;
            const residuo = Math.max(0, base - pagato);
            const extra = Number(commessa.costi_extra_totali) || 0;

            return (
              <button
                key={commessa.id}
                type="button"
                onClick={() => navigate(`/commesse/${commessa.id}`)}
                className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-5 text-left hover:border-[#0a84ff]"
              >
                <p className="text-xs text-white/45">{commessa.numero_offerta || "N/A"}</p>
                <h3 className="mt-1 text-lg font-bold text-white">{commessa.nome_commessa}</h3>
                <p className="mt-1 text-sm text-white/70">{commessa.cliente}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-md border border-[#48484a] bg-black px-2 py-1 text-white">
                    Importo Base: {currency(base)}
                  </span>
                  <span className="rounded-md border border-[#48484a] bg-[#30d158]/20 px-2 py-1 text-[#30d158]">
                    Pagato: {currency(pagato)}
                  </span>
                  <span
                    className={`rounded-md border border-[#48484a] px-2 py-1 ${
                      residuo > 0 ? "bg-[#ff453a]/20 text-[#ff453a]" : "bg-[#30d158]/20 text-[#30d158]"
                    }`}
                  >
                    Residuo: {currency(residuo)}
                  </span>
                  <span className="rounded-md border border-[#48484a] bg-[#ff9f0a]/20 px-2 py-1 text-[#ff9f0a]">
                    Costi Extra: {currency(extra)}
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
            <h3 className="text-xl font-semibold text-white">Nuova Commessa</h3>
            <form className="mt-5 space-y-4" onSubmit={handleSave}>
              {[
                ["numero_offerta", "Numero offerta *", "text"],
                ["nome_commessa", "Nome commessa *", "text"],
                ["data_commessa", "Data commessa", "date"],
                ["importo_offerta_base", "Importo offerta base *", "number"],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-medium text-white">{label}</label>
                  <input
                    type={type}
                    value={formData[key]}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                    className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                    required={label.includes("*")}
                  />
                </div>
              ))}
              <div className="relative">
                <label className="mb-1 block text-sm font-medium text-white">Cliente *</label>
                <input
                  type="text"
                  value={formData.cliente}
                  onChange={(e) => handleClientChange(e.target.value)}
                  onBlur={() => setTimeout(() => setClientSuggestions([]), 150)}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                  required
                  autoComplete="off"
                />
                {clientSuggestions.length > 0 ? (
                  <ul className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-[#48484a] bg-[#2c2c2e] shadow-xl">
                    {clientSuggestions.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onMouseDown={() => selectClientSuggestion(c.name)}
                          className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10"
                        >
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white">
                  Note amministrative
                </label>
                <textarea
                  rows={3}
                  value={formData.note_amministrative}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, note_amministrative: event.target.value }))
                  }
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#48484a] bg-[#1c1c1e] px-3 py-2.5 text-sm text-white/90 hover:border-[#0a84ff]">
                <input
                  type="checkbox"
                  checked={formData.createProgetto}
                  onChange={(e) => setFormData((prev) => ({ ...prev, createProgetto: e.target.checked }))}
                  className="h-4 w-4 accent-[#0a84ff]"
                />
                Crea progetto allegato alla commessa
              </label>

              {formError ? <p className="text-sm text-red-300">{formError}</p> : null}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
                >
                  {saving ? "Salvataggio..." : "Salva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {progettoModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Nuovo Progetto</h3>
                <p className="mt-0.5 text-xs text-white/50">Allegato alla commessa appena creata</p>
              </div>
              <button type="button" onClick={() => setProgettoModal(false)} className="text-white/50 hover:text-white">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleSaveLinkedProgetto}>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Nome progetto *</label>
                <input type="text" value={progettoForm.name ?? ""} onChange={(e) => setProgettoForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Cliente *</label>
                <input type="text" value={progettoForm.client ?? ""} onChange={(e) => setProgettoForm((p) => ({ ...p, client: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Indirizzo</label>
                <input type="text" value={progettoForm.address ?? ""} onChange={(e) => setProgettoForm((p) => ({ ...p, address: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Data inizio</label>
                <input type="date" value={progettoForm.startDate ?? ""} onChange={(e) => setProgettoForm((p) => ({ ...p, startDate: e.target.value }))} className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring" />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-white/80">Servizi</p>
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[#48484a] bg-[#1c1c1e] p-3">
                  {serviceTemplates.length === 0 ? (
                    <p className="text-sm text-white/50">Nessun servizio disponibile</p>
                  ) : (
                    serviceTemplates.map((svc) => {
                      const label = svc.service_name ?? "Servizio";
                      return (
                        <label key={svc.id ?? label} className="flex cursor-pointer items-center gap-2 text-sm text-white/90">
                          <input type="checkbox" checked={(progettoForm.selectedServices ?? []).includes(label)} onChange={() => toggleProgettoService(label)} className="h-4 w-4 accent-[#0a84ff]" />
                          <span>{label}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
              {progettoError ? <p className="text-sm text-red-300">{progettoError}</p> : null}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setProgettoModal(false)} disabled={progettoSaving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">Salta</button>
                <button type="submit" disabled={progettoSaving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{progettoSaving ? "Salvataggio..." : "Salva Progetto"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
