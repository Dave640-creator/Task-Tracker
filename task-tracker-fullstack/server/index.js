import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data.json");
const DIST = path.join(__dirname, "..", "client", "dist");
const PORT = process.env.PORT || 4000;

const PRIORITIES = ["high", "medium", "low"];
const CATEGORIES = ["School", "Work", "Personal", "Project"];

// ---- tiny JSON "database" (swap with SQLite/MySQL/Mongo later) ----
function readDb() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { return []; }
}
function writeDb(tasks) {
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(tasks, null, 2));
  fs.renameSync(tmp, DATA_FILE); // atomic replace
}

// ---- validation ----
function clean(body, partial = false) {
  const out = {};
  if (!partial || body.title !== undefined) {
    const title = String(body.title ?? "").trim();
    if (!title) throw new Error("Title is required");
    if (title.length > 200) throw new Error("Title is too long (max 200)");
    out.title = title;
  }
  if (!partial || body.priority !== undefined) {
    const p = body.priority ?? "medium";
    if (!PRIORITIES.includes(p)) throw new Error("Invalid priority");
    out.priority = p;
  }
  if (!partial || body.category !== undefined) {
    const c = body.category ?? "School";
    if (!CATEGORIES.includes(c)) throw new Error("Invalid category");
    out.category = c;
  }
  if (!partial || body.due !== undefined) {
    const d = body.due ?? "";
    if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error("Invalid due date");
    out.due = d;
  }
  if (body.done !== undefined) out.done = Boolean(body.done);
  return out;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/tasks", (req, res) => res.json(readDb()));

app.post("/api/tasks", (req, res) => {
  try {
    const task = { id: crypto.randomUUID(), done: false, createdAt: Date.now(), ...clean(req.body) };
    const tasks = readDb();
    tasks.unshift(task);
    writeDb(tasks);
    res.status(201).json(task);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.patch("/api/tasks/:id", (req, res) => {
  try {
    const tasks = readDb();
    const i = tasks.findIndex((t) => t.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: "Task not found" });
    tasks[i] = { ...tasks[i], ...clean(req.body, true) };
    writeDb(tasks);
    res.json(tasks[i]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete("/api/tasks/:id", (req, res) => {
  const tasks = readDb();
  const next = tasks.filter((t) => t.id !== req.params.id);
  if (next.length === tasks.length) return res.status(404).json({ error: "Task not found" });
  writeDb(next);
  res.status(204).end();
});

app.delete("/api/tasks", (req, res) => {
  if (req.query.completed !== "true") return res.status(400).json({ error: "Use ?completed=true" });
  writeDb(readDb().filter((t) => !t.done));
  res.status(204).end();
});

// serve the built React app in production
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get("*", (req, res) => res.sendFile(path.join(DIST, "index.html")));
}

app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));
