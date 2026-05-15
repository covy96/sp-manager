import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";

const T = {
  ink: '#0E0E0D', navy: '#13315C', paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33', red: '#b91c1c',
};

function BtnPrimary({ children, onClick, disabled, type = "button" }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ background: T.navy, color: '#EEF1F6', border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 16px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}
function BtnGhost({ children, onClick, disabled, danger }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ border: `0.5px solid ${danger ? T.red : T.ink20}`, background: 'transparent', color: danger ? T.red : T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 16px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      {children}
    </button>
  );
}

export default function ClientiPage() {
  usePageTitleOnMount("Clienti");
  const { studioId } = useStudio();

  const [contacts, setContacts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [saving, setSaving]           = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newContact, setNewContact]   = useState({ full_name: "", company: "" });

  useEffect(() => { if (studioId) loadContacts(); }, [studioId]);

  const loadContacts = async () => {
    setLoading(true); setError("");
    const { data, error: e } = await supabase.from("global_contacts").select("*").eq("studio", studioId).order("full_name", { ascending: true });
    if (e) setError(e.message); else setContacts(data || []);
    setLoading(false);
  };

  const handleAddContact = async e => {
    e.preventDefault(); if (!newContact.full_name.trim()) return; setSaving(true); setError("");
    const { data, error: iErr } = await supabase.from("global_contacts").insert({ full_name: newContact.full_name.trim(), company: newContact.company.trim() || null, studio: studioId }).select("*").single();
    if (iErr) setError(iErr.message);
    else { setContacts(p => [...p, data].sort((a, b) => a.full_name.localeCompare(b.full_name))); setAddModalOpen(false); setNewContact({ full_name: "", company: "" }); }
    setSaving(false);
  };

  const handleDelete = async id => {
    if (!confirm("Sei sicuro di voler eliminare questo contatto?")) return;
    const { error: dErr } = await supabase.from("global_contacts").delete().eq("id", id);
    if (dErr) alert("Errore: " + dErr.message);
    else setContacts(p => p.filter(c => c.id !== id));
  };

  const inputSt = { width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: `0.5px solid ${T.ink20}`, background: '#fff', color: T.ink, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", outline: 'none' };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', marginBottom: 4 }}>Clienti</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>Gestisci i contatti clienti dello studio</div>
        </div>
        <BtnPrimary onClick={() => setAddModalOpen(true)}>+ Nuovo</BtnPrimary>
      </div>

      {error && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, marginBottom: 14 }}>{error}</div>}

      {contacts.length === 0 ? (
        <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '48px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted, marginBottom: 16 }}>Nessun cliente registrato.</div>
          <BtnPrimary onClick={() => setAddModalOpen(true)}>Aggiungi il primo cliente</BtnPrimary>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {contacts.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: T.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>{c.company ? '🏢' : '👤'}</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{c.full_name}</div>
                  {c.company && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 2 }}>{c.company}</div>}
                </div>
              </div>
              <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: `0.5px solid ${T.red}`, padding: '5px 10px', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.red, letterSpacing: '0.05em' }}>Elimina</button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {addModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,14,13,0.5)', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 400, background: '#fff', border: `0.5px solid ${T.ink20}`, padding: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 18 }}>Nuovo Cliente</div>
            <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>Nome *</div>
                <input type="text" placeholder="Nome cliente" value={newContact.full_name} onChange={e => setNewContact({ ...newContact, full_name: e.target.value })} required autoFocus style={inputSt} />
              </div>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 6 }}>Azienda</div>
                <input type="text" placeholder="Nome azienda (opzionale)" value={newContact.company} onChange={e => setNewContact({ ...newContact, company: e.target.value })} style={inputSt} />
              </div>
              <div style={{ height: '0.5px', background: T.ink10, margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <BtnGhost onClick={() => { setAddModalOpen(false); setNewContact({ full_name: "", company: "" }); }} disabled={saving}>Annulla</BtnGhost>
                <BtnPrimary type="submit" disabled={saving || !newContact.full_name.trim()}>{saving ? "Salvataggio..." : "Aggiungi"}</BtnPrimary>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
