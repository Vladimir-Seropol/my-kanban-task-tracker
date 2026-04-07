import { useEffect } from "react";
import { Button } from "../ui/Button/Button";
import styles from "./ColumnModal.module.css";

import type { ColumnModalProps } from "../../types/types";

export const ColumnModal = ({
  isOpen,
  mode,
  title,
  onTitleChange,
  onClose,
  onSubmit,
}: ColumnModalProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const canSubmit = title.trim().length > 0;
  const isCreate = mode === "create";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>
          {isCreate ? "Создать колонку" : "Редактировать колонку"}
        </h3>

        <label className={styles.label}>
          Название
          <input
            className={styles.input}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            autoFocus
          />
        </label>

        <div className={styles.actions}>
          <Button onClick={onClose}>Отмена</Button>

          <Button onClick={onSubmit} disabled={!canSubmit} variant="primary">
            {isCreate ? "Создать" : "Сохранить"}
          </Button>
        </div>
      </div>
    </div>
  );
};
