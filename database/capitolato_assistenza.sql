-- Assistenze murarie a percentuale: una voce speciale del capitolato può essere
-- un'assistenza calcolata come % del totale di un impianto (E idrico, F elettrico,
-- G meccanico). Config per riga: { "base": "F", "perc": 10 } (o null).
-- Nell'Excel esportato diventa una formula viva (% × totale del foglio impianto).
-- Esegui nel SQL Editor di Supabase.
alter table capitolato_righe add column if not exists assistenza jsonb;
