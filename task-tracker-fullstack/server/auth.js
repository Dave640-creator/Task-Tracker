// Login check. Every task route uses requireLogin to make sure the user is logged in.
import jwt from "jsonwebtoken";
import { config } from "./config.js";

export function makeToken(user) {
  return jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: "7d" });
}

export function requireLogin(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  try {
    const data = jwt.verify(token, config.jwtSecret);
    req.userId = data.id; // the routes use this to find the user's own data
    next();
  } catch {
    res.status(401).json({ error: "Please log in again" });
  }
}
