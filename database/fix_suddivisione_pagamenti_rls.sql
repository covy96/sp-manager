-- Fix RLS policies per la tabella suddivisione_pagamenti
-- Il problema: la policy UPDATE ha un WITH CHECK che blocca il soft-delete (deleted_at).
-- suddivisione_pagamenti non ha colonna studio → si accede tramite commesse.
-- Esegui questo script nel SQL Editor di Supabase Dashboard.

-- 1. Rimuovi eventuali policy esistenti per ripartire pulito
DROP POLICY IF EXISTS "suddivisione_pagamenti_select" ON suddivisione_pagamenti;
DROP POLICY IF EXISTS "suddivisione_pagamenti_insert" ON suddivisione_pagamenti;
DROP POLICY IF EXISTS "suddivisione_pagamenti_update" ON suddivisione_pagamenti;
DROP POLICY IF EXISTS "suddivisione_pagamenti_delete" ON suddivisione_pagamenti;
-- varianti con nomi generati da Supabase
DROP POLICY IF EXISTS "Enable read access for all users" ON suddivisione_pagamenti;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON suddivisione_pagamenti;
DROP POLICY IF EXISTS "Enable update for users based on email" ON suddivisione_pagamenti;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON suddivisione_pagamenti;

-- 2. Assicurati che RLS sia abilitato
ALTER TABLE suddivisione_pagamenti ENABLE ROW LEVEL SECURITY;

-- Helper: restituisce gli id delle commesse visibili all'utente corrente
-- (commesse.studio deve matchare un team_member con user_account = auth.uid())

-- SELECT: vedi le rate delle commesse del tuo studio
CREATE POLICY "suddivisione_pagamenti_select"
ON suddivisione_pagamenti FOR SELECT
USING (
  commessa_id IN (
    SELECT c.id FROM commesse c
    JOIN team_members tm ON tm.studio = c.studio
    WHERE tm.user_account = auth.uid()
    AND tm.studio IS NOT NULL
  )
);

-- INSERT: inserisci rate solo per commesse del tuo studio
CREATE POLICY "suddivisione_pagamenti_insert"
ON suddivisione_pagamenti FOR INSERT
WITH CHECK (
  commessa_id IN (
    SELECT c.id FROM commesse c
    JOIN team_members tm ON tm.studio = c.studio
    WHERE tm.user_account = auth.uid()
    AND tm.studio IS NOT NULL
  )
);

-- UPDATE: modifica (incluso soft-delete con deleted_at) rate del tuo studio
-- IMPORTANTE: il WITH CHECK NON vincola deleted_at, altrimenti il soft-delete fallisce
CREATE POLICY "suddivisione_pagamenti_update"
ON suddivisione_pagamenti FOR UPDATE
USING (
  commessa_id IN (
    SELECT c.id FROM commesse c
    JOIN team_members tm ON tm.studio = c.studio
    WHERE tm.user_account = auth.uid()
    AND tm.studio IS NOT NULL
  )
)
WITH CHECK (
  commessa_id IN (
    SELECT c.id FROM commesse c
    JOIN team_members tm ON tm.studio = c.studio
    WHERE tm.user_account = auth.uid()
    AND tm.studio IS NOT NULL
  )
);

-- DELETE: elimina fisicamente (non usato nell'app, ma utile per manutenzione)
CREATE POLICY "suddivisione_pagamenti_delete"
ON suddivisione_pagamenti FOR DELETE
USING (
  commessa_id IN (
    SELECT c.id FROM commesse c
    JOIN team_members tm ON tm.studio = c.studio
    WHERE tm.user_account = auth.uid()
    AND tm.studio IS NOT NULL
  )
);
