// The Express app. Locally it is started by index.js. On Vercel it is started by api/index.js.
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/account.js";
import taskRoutes from "./routes/tasks.js";
import statsRoutes from "./routes/stats.js";
import focusRoutes from "./routes/focus.js";

const app = express();
app.set("trust proxy", 1); // needed when the app runs behind a hosting website

// If CORS_ORIGIN is set, only those websites can call the API
const origins = config.corsOrigin ? config.corsOrigin.split(",").map((o) => o.trim()) : true;
app.use(cors({ origin: origins }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/focus", focusRoutes);
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));

// After "npm run build", this server can also serve the React app (when not on Vercel)
const folder = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(folder, "..", "client", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Last safety net: if something unexpected breaks, do not crash
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

export default app;
