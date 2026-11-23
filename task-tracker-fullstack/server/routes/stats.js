import { Router } from "express";
import { one, all } from "../db.js";
import { requireLogin } from "../auth.js";
import { myTaskIds } from "../access.js";
import { dateString, todayString } from "../dates.js";

const router = Router();
router.use(requireLogin);

// Numbers for the dashboard and the weekly report
router.get("/", async (req, res) => {
  const today = todayString();
  const tasks = await all("SELECT status, due, completed_at FROM tasks WHERE id IN (" + myTaskIds(1) + ")", [req.userId]);

  const countStatus = (status) => tasks.filter((t) => t.status === status).length;
  const overdue = tasks.filter((t) => t.status !== "done" && t.due && t.due < today).length;

  // How many tasks were finished on each day
  const doneByDay = {};
  for (const task of tasks) {
    if (task.completed_at) {
      doneByDay[task.completed_at] = (doneByDay[task.completed_at] || 0) + 1;
    }
  }

  // The last 7 days, oldest first
  const last7days = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const date = dateString(day);
    last7days.push({ date, count: doneByDay[date] || 0 });
  }

  // Streak = how many days in a row the user finished at least one task
  let streak = 0;
  const day = new Date();
  if (!doneByDay[dateString(day)]) day.setDate(day.getDate() - 1); // today is not over yet, so start from yesterday
  while (doneByDay[dateString(day)]) {
    streak++;
    day.setDate(day.getDate() - 1);
  }

  // Minutes of focus time in the last 7 days
  const focus = await one("SELECT COALESCE(SUM(minutes), 0)::int AS total FROM focus_sessions WHERE user_id = $1 AND day >= $2", [
    req.userId,
    last7days[0].date,
  ]);

  res.json({
    total: tasks.length,
    todo: countStatus("todo"),
    doing: countStatus("doing"),
    done: countStatus("done"),
    overdue,
    last7days,
    streak,
    focusMinutes: focus.total,
  });
});

export default router;
