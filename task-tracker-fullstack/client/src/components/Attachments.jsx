import { useState } from "react";
import { api, downloadFile } from "../api.js";
import { formatSize } from "../utils.js";

// Files attached to a task
export default function Attachments({ task, onChange }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action) {
    setError("");
    try {
      await action();
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  async function upload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append("file", file);
    e.target.value = ""; // so the same file can be chosen again later

    setBusy(true);
    await run(() => api.uploadFile(task.id, data));
    setBusy(false);
  }

  return (
    <section className="modal-section">
      <h3>Files</h3>
      {error && <p className="error">{error}</p>}
      {task.attachments.length === 0 && <p className="muted small">No files yet (max 4 MB each).</p>}

      <ul className="plain-list">
        {task.attachments.map((file) => (
          <li key={file.id} className="item-row">
            <span className="file-name">{file.original_name} <span className="muted small">({formatSize(file.size)})</span></span>
            <span className="row-actions">
              <button type="button" className="link" onClick={() => run(() => downloadFile(file))}>Download</button>
              <button type="button" className="link" onClick={() => run(() => api.deleteFile(file.id))}>Remove</button>
            </span>
          </li>
        ))}
      </ul>

      <label className="btn file-button">
        {busy ? "Uploading..." : "Add a file"}
        <input type="file" onChange={upload} disabled={busy} hidden />
      </label>
    </section>
  );
}
