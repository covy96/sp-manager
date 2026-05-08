import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export default function ClientiPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "", note: "" });

  const loadContacts = async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("global_contacts")
      .select("*")
      .order("name", { ascending: true });
    if (queryError) {
      setError(queryError.message);
      setContacts([]);
    } else {
      setContacts(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q),
    );
  }, [contacts, search]);

  const openModal = () => {
    setFormData({ name: "", email: "", phone: "", address: "", note: "" });
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!formData.name.trim()) {
      setFormError("Il nome è obbligatorio.");
      return;
    }
    setSaving(true);
    const { data, error: insertError } = await supabase
      .from("global_contacts")
      .insert({
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        note: formData.note.trim() || null,
      })
      .select("*")
      .single();
    if (insertError) {
      setFormError(insertError.message);
      setSaving(false);
      return;
    }
    setContacts((prev) => [...prev, data].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")));
    setIsModalOpen(false);
    setSaving(false);
  };

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="w-full max-w-xl">
          <label className="mb-2 block text-sm text-white/80">Cerca cliente</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtra per nome, email o telefono..."
            className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
          />
        </div>
        <button
          type="button"
          onClick={openModal}
          className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110"
        >
          Nuovo Cliente
        </button>
      </div>

      {loading ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/70">
          Caricamento clienti...
        </section>
      ) : error ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-red-300">
          Errore: {error}
        </section>
      ) : filtered.length === 0 ? (
        <section className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-8 text-center text-white/60">
          Nessun cliente trovato.
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-4"
            >
              <p className="text-base font-semibold text-white">{c.name}</p>
              <div className="mt-2 space-y-0.5 text-sm text-white/60">
                {c.email ? <p>✉️ {c.email}</p> : null}
                {c.phone ? <p>📞 {c.phone}</p> : null}
                {c.address ? <p>📍 {c.address}</p> : null}
                {c.note ? <p className="mt-1 text-xs text-white/45">{c.note}</p> : null}
              </div>
            </div>
          ))}
        </section>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#48484a] bg-[#2c2c2e] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Nuovo Cliente</h3>
              <button type="button" onClick={closeModal} className="text-white/50 hover:text-white">✕</button>
            </div>
            <form className="space-y-4" onSubmit={handleSave}>
              {[
                ["name", "Nome *", "text"],
                ["email", "Email", "email"],
                ["phone", "Telefono", "text"],
                ["address", "Indirizzo", "text"],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label className="mb-1 block text-sm font-medium text-white/80">{label}</label>
                  <input
                    type={type}
                    value={formData[key]}
                    onChange={(e) => setFormData((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                    required={label.includes("*")}
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-sm font-medium text-white/80">Note</label>
                <textarea
                  rows={3}
                  value={formData.note}
                  onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                  className="w-full rounded-lg border border-[#48484a] bg-[#3a3a3c] px-3 py-2 text-sm text-white outline-none ring-[#0a84ff]/60 focus:ring"
                />
              </div>
              {formError ? <p className="text-sm text-red-300">{formError}</p> : null}
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={closeModal} disabled={saving} className="rounded-lg border border-[#48484a] px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50">Annulla</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-[#0a84ff] px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60">{saving ? "Salvataggio..." : "Salva"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
