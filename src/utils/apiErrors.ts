type ApiLikeError = {
  message?: string;
  code?: string;
  error_description?: string;
  details?: string;
  hint?: string;
} | null;

/**
 * Человекочитаемое сообщение по ошибке Supabase/PostgREST/кастомным кодам.
 * Неизвестные ошибки → `fallback`.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const e = error as ApiLikeError;
  const message = e?.message ?? e?.error_description;

  if (message === "IMPORT_RPC_MISSING") {
    return "На Supabase не применена миграция импорта. Выполните SQL: supabase-migration-import-board-rpc.sql";
  }
  if (message === "UPDATE_MEMBER_ROLE_MIGRATION_REQUIRED") {
    return "Смена роли не настроена в БД: выполните в Supabase SQL Editor файл supabase-migration-update-member-role-rls-and-rpc.sql, затем notify pgrst, 'reload schema';";
  }
  if (message === "FORBIDDEN") return "Недостаточно прав для этого действия";
  if (
    message === "CANNOT_CHANGE_OWN_ROLE" ||
    (typeof message === "string" && message.includes("CANNOT_CHANGE_OWN_ROLE"))
  ) {
    return "Нельзя изменить свою роль в проекте";
  }
  if (message === "CANNOT_REMOVE_OWNER") return "Нельзя удалить владельца проекта из участников";
  if (message === "PROJECT_NOT_FOUND") return "Проект не найден";
  if (message === "USER_NOT_FOUND") return "Пользователь с таким email не найден";
  if (
    message === "NO_ROWS_UPDATED" ||
    (typeof message === "string" && message.includes("NO_MEMBERSHIP_ROW"))
  ) {
    return "Роль не изменилась: нет строки в project_members для этого пользователя.";
  }
  if (typeof message === "string" && message.includes("INVALID_ROLE")) {
    return "Некорректная роль участника";
  }
  if (typeof message === "string" && message.toLowerCase().includes("invalid role")) {
    return "Некорректная роль участника";
  }
  if (typeof message === "string" && message.toLowerCase().includes("remove_project_member")) {
    return "Не удалось удалить участника. Проверьте, что применена миграция remove_project_member";
  }
  if (typeof message === "string" && message.includes("COLUMN_IN_TRASH")) {
    return "Сначала восстановите колонку";
  }
  if (e?.code === "42501" || (typeof message === "string" && message.includes("row-level security"))) {
    return "Импорт/запись заблокированы политиками БД. Выполните в Supabase SQL: supabase-migration-import-board-rpc.sql";
  }
  return fallback;
}
