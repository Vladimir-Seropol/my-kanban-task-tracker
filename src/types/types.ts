//  API TYPES

export type TaskApi = {
  id: string;
  text: string;
  columnId: string;
  order?: number;

  assignee: string;
  reporter: string;
  source: string;
  description: string;
  epic: string;
  tags: string[];

  priority: string;
  createdAt: string;
  dueDate?: string;
};

// Унифицированный тип задачи
export type Task = {
  id: string;
  text: string;
  columnId: string;
  order: number;

  assignee: string;
  reporter?: string;
  source?: string;
  description: string;
  epic?: string;
  tags?: string[];

  priority: "низкий" | "средний" | "высокий";
  createdAt: string;
  dueDate?: string;
};

export type ColumnType = {
  id: string;
  title: string;
  tasks: Task[];
};

export type ID = string;

export type State = {
  columns: Record<ID, { id: ID; title: string }>;
  tasks: Record<ID, Task>;
  columnOrder: ID[];
  tasksByColumn: Record<ID, ID[]>;
};

//  MODAL TYPES

export type ModalMode = "create" | "edit";
export type ConfirmVariant = "danger" | "warning" | "info";

export type BaseModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export type BaseFormModalProps = BaseModalProps & {
  onSubmit: () => void;
};

export type ColumnModalProps = BaseFormModalProps & {
  mode: ModalMode;
  title: string;
  onTitleChange: (value: string) => void;
};

export type TaskModalProps = BaseModalProps & {
  mode: ModalMode;
  columns: ColumnType[];
  task?: Task;
  text: string;
  columnId: string;
  onTextChange: (value: string) => void;
  onColumnChange: (value: string) => void;
  onSubmit: (updatedTask: Task) => void;
};

export type ConfirmModalProps = BaseModalProps & {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: ConfirmVariant;
};

//  COMPONENT TYPES

export type ColumnProps = {
  column: ColumnType;
  onOpenTaskEditor: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
};

export type RowData = {
  tasks: ColumnType["tasks"];
  onOpenTaskEditor: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
};

export type TaskProps = {
  task: Task;
  index: number;
  onOpenEditor: (taskId: string) => void;
  onDelete: (taskId: string) => void;
};

//  DND TYPES

export type DragEndEvent = {
  active: { id: string };
  over: { id: string } | null;
};

export type DragStartEvent = {
  active: { id: string };
};

//  HOOKS TYPES

export type UseBoardDnDProps = {
  state: State;
  setState: React.Dispatch<React.SetStateAction<State>>;
  setActiveId: React.Dispatch<React.SetStateAction<string | null>>;
  findColumnIdByTask: (taskId: string) => string | undefined;
};

export type UseBoardActionsReturn = {
  createColumn: (title: string) => Promise<void>;
  editColumn: (columnId: string, title: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  createTask: (columnId: string, text: string) => Promise<void>;
  editTask: (taskId: string, text: string, columnId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
};