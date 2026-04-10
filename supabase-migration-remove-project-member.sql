-- Remove member from project_members (admin only).
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
  v_is_admin boolean;
  v_owner_id uuid;
begin
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  ) into v_is_admin;

  if not coalesce(v_is_admin, false) then
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
