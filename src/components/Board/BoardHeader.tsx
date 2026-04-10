import { Button } from "../ui/Button/Button";
import styles from "./Board.module.css";

type BoardHeaderProps = {
  canManageColumns: boolean;
  onCreateTask: () => void;
  onCreateColumn: () => void;
  onOpenTrash: () => void;
};

export const BoardHeader = ({
  canManageColumns,
  onCreateTask,
  onCreateColumn,
  onOpenTrash,
}: BoardHeaderProps) => {
  return (
    <div className={styles.header}>
      <Button variant="primary" onClick={onCreateTask}>
        + Добавить задачу
      </Button>

      <h1 className={styles.title}>Доска</h1>

      {canManageColumns && (
        <>
          <Button variant="primary" onClick={onCreateColumn}>
            + Добавить колонку
          </Button>
          <Button variant="secondary" onClick={onOpenTrash}>
            Корзина
          </Button>
        </>
      )}
    </div>
  );
};
