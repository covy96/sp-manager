-- Collegamento Outlook (Microsoft Graph, sola lettura).
-- Una riga per utente con i token cifrati (AES-GCM) dalla edge function "outlook".
-- RLS attiva SENZA policy: il client non può leggere né scrivere la tabella,
-- ci accede solo la edge function con il service role.
create table if not exists public.outlook_connections (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  email         text,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  scope         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.outlook_connections enable row level security;
revoke all on public.outlook_connections from anon, authenticated;
