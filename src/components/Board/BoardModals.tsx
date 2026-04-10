import { ConfirmModal } from "../Column/ConfirmModal";
import { ColumnModal } from "../Column/ColumnModal";
import { TaskModal } from "../../components/Task/TaskModal";
import { TrashModal } from "./TrashModal";
import type { Task } from "../../types/types";
import type { Column } from "../../store/boardStore";

type TaskModalState = {
  isOpen: boolean;
  mode: "create" | "edit";
  text: string;
  columnId: string;
  taskId: string | null;
};

type ColumnModalState = {
  isOpen: boolean;
  title: string;
  editingId: string | null;
};

type BoardModalsProps = {
  projectId: string;
  trashOpen: boolean;
  onCloseTrash: () => void;
  onRestoredFromTrash: () => void;
  deleteTaskId: string | null;
  deleteColumnId: string | null;
  taskModal: TaskModalState;
  columnModal: ColumnModalState;
  canDeleteTask: boolean;
  columnOrder: string[];
  columnsById: Record<string, Column>;
  getTask: (id: string) => Task | undefined;
  setDeleteTaskId: (taskId: string | null) => void;
  setDeleteColumnId: (columnId: string | null) => void;
  setTaskModal: React.Dispatch<React.SetStateAction<TaskModalState>>;
  setColumnModal: React.Dispatch<React.SetStateAction<ColumnModalState>>;
  deleteTask: (taskId: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  createTask: (task: Task) => Promise<void>;
  editTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  createColumn: (column: Column) => Promise<void>;
  editColumn: (columnId: string, updates: Partial<Column>) => Promise<void>;
  getErrorMessage: (error: unknown, fallback: string) => string;
  onError: (message: string) => void;
};

export const BoardModals = ({
  projectId,
  trashOpen,
  onCloseTrash,
  onRestoredFromTrash,
  deleteTaskId,
  deleteColumnId,
  taskModal,
  columnModal,
  canDeleteTask,
  columnOrder,
  columnsById,
  getTask,
  setDeleteTaskId,
  setDeleteColumnId,
  setTaskModal,
  setColumnModal,
  deleteTask,
  deleteColumn,
  createTask,
  editTask,
  createColumn,
  editColumn,
  getErrorMessage,
  onError,
}: BoardModalsProps) => {
  return (
    <>
      <TrashModal
        projectId={projectId}
        isOpen={trashOpen}
        onClose={onCloseTrash}
        onRestored={onRestoredFromTrash}
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
            onError(getErrorMessage(error, "Не удалось удалить задачу"));
          }
          setDeleteTaskId(null);
        }}
      />

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
            onError(getErrorMessage(error, "Не удалось удалить колонку"));
          }
          setDeleteColumnId(null);
        }}
      />

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
            onError(getErrorMessage(error, "Не удалось сохранить колонку"));
          }
        }}
      />

      <TaskModal
        isOpen={taskModal.isOpen}
        mode={taskModal.mode}
        columns={columnOrder.flatMap((id) => {
          const col = columnsById[id];
          if (!col) return [];

          const tasks = col.taskIds.map((tid) => getTask(tid)).filter(Boolean) as Task[];

          return [{ id: col.id, title: col.title, tasks }];
        })}
        text={taskModal.text}
        columnId={taskModal.columnId}
        task={taskModal.taskId ? getTask(taskModal.taskId) : undefined}
        onTextChange={(text) => setTaskModal((prev) => ({ ...prev, text }))}
        onColumnChange={(columnId) => setTaskModal((prev) => ({ ...prev, columnId }))}
        onClose={() => setTaskModal((prev) => ({ ...prev, isOpen: false }))}
        onDelete={(id) => setDeleteTaskId(id)}
        canDeleteTask={canDeleteTask}
        onSubmit={async (task) => {
          try {
            if (taskModal.taskId) await editTask(task.id, { ...task });
            else await createTask(task);
            setTaskModal({ isOpen: false, mode: "create", text: "", columnId: columnOrder[0] ?? "", taskId: null });
          } catch (error) {
            console.error(error);
            onError(getErrorMessage(error, "Не удалось сохранить задачу"));
          }
        }}
      />
    </>
  );
};
