import { supabase } from "../lib/supabase";
import type {
  TaskApi,
  ColumnType,
  ProjectApi,
  ProjectMember,
  ProjectRole,
} from "../types/types";

type TaskRow = {
  id: string;
  text: string;
  column_id: string;
  order_index: number;
  assignee: string;
  reporter: string;
  source: string;
  description: string;
  epic: string;
  tags: string[];
  priority: string;
  created_at: string;
  due_date: string | null;
  deleted_at: string | null;
  project_id: string;
};

type ColumnRow = {
  id: string;
  title: string;
  position: number;
  deleted_at: string | null;
  project_id: string;
};

type ProjectRow = {
  id: string;
  name: string;
  created_at: string;
  owner_id?: string;
};

type ProjectMemberRow = {
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: string;
};

type ProjectMemberRoleRow = {
  role: ProjectRole;
};

/** PostgREST: RPC ещё не создана в БД (миграция не применена). */
const isRpcMissingError = (error: { code?: string; message?: string }) =>
  error.code === "PGRST202" ||
  (typeof error.message === "string" && error.message.includes("Could not find the function"));

const mapTaskRowToApi = (row: TaskRow): TaskApi => ({
  id: row.id,
  text: row.text,
  columnId: row.column_id,
  order: row.order_index,
  assignee: row.assignee,
  reporter: row.reporter,
  source: row.source,
  description: row.description,
  epic: row.epic,
  tags: row.tags ?? [],
  priority: row.priority,
  createdAt: row.created_at,
  dueDate: row.due_date ?? undefined,
});

const mapTaskApiToInsert = (task: TaskApi): TaskRow => ({
  id: task.id,
  text: task.text,
  column_id: task.columnId,
  order_index: task.order ?? 0,
  assignee: task.assignee ?? "",
  reporter: task.reporter ?? "",
  source: task.source ?? "",
  description: task.description ?? "",
  epic: task.epic ?? "",
  tags: task.tags ?? [],
  priority: task.priority,
  created_at: task.createdAt,
  due_date: task.dueDate ?? null,
  deleted_at: null,
  project_id: "",
});

const mapTaskApiPatchToUpdate = (data: Partial<TaskApi>): Partial<TaskRow> => {
  const update: Partial<TaskRow> = {};
  if (data.text !== undefined) update.text = data.text;
  if (data.columnId !== undefined) update.column_id = data.columnId;
  if (data.order !== undefined) update.order_index = data.order;
  if (data.assignee !== undefined) update.assignee = data.assignee;
  if (data.reporter !== undefined) update.reporter = data.reporter;
  if (data.source !== undefined) update.source = data.source;
  if (data.description !== undefined) update.description = data.description;
  if (data.epic !== undefined) update.epic = data.epic;
  if (data.tags !== undefined) update.tags = data.tags;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.createdAt !== undefined) update.created_at = data.createdAt;
  if (data.dueDate !== undefined) update.due_date = data.dueDate ?? null;
  return update;
};

const mapColumnRowToApi = (row: ColumnRow): ColumnType => ({
  id: row.id,
  title: row.title,
  tasks: [],
});

const mapProjectRowToApi = (row: ProjectRow): ProjectApi => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
});

const getNextColumnPosition = async (projectId: string): Promise<number> => {
  const { data, error } = await supabase
    .from("columns")
    .select("position")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  if (error) throw error;
  return (data?.position ?? -1) + 1;
};

// TASKS
export const fetchTasks = async (projectId: string): Promise<TaskApi[]> => {
  const { data, error } = await supabase.rpc("list_project_tasks", {
    p_project_id: projectId,
  });

  if (error) throw error;
  return ((data ?? []) as TaskRow[]).map(mapTaskRowToApi);
};

export const createTaskApi = async (
  task: TaskApi,
  projectId: string
): Promise<TaskApi> => {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...mapTaskApiToInsert(task), project_id: projectId })
    .select("*")
    .single<TaskRow>();

  if (error) throw error;
  return mapTaskRowToApi(data);
};

/**
 * Через RPC patch_project_task: прямой UPDATE под RLS часто не трогает чужие по owner_id задачи
 * (0 строк), а клиент без .select() этого не видит. RPC — SECURITY DEFINER + проверка проекта/участия.
 */
export const updateTaskApi = async (
  taskId: string,
  data: Partial<TaskApi>
): Promise<TaskApi> => {
  const patch = mapTaskApiPatchToUpdate(data);
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    throw new Error("EMPTY_TASK_PATCH");
  }

  const { data: row, error } = await supabase.rpc("patch_project_task", {
    p_patch: Object.fromEntries(entries),
    p_task_id: taskId,
  });

  if (error) throw error;
  const raw = Array.isArray(row) ? row[0] : row;
  if (raw == null) throw new Error("PATCH_TASK_NO_ROW");

  return mapTaskRowToApi(raw as TaskRow);
};

export const deleteTaskApi = async (taskId: string): Promise<void> => {
  const rpc = await supabase.rpc("soft_delete_project_task", {
    p_task_id: taskId,
  });
  if (!rpc.error) return;
  if (!isRpcMissingError(rpc.error)) throw rpc.error;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: now })
    .eq("id", taskId);
  if (error) throw error;
};

// COLUMNS
export const fetchColumns = async (projectId: string): Promise<ColumnType[]> => {
  const { data, error } = await supabase.rpc("list_project_columns", {
    p_project_id: projectId,
  });

  if (error) throw error;
  return ((data ?? []) as ColumnRow[]).map(mapColumnRowToApi);
};

export const createColumnApi = async (
  column: { id: string; title: string },
  projectId: string
) => {
  const position = await getNextColumnPosition(projectId);

  const { data, error } = await supabase
    .from("columns")
    .insert({ id: column.id, title: column.title, position, project_id: projectId })
    .select("*")
    .single<ColumnRow>();

  if (error) throw error;
  return mapColumnRowToApi(data);
};

export const updateColumnApi = async (
  columnId: string,
  data: Partial<{ title: string }>
) => {
  const { data: updated, error } = await supabase
    .from("columns")
    .update({ title: data.title })
    .eq("id", columnId)
    .select("*")
    .single<ColumnRow>();

  if (error) throw error;
  return mapColumnRowToApi(updated);
};

export const deleteColumnApi = async (columnId: string) => {
  const rpc = await supabase.rpc("soft_delete_project_column", {
    p_column_id: columnId,
  });
  if (!rpc.error) return;
  if (!isRpcMissingError(rpc.error)) throw rpc.error;

  const now = new Date().toISOString();
  const { error: tasksError } = await supabase
    .from("tasks")
    .update({ deleted_at: now })
    .eq("column_id", columnId)
    .is("deleted_at", null);
  if (tasksError) throw tasksError;

  const { error } = await supabase
    .from("columns")
    .update({ deleted_at: now })
    .eq("id", columnId);
  if (error) throw error;
};

export type BoardExportData = {
  projectId: string;
  columns: Array<{ id: string; title: string; position: number }>;
  tasks: TaskApi[];
};

export const exportBoardDataApi = async (
  projectId: string
): Promise<BoardExportData> => {
  const [columnsRaw, tasks] = await Promise.all([
    fetchColumns(projectId),
    fetchTasks(projectId),
  ]);

  const columns = columnsRaw.map((col, index) => ({
    id: col.id,
    title: col.title,
    position: index,
  }));

  return { projectId, columns, tasks };
};

export const importBoardDataApi = async (
  projectId: string,
  payload: BoardExportData
): Promise<void> => {
  const columnsToInsert = payload.columns.map((c) => ({
    id: c.id,
    title: c.title,
    position: c.position,
    deleted_at: null,
    project_id: projectId,
  }));

  const tasksToInsert = payload.tasks.map((t) => ({
    ...mapTaskApiToInsert(t),
    deleted_at: null,
    project_id: projectId,
  }));

  const rpc = await supabase.rpc("import_project_board", {
    p_project_id: projectId,
    p_columns: columnsToInsert,
    p_tasks: tasksToInsert,
  });

  if (!rpc.error) return;
  if (isRpcMissingError(rpc.error)) throw new Error("IMPORT_RPC_MISSING");
  throw rpc.error;
};

export const fetchProjectsApi = async (): Promise<ProjectApi[]> => {
  const { data, error } = await supabase.rpc("list_my_projects");

  if (error) throw error;
  const rows = (data ?? []) as ProjectRow[];
  return rows.map(mapProjectRowToApi);
};

export const createProjectApi = async (name: string): Promise<ProjectApi> => {
  const { data, error } = await supabase
    .from("projects")
    .insert({ name })
    .select("*")
    .single<ProjectRow>();

  if (error) throw error;
  return mapProjectRowToApi(data);
};

export const updateProjectApi = async (
  projectId: string,
  name: string
): Promise<ProjectApi> => {
  const { data, error } = await supabase
    .from("projects")
    .update({ name })
    .eq("id", projectId)
    .select("*")
    .single<ProjectRow>();

  if (error) throw error;
  return mapProjectRowToApi(data);
};

export const deleteProjectApi = async (projectId: string): Promise<void> => {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
};

export const fetchProjectRoleApi = async (
  projectId: string
): Promise<ProjectRole> => {
  // getSession() reads cached session and avoids extra auth lock contention from getUser() in dev StrictMode.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user?.id;
  if (!userId) return "member";

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .maybeSingle<{ owner_id: string }>();

  if (projectError) throw projectError;
  if (project?.owner_id === userId) return "admin";

  const { data: membership, error: memberError } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle<ProjectMemberRoleRow>();

  if (memberError) {
    // Backward compatibility before project_members migration is applied.
    if (memberError.code === "42P01") return "admin";
    throw memberError;
  }

  return membership?.role === "admin" ? "admin" : "member";
};

const mapProjectMemberRowToApi = (row: ProjectMemberRow): ProjectMember => ({
  projectId: row.project_id,
  userId: row.user_id,
  role: row.role,
  createdAt: row.created_at,
});

export const fetchProjectMembersApi = async (
  projectId: string
): Promise<ProjectMember[]> => {
  const { data, error } = await supabase
    .from("project_members")
    .select("project_id, user_id, role, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ProjectMemberRow[]).map(mapProjectMemberRowToApi);
};

export const addProjectMemberApi = async (
  projectId: string,
  userId: string,
  role: ProjectRole = "member"
): Promise<void> => {
  const { error } = await supabase
    .from("project_members")
    .upsert(
      { project_id: projectId, user_id: userId, role },
      { onConflict: "project_id,user_id" }
    );
  if (error) throw error;
};

export const addProjectMemberByEmailApi = async (
  projectId: string,
  email: string,
  role: ProjectRole = "member"
): Promise<void> => {
  const { error } = await supabase.rpc("invite_project_member_by_email", {
    p_project_id: projectId,
    p_email: email.trim().toLowerCase(),
    p_role: role,
  });
  if (error) throw error;
};

export const updateProjectMemberRoleApi = async (
  projectId: string,
  userId: string,
  role: ProjectRole
): Promise<void> => {
  const { error } = await supabase
    .from("project_members")
    .update({ role })
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw error;
};

export const removeProjectMemberApi = async (
  projectId: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw error;
};

// Корзина (soft delete): только админ проекта — через RPC (RLS на UPDATE не ограничивает deleted_at для участников).
export type TrashColumnRow = {
  id: string;
  title: string;
  deleted_at: string | null;
};

export type TrashTaskRow = {
  id: string;
  text: string;
  column_id: string;
  column_title: string;
  deleted_at: string | null;
};

export const fetchTrashColumnsApi = async (
  projectId: string
): Promise<TrashColumnRow[]> => {
  const { data, error } = await supabase.rpc("list_project_trash_columns", {
    p_project_id: projectId,
  });

  if (error) throw error;
  return ((data ?? []) as ColumnRow[]).map((r) => ({
    id: r.id,
    title: r.title,
    deleted_at: r.deleted_at ?? null,
  }));
};

export const fetchTrashTasksApi = async (
  projectId: string
): Promise<TrashTaskRow[]> => {
  const { data, error } = await supabase.rpc("list_project_trash_tasks", {
    p_project_id: projectId,
  });

  if (error) throw error;
  return (data ?? []) as TrashTaskRow[];
};

export const restoreColumnFromTrashApi = async (columnId: string): Promise<void> => {
  const { error } = await supabase.rpc("restore_project_column", {
    p_column_id: columnId,
  });
  if (error) throw error;
};

export const restoreTaskFromTrashApi = async (taskId: string): Promise<void> => {
  const { error } = await supabase.rpc("restore_project_task", {
    p_task_id: taskId,
  });
  if (error) throw error;
};

/** Безвозвратно удалить из БД всё в корзине проекта. Нужна миграция supabase-migration-purge-trash.sql */
export const purgeProjectTrashApi = async (projectId: string): Promise<void> => {
  const { error } = await supabase.rpc("purge_project_trash", {
    p_project_id: projectId,
  });
  if (error) throw error;
};