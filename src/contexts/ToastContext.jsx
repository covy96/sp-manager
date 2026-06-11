import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useTheme } from "./ThemeContext";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

/* ─── singolo toast ─────────────────────────────────────────────────── */
function ToastItem({ id, message, type, onRemove }) {
  const { T } = useTheme();

  const bg = type === "error"   ? "#c0392b"
           : type === "success" ? "#1a6b3c"
           : type === "warning" ? "#b8600a"
           : T.navy;

  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        background: bg,
        color: "#fff",
        padding: "11px 14px",
        borderRadius: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 13,
        lineHeight: 1.4,
        maxWidth: 340,
        minWidth: 220,
        animation: "toast-in 0.18s ease",
        cursor: "default",
        userSelect: "none",
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => onRemove(id)}
        style={{
          background: "none", border: "none", color: "rgba(255,255,255,0.7)",
          cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
        }}
      >×</button>
    </div>
  );
}

/* ─── provider ──────────────────────────────────────────────────────── */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timerRefs = useRef({});

  const remove = useCallback((id) => {
    clearTimeout(timerRefs.current[id]);
    delete timerRefs.current[id];
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = "error", duration = type === "success" ? 1500 : 4000) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    timerRefs.current[id] = setTimeout(() => remove(id), duration);
  }, [remove]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      {/* ── stack toast in basso a destra ── */}
      <div style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 99999,
        display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end",
        pointerEvents: "none",
      }}>
        <style>{`
          @keyframes toast-in {
            from { opacity: 0; transform: translateY(10px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <ToastItem {...t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
