-- =============================================================================
-- НОВЫЙ ЛИСТ: все задачи, колонки, участники проектов (project_members), проекты
--
-- Выполнить в Supabase → SQL Editor (роль postgres / service — RLS не мешает).
-- ВНИМАНИЕ: удаляет канбан-данные у ВСЕХ пользователей этого проекта Supabase.
-- Учётные записи Auth (логины) не трогаются.
--
-- После выполнения:
--   1) notify ниже сбрасывает кэш схемы PostgREST в Supabase.
--   2) В браузере: жёсткое обновление (Ctrl+Shift+R) или выход и снова вход —
--      стор Zustand в памяти обновится при следующей загрузке проектов.
-- =============================================================================

begin;

delete from public.tasks;
delete from public.columns;
delete from public.project_members;
delete from public.projects;

commit;

notify pgrst, 'reload schema';
