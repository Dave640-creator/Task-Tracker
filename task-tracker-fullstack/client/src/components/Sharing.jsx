import { useState } from "react";
import { api } from "../api.js";

// Share a task with other people. They must already have an account.
export default function Sharing({ task, user, onChange }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function run(action) {
    setError("");
    try {
      await action();
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  function share(e) {
    e.preventDefault();
    if (!email.trim()) return;
    run(() => api.share(task.id, email));
    setEmail("");
  }

  return (
    <section className="modal-section">
      <h3>Sharing</h3>
      {error && <p className="error">{error}</p>}

      {/* People who got this task from someone else see who owns it */}
      {!task.is_owner && (
        <p className="muted small">
          This task belongs to {task.owner_name}.{" "}
          <button type="button" className="link" onClick={() => run(() => api.unshare(task.id, user.id))}>Leave task</button>
        </p>
      )}

      {task.members.length === 0 && task.is_owner && <p className="muted small">Not shared with anyone.</p>}

      <ul className="plain-list">
        {task.members.map((person) => (
          <li key={person.id} className="item-row">
            <span>{person.name} <span className="muted small">{person.email}</span></span>
            {(task.is_owner || person.id === user.id) && (
              <button type="button" className="link" onClick={() => run(() => api.unshare(task.id, person.id))}>Remove</button>
            )}
          </li>
        ))}
      </ul>

      {task.is_owner && (
        <form className="inline-form" onSubmit={share}>
          <input type="email" placeholder="Their email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email to share with" />
          <button type="submit" className="btn">Share</button>
        </form>
      )}
    </section>
  );
}
