import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api.js";

const PRIO = { high: 0, medium: 1, low: 2 };

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function Item({ task, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.title);
  const overdue = task.due && !task.done && task.due < todayStr();

  const commit = () => {
    const x = val.trim();
    if (x && x !== task.title) onEdit(task.id, x);
    else setVal(task.title);
    setEditing(false);
  };

  return (
    <li className={`p-${task.priority}${task.done ? " done" : ""}`}>
      <input type="checkbox" checked={task.done} onChange={() => onToggle(task)} aria-label={`Mark ${task.title} as done`} />
      <div className="body">
        {editing ? (
          <input
            className="edit"
            autoFocus
            value={val}
            aria-label="Edit task title"
            onChange={(e) => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setVal(task.title); setEditing(false); }
            }}
          />
        ) : (
          <div className="t" onDoubleClick={() => setEditing(true)} title="Double-click to edit">{task.title}</div>
        )}
        <div className="meta">
          <span className="chip">{task.category}</span>
          <span>{task.priority} priority</span>
          {task.due && <span className={overdue ? "overdue" : ""}>{overdue ? "Overdue: " : "Due "}{fmtDate(task.due)}</span>}
        </div>
      </div>
      <div className="row-btns">
        <button onClick={() => setEditing(true)} aria-label={`Edit ${task.title}`}>Edit</button>
        <button className="del" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}>Delete</button>
      </div>
    </li>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ title: "", priority: "medium", category: "School", due: "" });
  const [undo, setUndo] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("tt-theme") || "");
  const timer = useRef(null);

  useEffect(() => {
    api.list().then(setTasks).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme);
    else document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("tt-theme", theme);
  }, [theme]);

  const run = async (fn) => {
    setError("");
    try { await fn(); } catch (e) { setError(e.message); }
  };

  const add = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    run(async () => {
      const t = await api.create(form);
      setTasks((prev) => [t, ...prev]);
      setForm({ ...form, title: "", due: "" });
    });
  };

  const toggle = (task) =>
    run(async () => {
      const t = await api.update(task.id, { done: !task.done });
      setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
    });

  const edit = (id, title) =>
    run(async () => {
      const t = await api.update(id, { title });
      setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
    });

  const del = (task) =>
    run(async () => {
      await api.remove(task.id);
      setTasks((prev) => prev.filter((x) => x.id !== task.id));
      setUndo(task);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setUndo(null), 5000);
    });

  const restore = () =>
    run(async () => {
      const { id, createdAt, ...rest } = undo;
      const t = await api.create(rest);
      setTasks((prev) => [t, ...prev]);
      setUndo(null);
    });

  const clearDone = () =>
    run(async () => {
      await api.clearDone();
      setTasks((prev) => prev.filter((t) => !t.done));
    });

  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (filter === "active" && t.done) return false;
        if (filter === "done" && !t.done) return false;
        return !q || t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (PRIO[a.priority] !== PRIO[b.priority]) return PRIO[a.priority] - PRIO[b.priority];
        return (a.due || "9999") < (b.due || "9999") ? -1 : 1;
      });
  }, [tasks, filter, query]);

  const isDark = theme ? theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>Task Tracker</h1>
          <p className="sub">{done} of {tasks.length} done</p>
        </div>
        <button className="icon-btn" onClick={() => setTheme(isDark ? "light" : "dark")}>{isDark ? "Light mode" : "Dark mode"}</button>
      </header>

      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: pct + "%" }} />
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      <form className="add" onSubmit={add}>
        <input className="title" placeholder="What needs to get done?" value={form.title} onChange={set("title")} aria-label="Task title" maxLength={200} />
        <select value={form.priority} onChange={set("priority")} aria-label="Priority">
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <select value={form.category} onChange={set("category")} aria-label="Category">
          {["School", "Work", "Personal", "Project"].map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="date" value={form.due} onChange={set("due")} aria-label="Due date" />
        <button className="primary" type="submit">Add task</button>
      </form>

      <div className="bar">
        <div className="tabs">
          {["all", "active", "done"].map((k) => (
            <button key={k} className="tab" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
        <input className="search" type="search" placeholder="Search tasks" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tasks" />
      </div>

      {loading ? (
        <div className="empty">Loading tasks...</div>
      ) : visible.length ? (
        <ul>{visible.map((t) => <Item key={t.id} task={t} onToggle={toggle} onEdit={edit} onDelete={del} />)}</ul>
      ) : (
        <div className="empty">{tasks.length === 0 ? "No tasks yet. Type one above and press Add task." : "Nothing matches. Try another filter or search."}</div>
      )}

      {tasks.length > 0 && (
        <div className="foot">
          <span>{tasks.length - done} left</span>
          {done > 0 && <button className="link" onClick={clearDone}>Clear completed ({done})</button>}
        </div>
      )}

      {undo && (
        <div className="toast" role="status">
          <span>Task deleted</span>
          <button onClick={restore}>Undo</button>
        </div>
      )}
    </div>
  );
}
