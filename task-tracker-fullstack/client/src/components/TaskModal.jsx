import { useEffect, useState } from "react";
import { CATEGORIES, PRIORITIES, REPEAT_LABELS, STATUS_LABELS } from "../utils.js";
import SubtaskList from "./SubtaskList.jsx";
import Attachments from "./Attachments.jsx";
import Sharing from "./Sharing.jsx";
import ActivityLog from "./ActivityLog.jsx";

// One popup for both adding a new task and editing an existing one.
// "task" is empty when adding a new task.
export default function TaskModal({ task, user, onSave, onDelete, onClose, onChange, onFocus }) {
  const isNew = !task;

  const [form, setForm] = useState({
    title: task ? task.title : "",
    priority: task ? task.priority : "medium",
    category: task ? task.category : "School",
    due: task ? task.due : "",
    status: task ? task.status : "todo",
    repeat_every: task ? task.repeat_every : "none",
    tags: task ? task.tags.join(", ") : "",
    notes: task ? task.notes : "",
  });
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

  function remove() {
    if (window.confirm("Delete this task?")) onDelete(task.id);
  }

  return (
    <div className="modal-backdrop no-print" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={isNew ? "New task" : "Edit task"} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{isNew ? "New task" : "Edit task"}</h2>
          {!isNew && <button type="button" className="btn" onClick={() => onFocus(task)}>Start focus timer</button>}
        </div>

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

          <div className="form-row">
            <label className="field">
              Repeat
              <select name="repeat_every" value={form.repeat_every} onChange={change}>
                {Object.keys(REPEAT_LABELS).map((r) => <option key={r} value={r}>{REPEAT_LABELS[r]}</option>)}
              </select>
            </label>
            <label className="field">
              Tags (separate with commas)
              <input name="tags" value={form.tags} onChange={change} placeholder="thesis, exam" />
            </label>
          </div>

          <label className="field">
            Notes
            <textarea name="notes" value={form.notes} onChange={change} rows={3} maxLength={2000} />
          </label>

          <div className="modal-buttons">
            {!isNew && task.is_owner && <button type="button" className="btn btn-danger" onClick={remove}>Delete</button>}
            <span className="spacer" />
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isNew ? "Add task" : "Save changes"}</button>
          </div>
        </form>

        {/* These parts only make sense after the task has been saved */}
        {!isNew && (
          <>
            <SubtaskList task={task} onChange={onChange} />
            <Attachments task={task} onChange={onChange} />
            <Sharing task={task} user={user} onChange={onChange} />
            <ActivityLog task={task} />
          </>
        )}
      </div>
    </div>
  );
}
