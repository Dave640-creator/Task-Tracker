import { useState } from "react";
import { STATUS_LABELS, formatDate, isOverdue, subtaskProgress } from "../utils.js";

const COLUMNS = ["todo", "doing", "done"];

export default function Board({ tasks, onOpen, onReorder }) {
  const [dragId, setDragId] = useState(null); // the task being dragged

  // Called when a card is dropped. status = the column, beforeId = the card it was dropped on
  function drop(status, beforeId) {
    if (dragId === null || beforeId === dragId) return;

    const dragged = tasks.find((t) => t.id === dragId);
    const others = tasks.filter((t) => t.id !== dragId);

    // Build the new order of every column
    const items = [];
    for (const column of COLUMNS) {
      const list = others.filter((t) => t.status === column);

      if (column === status) {
        const index = list.findIndex((t) => t.id === beforeId);
        if (index === -1) list.push(dragged); // dropped on empty space: put at the bottom
        else list.splice(index, 0, dragged); // dropped on a card: put before it
      }

      list.forEach((task, position) => items.push({ id: task.id, status: column, position }));
    }

    setDragId(null);
    onReorder(items);
  }

  return (
    <div>
      <h1 className="page-title">Board</h1>
      <p className="muted">Drag a task to another column to change its status, or onto another task to change its order.</p>

      <div className="board">
        {COLUMNS.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <section key={status} className="column" onDragOver={(e) => e.preventDefault()} onDrop={() => drop(status, null)}>
              <h2 className="column-title">
                <span className={"dot dot-" + status} />
                {STATUS_LABELS[status]}
                <span className="count">{columnTasks.length}</span>
              </h2>

              {columnTasks.length === 0 && <p className="muted small">No tasks here</p>}

              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  className={dragId === task.id ? "card dragging" : "card"}
                  draggable
                  tabIndex={0}
                  onDragStart={() => setDragId(task.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.stopPropagation(); drop(status, task.id); }}
                  onClick={() => onOpen(task.id)}
                  onKeyDown={(e) => e.key === "Enter" && onOpen(task.id)}
                >
                  <div className={task.status === "done" ? "card-title done-text" : "card-title"}>{task.title}</div>

                  {task.tags.length > 0 && (
                    <div className="tag-row">
                      {task.tags.map((tag) => <span key={tag} className="tag plain">{tag}</span>)}
                    </div>
                  )}

                  <div className="card-meta">
                    <span className={"tag " + task.priority}>{task.priority}</span>
                    {task.due && <span className={isOverdue(task) ? "overdue" : ""}>{formatDate(task.due)}</span>}
                    {task.subtasks.length > 0 && <span>Subtasks {subtaskProgress(task)}</span>}
                    {task.attachments.length > 0 && <span>{task.attachments.length} file(s)</span>}
                    {!task.is_owner && <span>From {task.owner_name}</span>}
                    {task.is_owner && task.members.length > 0 && <span>Shared</span>}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
