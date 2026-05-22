import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useStudio() {
  const [user, setUser] = useState(null);
  const [teamMember, setTeamMember] = useState(null);
  const [studioId, setStudioId] = useState(null);
  const [studio, setStudio] = useState(null);
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

      if (sid) {
        const { data: st } = await supabase
          .from("studios")
          .select("*")
          .eq("id", sid)
          .single();
setStudio(st ?? null);
      } else {
        // Fallback: cerca uno studio di cui l'utente è owner (team_member senza studio)
        const { data: ownedStudio } = await supabase
          .from("studios")
          .select("*")
          .eq("owner_id", u.id)
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

  return { user, teamMember, studioId, studio, loading };
}
