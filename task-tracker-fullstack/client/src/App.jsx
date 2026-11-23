import { useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";
import useReminders from "./useReminders.js";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Board from "./components/Board.jsx";
import TaskList from "./components/TaskList.jsx";
import Calendar from "./components/Calendar.jsx";
import Report from "./components/Report.jsx";
import Settings from "./components/Settings.jsx";
import TaskModal from "./components/TaskModal.jsx";
import FocusTimer from "./components/FocusTimer.jsx";

const PAGES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "board", label: "Board" },
  { id: "list", label: "List" },
  { id: "calendar", label: "Calendar" },
  { id: "report", label: "Report" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken())); // true while we check the saved login
  const [tasks, setTasks] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [editingId, setEditingId] = useState(null); // null = closed, "new" = new task, or a task id
  const [focusTask, setFocusTask] = useState(null); // the task being timed
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(getStartTheme);

  // The reset link looks like  /?reset=abc123
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get("reset") || "");

  // Light or dark mode
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // When the page opens, check if the user is still logged in
  useEffect(() => {
    if (!getToken()) return;
    api.me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  // Load the tasks after logging in
  useEffect(() => {
    if (user) loadTasks();
  }, [user]);

  useReminders(tasks);

  function getStartTheme() {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  async function loadTasks() {
    try {
      setTasks(await api.getTasks());
    } catch (err) {
      handleError(err);
    }
  }

  function handleError(err) {
    if (err.status === 401) logout();
    else setError(err.message);
  }

  // Runs one server action, then reloads the tasks so the screen is up to date
  async function run(action) {
    setError("");
    try {
      await action();
      await loadTasks();
    } catch (err) {
      handleError(err);
    }
  }

  function login(data) {
    setToken(data.token);
    setUser(data.user);
    setPage("dashboard");
  }

  function logout() {
    setToken(null);
    setUser(null);
    setTasks([]);
    setFocusTask(null);
  }

  // ----- Task actions -----

  function saveTask(form) {
    if (editingId === "new") run(() => api.createTask(form));
    else run(() => api.updateTask(editingId, form));
    setEditingId(null);
  }

  function deleteTask(id) {
    run(() => api.deleteTask(id));
    setEditingId(null);
  }

  function toggleDone(task) {
    const status = task.status === "done" ? "todo" : "done";
    run(() => api.updateTask(task.id, { status }));
  }

  // Used by drag and drop. We update the screen first so it feels fast.
  function reorder(items) {
    const updated = tasks.map((task) => {
      const item = items.find((i) => i.id === task.id);
      return item ? { ...task, status: item.status, position: item.position } : task;
    });
    setTasks(updated.sort((a, b) => a.position - b.position));
    run(() => api.reorder(items));
  }

  function startFocus(task) {
    setEditingId(null);
    setFocusTask({ id: task.id, title: task.title });
  }

  // ----- Screens -----

  if (checking) return <p className="center-message">Loading...</p>;
  if (!user) return <Login onLogin={login} resetToken={resetToken} />;

  const editingTask = tasks.find((t) => t.id === editingId);

  return (
    <div>
      <header className="topbar no-print">
        <strong className="brand">Task Tracker</strong>
        <nav className="tabs">
          {PAGES.map((p) => (
            <button key={p.id} className={page === p.id ? "tab active" : "tab"} onClick={() => setPage(p.id)}>
              {p.label}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => setEditingId("new")}>New task</button>
          <button className="btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <button className={page === "settings" ? "avatar active" : "avatar"} title="Settings" onClick={() => setPage("settings")}>
            {user.name[0].toUpperCase()}
          </button>
        </div>
      </header>

      <main className="page">
        {error && <p className="error">{error}</p>}

        {page === "dashboard" && <Dashboard tasks={tasks} user={user} onOpen={setEditingId} />}
        {page === "board" && <Board tasks={tasks} onOpen={setEditingId} onReorder={reorder} />}
        {page === "list" && <TaskList tasks={tasks} onOpen={setEditingId} onToggle={toggleDone} onNew={() => setEditingId("new")} />}
        {page === "calendar" && <Calendar tasks={tasks} onOpen={setEditingId} />}
        {page === "report" && <Report tasks={tasks} user={user} />}
        {page === "settings" && <Settings user={user} onUserChange={setUser} onLogout={logout} />}
      </main>

      {editingId && (
        <TaskModal
          key={editingId}
          task={editingTask}
          user={user}
          onSave={saveTask}
          onDelete={deleteTask}
          onClose={() => setEditingId(null)}
          onChange={loadTasks}
          onFocus={startFocus}
        />
      )}

      {focusTask && (
        <FocusTimer
          key={focusTask.id}
          task={focusTask}
          onFocusDone={(minutes) => api.logFocus({ taskId: focusTask.id, minutes }).catch(() => {})}
          onClose={() => setFocusTask(null)}
        />
      )}
    </div>
  );
}
