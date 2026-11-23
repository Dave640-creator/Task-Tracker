import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.js";
import taskRoutes from "./routes/tasks.js";
import statsRoutes from "./routes/stats.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/stats", statsRoutes);

// After "npm run build", the server also serves the React app
const folder = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(folder, "..", "client", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html")));
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));
