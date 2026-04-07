-- Run once in Supabase SQL Editor if the table was created before avatar columns existed.
alter table public.tasks add column if not exists assignee_avatar_url text;
alter table public.tasks add column if not exists reporter_avatar_url text;
