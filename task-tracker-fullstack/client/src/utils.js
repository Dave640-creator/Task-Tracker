// Small helper functions used by many components.

export const STATUS_LABELS = { todo: "To do", doing: "In progress", done: "Done" };
export const PRIORITIES = ["high", "medium", "low"];
export const CATEGORIES = ["School", "Work", "Personal", "Project"];
export const REPEAT_LABELS = { none: "Does not repeat", daily: "Every day", weekly: "Every week", monthly: "Every month" };

// Turns a Date into text like "2026-11-23"
export function dateString(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + month + "-" + day;
}

export function todayString() {
  return dateString(new Date());
}

export function tomorrowString() {
  return daysFromToday(1);
}

// daysFromToday(-6) is the date 6 days ago
export function daysFromToday(amount) {
  const date = new Date();
  date.setDate(date.getDate() + amount);
  return dateString(date);
}

// "2026-11-23" becomes "Nov 23"
export function formatDate(text) {
  const [year, month, day] = text.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// The server saves times in UTC like "2026-11-23 06:15:00". This shows them in local time.
export function formatDateTime(text) {
  const date = new Date(text); // Postgres sends an ISO time like 2026-11-23T13:00:00.000Z
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatSize(bytes) {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function isOverdue(task) {
  return task.status !== "done" && task.due !== "" && task.due < todayString();
}

// "2/5" when a task has subtasks, empty text when it has none
export function subtaskProgress(task) {
  if (task.subtasks.length === 0) return "";
  const done = task.subtasks.filter((s) => s.done).length;
  return done + "/" + task.subtasks.length;
}

// Download tasks as a CSV file (opens in Excel)
export function exportCsv(tasks) {
  const header = ["Title", "Status", "Priority", "Category", "Tags", "Due date", "Repeat", "Subtasks done", "Notes"];
  const rows = tasks.map((task) => [
    task.title,
    STATUS_LABELS[task.status],
    task.priority,
    task.category,
    task.tags.join(" "),
    task.due,
    REPEAT_LABELS[task.repeat_every],
    subtaskProgress(task),
    task.notes,
  ]);

  // Put quotes around every value so commas inside titles do not break the file
  const quote = (value) => '"' + String(value).replace(/"/g, '""') + '"';
  const text = [header, ...rows].map((row) => row.map(quote).join(",")).join("\n");

  const file = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = "tasks-" + todayString() + ".csv";
  link.click();
  URL.revokeObjectURL(link.href);
}
