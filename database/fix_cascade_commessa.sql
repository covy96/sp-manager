-- Cascata soft-delete/ripristino per commessa
-- Quando elimini una commessa, tutti i record figli vengono eliminati
-- con lo stesso identico timestamp deleted_at.
-- Quando ripristini, tutti i figli con quel timestamp vengono ripristinati.
-- Esegui nel SQL Editor di Supabase Dashboard.

-- ── elimina_commessa (con cascata) ───────────────────────────────
CREATE OR REPLACE FUNCTION elimina_commessa(p_commessa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_studio       uuid;
  v_user_studio  uuid;
  v_ts           timestamptz := now();
BEGIN
  -- Verifica appartenenza studio
  SELECT studio INTO v_studio FROM commesse WHERE id = p_commessa_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commessa non trovata o già eliminata'; END IF;

  SELECT studio INTO v_user_studio FROM team_members WHERE user_account = auth.uid() AND studio IS NOT NULL LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Utente non autorizzato'; END IF;
  IF v_studio IS DISTINCT FROM v_user_studio THEN RAISE EXCEPTION 'Studio non corrispondente'; END IF;

  -- Soft-delete commessa
  UPDATE commesse SET deleted_at = v_ts WHERE id = p_commessa_id;

  -- Cascata su tutti i figli (solo quelli NON già eliminati, per non sovrascrivere deleted_at precedenti)
  UPDATE suddivisione_pagamenti SET deleted_at = v_ts WHERE commessa_id = p_commessa_id AND deleted_at IS NULL;
  UPDATE proforma               SET deleted_at = v_ts WHERE commessa_id = p_commessa_id AND deleted_at IS NULL;
  UPDATE costi_extra            SET deleted_at = v_ts WHERE commessa_id = p_commessa_id AND deleted_at IS NULL;
  UPDATE collaboratori_esterni  SET deleted_at = v_ts WHERE commessa_id = p_commessa_id AND deleted_at IS NULL;
  UPDATE costi_interni          SET deleted_at = v_ts WHERE commessa_id = p_commessa_id AND deleted_at IS NULL;
  UPDATE fatture                SET deleted_at = v_ts WHERE commessa_id = p_commessa_id AND deleted_at IS NULL;
END;
$$;

-- ── ripristina_commessa (con cascata) ────────────────────────────
CREATE OR REPLACE FUNCTION ripristina_commessa(p_commessa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ts          timestamptz;
  v_user_studio uuid;
  v_studio      uuid;
BEGIN
  -- Recupera il timestamp di eliminazione della commessa
  SELECT deleted_at, studio INTO v_ts, v_studio FROM commesse WHERE id = p_commessa_id AND deleted_at IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commessa non trovata nel cestino'; END IF;

  SELECT studio INTO v_user_studio FROM team_members WHERE user_account = auth.uid() AND studio IS NOT NULL LIMIT 1;
  IF v_studio IS DISTINCT FROM v_user_studio THEN RAISE EXCEPTION 'Non autorizzato'; END IF;

  -- Ripristina commessa
  UPDATE commesse SET deleted_at = NULL WHERE id = p_commessa_id;

  -- Ripristina solo i figli eliminati nello stesso momento (stesso timestamp)
  UPDATE suddivisione_pagamenti SET deleted_at = NULL WHERE commessa_id = p_commessa_id AND deleted_at = v_ts;
  UPDATE proforma               SET deleted_at = NULL WHERE commessa_id = p_commessa_id AND deleted_at = v_ts;
  UPDATE costi_extra            SET deleted_at = NULL WHERE commessa_id = p_commessa_id AND deleted_at = v_ts;
  UPDATE collaboratori_esterni  SET deleted_at = NULL WHERE commessa_id = p_commessa_id AND deleted_at = v_ts;
  UPDATE costi_interni          SET deleted_at = NULL WHERE commessa_id = p_commessa_id AND deleted_at = v_ts;
  UPDATE fatture                SET deleted_at = NULL WHERE commessa_id = p_commessa_id AND deleted_at = v_ts;
END;
$$;
