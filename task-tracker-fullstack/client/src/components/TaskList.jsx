import { useState } from "react";
import { STATUS_LABELS, exportCsv, formatDate, isOverdue, subtaskProgress } from "../utils.js";

export default function TaskList({ tasks, onOpen, onToggle, onNew }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [tag, setTag] = useState("all");

  // Every tag used in any task, without repeats
  const allTags = [...new Set(tasks.flatMap((t) => t.tags))].sort();

  const shown = tasks
    .filter((t) => status === "all" || t.status === status)
    .filter((t) => tag === "all" || t.tags.includes(tag))
    .filter((t) => t.title.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999")); // earliest due date first

  return (
    <div>
      <h1 className="page-title">All tasks</h1>

      <div className="toolbar">
        <input placeholder="Search by title" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search tasks" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="todo">To do</option>
          <option value="doing">In progress</option>
          <option value="done">Done</option>
        </select>
        {allTags.length > 0 && (
          <select value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by tag">
            <option value="all">All tags</option>
            {allTags.map((t) => <option key={t}>{t}</option>)}
          </select>
        )}
        <span className="spacer" />
        <button className="btn" onClick={() => exportCsv(shown)} disabled={shown.length === 0}>Export CSV</button>
        <button className="btn" onClick={() => window.print()} disabled={shown.length === 0}>Print / Save as PDF</button>
      </div>

      {shown.length === 0 ? (
        <div className="empty-box">
          {tasks.length === 0 ? (
            <>
              <p>You have no tasks yet.</p>
              <button className="btn btn-primary" onClick={onNew}>Add your first task</button>
            </>
          ) : (
            <p>No tasks match your search.</p>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="no-print"></th>
                <th>Task</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Due</th>
                <th>Subtasks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((task) => (
                <tr key={task.id}>
                  <td className="no-print">
                    <input type="checkbox" checked={task.status === "done"} onChange={() => onToggle(task)}
                      aria-label={"Mark " + task.title + " as done"} />
                  </td>
                  <td>
                    <button className={task.status === "done" ? "link done-text" : "link"} onClick={() => onOpen(task.id)}>
                      {task.title}
                    </button>
                    {task.tags.length > 0 && <div className="tag-row">{task.tags.map((t) => <span key={t} className="tag plain">{t}</span>)}</div>}
                  </td>
                  <td>{task.category}</td>
                  <td><span className={"tag " + task.priority}>{task.priority}</span></td>
                  <td className={isOverdue(task) ? "overdue" : ""}>{task.due ? formatDate(task.due) : "-"}</td>
                  <td>{subtaskProgress(task) || "-"}</td>
                  <td>{STATUS_LABELS[task.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
