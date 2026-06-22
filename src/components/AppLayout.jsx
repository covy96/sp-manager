import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { usePlan } from "../hooks/usePlan";
import { usePageTitle } from "../contexts/PageTitleContext";
import { useTheme } from "../contexts/ThemeContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { getUserStudios, supabase } from "../lib/supabase";
import GuidaApp from "./GuidaApp";
import { getSavedAccounts, updateSavedAccountStudio } from "../lib/accounts";
import { getUnreadNotifications, markAllRead, markOneRead, isMuted } from "../lib/notifications";
import { messaging, onMessage } from "../lib/firebase";
import AsmSeal from "./AsmSeal";
import MobileLayout from "./MobileLayout";

// divider: true = linea separatrice (non è una voce di menu)
const ALL_MENU_ITEMS = [
  { label:"Dashboard",    path:"/dashboard",             num:"01", roles:"all",   minPlan:"free"   },
  { label:"Scrivania",    path:"/scrivania",             num:"02", roles:"all",   minPlan:"free"   },
  { label:"Timesheet",    path:"/timesheet",             num:"03", roles:"all",   minPlan:"free"   },
  { divider: true },
  { label:"Progetti",     path:"/progetti",              num:"04", roles:"all",   minPlan:"free"   },
  { label:"Offerte",      path:"/offerte",               num:"05", roles:"pm",    minPlan:"free"   },
  { label:"Commesse",     path:"/commesse",              num:"06", roles:"all",   minPlan:"free"   },
{ label:"Proforma",     path:"/proforma",              num:"08", roles:"pm",    minPlan:"studio" },
  { label:"Fatture",      path:"/fatture",               num:"09", roles:"pm",    minPlan:"studio" },
  { divider: true },
  { label:"Team",         path:"/team",                  num:"10", roles:"all",   minPlan:"studio" },
  { label:"Report",       path:"/report",                num:"11", roles:"pm",    minPlan:"pro"    },
  { label:"Calendario",   path:"/calendario",            num:"12", roles:"all",   minPlan:"free"   },
  { label:"Gantt",        path:"/gantt-progetti",        num:"13", roles:"pm",    minPlan:"studio" },
  { label:"Analisi",      path:"/analisi-hub",           num:"14", roles:"pm",    minPlan:"pro"    },
];

const PLAN_ORDER = { free:0, studio:1, pro:2 };

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
const MoonIcon      = mkIcon("M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z");
const SunIcon       = mkIcon("M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z");
const SystemIcon    = mkIcon("M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z");
const UsersIcon     = mkIcon("M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z");
const BriefcaseIcon = mkIcon("M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z");
const ArchiveIcon   = mkIcon("M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4");
const FolderIcon    = mkIcon("M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z");
const BellIcon      = mkIcon("M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9");
const CardIcon      = mkIcon("M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z");
const SwitchIcon    = mkIcon("M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4");
const BuildingIcon  = mkIcon("M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4");
const TrashIcon     = mkIcon("M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16");
const ExportIcon    = mkIcon("M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4");
const DocumentIcon  = mkIcon("M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z");

// Calcola l'istante di fine snooze per i preset rapidi (orario locale)
function muteUntilPreset(kind) {
  const d = new Date();
  if (kind === "1h")       { d.setHours(d.getHours() + 1); return d.toISOString(); }
  if (kind === "tomorrow") { d.setDate(d.getDate() + 1); d.setHours(8, 0, 0, 0); return d.toISOString(); }
  if (kind === "weekend")  { // fino al prossimo lunedì 09:00
    const daysToMon = ((8 - d.getDay()) % 7) || 7;
    d.setDate(d.getDate() + daysToMon); d.setHours(9, 0, 0, 0); return d.toISOString();
  }
  return "indefinite";
}

// Etichetta leggibile dello stato di silenzio
function muteStatusLabel(prefs) {
  if (!prefs) return "";
  if (prefs.mute_until === "indefinite") return "finché non riattivi";
  if (prefs.mute_until && Date.now() < Date.parse(prefs.mute_until))
    return "fino al " + new Date(prefs.mute_until).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  if (prefs.quiet_hours?.enabled) return "fascia programmata";
  return "";
}

// ── TIPO BADGE RICERCA ────────────────────────────────────────────
const TYPE_COLORS = {
  progetto: { bg:'#EEF3FA', color:'#13315C', label:'Progetto' },
  commessa: { bg:'#f0fdf4', color:'#1a6b3c', label:'Commessa' },
  task:     { bg:'#fefce8', color:'#854d0e', label:'Task'     },
  cliente:  { bg:'#fdf4ff', color:'#7c3aed', label:'Cliente'  },
};

export default function AppLayout({ session, children }) {
  const location    = useLocation();
  const navigate    = useNavigate();
  const permissions = usePermissions();
  const { teamMember, studioId, studio } = useStudio();
  const { pageTitle } = usePageTitle();
  const { T, theme, setTheme, isDark } = useTheme();
  const { plan } = usePlan();
  const isMobile = useIsMobile();
  const currentPlanLevel = PLAN_ORDER[plan?.id || 'free'];

  const [showMacShortcut, setShowMac]   = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen]       = useState(false);
  const [studioName, setStudioName]     = useState("");
  const [studioList, setStudioList]         = useState([]);
  const [showStudioPicker, setShowStudioPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [savedAccounts, setSavedAccounts]   = useState([]);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState([]);
  const [bellOpen, setBellOpen]         = useState(false);
  const [mutePrefs, setMutePrefs]       = useState(null);  // { mute_until, quiet_hours }
  const [muteTick, setMuteTick]         = useState(0);     // forza il ricalcolo periodico

  const settingsRef    = useRef(null);
  const searchRef      = useRef(null);
  const searchInputRef = useRef(null);
  const bellRef        = useRef(null);

  // Ricerca globale
  const { query, setQuery, results, loading: searchLoading, clear } = useGlobalSearch(studioId);
  const [searchFocused, setSearchFocused] = useState(false);
  const showDropdown = searchFocused && query.length >= 3;

  // Carica nome studio
  useEffect(() => {
    if (!studioId) return;
    supabase.from("studios").select("name").eq("id", studioId).single()
      .then(({ data }) => { if (data?.name) setStudioName(data.name); });
  }, [studioId]);

  // Chiudi dropdown su click esterno (sospeso quando la guida controlla il menu)
  const guideControlsSettings = useRef(false);
  useEffect(() => {
    function handler(e) {
      if (!guideControlsSettings.current && settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchFocused(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // La guida all'uso può aprire/chiudere il menu Impostazioni per evidenziare le voci
  useEffect(() => {
    const onOpen  = () => { guideControlsSettings.current = true;  setSettingsOpen(true); };
    const onClose = () => { guideControlsSettings.current = false; setSettingsOpen(false); };
    window.addEventListener("asm-guide-settings-open", onOpen);
    window.addEventListener("asm-guide-settings-close", onClose);
    return () => {
      window.removeEventListener("asm-guide-settings-open", onOpen);
      window.removeEventListener("asm-guide-settings-close", onClose);
    };
  }, []);

  // Apertura della guida dalla pagina Info (bottone "Apri")
  useEffect(() => {
    const h = () => setGuideOpen(true);
    window.addEventListener("asm-open-guide", h);
    return () => window.removeEventListener("asm-open-guide", h);
  }, []);

  // Auto-apertura al primo accesso di ogni nuovo utente (una volta sola).
  // Guardia doppia: flag locale (per-utente) che protegge SEMPRE sullo stesso
  // dispositivo anche se il write su DB fallisce, + flag su DB
  // (team_members.guide_seen) per la validità cross-device.
  const guideAutoTried = useRef(false);
  useEffect(() => {
    if (guideAutoTried.current) return;
    if (!teamMember?.id || !studioId || !session?.user?.id) return;
    guideAutoTried.current = true;
    const localKey = `asm-guide-seen-${session.user.id}`;
    if (teamMember.guide_seen || localStorage.getItem(localKey)) return; // già vista
    const t = setTimeout(() => setGuideOpen(true), 700); // attende il render della sidebar
    // Segna subito in locale: garantisce che non si riapra a ogni riavvio
    // anche se l'UPDATE su DB non va a buon fine (es. RLS).
    localStorage.setItem(localKey, "1");
    // Marca come vista su tutte le membership dell'utente (cross-device).
    supabase
      .from("team_members")
      .update({ guide_seen: true })
      .eq("user_account", session.user.id)
      .then(({ error }) => {
        if (error) console.warn("[guide] impossibile salvare guide_seen su DB:", error.message);
      });
    return () => clearTimeout(t);
  }, [teamMember?.id, teamMember?.guide_seen, studioId, session?.user?.id]);

  // Registra service worker all'avvio (necessario per notifiche background)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {});
    }
  }, []);

  // Notifiche in foreground (app aperta) — usa SW per bypassare la soppressione macOS
  useEffect(() => {
    if (!messaging) return;
    return onMessage(messaging, (payload) => {
      // Messaggi data-only: titolo e corpo arrivano in payload.data
      const { title, body } = payload.data ?? {};
      const link = payload.data?.link || '/';
      if (Notification.permission !== 'granted') return;
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title ?? 'SP Manager', {
          body: body ?? '',
          icon: '/icon-192.png',
          data: { url: link },
        });
      });
    });
  }, []);

  // Carica notifiche non lette
  useEffect(() => {
    if (!studioId || !session?.user?.email) return;
    getUnreadNotifications(studioId, session.user.email).then(setUnreadNotifs);
  }, [studioId, session?.user?.email]);

  // Real-time: nuove notifiche
  useEffect(() => {
    if (!studioId || !session?.user?.email) return;
    const email = session.user.email;
    const ch = supabase.channel(`notifs-${studioId}-${email}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `studio=eq.${studioId}`,
      }, ({ new: row }) => { if (row.user_email === email && !row.read) setUnreadNotifs(p => [row, ...p]); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [studioId, session?.user?.email]);

  // "Non disturbare": stato locale derivato dalle preferenze del membro
  useEffect(() => {
    const p = teamMember?.notification_preferences;
    setMutePrefs(p ? { mute_until: p.mute_until, quiet_hours: p.quiet_hours } : null);
  }, [teamMember?.notification_preferences]);

  // Ricalcola periodicamente (le fasce orarie e gli snooze scadono col tempo)
  useEffect(() => {
    const id = setInterval(() => setMuteTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const muted = useMemo(() => isMuted(mutePrefs), [mutePrefs, muteTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Imposta/azzera lo snooze manuale (value: ISO | "indefinite" | null)
  const applyMute = async (value) => {
    if (!teamMember?.id) return;
    const base = teamMember.notification_preferences || {};
    const next = { ...base };
    if (value == null) delete next.mute_until; else next.mute_until = value;
    setMutePrefs({ mute_until: next.mute_until, quiet_hours: next.quiet_hours });
    if (teamMember.notification_preferences) teamMember.notification_preferences = next; // allinea il riferimento in context
    await supabase.from("team_members").update({ notification_preferences: next }).eq("id", teamMember.id);
  };

  // ⌘K shortcut
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.key === "Escape") { clear(); setSearchFocused(false); }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { setShowMac(navigator.platform.toUpperCase().includes("MAC")); }, []);

  const isFattura = studio?.tipo_fatturazione === 'fattura';

  const menuItems = useMemo(() => ALL_MENU_ITEMS.filter(item => {
    if (item.divider) return true; // i divider passano sempre, verranno gestiti nel render
    if (item.roles === 'owner' && !permissions.isOwner) return false;
    if (item.roles === 'pm' && !permissions.isProjectManager) return false;
    const required = PLAN_ORDER[item.minPlan] ?? 0;
    if (currentPlanLevel < required) return false;
    // Nascondi Proforma per studi con fatturazione diretta (SRL/Spa)
    if (item.path === '/proforma' && isFattura) return false;
    return true;
  }), [permissions.isOwner, permissions.isProjectManager, currentPlanLevel, isFattura]);

  const avatarInitials = getInitials(teamMember?.user_name || session?.user?.email || "U");
  const memberColor    = teamMember?.color || T.navy;

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };
  const goSettings = path => { setSettingsOpen(false); navigate(path); };

  const handleSwitchStudio = async () => {
    setSettingsOpen(false);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user?.id) return;
    // Aggiorna studio corrente nell'account salvato
    updateSavedAccountStudio(authData.user.id, studioId, studioName);
    // Carica account salvati e studi dell'utente corrente
    const [studios, accounts] = await Promise.all([
      getUserStudios(authData.user.id),
      Promise.resolve(getSavedAccounts()),
    ]);
    setStudioList(studios);
    setSavedAccounts(accounts);
    setShowAccountPicker(true);
  };

  const handleSelectStudio = (sid) => {
    localStorage.setItem('asm-active-studio', sid);
    setShowStudioPicker(false);
    setShowAccountPicker(false);
    window.location.reload();
  };

  const handleSwitchAccount = async (account) => {
    if (switchingAccount) return;
    setSwitchingAccount(true);
    try {
      if (!account.refreshToken) throw new Error('no token');
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: account.refreshToken });
      if (error || !data.session) throw new Error('expired');
      // Sessione ripristinata — imposta lo studio salvato e ricarica
      if (account.studioId) localStorage.setItem('asm-active-studio', account.studioId);
      else localStorage.removeItem('asm-active-studio');
      window.location.href = '/dashboard';
    } catch {
      // Sessione scaduta → login con email pre-compilata
      setShowAccountPicker(false);
      navigate(`/login?email=${encodeURIComponent(account.email)}`);
    } finally {
      setSwitchingAccount(false);
    }
  };

  const handleResultClick = (item) => {
    clear(); setSearchFocused(false);
    if (item.path) navigate(item.path);
    else if (item.projectId) navigate(`/progetti/${item.projectId}`);
  };

  const ThemeIcon = theme === 'dark' ? MoonIcon : theme === 'light' ? SunIcon : SystemIcon;

  // Mobile → MobileLayout
  if (isMobile) return <MobileLayout session={session}>{children}</MobileLayout>;

  // ── DROPDOWN ITEM ─────────────────────────────────────────────
  const DropItem = ({ icon: Icon, label, onClick, danger, children: ch, dataTour }) => {
    const [hover, setHover] = useState(false);
    return (
      <button onClick={onClick} data-tour={dataTour}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display:'flex', alignItems:'center', gap:10, width:'100%', padding:'7px 10px',
          background: hover ? T.border : 'transparent',
          border:'none', cursor:'pointer', textAlign:'left',
          color: danger ? T.red : T.ink,
          fontFamily:"'Space Grotesk', sans-serif", fontSize:13, borderRadius:2,
        }}>
        <Icon style={{ width:15, height:15, flexShrink:0, color: danger ? T.red : T.muted }}/>
        {label}
        {ch}
      </button>
    );
  };

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:T.bg, color:T.ink, fontFamily:"'Space Grotesk', sans-serif" }}>

      {/* ── SIDEBAR — glass scura ── */}
      <aside style={{
        width:220, display:'flex', flexDirection:'column', flexShrink:0,
        background: T.sidebarBg,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        borderRight: `1px solid ${T.sidebarBorder}`,
      }}>
        <button onClick={() => navigate("/dashboard")} style={{
          padding:'20px 18px 16px', background:'transparent', border:'none',
          borderBottom:`1px solid ${T.sidebarBorder}`, cursor:'pointer', textAlign:'left', width:'100%',
        }}>
          <AsmSeal size="sm" showBorder={false} showBottom={false} theme="dark"/>
        </button>

        <nav style={{ padding:'10px 10px', flex:1, display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
          {menuItems.map((item, idx) => {
            if (item.divider) return (
              <div key={`div-${idx}`} style={{ margin:'6px 10px', height:'0.5px', background:'rgba(255,255,255,0.08)' }}/>
            );
            return (
              <NavLink key={item.path} to={item.path} data-tour={item.path} style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                borderRadius:10, textDecoration:'none',
                background: isActive ? T.sidebarActive : 'transparent',
                transition:'background 0.15s',
              })}
                onMouseEnter={e => { if (!location.pathname.startsWith(item.path)) e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (!location.pathname.startsWith(item.path)) e.currentTarget.style.background='transparent'; }}
              >
                {({ isActive }) => (<>
                  <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color: isActive ? T.brass : 'rgba(255,255,255,0.2)', letterSpacing:'0.2em', width:18 }}>{item.num}</span>
                  <span style={{ fontSize:12.5, color: isActive ? '#ffffff' : T.sidebarText, fontWeight: isActive ? 600 : 400, letterSpacing:'0.01em' }}>{item.label}</span>
                </>)}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding:'10px 12px', borderTop:`1px solid ${T.sidebarBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {/* Logo ASM — apre pagina Info */}
          <button
            onClick={() => navigate('/info')}
            title="Info su SP Manager"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: location.pathname === '/info' ? 'rgba(217,201,138,0.18)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${location.pathname === '/info' ? 'rgba(217,201,138,0.4)' : 'rgba(255,255,255,0.1)'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, border-color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { if (location.pathname !== '/info') { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; } }}
            onMouseLeave={e => { if (location.pathname !== '/info') { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; } }}
          >
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700, fontSize: 15, letterSpacing: '-0.04em',
              color: location.pathname === '/info' ? '#D9C98A' : 'rgba(255,255,255,0.55)',
              lineHeight: 1,
            }}>A</span>
          </button>

          {/* Avatar utente */}
          <div style={{ width:28, height:28, borderRadius:'50%', background:memberColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
            {avatarInitials}
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, overflow:'hidden' }}>

        {/* Header — glass */}
        <header style={{
          position:'sticky', top:0, zIndex:30,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          height:56, padding:'0 28px',
          background: T.headerBg,
          backdropFilter: T.blur,
          WebkitBackdropFilter: T.blur,
          borderBottom: `1px solid ${T.headerBorder}`,
          transition:'background 0.2s',
        }}>

          {/* Nome studio */}
          <div>
            <span style={{ fontSize:14, fontWeight:600, letterSpacing:'-0.02em', color:T.ink }}>
              {studioName || "ASM"}
            </span>
            {pageTitle && (
              <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, letterSpacing:'0.1em', marginTop:1 }}>
                {pageTitle}
              </div>
            )}
          </div>

          {/* Ricerca globale */}
          <div ref={searchRef} style={{ flex:1, maxWidth:420, margin:'0 32px', position:'relative' }}>
            <div style={{ position:'relative' }}>
              <SearchIcon style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:T.muted }}/>
              <input
                ref={searchInputRef}
                type="text" placeholder="Cerca progetti, commesse, task..." value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                style={{
                  width:'100%', padding:'8px 48px 8px 34px',
                  border:`1px solid ${searchFocused ? T.navy : T.borderMd}`,
                  borderRadius: 10,
                  background: T.inputBg,
                  backdropFilter: T.blurSm,
                  WebkitBackdropFilter: T.blurSm,
                  color:T.inputText,
                  fontSize:13, fontFamily:"'Space Grotesk', sans-serif", outline:'none',
                  transition:'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: searchFocused ? `0 0 0 3px ${T.navyLight}` : 'none',
                }}
              />
              {query ? (
                <button onClick={clear} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:T.muted, fontSize:18, lineHeight:1 }}>×</button>
              ) : (
                <kbd style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, background:T.borderMd, padding:'2px 6px', borderRadius:5 }}>
                  {showMacShortcut ? "⌘K" : "Ctrl+K"}
                </kbd>
              )}
            </div>

            {/* Dropdown risultati */}
            {showDropdown && (
              <div style={{ position:'absolute', left:0, right:0, top:'calc(100% + 8px)', background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, borderRadius:14, zIndex:50, maxHeight:360, overflowY:'auto', boxShadow:T.shadowMd }}>
                {searchLoading ? (
                  <div style={{ padding:16, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, textAlign:'center' }}>Ricerca...</div>
                ) : results.length === 0 ? (
                  <div style={{ padding:16, fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, textAlign:'center' }}>Nessun risultato per "{query}"</div>
                ) : (
                  <>
                    {["progetto","commessa","task","cliente"].map(type => {
                      const items = results.filter(r => r.type === type);
                      if (items.length === 0) return null;
                      const tc = TYPE_COLORS[type];
                      return (
                        <div key={type}>
                          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'8px 14px 4px', borderBottom:`0.5px solid ${T.border}` }}>
                            {tc.label}
                          </div>
                          {items.map(item => (
                            <button key={item.id + (item.archived ? "_arch" : "")} onClick={() => handleResultClick(item)}
                              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 14px', textAlign:'left', background:'none', border:'none', cursor:'pointer', borderBottom:`0.5px solid ${T.border}` }}
                              onMouseEnter={e => e.currentTarget.style.background=T.surface2}
                              onMouseLeave={e => e.currentTarget.style.background='transparent'}
                            >
                              <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, letterSpacing:'0.08em', textTransform:'uppercase', color:tc.color, background:tc.bg, padding:'2px 6px', flexShrink:0, borderRadius:2 }}>
                                {tc.label}
                              </span>
                              <div style={{ minWidth:0, flex:1 }}>
                                <div style={{ fontSize:13, fontWeight:600, color: item.archived ? T.muted : T.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</div>
                                <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2 }}>{item.sub}</div>
                              </div>
                              {item.archived && (
                                <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:7, letterSpacing:'0.1em', textTransform:'uppercase', color:'#b45309', background:'rgba(180,83,9,0.1)', padding:'2px 5px', borderRadius:2, flexShrink:0 }}>
                                  archiviato
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                    <div style={{ padding:'8px 14px', fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, borderTop:`0.5px solid ${T.border}`, textAlign:'center' }}>
                      {results.length} risultati — Esc per chiudere
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Campanella + Avatar */}
          <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>

          {/* Campanella notifiche */}
          <div ref={bellRef} style={{ position:'relative' }}>
            <button onClick={() => setBellOpen(p => !p)} style={{
              position:'relative', width:32, height:32, background:'none', border:'none',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:T.muted,
            }}>
              <BellIcon style={{ width:18, height:18, opacity: muted ? 0.55 : 1 }}/>
              {/* Conteggio non lette: nascosto mentre è silenziato (silenzia tutto) */}
              {!muted && unreadNotifs.length > 0 && (
                <span style={{
                  position:'absolute', top:4, right:3, minWidth:14, height:14, borderRadius:7,
                  background:T.red, color:'#fff', fontSize:8, fontWeight:700,
                  fontFamily:"'IBM Plex Mono', monospace",
                  display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px',
                }}>
                  {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
                </span>
              )}
              {/* Indicatore "silenziato" */}
              {muted && (
                <span style={{
                  position:'absolute', top:5, right:4, width:8, height:8, borderRadius:4,
                  background:T.muted, border:`1.5px solid ${isDark ? 'rgb(30,30,40)' : '#fff'}`,
                }}/>
              )}
            </button>
            {bellOpen && (
              <div style={{
                position:'absolute', right:0, top:'calc(100% + 8px)', width:320,
                background:isDark ? 'rgb(40,40,50)' : '#fff', border:`0.5px solid ${T.borderMd}`, zIndex:50,
                boxShadow:`0 4px 16px rgba(0,0,0,${isDark?'0.4':'0.12'})`,
                maxHeight:400, display:'flex', flexDirection:'column',
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:`0.5px solid ${T.border}` }}>
                  <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted }}>
                    {unreadNotifs.length > 0 ? `${unreadNotifs.length} non lette` : 'Notifiche'}
                  </span>
                  {unreadNotifs.length > 0 && (
                    <button onClick={async () => { await markAllRead(studioId, session.user.email); setUnreadNotifs([]); }}
                      style={{ background:'none', border:'none', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.navy, letterSpacing:'0.05em' }}>
                      Segna tutto letto
                    </button>
                  )}
                </div>

                {/* Non disturbare — silenzia rapido / riattiva */}
                <div style={{ padding:'10px 14px', borderBottom:`0.5px solid ${T.border}`, background: muted ? (isDark ? 'rgba(255,255,255,0.04)' : '#f7f7f9') : 'transparent' }}>
                  {muted ? (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:T.ink }}>🔕 Notifiche silenziate</div>
                        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{muteStatusLabel(mutePrefs)}</div>
                      </div>
                      <button onClick={() => applyMute(null)}
                        style={{ flexShrink:0, background:T.navy, color:T.bg, border:'none', borderRadius:T.radiusSm, cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'6px 12px' }}>
                        Riattiva
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase', color:T.muted, marginBottom:8 }}>🔔 Silenzia notifiche</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {[
                          { k:'1h',         label:'1 ora' },
                          { k:'tomorrow',   label:'Fino a domani' },
                          { k:'weekend',    label:'Weekend' },
                          { k:'indefinite', label:'Finché riattivo' },
                        ].map(p => (
                          <button key={p.k} onClick={() => applyMute(muteUntilPreset(p.k))}
                            style={{ background:'none', border:`1px solid ${T.borderMd}`, borderRadius:T.radiusSm, cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.ink, padding:'5px 9px' }}
                            onMouseEnter={e => e.currentTarget.style.background=T.border}
                            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ overflowY:'auto', flex:1 }}>
                  {unreadNotifs.length === 0 ? (
                    <div style={{ padding:'32px 0', textAlign:'center', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted }}>
                      Nessuna notifica non letta
                    </div>
                  ) : unreadNotifs.map(n => (
                    <button key={n.id}
                      onClick={async () => { setBellOpen(false); await markOneRead(n.id); setUnreadNotifs(p => p.filter(x => x.id !== n.id)); if (n.link) navigate(n.link); }}
                      style={{ display:'block', width:'100%', padding:'12px 14px', textAlign:'left', background:'none', border:'none', cursor: n.link ? 'pointer' : 'default', borderBottom:`0.5px solid ${T.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background=T.border}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
                      <div style={{ fontSize:12, fontWeight:600, color:T.ink, marginBottom:3 }}>{n.title}</div>
                      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginBottom:4, lineHeight:1.4 }}>{n.message}</div>
                      <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:8, color:T.muted }}>
                        {new Date(n.created_at).toLocaleDateString('it-IT', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Avatar + dropdown */}
          <div ref={settingsRef} style={{ position:'relative', flexShrink:0 }}>
            <button onClick={() => setSettingsOpen(!settingsOpen)} style={{
              width:32, height:32, borderRadius:'50%', background:memberColor,
              border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:600, color:'#fff',
            }}>
              {avatarInitials}
            </button>

            {settingsOpen && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:240, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, borderRadius:16, zIndex:50, boxShadow:T.shadowLg, overflow:'visible' }}>

                {/* User info */}
                <div style={{ padding:'12px 14px', borderBottom:`0.5px solid ${T.border}` }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{teamMember?.user_name || "Utente"}</div>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginTop:2 }}>{session?.user?.email}</div>
                </div>

                {/* Account */}
                <div style={{ padding:'6px 4px' }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'4px 10px 6px' }}>Account</div>
                  {(teamMember?.role_internal === 'Owner' || teamMember?.role_internal === 'Partner') && (
                    <DropItem icon={CardIcon} label="Piano" onClick={() => goSettings("/impostazioni/piano")}/>
                  )}
                  <DropItem icon={UserIcon}     label="Profilo"        onClick={() => goSettings("/impostazioni/profilo")}/>
                  <DropItem icon={BuildingIcon} label="Profilo Studio" onClick={() => goSettings("/impostazioni/profilo-studio")}/>
                </div>

                {/* Studio */}
                <div style={{ padding:'6px 4px', borderTop:`0.5px solid ${T.border}` }}>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, padding:'4px 10px 6px' }}>Studio</div>

                  <DropItem icon={ThemeIcon} label="Aspetto" onClick={() => goSettings('/impostazioni/aspetto')}/>

                  <DropItem icon={SettingsIcon} label="Gestione Servizi" dataTour="/impostazioni/servizi" onClick={() => goSettings("/impostazioni/servizi")}/>
                  <DropItem icon={SettingsIcon} label="Voci Offerta" dataTour="/impostazioni/voci-offerta" onClick={() => goSettings("/impostazioni/voci-offerta")}/>
                  <DropItem icon={DocumentIcon} label="Report"           dataTour="/impostazioni/report" onClick={() => goSettings("/impostazioni/report")}/>
                  <DropItem icon={BellIcon}     label="Notifiche"        onClick={() => goSettings("/impostazioni/notifiche")}/>
                </div>

                {/* Data */}
                <div style={{ padding:'6px 4px', borderTop:`0.5px solid ${T.border}` }}>
                  <DropItem icon={BriefcaseIcon} label="Clienti"             onClick={() => goSettings("/impostazioni/clienti")}/>
                  <DropItem icon={ArchiveIcon}   label="Progetti Archiviati" onClick={() => goSettings("/impostazioni/progetti-archiviati")}/>
                  <DropItem icon={FolderIcon}    label="Commesse Archiviate" onClick={() => goSettings("/impostazioni/commesse-archiviate")}/>
                  <DropItem icon={ExportIcon}    label="Esporta dati"        onClick={() => goSettings("/impostazioni/esporta")}/>
                  <DropItem icon={TrashIcon}     label="Cestino"             onClick={() => goSettings("/impostazioni/cestino")}/>
                </div>

                {/* Cambia studio + Esci */}
                <div style={{ padding:'6px 4px', borderTop:`0.5px solid ${T.border}` }}>
                  <DropItem icon={SwitchIcon} label="Cambia studio" onClick={handleSwitchStudio}/>
                  <DropItem icon={LogoutIcon} label="Esci" onClick={handleLogout} danger/>
                </div>
              </div>
            )}
          </div>
          </div>{/* end Campanella + Avatar wrapper */}
        </header>

        {/* Content */}
        <main style={{ flex:1, padding:'28px', overflowY:'auto', background:T.bg, transition:'background 0.2s', backgroundImage: isDark ? 'radial-gradient(ellipse at 20% 10%, rgba(74,158,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(120,80,220,0.04) 0%, transparent 60%)' : 'radial-gradient(ellipse at 20% 10%, rgba(29,106,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(120,80,220,0.04) 0%, transparent 60%)' }}>
          {children}
        </main>
      </div>

      {/* Account switcher modal (stile Instagram) */}
      {showAccountPicker && (
        <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)' }}
          onClick={() => setShowAccountPicker(false)}>
          <div style={{ width:'100%', maxWidth:380, background:T.glassBg, backdropFilter:T.blur, WebkitBackdropFilter:T.blur, border:`1px solid ${T.glassBorder}`, borderRadius: T.radiusSm, padding:28, boxShadow:T.shadowLg }}
            onClick={e => e.stopPropagation()}>

            <div style={{ fontSize:16, fontWeight:600, color:T.ink, marginBottom:4 }}>Cambia account</div>
            <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:10, color:T.muted, marginBottom:20 }}>
              Seleziona un account o uno studio
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>

              {/* Studi dell'account corrente */}
              {studioList.length > 0 && (
                <>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:4 }}>
                    {session?.user?.email}
                  </div>
                  {studioList.map(m => (
                    <button key={m.studio} onClick={() => handleSelectStudio(m.studio)} style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'12px 16px',
                      background: m.studio === studioId ? T.navyLight : T.surface2,
                      border:`0.5px solid ${m.studio === studioId ? T.navy : T.border}`,
                      cursor:'pointer', textAlign:'left', width:'100%',
                    }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:T.ink }}>{m.studios?.name || 'Studio'}</div>
                        <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2, textTransform:'uppercase', letterSpacing:'0.1em' }}>{m.role_internal || '—'}</div>
                      </div>
                      {m.studio === studioId && <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.navy, letterSpacing:'0.08em', textTransform:'uppercase' }}>✓ Attivo</span>}
                    </button>
                  ))}
                </>
              )}

              {/* Altri account salvati */}
              {savedAccounts.filter(a => a.userId !== session?.user?.id).length > 0 && (
                <>
                  <div style={{ height:'0.5px', background:T.border, margin:'8px 0' }}/>
                  <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:T.muted, marginBottom:4 }}>
                    Altri account
                  </div>
                  {savedAccounts.filter(a => a.userId !== session?.user?.id).map(account => (
                    <button key={account.userId} onClick={() => handleSwitchAccount(account)}
                      disabled={switchingAccount}
                      style={{
                        display:'flex', alignItems:'center', gap:12,
                        padding:'12px 16px', background:T.surface2,
                        border:`0.5px solid ${T.border}`,
                        cursor: switchingAccount ? 'not-allowed' : 'pointer', textAlign:'left', width:'100%',
                        opacity: switchingAccount ? 0.6 : 1,
                      }}>
                      {/* Avatar */}
                      <div style={{ width:32, height:32, borderRadius:'50%', background:T.navy, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>
                        {(account.email||'?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:T.ink, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {account.email}
                        </div>
                        {account.studioName && (
                          <div style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted, marginTop:2 }}>
                            {account.studioName}
                          </div>
                        )}
                      </div>
                      <span style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:9, color:T.muted }}>→</span>
                    </button>
                  ))}
                </>
              )}

              {/* Aggiungi account */}
              <div style={{ height:'0.5px', background:T.border, margin:'4px 0' }}/>
              <button onClick={async () => { setShowAccountPicker(false); await supabase.auth.signOut(); navigate('/login'); }} style={{
                padding:'10px 16px', background:'transparent',
                border:`0.5px solid ${T.border}`, cursor:'pointer',
                fontFamily:"'IBM Plex Mono', monospace", fontSize:11,
                color:T.muted, letterSpacing:'0.08em', textTransform:'uppercase', width:'100%',
              }}>
                + Aggiungi account
              </button>
            </div>

            <button onClick={() => setShowAccountPicker(false)} style={{ marginTop:16, background:'none', border:'none', cursor:'pointer', fontFamily:"'IBM Plex Mono', monospace", fontSize:11, color:T.muted, letterSpacing:'0.08em', textTransform:'uppercase' }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Guida all'uso — auto al primo accesso + apribile da Info */}
      <GuidaApp open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
