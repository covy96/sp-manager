-- Fix soft-delete per offerte (stessa tecnica di elimina_commessa / elimina_progetto)
-- Esegui nel SQL Editor di Supabase Dashboard.

CREATE OR REPLACE FUNCTION elimina_offerta(p_offerta_id uuid)
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
  FROM offerte
  WHERE id = p_offerta_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offerta non trovata o già eliminata';
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

  UPDATE offerte SET deleted_at = now() WHERE id = p_offerta_id;
END;
$$;
