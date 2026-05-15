import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { usePageTitle } from "../contexts/PageTitleContext";
import { supabase } from "../lib/supabase";
import AsmSeal from "./AsmSeal";

// ── BRAND TOKENS ─────────────────────────────────────────────────
const T = {
  ink:    '#0E0E0D',
  navy:   '#13315C',
  brass:  '#D9C98A',
  paper:  '#EEF1F6',
  muted:  '#8a847b',
  ink10:  '#0E0E0D1A',
  ink20:  '#0E0E0D33',
  ink05:  '#0E0E0D0D',
  white10:'#ffffff1A',
  white20:'#ffffff33',
  white60:'#ffffff99',
};

// ── MENU ─────────────────────────────────────────────────────────
const ALL_MENU_ITEMS = [
  { label: "Dashboard",             path: "/dashboard",              num: "01", roles: "all" },
  { label: "Progetti",              path: "/progetti",               num: "02", roles: "all" },
  { label: "Le mie Task",           path: "/le-mie-task",            num: "03", roles: "all" },
  { label: "Timesheet",             path: "/timesheet",              num: "04", roles: "all" },
  { label: "Calendario",            path: "/calendario",             num: "05", roles: "all" },
  { label: "Team",                  path: "/team",                   num: "06", roles: "all" },
  { label: "Commesse",              path: "/commesse",               num: "07", roles: "pm"  },
  { label: "Monitoraggio",          path: "/monitoraggio-commesse",  num: "08", roles: "pm"  },
  { label: "Proforma",              path: "/proforma",               num: "09", roles: "pm"  },
  { label: "Report",                path: "/report",                 num: "10", roles: "pm"  },
  { label: "Gantt",                 path: "/gantt-progetti",         num: "11", roles: "pm"  },
];

// ── HELPERS ──────────────────────────────────────────────────────
function getInitials(text) {
  if (!text) return "?";
  const parts = text.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return text.slice(0, 2).toUpperCase();
}

// ── INLINE SVG ICONS (mantenuti identici all'originale) ──────────
function SearchIcon({ style }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
function UserIcon({ style }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
function SettingsIcon({ style }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function LogoutIcon({ style }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
function MoonIcon({ style }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}
function SunIcon({ style }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function UsersIcon({ style }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function BriefcaseIcon({ style }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function ArchiveIcon({ style }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
}
function FolderIcon({ style }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}
function BellIcon({ style }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}
function CardIcon({ style }) {
  return (
    <svg style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

// ── DROPDOWN ITEM ─────────────────────────────────────────────────
function DropItem({ icon, label, onClick, danger }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '7px 10px',
        background: hover ? T.ink05 : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        color: danger ? '#b91c1c' : T.ink,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 13, borderRadius: 2,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── COMPONENT ─────────────────────────────────────────────────────
export default function AppLayout({ session, children }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const permissions = usePermissions();
  const { teamMember } = useStudio();
  const { pageTitle } = usePageTitle();

  const [searchQuery, setSearchQuery]         = useState("");
  const [showSearchShortcut, setShowSearch]   = useState(true);
  const [settingsOpen, setSettingsOpen]       = useState(false);
  const [darkMode, setDarkMode]               = useState(false);

  const settingsRef   = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ⌘K shortcut
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Detect Mac
  useEffect(() => {
    setShowSearch(navigator.platform.toUpperCase().includes("MAC"));
  }, []);

  const menuItems = useMemo(() => ALL_MENU_ITEMS.filter(item => {
    if (item.roles === "all") return true;
    if (item.roles === "pm")    return permissions.isProjectManager;
    if (item.roles === "owner") return permissions.isOwner;
    return true;
  }), [permissions.isProjectManager, permissions.isOwner]);

  const currentPageTitle = pageTitle ||
    ALL_MENU_ITEMS.find(item => item.path === location.pathname)?.label || "ASM";

  const avatarInitials = getInitials(teamMember?.user_name || session?.user?.email || "U");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Search:", searchQuery);
  };

  const goSettings = (path) => {
    setSettingsOpen(false);
    navigate(path);
  };

  // ── STYLES ──────────────────────────────────────────────────────
  const iconSt = { width: 15, height: 15, flexShrink: 0, color: T.muted };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.paper, color: T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220, display: 'flex', flexDirection: 'column',
        background: T.ink, borderRight: 'none', flexShrink: 0,
      }}>

        {/* Logo */}
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: '18px 16px 14px', borderBottom: `0.5px solid ${T.white10}`,
            background: 'transparent', border: 'none', borderBottom: `0.5px solid ${T.white10}`,
            cursor: 'pointer', textAlign: 'left', width: '100%',
          }}
        >
          <AsmSeal size="sm" showBorder={false} showBottom={false} theme="dark" />
        </button>

        {/* Nav */}
        <nav style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 2, textDecoration: 'none',
                background: isActive ? T.white10 : 'transparent',
                transition: 'background 0.12s',
              })}
              onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = '#ffffff0d'; }}
              onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'transparent'; }}
            >
              {({ isActive }) => (
                <>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                    color: isActive ? T.brass : '#ffffff30', letterSpacing: '0.2em', width: 18,
                  }}>{item.num}</span>
                  <span style={{
                    fontSize: 12, color: isActive ? '#EEF1F6' : '#EEF1F6cc',
                    letterSpacing: '0.01em',
                  }}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: '12px 16px', borderTop: `0.5px solid ${T.white10}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: T.navy,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600, color: T.brass, flexShrink: 0,
            }}>{avatarInitials}</div>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
              color: '#ffffff60', letterSpacing: '0.05em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {teamMember?.user_name || session?.user?.email?.split('@')[0] || "Utente"}
            </span>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 52, padding: '0 28px',
          background: T.paper, borderBottom: `0.5px solid ${T.ink10}`,
        }}>

          {/* Page title */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', color: T.ink }}>
              {currentPageTitle}
            </span>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 360, margin: '0 32px' }}>
            <div style={{ position: 'relative' }}>
              <SearchIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: T.muted }} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cerca..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '7px 48px 7px 32px',
                  border: `0.5px solid ${T.ink20}`, background: '#fff',
                  color: T.ink, fontSize: 12,
                  fontFamily: "'IBM Plex Mono', monospace",
                  outline: 'none', borderRadius: 0,
                }}
                onFocus={e => e.target.style.borderColor = T.navy}
                onBlur={e => e.target.style.borderColor = T.ink20}
              />
              <kbd style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                color: T.muted, background: T.ink05, padding: '2px 5px',
                letterSpacing: '0.05em',
              }}>
                {showSearchShortcut ? "⌘K" : "Ctrl+K"}
              </kbd>
            </div>
          </form>

          {/* Avatar + dropdown */}
          <div ref={settingsRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: T.navy, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: T.brass, letterSpacing: '0.05em',
              }}
            >
              {avatarInitials}
            </button>

            {/* Dropdown */}
            {settingsOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                width: 220, background: '#fff',
                border: `0.5px solid ${T.ink20}`,
                zIndex: 50, boxShadow: 'none',
              }}>
                {/* User info */}
                <div style={{ padding: '12px 14px', borderBottom: `0.5px solid ${T.ink10}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>
                    {teamMember?.user_name || "Utente"}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.muted, marginTop: 2 }}>
                    {session?.user?.email}
                  </div>
                </div>

                {/* Account */}
                <div style={{ padding: '6px 4px' }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, padding: '4px 10px 6px' }}>Account</div>
                  <DropItem icon={<CardIcon style={iconSt} />}    label="Piano"   onClick={() => goSettings("/impostazioni/piano")} />
                  <DropItem icon={<UserIcon style={iconSt} />}    label="Profilo" onClick={() => goSettings("/impostazioni/profilo")} />
                </div>

                {/* Studio */}
                <div style={{ padding: '6px 4px', borderTop: `0.5px solid ${T.ink10}` }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, padding: '4px 10px 6px' }}>Studio</div>
                  <DropItem icon={darkMode ? <MoonIcon style={iconSt} /> : <SunIcon style={iconSt} />} label="Aspetto"          onClick={() => { setDarkMode(!darkMode); goSettings("/impostazioni/aspetto"); }} />
                  <DropItem icon={<UsersIcon style={iconSt} />}   label="Gestione Utenti"   onClick={() => goSettings("/impostazioni/utenti")} />
                  <DropItem icon={<SettingsIcon style={iconSt} />} label="Gestione Servizi" onClick={() => goSettings("/impostazioni/servizi")} />
                  <DropItem icon={<BellIcon style={iconSt} />}    label="Notifiche"         onClick={() => goSettings("/impostazioni/notifiche")} />
                </div>

                {/* Data */}
                <div style={{ padding: '6px 4px', borderTop: `0.5px solid ${T.ink10}` }}>
                  <DropItem icon={<BriefcaseIcon style={iconSt} />} label="Clienti"                onClick={() => goSettings("/impostazioni/clienti")} />
                  <DropItem icon={<ArchiveIcon style={iconSt} />}   label="Progetti Archiviati"    onClick={() => goSettings("/impostazioni/progetti-archiviati")} />
                  <DropItem icon={<FolderIcon style={iconSt} />}    label="Commesse Archiviate"    onClick={() => goSettings("/impostazioni/commesse-archiviate")} />
                </div>

                {/* Logout */}
                <div style={{ padding: '6px 4px', borderTop: `0.5px solid ${T.ink10}` }}>
                  <DropItem icon={<LogoutIcon style={{ ...iconSt, color: '#b91c1c' }} />} label="Esci" onClick={handleLogout} danger />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: '28px 28px', overflowY: 'auto', background: '#EEF1F6' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
