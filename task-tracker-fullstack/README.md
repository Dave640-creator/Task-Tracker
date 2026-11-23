# Task Tracker (Full Stack)

A task manager for students. Built with React (Vite), Node.js + Express, and SQLite.

## Features
1. Register and log in (each user sees only their own tasks)
2. Real database (SQLite, saved in `server/tasks.db`)
3. Passwords are hashed with bcrypt
4. Dashboard: due today / overdue, summary numbers, tasks finished in the last 7 days, day streak
5. Subtasks (checklist inside a task)
6. Calendar view of due dates
7. Reminders (browser notifications for overdue, due today, due tomorrow)
8. Board with drag and drop (To do, In progress, Done)
9. Export: CSV file, or Print / Save as PDF

## How to run
You need Node.js 18 or newer.

    npm run setup     (only the first time)
    npm run dev

Open http://localhost:5173 and register an account.

## Production (one server)

    npm run build
    npm start         (http://localhost:4000)

Set your own secret first:  JWT_SECRET=any-long-random-text

## Folder guide
    server/index.js        starts the server
    server/db.js           database tables
    server/auth.js         login check (JWT)
    server/routes/         auth.js, tasks.js, stats.js
    client/src/App.jsx     main screen, holds the tasks
    client/src/api.js      all server requests
    client/src/components/ one file per screen (Board, Calendar, ...)
