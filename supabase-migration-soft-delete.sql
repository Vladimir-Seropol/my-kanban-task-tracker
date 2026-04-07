alter table public.columns add column if not exists deleted_at timestamptz;
alter table public.tasks add column if not exists deleted_at timestamptz;

create index if not exists idx_columns_deleted_at on public.columns (deleted_at);
create index if not exists idx_tasks_deleted_at on public.tasks (deleted_at);
