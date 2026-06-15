import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useStudio() {
  const [user, setUser] = useState(null);
  const [teamMember, setTeamMember] = useState(null);
  const [studioId, setStudioId] = useState(null);
  const [studio, setStudio] = useState(null);
  const [studioDeleted, setStudioDeleted] = useState(false);
  const [studioDeleteAfter, setStudioDeleteAfter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);

      if (!u?.id) {
        setLoading(false);
        return;
      }

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

setTeamMember(tm ?? null);
      const sid = tm?.studio ?? null;
      setStudioId(sid);

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
          setStudio(st);
          setStudioDeleted(false);
          setStudioDeleteAfter(null);
        } else if (st && st.deleted_at) {
          // Studio in retention: tieni studioId per il recupero dati
          setStudio(st);
          setStudioId(sid);
          setStudioDeleted(true);
          setStudioDeleteAfter(st.delete_after ?? null);
        } else {
          // Studio inesistente (già purgato): nessuno studio
          setStudio(null);
          setStudioId(null);
          setStudioDeleted(false);
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
          setStudio(ownedStudio);
          setStudioId(ownedStudio.id);
          localStorage.setItem("asm-active-studio", ownedStudio.id);
          // Aggiorna anche il team_member se esiste
          if (tm?.id) {
            await supabase.from("team_members")
              .update({ studio: ownedStudio.id, role_internal: "Owner" })
              .eq("id", tm.id);
          }
        }
      }

      setLoading(false);
    };

    load();
  }, []);

  return { user, teamMember, studioId, studio, studioDeleted, studioDeleteAfter, loading };
}
