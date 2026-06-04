import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useEscKey } from "../hooks/useEscKey";

const FIGURE_PROFESSIONALI = [
  "Cliente",
  "Progettista",
  "Direttore Lavori",
  "Coordinatore della Sicurezza",
  "Strutturista",
  "Impresa",
  "Fornitore",
  "Geometra",
  "Ingegnere",
  "Architetto",
  "Avvocato",
  "Amministratore",
  "Contatto",
];

function FieldLabel({ children, required }) {
  const { T } = useTheme();
  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 5 }}>
      {children}{required && <span style={{ color: T.red, marginLeft: 2 }}>*</span>}
    </div>
  );
}

function Avatar({ name, size = 28 }) {
  const { T } = useTheme();
  const initials = (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
  const colors = ["#13315C", "#1a6b3c", "#7c3aed", "#b45309", "#be185d", "#0e7490"];
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (name.charCodeAt(i) + ((h << 5) - h)) | 0;
  const bg = colors[Math.abs(h) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 600, color: '#fff', flexShrink: 0, letterSpacing: '-0.02em' }}>
      {initials || "?"}
    </div>
  );
}

const EMPTY_FORM = { professional_role: "Contatto", full_name: "", company: "", email: "", phone: "" };

export default function AnagraficaPanel({ projectId, studioId }) {
  const { T } = useTheme();

  const inputSt = {
    width: '100%', padding: '7px 10px', boxSizing: 'border-box',
    border: `0.5px solid ${T.borderMd}`, background: T.surface, color: T.ink,
    fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none',
  };

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  useBodyScrollLock(modalOpen);
  useEscKey(() => setModalOpen(false), modalOpen);
  const [editingId, setEditingId] = useState(null); // project_contacts.id being edited
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (!projectId || !studioId) return;
    loadContacts();
  }, [projectId, studioId]);

  const loadContacts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("project_contacts")
      .select("*, global_contacts(*)")
      .eq("project_id", projectId)
      .not("global_contact_id", "is", null)
      .order("created_at", { ascending: true });
    setContacts(data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (pc) => {
    const gc = pc.global_contacts || {};
    setEditingId(pc.id);
    setForm({
      professional_role: pc.professional_role || "Contatto",
      full_name: gc.full_name || "",
      company: gc.company || "",
      email: gc.email || "",
      phone: gc.phone || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) return;
    setSaving(true);

    if (editingId) {
      // Update existing
      const pc = contacts.find(c => c.id === editingId);
      await Promise.all([
        supabase.from("project_contacts").update({ professional_role: form.professional_role }).eq("id", editingId),
        supabase.from("global_contacts").update({
          full_name: form.full_name.trim(),
          company: form.company.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        }).eq("id", pc.global_contact_id),
      ]);
    } else {
      // Create new global_contact + project_contact link
      const { data: gc, error: gcErr } = await supabase.from("global_contacts").insert({
        full_name: form.full_name.trim(),
        company: form.company.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        studio: studioId,
      }).select("*").single();

      if (!gcErr && gc) {
        await supabase.from("project_contacts").insert({
          project_id: projectId,
          global_contact_id: gc.id,
          professional_role: form.professional_role,
        });
      }
    }

    setSaving(false);
    setModalOpen(false);
    loadContacts();
  };

  const handleDelete = async (pc) => {
    setDeleting(true);
    await supabase.from("project_contacts").delete().eq("id", pc.id);
    // Also delete the global_contact (it belongs only to this project)
    if (pc.global_contact_id) {
      await supabase.from("global_contacts").delete().eq("id", pc.global_contact_id);
    }
    setDeleting(false);
    setConfirmDelete(null);
    loadContacts();
  };

  // ── WIDGET COMPATTO ──────────────────────────────────────────────
  const widget = (
    <button onClick={() => setModalOpen(true)} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      border: `0.5px solid ${contacts.length > 0 ? T.navy : T.borderMd}`,
      background: contacts.length > 0 ? T.navyLight : 'transparent',
      padding: '6px 12px', cursor: 'pointer',
    }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: contacts.length > 0 ? T.navy : T.muted, fontWeight: 600 }}>
        Anagrafica
      </span>
      {contacts.length > 0 ? (
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.navy, border: `0.5px solid ${T.navy}`, padding: '1px 6px' }}>
          {contacts.length} {contacts.length === 1 ? "contatto" : "contatti"}
        </span>
      ) : (
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>
          + Aggiungi
        </span>
      )}
    </button>
  );

  // ── MODAL ────────────────────────────────────────────────────────
  const modal = modalOpen && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,14,13,0.5)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 680, background: T.surface, border: `0.5px solid ${T.borderMd}`, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em' }}>Anagrafica progetto</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 3 }}>
              Figure professionali e contatti collegati a questo progetto
            </div>
          </div>
          <button onClick={() => { setModalOpen(false); setEditingId(null); setConfirmDelete(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Lista contatti esistenti */}
        {contacts.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>
              Contatti ({contacts.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contacts.map(pc => {
                const gc = pc.global_contacts || {};
                const isDeleting = confirmDelete === pc.id;
                return (
                  <div key={pc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: T.bg, border: `0.5px solid ${T.border}` }}>
                    <Avatar name={gc.full_name} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{gc.full_name || "—"}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.navy, border: `0.5px solid ${T.navy}`, padding: '1px 6px', letterSpacing: '0.05em' }}>
                          {pc.professional_role}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                        {gc.company && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>{gc.company}</span>}
                        {gc.email && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>{gc.email}</span>}
                        {gc.phone && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>{gc.phone}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {isDeleting ? (
                        <>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, alignSelf: 'center' }}>Sicuro?</span>
                          <button onClick={() => handleDelete(pc)} disabled={deleting}
                            style={{ border: `0.5px solid ${T.red}`, background: 'transparent', color: T.red, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.05em', padding: '4px 10px', cursor: 'pointer' }}>
                            {deleting ? "..." : "Sì"}
                          </button>
                          <button onClick={() => setConfirmDelete(null)}
                            style={{ border: `0.5px solid ${T.borderMd}`, background: 'transparent', color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, padding: '4px 10px', cursor: 'pointer' }}>
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => openEdit(pc)}
                            style={{ border: `0.5px solid ${T.borderMd}`, background: 'transparent', color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.05em', padding: '4px 10px', cursor: 'pointer' }}>
                            Modifica
                          </button>
                          <button onClick={() => setConfirmDelete(pc.id)}
                            style={{ border: `0.5px solid ${T.borderMd}`, background: 'transparent', color: T.red, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, padding: '4px 10px', cursor: 'pointer' }}>
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form nuovo/modifica */}
        <div style={{ borderTop: contacts.length > 0 ? `0.5px solid ${T.border}` : 'none', paddingTop: contacts.length > 0 ? 20 : 0 }}>
          {contacts.length > 0 && !editingId && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 14 }}>
              Aggiungi contatto
            </div>
          )}
          {editingId && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 14 }}>
              Modifica contatto
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Figura professionale — full width */}
            <div style={{ gridColumn: 'span 2' }}>
              <FieldLabel required>Figura professionale</FieldLabel>
              <select value={form.professional_role} onChange={e => setForm(p => ({ ...p, professional_role: e.target.value }))}
                style={{ ...inputSt, cursor: 'pointer', appearance: 'auto' }}>
                {FIGURE_PROFESSIONALI.map(f => <option key={f} value={f}>{f}</option>)}
                {!FIGURE_PROFESSIONALI.includes(form.professional_role) && form.professional_role && (
                  <option value={form.professional_role}>{form.professional_role}</option>
                )}
              </select>
            </div>

            {/* Nome e cognome */}
            <div style={{ gridColumn: 'span 2' }}>
              <FieldLabel required>Nome e cognome</FieldLabel>
              <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Es. Mario Rossi" style={inputSt} />
            </div>

            {/* Azienda */}
            <div>
              <FieldLabel>Azienda</FieldLabel>
              <input type="text" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                placeholder="Es. Studio Rossi Srl" style={inputSt} />
            </div>

            {/* Telefono */}
            <div>
              <FieldLabel>Telefono</FieldLabel>
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="Es. +39 02 1234567" style={inputSt} />
            </div>

            {/* Email — full width */}
            <div style={{ gridColumn: 'span 2' }}>
              <FieldLabel>Email</FieldLabel>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="Es. mario.rossi@studio.com" style={inputSt} />
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: `0.5px solid ${T.border}` }}>
          <div>
            {editingId && (
              <button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}
                style={{ border: 'none', background: 'transparent', color: T.muted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.05em', cursor: 'pointer', padding: 0 }}>
                ← Aggiungi nuovo
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setModalOpen(false); setEditingId(null); setConfirmDelete(null); }}
              style={{ border: `0.5px solid ${T.borderMd}`, background: 'transparent', color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: 'pointer' }}>
              Chiudi
            </button>
            <button onClick={handleSave} disabled={saving || !form.full_name.trim()}
              style={{ background: T.navy, color: T.bg, border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: saving || !form.full_name.trim() ? 'not-allowed' : 'pointer', opacity: saving || !form.full_name.trim() ? 0.6 : 1 }}>
              {saving ? "Salvataggio..." : editingId ? "Aggiorna" : "Aggiungi contatto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return null;

  return (
    <>
      {widget}
      {modal}
    </>
  );
}
