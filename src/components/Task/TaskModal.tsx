import { useCallback, useEffect, useState, useMemo } from "react";
import styles from "./TaskModal.module.css";
import { Button } from "../ui/Button/Button";
import { TaskPersonRow } from "./TaskPersonRow";
import type { Task, TaskModalProps } from "../../types/types";
import { parseTagsFromCommaInput, tagsArrayToCommaInput } from "../../utils/taskTags";

const priorityColors: Record<Task["priority"], string> = {
  низкий: "#4caf50",
  средний: "#ff9800",
  высокий: "#f44336",
};

type Mode = "view" | "edit" | "create";

export const TaskModal = ({
  isOpen,
  mode,
  columns,
  task,
  onClose,
  onSubmit,
  canDeleteTask = true,
  onDelete,
}: TaskModalProps & { onDelete?: (id: string) => void }) => {
  const [isEditingViewTask, setIsEditingViewTask] = useState(false);
  const localMode: Mode =
    mode === "create" ? "create" : isEditingViewTask ? "edit" : "view";

  // =====================
  // DEFAULT TASK
  // =====================
  const defaultTask: Task = useMemo(
    () => ({
      id: task?.id || crypto.randomUUID(),
      text: task?.text || "",
      columnId: task?.columnId || columns[0]?.id || "",
      order: task?.order || 0,
      assignee: task?.assignee || "",
      reporter: task?.reporter || "",
      source: task?.source || "",
      description: task?.description || "",
      progressDone: task?.progressDone || "",
      progressCurrent: task?.progressCurrent || "",
      progressBlockers: task?.progressBlockers || "",
      createdAt:
        task?.createdAt || new Date().toISOString().split("T")[0],
      dueDate: task?.dueDate,
      priority: task?.priority || "низкий",
      epic: task?.epic || "",
      tags: task?.tags || [],
    }),
    [task, columns]
  );

  const [form, setForm] = useState<Task>(defaultTask);
  const [tagsInput, setTagsInput] = useState<string>(tagsArrayToCommaInput(defaultTask.tags));

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      setForm(defaultTask);
      setTagsInput(tagsArrayToCommaInput(defaultTask.tags));
    });
  }, [isOpen, defaultTask]);

  const handleClose = useCallback(() => {
    setIsEditingViewTask(false);
    onClose();
  }, [onClose]);

  // =====================
  // ESC / LOCK
  // =====================
  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleChange = <K extends keyof Task>(field: K, value: Task[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit = form.text.trim().length > 0 && Boolean(form.columnId);


  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString() : "—";

  // =====================
  // UI
  // =====================
  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className={styles.header}>
          <h3>
            {localMode === "create"
              ? "Создать задачу"
              : localMode === "edit"
              ? "Редактирование"
              : "Просмотр задачи"}
          </h3>

          <div className={styles.priority} style={{ background: priorityColors[form.priority] }} />
        </div>

        {/* ===================== */}
        {/* VIEW */}
        {/* ===================== */}
        {localMode === "view" && task && (
          <>
            <div className={styles.view}>
              <p><b>ID:</b> {task.id}</p>
              <p><b>Текст:</b> {task.text}</p>
              <p><b>Приоритет:</b> {task.priority}</p>
              <p><b>Участники</b></p>
              <div className={styles.viewPeople}>
                <TaskPersonRow role="Исп." name={task.assignee} />
                <TaskPersonRow role="Реп." name={task.reporter ?? ""} />
              </div>
              <p><b>Источник:</b> {task.source}</p>
              <p><b>Описание:</b> {task.description}</p>
              <p className={styles.sectionLabel}>Ход работы (исполнитель)</p>
              <p><b>Что сделано:</b> {task.progressDone?.trim() ? task.progressDone : "—"}</p>
              <p><b>Сейчас в работе:</b> {task.progressCurrent?.trim() ? task.progressCurrent : "—"}</p>
              <p><b>Проблемы и трудности:</b> {task.progressBlockers?.trim() ? task.progressBlockers : "—"}</p>
              <p><b>Создана:</b> {formatDate(task.createdAt)}</p>
              <p><b>Срок:</b> {formatDate(task.dueDate)}</p>
              <p><b>Epic:</b> {task.epic}</p>
              <p><b>Теги:</b> {task.tags?.join(", ")}</p>
            </div>

            <div className={styles.footer}>
              <Button onClick={() => setIsEditingViewTask(true)}>
                ✏️ Редактировать
              </Button>

              {canDeleteTask && (
                <Button
                  variant="danger"
                  onClick={() => {
                    if (task && onDelete) {
                      onDelete(task.id);
                      handleClose();
                    }
                  }}
                >
                  🗑 Удалить
                </Button>
              )}

              <Button variant="secondary" onClick={handleClose}>
                Закрыть
              </Button>
            </div>
          </>
        )}

        {/* ===================== */}
        {/* EDIT / CREATE */}
        {/* ===================== */}
        {localMode !== "view" && (
          <>
            {localMode === "edit" && (
              <input
                className={styles.input}
                value={form.id}
                readOnly
                disabled
                placeholder="ID"
              />
            )}

            <textarea
              className={styles.textarea}
              value={form.text}
              onChange={(e) => handleChange("text", e.target.value)}
              placeholder="Текст задачи"
            />

            <select
              className={styles.select}
              value={form.columnId}
              onChange={(e) => handleChange("columnId", e.target.value)}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            <select
              className={styles.select}
              value={form.priority}
              onChange={(e) =>
                handleChange("priority", e.target.value as Task["priority"])
              }
            >
              {Object.keys(priorityColors).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <input
              className={styles.input}
              value={form.assignee}
              onChange={(e) => handleChange("assignee", e.target.value)}
              placeholder="Исполнитель"
            />
            <input
              className={styles.input}
              value={form.reporter}
              onChange={(e) => handleChange("reporter", e.target.value)}
              placeholder="Репортер"
            />

            <input
              className={styles.input}
              value={form.source}
              onChange={(e) => handleChange("source", e.target.value)}
              placeholder="Источник"
            />

            <div className={styles.flexRow}>
              <input
                className={styles.input}
                type="date"
                value={form.createdAt}
                onChange={(e) => handleChange("createdAt", e.target.value)}
                placeholder="Дата создания"
              />
              <input
                className={styles.input}
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) => handleChange("dueDate", e.target.value || undefined)}
                placeholder="Срок"
              />
            </div>

            <input
              className={styles.input}
              value={form.epic ?? ""}
              onChange={(e) => handleChange("epic", e.target.value)}
              placeholder="Epic"
            />

            <input
              className={styles.input}
              value={tagsInput}
              onChange={(e) => {
                const raw = e.target.value;
                setTagsInput(raw);
                handleChange("tags", parseTagsFromCommaInput(raw));
              }}
              onBlur={() => setTagsInput(tagsArrayToCommaInput(parseTagsFromCommaInput(tagsInput)))}
              placeholder="Теги (через запятую)"
            />

            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Описание"
            />

            <p className={styles.sectionLabel}>Ход работы (исполнитель)</p>
            <textarea
              className={styles.textarea}
              value={form.progressDone}
              onChange={(e) => handleChange("progressDone", e.target.value)}
              placeholder="Что уже сделано"
              rows={3}
            />
            <textarea
              className={styles.textarea}
              value={form.progressCurrent}
              onChange={(e) => handleChange("progressCurrent", e.target.value)}
              placeholder="Над чем сейчас работаю"
              rows={3}
            />
            <textarea
              className={styles.textarea}
              value={form.progressBlockers}
              onChange={(e) => handleChange("progressBlockers", e.target.value)}
              placeholder="Проблемы, риски, что мешает"
              rows={3}
            />

            <div className={styles.footer}>
              {/* 👇 кнопка назад */}
              {mode !== "create" && (
                <Button
                  variant="secondary"
                  onClick={() => setIsEditingViewTask(false)}
                >
                  Назад
                </Button>
              )}

              <Button variant="secondary" onClick={handleClose}>
                Отмена
              </Button>

                <Button
                onClick={() => {
                  setIsEditingViewTask(false);
                  onSubmit({ ...form, tags: parseTagsFromCommaInput(tagsInput) });
                }}
                disabled={!canSubmit}
                variant="primary"
              >
                {localMode === "create" ? "Создать" : "Сохранить"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};