-- Invite project member by email (admin only)
-- Requires running in Supabase SQL Editor as project owner.

create or replace function public.invite_project_member_by_email(
  p_project_id uuid,
  p_email text,
  p_role text default 'member'
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_role text;
begin
  v_role := lower(coalesce(p_role, 'member'));
  if v_role not in ('admin', 'member') then
    raise exception 'invalid role';
  end if;

  if not exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'USER_NOT_FOUND';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, v_user_id, v_role)
  on conflict (project_id, user_id) do update
  set role = excluded.role;
end;
$$;

revoke all on function public.invite_project_member_by_email(uuid, text, text) from public;
grant execute on function public.invite_project_member_by_email(uuid, text, text) to authenticated;
