import * as Sentry from "@sentry/react";

// DSN letto dalle variabili d'ambiente (Vercel / .env).
// Se non è impostato, Sentry resta disattivato e l'app funziona normalmente.
const DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    // Cattura automaticamente crash, errori JS non gestiti e promise rifiutate.
    // Niente tracing/replay: solo segnalazione errori → email.
    tracesSampleRate: 0,
  });
}

/** Segnala a Sentry un messaggio d'errore mostrato all'utente (toast rosso). */
export function reportToastError(message) {
  if (!DSN) return;
  Sentry.captureMessage(typeof message === "string" ? message : String(message), "error");
}

export { Sentry };
