create table if not exists public.recruitment_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.recruitment_state
  add column if not exists data jsonb;

alter table public.recruitment_state
  add column if not exists updated_at timestamptz not null default now();

-- If a previous per-user migration created duplicate shared ids, keep the newest row.
delete from public.recruitment_state a
using public.recruitment_state b
where a.id = b.id
  and a.ctid < b.ctid
  and coalesce(a.updated_at, '-infinity'::timestamptz) <= coalesce(b.updated_at, '-infinity'::timestamptz);

alter table public.recruitment_state
  drop constraint if exists recruitment_state_user_id_id_key;

alter table public.recruitment_state
  drop constraint if exists recruitment_state_pkey;

alter table public.recruitment_state
  add constraint recruitment_state_pkey primary key (id);

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

create table if not exists public.onboarding_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.onboarding_state
  add column if not exists data jsonb;

alter table public.onboarding_state
  add column if not exists updated_at timestamptz not null default now();

delete from public.onboarding_state a
using public.onboarding_state b
where a.id = b.id
  and a.ctid < b.ctid
  and coalesce(a.updated_at, '-infinity'::timestamptz) <= coalesce(b.updated_at, '-infinity'::timestamptz);

alter table public.onboarding_state
  drop constraint if exists onboarding_state_user_id_id_key;

alter table public.onboarding_state
  drop constraint if exists onboarding_state_pkey;

alter table public.onboarding_state
  add constraint onboarding_state_pkey primary key (id);

alter table public.onboarding_state enable row level security;

drop policy if exists "Allow authenticated read onboarding state" on public.onboarding_state;
drop policy if exists "Allow authenticated insert onboarding state" on public.onboarding_state;
drop policy if exists "Allow authenticated update onboarding state" on public.onboarding_state;

create policy "Allow authenticated read onboarding state"
on public.onboarding_state
for select
to authenticated
using (true);

create policy "Allow authenticated insert onboarding state"
on public.onboarding_state
for insert
to authenticated
with check (true);

create policy "Allow authenticated update onboarding state"
on public.onboarding_state
for update
to authenticated
using (true)
with check (true);
