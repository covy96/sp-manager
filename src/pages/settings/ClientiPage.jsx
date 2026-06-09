import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";
import { useStudio } from "../../hooks/useStudio";
import { supabase } from "../../lib/supabase";
import { backfillContacts } from "../../utils/backfillContacts";
import { useTheme } from '../../contexts/ThemeContext';
import { useIsMobile } from "../../hooks/useIsMobile";
import { useEscKey } from "../../hooks/useEscKey";

function currency(v) {
  return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(v)||0);
}
function BtnPrimary({ children, onClick, disabled, type="button" }) {
  const { T } = useTheme();
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ background:T.navy, color:T.bg, border:'none', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 16px', cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.6:1 }}>
      {children}
    </button>
  );
}
function BtnGhost({ children, onClick, disabled, danger }) {
  const { T } = useTheme();
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{ border:`0.5px solid ${danger?T.red:T.borderMd}`, borderRadius: T.radiusSm, background:'transparent', color:danger?T.red:T.ink, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 16px', cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.5:1 }}>
      {children}
    </button>
  );
}
function FieldLabel({ children }) {
  const { T } = useTheme();
  return <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:6 }}>{children}</div>;
}

export default function ClientiPage() {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  usePageTitleOnMount("Clienti");
  const { studioId } = useStudio();
  const navigate = useNavigate();

  const [contacts, setContacts]           = useState([]);
  const [projectsByClient, setProjectsByClient] = useState({});
  const [commesseByClient, setCommesseByClient] = useState({});
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [saving, setSaving]               = useState(false);
  const [addModalOpen, setAddModalOpen]   = useState(false);
  useEscKey(() => setAddModalOpen(false), addModalOpen);
  const [newContact, setNewContact]       = useState({ full_name:"", company:"" });
  const [expandedId, setExpandedId]       = useState(null);
  const [formError, setFormError]         = useState("");
  const [searchQuery, setSearchQuery]     = useState("");

  useEffect(() => {
    if (!studioId) return;
    backfillContacts(studioId).then(() => loadAll());
  }, [studioId]);

  const loadAll = async () => {
    setLoading(true); setError("");
    try {
      const [{ data:cts, error:cErr }, { data:projs }, { data:comms }, { data:pcLinks }] = await Promise.all([
        supabase.from("global_contacts").select("*").eq("studio",studioId).order("full_name",{ascending:true}),
        supabase.from("projects").select("id,name,client,status,archived").eq("studio",studioId).eq("archived",false),
        supabase.from("commesse").select("id,nome_commessa,cliente,importo_offerta_base,numero_offerta").eq("studio",studioId),
        // ID dei global_contacts usati come anagrafica di progetto — vanno esclusi dalla scheda clienti
        supabase.from("project_contacts").select("global_contact_id").not("global_contact_id","is",null),
      ]);
      if (cErr) throw cErr;
      // Escludi i contatti che sono anagrafica di un progetto specifico
      const projectContactIds = new Set((pcLinks||[]).map(r => r.global_contact_id));
      setContacts((cts||[]).filter(c => !projectContactIds.has(c.id)));

      // Raggruppa per nome cliente (case-insensitive)
      const pMap = {};
      (projs||[]).forEach(p => {
        const key=(p.client||"").toLowerCase().trim();
        if (key) { if (!pMap[key]) pMap[key]=[]; pMap[key].push(p); }
      });
      setProjectsByClient(pMap);

      const cMap = {};
      (comms||[]).forEach(c => {
        const key=(c.cliente||"").toLowerCase().trim();
        if (key) { if (!cMap[key]) cMap[key]=[]; cMap[key].push(c); }
      });
      setCommesseByClient(cMap);

    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const getProjects = (c) => projectsByClient[(c.full_name||"").toLowerCase().trim()] || [];
  const getCommesse = (c) => commesseByClient[(c.full_name||"").toLowerCase().trim()] || [];

  const handleAdd = async e => {
    e.preventDefault(); setFormError(""); if (!newContact.full_name.trim()) return; setSaving(true);
    const dup = contacts.some(c=>(c.full_name||"").toLowerCase()===newContact.full_name.trim().toLowerCase());
    if (dup) { setFormError("Cliente già presente."); setSaving(false); return; }
    const { data, error:iErr } = await supabase.from("global_contacts").insert({
      full_name:newContact.full_name.trim(), company:newContact.company.trim()||null, studio:studioId,
    }).select("*").single();
    if (iErr) { alert("ERRORE INSERT: " + JSON.stringify(iErr)); setFormError(iErr.message); setSaving(false); return; }
    if (!data) { alert("data è null dopo insert — studioId: " + studioId); }
    setAddModalOpen(false); setNewContact({full_name:"",company:""}); setSaving(false);
    if (data) {
      setContacts(p=>[...p,data].sort((a,b)=>a.full_name.localeCompare(b.full_name)));
    } else {
      await loadAll();
    }
  };

  const handleDelete = async id => {
    if (!confirm("Eliminare questo cliente?")) return;
    const { error:dErr } = await supabase.from("global_contacts").delete().eq("id",id);
    if (dErr) alert("Errore: "+dErr.message);
    else { setContacts(p=>p.filter(c=>c.id!==id)); if (expandedId===id) setExpandedId(null); }
  };

  const inputSt = { width:'100%', padding:'8px 12px', boxSizing:'border-box', border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm, background:T.surface, color:T.ink, fontSize:13, fontFamily:"'Space Grotesk', sans-serif", outline:'none' };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.muted}}>Caricamento...</div>
  );

  const filtered = searchQuery.trim()
    ? contacts.filter(c => {
        const q = (searchQuery).toLowerCase().trim();
        return (c.full_name||"").toLowerCase().includes(q) || (c.company||"").toLowerCase().includes(q);
      })
    : contacts;

  return (
    <div>

      {/* Header */}
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:10}}>
          <div>
            <div style={{fontSize:22,fontWeight:600,color:T.ink,letterSpacing:'-0.03em',marginBottom:3}}>Clienti</div>
            <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted}}>
              {filtered.length !== contacts.length ? `${filtered.length} di ${contacts.length} clienti` : `${contacts.length} clienti`}
            </div>
          </div>
          <BtnPrimary onClick={()=>{ setFormError(""); setAddModalOpen(true); }}>+ Aggiungi</BtnPrimary>
        </div>
        {/* Search — full width su mobile */}
        <div style={{position:'relative'}}>
          <svg style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',width:13,height:13,color:T.muted,pointerEvents:'none'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text" placeholder="Cerca cliente..."
            value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
            style={{width:'100%',boxSizing:'border-box',padding:'7px 28px 7px 28px',border:`0.5px solid ${T.borderMd}`, borderRadius: T.radiusSm,background:T.surface,color:T.ink,fontSize:12,fontFamily:"'IBM Plex Mono', monospace",outline:'none'}}
          />
          {searchQuery && (
            <button onClick={()=>setSearchQuery("")} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:15,lineHeight:1,padding:0}}>×</button>
          )}
        </div>
      </div>

      {error && <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.red,marginBottom:14}}>{error}</div>}

      {contacts.length===0 ? (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, padding:'48px 0',textAlign:'center'}}>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.muted,lineHeight:1.8}}>
            Nessun cliente ancora.<br/>
            I clienti vengono salvati automaticamente quando crei un progetto o una commessa.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, padding:'32px 0',textAlign:'center',fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.muted}}>
          Nessun cliente trovato per "{searchQuery}"
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)',gap:8}}>
          {filtered.map(c => {
            const isOpen = expandedId===c.id;
            const projs  = getProjects(c);
            const comms  = getCommesse(c);
            const totale = comms.reduce((s,com)=>s+(Number(com.importo_offerta_base)||0),0);

            return (
              <div key={c.id} style={{background:T.surface,border:`0.5px solid ${isOpen?T.navy:T.border}`,transition:'border-color 0.1s',minWidth:0,overflow:'hidden'}}>

                {/* Riga cliente */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px'}}>
                  <button onClick={()=>setExpandedId(isOpen?null:c.id)}
                    style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0,background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
                    {/* Avatar */}
                    <div style={{width:36,height:36,borderRadius:'50%',flexShrink:0,background:isOpen?T.navy:T.bg,display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.1s'}}>
                      <span style={{fontSize:14}}>{c.company?'🏢':'👤'}</span>
                    </div>
                    {/* Testo */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:T.ink,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {c.full_name}
                      </div>
                      <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,marginTop:3,display:'flex',gap:10,flexWrap:'wrap'}}>
                        {c.company && <span>{c.company}</span>}
                        <span>{projs.length} {projs.length===1?'progetto':'progetti'}</span>
                        <span>{comms.length} {comms.length===1?'commessa':'commesse'}</span>
                        {totale>0 && <span style={{color:T.navy,fontWeight:500}}>{currency(totale)}</span>}
                      </div>
                    </div>
                    <span style={{fontSize:10,color:T.muted,marginLeft:8,flexShrink:0}}>{isOpen?'▲':'▼'}</span>
                  </button>

                  {/* Elimina */}
                  <button onClick={()=>handleDelete(c.id)}
                    style={{background:'none',border:`0.5px solid ${T.red}`, borderRadius: T.radiusSm,padding:'4px 10px',cursor:'pointer',fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.red,marginLeft:12,flexShrink:0}}>
                    Elimina
                  </button>
                </div>

                {/* Pannello espanso */}
                {isOpen && (
                  <div style={{borderTop:`0.5px solid ${T.border}`,padding:'14px 16px',background:T.bg}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>

                      {/* Progetti */}
                      <div>
                        <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:T.muted,marginBottom:8}}>
                          Progetti ({projs.length})
                        </div>
                        {projs.length===0 ? (
                          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted}}>Nessun progetto</div>
                        ) : (
                          <div style={{display:'flex',flexDirection:'column',gap:4}}>
                            {projs.map(p=>(
                              <button key={p.id} onClick={()=>navigate(`/progetti/${p.id}`)}
                                style={{display:'block',width:'100%',padding:'8px 12px',background:T.surface,border:`1px solid ${T.border}`,borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, cursor:'pointer',textAlign:'left',transition:'border-color 0.1s'}}
                                onMouseEnter={e=>e.currentTarget.style.borderColor=T.navy}
                                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}
                              >
                                <div style={{fontSize:12,fontWeight:600,color:T.ink}}>{p.name}</div>
                                <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,marginTop:2,textTransform:'uppercase',letterSpacing:'0.05em'}}>{p.status||"—"}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Commesse */}
                      <div>
                        <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:T.muted,marginBottom:8}}>
                          Commesse ({comms.length})
                        </div>
                        {comms.length===0 ? (
                          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted}}>Nessuna commessa</div>
                        ) : (
                          <div style={{display:'flex',flexDirection:'column',gap:4}}>
                            {comms.map(com=>(
                              <button key={com.id} onClick={()=>navigate(`/commesse/${com.id}`)}
                                style={{display:'block',width:'100%',padding:'8px 12px',background:T.surface,border:`1px solid ${T.border}`,borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, cursor:'pointer',textAlign:'left',transition:'border-color 0.1s'}}
                                onMouseEnter={e=>e.currentTarget.style.borderColor=T.navy}
                                onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}
                              >
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                                  <div style={{fontSize:12,fontWeight:600,color:T.ink,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{com.nome_commessa}</div>
                                  <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.navy,flexShrink:0,fontWeight:500}}>{currency(com.importo_offerta_base)}</div>
                                </div>
                                {com.numero_offerta && (
                                  <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,marginTop:2}}>{com.numero_offerta}</div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal aggiungi cliente */}

      {addModalOpen && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(14,14,13,0.5)',padding:16}}>
          <div style={{width:'100%',maxWidth:400,background:T.glassBg,backdropFilter:T.blur,WebkitBackdropFilter:T.blur,border:`1px solid ${T.glassBorder}`,borderRadius: T.radius, boxShadow: T.shadowLg, padding:28}}>
            <div style={{fontSize:15,fontWeight:600,color:T.ink,marginBottom:4}}>Aggiungi Cliente</div>
            <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted,marginBottom:20}}>
              I clienti si aggiungono anche automaticamente dai progetti e commesse
            </div>
            <form onSubmit={handleAdd} style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <FieldLabel>Nome *</FieldLabel>
                <input type="text" placeholder="Nome cliente o azienda" value={newContact.full_name}
                  onChange={e=>setNewContact({...newContact,full_name:e.target.value})}
                  required autoFocus style={inputSt}/>
              </div>
              <div>
                <FieldLabel>Ragione sociale / Azienda</FieldLabel>
                <input type="text" placeholder="Opzionale" value={newContact.company}
                  onChange={e=>setNewContact({...newContact,company:e.target.value})}
                  style={inputSt}/>
              </div>
              {formError && <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.red}}>{formError}</div>}
              <div style={{height:'0.5px',background:T.border,margin:'4px 0'}}/>
              <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                <BtnGhost onClick={()=>{ setAddModalOpen(false); setNewContact({full_name:"",company:""}); setFormError(""); }} disabled={saving}>Annulla</BtnGhost>
                <BtnPrimary type="submit" disabled={saving||!newContact.full_name.trim()}>{saving?"Salvataggio...":"Aggiungi"}</BtnPrimary>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
