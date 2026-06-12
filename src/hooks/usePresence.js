import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Traccia chi sta guardando una risorsa in tempo reale via Supabase Realtime Presence.
 * @param {string} channelName  – es. "project:uuid"
 * @param {{ id, name, color }} me  – dati dell'utente corrente
 * @returns {Array} lista di presenti (escluso se stesso), es. [{ id, name, color }]
 */
export function usePresence(channelName, me) {
  const [others, setOthers] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!channelName || !me?.id) return;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: me.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const list = Object.entries(state)
          .filter(([key]) => key !== me.id)
          .map(([, presences]) => presences[0])
          .filter(Boolean);
        setOthers(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ id: me.id, name: me.name, color: me.color });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      setOthers([]);
    };
  }, [channelName, me?.id]);

  return others;
}
