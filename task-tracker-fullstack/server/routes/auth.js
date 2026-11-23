import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { one, all } from "../db.js";
import { config } from "../config.js";
import { makeToken, requireLogin } from "../auth.js";
import { canSendMail, sendResetEmail } from "../mail.js";

const router = Router();

// Stops people from trying thousands of passwords
router.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));

// We only save a scrambled copy of the reset code
function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// Create a new account
router.post("/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!email.includes("@")) return res.status(400).json({ error: "Enter a valid email" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const exists = await one("SELECT id FROM users WHERE email = $1", [email]);
  if (exists) return res.status(400).json({ error: "That email is already registered" });

  // Never save the real password. Save a hashed (scrambled) version.
  const hashed = bcrypt.hashSync(password, 10);
  const created = await one("INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id", [name.slice(0, 60), email, hashed]);

  const user = { id: created.id, name: name.slice(0, 60), email };
  res.status(201).json({ token: makeToken(user), user });
});

// Log in
router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const found = await one("SELECT * FROM users WHERE email = $1", [email]);
  if (!found || !bcrypt.compareSync(password, found.password)) {
    return res.status(401).json({ error: "Wrong email or password" });
  }

  const user = { id: found.id, name: found.name, email: found.email };
  res.json({ token: makeToken(user), user });
});

// Forgot password: make a reset link that works for 30 minutes
router.post("/forgot", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = await one("SELECT id FROM users WHERE email = $1", [email]);
  const reply = { message: "If that email is registered, a reset link was created." };

  if (user) {
    const code = crypto.randomBytes(24).toString("hex");
    const expires = Date.now() + 30 * 60 * 1000;
    await all("UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3", [hashCode(code), expires, user.id]);

    const link = "/?reset=" + code;
    if (canSendMail()) {
      // Online: send the link by email (set RESEND_API_KEY and APP_URL)
      await sendResetEmail(email, (config.appUrl || "") + link);
    } else if (!config.isProduction) {
      // Local testing without email: show the link on the screen
      console.log("Password reset link for " + email + ": " + link);
      reply.devLink = link;
    }
  }
  res.json(reply);
});

// Save the new password from the reset link
router.post("/reset", async (req, res) => {
  const code = String(req.body.token || "");
  const password = String(req.body.password || "");
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  const user = await one("SELECT id FROM users WHERE reset_token = $1 AND reset_expires > $2", [hashCode(code), Date.now()]);
  if (!user) return res.status(400).json({ error: "This reset link is not valid or has expired" });

  await all("UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2", [bcrypt.hashSync(password, 10), user.id]);
  res.json({ message: "Password updated. You can log in now." });
});

// Who is logged in right now?
router.get("/me", requireLogin, async (req, res) => {
  const user = await one("SELECT id, name, email FROM users WHERE id = $1", [req.userId]);
  if (!user) return res.status(401).json({ error: "Please log in again" });
  res.json(user);
});

export default router;
