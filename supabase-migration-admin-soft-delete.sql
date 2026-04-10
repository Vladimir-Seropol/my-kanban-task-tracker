-- Soft-delete задач/колонок под правами владельца проекта или admin в project_members.
-- Прямой UPDATE на tasks/columns не видит владельца, если у него нет строки в project_members
-- (а patch_project_task / list_project_* — видят). Без этого «удаление» даёт 0 строк в БД.

create or replace function public.soft_delete_project_task(p_task_id text)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.tasks;
  pid uuid;
  allowed boolean;
begin
  select t.* into strict r from public.tasks t where t.id = p_task_id;
  pid := r.project_id;

  if r.deleted_at is not null then
    return r;
  end if;

  select
    exists (select 1 from public.projects p where p.id = pid and p.owner_id = auth.uid())
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = pid
        and pm.user_id = auth.uid()
        and pm.role = 'admin'
    )
  into allowed;

  if not coalesce(allowed, false) then
    raise exception 'NOT_FOUND_OR_FORBIDDEN';
  end if;

  update public.tasks t
  set deleted_at = now()
  where t.id = p_task_id
    and t.deleted_at is null
  returning t.* into strict r;

  return r;
end;
$$;

revoke all on function public.soft_delete_project_task(text) from public;
grant execute on function public.soft_delete_project_task(text) to authenticated;

create or replace function public.soft_delete_project_column(p_column_id text)
returns public.columns
language plpgsql
security definer
set search_path = public
as $$
declare
  col public.columns;
  allowed boolean;
begin
  select c.* into strict col from public.columns c where c.id = p_column_id;
  if col.deleted_at is not null then
    return col;
  end if;

  select
    exists (select 1 from public.projects p where p.id = col.project_id and p.owner_id = auth.uid())
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = col.project_id
        and pm.user_id = auth.uid()
        and pm.role = 'admin'
    )
  into allowed;

  if not coalesce(allowed, false) then
    raise exception 'NOT_FOUND_OR_FORBIDDEN';
  end if;

  update public.tasks
  set deleted_at = now()
  where column_id = p_column_id
    and deleted_at is null;

  update public.columns c
  set deleted_at = now()
  where c.id = p_column_id
    and c.deleted_at is null
  returning c.* into strict col;

  return col;
end;
$$;

revoke all on function public.soft_delete_project_column(text) from public;
grant execute on function public.soft_delete_project_column(text) to authenticated;
