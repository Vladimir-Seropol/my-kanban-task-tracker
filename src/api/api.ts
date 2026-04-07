import { supabase } from "../lib/supabase";
import type { TaskApi, ColumnType } from "../types/types";

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
};

type ColumnRow = {
  id: string;
  title: string;
  position: number;
};

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

const getNextColumnPosition = async (): Promise<number> => {
  const { data, error } = await supabase
    .from("columns")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  if (error) throw error;
  return (data?.position ?? -1) + 1;
};

// TASKS
export const fetchTasks = async (): Promise<TaskApi[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) throw error;
  return (data as TaskRow[]).map(mapTaskRowToApi);
};

export const createTaskApi = async (task: TaskApi): Promise<TaskApi> => {
  const { data, error } = await supabase
    .from("tasks")
    .insert(mapTaskApiToInsert(task))
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
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
};

// COLUMNS
export const fetchColumns = async (): Promise<ColumnType[]> => {
  const { data, error } = await supabase
    .from("columns")
    .select("*")
    .order("position", { ascending: true });

  if (error) throw error;
  return (data as ColumnRow[]).map(mapColumnRowToApi);
};

export const createColumnApi = async (column: { id: string; title: string }) => {
  const position = await getNextColumnPosition();

  const { data, error } = await supabase
    .from("columns")
    .insert({ id: column.id, title: column.title, position })
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
  const { error } = await supabase.from("columns").delete().eq("id", columnId);
  if (error) throw error;
};