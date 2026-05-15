import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";

const T = {
  ink: '#0E0E0D', navy: '#13315C', paper: '#EEF1F6', muted: '#8a847b',
  ink10: '#0E0E0D1A', ink20: '#0E0E0D33', red: '#b91c1c',
};

function BtnPrimary({ children, onClick, disabled, type = "button", style = {} }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ background: T.navy, color: '#EEF1F6', border: 'none', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 16px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, ...style }}>
      {children}
    </button>
  );
}
function BtnGhost({ children, onClick, disabled, danger, style = {} }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ border: `0.5px solid ${danger ? T.red : T.ink20}`, background: 'transparent', color: danger ? T.red : T.ink, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 16px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}>
      {children}
    </button>
  );
}

export default function GestioneServiziPage() {
  usePageTitleOnMount("Gestione Servizi");
  const { studioId } = useStudio();

  const [services, setServices]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [saving, setSaving]                 = useState(false);
  const [addModalOpen, setAddModalOpen]     = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [editingService, setEditingService] = useState(null);
  const [editName, setEditName]             = useState("");

  useEffect(() => { if (studioId) loadServices(); }, [studioId]);

  const loadServices = async () => {
    setLoading(true); setError("");
    const { data, error: e } = await supabase.from("service_task_templates").select("*").eq("studio", studioId).order("order", { ascending: true });
    if (e) setError(e.message); else setServices(data || []);
    setLoading(false);
  };

  const handleAddService = async e => {
    e.preventDefault(); if (!newServiceName.trim()) return; setSaving(true); setError("");
    const maxOrder = services.length > 0 ? Math.max(...services.map(s => s.order || 0)) : 0;
    const { data, error: iErr } = await supabase.from("service_task_templates").insert({ service_name: newServiceName.trim(), order: maxOrder + 1, studio: studioId }).select("*").single();
    if (iErr) setError(iErr.message);
    else { setServices(p => [...p, data].sort((a, b) => (a.order||0) - (b.order||0))); setAddModalOpen(false); setNewServiceName(""); }
    setSaving(false);
  };

  const handleUpdateService = async e => {
    e.preventDefault(); if (!editingService || !editName.trim()) return; setSaving(true); setError("");
    const { data, error: uErr } = await supabase.from("service_task_templates").update({ service_name: editName.trim() }).eq("id", editingService.id).select("*").single();
    if (uErr) setError(uErr.message);
    else { setServices(p => p.map(s => s.id === editingService.id ? { ...s, service_name: data.service_name } : s)); setEditingService(null); setEditName(""); }
    setSaving(false);
  };

  const handleDeleteService = async id => {
    if (!confirm("Sei sicuro di voler eliminare questo servizio?")) return;
    const { error: dErr } = await supabase.from("service_task_templates").delete().eq("id", id);
    if (dErr) alert("Errore: " + dErr.message);
    else setServices(p => p.filter(s => s.id !== id));
  };

  const inputSt = { width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: `0.5px solid ${T.ink20}`, background: '#fff', color: T.ink, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", outline: 'none' };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>Caricamento...</div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', marginBottom: 4 }}>Gestione Servizi</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>Gestisci i servizi disponibili per i progetti</div>
        </div>
        <BtnPrimary onClick={() => setAddModalOpen(true)}>+ Nuovo</BtnPrimary>
      </div>

      {error && <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.red, marginBottom: 14 }}>{error}</div>}

      {services.length === 0 ? (
        <div style={{ background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '48px 0', textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.muted }}>
          Nessun servizio configurato.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {services.map((service, index) => (
            <div key={service.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: `0.5px solid ${T.ink10}`, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, width: 20, textAlign: 'right' }}>{String(index+1).padStart(2,'0')}</span>
                {editingService?.id === service.id ? (
                  <form onSubmit={handleUpdateService} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                      style={{ ...inputSt, width: 220, padding: '5px 8px' }} />
                    <button type="submit" disabled={saving} style={{ background: T.navy, color: '#EEF1F6', border: 'none', padding: '5px 10px', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>✓</button>
                    <button type="button" onClick={() => { setEditingService(null); setEditName(""); }} style={{ background: 'none', border: `0.5px solid ${T.ink20}`, padding: '5px 10px', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>✕</button>
                  </form>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{service.service_name}</span>
                )}
              </div>
              {editingService?.id !== service.id && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditingService(service); setEditName(service.service_name || ""); }} style={{ background: 'none', border: `0.5px solid ${T.ink20}`, padding: '5px 10px', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted }}>Modifica</button>
                  <button onClick={() => handleDeleteService(service.id)} style={{ background: 'none', border: `0.5px solid ${T.red}`, padding: '5px 10px', cursor: 'pointer', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.red }}>Elimina</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal nuovo servizio */}
      {addModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,14,13,0.5)', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 400, background: '#fff', border: `0.5px solid ${T.ink20}`, padding: 28 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 18 }}>Nuovo Servizio</div>
            <form onSubmit={handleAddService} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input type="text" placeholder="Nome del servizio" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} required autoFocus style={inputSt} />
              <div style={{ height: '0.5px', background: T.ink10 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <BtnGhost onClick={() => { setAddModalOpen(false); setNewServiceName(""); }} disabled={saving}>Annulla</BtnGhost>
                <BtnPrimary type="submit" disabled={saving || !newServiceName.trim()}>{saving ? "Salvataggio..." : "Aggiungi"}</BtnPrimary>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
