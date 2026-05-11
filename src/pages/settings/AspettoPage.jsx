import { useEffect, useState } from "react";
import { usePageTitleOnMount } from "../../hooks/usePageTitle";

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

// Monitor icon
function MonitorIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export default function AspettoPage() {
  usePageTitleOnMount("Aspetto");
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (selectedTheme) => {
    const root = document.documentElement;
    if (selectedTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (selectedTheme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      // System preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.add("light");
        root.classList.remove("dark");
      }
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const themes = [
    { id: "light", label: "Chiaro", icon: SunIcon },
    { id: "dark", label: "Scuro", icon: MoonIcon },
    { id: "system", label: "Sistema", icon: MonitorIcon },
  ];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Aspetto</h2>
        <p className="text-sm text-white/60">Personalizza l&apos;aspetto dell&apos;applicazione</p>
      </div>

      <div className="rounded-xl border border-[#48484a] bg-[#2c2c2e] p-6">
        <h3 className="mb-4 text-lg font-medium text-white">Tema</h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {themes.map((t) => {
            const Icon = t.icon;
            const isSelected = theme === t.id;

            return (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={`flex flex-col items-center gap-3 rounded-lg border p-4 transition ${
                  isSelected
                    ? "border-[#0a84ff] bg-[#0a84ff]/10"
                    : "border-[#48484a] bg-[#3a3a3c] hover:border-[#0a84ff]/50"
                }`}
              >
                <Icon className={`h-8 w-8 ${isSelected ? "text-[#0a84ff]" : "text-white/60"}`} />
                <span className={`text-sm font-medium ${isSelected ? "text-white" : "text-white/80"}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-sm text-white/50">
          Il tema scuro è attualmente l&apos;unico tema completamente supportato. Il tema chiaro è in sviluppo.
        </p>
      </div>
    </div>
  );
}
