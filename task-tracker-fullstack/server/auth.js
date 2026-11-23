// Login check. Every task route uses requireLogin to make sure the user is logged in.
import jwt from "jsonwebtoken";

// Change this secret before you put the app online.
export const SECRET = process.env.JWT_SECRET || "change-this-secret-before-deploying";

export function makeToken(user) {
  return jwt.sign({ id: user.id }, SECRET, { expiresIn: "7d" });
}

export function requireLogin(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  try {
    const data = jwt.verify(token, SECRET);
    req.userId = data.id; // the routes below use this to find the user's own data
    next();
  } catch {
    res.status(401).json({ error: "Please log in again" });
  }
}
