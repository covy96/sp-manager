-- Fix completo: tutte le funzioni elimina_* aggiornate con controllo
-- sia su user_account = auth.uid() sia su user_email come fallback.

-- Helper riutilizzabile per verificare appartenenza allo studio
CREATE OR REPLACE FUNCTION _check_studio_member(p_studio_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE studio = p_studio_id
      AND (
        user_account = auth.uid()
        OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
  ) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;
END; $$;

-- ── elimina_proforma ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_proforma(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM proforma WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proforma non trovata'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE proforma SET deleted_at = now() WHERE id = p_id;
END; $$;

-- ── elimina_fattura ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_fattura(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM fatture WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fattura non trovata'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE fatture SET deleted_at = now() WHERE id = p_id;
END; $$;

-- ── elimina_commessa ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_commessa(p_commessa_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM commesse WHERE id = p_commessa_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commessa non trovata o già eliminata'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE suddivisione_pagamenti SET deleted_at = now() WHERE commessa_id = p_commessa_id AND deleted_at IS NULL;
  UPDATE collaboratori_esterni   SET deleted_at = now() WHERE commessa_id = p_commessa_id AND deleted_at IS NULL;
  UPDATE commesse                SET deleted_at = now() WHERE id = p_commessa_id;
END; $$;

-- ── elimina_offerta ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_offerta(p_offerta_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM offerte WHERE id = p_offerta_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offerta non trovata'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE offerte SET deleted_at = now() WHERE id = p_offerta_id;
END; $$;

-- ── elimina_progetto ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_progetto(p_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM projects WHERE id = p_project_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Progetto non trovato'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE tasks    SET deleted_at = now() WHERE project_id = p_project_id AND deleted_at IS NULL;
  UPDATE projects SET deleted_at = now() WHERE id = p_project_id;
END; $$;

-- ── elimina_task ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_task(p_task_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM tasks WHERE id = p_task_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task non trovato'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE tasks SET deleted_at = now() WHERE id = p_task_id;
END; $$;

-- ── elimina_collaboratore ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_collaboratore(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT c.studio INTO v_studio FROM collaboratori_esterni ce JOIN commesse c ON c.id = ce.commessa_id WHERE ce.id = p_id AND ce.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Collaboratore non trovato'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE collaboratori_esterni SET deleted_at = now() WHERE id = p_id;
END; $$;

-- ── elimina_costo_interno ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_costo_interno(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM costi_interni WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Costo non trovato'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE costi_interni SET deleted_at = now() WHERE id = p_id;
END; $$;

-- ── elimina_timesheet ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_timesheet(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM timesheet WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Timesheet non trovato'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE timesheet SET deleted_at = now() WHERE id = p_id;
END; $$;

-- ── elimina_contatto ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_contatto(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM global_contacts WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contatto non trovato'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE global_contacts SET deleted_at = now() WHERE id = p_id;
END; $$;

-- ── elimina_nota ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION elimina_nota(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM notes WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nota non trovata'; END IF;
  PERFORM _check_studio_member(v_studio);
  UPDATE notes SET deleted_at = now() WHERE id = p_id;
END; $$;
