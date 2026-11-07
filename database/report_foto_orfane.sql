-- Foto dei report rimaste su Storage senza più un report collegato.
--
-- Il database non può cancellare file da Supabase Storage: quando un report
-- viene eliminato definitivamente (Cestino → "Elimina definitivamente",
-- pulizia automatica dopo 30 giorni, eliminazione del progetto) spariscono
-- le righe di report_cantiere_foto ma i file .jpg restano nel bucket.
--
-- Questa funzione elenca quei file (solo dello studio indicato) così l'app
-- può rimuoverli via Storage API. Esclude i file caricati nell'ultima ora
-- per non toccare un upload in corso (il file viene caricato prima della riga).
--
-- Eseguire UNA VOLTA nel SQL Editor di Supabase. Da sola non cancella nulla.

CREATE OR REPLACE FUNCTION public.report_foto_orfane(p_studio_id uuid)
RETURNS TABLE (path text, size bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  PERFORM _check_studio_member(p_studio_id);
  RETURN QUERY
  SELECT o.name::text, (o.metadata->>'size')::bigint
  FROM storage.objects o
  WHERE o.bucket_id = 'report-foto'
    AND o.name LIKE p_studio_id::text || '/%'
    AND o.created_at < now() - interval '1 hour'
    AND NOT EXISTS (
      SELECT 1 FROM report_cantiere_foto f
      WHERE split_part(split_part(f.url, '/report-foto/', 2), '?', 1) = o.name
    );
END; $$;

REVOKE ALL ON FUNCTION public.report_foto_orfane(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.report_foto_orfane(uuid) TO authenticated;

-- Verifica (sostituisci con l'id dello studio):
-- SELECT count(*), pg_size_pretty(sum(size)) FROM report_foto_orfane('<studio_id>');
