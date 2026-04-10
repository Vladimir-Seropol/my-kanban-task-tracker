import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { TASK_DESCRIPTION_PREVIEW_CLOSE_EVENT } from "../Task/taskDescriptionPreviewEvents";

/* Must match .task height in Task.module.css + vertical .row padding in Column.module.css (2px + 2px) */
const ITEM_HEIGHT = 124;
const LIST_MIN_HEIGHT = 160;
const LIST_MIN_WIDTH = 200;
const LIST_BOTTOM_PADDING = 16;

const VirtualListInner = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ style, ...rest }, ref) => (
        <div
            ref={ref}
            style={{
                ...style,
                /* content-box: padding is added to react-window height so rows keep full ITEM_HEIGHT and scroll reaches the last card */
                boxSizing: "content-box",
                paddingBottom: LIST_BOTTOM_PADDING,
            }}
            {...rest}
        />
    )
);
VirtualListInner.displayName = "VirtualListInner";

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
    canManageColumns = true,
}: ColumnProps) => {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id, data: {
            columnId: column.id,
            index: column.tasks.length
        }
    });

    const itemData = useMemo(
        () => ({
            tasks: column.tasks,
            onOpenTaskEditor,
            onDeleteTask,
        }),
        [column.tasks, onOpenTaskEditor, onDeleteTask]
    );

    const hasTasks = column.tasks.length > 0;

    const listWrapRef = useRef<HTMLDivElement>(null);
    const [listSize, setListSize] = useState({ height: 400, width: 260 });

    useLayoutEffect(() => {
        const el = listWrapRef.current;
        if (!el) return;

        const apply = () => {
            const r = el.getBoundingClientRect();
            setListSize({
                height: Math.max(LIST_MIN_HEIGHT, Math.floor(r.height)),
                width: Math.max(LIST_MIN_WIDTH, Math.floor(r.width)),
            });
        };

        apply();
        const ro = new ResizeObserver(apply);
        ro.observe(el);
        return () => ro.disconnect();
    }, [hasTasks]);

    return (
        <div ref={setNodeRef} className={styles.column}>
            {/* HEADER */}
            <div className={styles.header}>
                <h3 className={styles.title}>{column.title}</h3>

                {canManageColumns && (
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
                )}
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
                        <div ref={listWrapRef} className={styles.listWrap}>
                            <List
                                height={listSize.height}
                                width={listSize.width}
                                itemCount={column.tasks.length}
                                itemSize={ITEM_HEIGHT}
                                itemData={itemData}
                                itemKey={(index) => column.tasks[index].id}
                                className={styles.list}
                                innerElementType={VirtualListInner}
                                onScroll={() => {
                                    window.dispatchEvent(
                                        new CustomEvent(TASK_DESCRIPTION_PREVIEW_CLOSE_EVENT)
                                    );
                                }}
                            >
                                {Row}
                            </List>
                        </div>
                    )}
                </SortableContext>
            )}
        </div>
    );
};
