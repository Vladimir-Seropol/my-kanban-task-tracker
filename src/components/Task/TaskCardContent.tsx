import type { ReactNode } from "react";
import clsx from "clsx";
import { TaskPersonRow } from "./TaskPersonRow";
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
  const formatDate = (date?: string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
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

  return (
    <div className={clsx(taskStyles.task, className)} onClick={onClick}>
      {dragHandle}

      <div className={taskStyles.title}>{task.text}</div>

      <div className={taskStyles.meta}>
        <span
          className={taskStyles.priority}
          style={{ backgroundColor: priorityColors[task.priority] }}
        >
          {task.priority}
        </span>
        <div className={taskStyles.date}>
          <span>{formatDate(task.createdAt)}</span>
          <span> - </span>
          <span className={clsx(taskStyles.deadlineDate, deadlineClassName)}>
            {formatDate(task.dueDate)}
          </span>
        </div>
      </div>

      <div className={taskStyles.users}>
        <TaskPersonRow
          role="Исп."
          name={task.assignee}
          avatarUrl={task.assigneeAvatarUrl}
        />
        {task.reporter?.trim() ? (
          <TaskPersonRow
            role="Реп."
            name={task.reporter}
            avatarUrl={task.reporterAvatarUrl}
          />
        ) : null}
      </div>

      <div className={taskStyles.shortDescription}>
        <span>Описание: </span>
        {task.description?.trim() || "—"}
      </div>

      <div className={taskStyles.tags}>
        {task.tags?.map((tag) => (
          <span key={tag} className={taskStyles.tag}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};
