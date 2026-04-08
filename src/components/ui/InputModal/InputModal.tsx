import { useRef } from "react";
import styles from "./InputModal.module.css";

type InputModalProps = {
  isOpen: boolean;
  title: string;
  label?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
};

export const InputModal = ({
  isOpen,
  title,
  label,
  initialValue = "",
  confirmText = "Сохранить",
  cancelText = "Отмена",
  onClose,
  onConfirm,
}: InputModalProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>{title}</h3>
        {label ? <label className={styles.label}>{label}</label> : null}
        <input
          ref={inputRef}
          className={styles.input}
          autoFocus
          defaultValue={initialValue}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void onConfirm(inputRef.current?.value ?? "");
            }
          }}
        />
        <div className={styles.footer}>
          <button className={styles.btn} type="button" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={`${styles.btn} ${styles.primary}`}
            type="button"
            onClick={() => {
              void onConfirm(inputRef.current?.value ?? "");
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
