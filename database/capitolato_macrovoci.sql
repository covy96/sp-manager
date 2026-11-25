-- Macrovoci personalizzate del capitolato (sezioni create a mano, con nome libero e
-- posizione scelta). Struttura: [ { code: 'X-AB12C', nome: 'Opere da giardiniere',
--   dopo: 'C' | '' | null } ]  ('' = all'inizio, null = in fondo).
-- Le righe della macrovoce hanno categoria_code = code e categoria_nome = nome.
-- Esegui nel SQL Editor di Supabase.
alter table capitolati add column if not exists sezioni_custom jsonb not null default '[]'::jsonb;
