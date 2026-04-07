import { useEffect } from "react";
import type { ConfirmModalProps } from "../../types/types";
import { Button } from "../ui/Button/Button";

export const ConfirmModal = ({
  isOpen,
  title,
  description,
  confirmLabel = "Удалить",
  cancelLabel = "Отмена",
  onConfirm,
  onClose,
  variant = "danger",
}: ConfirmModalProps) => {
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: "90vw",
          background: "white",
          borderRadius: 10,
          padding: 16,
          boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          textAlign: "left",
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <p style={{ margin: 0 }}>{description}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={onClose} variant="secondary">
            {cancelLabel}
          </Button>

          <Button
            onClick={onConfirm}
            variant={variant === "danger" ? "danger" : "primary"}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
