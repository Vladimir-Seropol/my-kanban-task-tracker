import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import styles from "./Task.module.css";
import { TaskCardContent } from "./TaskCardContent";

import type { TaskProps } from "../../types/types";

const TaskComponent = ({ task, index, onOpenEditor }: TaskProps) => {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: { columnId: task.columnId, index },
        animateLayoutChanges: () => false,
    });

    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <TaskCardContent
                task={task}
                isDragging={isDragging}
                onClick={() => onOpenEditor(task.id)}
                dragHandle={<div {...attributes} {...listeners} className={styles.dragHandle}></div>}
            />
        </div>
    );
};

export const Task = React.memo(TaskComponent);