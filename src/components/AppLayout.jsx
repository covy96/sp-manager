import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { usePlan } from "../hooks/usePlan";
import { usePageTitle } from "../contexts/PageTitleContext";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { getUserStudios, supabase } from "../lib/supabase";
import AsmSeal from "./AsmSeal";
import { useIsMobile } from "../hooks/useIsMobile";
import MobileLayout from "./MobileLayout";

const T = {
  ink:'#0E0E0D', navy:'#13315C', brass:'#D9C98A', paper:'#EEF1F6', muted:'#8a847b',
  ink10:'#0E0E0D1A', ink20:'#0E0E0D33', ink05:'#0E0E0D0D',
  white10:'#ffffff1A', white20:'#ffffff33',
};

const ALL_MENU_ITEMS = [
  { label:"Dashboard",    path:"/dashboard",             num:"00", roles:"all" },
  { label:"Scrivania",    path:"/scrivania",             num:"01", roles:"all" },
  { label:"Progetti",     path:"/progetti",              num:"02", roles:"all" },
  { label:"Timesheet",    path:"/timesheet",             num:"03", roles:"all" },
  { label:"Calendario",   path:"/calendario",            num:"04", roles:"all" },
  { label:"Team",         path:"/team",                  num:"05", roles:"all" },
  { label:"Commesse",     path:"/commesse",              num:"06", roles:"pm"  },
  { label:"Monitoraggio", path:"/monitoraggio-commesse", num:"07", roles:"pm"  },
  { label:"Proforma",     path:"/proforma",              num:"08", roles:"pm"  },
  { label:"Fatture",      path:"/fatture",               num:"09", roles:"pm"  },
  { label:"Report",       path:"/report",                num:"10", roles:"pm"  },
  { label:"Gantt",        path:"/gantt-progetti",        num:"11", roles:"pm"  },
];

function getInitials(text) {
  if (!text) return "?";
  const parts = text.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0]+parts[parts.length-1][0]).toUpperCase() : text.slice(0,2).toUpperCase();
}

// ── ICONS ────────────────────────────────────────────────────────
const mkIcon = (d, d2) => ({ style }) => (
  <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d={d}/>
    {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2}/>}
  </svg>
);
const SearchIcon    = mkIcon("M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z");
const UserIcon      = mkIcon("M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z");
const SettingsIcon  = mkIcon("M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z","M15 12a3 3 0 11-6 0 3 3 0 016 0z");
const LogoutIcon    = mkIcon("M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1");
const SunIcon       = mkIcon("M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z");
const MoonIcon      = mkIcon("M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z");
const UsersIcon     = mkIcon("M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z");
const BriefcaseIcon = mkIcon("M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z");
const ArchiveIcon   = mkIcon("M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4");
const FolderIcon    = mkIcon("M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z");
const BellIcon      = mkIcon("M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9");
const CardIcon      = mkIcon("M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z");
const SwitchIcon    = mkIcon("M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4");

// Tipo badge colori
const TYPE_COLORS = {
  progetto: { bg:'#EEF3FA', color:'#13315C', label:'Progetto' },
  commessa: { bg:'#f0fdf4', color:'#1a6b3c', label:'Commessa' },
  task:     { bg:'#fefce8', color:'#854d0e', label:'Task' },
  cliente:  { bg:'#fdf4ff', color:'#7c3aed', label:'Cliente' },
};

function DropItem({ icon:Icon, label, onClick, danger }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} style={{
      display:'flex', alignItems:'center', gap:10, width:'100%', padding:'7px 10px',
      background: hover ? T.ink05 : 'transparent', border:'none', cursor:'pointer', textAlign:'left',
      color: danger ? '#b91c1c' : T.ink, fontFamily:"'Space Grotesk', sans-serif", fontSize:13, borderRadius:2,
    }}>
      <Icon style={{ width:15, height:15, flexShrink:0, color: danger ? '#b91c1c' : T.muted }}/>
      {label}
    </button>
  );
}

export default function AppLayout({ session, children }) {
  const isMobile    = useIsMobile();
  const location    = useLocation();
  const navigate    = useNavigate();
  const permissions = usePermissions();
  const { isFree }  = usePlan();
  const { teamMember, studioId } = useStudio();
  const { pageTitle } = usePageTitle();

  if (isMobile) return <MobileLayout session={session}>{children}</MobileLayout>;

  const [showMacShortcut, setShowMac]   = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode]         = useState(false);
  const [studioName, setStudioName]     = useState("");
  const [studioList, setStudioList]     = useState([]);
  const [showStudioPicker, setShowStudioPicker] = useState(false);

  const settingsRef    = useRef(null);
  const searchRef      = useRef(null);
  const searchInputRef = useRef(null);

  // Ricerca globale
  const { query, setQuery, results, loading:searchLoading, clear } = useGlobalSearch(studioId);
  const [searchFocused, setSearchFocused] = useState(false);
  const showDropdown = searchFocused && query.length >= 3;

  // Carica nome studio
  useEffect(() => {
    if (!studioId) return;
    supabase.from("studios").select("name").eq("id", studioId).single().then(({ data }) => {
      if (data?.name) setStudioName(data.name);
    });
  }, [studioId]);

  // Chiudi dropdown settings su click esterno
  useEffect(() => {
    function handler(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchFocused(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ⌘K shortcut
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey||e.ctrlKey) && e.key==="k") { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === "Escape") { clear(); setSearchFocused(false); }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { setShowMac(navigator.platform.toUpperCase().includes("MAC")); }, []);

  const menuItems = useMemo(() => ALL_MENU_ITEMS.filter(item => {
    if (item.roles==="all") return true;
    if (item.roles==="pm") return permissions.isProjectManager && !isFree;
    return true;
  }), [permissions.isProjectManager, isFree]);

  const avatarInitials = getInitials(teamMember?.user_name || session?.user?.email || "U");
  const memberColor    = teamMember?.color || T.navy;

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };
  const goSettings = path => { setSettingsOpen(false); navigate(path); };

  const handleSwitchStudio = async () => {
    setSettingsOpen(false);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user?.id) return;
    const studios = await getUserStudios(authData.user.id);
    if (studios.length <= 1) navigate('/onboarding');
    else { setStudioList(studios); setShowStudioPicker(true); }
  };

  const handleSelectStudio = (sid) => {
    localStorage.setItem('asm-active-studio', sid);
    setShowStudioPicker(false);
    window.location.reload();
  };

  // Gestisci click su risultato ricerca
  const handleResultClick = (item) => {
    clear(); setSearchFocused(false);
    if (item.path) navigate(item.path);
    else if (item.projectId) navigate(`/progetti/${item.projectId}`);
  };

  const currentPageTitle = pageTitle || ALL_MENU_ITEMS.find(i => location.pathname.startsWith(i.path))?.label || "";

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:T.paper, color:T.ink, fontFamily:"'Space Grotesk', sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width:220, display:'flex', flexDirection:'column', background:T.ink, flexShrink:0 }}>
        <button onClick={() => navigate("/scrivania")} style={{ padding:'18px 16px 14px', background:'transparent', border:'none', borderBottom:`0.5px solid ${T.white10}`, cursor:'pointer', textAlign:'left', width:'100%' }}>
          <AsmSeal size="sm" showBorder={false} showBottom={false} theme="dark"/>
        </button>
        <nav style={{ padding:'10px 8px', flex:1, display:'flex', flexDirection:'column', gap:2 }}>
          {menuItems.map(item => (
            <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:10, padding:'7px 10px',
              borderRadius:2, textDecoration:'none',
              background: isActive ? T.white10 : 'transparent', transition:'background 0.12s',
            })}
              onMouseEnter={e => { if (!location.pathname.startsWith(item.path)) e.currentTarget.style.background='#ffffff0d'; }}
              onMouseLeave={e => { if (!location.pathname.startsWith(item.path)) e.currentTarget.style.background='transparent'; }}
            >
              {({ isActive }) => (<>
                <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color: isActive ? T.brass : '#ffffff30', letterSpacing:'0.2em', width:18 }}>{item.num}</span>
                <span style={{ fontSize:12, color: isActive ? '#EEF1F6' : '#EEF1F6cc' }}>{item.label}</span>
              </>)}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding:'10px 16px', borderTop:`0.5px solid ${T.white10}` }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:memberColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, color:'#fff' }}>
            {avatarInitials}
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

        {/* Header */}
        <header style={{ position:'sticky', top:0, zIndex:30, display:'flex', alignItems:'center', justifyContent:'space-between', height:52, padding:'0 28px', background:T.paper, borderBottom:`0.5px solid ${T.ink10}` }}>

          {/* Nome studio + pagina corrente */}
          <div>
            <span style={{ fontSize:14, fontWeight:600, letterSpacing:'-0.02em', color:T.ink }}>{studioName || "ASM"}</span>
            {currentPageTitle && (
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, letterSpacing:'0.1em', marginTop:1 }}>{currentPageTitle}</div>
            )}
          </div>

          {/* ── RICERCA GLOBALE ── */}
          <div ref={searchRef} style={{ flex:1, maxWidth:400, margin:'0 32px', position:'relative' }}>
            <div style={{ position:'relative' }}>
              <SearchIcon style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:T.muted }}/>
              <input
                ref={searchInputRef}
                type="text" placeholder="Cerca progetti, commesse, task..." value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                style={{ width:'100%', padding:'7px 48px 7px 32px', border:`0.5px solid ${searchFocused ? T.navy : T.ink20}`, background:'#fff', color:T.ink, fontSize:12, fontFamily:"'IBM Plex Mono', monospace", outline:'none', transition:'border-color 0.1s' }}
              />
              {query ? (
                <button onClick={clear} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:16, lineHeight:1, padding:'0 2px' }}>×</button>
              ) : (
                <kbd style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, background:T.ink05, padding:'2px 5px' }}>
                  {showMacShortcut ? "⌘K" : "Ctrl+K"}
                </kbd>
              )}
            </div>

            {/* Dropdown risultati */}
            {showDropdown && (
              <div style={{ position:'absolute', left:0, right:0, top:'calc(100% + 6px)', background:'#fff', border:`0.5px solid ${T.ink20}`, zIndex:50, maxHeight:360, overflowY:'auto', boxShadow:'0 4px 16px rgba(14,14,13,0.08)' }}>
                {searchLoading ? (
                  <div style={{ padding:'16px', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, textAlign:'center' }}>Ricerca...</div>
                ) : results.length === 0 ? (
                  <div style={{ padding:'16px', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, textAlign:'center' }}>Nessun risultato per "{query}"</div>
                ) : (
                  <>
                    {/* Raggruppa per tipo */}
                    {["progetto","commessa","task","cliente"].map(type => {
                      const items = results.filter(r => r.type === type);
                      if (items.length === 0) return null;
                      const tc = TYPE_COLORS[type];
                      return (
                        <div key={type}>
                          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'8px 14px 4px', borderBottom:`0.5px solid ${T.ink10}` }}>
                            {tc.label}i
                          </div>
                          {items.map(item => (
                            <button key={item.id} onClick={() => handleResultClick(item)}
                              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 14px', textAlign:'left', background:'none', border:'none', cursor:'pointer', borderBottom:`0.5px solid ${T.ink10}` }}
                              onMouseEnter={e => e.currentTarget.style.background=T.paper}
                              onMouseLeave={e => e.currentTarget.style.background='transparent'}
                            >
                              <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.08em', textTransform:'uppercase', color:tc.color, background:tc.bg, padding:'2px 6px', flexShrink:0, borderRadius:2 }}>
                                {tc.label}
                              </span>
                              <div style={{ minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:600, color:T.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</div>
                                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2 }}>{item.sub}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                    <div style={{ padding:'8px 14px', fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, borderTop:`0.5px solid ${T.ink10}`, textAlign:'center' }}>
                      {results.length} risultati — premi Esc per chiudere
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Avatar + dropdown */}
          <div ref={settingsRef} style={{ position:'relative' }}>
            <button onClick={() => setSettingsOpen(!settingsOpen)} style={{ width:32, height:32, borderRadius:'50%', background:memberColor, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, color:'#fff', letterSpacing:'0.05em' }}>
              {avatarInitials}
            </button>

            {settingsOpen && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:220, background:'#fff', border:`0.5px solid ${T.ink20}`, zIndex:50 }}>
                <div style={{ padding:'12px 14px', borderBottom:`0.5px solid ${T.ink10}` }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{teamMember?.user_name || "Utente"}</div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:2 }}>{session?.user?.email}</div>
                </div>
                <div style={{ padding:'6px 4px' }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'4px 10px 6px' }}>Account</div>
                  <DropItem icon={CardIcon}   label="Piano"   onClick={() => goSettings("/impostazioni/piano")}/>
                  <DropItem icon={UserIcon}   label="Profilo" onClick={() => goSettings("/impostazioni/profilo")}/>
                </div>
                <div style={{ padding:'6px 4px', borderTop:`0.5px solid ${T.ink10}` }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'4px 10px 6px' }}>Studio</div>
                  <DropItem icon={BriefcaseIcon} label="Profilo Studio"    onClick={() => goSettings("/impostazioni/profilo-studio")}/>
                  <DropItem icon={darkMode ? MoonIcon : SunIcon} label="Aspetto"         onClick={() => { setDarkMode(!darkMode); goSettings("/impostazioni/aspetto"); }}/>
                  <DropItem icon={UsersIcon}    label="Gestione Utenti"   onClick={() => goSettings("/impostazioni/utenti")}/>
                  <DropItem icon={SettingsIcon} label="Gestione Servizi"  onClick={() => goSettings("/impostazioni/servizi")}/>
                  <DropItem icon={BellIcon}     label="Notifiche"         onClick={() => goSettings("/impostazioni/notifiche")}/>
                </div>
                <div style={{ padding:'6px 4px', borderTop:`0.5px solid ${T.ink10}` }}>
                  <DropItem icon={BriefcaseIcon} label="Clienti"               onClick={() => goSettings("/impostazioni/clienti")}/>
                  <DropItem icon={ArchiveIcon}   label="Progetti Archiviati"   onClick={() => goSettings("/impostazioni/progetti-archiviati")}/>
                  <DropItem icon={FolderIcon}    label="Commesse Archiviate"   onClick={() => goSettings("/impostazioni/commesse-archiviate")}/>
                </div>
                <div style={{ padding:'6px 4px', borderTop:`0.5px solid ${T.ink10}` }}>
                  <DropItem icon={SwitchIcon} label="Cambia studio" onClick={handleSwitchStudio}/>
                  <DropItem icon={LogoutIcon} label="Esci" onClick={handleLogout} danger/>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex:1, padding:'28px 28px', overflowY:'auto', background:'#EEF1F6' }}>
          {children}
        </main>
      </div>

      {/* Studio picker modal */}
      {showStudioPicker && (
        <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(14,14,13,0.5)' }}>
          <div style={{ width:'100%', maxWidth:360, background:'#fff', border:`0.5px solid ${T.ink20}`, padding:28 }}>
            <div style={{ fontSize:16, fontWeight:600, color:T.ink, marginBottom:4 }}>Cambia studio</div>
            <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginBottom:20 }}>Seleziona lo studio a cui accedere</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {studioList.map(m => (
                <button key={m.studio} onClick={() => handleSelectStudio(m.studio)} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 16px', background: m.studio===studioId ? '#EEF3FA' : '#fff',
                  border:`0.5px solid ${m.studio===studioId ? T.navy : T.ink10}`,
                  cursor:'pointer', textAlign:'left',
                }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{m.studios?.name || 'Studio'}</div>
                    <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2, textTransform:'uppercase', letterSpacing:'0.1em' }}>{m.role_internal||'—'}</div>
                  </div>
                  {m.studio===studioId && <span style={{ color:T.navy, fontSize:12 }}>✓ Attivo</span>}
                </button>
              ))}
              <button onClick={() => { setShowStudioPicker(false); navigate('/onboarding'); }} style={{ padding:'10px 16px', background:'transparent', border:`0.5px solid ${T.ink20}`, cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, letterSpacing:'0.08em', textTransform:'uppercase', marginTop:4 }}>
                + Crea o unisciti a un nuovo studio
              </button>
            </div>
            <button onClick={() => setShowStudioPicker(false)} style={{ marginTop:16, background:'none', border:'none', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, letterSpacing:'0.08em', textTransform:'uppercase' }}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
}
