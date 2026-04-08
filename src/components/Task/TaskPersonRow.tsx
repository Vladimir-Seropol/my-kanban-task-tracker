import styles from "./TaskPersonRow.module.css";

type TaskPersonRowProps = {
  role: string;
  name: string;
};

export const TaskPersonRow = ({ role, name }: TaskPersonRowProps) => (
  <div className={styles.row}>
    <span className={styles.role}>{role}</span>
    <span className={styles.name}>{name || "—"}</span>
  </div>
);
