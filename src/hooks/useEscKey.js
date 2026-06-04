import { useEffect } from "react";

/**
 * Chiama `handler` quando viene premuto Escape.
 * `enabled` permette di disabilitare il listener se il popup è chiuso.
 */
export function useEscKey(handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => { if (e.key === "Escape") handler(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handler, enabled]);
}
