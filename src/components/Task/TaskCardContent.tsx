import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import taskStyles from "./Task.module.css";
import type { Task } from "../../types/types";
import { TASK_DESCRIPTION_PREVIEW_CLOSE_EVENT } from "./taskDescriptionPreviewEvents";

const priorityColors = {
  низкий: "#4caf50",
  средний: "#ff9800",
  высокий: "#f44336",
};

type PreviewBox = {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
  placement: "below" | "above";
};

type TaskCardContentProps = {
  task: Task;
  className?: string;
  onClick?: () => void;
  dragHandle?: ReactNode;
  /** When true, description hover preview is disabled (e.g. while dragging). */
  isDragging?: boolean;
};

type DeadlineState = "overdue" | "today" | "upcoming" | "none";

const SHOW_DELAY_MS = 220;
const HIDE_DELAY_MS = 100;

export const TaskCardContent = ({
  task,
  className,
  onClick,
  dragHandle,
  isDragging = false,
}: TaskCardContentProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [preview, setPreview] = useState<PreviewBox | null>(null);

  const descriptionText = task.description?.trim() ?? "";

  const clearTimers = useCallback(() => {
    if (showTimerRef.current !== undefined) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = undefined;
    }
    if (hideTimerRef.current !== undefined) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = undefined;
    }
  }, []);

  const hidePreview = useCallback(() => {
    clearTimers();
    setPreview(null);
  }, [clearTimers]);

  const scheduleHide = useCallback(() => {
    clearTimers();
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = undefined;
      setPreview(null);
    }, HIDE_DELAY_MS);
  }, [clearTimers]);

  const openPreview = useCallback(() => {
    if (!descriptionText || isDragging) return;
    const el = cardRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const margin = 8;
    const maxPreviewH = 220;
    const vwPad = 12;
    const panelWidth = Math.min(
      320,
      Math.max(200, r.width),
      window.innerWidth - vwPad * 2
    );
    let left = r.left + (r.width - panelWidth) / 2;
    left = Math.max(vwPad, Math.min(left, window.innerWidth - panelWidth - vwPad));

    const belowSpace = window.innerHeight - r.bottom - margin;
    const aboveSpace = r.top - margin;
    const preferBelow = belowSpace >= 72 || belowSpace >= aboveSpace;

    let placement: PreviewBox["placement"];
    let top: number | undefined;
    let bottom: number | undefined;
    let maxHeight: number;

    if (preferBelow) {
      placement = "below";
      top = r.bottom + margin;
      bottom = undefined;
      maxHeight = Math.min(maxPreviewH, Math.max(48, belowSpace - vwPad));
    } else {
      placement = "above";
      top = undefined;
      bottom = window.innerHeight - r.top + margin;
      maxHeight = Math.min(maxPreviewH, Math.max(48, aboveSpace - vwPad));
    }

    setPreview({ left, top, bottom, width: panelWidth, maxHeight, placement });
  }, [descriptionText, isDragging]);

  const scheduleShow = useCallback(() => {
    if (!descriptionText || isDragging) return;
    clearTimers();
    showTimerRef.current = setTimeout(() => {
      showTimerRef.current = undefined;
      openPreview();
    }, SHOW_DELAY_MS);
  }, [clearTimers, descriptionText, isDragging, openPreview]);

  const onCardMouseEnter = useCallback(() => {
    if (hideTimerRef.current !== undefined) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = undefined;
    }
    scheduleShow();
  }, [scheduleShow]);

  const onCardMouseLeave = useCallback(() => {
    if (showTimerRef.current !== undefined) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = undefined;
    }
    scheduleHide();
  }, [scheduleHide]);

  const onPreviewMouseEnter = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  const onPreviewMouseLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    if (isDragging) hidePreview();
  }, [isDragging, hidePreview]);

  useEffect(() => {
    if (!preview) return;

    const onClose = () => hidePreview();
    window.addEventListener(TASK_DESCRIPTION_PREVIEW_CLOSE_EVENT, onClose);
    window.addEventListener("wheel", onClose, { passive: true });
    window.addEventListener("resize", onClose);

    return () => {
      window.removeEventListener(TASK_DESCRIPTION_PREVIEW_CLOSE_EVENT, onClose);
      window.removeEventListener("wheel", onClose);
      window.removeEventListener("resize", onClose);
    };
  }, [preview, hidePreview]);

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

  const previewNode =
    preview &&
    descriptionText &&
    createPortal(
      <div
        className={clsx(
          taskStyles.descriptionHoverCard,
          preview.placement === "above" && taskStyles.descriptionHoverCardAbove
        )}
        style={{
          left: preview.left,
          top: preview.top,
          bottom: preview.bottom,
          width: preview.width,
          maxHeight: preview.maxHeight,
        }}
        role="tooltip"
        onMouseEnter={onPreviewMouseEnter}
        onMouseLeave={onPreviewMouseLeave}
        onWheel={(e) => e.stopPropagation()}
      >
        {descriptionText}
      </div>,
      document.body
    );

  return (
    <>
      <div
        ref={cardRef}
        className={clsx(taskStyles.task, className)}
        onClick={onClick}
        onMouseEnter={descriptionText ? onCardMouseEnter : undefined}
        onMouseLeave={descriptionText ? onCardMouseLeave : undefined}
      >
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
            <span className={clsx(taskStyles.dueShort, deadlineClassName)}>
              {formatDueShort(task.dueDate)}
            </span>
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
      {previewNode}
    </>
  );
};
