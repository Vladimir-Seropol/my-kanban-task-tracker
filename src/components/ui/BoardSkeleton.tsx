
import "../../index.css";
export const BoardSkeleton = () => {
  return (
    <div className="board-skeleton">
  {[1, 2, 3].map((col) => (
    <div key={col} className="column-skeleton">
      <div className="column-title-skeleton" />
      {[1, 2, 3, 4].map((task) => (
        <div key={task} className="task-skeleton" />
      ))}
    </div>
  ))}
</div>
  );
};


