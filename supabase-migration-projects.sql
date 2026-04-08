create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists projects_select_owned_or_member on public.projects;
drop policy if exists projects_insert_owner_or_member on public.projects;
drop policy if exists projects_update_owner_or_member on public.projects;
drop policy if exists projects_delete_owner_or_member on public.projects;

create policy projects_select_owned_or_member on public.projects
for select using (
  owner_id = auth.uid()
  or (
    team_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = projects.team_id
      and tm.user_id = auth.uid()
    )
  )
);

create policy projects_insert_owner_or_member on public.projects
for insert with check (
  owner_id = auth.uid()
  or (
    team_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = projects.team_id
      and tm.user_id = auth.uid()
    )
  )
);

create policy projects_update_owner_or_member on public.projects
for update using (
  owner_id = auth.uid()
  or (
    team_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = projects.team_id
      and tm.user_id = auth.uid()
    )
  )
)
with check (
  owner_id = auth.uid()
  or (
    team_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = projects.team_id
      and tm.user_id = auth.uid()
    )
  )
);

create policy projects_delete_owner_or_member on public.projects
for delete using (
  owner_id = auth.uid()
  or (
    team_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = projects.team_id
      and tm.user_id = auth.uid()
    )
  )
);

alter table public.columns add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.tasks add column if not exists project_id uuid references public.projects(id) on delete cascade;

create index if not exists idx_columns_project_id on public.columns(project_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);

do $$
declare
  v_owner uuid;
  v_project uuid;
begin
  for v_owner in
    select distinct owner_id from public.columns where project_id is null
    union
    select distinct owner_id from public.tasks where project_id is null
  loop
    if v_owner is null then
      continue;
    end if;

    insert into public.projects (name, owner_id)
    values ('Мигрированный проект', v_owner)
    returning id into v_project;

    update public.columns
    set project_id = v_project
    where owner_id = v_owner and project_id is null;

    update public.tasks
    set project_id = v_project
    where owner_id = v_owner and project_id is null;
  end loop;
end $$;

alter table public.columns alter column project_id set not null;
alter table public.tasks alter column project_id set not null;
