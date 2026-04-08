create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.columns (
  id text primary key,
  title text not null,
  position integer not null default 0,
  owner_id uuid not null default auth.uid(),
  team_id uuid references public.teams(id) on delete set null
);

create table if not exists public.tasks (
  id text primary key,
  text text not null,
  column_id text not null references public.columns(id) on delete cascade,
  order_index integer not null default 0,
  owner_id uuid not null default auth.uid(),
  team_id uuid references public.teams(id) on delete set null,
  assignee text not null default '',
  reporter text not null default '',
  source text not null default '',
  description text not null default '',
  epic text not null default '',
  tags text[] not null default '{}',
  priority text not null default 'низкий',
  created_at text not null,
  due_date text
);

create index if not exists idx_tasks_column_order on public.tasks(column_id, order_index);
create index if not exists idx_columns_owner_id on public.columns(owner_id);
create index if not exists idx_columns_team_id on public.columns(team_id);
create index if not exists idx_tasks_owner_id on public.tasks(owner_id);
create index if not exists idx_tasks_team_id on public.tasks(team_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);

alter table public.columns enable row level security;
alter table public.tasks enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "columns_select_owned_or_team" on public.columns;
drop policy if exists "columns_insert_owned_or_team" on public.columns;
drop policy if exists "columns_update_owned_or_team" on public.columns;
drop policy if exists "columns_delete_owned_or_team" on public.columns;
drop policy if exists "tasks_select_owned_or_team" on public.tasks;
drop policy if exists "tasks_insert_owned_or_team" on public.tasks;
drop policy if exists "tasks_update_owned_or_team" on public.tasks;
drop policy if exists "tasks_delete_owned_or_team" on public.tasks;
drop policy if exists "teams_select_owned_or_member" on public.teams;
drop policy if exists "teams_insert_owner" on public.teams;
drop policy if exists "teams_update_owner" on public.teams;
drop policy if exists "teams_delete_owner" on public.teams;
drop policy if exists "team_members_select_owned_or_member" on public.team_members;
drop policy if exists "team_members_insert_owner" on public.team_members;
drop policy if exists "team_members_delete_owner" on public.team_members;

create policy "columns_select_owned_or_team" on public.columns
for select using (
  owner_id = auth.uid()
  or (
    team_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = columns.team_id and tm.user_id = auth.uid()
    )
  )
);

create policy "columns_insert_owned_or_team" on public.columns
for insert with check (
  owner_id = auth.uid()
  and (
    team_id is null
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = columns.team_id and tm.user_id = auth.uid()
    )
  )
);

create policy "columns_update_owned_or_team" on public.columns
for update using (
  owner_id = auth.uid()
  or (
    team_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = columns.team_id and tm.user_id = auth.uid()
    )
  )
) with check (
  owner_id = auth.uid()
  and (
    team_id is null
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = columns.team_id and tm.user_id = auth.uid()
    )
  )
);

create policy "columns_delete_owned_or_team" on public.columns
for delete using (
  owner_id = auth.uid()
  or (
    team_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = columns.team_id and tm.user_id = auth.uid()
    )
  )
);

create policy "tasks_select_owned_or_team" on public.tasks
for select using (
  owner_id = auth.uid()
  or (
    team_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = tasks.team_id and tm.user_id = auth.uid()
    )
  )
);

create policy "tasks_insert_owned_or_team" on public.tasks
for insert with check (
  owner_id = auth.uid()
  and (
    team_id is null
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = tasks.team_id and tm.user_id = auth.uid()
    )
  )
);

create policy "tasks_update_owned_or_team" on public.tasks
for update using (
  owner_id = auth.uid()
  or (
    team_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = tasks.team_id and tm.user_id = auth.uid()
    )
  )
) with check (
  owner_id = auth.uid()
  and (
    team_id is null
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = tasks.team_id and tm.user_id = auth.uid()
    )
  )
);

create policy "tasks_delete_owned_or_team" on public.tasks
for delete using (
  owner_id = auth.uid()
  or (
    team_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = tasks.team_id and tm.user_id = auth.uid()
    )
  )
);

create policy "teams_select_owned_or_member" on public.teams
for select using (
  owner_id = auth.uid()
);

create policy "teams_insert_owner" on public.teams
for insert with check (owner_id = auth.uid());

create policy "teams_update_owner" on public.teams
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "teams_delete_owner" on public.teams
for delete using (owner_id = auth.uid());

create policy "team_members_select_owned_or_member" on public.team_members
for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.teams t
    where t.id = team_members.team_id and t.owner_id = auth.uid()
  )
);

create policy "team_members_insert_owner" on public.team_members
for insert with check (
  exists (
    select 1 from public.teams t
    where t.id = team_members.team_id and t.owner_id = auth.uid()
  )
);

create policy "team_members_delete_owner" on public.team_members
for delete using (
  exists (
    select 1 from public.teams t
    where t.id = team_members.team_id and t.owner_id = auth.uid()
  )
);
