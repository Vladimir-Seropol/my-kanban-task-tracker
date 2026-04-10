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
import { TaskOverlay } from "../../components/Task/TaskOverlay";
import { TaskModal } from "../../components/Task/TaskModal";
import { ColumnModal } from "../Column/ColumnModal";
import { ConfirmModal } from "../Column/ConfirmModal";
import { BoardSkeleton } from "../ui/BoardSkeleton";
import { Button } from "../ui/Button/Button";
import { TrashModal } from "./TrashModal";
import styles from "./Board.module.css";
import { toast } from "sonner";

import type { Task } from "../../types/types";
import { useBoardStore } from "../../store/boardStore";

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

    const getErrorMessage = (error: unknown, fallback: string) => {
        const message =
            (error as { message?: string } | null)?.message ??
            (error as { error_description?: string } | null)?.error_description;
        if (message === "FORBIDDEN") return "Недостаточно прав для этого действия";
        return fallback;
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
            toast.error(getErrorMessage(error, "Не удалось переместить задачу"));
        });
        setActiveTask(null);
    };

    
    // RENDER
        if (!isBoardLoaded) return <BoardSkeleton />;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            {/* HEADER */}
            <div className={styles.header}>
                <Button
                    variant="primary"
                    onClick={() =>
                        setTaskModal({
                            isOpen: true,
                            mode: "create",
                            text: "",
                            columnId: columnOrder[0] ?? "",
                            taskId: null
                        })
                    }
                >
                    + Добавить задачу
                </Button>

                <h1 className={styles.title}>Доска</h1>

                {projectPermissions.canManageColumns && (
                    <>
                        <Button
                            variant="primary"
                            onClick={() => setColumnModal({ isOpen: true, title: "", editingId: null })}
                        >
                            + Добавить колонку
                        </Button>
                        <Button variant="secondary" onClick={() => setTrashOpen(true)}>
                            Корзина
                        </Button>
                    </>
                )}

            </div>

            {/* COLUMNS */}
            {columnOrder.length === 0 ? (
                <div className={styles.emptyBoard}>
                    {projectPermissions.canManageColumns ? (
                        <>
                            <p className={styles.emptyText}>В проекте пока нет колонок.</p>
                            <Button
                                variant="primary"
                                onClick={() => setColumnModal({ isOpen: true, title: "", editingId: null })}
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
                <div className={styles.columns}>
                    {columnOrder.map((columnId) => {
                    const column = columnsById[columnId];
                    if (!column) return null;

                    const tasks: Task[] = column.taskIds.map((id) => getTask(id)).filter(Boolean);

                    return (
                        <Column
                            key={column.id}
                            column={{ id: column.id, title: column.title, tasks }}
                            onOpenTaskEditor={handleOpenEditTask}
                            onDeleteTask={setDeleteTaskId}
                            onEditColumn={(id) => setColumnModal({ isOpen: true, title: column.title, editingId: id })}
                            onDeleteColumn={setDeleteColumnId}
                            canManageColumns={projectPermissions.canManageColumns}
                        />
                    );
                    })}
                </div>
            )}

            {/* DRAG OVERLAY */}
            <DragOverlay>{activeTask && <TaskOverlay task={activeTask} />}</DragOverlay>

            {/* DELETE TASK */}
            <TrashModal
                projectId={projectId}
                isOpen={trashOpen}
                onClose={() => setTrashOpen(false)}
                onRestored={() => void loadBoard(projectId)}
            />

            <ConfirmModal
                isOpen={!!deleteTaskId}
                title="Удалить задачу?"
                description={
                    deleteTaskId
                        ? `Переместить в корзину задачу «${getTask(deleteTaskId)?.text}»? (можно восстановить)`
                        : ""
                }
                onClose={() => setDeleteTaskId(null)}
                onConfirm={async () => {
                    try {
                        if (deleteTaskId) await deleteTask(deleteTaskId);
                    } catch (error) {
                        console.error(error);
                        toast.error(getErrorMessage(error, "Не удалось удалить задачу"));
                    }
                    setDeleteTaskId(null);
                }}
            />

            {/* DELETE COLUMN */}
            <ConfirmModal
                isOpen={!!deleteColumnId}
                title="Удалить колонку?"
                description="Переместить колонку и её задачи в корзину? (восстановление — из корзины)"
                onClose={() => setDeleteColumnId(null)}
                onConfirm={async () => {
                    try {
                        if (deleteColumnId) await deleteColumn(deleteColumnId);
                    } catch (error) {
                        console.error(error);
                        toast.error(getErrorMessage(error, "Не удалось удалить колонку"));
                    }
                    setDeleteColumnId(null);
                }}
            />

            {/* COLUMN MODAL */}
            <ColumnModal
                isOpen={columnModal.isOpen}
                mode={columnModal.editingId ? "edit" : "create"}
                title={columnModal.title}
                onTitleChange={(title) => setColumnModal((prev) => ({ ...prev, title }))}
                onClose={() => setColumnModal({ isOpen: false, title: "", editingId: null })}
                onSubmit={async () => {
                    try {
                        if (columnModal.editingId) await editColumn(columnModal.editingId, { title: columnModal.title });
                        else await createColumn({ id: crypto.randomUUID(), title: columnModal.title, taskIds: [] });
                        setColumnModal({ isOpen: false, title: "", editingId: null });
                    } catch (error) {
                        console.error(error);
                        toast.error(getErrorMessage(error, "Не удалось сохранить колонку"));
                    }
                }}
            />

            {/* TASK MODAL */}
            <TaskModal
                isOpen={taskModal.isOpen}
                mode={taskModal.mode}
                columns={columnOrder.flatMap((id) => {
                    const col = columnsById[id];
                    if (!col) return [];

                    const tasks = col.taskIds
                        .map((tid) => getTask(tid))
                        .filter(Boolean);

                    return [{ id: col.id, title: col.title, tasks }];
                })}
                text={taskModal.text}
                columnId={taskModal.columnId}
                task={taskModal.taskId ? getTask(taskModal.taskId) : undefined}
                onTextChange={(text) => setTaskModal((prev) => ({ ...prev, text }))}
                onColumnChange={(columnId) => setTaskModal((prev) => ({ ...prev, columnId }))}
                onClose={() => setTaskModal((prev) => ({ ...prev, isOpen: false }))}
                onDelete={(id) => setDeleteTaskId(id)}
                canDeleteTask={projectPermissions.canDeleteTasks}
                onSubmit={async (task) => {
                    try {
                        if (taskModal.taskId) await editTask(task.id, { ...task });
                        else await createTask(task);
                        setTaskModal({ isOpen: false, mode: "create", text: "", columnId: columnOrder[0] ?? "", taskId: null });
                    } catch (error) {
                        console.error(error);
                        toast.error(getErrorMessage(error, "Не удалось сохранить задачу"));
                    }
                }}
            />
        </DndContext>
    );
};