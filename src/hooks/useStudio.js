import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Stato studio condiviso tra tutte le istanze dell'hook.
// Prima ogni componente che usava useStudio (layout, gate, permessi, piano,
// pagina…) rifaceva da solo getUser + team_members + studios: all'avvio su
// mobile erano ~30 richieste, e le getUser (chiamata di rete) venivano pure
// serializzate dal lock di supabase-js → secondi di attesa a ogni apertura.
// Ora la prima istanza carica, le altre riusano la stessa promessa/risultato.
const FRESH_MS = 60_000;
let cache = null;     // { key, at, value }
let inflight = null;  // { key, promise }

const EMPTY = { user: null, teamMember: null, studioId: null, studio: null, studioDeleted: false, studioDeleteAfter: null };

async function fetchStudioState() {
  // getSession legge la sessione locale (nessuna chiamata di rete, a meno
  // che il token sia da rinnovare); getUser faceva un round-trip ogni volta.
  const { data: { session } } = await supabase.auth.getSession();
  const u = session?.user ?? null;
  if (!u?.id) return { ...EMPTY };

  // Usa select multiplo per gestire duplicati senza errore
  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .eq("user_account", u.id)
    .order("created_at", { ascending: false });

  let tm = null;
  if (members && members.length > 0) {
    const savedStudioId = localStorage.getItem("asm-active-studio");
    // Preferisci il record con lo studio salvato in localStorage
    tm = (savedStudioId && members.find(m => m.studio === savedStudioId))
      || members.find(m => m.studio)   // qualsiasi con studio
      || members[0];                    // fallback al più recente
  }

  const out = { ...EMPTY, user: u, teamMember: tm ?? null, studioId: tm?.studio ?? null };
  const sid = out.studioId;

  // Gestione studio cancellato (deleted_at valorizzato):
  // durante la retention (30gg) lo studio NON viene azzerato — manteniamo
  // studioId così l'utente può accedere alla sola pagina di recupero dati.
  // Lo segnaliamo con studioDeleted; il routing lo dirotta sulla pagina di export.
  if (sid) {
    const { data: st } = await supabase
      .from("studios")
      .select("*")
      .eq("id", sid)
      .single();
    if (st && !st.deleted_at) {
      out.studio = st;
    } else if (st && st.deleted_at) {
      // Studio in retention: tieni studioId per il recupero dati
      out.studio = st;
      out.studioDeleted = true;
      out.studioDeleteAfter = st.delete_after ?? null;
    } else {
      // Studio inesistente (già purgato): nessuno studio
      out.studioId = null;
      localStorage.removeItem("asm-active-studio");
    }
  } else {
    // Fallback: cerca uno studio di cui l'utente è owner (team_member senza studio)
    const { data: ownedStudio } = await supabase
      .from("studios")
      .select("*")
      .eq("owner_id", u.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (ownedStudio) {
      out.studio = ownedStudio;
      out.studioId = ownedStudio.id;
      localStorage.setItem("asm-active-studio", ownedStudio.id);
      // Aggiorna anche il team_member se esiste
      if (tm?.id) {
        await supabase.from("team_members")
          .update({ studio: ownedStudio.id, role_internal: "Owner" })
          .eq("id", tm.id);
      }
    }
  }
  return out;
}

// La chiave lega la cache all'utente loggato e allo studio attivo:
// login/logout o cambio studio invalidano automaticamente.
async function cacheKey() {
  const { data: { session } } = await supabase.auth.getSession();
  return `${session?.user?.id ?? ""}|${localStorage.getItem("asm-active-studio") ?? ""}`;
}

function loadShared(key) {
  if (inflight && inflight.key === key) return inflight.promise;
  const promise = fetchStudioState()
    .then((value) => {
      // Mettiamo in cache solo esiti "completi": se lo studio non c'è
      // (onboarding in corso) le istanze successive riproveranno.
      if (value.studioId) cache = { key, at: Date.now(), value };
      return value;
    })
    .finally(() => { if (inflight?.promise === promise) inflight = null; });
  inflight = { key, promise };
  return promise;
}

supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") {
    cache = null;
    inflight = null;
  }
});

export function useStudio() {
  const activeStudio = localStorage.getItem("asm-active-studio") ?? "";
  const initial = cache && cache.key.endsWith(`|${activeStudio}`) ? cache.value : null;
  const [state, setState] = useState(initial ?? EMPTY);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    let alive = true;
    (async () => {
      const key = await cacheKey();
      if (cache && cache.key === key) {
        if (alive) { setState(cache.value); setLoading(false); }
        if (Date.now() - cache.at < FRESH_MS) return;
      } else if (alive) {
        setLoading(true);
      }
      const value = await loadShared(key);
      if (alive) { setState(value); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  return { ...state, loading };
}
