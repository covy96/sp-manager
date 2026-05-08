alter table if exists public.team_members
add column if not exists user_account text;

create index if not exists team_members_user_account_idx
on public.team_members (user_account);
