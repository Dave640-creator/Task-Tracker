import { all } from "./db.js";

// Save one line in the history of a task
export function logActivity(taskId, userId, text, client) {
  return all("INSERT INTO activity (task_id, user_id, text) VALUES ($1, $2, $3)", [taskId, userId, text], client);
}
