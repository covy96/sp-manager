-- Enforce: solo Titolare (Owner) e Partner possono modificare i campi ANAGRAFICI
-- del profilo studio. Gli altri campi di `studios` (es. impostazioni/logo report,
-- gestiti anche dai PM) restano liberi per chi ha già accesso in UPDATE via RLS.
--
-- La RLS è row-level e non distingue per colonna: per questo usiamo un trigger
-- BEFORE UPDATE che controlla SOLO le colonne protette.
--
-- Esegui nel SQL Editor della Dashboard Supabase.

CREATE OR REPLACE FUNCTION enforce_studio_profile_edit()
RETURNS trigger AS $$
DECLARE
  is_manager boolean;
BEGIN
  -- Le chiamate backend (service role / nessun JWT) sono fidate: bypassano.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sono cambiate colonne anagrafiche protette?
  IF (NEW.name              IS DISTINCT FROM OLD.name
   OR NEW.descrizione       IS DISTINCT FROM OLD.descrizione
   OR NEW.piva              IS DISTINCT FROM OLD.piva
   OR NEW.indirizzo         IS DISTINCT FROM OLD.indirizzo
   OR NEW."città"           IS DISTINCT FROM OLD."città"
   OR NEW.cap               IS DISTINCT FROM OLD.cap
   OR NEW.tipo_fatturazione IS DISTINCT FROM OLD.tipo_fatturazione) THEN

    SELECT (
      OLD.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM team_members
        WHERE studio = NEW.id
          AND user_account = auth.uid()
          AND role_internal IN ('Owner', 'Partner')
      )
    ) INTO is_manager;

    IF NOT is_manager THEN
      RAISE EXCEPTION 'Solo Titolare e Partner possono modificare il profilo studio';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_studio_profile_edit ON studios;
CREATE TRIGGER trg_enforce_studio_profile_edit
  BEFORE UPDATE ON studios
  FOR EACH ROW
  EXECUTE FUNCTION enforce_studio_profile_edit();
