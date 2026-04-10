-- Detailed members list with name/email for UI modal.
-- Access: any project member can read; role mutations remain admin-only.

create or replace function public.list_project_members_detailed(p_project_id uuid)
returns table (
  project_id uuid,
  user_id uuid,
  role text,
  created_at timestamptz,
  email text,
  full_name text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1
    from public.project_members viewer
    where viewer.project_id = p_project_id
      and viewer.user_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    pm.project_id,
    pm.user_id,
    pm.role::text,
    pm.created_at,
    u.email::text,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(u.email, ''), '@', 1)
    )::text as full_name
  from public.project_members pm
  left join auth.users u on u.id = pm.user_id
  where pm.project_id = p_project_id
  order by
    case when pm.role = 'admin' then 0 else 1 end,
    pm.created_at asc;
end;
$$;

revoke all on function public.list_project_members_detailed(uuid) from public;
grant execute on function public.list_project_members_detailed(uuid) to authenticated;
