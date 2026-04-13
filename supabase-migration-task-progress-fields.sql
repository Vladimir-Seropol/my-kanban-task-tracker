-- Поля хода работы задачи (исполнитель): что сделано / в работе / проблемы.
-- После применения: Supabase → SQL Editor или supabase db push / ручной запуск.

alter table public.tasks add column if not exists progress_done text not null default '';
alter table public.tasks add column if not exists progress_current text not null default '';
alter table public.tasks add column if not exists progress_blockers text not null default '';

drop function if exists public.patch_project_task(text, jsonb);
drop function if exists public.patch_project_task(jsonb, text);

create or replace function public.patch_project_task(
  p_patch jsonb,
  p_task_id text
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.tasks;
  ok boolean;
begin
  if p_patch is null or p_patch = '{}'::jsonb then
    raise exception 'EMPTY_PATCH';
  end if;

  select true into ok
  from public.tasks t
  where t.id = p_task_id
    and t.deleted_at is null
    and (
      exists (
        select 1
        from public.projects p
        where p.id = t.project_id
          and p.owner_id = auth.uid()
      )
      or exists (
        select 1
        from public.project_members pm
        where pm.project_id = t.project_id
          and pm.user_id = auth.uid()
      )
    );

  if not coalesce(ok, false) then
    raise exception 'NOT_FOUND_OR_FORBIDDEN';
  end if;

  update public.tasks t
  set
    text = case when p_patch ? 'text' then (p_patch->>'text')::text else t.text end,
    column_id = case when p_patch ? 'column_id' then (p_patch->>'column_id')::text else t.column_id end,
    order_index = case when p_patch ? 'order_index' then (p_patch->>'order_index')::int else t.order_index end,
    assignee = case when p_patch ? 'assignee' then (p_patch->>'assignee')::text else t.assignee end,
    reporter = case when p_patch ? 'reporter' then (p_patch->>'reporter')::text else t.reporter end,
    source = case when p_patch ? 'source' then (p_patch->>'source')::text else t.source end,
    description = case when p_patch ? 'description' then (p_patch->>'description')::text else t.description end,
    progress_done = case when p_patch ? 'progress_done' then (p_patch->>'progress_done')::text else t.progress_done end,
    progress_current = case when p_patch ? 'progress_current' then (p_patch->>'progress_current')::text else t.progress_current end,
    progress_blockers = case when p_patch ? 'progress_blockers' then (p_patch->>'progress_blockers')::text else t.progress_blockers end,
    epic = case when p_patch ? 'epic' then (p_patch->>'epic')::text else t.epic end,
    tags = case
      when p_patch ? 'tags' then coalesce(
        array(select jsonb_array_elements_text(p_patch->'tags')),
        '{}'::text[]
      )
      else t.tags
    end,
    priority = case when p_patch ? 'priority' then (p_patch->>'priority')::text else t.priority end,
    created_at = case when p_patch ? 'created_at' then (p_patch->>'created_at')::text else t.created_at end,
    due_date = case
      when p_patch ? 'due_date' and jsonb_typeof(p_patch->'due_date') = 'null' then null
      when p_patch ? 'due_date' then (p_patch->>'due_date')::text
      else t.due_date
    end
  where t.id = p_task_id
  returning t.* into strict r;

  return r;
end;
$$;

revoke all on function public.patch_project_task(jsonb, text) from public;
grant execute on function public.patch_project_task(jsonb, text) to authenticated;

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
      progress_done,
      progress_current,
      progress_blockers,
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
      coalesce(rec->>'progress_done', ''),
      coalesce(rec->>'progress_current', ''),
      coalesce(rec->>'progress_blockers', ''),
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
      progress_done = excluded.progress_done,
      progress_current = excluded.progress_current,
      progress_blockers = excluded.progress_blockers,
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

notify pgrst, 'reload schema';
