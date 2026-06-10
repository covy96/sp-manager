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
    border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink,
    fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none',
  };

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  useBodyScrollLock(modalOpen);
  useEscKey(() => setModalOpen(false), modalOpen);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ── Copia da progetto ────────────────────────────────────────────
  const [copyModal, setCopyModal]       = useState(false);
  const [projects, setProjects]         = useState([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedSource, setSelectedSource] = useState(null); // { id, name }
  const [sourceContacts, setSourceContacts] = useState([]);
  const [loadingSource, setLoadingSource]   = useState(false);
  const [copying, setCopying]               = useState(false);

  const openCopyModal = async () => {
    setCopyModal(true); setSelectedSource(null); setSourceContacts([]); setProjectSearch("");
    const { data } = await supabase.from("projects").select("id,name,client").eq("studio", studioId).eq("archived", false).neq("id", projectId).order("name", { ascending: true });
    setProjects(data || []);
  };

  const loadSourceContacts = async (proj) => {
    setSelectedSource(proj); setLoadingSource(true);
    const { data } = await supabase.from("project_contacts").select("*, global_contacts(*)").eq("project_id", proj.id).not("global_contact_id", "is", null);
    setSourceContacts(data || []);
    setLoadingSource(false);
  };

  const handleCopy = async () => {
    if (!sourceContacts.length) return;
    setCopying(true);
    for (const pc of sourceContacts) {
      const gc = pc.global_contacts || {};
      const newId = crypto.randomUUID();
      const { error: gcErr } = await supabase.from("global_contacts").insert({
        id: newId, full_name: gc.full_name || "", company: gc.company || "",
        email: gc.email || null, phone: gc.phone || null, studio: studioId,
      });
      if (!gcErr) {
        await supabase.from("project_contacts").insert({
          project_id: projectId, global_contact_id: newId,
          professional_role: pc.professional_role,
        });
      }
    }
    setCopying(false); setCopyModal(false); loadContacts();
  };

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
          company: form.company.trim() || "",
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
        }).eq("id", pc.global_contact_id),
      ]);
    } else {
      // Genera ID client-side per evitare dipendenza dal SELECT post-insert (RLS)
      const newGcId = crypto.randomUUID();
      const { error: gcErr } = await supabase.from("global_contacts").insert({
        id: newGcId,
        full_name: form.full_name.trim(),
        company: form.company.trim() || "",
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        studio: studioId,
      });

      if (!gcErr) {
        await supabase.from("project_contacts").insert({
          project_id: projectId,
          global_contact_id: newGcId,
          professional_role: form.professional_role,
        });
      } else {
        alert("Errore salvataggio contatto: " + gcErr.message);
        setSaving(false);
        return;
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
    <button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setConfirmDelete(null); setModalOpen(true); }} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      border: `1px solid ${contacts.length > 0 ? T.navy : T.borderMd}`, borderRadius: T.radiusSm,
      background: contacts.length > 0 ? T.navyLight : 'transparent',
      height: 34, padding: '0 12px', cursor: 'pointer',
    }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: contacts.length > 0 ? T.navy : T.muted, fontWeight: 600 }}>
        Anagrafica
      </span>
      {contacts.length > 0 ? (
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.navy, border: `1px solid ${T.navy}`, borderRadius: T.radiusSm, padding: '1px 6px' }}>
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
      <div style={{ width: '100%', maxWidth: 680, background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.borderMd}`, borderRadius: T.radiusLg, borderRadius: T.radiusSm, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>

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
                  <div key={pc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: T.bg, border: `1px solid ${T.border}` }}>
                    <Avatar name={gc.full_name} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{gc.full_name || "—"}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.navy, border: `1px solid ${T.navy}`, borderRadius: T.radiusSm, padding: '1px 6px', letterSpacing: '0.05em' }}>
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
                            style={{ border: `1px solid ${T.red}`, borderRadius: T.radiusSm, background: 'transparent', color: T.red, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.05em', padding: '4px 10px', cursor: 'pointer' }}>
                            {deleting ? "..." : "Sì"}
                          </button>
                          <button onClick={() => setConfirmDelete(null)}
                            style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, padding: '4px 10px', cursor: 'pointer' }}>
                            No
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => openEdit(pc)}
                            style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.05em', padding: '4px 10px', cursor: 'pointer' }}>
                            Modifica
                          </button>
                          <button onClick={() => setConfirmDelete(pc.id)}
                            style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.red, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, padding: '4px 10px', cursor: 'pointer' }}>
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

            {/* Figura professionale — full width con dropdown custom */}
            <div style={{ gridColumn: 'span 2', position: 'relative' }}>
              <FieldLabel required>Figura professionale</FieldLabel>
              <input
                type="text"
                value={form.professional_role}
                onChange={e => setForm(p => ({ ...p, professional_role: e.target.value }))}
                onFocus={() => setForm(p => ({ ...p, _roleFocus: true }))}
                onBlur={() => setTimeout(() => setForm(p => ({ ...p, _roleFocus: false })), 150)}
                placeholder="Es. Cliente, Impresa, o scrivi liberamente..."
                style={inputSt}
                autoComplete="off"
              />
              {form._roleFocus && (() => {
                const q = (form.professional_role || '').toLowerCase();
                const matches = FIGURE_PROFESSIONALI.filter(f => f.toLowerCase().includes(q));
                if (matches.length === 0) return null;
                return (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4, zIndex: 200, background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.glassBorder}`, borderRadius: T.radiusSm, boxShadow: T.shadowMd, overflow: 'hidden' }}>
                    {matches.map(f => (
                      <button key={f} type="button"
                        onMouseDown={() => setForm(p => ({ ...p, professional_role: f, _roleFocus: false }))}
                        style={{ display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: T.ink, fontFamily: "'Space Grotesk', sans-serif", borderBottom: `0.5px solid ${T.border}` }}
                        onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                );
              })()}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: `0.5px solid ${T.border}`, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {editingId ? (
              <button onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}
                style={{ border: 'none', background: 'transparent', color: T.muted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.05em', cursor: 'pointer', padding: 0 }}>
                ← Aggiungi nuovo
              </button>
            ) : (
              <button onClick={openCopyModal}
                style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.muted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                ⎘ Copia da progetto
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setModalOpen(false); setEditingId(null); setConfirmDelete(null); }}
              style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: 'pointer' }}>
              Chiudi
            </button>
            <button onClick={handleSave} disabled={saving || !form.full_name.trim()}
              style={{ background: T.navy, color: T.bg, border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: saving || !form.full_name.trim() ? 'not-allowed' : 'pointer', opacity: saving || !form.full_name.trim() ? 0.6 : 1, borderRadius: T.radiusSm }}>
              {saving ? "Salvataggio..." : editingId ? "Aggiorna" : "Aggiungi contatto"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Modal copia da progetto ──────────────────────────────────────
  const copyModalEl = copyModal && (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,14,13,0.55)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 560, background: T.glassBg, backdropFilter: T.blur, WebkitBackdropFilter: T.blur, border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '80vh', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em' }}>Copia anagrafica da progetto</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 3 }}>Seleziona un progetto per importarne i contatti</div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Lista progetti */}
          <div style={{ width: 220, borderRight: `0.5px solid ${T.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ padding: '10px 14px', borderBottom: `0.5px solid ${T.border}` }}>
              <input
                type="text" placeholder="Cerca progetto..." value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', boxSizing: 'border-box', border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: T.surface, color: T.ink, fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", outline: 'none' }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {projects
                .filter(p => !projectSearch.trim() || (p.name || '').toLowerCase().includes(projectSearch.toLowerCase()) || (p.client || '').toLowerCase().includes(projectSearch.toLowerCase()))
                .map(p => (
                  <button key={p.id} onClick={() => loadSourceContacts(p)}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', background: selectedSource?.id === p.id ? T.navyLight : 'transparent', border: 'none', borderBottom: `0.5px solid ${T.border}`, cursor: 'pointer', transition: 'background 120ms' }}
                    onMouseEnter={e => { if (selectedSource?.id !== p.id) e.currentTarget.style.background = T.surface2; }}
                    onMouseLeave={e => { if (selectedSource?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: selectedSource?.id === p.id ? T.navy : T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    {p.client && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.client}</div>}
                  </button>
                ))}
            </div>
          </div>

          {/* Preview contatti */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
            {!selectedSource ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>← Seleziona un progetto</div>
            ) : loadingSource ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
            ) : sourceContacts.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Nessun contatto in questo progetto</div>
            ) : sourceContacts.map((pc, i) => {
              const gc = pc.global_contacts || {};
              return (
                <div key={pc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: i < sourceContacts.length - 1 ? `0.5px solid ${T.border}` : 'none' }}>
                  <Avatar name={gc.full_name} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gc.full_name || '—'}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.navy, border: `1px solid ${T.navy}`, borderRadius: T.radiusSm, padding: '1px 5px' }}>{pc.professional_role}</span>
                      {gc.company && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: T.muted }}>{gc.company}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: `0.5px solid ${T.border}` }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>
            {selectedSource && !loadingSource ? `${sourceContacts.length} contatt${sourceContacts.length === 1 ? 'o' : 'i'} da importare` : ''}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setCopyModal(false)}
              style={{ border: `1px solid ${T.borderMd}`, borderRadius: T.radiusSm, background: 'transparent', color: T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', cursor: 'pointer' }}>
              Annulla
            </button>
            <button onClick={handleCopy} disabled={copying || !selectedSource || sourceContacts.length === 0}
              style={{ background: T.navy, color: T.bg, border: 'none', borderRadius: T.radiusSm, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', cursor: copying || !selectedSource || sourceContacts.length === 0 ? 'not-allowed' : 'pointer', opacity: copying || !selectedSource || sourceContacts.length === 0 ? 0.5 : 1 }}>
              {copying ? 'Importazione...' : 'Importa contatti'}
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
      {copyModalEl}
    </>
  );
}
