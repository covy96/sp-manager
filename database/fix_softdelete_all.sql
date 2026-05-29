-- Soft-delete completo per tutte le entità mancanti
-- Esegui nel SQL Editor di Supabase Dashboard.

-- ── 1. Aggiungi colonna deleted_at dove manca ─────────────────────
ALTER TABLE costi_interni         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE timesheet             ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE global_contacts       ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE fatture               ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE notes                 ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
-- collaboratori_esterni e proforma hanno già deleted_at

-- ── 2. Funzioni elimina (SECURITY DEFINER) ───────────────────────

CREATE OR REPLACE FUNCTION elimina_proforma(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid; v_user_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM proforma WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proforma non trovata'; END IF;
  SELECT studio INTO v_user_studio FROM team_members WHERE user_account = auth.uid() AND studio IS NOT NULL LIMIT 1;
  IF v_studio IS DISTINCT FROM v_user_studio THEN RAISE EXCEPTION 'Non autorizzato'; END IF;
  UPDATE proforma SET deleted_at = now() WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION elimina_collaboratore(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_commessa_studio uuid; v_user_studio uuid;
BEGIN
  SELECT c.studio INTO v_commessa_studio FROM collaboratori_esterni ce JOIN commesse c ON c.id = ce.commessa_id WHERE ce.id = p_id AND ce.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Collaboratore non trovato'; END IF;
  SELECT studio INTO v_user_studio FROM team_members WHERE user_account = auth.uid() AND studio IS NOT NULL LIMIT 1;
  IF v_commessa_studio IS DISTINCT FROM v_user_studio THEN RAISE EXCEPTION 'Non autorizzato'; END IF;
  UPDATE collaboratori_esterni SET deleted_at = now() WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION elimina_costo_interno(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_commessa_studio uuid; v_user_studio uuid;
BEGIN
  SELECT c.studio INTO v_commessa_studio FROM costi_interni ci JOIN commesse c ON c.id = ci.commessa_id WHERE ci.id = p_id AND ci.deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Costo interno non trovato'; END IF;
  SELECT studio INTO v_user_studio FROM team_members WHERE user_account = auth.uid() AND studio IS NOT NULL LIMIT 1;
  IF v_commessa_studio IS DISTINCT FROM v_user_studio THEN RAISE EXCEPTION 'Non autorizzato'; END IF;
  UPDATE costi_interni SET deleted_at = now() WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION elimina_timesheet(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid; v_user_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM timesheet WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Voce timesheet non trovata'; END IF;
  SELECT studio INTO v_user_studio FROM team_members WHERE user_account = auth.uid() AND studio IS NOT NULL LIMIT 1;
  IF v_studio IS DISTINCT FROM v_user_studio THEN RAISE EXCEPTION 'Non autorizzato'; END IF;
  UPDATE timesheet SET deleted_at = now() WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION elimina_contatto(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid; v_user_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM global_contacts WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contatto non trovato'; END IF;
  SELECT studio INTO v_user_studio FROM team_members WHERE user_account = auth.uid() AND studio IS NOT NULL LIMIT 1;
  IF v_studio IS DISTINCT FROM v_user_studio THEN RAISE EXCEPTION 'Non autorizzato'; END IF;
  UPDATE global_contacts SET deleted_at = now() WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION elimina_fattura(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid; v_user_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM fatture WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fattura non trovata'; END IF;
  SELECT studio INTO v_user_studio FROM team_members WHERE user_account = auth.uid() AND studio IS NOT NULL LIMIT 1;
  IF v_studio IS DISTINCT FROM v_user_studio THEN RAISE EXCEPTION 'Non autorizzato'; END IF;
  UPDATE fatture SET deleted_at = now() WHERE id = p_id;
END; $$;

CREATE OR REPLACE FUNCTION elimina_nota(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_studio uuid; v_user_studio uuid;
BEGIN
  SELECT studio INTO v_studio FROM notes WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nota non trovata'; END IF;
  SELECT studio INTO v_user_studio FROM team_members WHERE user_account = auth.uid() AND studio IS NOT NULL LIMIT 1;
  IF v_studio IS DISTINCT FROM v_user_studio THEN RAISE EXCEPTION 'Non autorizzato'; END IF;
  UPDATE notes SET deleted_at = now() WHERE id = p_id;
END; $$;

-- ── 3. Funzioni cestino (SECURITY DEFINER) ───────────────────────

CREATE OR REPLACE FUNCTION cestino_proforma(p_studio_id uuid)
RETURNS TABLE (id uuid, numero_proforma text, deleted_at timestamptz, commessa_nome text, project_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pf.id, pf.numero_proforma, pf.deleted_at, c.nome_commessa, p.name
  FROM proforma pf
  LEFT JOIN commesse c ON c.id = pf.commessa_id
  LEFT JOIN projects p ON p.id = c.project_id
  WHERE pf.studio = p_studio_id AND pf.deleted_at IS NOT NULL
  ORDER BY pf.deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_collaboratori(p_studio_id uuid)
RETURNS TABLE (id uuid, nome text, deleted_at timestamptz, commessa_nome text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT ce.id, ce.nome, ce.deleted_at, c.nome_commessa
  FROM collaboratori_esterni ce
  JOIN commesse c ON c.id = ce.commessa_id
  WHERE c.studio = p_studio_id AND ce.deleted_at IS NOT NULL
  ORDER BY ce.deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_costi_interni(p_studio_id uuid)
RETURNS TABLE (id uuid, descrizione text, deleted_at timestamptz, commessa_nome text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT ci.id, ci.descrizione, ci.deleted_at, c.nome_commessa
  FROM costi_interni ci
  JOIN commesse c ON c.id = ci.commessa_id
  WHERE c.studio = p_studio_id AND ci.deleted_at IS NOT NULL
  ORDER BY ci.deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_timesheet(p_studio_id uuid)
RETURNS TABLE (id uuid, notes text, deleted_at timestamptz, hours numeric)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, notes, deleted_at, hours
  FROM timesheet
  WHERE studio = p_studio_id AND deleted_at IS NOT NULL
  ORDER BY deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_contatti(p_studio_id uuid)
RETURNS TABLE (id uuid, full_name text, deleted_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, full_name, deleted_at
  FROM global_contacts
  WHERE studio = p_studio_id AND deleted_at IS NOT NULL
  ORDER BY deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_fatture(p_studio_id uuid)
RETURNS TABLE (id uuid, numero_fattura text, deleted_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, numero_fattura, deleted_at
  FROM fatture
  WHERE studio = p_studio_id AND deleted_at IS NOT NULL
  ORDER BY deleted_at DESC LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION cestino_note(p_studio_id uuid)
RETURNS TABLE (id uuid, content text, deleted_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, content, deleted_at
  FROM notes
  WHERE studio = p_studio_id AND deleted_at IS NOT NULL
  ORDER BY deleted_at DESC LIMIT 50;
$$;

-- ── 4. Aggiorna ripristina_item e elimina_definitivo ─────────────
-- (sostituisce le versioni precedenti con supporto alle nuove tabelle)

CREATE OR REPLACE FUNCTION ripristina_item(p_tabella text, p_id uuid, p_studio_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF    p_tabella = 'projects'               THEN UPDATE projects               SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'commesse'               THEN UPDATE commesse               SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'offerte'                THEN UPDATE offerte                SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'proforma'               THEN UPDATE proforma               SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'suddivisione_pagamenti' THEN UPDATE suddivisione_pagamenti SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'costi_extra'            THEN UPDATE costi_extra            SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'lavorazioni_gantt'      THEN UPDATE lavorazioni_gantt      SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'tasks'                  THEN UPDATE tasks                  SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'collaboratori_esterni'  THEN UPDATE collaboratori_esterni  SET deleted_at = NULL WHERE id = p_id;
  ELSIF p_tabella = 'costi_interni'          THEN UPDATE costi_interni          SET deleted_at = NULL WHERE id = p_id;
  ELSIF p_tabella = 'timesheet'              THEN UPDATE timesheet              SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'global_contacts'        THEN UPDATE global_contacts        SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'fatture'                THEN UPDATE fatture                SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'notes'                  THEN UPDATE notes                  SET deleted_at = NULL WHERE id = p_id AND studio = p_studio_id;
  ELSE RAISE EXCEPTION 'Tabella non supportata: %', p_tabella;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION elimina_definitivo(p_tabella text, p_id uuid, p_studio_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF    p_tabella = 'projects'               THEN DELETE FROM projects               WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'commesse'               THEN DELETE FROM commesse               WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'offerte'                THEN DELETE FROM offerte                WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'proforma'               THEN DELETE FROM proforma               WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'suddivisione_pagamenti' THEN DELETE FROM suddivisione_pagamenti WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'costi_extra'            THEN DELETE FROM costi_extra            WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'lavorazioni_gantt'      THEN DELETE FROM lavorazioni_gantt      WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'tasks'                  THEN DELETE FROM tasks                  WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'collaboratori_esterni'  THEN DELETE FROM collaboratori_esterni  WHERE id = p_id;
  ELSIF p_tabella = 'costi_interni'          THEN DELETE FROM costi_interni          WHERE id = p_id;
  ELSIF p_tabella = 'timesheet'              THEN DELETE FROM timesheet              WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'global_contacts'        THEN DELETE FROM global_contacts        WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'fatture'                THEN DELETE FROM fatture                WHERE id = p_id AND studio = p_studio_id;
  ELSIF p_tabella = 'notes'                  THEN DELETE FROM notes                  WHERE id = p_id AND studio = p_studio_id;
  ELSE RAISE EXCEPTION 'Tabella non supportata: %', p_tabella;
  END IF;
END; $$;
