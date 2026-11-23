import { Router } from "express";
import db from "../db.js";
import { requireLogin } from "../auth.js";
import { todayString } from "../dates.js";

const router = Router();
router.use(requireLogin); // every route in this file needs a logged-in user

const PRIORITIES = ["high", "medium", "low"];
const CATEGORIES = ["School", "Work", "Personal", "Project"];
const STATUSES = ["todo", "doing", "done"];

// Check the task form and return clean values. Throws an error if something is wrong.
function checkTask(body) {
  const title = String(body.title || "").trim();
  const priority = body.priority || "medium";
  const category = body.category || "School";
  const due = body.due || "";
  const status = body.status || "todo";

  if (!title) throw new Error("Title is required");
  if (title.length > 200) throw new Error("Title is too long (max 200 characters)");
  if (!PRIORITIES.includes(priority)) throw new Error("Invalid priority");
  if (!CATEGORIES.includes(category)) throw new Error("Invalid category");
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new Error("Invalid due date");

  return { title, priority, category, due, status };
}

// The position number puts a new task at the bottom of its column.
function nextPosition(userId, status) {
  const row = db.prepare("SELECT MAX(position) AS last FROM tasks WHERE user_id = ? AND status = ?").get(userId, status);
  return row.last === null ? 0 : row.last + 1;
}

// We remember the day a task was finished. The dashboard uses this.
function completedDate(status) {
  return status === "done" ? todayString() : null;
}

function findTask(id, userId) {
  return db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(id, userId);
}

// ---------- Tasks ----------

// Get all tasks of the logged-in user, each one with its subtasks
router.get("/", (req, res) => {
  const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY position, id").all(req.userId);
  const subtasks = db
    .prepare("SELECT s.* FROM subtasks s JOIN tasks t ON t.id = s.task_id WHERE t.user_id = ? ORDER BY s.id")
    .all(req.userId);

  for (const task of tasks) {
    task.subtasks = subtasks
      .filter((s) => s.task_id === task.id)
      .map((s) => ({ ...s, done: Boolean(s.done) }));
  }
  res.json(tasks);
});

// Add a task
router.post("/", (req, res) => {
  try {
    const task = checkTask(req.body);
    const position = nextPosition(req.userId, task.status);
    const result = db
      .prepare(
        "INSERT INTO tasks (user_id, title, priority, category, due, status, position, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(req.userId, task.title, task.priority, task.category, task.due, task.status, position, completedDate(task.status));
    res.status(201).json(findTask(result.lastInsertRowid, req.userId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Save the new order after drag and drop.
// The browser sends a list like: [{ id: 3, status: "doing", position: 0 }, ...]
router.post("/reorder", (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items)) return res.status(400).json({ error: "items must be a list" });

  const find = db.prepare("SELECT status, completed_at FROM tasks WHERE id = ? AND user_id = ?");
  const update = db.prepare("UPDATE tasks SET status = ?, position = ?, completed_at = ? WHERE id = ? AND user_id = ?");

  // A transaction saves everything together, or nothing if there is an error.
  const saveAll = db.transaction((list) => {
    for (const item of list) {
      if (!STATUSES.includes(item.status)) continue;
      const task = find.get(item.id, req.userId);
      if (!task) continue;

      let completed = task.completed_at;
      if (item.status !== task.status) completed = completedDate(item.status);
      update.run(item.status, item.position, completed, item.id, req.userId);
    }
  });

  saveAll(items);
  res.json({ ok: true });
});

// Edit a task
router.put("/:id", (req, res) => {
  const old = findTask(req.params.id, req.userId);
  if (!old) return res.status(404).json({ error: "Task not found" });

  try {
    const task = checkTask({ ...old, ...req.body });
    let position = old.position;
    let completed = old.completed_at;

    // If the status changed, move the task to the bottom of the new column
    if (task.status !== old.status) {
      position = nextPosition(req.userId, task.status);
      completed = completedDate(task.status);
    }

    db.prepare("UPDATE tasks SET title = ?, priority = ?, category = ?, due = ?, status = ?, position = ?, completed_at = ? WHERE id = ?")
      .run(task.title, task.priority, task.category, task.due, task.status, position, completed, old.id);
    res.json(findTask(old.id, req.userId));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a task (its subtasks are deleted too)
router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Task not found" });
  res.status(204).end();
});

// ---------- Subtasks ----------

// Add a subtask to a task
router.post("/:id/subtasks", (req, res) => {
  const task = findTask(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ error: "Subtask title is required" });

  const result = db.prepare("INSERT INTO subtasks (task_id, title) VALUES (?, ?)").run(task.id, title.slice(0, 200));
  res.status(201).json({ id: result.lastInsertRowid });
});

// Check or uncheck a subtask
router.put("/subtasks/:subId", (req, res) => {
  const result = db
    .prepare("UPDATE subtasks SET done = ? WHERE id = ? AND task_id IN (SELECT id FROM tasks WHERE user_id = ?)")
    .run(req.body.done ? 1 : 0, req.params.subId, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Subtask not found" });
  res.json({ ok: true });
});

// Delete a subtask
router.delete("/subtasks/:subId", (req, res) => {
  const result = db
    .prepare("DELETE FROM subtasks WHERE id = ? AND task_id IN (SELECT id FROM tasks WHERE user_id = ?)")
    .run(req.params.subId, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: "Subtask not found" });
  res.status(204).end();
});

export default router;
