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

notify pgrst, 'reload schema';
