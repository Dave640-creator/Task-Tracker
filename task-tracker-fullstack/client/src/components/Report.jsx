import { useEffect, useState } from "react";
import { api } from "../api.js";
import { daysFromToday, formatDate, isOverdue, todayString } from "../utils.js";

// A summary of the last 7 days. Use "Print / Save as PDF" to keep a copy.
export default function Report({ tasks, user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, [tasks]);

  const weekStart = daysFromToday(-6);
  const finished = tasks
    .filter((t) => t.status === "done" && t.completed_at && t.completed_at >= weekStart)
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  const overdue = tasks.filter(isOverdue);
  const stillOpen = tasks.filter((t) => t.status !== "done").length;

  return (
    <div>
      <div className="page-head no-print">
        <h1 className="page-title">Weekly report</h1>
        <button className="btn" onClick={() => window.print()}>Print / Save as PDF</button>
      </div>

      <div className="report panel">
        <h2 className="report-title">Weekly report for {user.name}</h2>
        <p className="muted">{formatDate(weekStart)} to {formatDate(todayString())}</p>

        <table className="table summary">
          <tbody>
            <tr><td>Tasks finished</td><td>{finished.length}</td></tr>
            <tr><td>Tasks still open</td><td>{stillOpen}</td></tr>
            <tr><td>Overdue tasks</td><td>{overdue.length}</td></tr>
            <tr><td>Focus time</td><td>{stats ? stats.focusMinutes + " min" : "..."}</td></tr>
            <tr><td>Day streak</td><td>{stats ? stats.streak : "..."}</td></tr>
          </tbody>
        </table>

        <h3 className="report-heading">Finished this week</h3>
        {finished.length === 0 ? (
          <p className="muted">No finished tasks in the last 7 days.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Task</th><th>Category</th><th>Finished</th></tr></thead>
            <tbody>
              {finished.map((task) => (
                <tr key={task.id}><td>{task.title}</td><td>{task.category}</td><td>{formatDate(task.completed_at)}</td></tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 className="report-heading">Overdue</h3>
        {overdue.length === 0 ? (
          <p className="muted">Nothing is overdue.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Task</th><th>Category</th><th>Was due</th></tr></thead>
            <tbody>
              {overdue.map((task) => (
                <tr key={task.id}><td>{task.title}</td><td>{task.category}</td><td>{formatDate(task.due)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
