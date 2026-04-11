-- Remove member from project_members (владелец проекта или admin в project_members).
-- Требуются функции auth_is_project_owner / auth_is_project_admin
-- (см. supabase-migration-fix-projects-rls-recursion.sql).
-- Prevents removing project owner membership.

create or replace function public.remove_project_member(
  p_project_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  if not coalesce(public.auth_is_project_owner(p_project_id), false)
     and not coalesce(public.auth_is_project_admin(p_project_id), false) then
    raise exception 'FORBIDDEN';
  end if;

  select p.owner_id into v_owner_id
  from public.projects p
  where p.id = p_project_id;

  if v_owner_id is null then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  if v_owner_id = p_user_id then
    raise exception 'CANNOT_REMOVE_OWNER';
  end if;

  delete from public.project_members pm
  where pm.project_id = p_project_id
    and pm.user_id = p_user_id;
end;
$$;

revoke all on function public.remove_project_member(uuid, uuid) from public;
grant execute on function public.remove_project_member(uuid, uuid) to authenticated;
