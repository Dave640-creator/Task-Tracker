import { useState } from "react";
import { api } from "../api.js";

// The checklist inside a task
export default function SubtaskList({ task, onChange }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  // Runs one server action, then asks the app to reload the tasks
  async function run(action) {
    setError("");
    try {
      await action();
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    run(() => api.addSubtask(task.id, title));
    setTitle("");
  }

  return (
    <section className="modal-section">
      <h3>Subtasks</h3>
      {error && <p className="error">{error}</p>}
      {task.subtasks.length === 0 && <p className="muted small">No subtasks yet.</p>}

      <ul className="plain-list">
        {task.subtasks.map((sub) => (
          <li key={sub.id} className="item-row">
            <label>
              <input type="checkbox" checked={sub.done} onChange={() => run(() => api.updateSubtask(sub.id, { done: !sub.done }))} />
              <span className={sub.done ? "done-text" : ""}>{sub.title}</span>
            </label>
            <button type="button" className="link" onClick={() => run(() => api.deleteSubtask(sub.id))}>Remove</button>
          </li>
        ))}
      </ul>

      <form className="inline-form" onSubmit={add}>
        <input placeholder="Add a subtask" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="New subtask" />
        <button type="submit" className="btn">Add</button>
      </form>
    </section>
  );
}
