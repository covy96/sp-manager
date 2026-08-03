-- Fix: colonna deleted_at mancante su costi_interni + funzioni cestino/elimina
-- non applicate in produzione (da fix_softdelete_all.sql).
--
-- Sicuro e idempotente:
--  • ADD COLUMN IF NOT EXISTS  → non tocca colonne già presenti
--  • CREATE OR REPLACE FUNCTION → aggiorna/crea senza errori
--  • NON ridefinisce ripristina_item / elimina_definitivo (già aggiornate
--    con capex/report_cantiere in migrazioni successive — non regredire!)
--
-- Esegui nel SQL Editor del Dashboard Supabase.

-- ── 1. Colonna deleted_at dove manca ──────────────────────────────
ALTER TABLE costi_interni   ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE timesheet       ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE global_contacts ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE fatture         ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE notes           ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- ── 2. Funzioni elimina (soft-delete, SECURITY DEFINER) ───────────
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

-- ── 3. Funzioni cestino (elenco eliminati, SECURITY DEFINER) ──────
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

-- cestino_proforma e cestino_note: incluse per completezza (idempotenti)
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

CREATE OR REPLACE FUNCTION cestino_note(p_studio_id uuid)
RETURNS TABLE (id uuid, content text, deleted_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, content, deleted_at
  FROM notes
  WHERE studio = p_studio_id AND deleted_at IS NOT NULL
  ORDER BY deleted_at DESC LIMIT 50;
$$;
