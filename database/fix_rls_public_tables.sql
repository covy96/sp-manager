-- Fix tabelle pubblicamente accessibili (senza RLS)
-- Esegui nel SQL Editor di Supabase Dashboard.

-- ════════════════════════════════════════════════════════════════════
-- 1. STUDIOS
-- SELECT aperta a tutti (serve per join via invite_code e per
-- utenti non ancora loggati). UPDATE/INSERT solo per autenticati.
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studios_select"  ON studios;
DROP POLICY IF EXISTS "studios_insert"  ON studios;
DROP POLICY IF EXISTS "studios_update"  ON studios;
DROP POLICY IF EXISTS "studios_delete"  ON studios;

CREATE POLICY "studios_select" ON studios FOR SELECT USING (true);

CREATE POLICY "studios_insert" ON studios FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "studios_update" ON studios FOR UPDATE
USING (
  id IN (SELECT studio FROM team_members WHERE user_account = auth.uid())
)
WITH CHECK (
  id IN (SELECT studio FROM team_members WHERE user_account = auth.uid())
);

-- DELETE: nessuno può eliminare uno studio via API
-- (omesso di proposito — default deny)

-- ════════════════════════════════════════════════════════════════════
-- 2. LAVORAZIONI_GANTT
-- Ha colonna "studio" → stesso pattern degli altri oggetti dello studio
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE lavorazioni_gantt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lavorazioni_gantt_select" ON lavorazioni_gantt;
DROP POLICY IF EXISTS "lavorazioni_gantt_insert" ON lavorazioni_gantt;
DROP POLICY IF EXISTS "lavorazioni_gantt_update" ON lavorazioni_gantt;
DROP POLICY IF EXISTS "lavorazioni_gantt_delete" ON lavorazioni_gantt;

CREATE POLICY "lavorazioni_gantt_select"
ON lavorazioni_gantt FOR SELECT
USING (
  studio IN (
    SELECT tm.studio FROM team_members tm
    WHERE tm.user_account = auth.uid() AND tm.studio IS NOT NULL
  )
);

CREATE POLICY "lavorazioni_gantt_insert"
ON lavorazioni_gantt FOR INSERT
WITH CHECK (
  studio IN (
    SELECT tm.studio FROM team_members tm
    WHERE tm.user_account = auth.uid() AND tm.studio IS NOT NULL
  )
);

CREATE POLICY "lavorazioni_gantt_update"
ON lavorazioni_gantt FOR UPDATE
USING (
  studio IN (
    SELECT tm.studio FROM team_members tm
    WHERE tm.user_account = auth.uid() AND tm.studio IS NOT NULL
  )
)
WITH CHECK (
  studio IN (
    SELECT tm.studio FROM team_members tm
    WHERE tm.user_account = auth.uid() AND tm.studio IS NOT NULL
  )
);

CREATE POLICY "lavorazioni_gantt_delete"
ON lavorazioni_gantt FOR DELETE
USING (
  studio IN (
    SELECT tm.studio FROM team_members tm
    WHERE tm.user_account = auth.uid() AND tm.studio IS NOT NULL
  )
);

-- ════════════════════════════════════════════════════════════════════
-- 3. AZIENDE_ESTERNE (tabella non usata nel frontend — policy minima)
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE aziende_esterne ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aziende_esterne_all" ON aziende_esterne;

CREATE POLICY "aziende_esterne_all"
ON aziende_esterne FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ════════════════════════════════════════════════════════════════════
-- 4. PROJECT_USER_VIEWS (tabella non usata nel frontend — policy minima)
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE project_user_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_user_views_all" ON project_user_views;

CREATE POLICY "project_user_views_all"
ON project_user_views FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- ════════════════════════════════════════════════════════════════════
-- 5. FUNZIONE PER IL SOFT-DELETE DEI TASK
-- Bypassa la RLS tramite SECURITY DEFINER con verifica esplicita
-- dello studio — risolve il bug persistente "new row violates RLS"
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION elimina_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_studio uuid;
  v_user_studio uuid;
BEGIN
  -- Recupera lo studio della task
  SELECT studio INTO v_task_studio
  FROM tasks
  WHERE id = p_task_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task non trovata o già eliminata';
  END IF;

  -- Recupera lo studio dell'utente autenticato
  SELECT studio INTO v_user_studio
  FROM team_members
  WHERE user_account = auth.uid()
    AND studio IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utente non autorizzato';
  END IF;

  IF v_task_studio IS DISTINCT FROM v_user_studio THEN
    RAISE EXCEPTION 'Studio non corrispondente';
  END IF;

  -- Soft delete
  UPDATE tasks SET deleted_at = now() WHERE id = p_task_id;
END;
$$;

-- ── Verifica finale ───────────────────────────────────────────────
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('studios','lavorazioni_gantt','aziende_esterne','project_user_views')
ORDER BY tablename;
