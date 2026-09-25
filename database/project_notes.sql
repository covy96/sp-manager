-- Feature: casella "Note di progetto" (bacheca condivisa nel team, con checklist).
-- Riusa la tabella `notes` della scrivania, aggiungendo un legame al progetto.
-- Una sola casella condivisa per progetto: tutti i membri dello studio la vedono
-- e la modificano (a differenza delle note della scrivania, private/condivise 1:1).
--
-- Esegui UNA VOLTA nel SQL Editor di Supabase (stesso ambiente delle altre note).

-- 1. Colonna di collegamento al progetto (NULL = nota della scrivania, come prima)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE CASCADE;

-- 2. Una sola nota "viva" per progetto (evita doppioni se due membri aprono insieme)
CREATE UNIQUE INDEX IF NOT EXISTS notes_one_per_project
  ON notes (project_id)
  WHERE project_id IS NOT NULL AND deleted_at IS NULL;

-- 3. La scrivania NON deve mostrare le note di progetto: escludi project_id non nullo
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
    AND project_id IS NULL
    AND (
      author_id  = p_member_id
      OR p_member_id = ANY(COALESCE(shared_with, '{}'))
    )
  ORDER BY updated_at DESC;
$$;

-- 4. Recupera (o crea) la casella note condivisa di un progetto
CREATE OR REPLACE FUNCTION get_or_create_project_note(
  p_studio_id   uuid,
  p_project_id  uuid,
  p_member_id   uuid
)
RETURNS notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note notes;
BEGIN
  -- Sicurezza: il membro deve appartenere allo studio del progetto
  IF NOT EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.id = p_member_id AND tm.studio = p_studio_id
  ) THEN
    RAISE EXCEPTION 'Accesso negato allo studio';
  END IF;

  SELECT * INTO v_note
  FROM notes
  WHERE project_id = p_project_id AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_note;
  END IF;

  INSERT INTO notes (content, color, is_private, shared_with, studio, author_id, project_id)
  VALUES ('', '#FFF9C4', false, '{}', p_studio_id, p_member_id, p_project_id)
  ON CONFLICT (project_id) WHERE (project_id IS NOT NULL AND deleted_at IS NULL)
  DO NOTHING
  RETURNING * INTO v_note;

  -- Se un altro membro l'ha creata in contemporanea (conflitto), rileggila
  IF v_note.id IS NULL THEN
    SELECT * INTO v_note
    FROM notes
    WHERE project_id = p_project_id AND deleted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  RETURN v_note;
END;
$$;

-- 5. Aggiorna il contenuto della casella: consentito a qualsiasi membro dello studio
CREATE OR REPLACE FUNCTION update_project_note_content(
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
  UPDATE notes n
  SET content    = p_content,
      updated_at = p_updated_at
  WHERE n.id         = p_note_id
    AND n.deleted_at IS NULL
    AND n.project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = p_member_id AND tm.studio = n.studio
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota di progetto non trovata o accesso negato';
  END IF;
END;
$$;
