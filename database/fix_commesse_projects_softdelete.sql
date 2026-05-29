-- Fix soft-delete per commesse e projects
-- Stessa tecnica di elimina_task: funzioni SECURITY DEFINER per bypassare RLS
-- Esegui nel SQL Editor di Supabase Dashboard.

-- ── elimina_commessa ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_commessa(p_commessa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_studio uuid;
  v_user_studio uuid;
BEGIN
  SELECT studio INTO v_studio
  FROM commesse
  WHERE id = p_commessa_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commessa non trovata o già eliminata';
  END IF;

  SELECT studio INTO v_user_studio
  FROM team_members
  WHERE user_account = auth.uid() AND studio IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utente non autorizzato';
  END IF;

  IF v_studio IS DISTINCT FROM v_user_studio THEN
    RAISE EXCEPTION 'Studio non corrispondente';
  END IF;

  UPDATE commesse SET deleted_at = now() WHERE id = p_commessa_id;
END;
$$;

-- ── elimina_progetto ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_progetto(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_studio uuid;
  v_user_studio uuid;
BEGIN
  SELECT studio INTO v_studio
  FROM projects
  WHERE id = p_project_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Progetto non trovato o già eliminato';
  END IF;

  SELECT studio INTO v_user_studio
  FROM team_members
  WHERE user_account = auth.uid() AND studio IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utente non autorizzato';
  END IF;

  IF v_studio IS DISTINCT FROM v_user_studio THEN
    RAISE EXCEPTION 'Studio non corrispondente';
  END IF;

  UPDATE projects SET deleted_at = now() WHERE id = p_project_id;
END;
$$;
