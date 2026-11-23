import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../db.js";
import { makeToken, requireLogin } from "../auth.js";

const router = Router();

// Create a new account
router.post("/register", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!email.includes("@")) return res.status(400).json({ error: "Enter a valid email" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) return res.status(400).json({ error: "That email is already registered" });

  // Never save the real password. Save a hashed (scrambled) version.
  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)").run(name, email, hashed);

  const user = { id: result.lastInsertRowid, name, email };
  res.status(201).json({ token: makeToken(user), user });
});

// Log in
router.post("/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const found = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!found || !bcrypt.compareSync(password, found.password)) {
    return res.status(401).json({ error: "Wrong email or password" });
  }

  const user = { id: found.id, name: found.name, email: found.email };
  res.json({ token: makeToken(user), user });
});

// Who is logged in right now?
router.get("/me", requireLogin, (req, res) => {
  const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(401).json({ error: "Please log in again" });
  res.json(user);
});

export default router;
