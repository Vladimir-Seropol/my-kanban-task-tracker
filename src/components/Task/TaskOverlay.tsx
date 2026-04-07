import type { Task } from "../../types/types";
import styles from "./TaskOverlay.module.css";

type TaskOverlayProps = {
  task?: Task;
};

export const TaskOverlay = ({ task }: TaskOverlayProps) => {
  if (!task) return null;

  const borderColor =
    task.priority === "высокий"
      ? "#ff4d4f"
      : task.priority === "средний"
      ? "#faad14"
      : "#52c41a";

  return (
    <div className={styles.overlay} style={{ borderLeft: `4px solid ${borderColor}` }}>
      {/* HEADER */}
      <div className={styles.header}></div>
      <div className={styles.title}>{task.text}</div>

      {/* DETAILS */}
      <div className={styles.textSmall}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>Исполнитель: {task.assignee || "-"}</div>
          <div>Источник: {task.source || "-"}</div>
        </div>

        <div className={styles.description}>Описание: {task.description || "-"}</div>
        <div>Epic: {task.epic || "-"}</div>
        <div>Начало: {task.createdAt || "-"}</div>
      </div>

      {/* TAGS */}
      {task.tags && task.tags.length > 0 && (
        <div className={styles.tags}>
          {task.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};