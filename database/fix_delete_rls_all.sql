-- Fix eliminazione proforma, fatture, commesse
-- Le vecchie funzioni usano auth.uid() → user_account che può non corrispondere.
-- Queste versioni cercano il team_member tramite auth.uid() con fallback su email.

CREATE OR REPLACE FUNCTION elimina_proforma(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM proforma WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proforma non trovata'; END IF;

  -- Verifica che l'utente appartiene allo stesso studio
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE studio = v_studio
      AND (user_account = auth.uid() OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  UPDATE proforma SET deleted_at = now() WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION elimina_fattura(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM fatture WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fattura non trovata'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE studio = v_studio
      AND (user_account = auth.uid() OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  UPDATE fatture SET deleted_at = now() WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION elimina_commessa(p_commessa_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM commesse WHERE id = p_commessa_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commessa non trovata o già eliminata'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE studio = v_studio
      AND (user_account = auth.uid() OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  ) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  -- Soft-delete cascata su dati correlati
  UPDATE suddivisione_pagamenti SET deleted_at = now() WHERE commessa_id = p_commessa_id AND deleted_at IS NULL;
  UPDATE collaboratori_esterni   SET deleted_at = now() WHERE commessa_id = p_commessa_id AND deleted_at IS NULL;
  UPDATE commesse                SET deleted_at = now() WHERE id = p_commessa_id;
END; $$;
