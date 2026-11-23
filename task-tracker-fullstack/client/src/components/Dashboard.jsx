import { useEffect, useState } from "react";
import { api } from "../api.js";
import { enableReminders } from "../useReminders.js";
import { formatDate, todayString } from "../utils.js";

export default function Dashboard({ tasks, user, onOpen }) {
  const [stats, setStats] = useState(null);
  const [permission, setPermission] = useState("Notification" in window ? Notification.permission : "unsupported");

  // Get fresh numbers from the server whenever the tasks change
  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, [tasks]);

  // Tasks that need attention: not done, and due today or earlier
  const urgent = tasks
    .filter((t) => t.status !== "done" && t.due !== "" && t.due <= todayString())
    .sort((a, b) => a.due.localeCompare(b.due));

  async function turnOnReminders() {
    setPermission(await enableReminders());
  }

  if (!stats) return <p className="muted">Loading...</p>;

  const highest = Math.max(1, ...stats.last7days.map((d) => d.count));
  const percentDone = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);
  const firstName = user.name.split(" ")[0];

  return (
    <div>
      <h1 className="page-title">Hello, {firstName}</h1>
      <p className="muted greeting">
        {urgent.length === 0 ? "Nothing is due today. Nice work." : urgent.length + " task(s) need your attention."}
      </p>

      <div className="two-columns">
        <section className="panel">
          <div className="panel-head">
            <h2>Due today and overdue</h2>
            {permission === "default" && (
              <button className="btn" onClick={turnOnReminders}>Turn on reminders</button>
            )}
            {permission === "granted" && <span className="muted small">Browser reminders are on</span>}
            {permission === "denied" && <span className="muted small">Reminders are blocked in browser settings</span>}
          </div>

          {urgent.length === 0 ? (
            <p className="muted">Nothing is due. You are all caught up.</p>
          ) : (
            <ul className="plain-list">
              {urgent.map((task) => (
                <li key={task.id}>
                  <button className="row-button" onClick={() => onOpen(task.id)}>
                    <span>{task.title}</span>
                    <span className={task.due < todayString() ? "overdue" : "muted"}>
                      {task.due < todayString() ? "Overdue, " : "Today, "}
                      {formatDate(task.due)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Progress</h2>
          <div className="progress"><div className="progress-fill" style={{ width: percentDone + "%" }} /></div>
          <p className="muted small progress-text">{percentDone}% of your tasks are done</p>
          <table className="table summary">
            <tbody>
              <tr><td>To do</td><td>{stats.todo}</td></tr>
              <tr><td>In progress</td><td>{stats.doing}</td></tr>
              <tr><td>Done</td><td>{stats.done}</td></tr>
              <tr><td>Overdue</td><td className={stats.overdue > 0 ? "overdue" : ""}>{stats.overdue}</td></tr>
              <tr><td>All tasks</td><td>{stats.total}</td></tr>
              <tr><td>Day streak</td><td>{stats.streak}</td></tr>
              <tr><td>Focus time (7 days)</td><td>{stats.focusMinutes} min</td></tr>
            </tbody>
          </table>
        </section>
      </div>

      <section className="panel">
        <h2>Tasks finished in the last 7 days</h2>
        <div className="chart">
          {stats.last7days.map((day) => (
            <div className="chart-column" key={day.date}>
              <span className="chart-count">{day.count}</span>
              <div className="chart-bar" style={{ height: (day.count / highest) * 100 + "%" }} />
              <span className="chart-label">
                {new Date(day.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" })}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
