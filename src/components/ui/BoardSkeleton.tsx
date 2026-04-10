
export const BoardSkeleton = () => {
  return (
    <div className="board-skeleton-v2" aria-label="Загрузка доски">
      <div className="board-skeleton-v2__header" aria-hidden="true">
        <div className="board-skeleton-v2__btn" />
        <div className="board-skeleton-v2__title" />
        <div className="board-skeleton-v2__btn" />
      </div>

      <div className="board-skeleton-v2__columns" aria-hidden="true">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="board-skeleton-v2__column">
            <div className="board-skeleton-v2__colTitle" />
            <div className="board-skeleton-v2__card">
              <div className="board-skeleton-v2__line board-skeleton-v2__line--lg" />
              <div className="board-skeleton-v2__meta">
                <div className="board-skeleton-v2__chip" />
                <div className="board-skeleton-v2__chip board-skeleton-v2__chip--muted" />
              </div>
              <div className="board-skeleton-v2__avatars">
                <div className="board-skeleton-v2__avatar" />
                <div className="board-skeleton-v2__avatar" />
              </div>
            </div>
            <div className="board-skeleton-v2__card">
              <div className="board-skeleton-v2__line board-skeleton-v2__line--md" />
              <div className="board-skeleton-v2__line board-skeleton-v2__line--sm" />
              <div className="board-skeleton-v2__meta">
                <div className="board-skeleton-v2__chip" />
                <div className="board-skeleton-v2__chip board-skeleton-v2__chip--muted" />
              </div>
            </div>
            <div className="board-skeleton-v2__card board-skeleton-v2__card--thin">
              <div className="board-skeleton-v2__line board-skeleton-v2__line--md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
