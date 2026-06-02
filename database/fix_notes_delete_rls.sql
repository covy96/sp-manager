-- Permetti all'autore di eliminare la nota senza dipendere da auth.uid()
-- (elimina_nota originale usa auth.uid() che potrebbe non matchare team_members.id)

CREATE OR REPLACE FUNCTION delete_note_by_member(
  p_note_id   uuid,
  p_member_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo l'autore può eliminare la nota
  UPDATE notes
  SET deleted_at = now()
  WHERE id        = p_note_id
    AND author_id = p_member_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota non trovata o non sei l''autore';
  END IF;
END;
$$;
