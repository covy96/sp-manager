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

      const { data: tm } = await supabase
        .from("team_members")
        .select("*")
        .eq("user_account", u.id)
        .single();

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
      }

      setLoading(false);
    };

    load();
  }, []);

  return { user, teamMember, studioId, studio, loading };
}
