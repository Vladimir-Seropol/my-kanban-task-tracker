import { create } from "zustand";
import type {
    Task,
    TaskApi,
    ProjectApi,
    ProjectMember,
    ProjectPermissions,
    ProjectRole,
} from "../types/types";
import {
    fetchTasks,
    fetchColumns,
    fetchProjectsApi,
    createProjectApi,
    updateProjectApi,
    deleteProjectApi,
    createTaskApi,
    updateTaskApi,
    deleteTaskApi,
    createColumnApi,
    updateColumnApi,
    deleteColumnApi,
    exportBoardDataApi,
    fetchProjectRoleApi,
    fetchProjectMembersApi,
    addProjectMemberApi,
    addProjectMemberByEmailApi,
    updateProjectMemberRoleApi,
    removeProjectMemberApi,
    importBoardDataApi,
    type BoardExportData,
} from "../api/api";

export type Column = {
    id: string;
    title: string;
    taskIds: string[];
};

type BoardState = {
    projects: ProjectApi[];
    selectedProjectId: string | null;
    projectRole: ProjectRole;
    projectPermissions: ProjectPermissions;
    projectMembers: ProjectMember[];
    isProjectsLoading: boolean;
    isMembersLoading: boolean;
    tasksById: Record<string, Task>;
    columnsById: Record<string, Column>;
    columnOrder: string[];

    loadProjects: () => Promise<void>;
    selectProject: (projectId: string) => void;
    loadProjectRole: (projectId: string) => Promise<void>;
    loadProjectMembers: (projectId: string) => Promise<void>;
    addProjectMember: (projectId: string, userId: string, role?: ProjectRole) => Promise<void>;
    addProjectMemberByEmail: (projectId: string, email: string, role?: ProjectRole) => Promise<void>;
    updateProjectMemberRole: (projectId: string, userId: string, role: ProjectRole) => Promise<void>;
    removeProjectMember: (projectId: string, userId: string) => Promise<void>;
    createProject: (name: string) => Promise<void>;
    editProject: (projectId: string, name: string) => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    loadBoard: (projectId: string) => Promise<void>;

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
    exportBoard: () => Promise<BoardExportData>;
    importBoard: (payload: BoardExportData) => Promise<void>;
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
    source: task.source ?? "",
    description: task.description,
    epic: task.epic ?? "",
    tags: task.tags ?? [],
    priority: task.priority,
    createdAt: task.createdAt,
    dueDate: task.dueDate,
});

let loadBoardInFlight: Promise<void> | null = null;
const loadRoleInFlight = new Map<string, Promise<void>>();
const loadMembersInFlight = new Map<string, Promise<void>>();
const roleToPermissions = (role: ProjectRole): ProjectPermissions => ({
    canManageProjects: role === "admin",
    canManageColumns: role === "admin",
    canDeleteTasks: role === "admin",
    canCreateTasks: true,
    canEditTasks: true,
    canMoveTasks: true,
});

export const useBoardStore = create<BoardState>((set, get) => ({
    projects: [],
    selectedProjectId: null,
    projectRole: "member",
    projectPermissions: roleToPermissions("member"),
    projectMembers: [],
    isProjectsLoading: false,
    isMembersLoading: false,
    tasksById: {},
    columnsById: {},
    columnOrder: [],

        loadProjects: async () => {
        set({ isProjectsLoading: true });
        try {
            const projects = await fetchProjectsApi();
            if (projects.length === 0) {
                set({
                    projects: [],
                    selectedProjectId: null,
                    projectRole: "member",
                    projectPermissions: roleToPermissions("member"),
                    projectMembers: [],
                    tasksById: {},
                    columnsById: {},
                    columnOrder: [],
                });
                return;
            }

            set((state) => ({
                projects,
                selectedProjectId: state.selectedProjectId ?? projects[0].id,
            }));

            const selected = get().selectedProjectId ?? projects[0]?.id;
            if (selected) {
                await get().loadProjectRole(selected);
                await get().loadProjectMembers(selected);
            }
        } finally {
            set({ isProjectsLoading: false });
        }
    },

    selectProject: (projectId) => {
        set({ selectedProjectId: projectId });
        void get().loadProjectRole(projectId);
        void get().loadProjectMembers(projectId);
    },

    loadProjectRole: async (projectId) => {
        const existing = loadRoleInFlight.get(projectId);
        if (existing) {
            await existing;
            return;
        }

        const req = (async () => {
            const role = await fetchProjectRoleApi(projectId);
            set({
                projectRole: role,
                projectPermissions: roleToPermissions(role),
            });
        })().finally(() => {
            loadRoleInFlight.delete(projectId);
        });

        loadRoleInFlight.set(projectId, req);
        await req;
    },

    loadProjectMembers: async (projectId) => {
        const existing = loadMembersInFlight.get(projectId);
        if (existing) {
            await existing;
            return;
        }

        set({ isMembersLoading: true });
        const req = (async () => {
            const members = await fetchProjectMembersApi(projectId);
            set({ projectMembers: members });
        })().finally(() => {
            set({ isMembersLoading: false });
            loadMembersInFlight.delete(projectId);
        });

        loadMembersInFlight.set(projectId, req);
        await req;
    },

    addProjectMember: async (projectId, userId, role = "member") => {
        if (!get().projectPermissions.canManageProjects) throw new Error("FORBIDDEN");
        await addProjectMemberApi(projectId, userId, role);
        await get().loadProjectMembers(projectId);
    },

    addProjectMemberByEmail: async (projectId, email, role = "member") => {
        if (!get().projectPermissions.canManageProjects) throw new Error("FORBIDDEN");
        await addProjectMemberByEmailApi(projectId, email, role);
        await get().loadProjectMembers(projectId);
    },

    updateProjectMemberRole: async (projectId, userId, role) => {
        if (!get().projectPermissions.canManageProjects) throw new Error("FORBIDDEN");
        await updateProjectMemberRoleApi(projectId, userId, role);
        await get().loadProjectMembers(projectId);
    },

    removeProjectMember: async (projectId, userId) => {
        if (!get().projectPermissions.canManageProjects) throw new Error("FORBIDDEN");
        await removeProjectMemberApi(projectId, userId);
        await get().loadProjectMembers(projectId);
    },

    createProject: async (name) => {
        const state = get();
        if (!state.projectPermissions.canManageProjects && state.projects.length > 0) {
            throw new Error("FORBIDDEN");
        }
        const created = await createProjectApi(name.trim());
        set((state) => ({
            projects: [...state.projects, created],
            selectedProjectId: created.id,
            projectRole: "admin",
            projectPermissions: roleToPermissions("admin"),
        }));
    },

    editProject: async (projectId, name) => {
        if (!get().projectPermissions.canManageProjects) throw new Error("FORBIDDEN");
        const updated = await updateProjectApi(projectId, name.trim());
        set((state) => ({
            projects: state.projects.map((project) =>
                project.id === projectId ? updated : project
            ),
        }));
    },

    deleteProject: async (projectId) => {
        if (!get().projectPermissions.canManageProjects) throw new Error("FORBIDDEN");
        await deleteProjectApi(projectId);
        set((state) => {
            const projects = state.projects.filter((project) => project.id !== projectId);
            const selectedProjectId =
                state.selectedProjectId === projectId
                    ? (projects[0]?.id ?? null)
                    : state.selectedProjectId;

            return {
                projects,
                selectedProjectId,
                ...(state.selectedProjectId === projectId
                    ? { tasksById: {}, columnsById: {}, columnOrder: [] }
                    : {}),
            };
        });
    },

        // LOAD BOARD
        loadBoard: async (projectId) => {
        await get().loadProjectRole(projectId);

        if (loadBoardInFlight) {
            await loadBoardInFlight;
            return;
        }

        loadBoardInFlight = (async () => {
            const [tasksApi, columnsApi] = await Promise.all([
                fetchTasks(projectId),
                fetchColumns(projectId),
            ]);

            const tasks: Task[] = tasksApi.map(mapApiTaskToUI);

            const columns: Column[] = columnsApi.map((col) => ({
                id: col.id,
                title: col.title,
                taskIds: tasks.filter((t) => t.columnId === col.id).map((t) => t.id),
            }));

            const tasksById = Object.fromEntries(tasks.map((t) => [t.id, t]));
            const columnsById = Object.fromEntries(columns.map((c) => [c.id, c]));

            set({ tasksById, columnsById, columnOrder: columns.map((c) => c.id) });
        })().finally(() => {
            loadBoardInFlight = null;
        });

        await loadBoardInFlight;
    },

        // TASKS
        createTask: async (task) => {
        if (!get().projectPermissions.canCreateTasks) throw new Error("FORBIDDEN");
        const projectId = get().selectedProjectId;
        if (!projectId) return;
        const createdApi = await createTaskApi(mapUITaskToApi(task), projectId);
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
        if (!get().projectPermissions.canEditTasks) throw new Error("FORBIDDEN");
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
        if (!get().projectPermissions.canDeleteTasks) throw new Error("FORBIDDEN");
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
        if (!get().projectPermissions.canManageColumns) throw new Error("FORBIDDEN");
        const projectId = get().selectedProjectId;
        if (!projectId) return;

        const created = await createColumnApi({ id: column.id, title: column.title }, projectId);
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
        if (!get().projectPermissions.canManageColumns) throw new Error("FORBIDDEN");
        const current = get().columnsById[columnId];
        if (!current) return;

        const updated = await updateColumnApi(columnId, { title: updates.title ?? current.title });

        set((state) => ({
            columnsById: { ...state.columnsById, [columnId]: { ...current, title: updated.title } },
        }));
    },

    deleteColumn: async (columnId) => {
        if (!get().projectPermissions.canManageColumns) throw new Error("FORBIDDEN");
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
        if (!get().projectPermissions.canMoveTasks) throw new Error("FORBIDDEN");
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
    },

    exportBoard: async () => {
        const projectId = get().selectedProjectId;
        if (!projectId) throw new Error("No selected project");
        return exportBoardDataApi(projectId);
    },

    importBoard: async (payload) => {
        if (!get().projectPermissions.canManageColumns) throw new Error("FORBIDDEN");
        const projectId = get().selectedProjectId;
        if (!projectId) throw new Error("No selected project");
        await importBoardDataApi(projectId, payload);
        await get().loadBoard(projectId);
    },
}));