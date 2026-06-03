import { useEffect } from "react";

/**
 * Blocca lo scroll del body quando `locked` è true.
 * Funziona su desktop e mobile (iOS compreso).
 */
export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position   = "fixed";
    body.style.top        = `-${scrollY}px`;
    body.style.left       = "0";
    body.style.right      = "0";
    body.style.overflowY  = "scroll"; // mantieni la scrollbar per evitare salti layout
    return () => {
      body.style.position  = "";
      body.style.top       = "";
      body.style.left      = "";
      body.style.right     = "";
      body.style.overflowY = "";
      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
