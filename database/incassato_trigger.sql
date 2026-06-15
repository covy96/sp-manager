-- ════════════════════════════════════════════════════════════════
-- Mantiene commesse.importo_incassato SEMPRE allineato alle RATE PAGATE.
-- Stessa formula usata in tutte le viste: per ogni rata pagata
--   importo_fisso  (se valorizzato e != 0)  oppure  percentuale * importo_base.
-- Esegui nel SQL Editor di Supabase Dashboard.
-- ════════════════════════════════════════════════════════════════

-- ── Ricalcolo dell'incassato di una commessa ─────────────────────
CREATE OR REPLACE FUNCTION ricalcola_incassato_commessa(p_commessa_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_base numeric; v_inc numeric;
BEGIN
  IF p_commessa_id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(importo_offerta_base, 0) INTO v_base FROM commesse WHERE id = p_commessa_id;
  SELECT COALESCE(SUM(COALESCE(NULLIF(importo_fisso, 0), v_base * COALESCE(percentuale, 0) / 100)), 0)
    INTO v_inc
    FROM suddivisione_pagamenti
    WHERE commessa_id = p_commessa_id AND pagato = true AND deleted_at IS NULL;
  UPDATE commesse
    SET importo_incassato = v_inc
    WHERE id = p_commessa_id
      AND COALESCE(importo_incassato, -1) IS DISTINCT FROM v_inc;
END; $$;

-- ── Trigger sulle rate: ricalcola alla variazione ───────────────
CREATE OR REPLACE FUNCTION trg_suddivisione_incassato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM ricalcola_incassato_commessa(OLD.commessa_id);
    RETURN OLD;
  END IF;
  PERFORM ricalcola_incassato_commessa(NEW.commessa_id);
  IF TG_OP = 'UPDATE' AND OLD.commessa_id IS DISTINCT FROM NEW.commessa_id THEN
    PERFORM ricalcola_incassato_commessa(OLD.commessa_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS suddivisione_incassato ON suddivisione_pagamenti;
CREATE TRIGGER suddivisione_incassato
AFTER INSERT OR UPDATE OR DELETE ON suddivisione_pagamenti
FOR EACH ROW EXECUTE FUNCTION trg_suddivisione_incassato();

-- ── Trigger sulla commessa: se cambia l'importo base (rate %) ───
-- "OF importo_offerta_base" => non scatta sull'update di importo_incassato
-- fatto dalla funzione stessa, quindi nessuna ricorsione.
CREATE OR REPLACE FUNCTION trg_commessa_base_incassato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.importo_offerta_base IS DISTINCT FROM OLD.importo_offerta_base THEN
    PERFORM ricalcola_incassato_commessa(NEW.id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS commessa_base_incassato ON commesse;
CREATE TRIGGER commessa_base_incassato
AFTER UPDATE OF importo_offerta_base ON commesse
FOR EACH ROW EXECUTE FUNCTION trg_commessa_base_incassato();

-- ── Backfill una tantum: riallinea tutte le commesse esistenti ──
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM commesse LOOP
    PERFORM ricalcola_incassato_commessa(r.id);
  END LOOP;
END $$;
