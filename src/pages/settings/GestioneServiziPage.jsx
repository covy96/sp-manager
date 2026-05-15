import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";

const T = {
  ink:'#0E0E0D', navy:'#13315C', paper:'#EEF1F6', muted:'#8a847b',
  ink10:'#0E0E0D1A', ink20:'#0E0E0D33', red:'#b91c1c',
};

function BtnPrimary({ children, onClick, disabled, type="button", style={} }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ background:T.navy, color:'#EEF1F6', border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 16px', cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.6:1, ...style }}>
      {children}
    </button>
  );
}
function BtnGhost({ children, onClick, disabled, danger, style={} }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ border:`0.5px solid ${danger?T.red:T.ink20}`, background:'transparent', color:danger?T.red:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 16px', cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.5:1, ...style }}>
      {children}
    </button>
  );
}

const inputSt = { width:'100%', padding:'8px 12px', boxSizing:'border-box', border:`0.5px solid ${T.ink20}`, background:'#fff', color:T.ink, fontSize:13, fontFamily:"'Space Grotesk', sans-serif", outline:'none' };

export default function GestioneServiziPage() {
  usePageTitleOnMount("Gestione Servizi");
  const { studioId } = useStudio();

  const [services, setServices]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [saving, setSaving]                 = useState(false);

  // Nuovo servizio
  const [addModalOpen, setAddModalOpen]     = useState(false);
  const [newServiceName, setNewServiceName] = useState("");

  // Servizio selezionato per edit + task predefinite
  const [expandedId, setExpandedId]         = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [editName, setEditName]             = useState("");

  // Task predefinite
  const [newTaskInput, setNewTaskInput]     = useState("");

  useEffect(() => { if (studioId) loadServices(); }, [studioId]);

  const loadServices = async () => {
    setLoading(true); setError("");
    const { data, error:e } = await supabase
      .from("service_task_templates")
      .select("*")
      .eq("studio", studioId)
      .order("order", { ascending:true });
    if (e) setError(e.message); else setServices(data||[]);
    setLoading(false);
  };

  const handleAddService = async e => {
    e.preventDefault(); if (!newServiceName.trim()) return; setSaving(true); setError("");
    const maxOrder = services.length > 0 ? Math.max(...services.map(s => s.order||0)) : 0;
    const { data, error:iErr } = await supabase
      .from("service_task_templates")
      .insert({ service_name:newServiceName.trim(), order:maxOrder+1, studio:studioId, task_templates:[] })
      .select("*").single();
    if (iErr) setError(iErr.message);
    else { setServices(p => [...p, data].sort((a,b) => (a.order||0)-(b.order||0))); setAddModalOpen(false); setNewServiceName(""); }
    setSaving(false);
  };

  const handleUpdateName = async e => {
    e.preventDefault(); if (!editingService||!editName.trim()) return; setSaving(true);
    const { data, error:uErr } = await supabase
      .from("service_task_templates")
      .update({ service_name:editName.trim() })
      .eq("id", editingService.id).select("*").single();
    if (uErr) setError(uErr.message);
    else { setServices(p => p.map(s => s.id===editingService.id ? { ...s, service_name:data.service_name } : s)); setEditingService(null); setEditName(""); }
    setSaving(false);
  };

  const handleDeleteService = async id => {
    if (!confirm("Sei sicuro di voler eliminare questo servizio? Verranno eliminate anche le task predefinite.")) return;
    const { error:dErr } = await supabase.from("service_task_templates").delete().eq("id", id);
    if (dErr) alert("Errore: " + dErr.message);
    else { setServices(p => p.filter(s => s.id!==id)); if (expandedId===id) setExpandedId(null); }
  };

  // ── TASK PREDEFINITE ─────────────────────────────────────────────
  const getTaskTemplates = (service) => Array.isArray(service.task_templates) ? service.task_templates : [];

  const handleAddTask = async (service) => {
    if (!newTaskInput.trim()) return;
    const current = getTaskTemplates(service);
    const updated = [...current, newTaskInput.trim()];
    const { error:uErr } = await supabase
      .from("service_task_templates")
      .update({ task_templates:updated })
      .eq("id", service.id);
    if (uErr) { alert("Errore: " + uErr.message); return; }
    setServices(p => p.map(s => s.id===service.id ? { ...s, task_templates:updated } : s));
    setNewTaskInput("");
  };

  const handleRemoveTask = async (service, idx) => {
    const current = getTaskTemplates(service);
    const updated = current.filter((_,i) => i!==idx);
    const { error:uErr } = await supabase
      .from("service_task_templates")
      .update({ task_templates:updated })
      .eq("id", service.id);
    if (uErr) { alert("Errore: " + uErr.message); return; }
    setServices(p => p.map(s => s.id===service.id ? { ...s, task_templates:updated } : s));
  };

  const handleMoveTask = async (service, idx, dir) => {
    const current = [...getTaskTemplates(service)];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= current.length) return;
    [current[idx], current[newIdx]] = [current[newIdx], current[idx]];
    const { error:uErr } = await supabase
      .from("service_task_templates")
      .update({ task_templates:current })
      .eq("id", service.id);
    if (uErr) { alert("Errore: " + uErr.message); return; }
    setServices(p => p.map(s => s.id===service.id ? { ...s, task_templates:current } : s));
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>Caricamento...</div>
  );

  return (
    <div style={{ maxWidth:680 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:600, color:T.ink, letterSpacing:'-0.02em', marginBottom:4 }}>Gestione Servizi</div>
          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted }}>
            Gestisci servizi e task predefinite per ogni servizio
          </div>
        </div>
        <BtnPrimary onClick={() => setAddModalOpen(true)}>+ Nuovo</BtnPrimary>
      </div>

      {error && <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.red, marginBottom:14 }}>{error}</div>}

      {services.length === 0 ? (
        <div style={{ background:'#fff', border:`0.5px solid ${T.ink10}`, padding:'48px 0', textAlign:'center', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
          Nessun servizio configurato.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {services.map((service, index) => {
            const isExpanded = expandedId === service.id;
            const tasks = getTaskTemplates(service);
            const isEditing = editingService?.id === service.id;

            return (
              <div key={service.id} style={{ background:'#fff', border:`0.5px solid ${isExpanded?T.navy:T.ink10}`, transition:'border-color 0.1s' }}>
                {/* Header riga servizio */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flex:1, minWidth:0 }}>
                    <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, width:22, textAlign:'right', flexShrink:0 }}>
                      {String(index+1).padStart(2,'0')}
                    </span>
                    {isEditing ? (
                      <form onSubmit={handleUpdateName} style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                          style={{ ...inputSt, padding:'5px 8px', flex:1 }} />
                        <button type="submit" disabled={saving} style={{ background:T.navy, color:'#EEF1F6', border:'none', padding:'5px 10px', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:10 }}>✓</button>
                        <button type="button" onClick={() => { setEditingService(null); setEditName(""); }} style={{ background:'none', border:`0.5px solid ${T.ink20}`, padding:'5px 10px', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted }}>✕</button>
                      </form>
                    ) : (
                      <button onClick={() => setExpandedId(isExpanded ? null : service.id)}
                        style={{ flex:1, textAlign:'left', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:T.ink, display:'flex', alignItems:'center', gap:8 }}>
                        {service.service_name}
                        <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, border:`0.5px solid ${T.ink10}`, padding:'1px 6px' }}>
                          {tasks.length} task
                        </span>
                        <span style={{ fontSize:11, color:T.muted, marginLeft:'auto' }}>{isExpanded ? '▲' : '▼'}</span>
                      </button>
                    )}
                  </div>
                  {!isEditing && (
                    <div style={{ display:'flex', gap:6, marginLeft:10, flexShrink:0 }}>
                      <button onClick={() => { setEditingService(service); setEditName(service.service_name||""); setExpandedId(service.id); }}
                        style={{ background:'none', border:`0.5px solid ${T.ink20}`, padding:'4px 10px', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted }}>
                        Rinomina
                      </button>
                      <button onClick={() => handleDeleteService(service.id)}
                        style={{ background:'none', border:`0.5px solid ${T.red}`, padding:'4px 10px', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.red }}>
                        Elimina
                      </button>
                    </div>
                  )}
                </div>

                {/* Pannello task predefinite */}
                {isExpanded && (
                  <div style={{ borderTop:`0.5px solid ${T.ink10}`, padding:'14px 16px 16px', background:T.paper }}>
                    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:10 }}>
                      Task predefinite — verranno create automaticamente per ogni nuovo progetto con questo servizio
                    </div>

                    {tasks.length === 0 ? (
                      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, padding:'8px 0', marginBottom:10 }}>
                        Nessuna task predefinita. Aggiungine una qui sotto.
                      </div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:12 }}>
                        {tasks.map((task, i) => (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', border:`0.5px solid ${T.ink10}`, padding:'7px 12px' }}>
                            <div style={{ display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>
                              <button onClick={() => handleMoveTask(service, i, -1)} disabled={i===0}
                                style={{ background:'none', border:'none', cursor:i===0?'default':'pointer', color:i===0?T.ink10:T.muted, fontSize:10, lineHeight:1, padding:'1px 2px' }}>▲</button>
                              <button onClick={() => handleMoveTask(service, i, 1)} disabled={i===tasks.length-1}
                                style={{ background:'none', border:'none', cursor:i===tasks.length-1?'default':'pointer', color:i===tasks.length-1?T.ink10:T.muted, fontSize:10, lineHeight:1, padding:'1px 2px' }}>▼</button>
                            </div>
                            <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, width:18, textAlign:'right', flexShrink:0 }}>{String(i+1).padStart(2,'0')}</span>
                            <span style={{ flex:1, fontSize:12, color:T.ink }}>{task}</span>
                            <button onClick={() => handleRemoveTask(service, i)}
                              style={{ background:'none', border:'none', cursor:'pointer', color:T.red, fontSize:16, lineHeight:1, padding:'0 4px', flexShrink:0 }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Aggiungi task */}
                    <div style={{ display:'flex', gap:8 }}>
                      <input
                        type="text" value={newTaskInput}
                        onChange={e => setNewTaskInput(e.target.value)}
                        onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); handleAddTask(service); } }}
                        placeholder="Nome task predefinita..."
                        style={{ ...inputSt, flex:1, padding:'7px 10px', fontSize:12 }}
                      />
                      <BtnPrimary onClick={() => handleAddTask(service)} disabled={!newTaskInput.trim()} style={{ padding:'7px 14px', fontSize:11 }}>
                        + Aggiungi
                      </BtnPrimary>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuovo servizio */}
      {addModalOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(14,14,13,0.5)', padding:16 }}>
          <div style={{ width:'100%', maxWidth:400, background:'#fff', border:`0.5px solid ${T.ink20}`, padding:28 }}>
            <div style={{ fontSize:15, fontWeight:600, color:T.ink, marginBottom:18 }}>Nuovo Servizio</div>
            <form onSubmit={handleAddService} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <input type="text" placeholder="Nome del servizio" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} required autoFocus style={inputSt} />
              <div style={{ height:'0.5px', background:T.ink10 }} />
              <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                <BtnGhost onClick={() => { setAddModalOpen(false); setNewServiceName(""); }} disabled={saving}>Annulla</BtnGhost>
                <BtnPrimary type="submit" disabled={saving||!newServiceName.trim()}>{saving?"Salvataggio...":"Aggiungi"}</BtnPrimary>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
