import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Board } from "./components/Board/Board";
import { AuthPage } from "./components/Auth/AuthPage";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";
import type { TaskApi } from "./types/types";
import { useBoardStore } from "./store/boardStore";
import "./App.css";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const {
    projects,
    selectedProjectId,
    loadProjects,
    selectProject,
    createProject,
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
    loadProjects().catch(console.error);
  }, [session, loadProjects]);

  if (authLoading) {
    return <div className="app-loading">Загрузка...</div>;
  }

  if (!session) {
    return <AuthPage onAuthSuccess={() => undefined} />;
  }

  const handleCreateProject = async () => {
    const nextName = window.prompt("Название проекта");
    if (!nextName?.trim()) return;
    await createProject(nextName);
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
      window.alert("Не удалось выполнить экспорт.");
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
        window.alert("Неверный формат JSON. Ожидаются поля columns[] и tasks[].");
        return;
      }

      await importBoard({
        projectId: selectedProjectId ?? "",
        columns: parsed.columns,
        tasks: parsed.tasks,
      });

      window.alert("Импорт завершен.");
    } catch (error) {
      console.error(error);
      window.alert("Не удалось импортировать JSON.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className={`app-shell ${sidebarOpen ? "app-shell--sidebar-open" : ""}`}>
      <aside className={`app-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="app-sidebar-top">
          <div className="app-user-block">
            <div className="app-user-avatar">{(session.user.email?.[0] ?? "U").toUpperCase()}</div>
            <div className="app-user-meta">
              <div className="app-user-name">{session.user.email}</div>
            </div>
          </div>
        </div>

        <div className="app-sidebar-center">
          <div className="app-projects-header">
            <span>Проекты</span>
            <button className="app-small-btn" type="button" onClick={handleCreateProject}>
              + Проект
            </button>
          </div>

          <div className="app-projects-list">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`app-project-item ${selectedProjectId === project.id ? "active" : ""}`}
                onClick={() => selectProject(project.id)}
              >
                {project.name}
              </button>
            ))}
          </div>
        </div>

        <div className="app-sidebar-bottom">
          <button className="app-sidebar-btn" type="button" onClick={handleExportProject} disabled={!selectedProjectId}>
            Экспорт JSON
          </button>
          <button className="app-sidebar-btn" type="button" onClick={handleImportProjectClick} disabled={!selectedProjectId}>
            Импорт JSON
          </button>
          <button className="app-sidebar-btn danger" type="button" onClick={() => supabase.auth.signOut()}>
            Выйти из аккаунта
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleImportProjectFile}
          />
        </div>
      </aside>

      <div className="app-main">
        <button className="app-sidebar-toggle" type="button" onClick={() => setSidebarOpen((prev) => !prev)}>
          {sidebarOpen ? "Скрыть меню" : "Показать меню"}
        </button>
        {selectedProjectId ? <Board key={selectedProjectId} projectId={selectedProjectId} /> : <div className="app-loading">Загрузка проекта...</div>}
      </div>
    </div>
  );
}
