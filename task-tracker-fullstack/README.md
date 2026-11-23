# Task Tracker (Full Stack)

React (Vite) + Node/Express REST API, data saved to `server/data.json`.

## Run (development)
```
npm run setup     # install everything (once)
npm run dev       # API on :4000, React on :5173
```
Open http://localhost:5173

## Run (production, single server)
```
npm run build
npm start         # http://localhost:4000 serves API + built React app
```

## API
| Method | Route | Purpose |
|---|---|---|
| GET | /api/tasks | list tasks |
| POST | /api/tasks | create `{title, priority, category, due}` |
| PATCH | /api/tasks/:id | update any field (`done`, `title`, ...) |
| DELETE | /api/tasks/:id | delete one |
| DELETE | /api/tasks?completed=true | clear completed |
