# Task Tracker (Full Stack)

A task manager for students. React (Vite) + Node.js/Express + SQLite.

## Features
- Register, log in, forgot password, change password, delete account
- Passwords are hashed (bcrypt), login uses JWT, each user sees only their own tasks
- Dashboard with progress, due today / overdue, last 7 days chart, day streak, focus time
- Board with drag and drop, List with search and tag filter, Calendar view
- Subtasks, notes, tags, repeating tasks (daily / weekly / monthly)
- File attachments (max 5 MB each)
- Share a task with another user (by email) and see its history
- Focus timer (Pomodoro: 25 min focus, 5 min break)
- Reminders (browser notifications), weekly report (Print / Save as PDF), CSV export
- Light and dark mode

## Run on your computer
You need Node.js 20 or newer and a free Supabase project (the database is online even when you work locally).

1. Supabase > SQL Editor > paste `supabase/schema.sql` > Run (only once).
2. Copy `server/.env.example` to `server/.env` and fill in the values (see "Where to find the keys").
3. Run:

        npm run setup     (only the first time)
        npm run dev

Open http://localhost:5173 and register.

## Put it online (Vercel + Supabase)

### Where to find the keys (Supabase)
- `DATABASE_URL`: Project Settings > Database > Connection string > **Transaction pooler** (port 6543). Put your database password in. Do not add `?sslmode=...`.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: Project Settings > API. The service role key is secret. Never put it in the client or on GitHub.
- `JWT_SECRET`: any long random text (for example run `openssl rand -hex 32`).

### Deploy
1. Run `supabase/schema.sql` in the Supabase SQL Editor (creates the tables and the private `attachments` bucket).
2. Push the project to GitHub (the `.gitignore` already skips `node_modules` and `.env`).
3. Vercel > Add New > Project > import the repo. Leave the settings as they are (`vercel.json` has them).
4. Before the first deploy, add these Environment Variables: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `APP_TIMEZONE` (example `Asia/Manila`).
5. Deploy. Check `https://your-app.vercel.app/api/health` shows `{"ok":true}`.

### Good to know
- Uploaded files go to Supabase Storage. Vercel accepts at most 4.5 MB per request, so the file limit is **4 MB**.
- Forgot password: set `RESEND_API_KEY` (free at resend.com), `MAIL_FROM` and `APP_URL` so the link is emailed. Without it, there is no way to receive the link online. With Resend's test sender you can only email your own account address until you verify a domain.
- The login rate limit is kept in memory, so on Vercel it is per server instance (a light protection only).
- Free Supabase projects pause after a week with no activity. Open the dashboard to wake it up.

## Folder guide
    api/index.js           Vercel entry (loads the Express app)
    server/app.js          the Express app
    server/index.js        starts the app on your computer
    server/config.js       settings (from .env / Vercel)
    server/db.js           Postgres connection helpers
    supabase/schema.sql    tables, security, storage bucket
    server/auth.js         login check (JWT)
    server/access.js       which tasks a user can see
    server/files.js        Supabase Storage uploads
    server/routes/         auth, account, tasks, stats, focus
    client/src/App.jsx     main screen, holds the tasks
    client/src/api.js      all server requests
    client/src/components/ one file per screen or popup section

## API
All routes start with /api. Everything except /auth/register, /auth/login,
/auth/forgot and /auth/reset needs the header `Authorization: Bearer <token>`.

| Method | Route | What it does |
|---|---|---|
| POST | /auth/register, /auth/login | create account, log in |
| POST | /auth/forgot, /auth/reset | reset password |
| GET | /auth/me | who is logged in |
| PUT | /account/profile, /account/password | change name, change password |
| DELETE | /account | delete account |
| GET, POST | /tasks | list tasks, add a task |
| PUT, DELETE | /tasks/:id | edit a task, delete a task (owner) |
| POST | /tasks/reorder | save drag and drop order |
| GET | /tasks/:id/activity | task history |
| POST | /tasks/:id/subtasks | add subtask |
| PUT, DELETE | /tasks/subtasks/:id | check or remove subtask |
| POST | /tasks/:id/attachments | upload a file |
| GET, DELETE | /tasks/attachments/:id | download or remove a file |
| POST | /tasks/:id/share | share with an email |
| DELETE | /tasks/:id/share/:userId | stop sharing |
| GET | /stats | dashboard numbers |
| POST | /focus | save a finished focus session |
| GET | /health | check that the server is running |
