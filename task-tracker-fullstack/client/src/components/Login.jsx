import { useState } from "react";
import { api } from "../api.js";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = isRegister ? await api.register(form) : await api.login(form);
      onLogin(data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={submit}>
        <h1>Task Tracker</h1>
        <p className="muted">{isRegister ? "Create your account" : "Log in to see your tasks"}</p>

        {error && <p className="error">{error}</p>}

        {isRegister && (
          <label className="field">
            Name
            <input name="name" value={form.name} onChange={change} autoComplete="name" />
          </label>
        )}
        <label className="field">
          Email
          <input name="email" type="email" value={form.email} onChange={change} autoComplete="email" />
        </label>
        <label className="field">
          Password
          <input name="password" type="password" value={form.password} onChange={change}
            autoComplete={isRegister ? "new-password" : "current-password"} />
        </label>

        <button className="btn btn-primary full" type="submit" disabled={busy}>
          {busy ? "Please wait..." : isRegister ? "Create account" : "Log in"}
        </button>

        <p className="muted switch">
          {isRegister ? "Already have an account? " : "No account yet? "}
          <button type="button" className="link" onClick={() => { setMode(isRegister ? "login" : "register"); setError(""); }}>
            {isRegister ? "Log in" : "Register"}
          </button>
        </p>
      </form>
    </div>
  );
}
