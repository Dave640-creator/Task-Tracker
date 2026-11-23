// Small helper functions used by many components.

export const STATUS_LABELS = { todo: "To do", doing: "In progress", done: "Done" };
export const PRIORITIES = ["high", "medium", "low"];
export const CATEGORIES = ["School", "Work", "Personal", "Project"];

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
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateString(tomorrow);
}

// "2026-11-23" becomes "Nov 23"
export function formatDate(text) {
  const [year, month, day] = text.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

// Download all tasks as a CSV file (opens in Excel)
export function exportCsv(tasks) {
  const header = ["Title", "Status", "Priority", "Category", "Due date", "Subtasks done"];
  const rows = tasks.map((task) => [
    task.title,
    STATUS_LABELS[task.status],
    task.priority,
    task.category,
    task.due,
    subtaskProgress(task),
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
