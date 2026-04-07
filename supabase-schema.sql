create table if not exists public.columns (
  id text primary key,
  title text not null,
  position integer not null default 0
);

create table if not exists public.tasks (
  id text primary key,
  text text not null,
  column_id text not null references public.columns(id) on delete cascade,
  order_index integer not null default 0,
  assignee text not null default '',
  reporter text not null default '',
  assignee_avatar_url text,
  reporter_avatar_url text,
  source text not null default '',
  description text not null default '',
  epic text not null default '',
  tags text[] not null default '{}',
  priority text not null default 'низкий',
  created_at text not null,
  due_date text
);

create index if not exists idx_tasks_column_order on public.tasks(column_id, order_index);

alter table public.columns enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "public columns read" on public.columns;
drop policy if exists "public columns write" on public.columns;
drop policy if exists "public tasks read" on public.tasks;
drop policy if exists "public tasks write" on public.tasks;

create policy "public columns read" on public.columns
for select using (true);

create policy "public columns write" on public.columns
for all using (true) with check (true);

create policy "public tasks read" on public.tasks
for select using (true);

create policy "public tasks write" on public.tasks
for all using (true) with check (true);
