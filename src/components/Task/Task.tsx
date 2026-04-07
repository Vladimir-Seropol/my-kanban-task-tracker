import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import styles from "./Task.module.css";

import type { TaskProps } from "../../types/types";

const priorityColors = {
    низкий: "#4caf50",
    средний: "#ff9800",
    высокий: "#f44336",
};

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

    const formatDate = (date?: string) => {
        if (!date) return "—";
        return new Date(date).toLocaleDateString();
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={styles.task}
            onClick={() => onOpenEditor(task.id)} // 👈 КЛИК ОТКРЫВАЕТ МОДАЛКУ
        >
            {/* Drag handle */}
            <div {...attributes} {...listeners} className={styles.dragHandle}>
                
            </div>

            {/* TEXT */}
            <div className={styles.title}>{task.text}</div>

            {/* PRIORITY */}
            <div className={styles.meta}>
                <span
                    className={styles.priority}
                    style={{ backgroundColor: priorityColors[task.priority] }}
                >
                    {task.priority}
                </span>
                <span>{formatDate(task.createdAt)}</span>
            </div>

            {/* USERS */}
            <div className={styles.meta}>
                <span>👤 {task.assignee}</span>
                <span>👤 {task.reporter}</span>
            </div>

            {/* EXTRA */}
            <div className={styles.meta}>
                <span>{task.epic}</span>
                <span>{task.source}</span>
            </div>

            {/* TAGS */}
            <div className={styles.tags}>
                {task.tags?.map((tag) => (
                    <span key={tag} className={styles.tag}>
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
};

export const Task = React.memo(TaskComponent);