-- Корзина: список soft-deleted колонок/задач и восстановление (только админ проекта).
-- Требуется: supabase-migration-soft-delete.sql (колонки deleted_at).

create or replace function public._is_project_admin(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid())
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = p_project_id
        and pm.user_id = auth.uid()
        and pm.role = 'admin'
    );
$$;

revoke all on function public._is_project_admin(uuid) from public;

create or replace function public.list_project_trash_columns(p_project_id uuid)
returns setof public.columns
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public._is_project_admin(p_project_id) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select c.*
  from public.columns c
  where c.project_id = p_project_id
    and c.deleted_at is not null
  order by c.deleted_at desc;
end;
$$;

revoke all on function public.list_project_trash_columns(uuid) from public;
grant execute on function public.list_project_trash_columns(uuid) to authenticated;

create or replace function public.list_project_trash_tasks(p_project_id uuid)
returns table (
  id text,
  text text,
  column_id text,
  column_title text,
  deleted_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public._is_project_admin(p_project_id) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    t.id,
    t.text,
    t.column_id,
    coalesce(c.title, '(колонка удалена)') as column_title,
    t.deleted_at
  from public.tasks t
  left join public.columns c on c.id = t.column_id
  where t.project_id = p_project_id
    and t.deleted_at is not null
  order by t.deleted_at desc;
end;
$$;

revoke all on function public.list_project_trash_tasks(uuid) from public;
grant execute on function public.list_project_trash_tasks(uuid) to authenticated;

create or replace function public.restore_project_column(p_column_id text)
returns public.columns
language plpgsql
security definer
set search_path = public
as $$
declare
  col public.columns;
  col_deleted timestamptz;
begin
  select * into strict col from public.columns where id = p_column_id;

  if col.deleted_at is null then
    raise exception 'NOT_DELETED';
  end if;

  if not public._is_project_admin(col.project_id) then
    raise exception 'FORBIDDEN';
  end if;

  col_deleted := col.deleted_at;

  update public.columns
  set deleted_at = null
  where id = p_column_id
  returning * into strict col;

  -- Восстанавливаем задачи, удалённые вместе с колонкой (тот же момент или позже).
  update public.tasks t
  set deleted_at = null
  where t.column_id = p_column_id
    and t.deleted_at is not null
    and t.deleted_at >= col_deleted;

  return col;
end;
$$;

revoke all on function public.restore_project_column(text) from public;
grant execute on function public.restore_project_column(text) to authenticated;

create or replace function public.restore_project_task(p_task_id text)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.tasks;
begin
  select * into strict t from public.tasks where id = p_task_id;

  if t.deleted_at is null then
    raise exception 'NOT_DELETED';
  end if;

  if not public._is_project_admin(t.project_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not exists (
    select 1
    from public.columns c
    where c.id = t.column_id
      and c.deleted_at is null
  ) then
    raise exception 'COLUMN_IN_TRASH';
  end if;

  update public.tasks
  set deleted_at = null
  where id = p_task_id
  returning * into strict t;

  return t;
end;
$$;

revoke all on function public.restore_project_task(text) from public;
grant execute on function public.restore_project_task(text) to authenticated;
