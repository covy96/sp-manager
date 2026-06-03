import React from 'react';
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStudio } from "../hooks/useStudio";
import { usePermissions } from "../hooks/usePermissions";
import { usePlan } from "../hooks/usePlan";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";

const Icon = ({ d, size=24 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d}/>
  </svg>
);

const ICONS = {
  scrivania:   "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  progetti:    "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  commesse:    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  timesheet:   "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  menu:        "M4 6h16M4 12h16M4 18h16",
  dashboard:   "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  calendario:  "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  offerte:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  team:        "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  monitoraggio:"M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  proforma:    "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  fatture:     "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  report:      "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  gantt:       "M4 6h16M4 10h10M4 14h12M4 18h8",
  analisi:     "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16",
  settings:    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  logout:      "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  profilo:     "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  piano:       "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  cestino:     "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  esporta:     "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  aspetto:     "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
};

const TAB_ITEMS = [
  { label:'Scrivania', path:'/scrivania',  icon:'scrivania'  },
  { label:'Progetti',  path:'/progetti',   icon:'progetti'   },
  { label:'Commesse',  path:'/commesse',   icon:'commesse'   },
  { label:'Timesheet', path:'/timesheet',  icon:'timesheet'  },
  { label:'Menu',      path:null,          icon:'menu'       },
];

// Menu sections — stesso ordine e raggruppamento della sidebar desktop
const MENU_SECTIONS = [
  {
    title: 'Principale',
    items: [
      { label:'Dashboard',  path:'/dashboard',    icon:'dashboard',  roles:'all', minPlan:'free' },
      { label:'Scrivania',  path:'/scrivania',    icon:'scrivania',  roles:'all', minPlan:'free' },
      { label:'Timesheet',  path:'/timesheet',    icon:'timesheet',  roles:'all', minPlan:'free' },
    ],
  },
  {
    title: 'Lavoro',
    items: [
      { label:'Progetti',     path:'/progetti',               icon:'progetti',     roles:'all', minPlan:'free'   },
      { label:'Offerte',      path:'/offerte',                icon:'offerte',      roles:'pm',  minPlan:'studio' },
      { label:'Commesse',     path:'/commesse',               icon:'commesse',     roles:'all', minPlan:'free'   },
      { label:'Monitoraggio', path:'/monitoraggio-commesse',  icon:'monitoraggio', roles:'pm',  minPlan:'studio' },
      { label:'Proforma',     path:'/proforma',               icon:'proforma',     roles:'pm',  minPlan:'studio' },
      { label:'Fatture',      path:'/fatture',                icon:'fatture',      roles:'pm',  minPlan:'studio' },
    ],
  },
  {
    title: 'Studio',
    items: [
      { label:'Team',    path:'/team',            icon:'team',    roles:'all', minPlan:'studio' },
      { label:'Report',  path:'/report',          icon:'report',  roles:'pm',  minPlan:'studio' },
      { label:'Gantt',   path:'/gantt-progetti',  icon:'gantt',   roles:'pm',  minPlan:'studio' },
      { label:'Analisi', path:'/analisi',         icon:'analisi', roles:'owner', minPlan:'free' },
    ],
  },
];

const PLAN_ORDER = { free:0, studio:1, pro:2 };

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  componentDidCatch(error) { this.setState({ error }); }
  render() {
    if (this.state.error) return (
      <div style={{ padding:20, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:'#f87171' }}>
        Errore: {this.state.error.message}
      </div>
    );
    return this.props.children;
  }
}

export default function MobileLayout({ session, children }) {
  const navigate    = useNavigate();
  const loc         = useLocation();
  const { teamMember, studioId } = useStudio();
  const permissions = usePermissions();
  const { isFree, plan }  = usePlan();
  const currentPlanLevel = PLAN_ORDER[plan?.id || 'free'];
  const { T, theme, setTheme, isDark } = useTheme();

  const isAllowed = (item) => {
    if (item.roles === 'owner' && !permissions.isOwner) return false;
    if (item.roles === 'pm' && !permissions.isProjectManager) return false;
    const required = PLAN_ORDER[item.minPlan] ?? 0;
    return currentPlanLevel >= required;
  };

  const [menuOpen, setMenuOpen]         = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [studioName, setStudioName]     = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { query, setQuery, results, loading:searchLoading, clear } = useGlobalSearch(studioId);
  const searchRef   = useRef(null);
  const settingsRef = useRef(null);

  useEffect(()=>{
    if (!studioId) return;
    supabase.from("studios").select("name").eq("id",studioId).single()
      .then(({data})=>{ if(data?.name) setStudioName(data.name); });
  },[studioId]);

  useEffect(()=>{
    function h(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', h);
    return ()=>document.removeEventListener('mousedown', h);
  }, []);

  // Close menu on navigation
  useEffect(()=>{ setMenuOpen(false); }, [loc.pathname]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };
  const handleResultClick = (item) => {
    clear(); setSearchOpen(false);
    if (item.path) navigate(item.path);
    else if (item.projectId) navigate(`/progetti/${item.projectId}`);
  };

  const getInitials = (name='') => name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');
  const avatarInitials = getInitials(teamMember?.user_name || session?.user?.email || 'U');
  const memberColor    = teamMember?.color || T.navy;

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:T.bg, color:T.ink, fontFamily:"'Space Grotesk', sans-serif", transition:'background 0.2s, color 0.2s' }}>

      {/* ── HEADER — altezza 52px + safe-area-inset-top per notch iOS ── */}
      <header style={{ position:'sticky', top:0, zIndex:40, display:'flex', alignItems:'flex-end', justifyContent:'space-between', minHeight:52, paddingTop:'max(12px, env(safe-area-inset-top))', paddingBottom:10, paddingLeft:16, paddingRight:16, background:T.sidebarBg, boxShadow:'0 1px 0 rgba(0,0,0,0.15)' }}>
        <button onClick={()=>navigate('/dashboard')} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
          <div style={{ fontSize:15, fontWeight:700, letterSpacing:'-0.02em', color:'#EEF1F6' }}>{studioName||'SP Manager'}</div>
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={()=>setSearchOpen(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(238,241,246,0.7)', padding:8, minWidth:40, minHeight:40, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={20}/>
          </button>

          {/* Avatar + settings */}
          <div ref={settingsRef} style={{ position:'relative' }}>
            <button onClick={()=>setSettingsOpen(!settingsOpen)} style={{ width:34, height:34, borderRadius:'50%', background:memberColor, border:'2px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer' }}>
              {avatarInitials}
            </button>

            {settingsOpen && (
              <div style={{ position:'fixed', top:'calc(max(12px, env(safe-area-inset-top)) + 58px)', right:8, left:8, maxWidth:360, margin:'0 auto', background:T.surface, border:`0.5px solid ${T.borderMd}`, zIndex:50, boxShadow:`0 8px 24px rgba(0,0,0,${isDark?'0.5':'0.15'})`, borderRadius:14, maxHeight:'80vh', overflowY:'auto' }}>
                {/* User info */}
                <div style={{ padding:'14px 16px', borderBottom:`0.5px solid ${T.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:memberColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
                      {avatarInitials}
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:T.ink }}>{teamMember?.user_name||'Utente'}</div>
                      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:1 }}>{session?.user?.email}</div>
                    </div>
                  </div>
                </div>

                {/* Account */}
                <div style={{ padding:'6px 0' }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, padding:'4px 16px 6px' }}>Account</div>
                  {[
                    { label:'Piano',   icon:'piano',   path:'/impostazioni/piano'   },
                    { label:'Profilo', icon:'profilo', path:'/impostazioni/profilo' },
                  ].map(item=>(
                    <button key={item.path} onClick={()=>{ navigate(item.path); setSettingsOpen(false); }}
                      style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 16px', background:'none', border:'none', cursor:'pointer', fontSize:14, color:T.ink, fontFamily:"'Space Grotesk', sans-serif", textAlign:'left' }}>
                      <Icon d={ICONS[item.icon]} size={16}/>
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Studio */}
                <div style={{ padding:'6px 0', borderTop:`0.5px solid ${T.border}` }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, padding:'4px 16px 6px' }}>Studio</div>
                  {[
                    { label:'Profilo Studio', icon:'settings', path:'/impostazioni/profilo-studio' },
                    { label:'Aspetto',        icon:'aspetto',  path:'/impostazioni/aspetto'        },
                    { label:'Clienti',        icon:'profilo',  path:'/impostazioni/clienti'        },
                    { label:'Servizi',        icon:'settings', path:'/impostazioni/servizi'        },
                    { label:'Notifiche',      icon:'settings', path:'/impostazioni/notifiche'      },
                    { label:'Esporta dati',   icon:'esporta',  path:'/impostazioni/esporta'        },
                    { label:'Cestino',        icon:'cestino',  path:'/impostazioni/cestino'        },
                  ].map(item=>(
                    <button key={item.path} onClick={()=>{ navigate(item.path); setSettingsOpen(false); }}
                      style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 16px', background:'none', border:'none', cursor:'pointer', fontSize:14, color:T.ink, fontFamily:"'Space Grotesk', sans-serif", textAlign:'left' }}>
                      <Icon d={ICONS[item.icon]} size={16}/>
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Azioni */}
                <div style={{ padding:'6px 0', borderTop:`0.5px solid ${T.border}` }}>
                  <button onClick={()=>{ setSettingsOpen(false); navigate('/onboarding'); }}
                    style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 16px', background:'none', border:'none', cursor:'pointer', fontSize:14, color:T.ink, fontFamily:"'Space Grotesk', sans-serif", textAlign:'left' }}>
                    <Icon d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" size={16}/>
                    Cambia studio
                  </button>
                  <button onClick={handleLogout}
                    style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 16px', background:'none', border:'none', cursor:'pointer', fontSize:14, color:T.red, fontFamily:"'Space Grotesk', sans-serif", textAlign:'left' }}>
                    <Icon d={ICONS.logout} size={16}/>
                    Esci
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── SEARCH OVERLAY ── */}
      {searchOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:60, background:T.sidebarBg, display:'flex', flexDirection:'column' }}>
          <div style={{ paddingTop:'max(12px, env(safe-area-inset-top))', paddingBottom:12, paddingLeft:16, paddingRight:16, display:'flex', alignItems:'center', gap:12, borderBottom:`0.5px solid rgba(255,255,255,0.1)` }}>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'0 12px' }}>
              <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={18}/>
              <input ref={searchRef} autoFocus type="text" placeholder="Cerca progetti, task, commesse..." value={query} onChange={e=>setQuery(e.target.value)}
                style={{ flex:1, padding:'10px 0', background:'none', border:'none', color:'#EEF1F6', fontSize:15, fontFamily:"'Space Grotesk', sans-serif", outline:'none' }}/>
              {query && <button onClick={()=>setQuery('')} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(238,241,246,0.5)', padding:4 }}>✕</button>}
            </div>
            <button onClick={()=>{ clear(); setSearchOpen(false); }} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(238,241,246,0.8)', fontSize:14, fontFamily:"'Space Grotesk', sans-serif", padding:'8px 4px', whiteSpace:'nowrap' }}>Chiudi</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:16 }}>
            {query.length < 3 ? (
              <div style={{ textAlign:'center', marginTop:60 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🔍</div>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:'rgba(255,255,255,0.4)' }}>Scrivi almeno 3 lettere per cercare</div>
              </div>
            ) : searchLoading ? (
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:'rgba(255,255,255,0.4)', textAlign:'center', marginTop:40 }}>Ricerca in corso...</div>
            ) : results.length === 0 ? (
              <div style={{ textAlign:'center', marginTop:60 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>😶</div>
                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:'rgba(255,255,255,0.4)' }}>Nessun risultato trovato</div>
              </div>
            ) : results.map(item=>(
              <button key={item.id} onClick={()=>handleResultClick(item)}
                style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'14px 0', textAlign:'left', background:'none', border:'none', borderBottom:`0.5px solid rgba(255,255,255,0.08)`, cursor:'pointer' }}>
                <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', width:64, flexShrink:0, background:'rgba(255,255,255,0.06)', borderRadius:4, padding:'3px 6px', textAlign:'center' }}>{item.type}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#EEF1F6', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.label}</div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{item.sub}</div>
                </div>
                <Icon d="M9 5l7 7-7 7" size={16}/>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MENU OVERLAY ── */}
      {menuOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(2px)' }} onClick={()=>setMenuOpen(false)}>
          <div onClick={e=>e.stopPropagation()}
            style={{ position:'absolute', bottom:64, left:0, right:0, background:T.surface, borderRadius:'20px 20px 0 0', maxHeight:'75vh', overflowY:'auto', boxShadow:'0 -4px 24px rgba(0,0,0,0.2)' }}>
            {/* Handle */}
            <div style={{ position:'sticky', top:0, background:T.surface, paddingTop:10, paddingBottom:4, zIndex:1 }}>
              <div style={{ width:40, height:4, borderRadius:2, background:T.border, margin:'0 auto 8px' }}/>
              <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.12em', color:T.muted, padding:'0 20px 10px', fontFamily:"'IBM Plex Mono', monospace" }}>Menu</div>
            </div>

            {MENU_SECTIONS.map(section => {
              const sectionItems = section.items.filter(isAllowed);
              if (sectionItems.length === 0) return null;
              return (
                <div key={section.title} style={{ marginBottom:4 }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'8px 20px 4px' }}>
                    {section.title}
                  </div>
                  {sectionItems.map(item => {
                    const isActive = loc.pathname.startsWith(item.path);
                    return (
                      <button key={item.path} onClick={()=>{ navigate(item.path); setMenuOpen(false); }}
                        style={{ display:'flex', alignItems:'center', gap:14, width:'100%', padding:'13px 20px', background: isActive ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(26,54,93,0.06)') : 'none', border:'none', cursor:'pointer', textAlign:'left', fontSize:15, color: isActive ? T.navy : T.ink, fontFamily:"'Space Grotesk', sans-serif", fontWeight: isActive ? 600 : 400, minHeight:48 }}>
                        <span style={{ color: isActive ? T.navy : T.muted, flexShrink:0 }}>
                          <Icon d={ICONS[item.icon] || ICONS.settings} size={20}/>
                        </span>
                        <span style={{ flex:1 }}>{item.label}</span>
                        {isActive && <span style={{ color:T.navy, fontSize:18, lineHeight:1 }}>·</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Divider + Logout */}
            <div style={{ height:0.5, background:T.border, margin:'8px 20px' }}/>
            <button onClick={handleLogout}
              style={{ display:'flex', alignItems:'center', gap:14, width:'100%', padding:'13px 20px 20px', background:'none', border:'none', cursor:'pointer', textAlign:'left', fontSize:15, color:T.red, fontFamily:"'Space Grotesk', sans-serif", minHeight:48 }}>
              <Icon d={ICONS.logout} size={20}/>
              Esci
            </button>
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <main style={{ flex:1, padding:'16px 16px 80px', overflowY:'auto', overflowX:'hidden', background:T.bg }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      {/* ── TAB BAR ── */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:40, height:64, background:T.surface, borderTop:`0.5px solid ${T.border}`, display:'flex', alignItems:'stretch', paddingBottom:'env(safe-area-inset-bottom)', transition:'background 0.2s, border-color 0.2s' }}>
        {TAB_ITEMS.map(item=>{
          const isActive = item.path ? loc.pathname.startsWith(item.path) : menuOpen;
          return (
            <button key={item.label} onClick={()=>{
              if (item.path===null) { setMenuOpen(!menuOpen); }
              else { navigate(item.path); setMenuOpen(false); }
            }} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'none', border:'none', cursor:'pointer', color:isActive ? T.navy : T.muted, transition:'color 0.15s', position:'relative', minHeight:44 }}>
              {/* Active indicator */}
              {isActive && (
                <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:28, height:2.5, background:T.navy, borderRadius:'0 0 2px 2px' }}/>
              )}
              <Icon d={ICONS[item.icon]} size={22}/>
              <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.04em', textTransform:'uppercase', fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
