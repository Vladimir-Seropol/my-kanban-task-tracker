-- Участник не видит проекты в сайдбаре: SELECT на projects должен разрешать
-- и владельца, и любого пользователя из project_members.
-- Старый файл supabase-migration-project-roles.sql дропает политики с другими
-- именами, поэтому projects_select_owned_or_member мог остаться и перекрывать
-- ожидания (или наоборот — без member-политики участник не видит чужие проекты).
--
-- Выполнить один раз в Supabase → SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Единая политика SELECT на projects
-- ---------------------------------------------------------------------------
drop policy if exists projects_select_owned_or_member on public.projects;
drop policy if exists "projects_select_member_or_admin" on public.projects;
drop policy if exists projects_select_owner_only on public.projects;
drop policy if exists "projects_select_owner_only" on public.projects;
drop policy if exists "projects_select_owner_or_member" on public.projects;

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

-- ---------------------------------------------------------------------------
-- 2. Владелец всегда в project_members (новые проекты + корректные приглашения)
-- ---------------------------------------------------------------------------
create or replace function public.ensure_project_owner_is_admin_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict (project_id, user_id) do update
  set role = excluded.role;
  return new;
end;
$$;

drop trigger if exists trg_projects_owner_project_member on public.projects;
create trigger trg_projects_owner_project_member
  after insert on public.projects
  for each row
  execute function public.ensure_project_owner_is_admin_member();

-- Добавить владельцев существующих проектов, если строки ещё нет (идемпотентно)
insert into public.project_members (project_id, user_id, role)
select p.id, p.owner_id, 'admin'
from public.projects p
where p.owner_id is not null
on conflict (project_id, user_id) do update
set role = 'admin';

-- ---------------------------------------------------------------------------
-- 3. Список проектов через RPC (обходит конфликты RLS на прямом SELECT)
-- Клиент вызывает list_my_projects() вместо .from("projects").select()
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 4. Колонки и задачи для участника (старый RLS по columns.owner_id / team
--    скрывает чужие колонки даже при membership в project_members)
-- ---------------------------------------------------------------------------
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

notify pgrst, 'reload schema';
