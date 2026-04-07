import type { Task } from "../../types/types";
import { TaskCardContent } from "./TaskCardContent";
import taskStyles from "./Task.module.css";

type TaskOverlayProps = {
  task?: Task;
};

export const TaskOverlay = ({ task }: TaskOverlayProps) => {
  if (!task) return null;

  return (
    <TaskCardContent
      task={task}
      className={taskStyles.overlay}
      dragHandle={<div className={taskStyles.dragHandle}></div>}
    />
  );
};