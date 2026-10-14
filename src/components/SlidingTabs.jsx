import { useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Segmented control stile Apple (iOS/macOS):
 * il "pollice" bianco scorre sotto il segmento attivo, senza rimbalzo.
 *
 * Props:
 *   tabs: [{ key, label }]
 *   active: key del tab attivo
 *   onChange: (key) => void
 *   fullWidth: true = occupa tutta la larghezza, segmenti di pari misura
 *   style: stili extra sul wrapper
 */
export default function SlidingTabs({ tabs, active, onChange, fullWidth = false, style = {} }) {
  const { T, isDark } = useTheme();
  const containerRef = useRef(null);
  const btnRefs = useRef({});
  const [thumb, setThumb] = useState({ left: 0, width: 0, opacity: 0 });
  const [isReady, setIsReady] = useState(false);
  const [pressed, setPressed] = useState(null);

  // Misura il segmento attivo e sposta il pollice (anche quando cambia la larghezza)
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const activeBtn = btnRefs.current[active];
      if (!activeBtn) { setThumb(t => ({ ...t, opacity: 0 })); return; }
      setThumb({ left: activeBtn.offsetLeft, width: activeBtn.offsetWidth, opacity: 1 });
    };
    measure();
    const raf = requestAnimationFrame(() => setIsReady(true));
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(container);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, [active, tabs]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      className="asm-seg"
      style={{
        position: "relative",
        display: fullWidth ? "flex" : "inline-flex",
        width: fullWidth ? "100%" : undefined,
        background: isDark ? "rgba(118,118,128,0.24)" : "rgba(118,118,128,0.12)",
        padding: 2,
        gap: 0,
        ...style,
      }}
    >
      {/* Pollice scorrevole */}
      <div
        className="asm-seg-thumb"
        style={{
          position: "absolute",
          top: 2,
          bottom: 2,
          left: thumb.left,
          width: thumb.width,
          background: isDark ? "#636366" : "#ffffff",
          boxShadow: isDark
            ? "0 3px 8px rgba(0,0,0,0.25), 0 1px 1px rgba(0,0,0,0.2)"
            : "0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)",
          opacity: thumb.opacity,
          transform: pressed && pressed === active ? "scale(0.95)" : "scale(1)",
          // Molla criticamente smorzata: nessun rimbalzo
          transition: isReady
            ? "left 320ms cubic-bezier(0.32, 0.72, 0, 1), width 320ms cubic-bezier(0.32, 0.72, 0, 1), transform 160ms ease-out, opacity 150ms ease"
            : "none",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {tabs.map((tab, i) => {
        const isActive = active === tab.key;
        const prevActive = i > 0 && active === tabs[i - 1].key;
        return (
          <button
            key={tab.key}
            ref={el => { btnRefs.current[tab.key] = el; }}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            onPointerDown={() => setPressed(tab.key)}
            onPointerUp={() => setPressed(null)}
            onPointerLeave={() => setPressed(null)}
            onPointerCancel={() => setPressed(null)}
            style={{
              position: "relative",
              zIndex: 1,
              flex: fullWidth ? "1 1 auto" : undefined,
              minWidth: 0,
              padding: fullWidth ? "5px 8px" : "5px 14px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              lineHeight: "18px",
              color: isActive ? T.ink : (isDark ? "rgba(235,235,245,0.75)" : "rgba(60,60,67,0.85)"),
              fontWeight: isActive ? 600 : 500,
              opacity: pressed === tab.key && !isActive ? 0.55 : 1,
              transition: "color 200ms ease, opacity 120ms ease",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {/* Separatore sottile tra segmenti non selezionati, come su iOS */}
            {i > 0 && (
              <span aria-hidden style={{
                position: "absolute", left: 0, top: "25%", bottom: "25%", width: 1,
                background: isDark ? "rgba(255,255,255,0.12)" : "rgba(60,60,67,0.18)",
                opacity: isActive || prevActive ? 0 : 1,
                transition: "opacity 200ms ease",
              }} />
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
