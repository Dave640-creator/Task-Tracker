import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import { one, all, transaction } from "../db.js";
import { config } from "../config.js";
import { requireLogin } from "../auth.js";
import { myTaskIds, findTask, asId } from "../access.js";
import { logActivity } from "../activity.js";
import { saveFile, readFile, removeFiles } from "../files.js";
import { addToDate, todayString } from "../dates.js";

const router = Router();
router.use(requireLogin); // every route in this file needs a logged-in user

const PRIORITIES = ["high", "medium", "low"];
const CATEGORIES = ["School", "Work", "Personal", "Project"];
const STATUSES = ["todo", "doing", "done"];
const REPEATS = ["none", "daily", "weekly", "monthly"];
const STATUS_LABELS = { todo: "To do", doing: "In progress", done: "Done" };

// ---------- Helpers ----------

// Tags are saved as one text like "thesis,exam". This cleans what the user typed.
function cleanTags(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(",");
  const tags = [];
  for (const item of list) {
    const tag = String(item).trim().slice(0, 20);
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags.slice(0, 8).join(",");
}

// Check the task form and return clean values. Throws an error if something is wrong.
function checkTask(body) {
  const title = String(body.title || "").trim();
  const priority = body.priority || "medium";
  const category = body.category || "School";
  const due = body.due || "";
  const status = body.status || "todo";
  const repeat_every = body.repeat_every || "none";
  const notes = String(body.notes || "").trim().slice(0, 2000);
  const tags = cleanTags(body.tags);

  if (!title) throw new Error("Title is required");
  if (title.length > 200) throw new Error("Title is too long (max 200 characters)");
  if (!PRIORITIES.includes(priority)) throw new Error("Invalid priority");
  if (!CATEGORIES.includes(category)) throw new Error("Invalid category");
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  if (!REPEATS.includes(repeat_every)) throw new Error("Invalid repeat option");
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new Error("Invalid due date");

  return { title, priority, category, due, status, repeat_every, notes, tags };
}

// The position number puts a task at the bottom of its column.
async function nextPosition(userId, status, client) {
  const row = await one("SELECT MAX(position) AS last FROM tasks WHERE user_id = $1 AND status = $2", [userId, status], client);
  return row.last === null ? 0 : row.last + 1;
}

// We remember the day a task was finished. The dashboard and report use this.
function completedDate(status) {
  return status === "done" ? todayString() : null;
}

// When a repeating task is finished, make the next one.
async function createNextRepeat(task, userId, client) {
  if (task.repeat_every === "none") return;

  const today = todayString();
  const base = task.due && task.due >= today ? task.due : today;
  const nextDue = addToDate(base, task.repeat_every);

  const created = await one(
    "INSERT INTO tasks (user_id, title, priority, category, due, status, position, notes, tags, repeat_every) VALUES ($1, $2, $3, $4, $5, 'todo', $6, $7, $8, $9) RETURNING id",
    [task.user_id, task.title, task.priority, task.category, nextDue, await nextPosition(task.user_id, "todo", client), task.notes, task.tags, task.repeat_every],
    client
  );

  const newId = created.id;
  // Copy the subtasks (unchecked) and the people the task is shared with
  await all("INSERT INTO subtasks (task_id, title) SELECT $1, title FROM subtasks WHERE task_id = $2", [newId, task.id], client);
  await all("INSERT INTO task_members (task_id, user_id) SELECT $1, user_id FROM task_members WHERE task_id = $2", [newId, task.id], client);
  await logActivity(newId, userId, "created this task again (repeats " + task.repeat_every + ")", client);
}

// ---------- Tasks ----------

// Get all tasks the user can see. Each task comes with its subtasks, people, and files.
router.get("/", async (req, res) => {
  const ids = "(" + myTaskIds(1) + ")";
  const params = [req.userId];

  // The four queries are independent, so they run at the same time
  const [tasks, subtasks, members, attachments] = await Promise.all([
    all("SELECT t.*, u.name AS owner_name FROM tasks t JOIN users u ON u.id = t.user_id WHERE t.id IN " + ids + " ORDER BY t.position, t.id", params),
    all("SELECT * FROM subtasks WHERE task_id IN " + ids + " ORDER BY id", params),
    all("SELECT m.task_id, u.id, u.name, u.email FROM task_members m JOIN users u ON u.id = m.user_id WHERE m.task_id IN " + ids, params),
    all("SELECT id, task_id, original_name, size FROM attachments WHERE task_id IN " + ids + " ORDER BY id", params),
  ]);

  for (const task of tasks) {
    task.is_owner = task.user_id === req.userId;
    task.tags = task.tags ? task.tags.split(",") : [];
    task.subtasks = subtasks.filter((s) => s.task_id === task.id).map((s) => ({ ...s, done: Boolean(s.done) }));
    task.members = members.filter((m) => m.task_id === task.id);
    task.attachments = attachments.filter((a) => a.task_id === task.id);
  }
  res.json(tasks);
});

// Add a task
router.post("/", async (req, res) => {
  let task;
  try {
    task = checkTask(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const position = await nextPosition(req.userId, task.status);
  const created = await one(
    "INSERT INTO tasks (user_id, title, priority, category, due, status, position, completed_at, notes, tags, repeat_every) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id",
    [req.userId, task.title, task.priority, task.category, task.due, task.status, position, completedDate(task.status), task.notes, task.tags, task.repeat_every]
  );

  await logActivity(created.id, req.userId, "created this task");
  res.status(201).json({ id: created.id });
});

// Save the new order after drag and drop.
// The browser sends a list like: [{ id: 3, status: "doing", position: 0 }, ...]
router.post("/reorder", async (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items)) return res.status(400).json({ error: "items must be a list" });

  // A transaction saves everything together, or nothing if there is an error.
  await transaction(async (client) => {
    for (const item of items) {
      if (!STATUSES.includes(item.status)) continue;
      const task = await findTask(item.id, req.userId, client);
      if (!task) continue;

      let completed = task.completed_at;
      if (item.status !== task.status) {
        completed = completedDate(item.status);
        await logActivity(task.id, req.userId, "moved this task to " + STATUS_LABELS[item.status], client);
        if (item.status === "done") await createNextRepeat(task, req.userId, client);
      }
      await all("UPDATE tasks SET status = $1, position = $2, completed_at = $3 WHERE id = $4", [item.status, Math.round(Number(item.position)) || 0, completed, task.id], client);
    }
  });

  res.json({ ok: true });
});

// ---------- Attachments (files) ----------

// The file is kept in memory, then sent to Supabase Storage (Vercel has no disk to save files on).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize },
});

// Download a file
router.get("/attachments/:attId", async (req, res) => {
  const file = await one("SELECT * FROM attachments WHERE id = $1 AND task_id IN (" + myTaskIds(2) + ")", [asId(req.params.attId), req.userId]);
  if (!file) return res.status(404).json({ error: "File not found" });

  let data;
  try {
    data = await readFile(file.stored_name);
  } catch (err) {
    console.error(err);
    return res.status(404).json({ error: "The file is missing from storage" });
  }
  res.attachment(file.original_name).type("application/octet-stream").send(data);
});

// Remove a file
router.delete("/attachments/:attId", async (req, res) => {
  const file = await one("SELECT * FROM attachments WHERE id = $1 AND task_id IN (" + myTaskIds(2) + ")", [asId(req.params.attId), req.userId]);
  if (!file) return res.status(404).json({ error: "File not found" });

  await all("DELETE FROM attachments WHERE id = $1", [file.id]);
  await removeFiles([file.stored_name]);
  await logActivity(file.task_id, req.userId, "removed the file " + file.original_name);
  res.status(204).end();
});

// ---------- Subtasks ----------

// Check or uncheck a subtask
router.put("/subtasks/:subId", async (req, res) => {
  const sub = await one("SELECT * FROM subtasks WHERE id = $1 AND task_id IN (" + myTaskIds(2) + ")", [asId(req.params.subId), req.userId]);
  if (!sub) return res.status(404).json({ error: "Subtask not found" });

  await all("UPDATE subtasks SET done = $1 WHERE id = $2", [Boolean(req.body.done), sub.id]);
  await logActivity(sub.task_id, req.userId, (req.body.done ? "checked" : "unchecked") + " the subtask \"" + sub.title + "\"");
  res.json({ ok: true });
});

// Delete a subtask
router.delete("/subtasks/:subId", async (req, res) => {
  const sub = await one("SELECT * FROM subtasks WHERE id = $1 AND task_id IN (" + myTaskIds(2) + ")", [asId(req.params.subId), req.userId]);
  if (!sub) return res.status(404).json({ error: "Subtask not found" });

  await all("DELETE FROM subtasks WHERE id = $1", [sub.id]);
  res.status(204).end();
});

// ---------- One task ----------

// Edit a task (the owner and the people it is shared with can do this)
router.put("/:id", async (req, res) => {
  const old = await findTask(req.params.id, req.userId);
  if (!old) return res.status(404).json({ error: "Task not found" });

  let task;
  try {
    task = checkTask({ ...old, ...req.body });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  await transaction(async (client) => {
    let position = old.position;
    let completed = old.completed_at;

    // If the status changed, move the task to the bottom of the new column
    if (task.status !== old.status) {
      position = await nextPosition(old.user_id, task.status, client);
      completed = completedDate(task.status);
    }

    await all(
      "UPDATE tasks SET title = $1, priority = $2, category = $3, due = $4, status = $5, position = $6, completed_at = $7, notes = $8, tags = $9, repeat_every = $10 WHERE id = $11",
      [task.title, task.priority, task.category, task.due, task.status, position, completed, task.notes, task.tags, task.repeat_every, old.id],
      client
    );

    // Write the history
    const names = { title: "title", priority: "priority", category: "category", due: "due date", notes: "notes", tags: "tags", repeat_every: "repeat" };
    const changed = Object.keys(names).filter((key) => String(old[key]) !== String(task[key])).map((key) => names[key]);
    if (changed.length > 0) await logActivity(old.id, req.userId, "changed the " + changed.join(", "), client);
    if (task.status !== old.status) {
      await logActivity(old.id, req.userId, "moved this task to " + STATUS_LABELS[task.status], client);
      if (task.status === "done") await createNextRepeat({ ...old, ...task }, req.userId, client);
    }
  });

  res.json({ ok: true });
});

// Delete a task (only the owner can do this)
router.delete("/:id", async (req, res) => {
  const task = await one("SELECT id FROM tasks WHERE id = $1 AND user_id = $2", [asId(req.params.id), req.userId]);
  if (!task) return res.status(403).json({ error: "Only the owner can delete this task" });

  const files = await all("SELECT stored_name FROM attachments WHERE task_id = $1", [task.id]);
  await all("DELETE FROM tasks WHERE id = $1", [task.id]); // subtasks, history, etc. are deleted too
  await removeFiles(files.map((file) => file.stored_name));
  res.status(204).end();
});

// History of a task
router.get("/:id/activity", async (req, res) => {
  const task = await findTask(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const rows = await all(
    "SELECT a.text, a.created_at, u.name FROM activity a JOIN users u ON u.id = a.user_id WHERE a.task_id = $1 ORDER BY a.id DESC LIMIT 30",
    [task.id]
  );
  res.json(rows);
});

// Add a subtask
router.post("/:id/subtasks", async (req, res) => {
  const task = await findTask(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ error: "Subtask title is required" });

  await all("INSERT INTO subtasks (task_id, title) VALUES ($1, $2)", [task.id, title.slice(0, 200)]);
  await logActivity(task.id, req.userId, "added the subtask \"" + title.slice(0, 200) + "\"");
  res.status(201).json({ ok: true });
});

// Upload a file to a task
router.post("/:id/attachments", async (req, res) => {
  const task = await findTask(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  // Read the uploaded file (multer works with callbacks, so we wrap it)
  try {
    await new Promise((resolve, reject) => upload.single("file")(req, res, (err) => (err ? reject(err) : resolve())));
  } catch (err) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 4 MB)" : err.message;
    return res.status(400).json({ error: message });
  }
  if (!req.file) return res.status(400).json({ error: "Choose a file first" });

  // Fix file names with special characters
  const originalName = Buffer.from(req.file.originalname, "latin1").toString("utf8");
  const storedName = crypto.randomUUID(); // random name in the storage bucket

  await saveFile(storedName, req.file.buffer, req.file.mimetype);
  await all("INSERT INTO attachments (task_id, original_name, stored_name, size, uploaded_by) VALUES ($1, $2, $3, $4, $5)", [
    task.id,
    originalName,
    storedName,
    req.file.size,
    req.userId,
  ]);
  await logActivity(task.id, req.userId, "attached the file " + originalName);
  res.status(201).json({ ok: true });
});

// Share a task with another user (only the owner can do this)
router.post("/:id/share", async (req, res) => {
  const task = await one("SELECT id FROM tasks WHERE id = $1 AND user_id = $2", [asId(req.params.id), req.userId]);
  if (!task) return res.status(403).json({ error: "Only the owner can share this task" });

  const email = String(req.body.email || "").trim().toLowerCase();
  const person = await one("SELECT id, name FROM users WHERE email = $1", [email]);
  if (!person) return res.status(404).json({ error: "No account with that email. They need to register first." });
  if (person.id === req.userId) return res.status(400).json({ error: "You already own this task" });

  await all("INSERT INTO task_members (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [task.id, person.id]);
  await logActivity(task.id, req.userId, "shared this task with " + person.name);
  res.status(201).json({ ok: true });
});

// Stop sharing. The owner can remove anyone, and a person can remove themselves.
router.delete("/:id/share/:userId", async (req, res) => {
  const task = await findTask(req.params.id, req.userId);
  if (!task) return res.status(404).json({ error: "Task not found" });

  const removeId = asId(req.params.userId);
  if (task.user_id !== req.userId && removeId !== req.userId) {
    return res.status(403).json({ error: "You cannot remove other people" });
  }

  await all("DELETE FROM task_members WHERE task_id = $1 AND user_id = $2", [task.id, removeId]);
  res.status(204).end();
});

export default router;
