-- Безвозвратная очистка корзины проекта (физическое DELETE строк с deleted_at и «висящих» задач в удалённых колонках).
-- Права: владелец проекта или admin в project_members (как у корзины).
-- Выполнять после supabase-migration-soft-delete.sql и supabase-migration-trash-restore.sql.

create or replace function public.purge_project_trash(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
begin
  select
    exists (select 1 from public.projects p where p.id = p_project_id and p.owner_id = auth.uid())
    or exists (
      select 1
      from public.project_members pm
      where pm.project_id = p_project_id
        and pm.user_id = auth.uid()
        and pm.role = 'admin'
    )
  into allowed;

  if not coalesce(allowed, false) then
    raise exception 'FORBIDDEN';
  end if;

  delete from public.tasks t
  where t.project_id = p_project_id
    and (
      t.deleted_at is not null
      or exists (
        select 1
        from public.columns c
        where c.id = t.column_id
          and c.project_id = p_project_id
          and c.deleted_at is not null
      )
    );

  delete from public.columns c
  where c.project_id = p_project_id
    and c.deleted_at is not null;
end;
$$;

revoke all on function public.purge_project_trash(uuid) from public;
grant execute on function public.purge_project_trash(uuid) to authenticated;
