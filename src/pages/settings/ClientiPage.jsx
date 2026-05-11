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

// Building icon
function BuildingIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

// User icon
function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export default function ClientiPage() {
  usePageTitleOnMount("Clienti");
  const { studioId } = useStudio();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Add contact modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", company: "" });

  useEffect(() => {
    if (!studioId) return;
    loadContacts();
  }, [studioId]);

  const loadContacts = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("global_contacts")
      .select("*")
      .eq("studio", studioId)
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setContacts(data || []);
    }

    setLoading(false);
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.name.trim()) return;

    setSaving(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("global_contacts")
      .insert({
        name: newContact.name.trim(),
        company: newContact.company.trim() || null,
        studio: studioId,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
    } else {
      setContacts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setAddModalOpen(false);
      setNewContact({ name: "", company: "" });
    }

    setSaving(false);
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm("Sei sicuro di voler eliminare questo contatto?")) return;

    const { error: deleteError } = await supabase.from("global_contacts").delete().eq("id", contactId);

    if (deleteError) {
      alert("Errore: " + deleteError.message);
    } else {
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    }
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
          <h2 className="text-xl font-semibold text-white">Clienti</h2>
          <p className="text-sm text-white/60">Gestisci i contatti clienti dello studio</p>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
        >
          <PlusIcon className="h-4 w-4" />
          Nuovo Cliente
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          <p>Nessun cliente registrato.</p>
          <button
            onClick={() => setAddModalOpen(true)}
            className="mt-4 rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
          >
            Aggiungi il primo cliente
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between rounded-lg border border-[#48484a] bg-[#2c2c2e] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#48484a]">
                  {contact.company ? (
                    <BuildingIcon className="h-5 w-5 text-white/60" />
                  ) : (
                    <UserIcon className="h-5 w-5 text-white/60" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-white">{contact.name}</p>
                  {contact.company && <p className="text-sm text-white/50">{contact.company}</p>}
                </div>
              </div>

              <button
                onClick={() => handleDeleteContact(contact.id)}
                className="rounded-md border border-[#48484a] p-2 text-[#ff453a] hover:bg-[#ff453a]/10"
                title="Elimina"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
            <h3 className="text-lg font-semibold text-white">Nuovo Cliente</h3>
            <p className="mt-1 text-sm text-white/60">Aggiungi un nuovo contatto cliente</p>

            <form onSubmit={handleAddContact} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Nome *</label>
                <input
                  type="text"
                  placeholder="Nome cliente"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Azienda</label>
                <input
                  type="text"
                  placeholder="Nome azienda (opzionale)"
                  value={newContact.company}
                  onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none focus:border-[#0a84ff]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddModalOpen(false);
                    setNewContact({ name: "", company: "" });
                  }}
                  className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving || !newContact.name.trim()}
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
