import type { ColumnType } from "../types/types";

type MoveArgs = {
  columns: ColumnType[];
  activeId: string;
  overId: string;
};

const findColumnByIdOrTaskId = (columns: ColumnType[], id: string): ColumnType | undefined =>
  columns.find((c) => c.id === id) ?? columns.find((c) => c.tasks.some((t) => t.id === id));

export function moveTaskBetweenColumns({ columns, activeId, overId }: MoveArgs): ColumnType[] {
  const sourceCol = findColumnByIdOrTaskId(columns, activeId);
  const targetCol = findColumnByIdOrTaskId(columns, overId);
  if (!sourceCol || !targetCol) return columns;

  const sourceIndex = sourceCol.tasks.findIndex((t) => t.id === activeId);
  if (sourceIndex === -1) return columns;

  const isSameColumn = sourceCol.id === targetCol.id;

  const next: ColumnType[] = columns.map((col) => ({
    ...col,
    tasks: col.tasks.map((task) => ({ ...task })),
  }));
  
  const source = next.find((c) => c.id === sourceCol.id)!;
  const target = next.find((c) => c.id === targetCol.id)!;

  const moving = source.tasks[sourceIndex];
  source.tasks.splice(sourceIndex, 1);

  source.tasks.forEach((task, idx) => {
    task.order = idx;
  });

  const targetIndex = target.tasks.findIndex((t) => t.id === overId);

  if (isSameColumn) {
    if (overId === target.id || targetIndex === -1) {
      source.tasks.push(moving);
    } else {
      source.tasks.splice(targetIndex, 0, moving);
    }
    
    source.tasks.forEach((task, idx) => {
      task.order = idx;
      task.columnId = source.id;
    });
    
    return next;
  }

  if (targetIndex === -1) {
    target.tasks.push(moving);
  } else {
    target.tasks.splice(targetIndex, 0, moving);
  }

  source.tasks.forEach((task, idx) => {
    task.order = idx;
    task.columnId = source.id;
  });

  target.tasks.forEach((task, idx) => {
    task.order = idx;
    task.columnId = target.id;
  });

  return next;
}