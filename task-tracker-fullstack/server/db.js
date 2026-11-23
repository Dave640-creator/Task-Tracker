// Database setup. We use SQLite: the whole database is one file (tasks.db).
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const folder = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(folder, "tasks.db"));

db.pragma("foreign_keys = ON");

// These tables are created automatically the first time the server runs.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name     TEXT NOT NULL,
    email    TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    priority     TEXT NOT NULL DEFAULT 'medium',
    category     TEXT NOT NULL DEFAULT 'School',
    due          TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'todo',
    position     INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title   TEXT NOT NULL,
    done    INTEGER NOT NULL DEFAULT 0
  );
`);

export default db;
