import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, RefObject } from "react";
import { supabase } from "../../lib/supabase";
import type { ProjectApi, ProjectMember, ProjectRole } from "../../types/types";
import styles from "./AppSidebar.module.css";
import { InputModal } from "../ui/InputModal/InputModal";
import { ConfirmModal } from "../Column/ConfirmModal";
import { toast } from "sonner";

type AppSidebarProps = {
  sidebarOpen: boolean;
  userId: string;
  userEmail?: string;
  userName?: string;
  userAvatarUrl?: string;
  projects: ProjectApi[];
  selectedProjectId: string | null;
  projectRole: ProjectRole;
  canManageProjects: boolean;
  canManageColumns: boolean;
  projectsLoading: boolean;
  membersLoading: boolean;
  members: ProjectMember[];
  importInputRef: RefObject<HTMLInputElement>;
  onToggleSidebar: () => void;
  onCreateProject: () => void;
  onRenameProject: (projectId: string, name: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onSelectProject: (projectId: string) => void;
  onExportProject: () => void;
  onImportProjectClick: () => void;
  onImportProjectFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onAddMemberByEmail: (email: string, role: ProjectRole) => Promise<void>;
  onUpdateMemberRole: (userId: string, role: ProjectRole) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
};

export const AppSidebar = ({
  sidebarOpen,
  userId,
  userEmail,
  userName,
  userAvatarUrl,
  projects,
  selectedProjectId,
  projectRole,
  canManageProjects,
  canManageColumns,
  projectsLoading,
  membersLoading,
  members,
  importInputRef,
  onToggleSidebar,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onSelectProject,
  onExportProject,
  onImportProjectClick,
  onImportProjectFile,
  onAddMemberByEmail,
  onUpdateMemberRole,
  onRemoveMember,
}: AppSidebarProps) => {
  const [currentName, setCurrentName] = useState(userName ?? "");
  const [currentAvatar, setCurrentAvatar] = useState(userAvatarUrl ?? "");
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [projectRenameModalOpen, setProjectRenameModalOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const handleToggleSidebar = onToggleSidebar;
  const displayName = currentName.trim() || userEmail || "Пользователь";

  useEffect(() => {
    if (userName !== undefined) setCurrentName(userName);
  }, [userName]);

  useEffect(() => {
    setCurrentAvatar(userAvatarUrl ?? "");
    setAvatarLoadError(false);
  }, [userAvatarUrl]);
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null;

  const handleEditName = async (nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) return;

    const { error } = await supabase.auth.updateUser({
      data: { full_name: trimmed, avatar_url: currentAvatar || undefined },
    });
    if (error) {
      toast.error("Не удалось обновить имя профиля");
      return;
    }
    setCurrentName(trimmed);
    setNameModalOpen(false);
    toast.success("Имя обновлено");
  };

  const handlePickAvatar = () => {
    profileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "jpg" : "jpg";
    const path = `${userId}/profile-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: true });

    if (uploadError) {
      toast.error("Не удалось загрузить фото профиля");
      event.target.value = "";
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const nextAvatar = data.publicUrl;

    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: currentName || undefined, avatar_url: nextAvatar },
    });

    if (updateError) {
      toast.error("Фото загружено, но профиль не обновлен");
      event.target.value = "";
      return;
    }

    setCurrentAvatar(nextAvatar);
    setAvatarLoadError(false);
    toast.success("Фото профиля обновлено");
    event.target.value = "";
  };

  const handleRenameProject = async (nextName: string) => {
    if (!selectedProjectId) return;
    const trimmed = nextName.trim();
    if (!trimmed) return;
    await onRenameProject(selectedProjectId, trimmed);
    setProjectRenameModalOpen(false);
  };

  const handleDeleteSelectedProject = async () => {
    if (!deleteProjectId) return;
    await onDeleteProject(deleteProjectId);
    setDeleteProjectId(null);
  };

  return (
    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
       <div className={styles.toggleRow}>
        <button
          className={`${styles.toggle} ${sidebarOpen ? "" : styles.toggleClosed}`}
          type="button"
          onClick={handleToggleSidebar}
          aria-label={sidebarOpen ? "Скрыть меню" : "Показать меню"}
        >
          <img src="/icon_board.svg" alt="" />
        </button>
      </div>

      <div className={styles.top}>
        <div className={styles.userBlock}>
          <button className={styles.avatarButton} type="button" onClick={handlePickAvatar} title="Сменить фото">
            {currentAvatar && !avatarLoadError ? (
              <img
                className={styles.avatarImage}
                src={currentAvatar}
                alt=""
                width={50}
                height={50}
                decoding="async"
                onError={() => setAvatarLoadError(true)}
              />
            ) : (
              <div className={styles.userAvatar}>{(displayName[0] ?? "U").toUpperCase()}</div>
            )}
          </button>
          <div className={styles.userMeta} role="button" tabIndex={0} onClick={() => setNameModalOpen(true)}>
            <div className={styles.userName}>{displayName}</div>
          </div>
          <input
            ref={profileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(event) => {
              void handleAvatarFileChange(event);
            }}
          />
        </div>
       
      </div>

      <div className={styles.center}>
        <div className={styles.roleBadge}>
          Роль: {projectRole === "admin" ? "Админ" : "Участник"}
        </div>
        <div className={styles.projectsHeader}>
          <span>Проекты</span>
          <div className={styles.projectActions}>
            <button
              className={styles.smallBtn}
              type="button"
              onClick={onCreateProject}
              disabled={!canManageProjects && projects.length > 0}
            >
              + Проект
            </button>
            <button
              className={styles.smallBtn}
              type="button"
              onClick={() => setProjectRenameModalOpen(true)}
              disabled={!selectedProjectId || !canManageProjects}
            >
              ✎
            </button>
            <button
              className={`${styles.smallBtn} ${styles.smallDanger}`}
              type="button"
              onClick={() => setDeleteProjectId(selectedProjectId)}
              disabled={!selectedProjectId || !canManageProjects}
            >
              🗑
            </button>
          </div>
        </div>

        <div className={styles.projectsList}>
          {projectsLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.skeletonRow} />
              ))}
            </>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`${styles.projectItem} ${selectedProjectId === project.id ? styles.projectItemActive : ""}`}
                onClick={() => onSelectProject(project.id)}
              >
                {project.name}
              </button>
            ))
          )}
        </div>
        <div className={styles.membersBlock}>
          <div className={styles.membersHeader}>
            <span>Участники</span>
            {canManageProjects && (
              <button
                className={styles.smallBtn}
                type="button"
                disabled={!selectedProjectId}
                onClick={() => setMemberModalOpen(true)}
              >
                + Участник
              </button>
            )}
          </div>
          <div className={styles.membersList}>
            {membersLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={styles.skeletonRow} />
                ))}
              </>
            ) : (
              members
                .filter((member) => member.projectId === selectedProjectId)
                .map((member) => (
                  <div key={member.userId} className={styles.memberItem}>
                    <div className={styles.memberMain}>
                      <span className={styles.memberId}>{member.userId}</span>
                      <span className={styles.memberRole}>{member.role}</span>
                    </div>
                    {canManageProjects && (
                      <div className={styles.memberActions}>
                        <button
                          className={styles.smallBtn}
                          type="button"
                          onClick={() => {
                            void onUpdateMemberRole(
                              member.userId,
                              member.role === "admin" ? "member" : "admin"
                            );
                          }}
                        >
                          {member.role === "admin" ? "В member" : "В admin"}
                        </button>
                        <button
                          className={`${styles.smallBtn} ${styles.smallDanger}`}
                          type="button"
                          onClick={() => {
                            void onRemoveMember(member.userId);
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
      <button className={`${styles.sidebarBtn} ${styles.danger}`} type="button" onClick={() => supabase.auth.signOut()}>
          Выйти из аккаунта
        </button>
        <button className={styles.sidebarBtn} type="button" onClick={onExportProject} disabled={!selectedProjectId}>
          Экспорт JSON
        </button>
        <button
          className={styles.sidebarBtn}
          type="button"
          onClick={onImportProjectClick}
          disabled={!selectedProjectId || !canManageColumns}
          title={!canManageColumns ? "Импорт доступен только администратору проекта" : undefined}
        >
          Импорт JSON
        </button>

        <input
          className={styles.hiddenFileInput}
          ref={importInputRef}
          type="file"
          accept="application/json"
          onChange={(event) => {
            void onImportProjectFile(event);
          }}
        />
      </div>
      <InputModal
        isOpen={nameModalOpen}
        title="Изменить имя"
        label="Введите новое имя"
        initialValue={currentName}
        onClose={() => setNameModalOpen(false)}
        onConfirm={handleEditName}
      />
      <InputModal
        isOpen={projectRenameModalOpen}
        title="Переименовать проект"
        label="Введите новое название проекта"
        initialValue={selectedProject?.name ?? ""}
        onClose={() => setProjectRenameModalOpen(false)}
        onConfirm={handleRenameProject}
      />
      <InputModal
        isOpen={memberModalOpen}
        title="Добавить участника"
        label="Введите email участника"
        onClose={() => setMemberModalOpen(false)}
        onConfirm={async (value) => {
          const email = value.trim().toLowerCase();
          if (!email) return;
          await onAddMemberByEmail(email, "member");
          setMemberModalOpen(false);
        }}
        confirmText="Добавить"
      />
      <ConfirmModal
        isOpen={Boolean(deleteProjectId)}
        title="Удалить проект?"
        description={`Проект "${selectedProject?.name ?? ""}" будет удален вместе со всеми задачами и колонками.`}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onClose={() => setDeleteProjectId(null)}
        onConfirm={() => {
          void handleDeleteSelectedProject();
        }}
        variant="danger"
      />
    </aside>
  );
};
