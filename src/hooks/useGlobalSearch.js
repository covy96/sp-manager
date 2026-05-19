import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export function useGlobalSearch(studioId) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const timer = useRef(null);

  const search = useCallback(async (q) => {
    if (!q || q.length < 3 || !studioId) { setResults([]); return; }
    setLoading(true);

    const like = `%${q}%`;

    const [projRes, commRes, taskRes, contactRes] = await Promise.all([
      supabase.from("projects").select("id,name,client").eq("studio", studioId).eq("archived", false).ilike("name", like).limit(4),
      supabase.from("commesse").select("id,nome_commessa,cliente,numero_offerta").eq("studio", studioId).or(`nome_commessa.ilike.${like},cliente.ilike.${like},numero_offerta.ilike.${like}`).limit(4),
      supabase.from("tasks").select("id,title,project_id,categoria,status").eq("studio", studioId).ilike("title", like).neq("status","completed").limit(4),
      supabase.from("global_contacts").select("id,full_name,company").eq("studio", studioId).ilike("full_name", like).limit(3),
    ]);

    const items = [];

    (projRes.data ?? []).forEach(p => items.push({
      id: p.id, type: "progetto", label: p.name,
      sub: p.client || "—", path: `/progetti/${p.id}`,
    }));
    (commRes.data ?? []).forEach(c => items.push({
      id: c.id, type: "commessa", label: c.nome_commessa,
      sub: `${c.numero_offerta ? c.numero_offerta + " · " : ""}${c.cliente || "—"}`,
      path: `/commesse/${c.id}`,
    }));
    (taskRes.data ?? []).forEach(t => items.push({
      id: t.id, type: "task", label: t.title,
      sub: t.categoria || "—", path: null, projectId: t.project_id,
    }));
    (contactRes.data ?? []).forEach(c => items.push({
      id: c.id, type: "cliente", label: c.full_name,
      sub: c.company || "—", path: "/impostazioni/clienti",
    }));

    setResults(items);
    setLoading(false);
  }, [studioId]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (query.length < 3) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timer.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer.current);
  }, [query, search]);

  const clear = () => { setQuery(""); setResults([]); };

  return { query, setQuery, results, loading, clear };
}
