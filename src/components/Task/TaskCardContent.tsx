import type { ReactNode } from "react";
import clsx from "clsx";
import taskStyles from "./Task.module.css";
import type { Task } from "../../types/types";

const priorityColors = {
  низкий: "#4caf50",
  средний: "#ff9800",
  высокий: "#f44336",
};

type TaskCardContentProps = {
  task: Task;
  className?: string;
  onClick?: () => void;
  dragHandle?: ReactNode;
};

type DeadlineState = "overdue" | "today" | "upcoming" | "none";

export const TaskCardContent = ({
  task,
  className,
  onClick,
  dragHandle,
}: TaskCardContentProps) => {
  const formatDueShort = (date?: string) => {
    if (!date) return "";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  const getDeadlineState = (dueDate?: string): DeadlineState => {
    if (!dueDate) return "none";

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (due.getTime() < today.getTime()) return "overdue";
    if (due.getTime() === today.getTime()) return "today";
    return "upcoming";
  };

  const deadlineState = getDeadlineState(task.dueDate);
  const deadlineClassName =
    deadlineState === "overdue"
      ? taskStyles.deadlineOverdue
      : deadlineState === "today"
      ? taskStyles.deadlineToday
      : deadlineState === "upcoming"
      ? taskStyles.deadlineUpcoming
      : taskStyles.deadlineNone;

  const tags = task.tags ?? [];
  const visibleTags = tags.slice(0, 3);
  const moreTags = tags.length - visibleTags.length;

  return (
    <div className={clsx(taskStyles.task, className)} onClick={onClick}>
      {dragHandle}

      <div className={taskStyles.title}>{task.text}</div>

      <div className={taskStyles.compactMeta}>
        <span
          className={taskStyles.priorityPill}
          style={{ backgroundColor: priorityColors[task.priority] }}
        >
          {task.priority}
        </span>
        {task.dueDate ? (
          <span className={clsx(taskStyles.dueShort, deadlineClassName)}>{formatDueShort(task.dueDate)}</span>
        ) : (
          <span className={taskStyles.dueMuted}>Без срока</span>
        )}
        <span className={taskStyles.assigneeCompact} title={task.assignee || undefined}>
          {task.assignee?.trim() ? task.assignee : "—"}
        </span>
      </div>

      {visibleTags.length > 0 ? (
        <div className={taskStyles.tags}>
          {visibleTags.map((tag) => (
            <span key={tag} className={taskStyles.tag}>
              {tag}
            </span>
          ))}
          {moreTags > 0 ? <span className={taskStyles.tagMore}>+{moreTags}</span> : null}
        </div>
      ) : null}
    </div>
  );
};
