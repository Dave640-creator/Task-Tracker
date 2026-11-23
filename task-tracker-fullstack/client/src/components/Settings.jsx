import { useState } from "react";
import { api } from "../api.js";

// A small message under a form. type is "ok" or "error".
function Notice({ notice }) {
  if (!notice) return null;
  return <p className={notice.type === "ok" ? "success" : "error"}>{notice.text}</p>;
}

export default function Settings({ user, onUserChange, onLogout }) {
  const [name, setName] = useState(user.name);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [profileNotice, setProfileNotice] = useState(null);
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [deleteNotice, setDeleteNotice] = useState(null);

  async function saveProfile(e) {
    e.preventDefault();
    try {
      onUserChange(await api.updateProfile({ name }));
      setProfileNotice({ type: "ok", text: "Name saved." });
    } catch (err) {
      setProfileNotice({ type: "error", text: err.message });
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    try {
      await api.changePassword(passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      setPasswordNotice({ type: "ok", text: "Password changed." });
    } catch (err) {
      setPasswordNotice({ type: "error", text: err.message });
    }
  }

  async function deleteAccount(e) {
    e.preventDefault();
    if (!window.confirm("Delete your account and all your tasks? This cannot be undone.")) return;
    try {
      await api.deleteAccount(deletePassword);
      onLogout();
    } catch (err) {
      setDeleteNotice({ type: "error", text: err.message });
    }
  }

  return (
    <div className="settings">
      <h1 className="page-title">Settings</h1>
      <p className="muted">Logged in as {user.email}</p>

      <section className="panel">
        <h2>Profile</h2>
        <form onSubmit={saveProfile}>
          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <Notice notice={profileNotice} />
          <button className="btn btn-primary" type="submit">Save name</button>
        </form>
      </section>

      <section className="panel">
        <h2>Change password</h2>
        <form onSubmit={savePassword}>
          <label className="field">
            Current password
            <input type="password" value={passwords.currentPassword} autoComplete="current-password"
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
          </label>
          <label className="field">
            New password
            <input type="password" value={passwords.newPassword} autoComplete="new-password"
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
          </label>
          <Notice notice={passwordNotice} />
          <button className="btn btn-primary" type="submit">Change password</button>
        </form>
      </section>

      <section className="panel">
        <h2>Session</h2>
        <p className="muted">Log out of this device.</p>
        <button className="btn" onClick={onLogout}>Log out</button>
      </section>

      <section className="panel">
        <h2>Delete account</h2>
        <p className="muted">This deletes your account, your tasks, and your files. Enter your password to continue.</p>
        <form onSubmit={deleteAccount}>
          <label className="field">
            Password
            <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} autoComplete="current-password" />
          </label>
          <Notice notice={deleteNotice} />
          <button className="btn btn-danger" type="submit">Delete my account</button>
        </form>
      </section>
    </div>
  );
}
