import { supabase } from "./supabase";

// Chiamate alla edge function "outlook". I token Microsoft restano sul server:
// qui arrivano solo lo stato del collegamento e le mail già lette da Graph.
async function call(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("outlook", { body: { action, ...payload } });
  if (error) {
    let msg = error.message;
    let notConnected = false;
    try {
      const body = await error.context.json();
      msg = body.error || msg;
      notConnected = !!body.notConnected;
    } catch { /* risposta non JSON */ }
    const err = new Error(msg);
    err.notConnected = notConnected;
    throw err;
  }
  return data;
}

export const outlookStatus = () => call("status");

// Porta l'utente al login Microsoft; al ritorno si torna su `returnTo`
// con ?outlook=connected oppure ?outlook=error&msg=…
export async function connectOutlook(returnTo = window.location.href.split("?")[0]) {
  const { url } = await call("auth-url", { returnTo });
  window.location.assign(url);
}

export const disconnectOutlook = () => call("disconnect");

export const listOutlookMessages = ({ search, addresses, next, top } = {}) =>
  call("messages", { search, addresses, next, top });

export const getOutlookMessage = (id) => call("message", { id }).then(d => d.message);

export const setOutlookAutoSync = (autoSync) => call("settings", { autoSync });

// Controlla subito le mail nuove (stessa logica del giro automatico ogni 15 minuti)
export const syncOutlookNow = () => call("sync");
