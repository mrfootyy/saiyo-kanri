create table if not exists public.recruitment_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.recruitment_state enable row level security;

drop policy if exists "Allow public read recruitment state" on public.recruitment_state;
drop policy if exists "Allow public insert recruitment state" on public.recruitment_state;
drop policy if exists "Allow public update recruitment state" on public.recruitment_state;

create policy "Allow public read recruitment state"
on public.recruitment_state
for select
to anon
using (true);

create policy "Allow public insert recruitment state"
on public.recruitment_state
for insert
to anon
with check (true);

create policy "Allow public update recruitment state"
on public.recruitment_state
for update
to anon
using (true)
with check (true);
