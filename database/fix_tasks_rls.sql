-- Fix definitivo RLS per la tabella tasks
-- Problema: policy residue bloccano il soft-delete (update di deleted_at)
-- Esegui TUTTO questo script nel SQL Editor di Supabase Dashboard.

-- ── STEP 1: rimuovi TUTTE le policy esistenti (qualsiasi nome abbiano) ────────
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'tasks' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON tasks', pol.policyname);
  END LOOP;
END;
$$;

-- ── STEP 2: assicurati che RLS sia abilitato ─────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ── STEP 3: ricrea le policy pulite ──────────────────────────────────────────

-- SELECT: task attive visibili a tutti; task eliminate visibili solo ai membri del proprio studio
CREATE POLICY "tasks_select"
ON tasks FOR SELECT
USING (
  deleted_at IS NULL
  OR
  studio IN (
    SELECT tm.studio FROM team_members tm
    WHERE tm.user_account = auth.uid() AND tm.studio IS NOT NULL
  )
);

-- INSERT: solo per membri autenticati del proprio studio
CREATE POLICY "tasks_insert"
ON tasks FOR INSERT
WITH CHECK (
  studio IN (
    SELECT tm.studio
    FROM team_members tm
    WHERE tm.user_account = auth.uid()
      AND tm.studio IS NOT NULL
  )
);

-- UPDATE (incluso soft-delete con deleted_at): membri del proprio studio
-- NOTA: il WITH CHECK valuta il nuovo valore della riga dopo l'update.
-- La colonna "studio" non cambia durante un soft-delete, quindi questo è sicuro.
CREATE POLICY "tasks_update"
ON tasks FOR UPDATE
USING (
  studio IN (
    SELECT tm.studio
    FROM team_members tm
    WHERE tm.user_account = auth.uid()
      AND tm.studio IS NOT NULL
  )
)
WITH CHECK (
  studio IN (
    SELECT tm.studio
    FROM team_members tm
    WHERE tm.user_account = auth.uid()
      AND tm.studio IS NOT NULL
  )
);

-- DELETE fisico: solo per membri del proprio studio
CREATE POLICY "tasks_delete"
ON tasks FOR DELETE
USING (
  studio IN (
    SELECT tm.studio
    FROM team_members tm
    WHERE tm.user_account = auth.uid()
      AND tm.studio IS NOT NULL
  )
);

-- ── STEP 4: verifica ─────────────────────────────────────────────────────────
-- Dopo l'esecuzione dovresti vedere esattamente 4 righe:
-- tasks_select, tasks_insert, tasks_update, tasks_delete
SELECT
  policyname,
  cmd,
  roles,
  qual   AS "USING",
  with_check AS "WITH CHECK"
FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY cmd;
