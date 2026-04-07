-- Run once in Supabase SQL Editor for existing projects.

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

alter table public.columns add column if not exists owner_id uuid;
alter table public.columns add column if not exists team_id uuid;
alter table public.tasks add column if not exists owner_id uuid;
alter table public.tasks add column if not exists team_id uuid;

alter table public.columns alter column owner_id set default auth.uid();
alter table public.tasks alter column owner_id set default auth.uid();

do $$
begin
  if exists (select 1 from auth.users) then
    update public.columns
    set owner_id = (select id from auth.users order by created_at limit 1)
    where owner_id is null;

    update public.tasks
    set owner_id = (select id from auth.users order by created_at limit 1)
    where owner_id is null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from public.columns where owner_id is null) then
    alter table public.columns alter column owner_id set not null;
  end if;
  if not exists (select 1 from public.tasks where owner_id is null) then
    alter table public.tasks alter column owner_id set not null;
  end if;
end $$;

do $$
begin
  begin
    alter table public.columns
      add constraint columns_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete set null;
  exception when duplicate_object then
    null;
  end;
  begin
    alter table public.tasks
      add constraint tasks_team_id_fkey
      foreign key (team_id) references public.teams(id) on delete set null;
  exception when duplicate_object then
    null;
  end;
end $$;

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

drop policy if exists "public columns read" on public.columns;
drop policy if exists "public columns write" on public.columns;
drop policy if exists "public tasks read" on public.tasks;
drop policy if exists "public tasks write" on public.tasks;

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
