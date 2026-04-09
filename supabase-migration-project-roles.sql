-- RBAC for projects: admin/member
-- Admin: full access to project, columns, tasks (including delete)
-- Member: read + create/update/move tasks, no project/column management, no task delete

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')) default 'member',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists idx_project_members_user_id on public.project_members(user_id);
create index if not exists idx_project_members_project_id on public.project_members(project_id);

-- Backfill owner as admin for every project
insert into public.project_members (project_id, user_id, role)
select p.id, p.owner_id, 'admin'
from public.projects p
where p.owner_id is not null
on conflict (project_id, user_id) do update set role = 'admin';

alter table public.project_members enable row level security;

drop policy if exists "project_members_select" on public.project_members;
drop policy if exists "project_members_insert_admin" on public.project_members;
drop policy if exists "project_members_update_admin" on public.project_members;
drop policy if exists "project_members_delete_admin" on public.project_members;

create policy "project_members_select" on public.project_members
for select using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

create policy "project_members_insert_admin" on public.project_members
for insert with check (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

create policy "project_members_update_admin" on public.project_members
for update using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
) with check (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

create policy "project_members_delete_admin" on public.project_members
for delete using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

-- Projects: visible to owner OR project_members (drop legacy policy names from supabase-migration-projects.sql)
drop policy if exists projects_select_owned_or_member on public.projects;
drop policy if exists "projects_select_owner_only" on public.projects;
drop policy if exists "projects_select_member_or_admin" on public.projects;
drop policy if exists "projects_select_owner_or_member" on public.projects;
drop policy if exists "projects_insert_owner" on public.projects;
drop policy if exists "projects_update_owner" on public.projects;
drop policy if exists "projects_delete_owner" on public.projects;
drop policy if exists "projects_update_admin" on public.projects;
drop policy if exists "projects_delete_admin" on public.projects;

create policy "projects_select_owner_or_member" on public.projects
for select using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = projects.id
      and pm.user_id = auth.uid()
  )
);

create policy "projects_insert_owner" on public.projects
for insert with check (owner_id = auth.uid());

create policy "projects_update_admin" on public.projects
for update using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = projects.id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
) with check (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = projects.id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

create policy "projects_delete_admin" on public.projects
for delete using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = projects.id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

-- Columns: admin only for mutate, members can read
drop policy if exists "columns_select_by_project_owner" on public.columns;
drop policy if exists "columns_select_member_or_admin" on public.columns;
drop policy if exists "columns_insert_by_project_owner" on public.columns;
drop policy if exists "columns_update_by_project_owner" on public.columns;
drop policy if exists "columns_delete_by_project_owner" on public.columns;
drop policy if exists "columns_insert_admin" on public.columns;
drop policy if exists "columns_update_admin" on public.columns;
drop policy if exists "columns_delete_admin" on public.columns;

create policy "columns_select_member_or_admin" on public.columns
for select using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = columns.project_id
      and pm.user_id = auth.uid()
  )
);

create policy "columns_insert_admin" on public.columns
for insert with check (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = columns.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

create policy "columns_update_admin" on public.columns
for update using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = columns.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
) with check (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = columns.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

create policy "columns_delete_admin" on public.columns
for delete using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = columns.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

-- Tasks: members/admin can create+update+select, only admin can delete
drop policy if exists "tasks_select_by_project_owner" on public.tasks;
drop policy if exists "tasks_select_member_or_admin" on public.tasks;
drop policy if exists "tasks_insert_by_project_owner" on public.tasks;
drop policy if exists "tasks_update_by_project_owner" on public.tasks;
drop policy if exists "tasks_delete_by_project_owner" on public.tasks;
drop policy if exists "tasks_insert_member_or_admin" on public.tasks;
drop policy if exists "tasks_update_member_or_admin" on public.tasks;
drop policy if exists "tasks_delete_admin" on public.tasks;

create policy "tasks_select_member_or_admin" on public.tasks
for select using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = tasks.project_id
      and pm.user_id = auth.uid()
  )
);

create policy "tasks_insert_member_or_admin" on public.tasks
for insert with check (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = tasks.project_id
      and pm.user_id = auth.uid()
  )
);

create policy "tasks_update_member_or_admin" on public.tasks
for update using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = tasks.project_id
      and pm.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = tasks.project_id
      and pm.user_id = auth.uid()
  )
);

create policy "tasks_delete_admin" on public.tasks
for delete using (
  exists (
    select 1
    from public.project_members pm
    where pm.project_id = tasks.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  )
);

-- Список проектов для сайдбара (SECURITY DEFINER — видимость по owner_id и project_members)
create or replace function public.list_my_projects()
returns setof public.projects
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.projects p
  where p.owner_id = auth.uid()
     or exists (
       select 1
       from public.project_members pm
       where pm.project_id = p.id
         and pm.user_id = auth.uid()
     )
  order by p.created_at asc;
$$;

revoke all on function public.list_my_projects() from public;
grant execute on function public.list_my_projects() to authenticated;

create or replace function public.list_project_columns(p_project_id uuid)
returns setof public.columns
language sql
stable
security definer
set search_path = public
as $$
  select c.*
  from public.columns c
  where c.project_id = p_project_id
    and c.deleted_at is null
    and (
      exists (
        select 1
        from public.projects p
        where p.id = p_project_id
          and p.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.project_members pm
        where pm.project_id = p_project_id
          and pm.user_id = auth.uid()
      )
    )
  order by c.position asc;
$$;

create or replace function public.list_project_tasks(p_project_id uuid)
returns setof public.tasks
language sql
stable
security definer
set search_path = public
as $$
  select t.*
  from public.tasks t
  where t.project_id = p_project_id
    and t.deleted_at is null
    and (
      exists (
        select 1
        from public.projects p
        where p.id = p_project_id
          and p.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.project_members pm
        where pm.project_id = p_project_id
          and pm.user_id = auth.uid()
      )
    )
  order by t.order_index asc;
$$;

revoke all on function public.list_project_columns(uuid) from public;
grant execute on function public.list_project_columns(uuid) to authenticated;

revoke all on function public.list_project_tasks(uuid) from public;
grant execute on function public.list_project_tasks(uuid) to authenticated;

drop function if exists public.patch_project_task(text, jsonb);
drop function if exists public.patch_project_task(jsonb, text);

create or replace function public.patch_project_task(
  p_patch jsonb,
  p_task_id text
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.tasks;
  ok boolean;
begin
  if p_patch is null or p_patch = '{}'::jsonb then
    raise exception 'EMPTY_PATCH';
  end if;

  select true into ok
  from public.tasks t
  where t.id = p_task_id
    and t.deleted_at is null
    and (
      exists (
        select 1
        from public.projects p
        where p.id = t.project_id
          and p.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.project_members pm
        where pm.project_id = t.project_id
          and pm.user_id = auth.uid()
      )
    );

  if not coalesce(ok, false) then
    raise exception 'NOT_FOUND_OR_FORBIDDEN';
  end if;

  update public.tasks t
  set
    text = case when p_patch ? 'text' then (p_patch->>'text')::text else t.text end,
    column_id = case when p_patch ? 'column_id' then (p_patch->>'column_id')::text else t.column_id end,
    order_index = case when p_patch ? 'order_index' then (p_patch->>'order_index')::int else t.order_index end,
    assignee = case when p_patch ? 'assignee' then (p_patch->>'assignee')::text else t.assignee end,
    reporter = case when p_patch ? 'reporter' then (p_patch->>'reporter')::text else t.reporter end,
    source = case when p_patch ? 'source' then (p_patch->>'source')::text else t.source end,
    description = case when p_patch ? 'description' then (p_patch->>'description')::text else t.description end,
    epic = case when p_patch ? 'epic' then (p_patch->>'epic')::text else t.epic end,
    tags = case
      when p_patch ? 'tags' then coalesce(
        array(select jsonb_array_elements_text(p_patch->'tags')),
        '{}'::text[]
      )
      else t.tags
    end,
    priority = case when p_patch ? 'priority' then (p_patch->>'priority')::text else t.priority end,
    created_at = case when p_patch ? 'created_at' then (p_patch->>'created_at')::text else t.created_at end,
    due_date = case
      when p_patch ? 'due_date' and jsonb_typeof(p_patch->'due_date') = 'null' then null
      when p_patch ? 'due_date' then (p_patch->>'due_date')::text
      else t.due_date
    end
  where t.id = p_task_id
  returning t.* into strict r;

  return r;
end;
$$;

revoke all on function public.patch_project_task(jsonb, text) from public;
grant execute on function public.patch_project_task(jsonb, text) to authenticated;
