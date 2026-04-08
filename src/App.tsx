import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Board } from "./components/Board/Board";
import { AuthPage } from "./components/Auth/AuthPage";
import { supabase } from "./lib/supabase";
import { AppSidebar } from "./components/Sidebar/AppSidebar";
import { InputModal } from "./components/ui/InputModal/InputModal";
import type { Session } from "@supabase/supabase-js";
import type { ProjectRole, TaskApi } from "./types/types";
import { useBoardStore } from "./store/boardStore";
import { Toaster, toast } from "sonner";
import "./App.css";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectNameModalOpen, setProjectNameModalOpen] = useState(false);
  const [projectsLoadError, setProjectsLoadError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const {
    projects,
    selectedProjectId,
    projectRole,
    projectPermissions,
    projectMembers,
    loadProjects,
    selectProject,
    createProject,
    editProject,
    deleteProject,
    addProjectMemberByEmail,
    updateProjectMemberRole,
    removeProjectMember,
    exportBoard,
    importBoard,
  } = useBoardStore();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setAuthLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    loadProjects()
      .then(() => setProjectsLoadError(null))
      .catch((error) => {
        console.error(error);
        setProjectsLoadError("Не удалось загрузить проекты");
        toast.error("Не удалось загрузить проекты");
      });
  }, [session, loadProjects]);

  useEffect(() => {
    if (selectedProjectId || projects.length === 0) return;
    selectProject(projects[0].id);
  }, [projects, selectedProjectId, selectProject]);

  if (authLoading) {
    return <div className="app-loading">Загрузка...</div>;
  }

  if (!session) {
    return <AuthPage onAuthSuccess={() => undefined} />;
  }

  const handleCreateProject = () => {
    setProjectNameModalOpen(true);
  };

  const handleCreateProjectSubmit = async (nextName: string) => {
    try {
      await createProject(nextName);
      setProjectNameModalOpen(false);
      toast.success("Проект создан");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось создать проект");
    }
  };

  const handleRenameProjectSubmit = async (projectId: string, nextName: string) => {
    try {
      await editProject(projectId, nextName);
      toast.success("Проект переименован");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось переименовать проект");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      toast.success("Проект удален");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось удалить проект");
    }
  };

  const handleRetryLoadProjects = async () => {
    try {
      await loadProjects();
      setProjectsLoadError(null);
      toast.success("Проекты загружены");
    } catch (error) {
      console.error(error);
      setProjectsLoadError("Не удалось загрузить проекты");
      toast.error("Повторная загрузка не удалась");
    }
  };

  const handleExportProject = async () => {
    if (!selectedProjectId) return;
    try {
      const payload = await exportBoard();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kanban-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error("Не удалось выполнить экспорт");
    }
  };

  const handleImportProjectClick = () => {
    importInputRef.current?.click();
  };

  const handleImportProjectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        projectId?: string;
        columns?: Array<{ id: string; title: string; position: number }>;
        tasks?: TaskApi[];
      };

      if (!parsed.columns || !Array.isArray(parsed.columns) || !parsed.tasks || !Array.isArray(parsed.tasks)) {
        toast.error("Неверный формат JSON. Ожидаются поля columns[] и tasks[]");
        return;
      }

      await importBoard({
        projectId: selectedProjectId ?? "",
        columns: parsed.columns,
        tasks: parsed.tasks,
      });

      toast.success("Импорт завершен");
    } catch (error) {
      console.error(error);
      toast.error("Не удалось импортировать JSON");
    } finally {
      event.target.value = "";
    }
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    const message =
      (error as { message?: string } | null)?.message ??
      (error as { error_description?: string } | null)?.error_description;
    if (message === "FORBIDDEN") return "Недостаточно прав";
    return fallback;
  };

  const handleAddProjectMemberByEmail = async (email: string, role: ProjectRole) => {
    if (!selectedProjectId) return;
    try {
      await addProjectMemberByEmail(selectedProjectId, email, role);
      toast.success("Участник добавлен по email");
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, "Пользователь с таким email не найден"));
    }
  };

  const handleUpdateProjectMemberRole = async (userId: string, role: ProjectRole) => {
    if (!selectedProjectId) return;
    try {
      await updateProjectMemberRole(selectedProjectId, userId, role);
      toast.success("Роль участника обновлена");
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, "Не удалось обновить роль"));
    }
  };

  const handleRemoveProjectMember = async (userId: string) => {
    if (!selectedProjectId) return;
    try {
      await removeProjectMember(selectedProjectId, userId);
      toast.success("Участник удален");
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, "Не удалось удалить участника"));
    }
  };

  return (
    <div className={`app-shell ${sidebarOpen ? "app-shell--sidebar-open" : ""}`}>
      <Toaster richColors position="top-right" />
      <AppSidebar
        sidebarOpen={sidebarOpen}
        userId={session.user.id}
        userEmail={session.user.email}
        userName={session.user.user_metadata?.full_name as string | undefined}
        userAvatarUrl={session.user.user_metadata?.avatar_url as string | undefined}
        projects={projects}
        selectedProjectId={selectedProjectId}
        projectRole={projectRole}
        canManageProjects={projectPermissions.canManageProjects}
        members={projectMembers}
        importInputRef={importInputRef}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onCreateProject={handleCreateProject}
        onRenameProject={handleRenameProjectSubmit}
        onDeleteProject={handleDeleteProject}
        onSelectProject={selectProject}
        onExportProject={handleExportProject}
        onImportProjectClick={handleImportProjectClick}
        onImportProjectFile={handleImportProjectFile}
        onAddMemberByEmail={handleAddProjectMemberByEmail}
        onUpdateMemberRole={handleUpdateProjectMemberRole}
        onRemoveMember={handleRemoveProjectMember}
      />

      <div className="app-main">
        {projectsLoadError ? (
          <div className="app-loading" style={{ flexDirection: "column", gap: 10 }}>
            <div>{projectsLoadError}</div>
            <button type="button" onClick={() => void handleRetryLoadProjects()}>
              Повторить
            </button>
          </div>
        ) : selectedProjectId ? (
          <Board key={selectedProjectId} projectId={selectedProjectId} />
        ) : projects.length === 0 ? (
          <div className="app-empty-board">
            <p className="app-empty-board__title">Нет проектов</p>
            <p className="app-empty-board__hint">Создайте проект через кнопку в боковой панели.</p>
          </div>
        ) : (
          <div className="app-loading">Загрузка проекта...</div>
        )}
      </div>
      <InputModal
        isOpen={projectNameModalOpen}
        title="Новый проект"
        label="Введите название проекта"
        onClose={() => setProjectNameModalOpen(false)}
        onConfirm={handleCreateProjectSubmit}
        confirmText="Создать"
      />
    </div>
  );
}
