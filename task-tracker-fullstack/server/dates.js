// Date helpers. Dates are saved as plain text like "2026-11-23".
// Vercel servers run in UTC, so we always read the date in APP_TIMEZONE (default Asia/Manila).
import { config } from "./config.js";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: config.timezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "2026-11-23" for a moment in time, as seen in the app's timezone
export function dateString(date) {
  return formatter.format(date);
}

export function todayString() {
  return dateString(new Date());
}

// Move a date forward: "daily", "weekly" or "monthly"
export function addToDate(text, repeat) {
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (repeat === "daily") date.setUTCDate(date.getUTCDate() + 1);
  if (repeat === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  if (repeat === "monthly") date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}
