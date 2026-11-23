// Settings: change name, change password, delete account
import { Router } from "express";
import bcrypt from "bcryptjs";
import { one, all } from "../db.js";
import { requireLogin } from "../auth.js";
import { removeFiles } from "../files.js";

const router = Router();
router.use(requireLogin);

router.put("/profile", async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ error: "Name is required" });

  const user = await one("UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email", [name.slice(0, 60), req.userId]);
  res.json(user);
});

router.put("/password", async (req, res) => {
  const current = String(req.body.currentPassword || "");
  const next = String(req.body.newPassword || "");
  const user = await one("SELECT password FROM users WHERE id = $1", [req.userId]);

  if (!bcrypt.compareSync(current, user.password)) return res.status(400).json({ error: "Current password is wrong" });
  if (next.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters" });

  await all("UPDATE users SET password = $1 WHERE id = $2", [bcrypt.hashSync(next, 10), req.userId]);
  res.json({ ok: true });
});

// Delete the account and everything the user owns
router.delete("/", async (req, res) => {
  const password = String(req.body.password || "");
  const user = await one("SELECT password FROM users WHERE id = $1", [req.userId]);
  if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: "Password is wrong" });

  // Remember the uploaded files first, because the database rows are deleted next
  const files = await all("SELECT stored_name FROM attachments WHERE task_id IN (SELECT id FROM tasks WHERE user_id = $1)", [req.userId]);

  await all("DELETE FROM users WHERE id = $1", [req.userId]); // tasks, subtasks, etc. are deleted too
  await removeFiles(files.map((file) => file.stored_name));
  res.status(204).end();
});

export default router;
