-- Fix note condivise: RLS bloccava le righe degli altri utenti.
-- Funzione SECURITY DEFINER per leggere le note visibili a un membro
-- (proprie + condivise con lui).
-- Esegui nel SQL Editor di Supabase Dashboard.

CREATE OR REPLACE FUNCTION get_notes_for_member(
  p_studio_id  uuid,
  p_member_id  uuid
)
RETURNS SETOF notes
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM notes
  WHERE studio     = p_studio_id
    AND deleted_at IS NULL
    AND (
      author_id  = p_member_id
      OR p_member_id = ANY(COALESCE(shared_with, '{}'))
    )
  ORDER BY updated_at DESC;
$$;
