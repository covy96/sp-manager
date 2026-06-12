import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export function useGlobalSearch(studioId) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  const search = useCallback(async (q) => {
    if (!q || q.length < 3 || !studioId) { setResults([]); return; }
    setLoading(true);

    const like = `%${q}%`;

    const [
      projActiveRes,
      projArchRes,
      commActiveRes,
      commArchRes,
      taskRes,
      contactRes,
    ] = await Promise.all([
      // Progetti attivi
      supabase.from("projects")
        .select("id,name,client")
        .eq("studio", studioId).eq("archived", false).is("deleted_at", null)
        .ilike("name", like).limit(4),

      // Progetti archiviati
      supabase.from("projects")
        .select("id,name,client")
        .eq("studio", studioId).eq("archived", true).is("deleted_at", null)
        .ilike("name", like).limit(3),

      // Commesse attive
      supabase.from("commesse")
        .select("id,nome_commessa,cliente,numero_offerta")
        .eq("studio", studioId).eq("archived", false).is("deleted_at", null)
        .or(`nome_commessa.ilike.${like},cliente.ilike.${like},numero_offerta.ilike.${like}`)
        .limit(4),

      // Commesse archiviate
      supabase.from("commesse")
        .select("id,nome_commessa,cliente,numero_offerta")
        .eq("studio", studioId).eq("archived", true).is("deleted_at", null)
        .or(`nome_commessa.ilike.${like},cliente.ilike.${like},numero_offerta.ilike.${like}`)
        .limit(3),

      // Task attive
      supabase.from("tasks")
        .select("id,title,project_id,categoria,status")
        .eq("studio", studioId).ilike("title", like).neq("status", "completed")
        .limit(4),

      // Contatti
      supabase.from("global_contacts")
        .select("id,full_name,company")
        .eq("studio", studioId).ilike("full_name", like)
        .limit(3),
    ]);

    const items = [];

    // Progetti attivi
    (projActiveRes.data ?? []).forEach(p => items.push({
      id: p.id, type: "progetto", label: p.name,
      sub: p.client || "—",
      path: `/progetti/${p.id}`,
      archived: false,
    }));

    // Progetti archiviati
    (projArchRes.data ?? []).forEach(p => items.push({
      id: p.id, type: "progetto", label: p.name,
      sub: p.client || "—",
      path: `/impostazioni/progetti-archiviati/${p.id}`,
      archived: true,
    }));

    // Commesse attive
    (commActiveRes.data ?? []).forEach(c => items.push({
      id: c.id, type: "commessa", label: c.nome_commessa,
      sub: `${c.numero_offerta ? c.numero_offerta + " · " : ""}${c.cliente || "—"}`,
      path: `/commesse/${c.id}`,
      archived: false,
    }));

    // Commesse archiviate
    (commArchRes.data ?? []).forEach(c => items.push({
      id: c.id, type: "commessa", label: c.nome_commessa,
      sub: `${c.numero_offerta ? c.numero_offerta + " · " : ""}${c.cliente || "—"}`,
      path: `/impostazioni/commesse-archiviate/${c.id}`,
      archived: true,
    }));

    // Task
    (taskRes.data ?? []).forEach(t => items.push({
      id: t.id, type: "task", label: t.title,
      sub: t.categoria || "—", path: null, projectId: t.project_id,
      archived: false,
    }));

    // Contatti
    (contactRes.data ?? []).forEach(c => items.push({
      id: c.id, type: "cliente", label: c.full_name,
      sub: c.company || "—", path: "/impostazioni/clienti",
      archived: false,
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
