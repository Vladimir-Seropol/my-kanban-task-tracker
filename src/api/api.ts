import { supabase } from "../lib/supabase";
import type { TaskApi, ColumnType, ProjectApi } from "../types/types";

type TaskRow = {
  id: string;
  text: string;
  column_id: string;
  order_index: number;
  assignee: string;
  reporter: string;
  assignee_avatar_url: string | null;
  reporter_avatar_url: string | null;
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
};

const mapTaskRowToApi = (row: TaskRow): TaskApi => ({
  id: row.id,
  text: row.text,
  columnId: row.column_id,
  order: row.order_index,
  assignee: row.assignee,
  reporter: row.reporter,
  assigneeAvatarUrl: row.assignee_avatar_url ?? undefined,
  reporterAvatarUrl: row.reporter_avatar_url ?? undefined,
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
  assignee_avatar_url: task.assigneeAvatarUrl ?? null,
  reporter_avatar_url: task.reporterAvatarUrl ?? null,
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
  if (data.assigneeAvatarUrl !== undefined)
    update.assignee_avatar_url = data.assigneeAvatarUrl ?? null;
  if (data.reporterAvatarUrl !== undefined)
    update.reporter_avatar_url = data.reporterAvatarUrl ?? null;
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
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return (data as TaskRow[]).map(mapTaskRowToApi);
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

export const updateTaskApi = async (
  taskId: string,
  data: Partial<TaskApi>
): Promise<TaskApi> => {
  const { data: updated, error } = await supabase
    .from("tasks")
    .update(mapTaskApiPatchToUpdate(data))
    .eq("id", taskId)
    .select("*")
    .single<TaskRow>();

  if (error) throw error;
  return mapTaskRowToApi(updated);
};

export const deleteTaskApi = async (taskId: string): Promise<void> => {
  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw error;
};

// COLUMNS
export const fetchColumns = async (projectId: string): Promise<ColumnType[]> => {
  const { data, error } = await supabase
    .from("columns")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data as ColumnRow[]).map(mapColumnRowToApi);
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
  const now = new Date().toISOString();

  const { error: softDeleteTasksError } = await supabase
    .from("tasks")
    .update({ deleted_at: now })
    .eq("project_id", projectId)
    .is("deleted_at", null);
  if (softDeleteTasksError) throw softDeleteTasksError;

  const { error: softDeleteColumnsError } = await supabase
    .from("columns")
    .update({ deleted_at: now })
    .eq("project_id", projectId)
    .is("deleted_at", null);
  if (softDeleteColumnsError) throw softDeleteColumnsError;

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

  if (columnsToInsert.length > 0) {
    const { error: columnsUpsertError } = await supabase
      .from("columns")
      .upsert(columnsToInsert, { onConflict: "id" });
    if (columnsUpsertError) throw columnsUpsertError;
  }

  if (tasksToInsert.length > 0) {
    const { error: tasksUpsertError } = await supabase
      .from("tasks")
      .upsert(tasksToInsert, { onConflict: "id" });
    if (tasksUpsertError) throw tasksUpsertError;
  }
};

export const fetchProjectsApi = async (): Promise<ProjectApi[]> => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as ProjectRow[]).map(mapProjectRowToApi);
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