-- Fix RLS policies per la tabella costi_extra
-- Il problema: la policy UPDATE manca o ha un WITH CHECK che blocca il soft-delete
-- (deleted_at). Risultato: l'UPDATE non tocca alcuna riga, nessun errore,
-- e nell'app "non succede niente" quando si elimina un costo extra.
-- costi_extra ha la colonna studio → si filtra direttamente per studio.
-- Esegui questo script nel SQL Editor di Supabase Dashboard.

-- 1. Rimuovi eventuali policy esistenti per ripartire pulito
DROP POLICY IF EXISTS "costi_extra_select" ON costi_extra;
DROP POLICY IF EXISTS "costi_extra_insert" ON costi_extra;
DROP POLICY IF EXISTS "costi_extra_update" ON costi_extra;
DROP POLICY IF EXISTS "costi_extra_delete" ON costi_extra;
-- varianti con nomi generati da Supabase
DROP POLICY IF EXISTS "Enable read access for all users" ON costi_extra;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON costi_extra;
DROP POLICY IF EXISTS "Enable update for users based on email" ON costi_extra;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON costi_extra;

-- 2. Assicurati che RLS sia abilitato
ALTER TABLE costi_extra ENABLE ROW LEVEL SECURITY;

-- SELECT: vedi i costi extra del tuo studio
CREATE POLICY "costi_extra_select"
ON costi_extra FOR SELECT
USING (
  studio IN (
    SELECT tm.studio FROM team_members tm
    WHERE tm.user_account = auth.uid()
    AND tm.studio IS NOT NULL
  )
);

-- INSERT: inserisci costi extra solo per il tuo studio
CREATE POLICY "costi_extra_insert"
ON costi_extra FOR INSERT
WITH CHECK (
  studio IN (
    SELECT tm.studio FROM team_members tm
    WHERE tm.user_account = auth.uid()
    AND tm.studio IS NOT NULL
  )
);

-- UPDATE: modifica (incluso soft-delete con deleted_at) i costi extra del tuo studio
-- IMPORTANTE: il WITH CHECK NON vincola deleted_at, altrimenti il soft-delete fallisce
CREATE POLICY "costi_extra_update"
ON costi_extra FOR UPDATE
USING (
  studio IN (
    SELECT tm.studio FROM team_members tm
    WHERE tm.user_account = auth.uid()
    AND tm.studio IS NOT NULL
  )
)
WITH CHECK (
  studio IN (
    SELECT tm.studio FROM team_members tm
    WHERE tm.user_account = auth.uid()
    AND tm.studio IS NOT NULL
  )
);

-- DELETE: elimina fisicamente (non usato nell'app, ma utile per manutenzione)
CREATE POLICY "costi_extra_delete"
ON costi_extra FOR DELETE
USING (
  studio IN (
    SELECT tm.studio FROM team_members tm
    WHERE tm.user_account = auth.uid()
    AND tm.studio IS NOT NULL
  )
);
