-- Elimina record timesheet "fantasma": senza user_name e con team_member ID
-- che non esiste più nella tabella team_members (dati locali storici non validi)

DELETE FROM timesheet
WHERE (user_name IS NULL OR user_name = '')
  AND team_member NOT IN (SELECT id FROM team_members);
