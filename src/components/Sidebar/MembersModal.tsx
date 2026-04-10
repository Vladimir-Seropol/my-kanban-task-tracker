import { useMemo, useState } from "react";
import type { ProjectMember, ProjectRole } from "../../types/types";
import styles from "./MembersModal.module.css";

type MembersModalProps = {
  isOpen: boolean;
  currentUserId: string;
  canManageProjects: boolean;
  membersLoading: boolean;
  members: ProjectMember[];
  onClose: () => void;
  onAddMemberByEmail: (email: string, role: ProjectRole) => Promise<void>;
  onUpdateMemberRole: (userId: string, role: ProjectRole) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
};

const displayMemberName = (member: ProjectMember) => {
  const fromProfile = member.fullName?.trim();
  if (fromProfile) return fromProfile;
  const fromEmail = member.email?.trim();
  if (fromEmail) return fromEmail.split("@")[0];
  return `Участник ${member.userId.slice(0, 8)}`;
};

export const MembersModal = ({
  isOpen,
  currentUserId,
  canManageProjects,
  membersLoading,
  members,
  onClose,
  onAddMemberByEmail,
  onUpdateMemberRole,
  onRemoveMember,
}: MembersModalProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("member");
  const [isAdding, setIsAdding] = useState(false);

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
        return displayMemberName(a).localeCompare(displayMemberName(b), "ru");
      }),
    [members]
  );

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Участники проекта</h3>
          <button className={styles.closeBtn} type="button" onClick={onClose}>
            Закрыть
          </button>
        </div>

        <div className={styles.listHeader}>
          <span className={styles.muted}>Список участников</span>
          {canManageProjects && (
            <button
              className={styles.primaryBtn}
              type="button"
              onClick={() => {
                if (isAdding) {
                  setIsAdding(false);
                  setEmail("");
                  setRole("member");
                  return;
                }
                setIsAdding(true);
              }}
            >
              {isAdding ? "Отмена" : "+ Участник"}
            </button>
          )}
        </div>

        {canManageProjects && isAdding && (
          <div className={styles.addRow}>
            <input
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@domain.com"
            />
            <select
              className={styles.select}
              value={role}
              onChange={(e) => setRole(e.target.value as ProjectRole)}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button
              className={styles.primaryBtn}
              type="button"
              onClick={async () => {
                const normalized = email.trim().toLowerCase();
                if (!normalized) return;
                await onAddMemberByEmail(normalized, role);
                setEmail("");
                setRole("member");
                setIsAdding(false);
              }}
            >
              Добавить
            </button>
          </div>
        )}

        <div className={styles.list}>
          {membersLoading ? (
            <div className={styles.muted}>Загрузка участников...</div>
          ) : sortedMembers.length === 0 ? (
            <div className={styles.muted}>Список участников пуст.</div>
          ) : (
            sortedMembers.map((member) => (
              <div key={member.userId} className={styles.item}>
                <div className={styles.main}>
                  <div className={styles.name}>{displayMemberName(member)}</div>
                  <div className={styles.email}>{member.email || "email недоступен"}</div>
                </div>
                <div className={styles.actions}>
                  <span className={styles.role}>{member.role}</span>
                  {canManageProjects && (
                    <>
                      <button
                        className={styles.ghostBtn}
                        type="button"
                        onClick={() =>
                          void onUpdateMemberRole(
                            member.userId,
                            member.role === "admin" ? "member" : "admin"
                          )
                        }
                      >
                        {member.role === "admin" ? "Сделать member" : "Сделать admin"}
                      </button>
                      <button
                        className={styles.dangerBtn}
                        type="button"
                        disabled={member.userId === currentUserId}
                        title={member.userId === currentUserId ? "Нельзя удалить самого себя" : undefined}
                        onClick={() => void onRemoveMember(member.userId)}
                      >
                        Удалить
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
