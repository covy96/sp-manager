-- Fix: consenti ai membri condivisi di aggiornare il contenuto della nota
-- La RLS UPDATE blocca chi non è author_id — usiamo SECURITY DEFINER per bypassarla

CREATE OR REPLACE FUNCTION update_note_content(
  p_note_id    uuid,
  p_member_id  uuid,
  p_content    text,
  p_updated_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Aggiorna solo se il membro è l'autore OPPURE è in shared_with
  UPDATE notes
  SET content    = p_content,
      updated_at = p_updated_at
  WHERE id         = p_note_id
    AND deleted_at IS NULL
    AND (
      author_id = p_member_id
      OR p_member_id = ANY(COALESCE(shared_with, '{}'))
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota non trovata o accesso negato';
  END IF;
END;
$$;
