import { useMemo } from "react";
import { Button } from "../ui/Button/Button";
import styles from "./BoardFilters.module.css";
import type { DueFilter, BoardFiltersValue } from "../../utils/boardTaskFilter";

export type { DueFilter, BoardFiltersValue };

type BoardFiltersProps = {
  value: BoardFiltersValue;
  onChange: (next: BoardFiltersValue) => void;
  onClear: () => void;
  totalVisible: number;
  totalAll: number;
};

export const BoardFilters = ({ value, onChange, onClear, totalVisible, totalAll }: BoardFiltersProps) => {
  const isActive = useMemo(() => {
    return (
      value.q.trim() !== "" ||
      value.assignee.trim() !== "" ||
      value.tags.trim() !== "" ||
      value.priority !== "all" ||
      value.due !== "all"
    );
  }, [value]);

  return (
    <div className={styles.bar} aria-label="Поиск и фильтры">
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Поиск</span>
          <input
            className={styles.input}
            value={value.q}
            placeholder="Текст"
            onChange={(e) => onChange({ ...value, q: e.target.value })}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Исполнитель</span>
          <input
            className={styles.input}
            value={value.assignee}
            placeholder="Имя"
            onChange={(e) => onChange({ ...value, assignee: e.target.value })}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Теги</span>
          <input
            className={styles.input}
            value={value.tags}
            placeholder=""
            onChange={(e) => onChange({ ...value, tags: e.target.value })}
          />
        </label>

        <label className={styles.fieldSm}>
          <span className={styles.label}>Приоритет</span>
          <select
            className={styles.select}
            value={value.priority}
            onChange={(e) => onChange({ ...value, priority: e.target.value as BoardFiltersValue["priority"] })}
          >
            <option value="all">Все</option>
            <option value="низкий">Низкий</option>
            <option value="средний">Средний</option>
            <option value="высокий">Высокий</option>
          </select>
        </label>

        <label className={styles.fieldSm}>
          <span className={styles.label}>Срок</span>
          <select
            className={styles.select}
            value={value.due}
            onChange={(e) => onChange({ ...value, due: e.target.value as DueFilter })}
          >
            <option value="all">Любой</option>
            <option value="overdue">Просрочено</option>
            <option value="today">Сегодня</option>
            <option value="this_week">На этой неделе</option>
            <option value="no_due">Без срока</option>
          </select>
        </label>

        <div className={styles.actions}>
          <div className={styles.count}>
            {totalVisible} / {totalAll}
          </div>
          <Button variant="secondary" onClick={onClear} disabled={!isActive}>
            Сброс
          </Button>
        </div>
      </div>
    </div>
  );
};

