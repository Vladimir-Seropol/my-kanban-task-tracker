import { UserAvatar } from "../ui/UserAvatar/UserAvatar";
import styles from "./TaskPersonRow.module.css";

type TaskPersonRowProps = {
  role: string;
  name: string;
  avatarUrl?: string;
};

export const TaskPersonRow = ({ role, name, avatarUrl }: TaskPersonRowProps) => (
  <div className={styles.row}>
    <UserAvatar src={avatarUrl} alt={name || role} />
    <span className={styles.role}>{role}</span>
    <span className={styles.name}>{name || "—"}</span>
  </div>
);
