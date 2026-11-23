import { useEffect, useState } from "react";
import { api, getToken, setToken } from "./api.js";
import useReminders from "./useReminders.js";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import Board from "./components/Board.jsx";
import TaskList from "./components/TaskList.jsx";
import Calendar from "./components/Calendar.jsx";
import TaskModal from "./components/TaskModal.jsx";

const PAGES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "board", label: "Board" },
  { id: "list", label: "List" },
  { id: "calendar", label: "Calendar" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken())); // true while we check the saved login
  const [tasks, setTasks] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [editingId, setEditingId] = useState(null); // null = closed, "new" = new task, or a task id
  const [error, setError] = useState("");

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
  }

  function logout() {
    setToken(null);
    setUser(null);
    setTasks([]);
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

  // ----- Screens -----

  if (checking) return <p className="center-message">Loading...</p>;
  if (!user) return <Login onLogin={login} />;

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
          <span className="user-name">{user.name}</span>
          <button className="btn" onClick={logout}>Log out</button>
        </div>
      </header>

      <main className="page">
        {error && <p className="error">{error}</p>}

        {page === "dashboard" && <Dashboard tasks={tasks} onOpen={setEditingId} />}
        {page === "board" && <Board tasks={tasks} onOpen={setEditingId} onReorder={reorder} />}
        {page === "list" && <TaskList tasks={tasks} onOpen={setEditingId} onToggle={toggleDone} />}
        {page === "calendar" && <Calendar tasks={tasks} onOpen={setEditingId} />}
      </main>

      {editingId && (
        <TaskModal
          key={editingId}
          task={editingTask}
          onSave={saveTask}
          onDelete={deleteTask}
          onClose={() => setEditingId(null)}
          onAddSubtask={(title) => run(() => api.addSubtask(editingId, title))}
          onToggleSubtask={(sub) => run(() => api.updateSubtask(sub.id, { done: !sub.done }))}
          onDeleteSubtask={(sub) => run(() => api.deleteSubtask(sub.id))}
        />
      )}
    </div>
  );
}
