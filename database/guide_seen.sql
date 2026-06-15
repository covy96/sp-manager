-- Flag "guida all'uso già vista" — onboarding automatico una volta sola per utente.
-- Esegui nel SQL Editor di Supabase Dashboard.

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS guide_seen boolean NOT NULL DEFAULT false;
