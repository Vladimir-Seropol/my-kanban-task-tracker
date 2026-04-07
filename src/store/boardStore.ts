import { create } from "zustand";
import type { Task, TaskApi } from "../types/types";
import {
    fetchTasks,
    fetchColumns,
    createTaskApi,
    updateTaskApi,
    deleteTaskApi,
    createColumnApi,
    updateColumnApi,
    deleteColumnApi,
} from "../api/api";

export type Column = {
    id: string;
    title: string;
    taskIds: string[];
};

type BoardState = {
    tasksById: Record<string, Task>;
    columnsById: Record<string, Column>;
    columnOrder: string[];

    loadBoard: () => Promise<void>;

    createTask: (task: Task) => Promise<void>;
    editTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;

    createColumn: (column: Column) => Promise<void>;
    editColumn: (columnId: string, updates: Partial<Column>) => Promise<void>;
    deleteColumn: (columnId: string) => Promise<void>;

    moveTask: (params: {
        taskId: string;
        fromColumnId: string;
        toColumnId: string;
        toIndex: number;
    }) => Promise<void>;
};

// Маппинг API → UI
const safeString = (v?: string) => v ?? "";
const safeNumber = (v?: number) => v ?? 0;

const mapApiTaskToUI = (task: TaskApi): Task => ({
    id: task.id,
    text: task.text,
    columnId: task.columnId,
    order: safeNumber(task.order),
    assignee: safeString(task.assignee),
    reporter: safeString(task.reporter),
    assigneeAvatarUrl: task.assigneeAvatarUrl,
    reporterAvatarUrl: task.reporterAvatarUrl,
    source: safeString(task.source),
    description: safeString(task.description),
    epic: safeString(task.epic),
    tags: task.tags ?? [],
    priority: task.priority as "низкий" | "средний" | "высокий",
    createdAt: task.createdAt,
    dueDate: task.dueDate,
});

// Маппинг UI → API
const mapUITaskToApi = (task: Task): TaskApi => ({
    id: task.id,
    text: task.text,
    columnId: task.columnId,
    order: task.order,
    assignee: task.assignee,
    reporter: task.reporter ?? "",
    assigneeAvatarUrl: task.assigneeAvatarUrl,
    reporterAvatarUrl: task.reporterAvatarUrl,
    source: task.source ?? "",
    description: task.description,
    epic: task.epic ?? "",
    tags: task.tags ?? [],
    priority: task.priority,
    createdAt: task.createdAt,
    dueDate: task.dueDate,
});

const DEFAULT_COLUMNS: Array<{ id: string; title: string }> = [
    { id: "todo", title: "Созданные" },
    { id: "in-progress", title: "В работе" },
    { id: "done", title: "Готово" },
];

export const useBoardStore = create<BoardState>((set, get) => ({
    tasksById: {},
    columnsById: {},
    columnOrder: [],

        // LOAD BOARD
        loadBoard: async () => {
        let [tasksApi, columnsApi] = await Promise.all([fetchTasks(), fetchColumns()]);

        if (columnsApi.length === 0) {
            await Promise.all(DEFAULT_COLUMNS.map((column) => createColumnApi(column)));
            [tasksApi, columnsApi] = await Promise.all([fetchTasks(), fetchColumns()]);
        }

        const tasks: Task[] = tasksApi.map(mapApiTaskToUI);

        const columns: Column[] = columnsApi.map((col) => ({
            id: col.id,
            title: col.title,
            taskIds: tasks.filter((t) => t.columnId === col.id).map((t) => t.id),
        }));

        const tasksById = Object.fromEntries(tasks.map((t) => [t.id, t]));
        const columnsById = Object.fromEntries(columns.map((c) => [c.id, c]));

        set({ tasksById, columnsById, columnOrder: columns.map((c) => c.id) });
    },

        // TASKS
        createTask: async (task) => {
        const createdApi = await createTaskApi(mapUITaskToApi(task));
        const createdTask = mapApiTaskToUI(createdApi);

        set((state) => {
            const column = state.columnsById[createdTask.columnId];
            if (!column) return state;

            return {
                tasksById: { ...state.tasksById, [createdTask.id]: createdTask },
                columnsById: {
                    ...state.columnsById,
                    [column.id]: { ...column, taskIds: [...column.taskIds, createdTask.id] },
                },
            };
        });
    },

    editTask: async (taskId, updates) => {
        const state = get();
        const current = state.tasksById[taskId];
        const updatedApi = await updateTaskApi(taskId, mapUITaskToApi({ ...current, ...updates }));
        const updatedTask = mapApiTaskToUI(updatedApi);

        set((state) => {
            const newColumnsById = { ...state.columnsById };
            if (updates.columnId && updates.columnId !== current.columnId) {

                const oldColumn = newColumnsById[current.columnId];
                const newOldTaskIds = oldColumn.taskIds.filter((id) => id !== taskId);
                newColumnsById[current.columnId] = { ...oldColumn, taskIds: newOldTaskIds };

                const newColumn = newColumnsById[updates.columnId];
                if (!newColumn) return state;
                const newNewTaskIds = [...newColumn.taskIds, taskId];
                newColumnsById[updates.columnId] = { ...newColumn, taskIds: newNewTaskIds };
            }

            return {
                tasksById: { ...state.tasksById, [taskId]: updatedTask },
                columnsById: newColumnsById,
            };
        });
    },

    deleteTask: async (taskId) => {
        const task = get().tasksById[taskId];
        if (!task) return;

        await deleteTaskApi(taskId);

        set((state) => {
            const column = state.columnsById[task.columnId];
            if (!column) return state;

            const newTaskIds = column.taskIds.filter((id) => id !== taskId);
            const restTasks = { ...state.tasksById };
            delete restTasks[taskId];

            return {
                tasksById: restTasks,
                columnsById: { ...state.columnsById, [column.id]: { ...column, taskIds: newTaskIds } },
            };
        });
    },

        // COLUMNS
        createColumn: async (column) => {
        const created = await createColumnApi({ id: column.id, title: column.title });
        set((state) => ({
            columnsById: {
                ...state.columnsById,
                [created.id]: {
                    id: created.id,
                    title: created.title,
                    taskIds: [],
                },
            },
            columnOrder: [...state.columnOrder, created.id],
        }));
    },

    editColumn: async (columnId, updates) => {
        const current = get().columnsById[columnId];
        if (!current) return;

        const updated = await updateColumnApi(columnId, { title: updates.title ?? current.title });

        set((state) => ({
            columnsById: { ...state.columnsById, [columnId]: { ...current, title: updated.title } },
        }));
    },

    deleteColumn: async (columnId) => {
        const column = get().columnsById[columnId];
        if (!column) return;

        await deleteColumnApi(columnId);

        set((state) => {
            const newTasks = { ...state.tasksById };
            column.taskIds.forEach((id) => delete newTasks[id]);

            const restColumns = { ...state.columnsById };
            delete restColumns[columnId];

            return {
                tasksById: newTasks,
                columnsById: restColumns,
                columnOrder: state.columnOrder.filter((id) => id !== columnId),
            };
        });
    },

        // DND
        moveTask: async ({ taskId, fromColumnId, toColumnId, toIndex }) => {
        const state = get();
        const fromColumn = state.columnsById[fromColumnId];
        const toColumn = state.columnsById[toColumnId];
        if (!fromColumn || !toColumn) return;

        const task = state.tasksById[taskId];
        if (!task) return;

        const fromTaskIds = [...fromColumn.taskIds].filter((id) => id !== taskId);
        const toTaskIds = [...toColumn.taskIds].filter((id) => id !== taskId);

        const insertIndex = toTaskIds.length === 0 ? 0 : (toIndex ?? toTaskIds.length);
        toTaskIds.splice(insertIndex, 0, taskId);

        const updatedTasks: Record<string, Task> = { ...state.tasksById };
        toTaskIds.forEach((id, idx) => {
            const t = updatedTasks[id];
            updatedTasks[id] = { ...t, columnId: toColumnId, order: idx };
        });
        if (fromColumnId !== toColumnId) {
            fromTaskIds.forEach((id, idx) => {
                const t = updatedTasks[id];
                updatedTasks[id] = { ...t, order: idx };
            });
        }

        set({
            tasksById: updatedTasks,
            columnsById: {
                ...state.columnsById,
                [fromColumnId]: { ...fromColumn, taskIds: fromTaskIds },
                [toColumnId]: { ...toColumn, taskIds: toTaskIds },
            },
        });

        const changedTasks = new Set([
            ...toTaskIds,
            ...(fromColumnId !== toColumnId ? fromTaskIds : []),
        ]);

        await Promise.all(
            [...changedTasks].map((id) => {
                const t = updatedTasks[id];
                return updateTaskApi(t.id, {
                    columnId: t.columnId,
                    order: t.order,
                });
            })
        );
    }
}));