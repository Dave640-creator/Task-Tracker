// All settings are in one place. Values come from the .env file or the hosting website (Vercel).
import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || "change-this-secret-before-deploying",
  databaseUrl: process.env.DATABASE_URL || "",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  bucket: "attachments",
  maxFileSize: 4 * 1024 * 1024, // Vercel functions accept at most 4.5 MB per request
  timezone: process.env.APP_TIMEZONE || "Asia/Manila", // Vercel servers run in UTC, so "today" must use this
  corsOrigin: process.env.CORS_ORIGIN || "", // empty means any website can call the API
  resendKey: process.env.RESEND_API_KEY || "",
  mailFrom: process.env.MAIL_FROM || "Task Tracker <onboarding@resend.dev>",
  appUrl: (process.env.APP_URL || "").replace(/\/$/, ""),
  isProduction,
};

if (!config.databaseUrl) console.warn("WARNING: DATABASE_URL is not set.");
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("Set JWT_SECRET before running online.");
}
