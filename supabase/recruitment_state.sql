create table if not exists public.recruitment_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.recruitment_state enable row level security;

drop policy if exists "Allow public read recruitment state" on public.recruitment_state;
drop policy if exists "Allow public insert recruitment state" on public.recruitment_state;
drop policy if exists "Allow public update recruitment state" on public.recruitment_state;
drop policy if exists "Allow authenticated read recruitment state" on public.recruitment_state;
drop policy if exists "Allow authenticated insert recruitment state" on public.recruitment_state;
drop policy if exists "Allow authenticated update recruitment state" on public.recruitment_state;

create policy "Allow authenticated read recruitment state"
on public.recruitment_state
for select
to authenticated
using (true);

create policy "Allow authenticated insert recruitment state"
on public.recruitment_state
for insert
to authenticated
with check (true);

create policy "Allow authenticated update recruitment state"
on public.recruitment_state
for update
to authenticated
using (true)
with check (true);
