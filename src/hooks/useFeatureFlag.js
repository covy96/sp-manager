import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useStudio } from "./useStudio";

export function useFeatureFlag(flag) {
  const { user, loading: studioLoading } = useStudio();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aspetta che useStudio abbia risolto l'utente prima di decidere
    if (studioLoading) return;
    if (!user?.id) { setLoading(false); return; }
    supabase
      .from("feature_flags")
      .select("enabled")
      .eq("user_id", user.id)
      .eq("flag", flag)
      .maybeSingle()
      .then(({ data }) => {
        setEnabled(data?.enabled ?? false);
        setLoading(false);
      });
  }, [user?.id, flag, studioLoading]);

  return { enabled, loading };
}
