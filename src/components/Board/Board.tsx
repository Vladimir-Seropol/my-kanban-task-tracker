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
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import { Column } from "../Column/Column";
import { TaskOverlay } from "../../components/Task/TaskOverlay";
import { TaskModal } from "../../components/Task/TaskModal";
import { ColumnModal } from "../Column/ColumnModal";
import { ConfirmModal } from "../Column/ConfirmModal";
import { BoardSkeleton } from "../ui/BoardSkeleton";
import { Button } from "../ui/Button/Button";
import styles from "./Board.module.css";

import type { Task, TaskApi } from "../../types/types";
import { useBoardStore } from "../../store/boardStore";

export const Board = () => {
    
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
        exportBoard,
        importBoard,
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
    const importInputRef = useRef<HTMLInputElement | null>(null);

    
    // EFFECTS
        useEffect(() => {
        loadBoard()
            .finally(() => setIsBoardLoaded(true));
    }, [loadBoard]);
    useEffect(() => {
        document.body.style.cursor = activeTask ? "grabbing" : "";
        return () => {
            document.body.style.cursor = "";
        };
    }, [activeTask]);

    
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

        moveTask({ taskId, fromColumnId, toColumnId, toIndex });
        setActiveTask(null);
    };

    const handleExportBoard = async () => {
        try {
            const payload = await exportBoard();
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `kanban-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            window.alert("Не удалось выполнить экспорт. Проверьте подключение к Supabase.");
        }
    };

    const handleImportBoardClick = () => {
        importInputRef.current?.click();
    };

    const handleImportBoardFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = JSON.parse(text) as {
                columns?: Array<{ id: string; title: string; position: number }>;
                tasks?: TaskApi[];
            };

            if (!parsed.columns || !Array.isArray(parsed.columns) || !parsed.tasks || !Array.isArray(parsed.tasks)) {
                window.alert("Неверный формат JSON. Ожидаются поля columns[] и tasks[].");
                return;
            }

            await importBoard({
                columns: parsed.columns,
                tasks: parsed.tasks,
            });

            window.alert("Импорт завершен.");
        } catch (error) {
            console.error(error);
            window.alert("Не удалось импортировать JSON. Проверьте формат файла.");
        } finally {
            event.target.value = "";
        }
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

                <Button
                    variant="primary"
                    onClick={() => setColumnModal({ isOpen: true, title: "", editingId: null })}
                >
                    + Добавить колонку
                </Button>

                <Button variant="secondary" onClick={handleExportBoard}>
                    Экспорт JSON
                </Button>

                <Button variant="secondary" onClick={handleImportBoardClick}>
                    Импорт JSON
                </Button>

                <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json"
                    style={{ display: "none" }}
                    onChange={handleImportBoardFile}
                />
            </div>

            {/* COLUMNS */}
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
                        />
                    );
                })}
            </div>

            {/* DRAG OVERLAY */}
            <DragOverlay>{activeTask && <TaskOverlay task={activeTask} />}</DragOverlay>

            {/* DELETE TASK */}
            <ConfirmModal
                isOpen={!!deleteTaskId}
                title="Удалить задачу?"
                description={deleteTaskId ? `Удалить задачу "${getTask(deleteTaskId)?.text}"` : ""}
                onClose={() => setDeleteTaskId(null)}
                onConfirm={() => {
                    if (deleteTaskId) deleteTask(deleteTaskId);
                    setDeleteTaskId(null);
                }}
            />

            {/* DELETE COLUMN */}
            <ConfirmModal
                isOpen={!!deleteColumnId}
                title="Удалить колонку?"
                description="Удалить колонку со всеми задачами?"
                onClose={() => setDeleteColumnId(null)}
                onConfirm={() => {
                    if (deleteColumnId) deleteColumn(deleteColumnId);
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
                onSubmit={() => {
                    if (columnModal.editingId) editColumn(columnModal.editingId, { title: columnModal.title });
                    else createColumn({ id: crypto.randomUUID(), title: columnModal.title, taskIds: [] });
                    setColumnModal({ isOpen: false, title: "", editingId: null });
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
                onSubmit={async (task) => {
                    try {
                        if (taskModal.taskId) await editTask(task.id, { ...task });
                        else await createTask(task);
                        setTaskModal({ isOpen: false, mode: "create", text: "", columnId: columnOrder[0] ?? "", taskId: null });
                    } catch (error) {
                        console.error(error);
                        window.alert("Не удалось сохранить задачу. Проверьте, что в Supabase добавлены колонки для аватаров (migration add avatars).");
                    }
                }}
            />
        </DndContext>
    );
};