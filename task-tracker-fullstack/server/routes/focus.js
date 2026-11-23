import { Router } from "express";
import { all } from "../db.js";
import { requireLogin } from "../auth.js";
import { findTask } from "../access.js";
import { todayString } from "../dates.js";

const router = Router();
router.use(requireLogin);

// Save a finished focus session
router.post("/", async (req, res) => {
  const minutes = Math.round(Number(req.body.minutes));
  if (!minutes || minutes < 1 || minutes > 180) return res.status(400).json({ error: "Invalid minutes" });

  const task = req.body.taskId ? await findTask(req.body.taskId, req.userId) : null;
  await all("INSERT INTO focus_sessions (user_id, task_id, minutes, day) VALUES ($1, $2, $3, $4)", [
    req.userId,
    task ? task.id : null,
    minutes,
    todayString(),
  ]);
  res.status(201).json({ ok: true });
});

export default router;
