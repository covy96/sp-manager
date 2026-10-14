-- Override delle voci globali che cambiano codice (Regolazione capitolato, ordine
-- per codice): override_of = "<categoria_code>||<codice>" della voce globale che la
-- voce dello studio sostituisce. Senza, cambiando codice a una voce del template la
-- versione originale ricomparirebbe.
-- Esegui nel SQL Editor di Supabase.
alter table capitolato_voci add column if not exists override_of text;

-- voci dello studio già esistenti che sostituiscono una globale (stesso categoria+codice)
update capitolato_voci s
set override_of = s.categoria_code || '||' || s.codice
where s.studio is not null and s.override_of is null
  and exists (
    select 1 from capitolato_voci g
    where g.studio is null and g.categoria_code = s.categoria_code and g.codice = s.codice
  );
