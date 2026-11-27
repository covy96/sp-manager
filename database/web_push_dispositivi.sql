-- Notifiche push come nell'app nido: una riga per OGNI dispositivo (Web Push standard, senza Firebase).
-- Da eseguire UNA volta nel SQL Editor di Supabase.

create table if not exists public.web_push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  updated_at timestamptz not null default now()
);
create index if not exists web_push_subscriptions_user_idx on public.web_push_subscriptions (user_id);
alter table public.web_push_subscriptions enable row level security;

drop policy if exists "le proprie iscrizioni" on public.web_push_subscriptions;
create policy "le proprie iscrizioni" on public.web_push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.register_web_push(p_endpoint text, p_p256dh text, p_auth text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.web_push_subscriptions (endpoint, user_id, p256dh, auth, updated_at)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, now())
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now();
$$;

create or replace function public.unregister_web_push(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.web_push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke execute on function public.register_web_push(text, text, text) from public, anon;
grant execute on function public.register_web_push(text, text, text) to authenticated;
revoke execute on function public.unregister_web_push(text) from public, anon;
grant execute on function public.unregister_web_push(text) to authenticated;
