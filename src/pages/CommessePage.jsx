import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitleOnMount } from "../hooks/usePageTitle";
import { usePermissions } from "../hooks/usePermissions";
import { usePlan } from "../hooks/usePlan";
import { useStudio } from "../hooks/useStudio";
import { supabase } from "../lib/supabase";
import { calcolaIncassato } from "../lib/utils";
import { useTheme } from '../contexts/ThemeContext';
import { useIsMobile } from "../hooks/useIsMobile";
import { useEscKey } from "../hooks/useEscKey";

function currency(v) {
  return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(Number(v)||0);
}

// ── UI PRIMITIVI ─────────────────────────────────────────────────
function BtnPrimary({ children, onClick, disabled, type="button", style={} }) {
  const { T } = useTheme();
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="asm-btn" style={{
      background:T.navy,color:T.bg,border:'none',
      fontFamily:"'IBM Plex Mono', monospace",fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',
      padding:'8px 18px',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.6:1,borderRadius:T.radiusSm,...style,
    }}>{children}</button>
  );
}
function BtnGhost({ children, onClick, disabled, danger, style={} }) {
  const { T } = useTheme();
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      background:'transparent',border:`0.5px solid ${danger?T.red:T.borderMd}`,color:danger?T.red:T.ink,
      fontFamily:"'IBM Plex Mono', monospace",fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',
      padding:'8px 18px',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,...style,
    }}>{children}</button>
  );
}
function FieldLabel({ children }) {
  const { T } = useTheme();
  return <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:T.muted,marginBottom:6}}>{children}</div>;
}
function Input({ value, onChange, type="text", placeholder, required, style={} }) {
  const { T } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
      style={{width:'100%',padding:'8px 12px',boxSizing:'border-box',border:`0.5px solid ${focus?T.navy:T.border}`,background:T.surface,color:T.ink,fontSize:13,fontFamily:"'Space Grotesk', sans-serif",outline:'none',borderRadius:T.radiusSm,...style}}/>
  );
}
function Divider() {
  const { T } = useTheme();
  return <div style={{height:'0.5px',background:T.border,margin:'16px 0'}}/>;
}
function ScrollBox({ children, maxHeight=150 }) {
  const { T } = useTheme();
  return <div style={{border:`1px solid ${T.border}`,background:T.bg,padding:'8px 12px',maxHeight,overflowY:'auto'}}>{children}</div>;
}
function CheckRow({ checked, onChange, label }) {
  const { T } = useTheme();
  return (
    <label style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',cursor:'pointer'}}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{accentColor:T.navy,width:13,height:13}}/>
      <span style={{fontSize:12,color:T.ink,fontFamily:"'Space Grotesk', sans-serif"}}>{label}</span>
    </label>
  );
}

// ── COMMESSA CARD ─────────────────────────────────────────────────
function CommessaCard({ commessa, incassato, onClick, onArchive, onDelete }) {
  const { T } = useTheme();
  const isMobile = useIsMobile();
  const base=Number(commessa.importo_offerta_base)||0, pagato=incassato||0, residuo=base-pagato;
  const pct=base>0?Math.min(100,Math.round((pagato/base)*100)):0;
  const [hover,setHover]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const menuRef=useRef(null);
  useEffect(()=>{
    function h(e){ if(menuRef.current&&!menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  },[]);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      className="asm-card" style={{background:hover?T.surface2:T.surface,border:`1px solid ${T.border}`,padding:'18px 20px',cursor:'pointer',transition:'background 0.12s',position:'relative',display:'flex',flexDirection:'column',height:'100%',borderRadius:T.radius,backdropFilter:T.blurSm,WebkitBackdropFilter:T.blurSm,boxShadow:T.shadow}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div onClick={onClick} style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:4}}>{commessa.numero_offerta||"—"}</div>
          <div style={{fontSize:14,fontWeight:600,color:T.ink,letterSpacing:'-0.01em'}}>{commessa.nome_commessa||"Commessa senza nome"}</div>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted,marginTop:2}}>{commessa.cliente||"—"}</div>
        </div>
        <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
          <div onClick={onClick} style={{textAlign:'right'}}>
            <div style={{fontSize:18,fontWeight:600,color:T.ink,letterSpacing:'-0.03em'}}>{currency(base)}</div>
            <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,marginTop:2}}>offerta base</div>
          </div>
          <div ref={menuRef} style={{position:'relative',flexShrink:0}}>
            <button onClick={e=>{e.stopPropagation();setMenuOpen(p=>!p);}} style={{background:'none',border:`0.5px solid ${T.borderMd}`,cursor:'pointer',color:T.muted,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,lineHeight:1}}>···</button>
            {menuOpen&&(
              <div style={{position:'absolute',right:0,top:'100%',zIndex:20,background:T.glassBg,backdropFilter:T.blur,WebkitBackdropFilter:T.blur,border:`1px solid ${T.glassBorder}`,minWidth:160,boxShadow:T.shadowMd,borderRadius:12}}>
                <button onClick={async e=>{e.stopPropagation();setMenuOpen(false);if(!confirm('Archiviare questa commessa?'))return;await onArchive(commessa.id);}} style={{display:'flex',alignItems:'center',width:'100%',padding:'7px 10px',background:'none',border:'none',cursor:'pointer',color:T.muted,fontFamily:"'Space Grotesk',sans-serif",fontSize:13,textAlign:'left'}}>
                  Archivia
                </button>
                <button onClick={async e=>{e.stopPropagation();setMenuOpen(false);if(!confirm('Eliminare questa commessa? Verrà spostata nel cestino.'))return;await onDelete(commessa.id);}} style={{display:'flex',alignItems:'center',width:'100%',padding:'7px 10px',background:'none',border:'none',cursor:'pointer',color:'#ff453a',fontFamily:"'Space Grotesk',sans-serif",fontSize:13,textAlign:'left'}}>
                  Elimina
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{height:2,background:T.border,marginBottom:10}}>
        <div style={{height:2,background:T.navy,width:`${pct}%`,transition:'width 0.3s'}}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'1fr 1fr 1fr',gap:8,marginTop:'auto'}}>
        {[
          {label:'Pagato',value:currency(pagato),color:T.green},
          {label:'Residuo',value:currency(residuo),color:residuo>0?T.navy:T.muted},
          {label:'Data',value:commessa.data_commessa?new Date(commessa.data_commessa).toLocaleDateString('it-IT'):'—',color:T.muted},
        ].map(({label,value,color})=>(
          <div key={label}>
            <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:8,letterSpacing:'0.2em',textTransform:'uppercase',color:T.muted,marginBottom:2}}>{label}</div>
            <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:11,fontWeight:500,color}}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function CommessePage() {
  const { T } = useTheme();
  usePageTitleOnMount("Commesse");
  const navigate = useNavigate();
  const { studioId, studioLoading, teamMember } = useStudio();
  const permissions = usePermissions();
  const { plan, canAddCommessa } = usePlan();

  const [commesse, setCommesse]         = useState([]);
  const [incassatoMap, setIncassatoMap] = useState({});
  const [annoFiltro, setAnnoFiltro]     = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery]   = useState("");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  // Modal state
  const [modalOpen, setModalOpen]       = useState(false);
  useEscKey(() => setModalOpen(false), modalOpen);
  const [step, setStep]                 = useState(1); // 1=commessa, 2=progetto
  const [saving, setSaving]             = useState(false);
  const [formError, setFormError]       = useState("");

  // Step 1 — dati commessa
  const [clientInput, setClientInput]   = useState("");
  const [clientSugg, setClientSugg]     = useState([]);
  const [globalContacts, setGlobalContacts] = useState([]);
  const [formData, setFormData]         = useState({
    numero_offerta:"", nome_commessa:"", data_commessa:"", importo_offerta_base:"", note_amministrative:"",
  });

  // Step 2 — progetto
  const [projectMode, setProjectMode]   = useState("none"); // "none" | "existing" | "new"
  const [freeProjects, setFreeProjects] = useState([]); // senza commessa
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [serviceTemplates, setServiceTemplates]   = useState([]);
  const [teamMembers, setTeamMembers]   = useState([]);
  const [newProjectData, setNewProjectData] = useState({
    name:"", address:"", startDate:"", selectedServices:[], selectedMembers:[],
  });

  const loadData = async () => {
    if (!studioId) return;
    setLoading(true); setError("");
    try {
      const { data, error:dErr } = await supabase.from("commesse").select("*").eq("studio",studioId).eq("archived",false).is("deleted_at",null).order("created_at",{ascending:false});
      if (dErr) throw dErr;
      setCommesse(data??[]);
      const ids=(data??[]).map(c=>c.id);
      if (ids.length>0) { const map=await calcolaIncassato(ids,studioId,supabase); setIncassatoMap(map); }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadContacts = async () => {
    if (!studioId) return;
    const { data } = await supabase.from("global_contacts").select("id,full_name").eq("studio",studioId).order("full_name",{ascending:true});
    setGlobalContacts(data??[]);
  };

  // Carica progetti SENZA commessa già collegata
  const loadFreeProjects = async () => {
    if (!studioId) return;
    const { data } = await supabase.from("projects").select("id,name,client,commessa_id")
      .eq("studio",studioId).eq("archived",false).is("commessa_id",null).order("name",{ascending:true});
    setFreeProjects(data??[]);
  };

  const loadTemplatesAndMembers = async () => {
    if (!studioId) return;
    const [{ data:svc }, { data:mbr }] = await Promise.all([
      supabase.from("service_task_templates").select("*").eq("studio",studioId).order("order",{ascending:true}),
      supabase.from("team_members").select("id,user_name,user_email,color").eq("studio",studioId).order("user_name",{ascending:true}),
    ]);
    setServiceTemplates(svc??[]);
    setTeamMembers(mbr??[]);
    // Pre-seleziona se stesso
    if (teamMember?.id) setNewProjectData(p=>({...p, selectedMembers:[teamMember.id]}));
  };

  useEffect(() => {
    if (studioId) { loadData(); loadContacts(); loadFreeProjects(); loadTemplatesAndMembers(); }
  }, [studioId]);

  const handleClientInput = e => {
    const val=e.target.value; setClientInput(val);
    const q=val.trim().toLowerCase();
    setClientSugg(q.length>=2?globalContacts.filter(c=>(c.full_name||"").toLowerCase().includes(q)).slice(0,6):[]);
  };

  const handleChange = field => e => setFormData(p=>({...p,[field]:e.target.value}));

  const upsertContact = async (fullName) => {
    if (!fullName?.trim()) return;
    const exists=globalContacts.some(c=>(c.full_name||"").toLowerCase()===fullName.trim().toLowerCase());
    if (!exists) {
      const { data } = await supabase.from("global_contacts").insert({full_name:fullName.trim(),studio:studioId,company:''}).select("id,full_name").single();
      if (data) setGlobalContacts(prev=>[...prev,data].sort((a,b)=>a.full_name.localeCompare(b.full_name)));
    }
  };

  const goStep2 = e => {
    e.preventDefault();
    const cliente=clientInput.trim();
    if (!formData.nome_commessa||!cliente) { setFormError("Nome commessa e cliente sono obbligatori."); return; }
    setFormError(""); setStep(2);
  };

  const handleSave = async e => {
    e.preventDefault(); setFormError(""); setSaving(true);
    if (!canAddCommessa(commesse.length)) {
      setFormError(`Piano ${plan.name}: hai raggiunto il limite di ${plan.maxCommesse} commesse attive. Archivia le commesse completate o fai l'upgrade.`);
      setSaving(false);
      return;
    }
    const cliente=clientInput.trim();

    // 1. Crea commessa
    const payload = {
      numero_offerta:formData.numero_offerta.trim()||null,
      nome_commessa:formData.nome_commessa.trim(),
      cliente,
      data_commessa:formData.data_commessa||null,
      importo_offerta_base:Number(formData.importo_offerta_base)||0,
      note_amministrative:formData.note_amministrative.trim()||null,
      studio:studioId,
    };
    await upsertContact(cliente);
    const { data:newC, error:iErr } = await supabase.from("commesse").insert(payload).select("*").single();
    if (iErr) { setFormError(iErr.message); setSaving(false); return; }

    // 2. Gestisci progetto
    if (projectMode==="existing" && selectedProjectId) {
      await supabase.from("commesse").update({project_id:selectedProjectId}).eq("id",newC.id);
      await supabase.from("projects").update({commessa_id:newC.id}).eq("id",selectedProjectId);

    } else if (projectMode==="new") {
      if (!newProjectData.name.trim()) { setFormError("Il nome del progetto è obbligatorio."); setSaving(false); return; }
      const assignedUsers=newProjectData.selectedMembers.length>0?newProjectData.selectedMembers:(teamMember?.id?[teamMember.id]:[]);
      const projectPayload = {
        name:newProjectData.name.trim(),
        client:cliente,
        address:newProjectData.address.trim()||null,
        start_date:newProjectData.startDate||null,
        status:"planning", total_hours:0,
        servizi_selezionati:newProjectData.selectedServices,
        assigned_users:assignedUsers,
        studio:studioId,
        commessa_id:newC.id,
      };
      const { data:newP, error:pErr } = await supabase.from("projects").insert(projectPayload).select("*").single();
      if (pErr) { setFormError("Commessa creata, ma errore nel progetto: "+pErr.message); setSaving(false); return; }
      await supabase.from("commesse").update({project_id:newP.id}).eq("id",newC.id);

      // Crea task predefinite
      const taskInserts=[];
      for (const svcName of newProjectData.selectedServices) {
        const svc=serviceTemplates.find(s=>s.service_name===svcName);
        if (svc?.task_templates?.length>0) {
          svc.task_templates.forEach(title=>{
            taskInserts.push({project_id:newP.id,title,categoria:svcName,status:'todo',studio:studioId});
          });
        }
      }
      if (taskInserts.length>0) await supabase.from("tasks").insert(taskInserts);
    }

    // Reset
    resetModal();
    await loadData();
    await loadFreeProjects();
    setSaving(false);
    navigate(`/commesse/${newC.id}`);
  };

  const resetModal = () => {
    setModalOpen(false); setStep(1); setFormError("");
    setClientInput(""); setClientSugg([]);
    setFormData({numero_offerta:"",nome_commessa:"",data_commessa:"",importo_offerta_base:"",note_amministrative:""});
    setProjectMode("none"); setSelectedProjectId("");
    setNewProjectData({name:"",address:"",startDate:"",selectedServices:[],selectedMembers:teamMember?.id?[teamMember.id]:[]});
  };

  const toggleService = name => setNewProjectData(p=>({...p,selectedServices:p.selectedServices.includes(name)?p.selectedServices.filter(s=>s!==name):[...p.selectedServices,name]}));
  const toggleMember  = id   => {
    if (id===teamMember?.id) return; // non deselezionabile se stessi
    setNewProjectData(p=>({...p,selectedMembers:p.selectedMembers.includes(id)?p.selectedMembers.filter(x=>x!==id):[...p.selectedMembers,id]}));
  };

  const selectSt={width:'100%',padding:'8px 12px',border:`0.5px solid ${T.borderMd}`,background:T.surface,color:T.ink,fontSize:13,fontFamily:"'Space Grotesk', sans-serif",outline:'none'};
  const radioBtnSt=(active)=>({
    display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
    border:`0.5px solid ${active?T.navy:T.border}`,
    background:active?T.navyLight:T.surface,cursor:'pointer',marginBottom:6,width:'100%',textAlign:'left',
  });

  if (studioLoading||!studioId) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:240,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.muted}}>Caricamento...</div>
  );

  return (
    <div>
      {/* Header */}
      {/* Anno filtro + header */}
      {(() => {
        const anniDisponibili = Array.from(new Set([
          new Date().getFullYear(),
          ...commesse.map(c => c.data_commessa || c.created_at).filter(Boolean).map(d => new Date(d).getFullYear())
        ])).sort((a,b) => b-a);

        const q = searchQuery.trim().toLowerCase();
        const commesseFiltrate = q
          ? commesse.filter(c =>
              (c.nome_commessa || "").toLowerCase().includes(q) ||
              (c.cliente || "").toLowerCase().includes(q) ||
              (c.numero_offerta || "").toLowerCase().includes(q)
            )
          : annoFiltro === 0
            ? commesse
            : commesse.filter(c => {
                const d = c.data_commessa || c.created_at;
                return d && new Date(d).getFullYear() === annoFiltro;
              });

        return (<>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <div style={{fontSize:22,fontWeight:600,letterSpacing:'-0.03em',color:T.ink}}>Commesse</div>
          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted,marginTop:2}}>
            {commesseFiltrate.length} commesse · {currency(commesseFiltrate.reduce((s,c)=>s+(Number(c.importo_offerta_base)||0),0))} totale offerte
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <input
            type="text"
            placeholder="Cerca commessa, cliente..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{padding:'5px 10px',border:`0.5px solid ${T.borderMd}`,background:T.surface,color:T.ink,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,outline:'none',width:200}}
          />
          <select value={annoFiltro} onChange={e=>setAnnoFiltro(Number(e.target.value))}
            style={{padding:'4px 8px',border:`0.5px solid ${T.borderMd}`,background:T.surface,color:T.ink,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,cursor:'pointer',outline:'none',appearance:'auto',opacity:searchQuery?0.4:1}}>
            <option value={0}>Tutti gli anni</option>
            {anniDisponibili.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          {permissions.canManageCommesse && (
            <BtnPrimary onClick={()=>setModalOpen(true)}>+ Nuova</BtnPrimary>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{textAlign:'center',padding:64,fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.muted}}>Caricamento...</div>
      ) : error ? (
        <div style={{border:`1px solid ${T.border}`,background:T.surface,padding:32,color:T.red,fontSize:13}}>Errore: {error}</div>
      ) : commesseFiltrate.length===0 ? (
        <div style={{border:`1px solid ${T.border}`,background:T.surface,padding:48,textAlign:'center',fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.muted}}>{searchQuery ? `Nessuna commessa trovata per "${searchQuery}".` : `Nessuna commessa per ${annoFiltro || 'questo filtro'}.`}</div>
      ) : (
        <div className="asm-list asm-fade-in" style={{display:'grid',gridTemplateColumns:window.innerWidth < 768 ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',gap:10}}>
          {commesseFiltrate.map(c=>(
            <CommessaCard key={c.id} commessa={c} incassato={incassatoMap[c.id]||0} onClick={()=>navigate(`/commesse/${c.id}`)} onArchive={async(id)=>{ await supabase.from('commesse').update({archived:true}).eq('id',id); await loadData(); }} onDelete={async(id)=>{ const {error}=await supabase.rpc('elimina_commessa',{p_commessa_id:id}); if(error){alert('Errore: '+error.message);return;} await loadData(); }}/>
          ))}
        </div>
      )}
        </>);
      })()}

      {/* ── MODAL NUOVA COMMESSA ── */}
      {modalOpen && (
        <div className="asm-modal-bg" style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div className="asm-modal-content" style={{width:'100%',maxWidth:540,background:T.glassBg,backdropFilter:T.blur,WebkitBackdropFilter:T.blur,border:`1px solid ${T.glassBorder}`,boxShadow:T.shadowLg,borderRadius:T.radiusLg,padding:28,maxHeight:'90vh',overflowY:'auto'}}>

            {/* Header modal */}
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
              <div>
                <div style={{fontSize:16,fontWeight:600,color:T.ink,letterSpacing:'-0.02em'}}>Nuova Commessa</div>
                <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted,marginTop:4}}>
                  Step {step} di 2 — {step===1?"Dati commessa":"Progetto collegato"}
                </div>
              </div>
              <button onClick={()=>{if(!saving)resetModal();}} style={{background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:20,lineHeight:1,padding:0}}>×</button>
            </div>

            {/* ── STEP 1: Dati commessa ── */}
            {step===1 && (
              <form onSubmit={goStep2} style={{display:'flex',flexDirection:'column',gap:14}}>
                <div>
                  <FieldLabel>Numero offerta</FieldLabel>
                  <Input value={formData.numero_offerta} onChange={handleChange('numero_offerta')} placeholder="Es. 01/2026"/>
                </div>
                <div>
                  <FieldLabel>Nome commessa *</FieldLabel>
                  <Input value={formData.nome_commessa} onChange={handleChange('nome_commessa')} required/>
                </div>

                {/* Cliente autocomplete */}
                <div style={{position:'relative'}}>
                  <FieldLabel>Cliente *</FieldLabel>
                  <Input value={clientInput} onChange={handleClientInput} placeholder="Cerca o inserisci..." required/>
                  {clientSugg.length>0 && (
                    <div style={{position:'absolute',left:0,right:0,top:'100%',background:T.surface,border:`0.5px solid ${T.borderMd}`,borderRadius: T.radius, backdropFilter: T.blurSm, WebkitBackdropFilter: T.blurSm, boxShadow: T.shadow, zIndex:40,maxHeight:160,overflowY:'auto'}}>
                      {clientSugg.map(c=>(
                        <button key={c.id} type="button" onMouseDown={()=>{setClientInput(c.full_name);setClientSugg([]);}}
                          style={{display:'block',width:'100%',padding:'8px 12px',textAlign:'left',background:'none',border:'none',cursor:'pointer',fontSize:13,color:T.ink,fontFamily:"'Space Grotesk', sans-serif"}}
                          onMouseEnter={e=>e.currentTarget.style.background=T.bg}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                        >{c.full_name}</button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <FieldLabel>Data commessa</FieldLabel>
                  <Input type="date" value={formData.data_commessa} onChange={handleChange('data_commessa')}/>
                </div>
                <div>
                  <FieldLabel>Importo offerta base (€)</FieldLabel>
                  <Input type="number" value={formData.importo_offerta_base} onChange={handleChange('importo_offerta_base')} placeholder="0"/>
                </div>
                <div>
                  <FieldLabel>Note amministrative</FieldLabel>
                  <textarea value={formData.note_amministrative} onChange={handleChange('note_amministrative')} rows={3}
                    style={{width:'100%',padding:'8px 12px',boxSizing:'border-box',border:`0.5px solid ${T.borderMd}`,background:T.surface,color:T.ink,fontSize:13,fontFamily:"'Space Grotesk', sans-serif",outline:'none',resize:'vertical'}}/>
                </div>

                {formError && <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.red}}>{formError}</div>}
                <Divider/>
                <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
                  <BtnGhost onClick={resetModal} disabled={saving}>Annulla</BtnGhost>
                  <BtnPrimary type="submit">Avanti →</BtnPrimary>
                </div>
              </form>
            )}

            {/* ── STEP 2: Progetto ── */}
            {step===2 && (
              <form onSubmit={handleSave} style={{display:'flex',flexDirection:'column',gap:14}}>

                {/* Riepilogo commessa */}
                <div style={{background:T.bg,border:`1px solid ${T.border}`,padding:'10px 14px'}}>
                  <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,letterSpacing:'0.15em',marginBottom:4}}>COMMESSA</div>
                  <div style={{fontSize:13,fontWeight:600,color:T.ink}}>{formData.nome_commessa}</div>
                  <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted}}>{clientInput} · {currency(Number(formData.importo_offerta_base)||0)}</div>
                </div>

                {/* Scelta modalità progetto */}
                <div>
                  <FieldLabel>Progetto collegato</FieldLabel>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {[
                      {val:"none",     label:"Nessun progetto",          desc:"Crea solo la commessa"},
                      {val:"existing", label:"Collega progetto esistente", desc:`${freeProjects.length} disponibili`},
                      {val:"new",      label:"Crea nuovo progetto",       desc:"Crea e collega automaticamente"},
                    ].map(opt=>(
                      <button key={opt.val} type="button" onClick={()=>setProjectMode(opt.val)} style={radioBtnSt(projectMode===opt.val)}>
                        <div style={{width:14,height:14,borderRadius:'50%',border:`1.5px solid ${projectMode===opt.val?T.navy:T.borderMd}`,background:projectMode===opt.val?T.navy:'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          {projectMode===opt.val && <div style={{width:6,height:6,borderRadius:'50%',background:T.bg}}/>}
                        </div>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:projectMode===opt.val?T.navy:T.ink}}>{opt.label}</div>
                          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,marginTop:2}}>{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collega esistente */}
                {projectMode==="existing" && (
                  <div>
                    <FieldLabel>Seleziona progetto</FieldLabel>
                    {freeProjects.length===0 ? (
                      <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:10,color:T.muted,padding:'8px 0'}}>
                        Nessun progetto disponibile — tutti i progetti hanno già una commessa.
                      </div>
                    ) : (
                      <select value={selectedProjectId} onChange={e=>setSelectedProjectId(e.target.value)} style={selectSt}>
                        <option value="">— Scegli un progetto —</option>
                        {freeProjects.map(p=>(
                          <option key={p.id} value={p.id}>{p.name}{p.client?` — ${p.client}`:""}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Crea nuovo progetto */}
                {projectMode==="new" && (
                  <div style={{background:T.bg,border:`1px solid ${T.border}`,padding:'14px 16px',display:'flex',flexDirection:'column',gap:12}}>
                    <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:T.muted}}>Dati del nuovo progetto</div>
                    <div>
                      <FieldLabel>Nome progetto *</FieldLabel>
                      <Input value={newProjectData.name} onChange={e=>setNewProjectData(p=>({...p,name:e.target.value}))} placeholder={formData.nome_commessa||"Nome progetto"}/>
                    </div>
                    <div>
                      <FieldLabel>Indirizzo</FieldLabel>
                      <Input value={newProjectData.address} onChange={e=>setNewProjectData(p=>({...p,address:e.target.value}))} placeholder="Via, città..."/>
                    </div>
                    <div>
                      <FieldLabel>Data inizio</FieldLabel>
                      <Input type="date" value={newProjectData.startDate} onChange={e=>setNewProjectData(p=>({...p,startDate:e.target.value}))}/>
                    </div>
                    {serviceTemplates.length>0 && (
                      <div>
                        <FieldLabel>Servizi</FieldLabel>
                        <ScrollBox>
                          {serviceTemplates.map(s=>(
                            <CheckRow key={s.id} checked={newProjectData.selectedServices.includes(s.service_name)} onChange={()=>toggleService(s.service_name)} label={s.service_name}/>
                          ))}
                        </ScrollBox>
                        {newProjectData.selectedServices.length>0 && (
                          <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:9,color:T.muted,marginTop:6}}>
                            {newProjectData.selectedServices.reduce((tot,sn)=>{const s=serviceTemplates.find(x=>x.service_name===sn);return tot+(s?.task_templates?.length||0);},0)} task predefinite verranno create
                          </div>
                        )}
                      </div>
                    )}
                    {teamMembers.length>0 && (
                      <div>
                        <FieldLabel>Membri del team</FieldLabel>
                        <ScrollBox maxHeight={120}>
                          {teamMembers.map(m=>{
                            const isMe=m.id===teamMember?.id;
                            return (
                              <CheckRow key={m.id}
                                checked={newProjectData.selectedMembers.includes(m.id)}
                                onChange={()=>!isMe&&toggleMember(m.id)}
                                label={`${m.user_name||m.user_email}${isMe?' (tu)':''}`}
                              />
                            );
                          })}
                        </ScrollBox>
                      </div>
                    )}
                  </div>
                )}

                {formError && <div style={{fontFamily:"'IBM Plex Mono', monospace",fontSize:11,color:T.red}}>{formError}</div>}
                <Divider/>
                <div style={{display:'flex',justifyContent:'space-between',gap:10}}>
                  <BtnGhost onClick={()=>{setStep(1);setFormError("");}}>← Indietro</BtnGhost>
                  <div style={{display:'flex',gap:10}}>
                    <BtnGhost onClick={resetModal} disabled={saving}>Annulla</BtnGhost>
                    <BtnPrimary type="submit" disabled={saving||(projectMode==="existing"&&freeProjects.length>0&&!selectedProjectId)||(projectMode==="new"&&!newProjectData.name.trim())}>
                      {saving?"Salvataggio...":"Salva commessa"}
                    </BtnPrimary>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
