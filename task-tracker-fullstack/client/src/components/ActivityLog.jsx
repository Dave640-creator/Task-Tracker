import { useEffect, useState } from "react";
import { api } from "../api.js";
import { formatDateTime } from "../utils.js";

// History of a task: who did what, and when
export default function ActivityLog({ task }) {
  const [rows, setRows] = useState([]);

  // Load again every time the task changes
  useEffect(() => {
    api.getActivity(task.id).then(setRows).catch(() => {});
  }, [task]);

  return (
    <section className="modal-section">
      <h3>History</h3>
      {rows.length === 0 && <p className="muted small">No history yet.</p>}
      <ul className="plain-list history">
        {rows.map((row, index) => (
          <li key={index}>
            <span><strong>{row.name}</strong> {row.text}</span>
            <span className="muted small">{formatDateTime(row.created_at)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
