-- Импорт доски из JSON: обходит RLS так же, как soft_delete_* (владелец проекта без project_members).
-- Только владелец проекта или role = admin в project_members.

create or replace function public.import_project_board(
  p_project_id uuid,
  p_columns jsonb,
  p_tasks jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean;
  now_ts timestamptz := now();
  rec jsonb;
  v_tags text[];
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

  update public.tasks
  set deleted_at = now_ts
  where project_id = p_project_id
    and deleted_at is null;

  update public.columns
  set deleted_at = now_ts
  where project_id = p_project_id
    and deleted_at is null;

  for rec in select * from jsonb_array_elements(coalesce(p_columns, '[]'::jsonb))
  loop
    insert into public.columns (id, title, position, project_id, deleted_at)
    values (
      rec->>'id',
      rec->>'title',
      coalesce((rec->>'position')::int, 0),
      p_project_id,
      null
    )
    on conflict (id) do update set
      title = excluded.title,
      position = excluded.position,
      project_id = excluded.project_id,
      deleted_at = null;
  end loop;

  for rec in select * from jsonb_array_elements(coalesce(p_tasks, '[]'::jsonb))
  loop
    v_tags := coalesce(
      array(select jsonb_array_elements_text(coalesce(rec->'tags', '[]'::jsonb))),
      '{}'::text[]
    );

    insert into public.tasks (
      id,
      text,
      column_id,
      order_index,
      assignee,
      reporter,
      source,
      description,
      epic,
      tags,
      priority,
      created_at,
      due_date,
      deleted_at,
      project_id
    )
    values (
      rec->>'id',
      coalesce(rec->>'text', ''),
      rec->>'column_id',
      coalesce((rec->>'order_index')::int, 0),
      coalesce(rec->>'assignee', ''),
      coalesce(rec->>'reporter', ''),
      coalesce(rec->>'source', ''),
      coalesce(rec->>'description', ''),
      coalesce(rec->>'epic', ''),
      v_tags,
      coalesce(rec->>'priority', 'низкий'),
      coalesce(nullif(trim(rec->>'created_at'), ''), (now() at time zone 'utc')::text),
      nullif(rec->>'due_date', ''),
      null,
      p_project_id
    )
    on conflict (id) do update set
      text = excluded.text,
      column_id = excluded.column_id,
      order_index = excluded.order_index,
      assignee = excluded.assignee,
      reporter = excluded.reporter,
      source = excluded.source,
      description = excluded.description,
      epic = excluded.epic,
      tags = excluded.tags,
      priority = excluded.priority,
      created_at = excluded.created_at,
      due_date = excluded.due_date,
      deleted_at = null,
      project_id = excluded.project_id;
  end loop;
end;
$$;

revoke all on function public.import_project_board(uuid, jsonb, jsonb) from public;
grant execute on function public.import_project_board(uuid, jsonb, jsonb) to authenticated;
