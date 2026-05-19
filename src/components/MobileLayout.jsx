import React from 'react';
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useStudio } from "../hooks/useStudio";
import { usePermissions } from "../hooks/usePermissions";
import { usePlan } from "../hooks/usePlan";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { supabase } from "../lib/supabase";

const T = {
  ink:'#0E0E0D', navy:'#13315C', brass:'#D9C98A',
  paper:'#EEF1F6', muted:'#8a847b',
  ink10:'#0E0E0D1A', ink20:'#0E0E0D33',
  red:'#b91c1c', green:'#1a6b3c',
};

// ── ICONS ─────────────────────────────────────────────────────────
const Icon = ({ d, size=24 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d}/>
  </svg>
);

const ICONS = {
  scrivania:   "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  progetti:    "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  timesheet:   "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  calendario:  "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  menu:        "M4 6h16M4 12h16M4 18h16",
};

const TAB_ITEMS = [
  { label:'Scrivania',  path:'/scrivania',  icon:'scrivania'  },
  { label:'Progetti',   path:'/progetti',   icon:'progetti'   },
  { label:'Timesheet',  path:'/timesheet',  icon:'timesheet'  },
  { label:'Calendario', path:'/calendario', icon:'calendario' },
  { label:'Menu',       path:null,          icon:'menu'       },
];

const ALL_MENU_ITEMS = [
  { label:'Scrivania',    path:'/scrivania',             roles:'all' },
  { label:'Dashboard',    path:'/dashboard',             roles:'all' },
  { label:'Team',         path:'/team',                  roles:'all' },
  { label:'Commesse',     path:'/commesse',              roles:'pm'  },
  { label:'Monitoraggio', path:'/monitoraggio-commesse', roles:'pm'  },
  { label:'Proforma',     path:'/proforma',              roles:'pm'  },
  { label:'Fatture',      path:'/fatture',               roles:'pm'  },
  { label:'Report',       path:'/report',                roles:'pm'  },
  { label:'Gantt',        path:'/gantt-progetti',        roles:'pm'  },
  { label:'Profilo Studio', path:'/impostazioni/profilo-studio', roles:'all' },
];

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  componentDidCatch(error) { this.setState({ error }); }
  render() {
    if (this.state.error) return (
      <div style={{ padding:20, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:'#b91c1c' }}>
        Errore: {this.state.error.message}
      </div>
    );
    return this.props.children;
  }
}

export default function MobileLayout({ session, children }) {
  const location    = useNavigate();
  const navigate    = useNavigate();
  const loc         = useLocation();
  const { teamMember, studioId } = useStudio();
  const permissions = usePermissions();
  const { isFree }  = usePlan();

  const menuItems = ALL_MENU_ITEMS.filter(item => {
    if (item.roles === 'all') return true;
    if (item.roles === 'pm') return permissions.isProjectManager && !isFree;
    return true;
  });

  const [menuOpen, setMenuOpen]         = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [studioName, setStudioName]     = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { query, setQuery, results, loading:searchLoading, clear } = useGlobalSearch(studioId);
  const searchRef  = useRef(null);
  const settingsRef = useRef(null);

  useEffect(()=>{
    if (!studioId) return;
    supabase.from("studios").select("name").eq("id",studioId).single()
      .then(({data})=>{ if(data?.name) setStudioName(data.name); });
  },[studioId]);

  useEffect(()=>{
    function handler(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return ()=>document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleResultClick = (item) => {
    clear(); setSearchOpen(false);
    if (item.path) navigate(item.path);
    else if (item.projectId) navigate(`/progetti/${item.projectId}`);
  };

  const getInitials = (name='') => name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');
  const avatarInitials = getInitials(teamMember?.user_name || session?.user?.email || 'U');

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:T.paper, color:T.ink, fontFamily:"'Space Grotesk', sans-serif" }}>

      {/* ── HEADER MOBILE ── */}
      <header style={{ position:'sticky', top:0, zIndex:40, display:'flex', alignItems:'center', justifyContent:'space-between', height:52, padding:'0 16px', background:T.ink, color:'#EEF1F6' }}>
        <button onClick={()=>navigate('/dashboard')} style={{ background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0 }}>
          <div style={{ fontSize:14, fontWeight:600, letterSpacing:'-0.02em', color:'#EEF1F6' }}>{studioName||'ASM'}</div>
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {/* Search button */}
          <button onClick={()=>setSearchOpen(true)} style={{ background:'none', border:'none', cursor:'pointer', color:'#EEF1F6cc', padding:4 }}>
            <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size={20}/>
          </button>
          {/* Avatar + settings dropdown */}
          <div ref={settingsRef} style={{ position:'relative' }}>
            <button onClick={()=>setSettingsOpen(!settingsOpen)} style={{ width:30, height:30, borderRadius:'50%', background:teamMember?.color||T.navy, border:'1.5px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff', cursor:'pointer' }}>
              {avatarInitials}
            </button>

            {settingsOpen && (
              <div style={{ position:'fixed', top:52, right:0, width:220, background:'#fff', border:`0.5px solid ${T.ink20}`, zIndex:50, boxShadow:'0 4px 16px rgba(14,14,13,0.12)' }}>
                {/* Info utente */}
                <div style={{ padding:'12px 14px', borderBottom:`0.5px solid ${T.ink10}` }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{teamMember?.user_name||'Utente'}</div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:2 }}>{session?.user?.email}</div>
                </div>
                {/* Account */}
                <div style={{ padding:'6px 4px' }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'4px 10px 6px' }}>Account</div>
                  {[
                    { label:'Piano',   path:'/impostazioni/piano'   },
                    { label:'Profilo', path:'/impostazioni/profilo' },
                  ].map(item=>(
                    <button key={item.path} onClick={()=>{ navigate(item.path); setSettingsOpen(false); }} style={{ display:'flex', alignItems:'center', width:'100%', padding:'9px 14px', background:'none', border:'none', cursor:'pointer', fontSize:13, color:T.ink, fontFamily:"'Space Grotesk', sans-serif", textAlign:'left' }}>
                      {item.label}
                    </button>
                  ))}
                </div>
                {/* Studio */}
                <div style={{ padding:'6px 4px', borderTop:`0.5px solid ${T.ink10}` }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'4px 10px 6px' }}>Studio</div>
                  {[
                    { label:'Aspetto',         path:'/impostazioni/aspetto'   },
                    { label:'Gestione Utenti', path:'/impostazioni/utenti'    },
                    { label:'Servizi',         path:'/impostazioni/servizi'   },
                    { label:'Notifiche',       path:'/impostazioni/notifiche' },
                    { label:'Clienti',         path:'/impostazioni/clienti'   },
                  ].map(item=>(
                    <button key={item.path} onClick={()=>{ navigate(item.path); setSettingsOpen(false); }} style={{ display:'flex', alignItems:'center', width:'100%', padding:'9px 14px', background:'none', border:'none', cursor:'pointer', fontSize:13, color:T.ink, fontFamily:"'Space Grotesk', sans-serif", textAlign:'left' }}>
                      {item.label}
                    </button>
                  ))}
                </div>
                {/* Azioni */}
                <div style={{ padding:'6px 4px', borderTop:`0.5px solid ${T.ink10}` }}>
                  <button onClick={()=>{ setSettingsOpen(false); navigate('/onboarding'); }} style={{ display:'flex', alignItems:'center', width:'100%', padding:'9px 14px', background:'none', border:'none', cursor:'pointer', fontSize:13, color:T.ink, fontFamily:"'Space Grotesk', sans-serif", textAlign:'left' }}>
                    Cambia studio
                  </button>
                  <button onClick={handleLogout} style={{ display:'flex', alignItems:'center', width:'100%', padding:'9px 14px', background:'none', border:'none', cursor:'pointer', fontSize:13, color:T.red, fontFamily:"'Space Grotesk', sans-serif", textAlign:'left' }}>
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
        <div style={{ position:'fixed', inset:0, zIndex:60, background:T.ink, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'16px', display:'flex', alignItems:'center', gap:12, borderBottom:`0.5px solid rgba(255,255,255,0.1)` }}>
            <input ref={searchRef} autoFocus type="text" placeholder="Cerca..." value={query} onChange={e=>setQuery(e.target.value)}
              style={{ flex:1, padding:'10px 14px', background:'rgba(255,255,255,0.1)', border:'none', color:'#EEF1F6', fontSize:15, fontFamily:"'Space Grotesk', sans-serif", outline:'none', borderRadius:8 }}/>
            <button onClick={()=>{ clear(); setSearchOpen(false); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#EEF1F6cc', fontSize:14, fontFamily:"'IBM Plex Mono', monospace", letterSpacing:'0.05em' }}>Chiudi</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:16 }}>
            {query.length < 3 ? (
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:'rgba(255,255,255,0.4)', textAlign:'center', marginTop:40 }}>
                Scrivi almeno 3 lettere
              </div>
            ) : searchLoading ? (
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:'rgba(255,255,255,0.4)', textAlign:'center', marginTop:40 }}>
                Ricerca...
              </div>
            ) : results.length === 0 ? (
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:'rgba(255,255,255,0.4)', textAlign:'center', marginTop:40 }}>
                Nessun risultato
              </div>
            ) : results.map(item=>(
              <button key={item.id} onClick={()=>handleResultClick(item)} style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'14px 0', textAlign:'left', background:'none', border:'none', borderBottom:`0.5px solid rgba(255,255,255,0.08)`, cursor:'pointer' }}>
                <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', width:60, flexShrink:0 }}>{item.type}</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:600, color:'#EEF1F6' }}>{item.label}</div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{item.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MENU OVERLAY ── */}
      {menuOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(14,14,13,0.7)' }} onClick={()=>setMenuOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', bottom:70, left:0, right:0, background:'#fff', borderRadius:'16px 16px 0 0', padding:'8px 0 16px' }}>
            <div style={{ width:40, height:4, borderRadius:2, background:T.ink20, margin:'8px auto 16px' }}/>
            {menuItems.map(item=>(
              <button key={item.path} onClick={()=>{ navigate(item.path); setMenuOpen(false); }}
                style={{ display:'flex', alignItems:'center', width:'100%', padding:'14px 24px', background:'none', border:'none', cursor:'pointer', textAlign:'left', fontSize:15, color:T.ink, fontFamily:"'Space Grotesk', sans-serif", fontWeight: loc.pathname.startsWith(item.path)?600:400 }}>
                {item.label}
                {loc.pathname.startsWith(item.path) && <span style={{ marginLeft:'auto', color:T.navy, fontSize:12 }}>✓</span>}
              </button>
            ))}
            <div style={{ height:0.5, background:T.ink10, margin:'8px 24px' }}/>
            <button onClick={handleLogout} style={{ display:'flex', alignItems:'center', width:'100%', padding:'14px 24px', background:'none', border:'none', cursor:'pointer', textAlign:'left', fontSize:15, color:T.red, fontFamily:"'Space Grotesk', sans-serif" }}>
              Esci
            </button>
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <main style={{ flex:1, padding:'16px 16px 80px', overflowY:'auto' }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      {/* ── TAB BAR ── */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:40, height:64, background:'#fff', borderTop:`0.5px solid ${T.ink10}`, display:'flex', alignItems:'stretch', paddingBottom:'env(safe-area-inset-bottom)' }}>
        {TAB_ITEMS.map(item=>{
          const isActive = item.path ? loc.pathname.startsWith(item.path) : menuOpen;
          return (
            <button key={item.label} onClick={()=>{
              if (item.path===null) { setMenuOpen(!menuOpen); }
              else { navigate(item.path); setMenuOpen(false); }
            }} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'none', border:'none', cursor:'pointer', color:isActive?T.navy:T.muted, transition:'color 0.1s' }}>
              <Icon d={ICONS[item.icon]} size={22}/>
              <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.05em', textTransform:'uppercase' }}>{item.label}</span>
              {isActive && <div style={{ position:'absolute', bottom:0, width:32, height:2, background:T.navy, borderRadius:1 }}/>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
