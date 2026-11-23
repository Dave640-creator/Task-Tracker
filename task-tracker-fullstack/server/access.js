// Which tasks can a user see? Their own tasks, plus tasks shared with them.
import { one } from "./db.js";

// Turn a value from the URL into a safe id. Anything strange becomes 0, which matches nothing.
export function asId(value) {
  const text = String(value);
  return /^\d{1,9}$/.test(text) ? Number(text) : 0;
}

// Use this inside other SQL. n is the number of the parameter that holds the user id ($1, $2...).
export const myTaskIds = (n) =>
  "SELECT id FROM tasks WHERE user_id = $" + n + " OR id IN (SELECT task_id FROM task_members WHERE user_id = $" + n + ")";

// Find one task, only if the user is allowed to see it
export function findTask(id, userId, client) {
  return one("SELECT * FROM tasks WHERE id = $1 AND id IN (" + myTaskIds(2) + ")", [asId(id), userId], client);
}
