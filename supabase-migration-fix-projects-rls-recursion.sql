-- Исправление 42P17 (рекурсия RLS)
-- A) projects ↔ project_members: подзапрос к projects в политике project_members.
-- B) project_members ↔ project_members: подзапрос к той же таблице в политике.
-- Решение: проверки через SECURITY DEFINER (чтение без рекурсии RLS).

create or replace function public.auth_is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = auth.uid()
  );
$$;

revoke all on function public.auth_is_project_owner(uuid) from public;
grant execute on function public.auth_is_project_owner(uuid) to authenticated;

create or replace function public.auth_is_project_admin(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
  );
$$;

revoke all on function public.auth_is_project_admin(uuid) from public;
grant execute on function public.auth_is_project_admin(uuid) to authenticated;

drop policy if exists "project_members_select" on public.project_members;
drop policy if exists "project_members_insert_admin" on public.project_members;
drop policy if exists "project_members_update_admin" on public.project_members;
drop policy if exists "project_members_delete_admin" on public.project_members;

create policy "project_members_select" on public.project_members
for select using (
  user_id = auth.uid()
  or public.auth_is_project_owner(project_members.project_id)
  or public.auth_is_project_admin(project_members.project_id)
);

create policy "project_members_insert_admin" on public.project_members
for insert with check (
  public.auth_is_project_owner(project_members.project_id)
  or public.auth_is_project_admin(project_members.project_id)
);

create policy "project_members_update_admin" on public.project_members
for update using (
  public.auth_is_project_owner(project_members.project_id)
  or public.auth_is_project_admin(project_members.project_id)
) with check (
  public.auth_is_project_owner(project_members.project_id)
  or public.auth_is_project_admin(project_members.project_id)
);

create policy "project_members_delete_admin" on public.project_members
for delete using (
  public.auth_is_project_owner(project_members.project_id)
  or public.auth_is_project_admin(project_members.project_id)
);

-- RPC: те же хелперы (без подзапросов к pm под RLS внутри клиентских политик)
create or replace function public.update_project_member_role(
  p_project_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role is null or p_role not in ('admin', 'member') then
    raise exception 'INVALID_ROLE';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'CANNOT_CHANGE_OWN_ROLE';
  end if;

  if not coalesce(public.auth_is_project_owner(p_project_id), false)
     and not coalesce(public.auth_is_project_admin(p_project_id), false) then
    raise exception 'FORBIDDEN';
  end if;

  update public.project_members pm
  set role = p_role
  where pm.project_id = p_project_id
    and pm.user_id = p_user_id;

  if not found then
    raise exception 'NO_MEMBERSHIP_ROW';
  end if;
end;
$$;

revoke all on function public.update_project_member_role(uuid, uuid, text) from public;
grant execute on function public.update_project_member_role(uuid, uuid, text) to authenticated;
