import { Router } from "express";
import db from "../db.js";
import { requireLogin } from "../auth.js";
import { dateString, todayString } from "../dates.js";

const router = Router();
router.use(requireLogin);

// Numbers for the dashboard
router.get("/", (req, res) => {
  const today = todayString();
  const tasks = db.prepare("SELECT status, due, completed_at FROM tasks WHERE user_id = ?").all(req.userId);

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

  res.json({
    total: tasks.length,
    todo: countStatus("todo"),
    doing: countStatus("doing"),
    done: countStatus("done"),
    overdue,
    last7days,
    streak,
  });
});

export default router;
