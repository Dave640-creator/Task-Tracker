import { useEffect, useState } from "react";
import { CATEGORIES, PRIORITIES, STATUS_LABELS } from "../utils.js";

// One popup for both adding a new task and editing an existing one.
// "task" is empty when adding a new task.
export default function TaskModal({ task, onSave, onDelete, onClose, onAddSubtask, onToggleSubtask, onDeleteSubtask }) {
  const isNew = !task;

  const [form, setForm] = useState({
    title: task ? task.title : "",
    priority: task ? task.priority : "medium",
    category: task ? task.category : "School",
    due: task ? task.due : "",
    status: task ? task.status : "todo",
  });
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [error, setError] = useState("");

  // Close with the Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Please enter a title");
      return;
    }
    onSave(form);
  }

  function addSubtask(e) {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;
    onAddSubtask(subtaskTitle);
    setSubtaskTitle("");
  }

  function remove() {
    if (window.confirm("Delete this task?")) onDelete(task.id);
  }

  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={isNew ? "New task" : "Edit task"} onClick={(e) => e.stopPropagation()}>
        <h2>{isNew ? "New task" : "Edit task"}</h2>

        <form onSubmit={submit}>
          {error && <p className="error">{error}</p>}

          <label className="field">
            Title
            <input name="title" value={form.title} onChange={change} maxLength={200} autoFocus />
          </label>

          <div className="form-row">
            <label className="field">
              Priority
              <select name="priority" value={form.priority} onChange={change}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
              </select>
            </label>
            <label className="field">
              Category
              <select name="category" value={form.category} onChange={change}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              Due date
              <input name="due" type="date" value={form.due} onChange={change} />
            </label>
            <label className="field">
              Status
              <select name="status" value={form.status} onChange={change}>
                {Object.keys(STATUS_LABELS).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </label>
          </div>

          <div className="modal-buttons">
            {!isNew && <button type="button" className="btn btn-danger" onClick={remove}>Delete</button>}
            <span className="spacer" />
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isNew ? "Add task" : "Save changes"}</button>
          </div>
        </form>

        {/* Subtasks can only be added after the task exists */}
        {!isNew && (
          <div className="subtasks">
            <h3>Subtasks</h3>
            {task.subtasks.length === 0 && <p className="muted small">No subtasks yet.</p>}
            <ul className="plain-list">
              {task.subtasks.map((sub) => (
                <li key={sub.id} className="subtask-row">
                  <label>
                    <input type="checkbox" checked={sub.done} onChange={() => onToggleSubtask(sub)} />
                    <span className={sub.done ? "done-text" : ""}>{sub.title}</span>
                  </label>
                  <button type="button" className="link" onClick={() => onDeleteSubtask(sub)}>Remove</button>
                </li>
              ))}
            </ul>
            <form className="subtask-add" onSubmit={addSubtask}>
              <input placeholder="Add a subtask" value={subtaskTitle} onChange={(e) => setSubtaskTitle(e.target.value)} aria-label="New subtask" />
              <button type="submit" className="btn">Add</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
