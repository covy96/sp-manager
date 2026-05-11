import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { useStudio } from "../hooks/useStudio";
import { usePageTitle } from "../contexts/PageTitleContext";
import { supabase } from "../lib/supabase";

const ALL_MENU_ITEMS = [
  { label: "Dashboard", path: "/dashboard", roles: "all" },
  { label: "Progetti", path: "/progetti", roles: "all" },
  { label: "Le mie Task", path: "/le-mie-task", roles: "all" },
  { label: "Timesheet", path: "/timesheet", roles: "all" },
  { label: "Calendario", path: "/calendario", roles: "all" },
  { label: "Team", path: "/team", roles: "all" },
  { label: "Commesse", path: "/commesse", roles: "pm" },
  { label: "Monitoraggio Commesse", path: "/monitoraggio-commesse", roles: "pm" },
  { label: "Proforma", path: "/proforma", roles: "pm" },
  { label: "Clienti", path: "/clienti", roles: "pm" },
  { label: "Report", path: "/report", roles: "pm" },
  { label: "Gantt Progetti", path: "/gantt-progetti", roles: "pm" },
];

// Get initials from name or email
function getInitials(text) {
  if (!text) return "?";
  const parts = text.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
}

// Search icon
function SearchIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

// Chevron down icon
function ChevronDownIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// User icon
function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

// Palette icon
function PaletteIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  );
}

// Settings icon
function SettingsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Logout icon
function LogoutIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

// Moon icon
function MoonIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

// Sun icon
function SunIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

// Briefcase icon
function BriefcaseIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

// Archive icon
function ArchiveIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  );
}

// Folder icon
function FolderIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

// Users icon
function UsersIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

export default function AppLayout({ session, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const { teamMember, studioId } = useStudio();
  const { pageTitle } = usePageTitle();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchShortcut, setShowSearchShortcut] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const settingsRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut ⌘K or Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Detect OS for shortcut label
  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    setShowSearchShortcut(isMac);
  }, []);

  const menuItems = useMemo(() => {
    return ALL_MENU_ITEMS.filter((item) => {
      if (item.roles === "all") return true;
      if (item.roles === "pm") return permissions.isProjectManager;
      if (item.roles === "owner") return permissions.isOwner;
      return true;
    });
  }, [permissions.isProjectManager, permissions.isOwner]);

  // Get page title from context, or fallback to route label
  const currentPageTitle = pageTitle ||
    ALL_MENU_ITEMS.find((item) => item.path === location.pathname)?.label ||
    "ASM";

  // Avatar color (fallback if no color set)
  const avatarColor = teamMember?.color || "#0a84ff";
  const avatarInitials = getInitials(teamMember?.user_name || session?.user?.email || "U");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // TODO: Implement global search
    console.log("Search:", searchQuery);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // TODO: Apply dark/light mode to document
  };

  return (
    <div className="flex min-h-screen bg-[#1c1c1e] text-[#f5f5f7]">
      {/* Sidebar */}
      <aside className="flex w-72 flex-col border-r border-white/10 bg-[#2c2c2e] p-4">
        <div className="mb-6 rounded-lg bg-[#1c1c1e] p-4">
          <p className="text-lg font-semibold">ASM</p>
          <p className="mt-1 text-xs text-white/60">Architect Studio Management</p>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-[#0a84ff] text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* New Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#48484a] bg-[#1c1c1e] px-6">
          {/* Left: Page Title */}
          <h1 className="text-lg font-bold text-white">{currentPageTitle}</h1>

          {/* Center: Global Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cerca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#48484a] bg-[#2c2c2e] py-2 pl-10 pr-16 text-sm text-white placeholder-white/40 outline-none focus:border-[#0a84ff]"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#48484a] px-1.5 py-0.5 text-[10px] font-medium text-white/60">
                {showSearchShortcut ? "⌘K" : "Ctrl+K"}
              </kbd>
            </div>
          </form>

          {/* Right: User Avatar with Dropdown */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white transition hover:brightness-110 focus:outline-none"
              style={{ backgroundColor: avatarColor }}
              title="Impostazioni"
            >
              {avatarInitials}
            </button>

            {/* Settings Dropdown */}
            {settingsOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-[#48484a] bg-[#2c2c2e] shadow-2xl">
                {/* User Info Header */}
                <div className="border-b border-[#48484a] px-4 py-3">
                  <p className="text-sm font-medium text-white">{teamMember?.user_name || "Utente"}</p>
                  <p className="text-xs text-white/50">{session?.user?.email}</p>
                </div>

                {/* Account Section */}
                <div className="px-2 py-2">
                  <p className="px-2 py-1 text-xs font-medium text-white/40 uppercase">Account</p>
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      navigate("/impostazioni/profilo");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                  >
                    <UserIcon className="h-4 w-4" />
                    Profilo
                  </button>
                </div>

                {/* Studio Section */}
                <div className="border-t border-[#48484a] px-2 py-2">
                  <p className="px-2 py-1 text-xs font-medium text-white/40 uppercase">Studio</p>
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      navigate("/impostazioni/aspetto");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                  >
                    {darkMode ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
                    Aspetto
                  </button>
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      navigate("/impostazioni/utenti");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                  >
                    <UsersIcon className="h-4 w-4" />
                    Gestione Utenti
                  </button>
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      navigate("/impostazioni/servizi");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                  >
                    <SettingsIcon className="h-4 w-4" />
                    Gestione Servizi
                  </button>
                </div>

                {/* Data Section */}
                <div className="border-t border-[#48484a] px-2 py-2">
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      navigate("/impostazioni/clienti");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                  >
                    <BriefcaseIcon className="h-4 w-4" />
                    Clienti
                  </button>
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      navigate("/impostazioni/progetti-archiviati");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                  >
                    <ArchiveIcon className="h-4 w-4" />
                    Progetti Archiviati
                  </button>
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      navigate("/impostazioni/commesse-archiviate");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white/90 hover:bg-white/10"
                  >
                    <FolderIcon className="h-4 w-4" />
                    Commesse Archiviate
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-[#48484a] px-2 py-2">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#ff453a] hover:bg-white/10"
                  >
                    <LogoutIcon className="h-4 w-4" />
                    Esci
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

