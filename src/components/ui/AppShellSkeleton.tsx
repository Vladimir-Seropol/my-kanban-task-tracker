import { BoardSkeleton } from "./BoardSkeleton";
import "../../App.css";

export const AppShellSkeleton = () => {
  return (
    <div className="app-shell app-shell--sidebar-open" aria-label="Загрузка приложения">
      <aside className="app-shell-skeleton__sidebar" aria-hidden="true">
        <div className="app-shell-skeleton__toggle" />

        <div className="app-shell-skeleton__profile">
          <div className="app-shell-skeleton__avatar" />
          <div className="app-shell-skeleton__profileMeta">
            <div className="app-shell-skeleton__line app-shell-skeleton__line--md" />
            <div className="app-shell-skeleton__line app-shell-skeleton__line--sm" />
          </div>
        </div>

        <div className="app-shell-skeleton__section">
          <div className="app-shell-skeleton__line app-shell-skeleton__line--lg" />
          <div className="app-shell-skeleton__list">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="app-shell-skeleton__row" />
            ))}
          </div>
        </div>
      </aside>

      <main className="app-main">
        <BoardSkeleton />
      </main>
    </div>
  );
};

