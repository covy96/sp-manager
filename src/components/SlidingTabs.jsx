import { useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Tab switcher stile iPhone/macOS:
 * la pillola di sfondo scorre fluidamente tra i tab con spring animation.
 *
 * Props:
 *   tabs: [{ key, label }]
 *   active: key del tab attivo
 *   onChange: (key) => void
 *   style: stili extra sul wrapper
 */
export default function SlidingTabs({ tabs, active, onChange, style = {} }) {
  const { T, isDark } = useTheme();
  const containerRef = useRef(null);
  const btnRefs = useRef({});
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [isReady, setIsReady] = useState(false);

  // Misura la posizione del tab attivo e muovi la pillola
  useLayoutEffect(() => {
    const container = containerRef.current;
    const activeBtn = btnRefs.current[active];
    if (!container || !activeBtn) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();

    setPillStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
      opacity: 1,
    });
    setIsReady(true);
  }, [active, tabs]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-flex",
        background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
        borderRadius: 99,
        padding: 3,
        gap: 0,
        ...style,
      }}
    >
      {/* Pillola scorrevole */}
      <div
        style={{
          position: "absolute",
          top: 3,
          height: "calc(100% - 6px)",
          left: pillStyle.left,
          width: pillStyle.width,
          background: isDark ? "rgba(255,255,255,0.14)" : "#ffffff",
          borderRadius: 99,
          boxShadow: isDark
            ? "0 1px 6px rgba(0,0,0,0.35)"
            : "0 1px 6px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.06)",
          opacity: pillStyle.opacity,
          // Spring animation stile iPhone
          transition: isReady
            ? "left 280ms cubic-bezier(0.34, 1.56, 0.64, 1), width 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 150ms ease"
            : "none",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Bottoni */}
      {tabs.map(tab => (
        <button
          key={tab.key}
          ref={el => { btnRefs.current[tab.key] = el; }}
          onClick={() => onChange(tab.key)}
          style={{
            position: "relative",
            zIndex: 1,
            padding: "5px 14px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            borderRadius: 99,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: active === tab.key
              ? (isDark ? "#fff" : T.ink)
              : T.muted,
            fontWeight: active === tab.key ? 600 : 400,
            transition: "color 200ms ease",
            whiteSpace: "nowrap",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
