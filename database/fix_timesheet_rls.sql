-- Fix RLS policies per la tabella timesheet
-- Il problema: mancano le policy UPDATE e DELETE, Supabase nega di default.
-- Esegui questo script nel SQL Editor di Supabase Dashboard.

-- 1. Rimuovi eventuali policy esistenti sul timesheet per ricominciare pulito
DROP POLICY IF EXISTS "timesheet_select" ON timesheet;
DROP POLICY IF EXISTS "timesheet_insert" ON timesheet;
DROP POLICY IF EXISTS "timesheet_update" ON timesheet;
DROP POLICY IF EXISTS "timesheet_delete" ON timesheet;
-- drop anche varianti con nomi diversi
DROP POLICY IF EXISTS "Enable read access for studio members" ON timesheet;
DROP POLICY IF EXISTS "Enable insert for studio members" ON timesheet;
DROP POLICY IF EXISTS "Enable update for own entries" ON timesheet;
DROP POLICY IF EXISTS "Enable delete for own entries" ON timesheet;
DROP POLICY IF EXISTS "Users can view their studio timesheet" ON timesheet;
DROP POLICY IF EXISTS "Users can insert timesheet" ON timesheet;
DROP POLICY IF EXISTS "Users can update their timesheet" ON timesheet;
DROP POLICY IF EXISTS "Users can delete their timesheet" ON timesheet;

-- 2. Assicurati che RLS sia abilitato
ALTER TABLE timesheet ENABLE ROW LEVEL SECURITY;

-- Helper: restituisce true se l'utente autenticato appartiene allo studio dato
-- (usato come condizione nelle policy)

-- SELECT: vedi le ore del tuo studio
CREATE POLICY "timesheet_select"
ON timesheet FOR SELECT
USING (
  studio IN (
    SELECT studio FROM team_members
    WHERE user_account = auth.uid()
    AND studio IS NOT NULL
  )
);

-- INSERT: inserisci solo per il tuo team_member e studio
CREATE POLICY "timesheet_insert"
ON timesheet FOR INSERT
WITH CHECK (
  studio IN (
    SELECT studio FROM team_members
    WHERE user_account = auth.uid()
    AND studio IS NOT NULL
  )
  AND team_member IN (
    SELECT id FROM team_members
    WHERE user_account = auth.uid()
  )
);

-- UPDATE: modifica solo le tue righe (stesso team_member)
CREATE POLICY "timesheet_update"
ON timesheet FOR UPDATE
USING (
  team_member IN (
    SELECT id FROM team_members
    WHERE user_account = auth.uid()
  )
)
WITH CHECK (
  team_member IN (
    SELECT id FROM team_members
    WHERE user_account = auth.uid()
  )
);

-- DELETE: elimina solo le tue righe
CREATE POLICY "timesheet_delete"
ON timesheet FOR DELETE
USING (
  team_member IN (
    SELECT id FROM team_members
    WHERE user_account = auth.uid()
  )
);
