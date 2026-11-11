-- Lettura automatica delle mail Outlook (da eseguire dopo outlook_connections.sql).
-- La edge function "outlook" abbina le mail nuove ai progetti e crea le attività;
-- ogni mail elaborata viene registrata in outlook_mail_items.

alter table public.outlook_connections
  add column if not exists auto_sync    boolean not null default false,
  add column if not exists last_sync_at timestamptz;

create table if not exists public.outlook_mail_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  studio          uuid,
  message_id      text not null,
  conversation_id text,
  received_at     timestamptz,
  subject         text,
  from_email      text,
  from_name       text,
  web_link        text,
  preview         text,
  project_id      uuid references public.projects(id) on delete set null,
  task_id         uuid references public.tasks(id) on delete set null,
  suggested_date  date,
  suggested_time  text,
  status          text not null check (status in ('creata', 'collegata', 'da_rivedere', 'ignorata')),
  reason          text,
  created_at      timestamptz not null default now(),
  unique (user_id, message_id)
);

create index if not exists outlook_mail_items_user_idx on public.outlook_mail_items (user_id, received_at desc);
create index if not exists outlook_mail_items_project_idx on public.outlook_mail_items (project_id);

-- Ognuno vede e aggiorna solo le proprie mail (la funzione scrive col service role)
alter table public.outlook_mail_items enable row level security;
drop policy if exists "outlook_mail_items_own_select" on public.outlook_mail_items;
create policy "outlook_mail_items_own_select" on public.outlook_mail_items
  for select using (user_id = auth.uid());
drop policy if exists "outlook_mail_items_own_update" on public.outlook_mail_items;
create policy "outlook_mail_items_own_update" on public.outlook_mail_items
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
