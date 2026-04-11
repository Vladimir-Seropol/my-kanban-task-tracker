import {
    DndContext,
    rectIntersection,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import { useEffect, useState } from "react";

import { Column } from "../Column/Column";
import { TaskOverlay } from "../Task/TaskOverlay";
import { BoardSkeleton } from "../ui/BoardSkeleton";
import { Button } from "../ui/Button/Button";
import { BoardHeader } from "./BoardHeader";
import { BoardModals } from "./BoardModals";
import { BoardFilters } from "./BoardFilters";
import styles from "./Board.module.css";
import { toast } from "sonner";

import type { Task } from "../../types/types";
import { useBoardStore } from "../../store/boardStore";
import type { BoardFiltersValue } from "../../utils/boardTaskFilter";
import { taskMatchesBoardFilters } from "../../utils/boardTaskFilter";
import { getApiErrorMessage } from "../../utils/apiErrors";

type BoardProps = {
    projectId: string;
};

export const Board = ({ projectId }: BoardProps) => {
    
    // STORE
        const {
        columnOrder,
        columnsById,
        tasksById,
        moveTask,
        createTask,
        editTask,
        deleteTask,
        createColumn,
        editColumn,
        deleteColumn,
        loadBoard,
        projectPermissions,
    } = useBoardStore();

    
    // DND
        const sensors = useSensors(useSensor(PointerSensor));
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    
    // MODALS
        const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
    const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);

    const [taskModal, setTaskModal] = useState({
        isOpen: false,
        mode: "create" as "create" | "edit",
        text: "",
        columnId: "",
        taskId: null as string | null,
    });

    const [columnModal, setColumnModal] = useState({
        isOpen: false,
        title: "",
        editingId: null as string | null,
    });
    const [isBoardLoaded, setIsBoardLoaded] = useState(false);
    const [didAutoOpenColumnModal, setDidAutoOpenColumnModal] = useState(false);
    const [trashOpen, setTrashOpen] = useState(false);
    const [filters, setFilters] = useState<BoardFiltersValue>({
        q: "",
        assignee: "",
        tags: "",
        priority: "all",
        due: "all",
    });

    
    // EFFECTS
        useEffect(() => {
        loadBoard(projectId)
            .finally(() => setIsBoardLoaded(true));
    }, [loadBoard, projectId]);
    useEffect(() => {
        document.body.style.cursor = activeTask ? "grabbing" : "";
        return () => {
            document.body.style.cursor = "";
        };
    }, [activeTask]);
    useEffect(() => {
        if (!isBoardLoaded) return;
        if (didAutoOpenColumnModal) return;
        if (columnOrder.length > 0) return;
        if (!projectPermissions.canManageColumns) return;
        setColumnModal({ isOpen: true, title: "", editingId: null });
        setDidAutoOpenColumnModal(true);
    }, [isBoardLoaded, didAutoOpenColumnModal, columnOrder.length, projectPermissions.canManageColumns]);

    
    // HELPERS
        const getTask = (id: string) => tasksById[id];

    const allTasksCount = Object.keys(tasksById).length;
    const visibleTasksCount = Object.values(tasksById).reduce(
        (acc, t) => acc + (taskMatchesBoardFilters(t, filters) ? 1 : 0),
        0
    );

    const handleOpenEditTask = (taskId: string) => {
        const task = getTask(taskId);
        if (!task) return;

        setTaskModal({
            isOpen: true,
            mode: "edit",
            taskId,
            text: task.text,
            columnId: task.columnId,
        });
    };

    // DND HANDLERS
        const onDragStart = (event: DragStartEvent) => {
        const task = getTask(String(event.active.id));
        setActiveTask(task ?? null);
    };

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) {
            setActiveTask(null);
            return;
        }

        const taskId = String(active.id);
        const fromColumnId = active.data?.current?.columnId;
        const toColumnId = over.data?.current?.columnId;
        let toIndex = over.data?.current?.index;

        if (!fromColumnId || !toColumnId) {
            setActiveTask(null);
            return;
        }

        if(toIndex == null) {
            const column = columnsById[toColumnId];
            toIndex = column?.taskIds.length ?? 0;
        }

        void moveTask({ taskId, fromColumnId, toColumnId, toIndex }).catch((error) => {
            console.error(error);
            toast.error(getApiErrorMessage(error, "Не удалось переместить задачу"));
        });
        setActiveTask(null);
    };

    
    // RENDER
        if (!isBoardLoaded) return <BoardSkeleton />;

    return (
        <div className={styles.boardPage}>
            <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            >
                <div className={styles.boardLayout}>
                    <BoardHeader
                        canManageColumns={projectPermissions.canManageColumns}
                        onCreateTask={() =>
                            setTaskModal({
                                isOpen: true,
                                mode: "create",
                                text: "",
                                columnId: columnOrder[0] ?? "",
                                taskId: null,
                            })
                        }
                        onCreateColumn={() => setColumnModal({ isOpen: true, title: "", editingId: null })}
                        onOpenTrash={() => setTrashOpen(true)}
                    />

                    <BoardFilters
                        value={filters}
                        onChange={setFilters}
                        onClear={() =>
                            setFilters({
                                q: "",
                                assignee: "",
                                tags: "",
                                priority: "all",
                                due: "all",
                            })
                        }
                        totalVisible={visibleTasksCount}
                        totalAll={allTasksCount}
                    />

                    {/* COLUMNS */}
                    {columnOrder.length === 0 ? (
                        <div className={styles.emptyBoard}>
                            {projectPermissions.canManageColumns ? (
                                <>
                                    <p className={styles.emptyText}>В проекте пока нет колонок.</p>
                                    <Button
                                        variant="primary"
                                        onClick={() =>
                                            setColumnModal({ isOpen: true, title: "", editingId: null })
                                        }
                                    >
                                        + Создать первую колонку
                                    </Button>
                                </>
                            ) : (
                                <p className={styles.emptyText}>
                                    Админ еще не настроил структуру проекта. Колонки появятся после настройки.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className={`${styles.columns} ${styles.columnsWithFilters}`}>
                            {columnOrder.map((columnId) => {
                                const column = columnsById[columnId];
                                if (!column) return null;

                                const tasks: Task[] = column.taskIds
                                    .map((id) => getTask(id))
                                    .filter(Boolean)
                                    .filter((t) => taskMatchesBoardFilters(t as Task, filters));

                                return (
                                    <Column
                                        key={column.id}
                                        column={{ id: column.id, title: column.title, tasks }}
                                        onOpenTaskEditor={handleOpenEditTask}
                                        onDeleteTask={setDeleteTaskId}
                                        onEditColumn={(id) =>
                                            setColumnModal({ isOpen: true, title: column.title, editingId: id })
                                        }
                                        onDeleteColumn={setDeleteColumnId}
                                        canManageColumns={projectPermissions.canManageColumns}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                <DragOverlay>{activeTask && <TaskOverlay task={activeTask} />}</DragOverlay>

                <BoardModals
                    projectId={projectId}
                    trashOpen={trashOpen}
                    onCloseTrash={() => setTrashOpen(false)}
                    onRestoredFromTrash={() => void loadBoard(projectId)}
                    deleteTaskId={deleteTaskId}
                    deleteColumnId={deleteColumnId}
                    taskModal={taskModal}
                    columnModal={columnModal}
                    canDeleteTask={projectPermissions.canDeleteTasks}
                    columnOrder={columnOrder}
                    columnsById={columnsById}
                    getTask={getTask}
                    setDeleteTaskId={setDeleteTaskId}
                    setDeleteColumnId={setDeleteColumnId}
                    setTaskModal={setTaskModal}
                    setColumnModal={setColumnModal}
                    deleteTask={deleteTask}
                    deleteColumn={deleteColumn}
                    createTask={createTask}
                    editTask={editTask}
                    createColumn={createColumn}
                    editColumn={editColumn}
                    getErrorMessage={getApiErrorMessage}
                    onError={(message) => toast.error(message)}
                />
            </DndContext>
        </div>
    );
};