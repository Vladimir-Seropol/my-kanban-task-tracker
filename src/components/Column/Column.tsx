import React, { useRef, useLayoutEffect } from "react";
import {
    FixedSizeList as List,
    type ListChildComponentProps,
} from "react-window";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";

import { Button } from "../ui/Button/Button";
import { Task } from "../Task/Task";

import styles from "./Column.module.css";

import type { ColumnProps, RowData } from "../../types/types";

const ITEM_HEIGHT = 264;

/* ROW */

const Row = React.memo(
    ({ index, style, data }: ListChildComponentProps<RowData>) => {
        const task = data.tasks[index];
        if (!task) return null;

        return (
            <div style={style} className={styles.row}>
                <Task
                    task={task}
                    index={index}
                    onOpenEditor={data.onOpenTaskEditor}
                    onDelete={data.onDeleteTask}
                />
            </div>
        );
    },
);

Row.displayName = "Row";

/* COMPONENT */

export const Column = ({
    column,
    onOpenTaskEditor,
    onDeleteTask,
    onEditColumn,
    onDeleteColumn,
}: ColumnProps) => {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id, data: {
            columnId: column.id,
            index: column.tasks.length
        }
    });

    const listRef = useRef<List>(null);
    const scrollOffsetRef = useRef(0);

    const handleScroll = ({ scrollOffset }: { scrollOffset: number }) => {
        scrollOffsetRef.current = scrollOffset;
    };

    useLayoutEffect(() => {
        listRef.current?.scrollTo(scrollOffsetRef.current);
    });

    const hasTasks = column.tasks.length > 0;

    return (
        <div ref={setNodeRef} className={styles.column}>
            {/* HEADER */}
            <div className={styles.header}>
                <h3 className={styles.title}>{column.title}</h3>

                <div className={styles.actions}>
                    <Button size="sm" onClick={() => onEditColumn(column.id)}>
                        Редактировать
                    </Button>

                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onDeleteColumn(column.id)}
                    >
                        Удалить
                    </Button>
                </div>
            </div>

            {/* CONTENT */}
            {!hasTasks ? (
                <div className={clsx(styles.empty, isOver && styles.emptyActive)}>
                    {isOver && (
                        <span className={styles.emptyText}>Перетащите задачу сюда</span>
                    )}
                </div>
            ) : (
                <SortableContext
                    items={column.tasks.map((t) => t.id)} // пустой массив допустим
                    strategy={verticalListSortingStrategy}
                >
                    {!hasTasks ? (
                        <div className={clsx(styles.empty, isOver && styles.emptyActive)}>
                            {isOver && <span>Перетащите задачу сюда</span>}
                        </div>
                    ) : (
                        <List
                            ref={listRef}
                            height={500}
                            width={280}
                            itemCount={column.tasks.length}
                            itemSize={ITEM_HEIGHT}
                            onScroll={handleScroll}
                            itemData={{
                                tasks: column.tasks,
                                onOpenTaskEditor,
                                onDeleteTask,
                            }}
                            itemKey={(index) => column.tasks[index].id}
                            className={styles.list}
                        >
                            {Row}
                        </List>

                    )}
                </SortableContext>
            )}
        </div>
    );
};
