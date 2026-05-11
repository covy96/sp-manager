import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";

// Plus icon
function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

// Trash icon
function TrashIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

// Edit icon
function EditIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

// Check icon
function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// X icon
function XIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function GestioneServiziPage() {
  usePageTitleOnMount("Gestione Servizi");
  const { studioId } = useStudio();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Add service modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");

  // Edit service state
  const [editingService, setEditingService] = useState(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!studioId) return;
    loadServices();
  }, [studioId]);

  const loadServices = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("service_task_templates")
      .select("*")
      .eq("studio", studioId)
      .order("order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setServices(data || []);
    }

    setLoading(false);
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    setSaving(true);
    setError("");

    const maxOrder = services.length > 0 ? Math.max(...services.map((s) => s.order || 0)) : 0;

    const { data, error: insertError } = await supabase
      .from("service_task_templates")
      .insert({
        service_name: newServiceName.trim(),
        order: maxOrder + 1,
        studio: studioId,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
    } else {
      setServices((prev) => [...prev, data].sort((a, b) => (a.order || 0) - (b.order || 0)));
      setAddModalOpen(false);
      setNewServiceName("");
    }

    setSaving(false);
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    if (!editingService || !editName.trim()) return;

    setSaving(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("service_task_templates")
      .update({ service_name: editName.trim() })
      .eq("id", editingService.id)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
    } else {
      setServices((prev) =>
        prev.map((s) => (s.id === editingService.id ? { ...s, service_name: data.service_name } : s))
      );
      setEditingService(null);
      setEditName("");
    }

    setSaving(false);
  };

  const handleDeleteService = async (serviceId) => {
    if (!confirm("Sei sicuro di voler eliminare questo servizio?")) return;

    const { error: deleteError } = await supabase.from("service_task_templates").delete().eq("id", serviceId);

    if (deleteError) {
      alert("Errore: " + deleteError.message);
    } else {
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
    }
  };

  const startEdit = (service) => {
    setEditingService(service);
    setEditName(service.service_name || "");
  };

  const cancelEdit = () => {
    setEditingService(null);
    setEditName("");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48484a] border-t-[#0a84ff]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Gestione Servizi</h2>
          <p className="text-sm text-white/60">Gestisci i servizi disponibili per i progetti</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
        >
          <PlusIcon className="h-4 w-4" />
          Nuovo Servizio
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {services.length === 0 ? (
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          <p>Nessun servizio configurato.</p>
          <button
            onClick={() => setAddModalOpen(true)}
            className="mt-4 rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Aggiungi il primo servizio
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((service, index) => (
            <div
              key={service.id}
              className="flex items-center justify-between rounded-lg border border-[#48484a] bg-[#2c2c2e] p-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-[#48484a] text-xs font-medium text-white/70">
                  {index + 1}
                </span>

                {editingService?.id === service.id ? (
                  <form onSubmit={handleUpdateService} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-md border border-[#48484a] bg-[#3a3a3c] px-2 py-1 text-sm text-white outline-none focus:border-[#0a84ff]"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-md bg-[#0a84ff] p-1 text-white hover:brightness-110 disabled:opacity-60"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-md border border-[#48484a] p-1 text-white/70 hover:bg-white/10"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <span className="text-sm font-medium text-white">{service.service_name}</span>
                )}
              </div>

              {editingService?.id !== service.id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(service)}
                    className="rounded-md border border-[#48484a] p-2 text-white/70 hover:bg-white/10"
                    title="Modifica"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="rounded-md border border-[#48484a] p-2 text-[#ff453a] hover:bg-[#ff453a]/10"
                    title="Elimina"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
            <h3 className="text-lg font-semibold text-white">Nuovo Servizio</h3>
            <p className="mt-1 text-sm text-white/60">Aggiungi un nuovo servizio alla lista</p>

            <form onSubmit={handleAddService} className="mt-4">
              <input
                type="text"
                placeholder="Nome del servizio"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]"
                required
                autoFocus
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAddModalOpen(false);
                    setNewServiceName("");
                  }}
                  className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving || !newServiceName.trim()}
                  className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
                >
                  {saving ? "Salvataggio..." : "Aggiungi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
