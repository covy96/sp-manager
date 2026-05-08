import { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
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

export default function AppLayout({ session, children }) {
  const location = useLocation();
  const permissions = usePermissions();

  const menuItems = useMemo(() => {
    return ALL_MENU_ITEMS.filter((item) => {
      if (item.roles === "all") return true;
      if (item.roles === "pm") return permissions.isProjectManager;
      if (item.roles === "owner") return permissions.isOwner;
      return true;
    });
  }, [permissions.isProjectManager, permissions.isOwner]);

  const currentPage =
    ALL_MENU_ITEMS.find((item) => item.path === location.pathname)?.label ?? "ASM";
  const email = session?.user?.email ?? "Utente";

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex min-h-screen bg-[#1c1c1e] text-[#f5f5f7]">
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

        <div className="mt-auto pt-4">
          {permissions.canManageSettings && (
          <NavLink
            to="/impostazioni"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                isActive ? "bg-[#0a84ff] text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path
                d="M10.3 3.8c.4-1.1 2-1.1 2.4 0l.4 1.2c.2.5.7.8 1.2.9l1.2.2c1.2.2 1.7 1.7.8 2.5l-.9.8c-.4.3-.6.9-.5 1.4l.2 1.2c.2 1.2-1 2.1-2.1 1.6l-1.1-.5c-.5-.2-1-.2-1.5 0l-1.1.5c-1.1.5-2.3-.4-2.1-1.6l.2-1.2c.1-.5-.1-1.1-.5-1.4l-.9-.8c-.9-.8-.4-2.3.8-2.5l1.2-.2c.5-.1 1-.4 1.2-.9l.4-1.2Z"
              />
              <circle cx="12" cy="10.5" r="2.3" />
            </svg>
            <span>Impostazioni</span>
          </NavLink>
          )}
        </div>
      </aside>

      <div className="flex-1 p-6">
        <header className="mb-6 flex items-center justify-between rounded-xl bg-[#2c2c2e] p-4">
          <div>
            <h1 className="text-xl font-semibold">{currentPage}</h1>
            <p className="text-sm text-white/60">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
          >
            Logout
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
