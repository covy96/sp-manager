-- Fix: l'eliminazione DEFINITIVA dal cestino falliva per violazione di
-- foreign key quando l'elemento aveva figli con regola NO ACTION.
-- Per commesse/projects rimuoviamo/scolleghiamo prima i figli bloccanti,
-- poi cancelliamo il padre (i figli ON DELETE CASCADE si eliminano da soli).
-- Aggiunto anche il controllo di appartenenza allo studio (_check_studio_member).
-- Esegui nel SQL Editor di Supabase Dashboard.
--
-- Figli BLOCCANTI (NO ACTION) rilevati:
--   commesse  ← collaboratori_esterni, pagamenti, projects(commessa_id)
--   projects  ← lavorazioni_gantt, project_contacts, project_user_views, timesheet
-- (gli altri figli sono già ON DELETE CASCADE o SET NULL)

CREATE OR REPLACE FUNCTION elimina_definitivo(p_tabella text, p_id uuid, p_studio_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Autorizzazione: il chiamante deve appartenere allo studio indicato
  PERFORM _check_studio_member(p_studio_id);

  IF p_tabella = 'projects' THEN
    -- figli bloccanti del progetto
    DELETE FROM lavorazioni_gantt  WHERE project_id = p_id;
    DELETE FROM project_contacts   WHERE project_id = p_id;
    DELETE FROM project_user_views WHERE project_id = p_id;
    DELETE FROM timesheet          WHERE project_id = p_id;
    -- le commesse collegate sopravvivono: scollega il riferimento
    UPDATE commesse SET project_id = NULL WHERE project_id = p_id;
    DELETE FROM projects WHERE id = p_id AND studio = p_studio_id;

  ELSIF p_tabella = 'commesse' THEN
    -- figli bloccanti della commessa
    DELETE FROM collaboratori_esterni WHERE commessa_id = p_id;
    DELETE FROM pagamenti             WHERE commessa_id = p_id;
    -- un eventuale progetto che punta a questa commessa: scollega, non cancellare
    UPDATE projects SET commessa_id = NULL WHERE commessa_id = p_id;
    -- cascade gestisce: capex_voci, costi_extra, costi_interni, fatture,
    -- proforma, suddivisione_pagamenti; offerte → SET NULL
    DELETE FROM commesse WHERE id = p_id AND studio = p_studio_id;

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
  ELSIF p_tabella = 'report_cantiere'        THEN
    DELETE FROM report_cantiere_foto WHERE report_id = p_id;
    DELETE FROM report_cantiere      WHERE id = p_id AND studio = p_studio_id;
  ELSE RAISE EXCEPTION 'Tabella non supportata: %', p_tabella;
  END IF;
END; $$;
