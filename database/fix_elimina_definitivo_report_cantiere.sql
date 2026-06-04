-- Aggiunge supporto a report_cantiere nella funzione elimina_definitivo
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
  ELSIF p_tabella = 'report_cantiere'        THEN
    DELETE FROM report_cantiere_foto WHERE report_id = p_id;
    DELETE FROM report_cantiere      WHERE id = p_id AND studio = p_studio_id;
  ELSE RAISE EXCEPTION 'Tabella non supportata: %', p_tabella;
  END IF;
END; $$;
