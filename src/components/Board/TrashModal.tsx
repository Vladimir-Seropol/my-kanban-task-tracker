import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/Button/Button";
import { ConfirmModal } from "../Column/ConfirmModal";
import {
  fetchTrashColumnsApi,
  fetchTrashTasksApi,
  purgeProjectTrashApi,
  restoreColumnFromTrashApi,
  restoreTaskFromTrashApi,
  type TrashColumnRow,
  type TrashTaskRow,
} from "../../api/api";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../utils/apiErrors";
import styles from "./TrashModal.module.css";

type TrashModalProps = {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
};

const formatDeletedAt = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

export const TrashModal = ({ projectId, isOpen, onClose, onRestored }: TrashModalProps) => {
  const [columns, setColumns] = useState<TrashColumnRow[]>([]);
  const [tasks, setTasks] = useState<TrashTaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cols, tks] = await Promise.all([
        fetchTrashColumnsApi(projectId),
        fetchTrashTasksApi(projectId),
      ]);
      setColumns(cols);
      setTasks(tks);
    } catch (error) {
      console.error(error);
      toast.error("Не удалось загрузить корзину");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!isOpen) return;
    void load();
  }, [isOpen, load]);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (purgeOpen) setPurgeOpen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose, purgeOpen]);

  useEffect(() => {
    if (!isOpen) setPurgeOpen(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRestoreColumn = async (columnId: string) => {
    setBusyId(`col:${columnId}`);
    try {
      await restoreColumnFromTrashApi(columnId);
      toast.success("Колонка восстановлена");
      onRestored();
      await load();
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Не удалось восстановить колонку"));
    } finally {
      setBusyId(null);
    }
  };

  const handleRestoreTask = async (taskId: string) => {
    setBusyId(`task:${taskId}`);
    try {
      await restoreTaskFromTrashApi(taskId);
      toast.success("Задача восстановлена");
      onRestored();
      await load();
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Не удалось восстановить задачу"));
    } finally {
      setBusyId(null);
    }
  };

  const empty = !loading && columns.length === 0 && tasks.length === 0;
  const hasTrash = columns.length > 0 || tasks.length > 0;

  const handlePurgeConfirm = async () => {
    setBusyId("purge");
    try {
      await purgeProjectTrashApi(projectId);
      toast.success("Корзина очищена");
      setPurgeOpen(false);
      onRestored();
      await load();
    } catch (error) {
      console.error(error);
      const msg = (error as { message?: string } | null)?.message ?? "";
      if (msg.includes("FORBIDDEN")) {
        toast.error(getApiErrorMessage(error, "Недостаточно прав для этого действия"));
      } else if (
        msg.includes("Could not find the function") ||
        (error as { code?: string })?.code === "PGRST202"
      ) {
        toast.error("Выполните в Supabase SQL: supabase-migration-purge-trash.sql");
      } else {
        toast.error(getApiErrorMessage(error, "Не удалось очистить корзину"));
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {purgeOpen ? (
        <div className={styles.purgeLayer}>
          <ConfirmModal
            isOpen
            title="Очистить корзину?"
            description="Все элементы в корзине будут безвозвратно удалены из базы. Это действие нельзя отменить."
            confirmLabel="Очистить"
            variant="danger"
            onClose={() => setPurgeOpen(false)}
            onConfirm={() => void handlePurgeConfirm()}
          />
        </div>
      ) : null}
      <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <h2 className={styles.title}>Корзина</h2>
          <div className={styles.headActions}>
            {hasTrash && !loading && (
              <Button
                variant="danger"
                disabled={busyId !== null}
                onClick={() => setPurgeOpen(true)}
              >
                Очистить корзину
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        </div>
        <p className={styles.hint}>
          Сейчас записи только помечаются удалёнными; они остаются в базе, пока вы не восстановите их или не очистите
          корзину. Восстановление и очистка — только администратору проекта.
        </p>

        {loading ? (
          <p className={styles.muted}>Загрузка…</p>
        ) : empty ? (
          <p className={styles.muted}>Корзина пуста</p>
        ) : (
          <div className={styles.sections}>
            {columns.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Колонки</h3>
                <ul className={styles.list}>
                  {columns.map((c) => (
                    <li key={c.id} className={styles.row}>
                      <div className={styles.rowMain}>
                        <span className={styles.rowTitle}>{c.title}</span>
                        <span className={styles.rowMeta}>{formatDeletedAt(c.deleted_at)}</span>
                      </div>
                      <Button
                        variant="primary"
                        disabled={busyId !== null}
                        onClick={() => void handleRestoreColumn(c.id)}
                      >
                        {busyId === `col:${c.id}` ? "…" : "Восстановить"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {tasks.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Задачи</h3>
                <ul className={styles.list}>
                  {tasks.map((t) => (
                    <li key={t.id} className={styles.row}>
                      <div className={styles.rowMain}>
                        <span className={styles.rowTitle}>{t.text}</span>
                        <span className={styles.rowMeta}>
                          {t.column_title} · {formatDeletedAt(t.deleted_at)}
                        </span>
                      </div>
                      <Button
                        variant="primary"
                        disabled={busyId !== null}
                        onClick={() => void handleRestoreTask(t.id)}
                      >
                        {busyId === `task:${t.id}` ? "…" : "Восстановить"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
      </div>
    </>
  );
};
