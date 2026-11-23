import { useState } from "react";
import { api } from "../api.js";

const TITLES = {
  login: "Log in to see your tasks",
  register: "Create your account",
  forgot: "Reset your password",
  reset: "Choose a new password",
};

export default function Login({ onLogin, resetToken }) {
  const [mode, setMode] = useState(resetToken ? "reset" : "login"); // login, register, forgot, or reset
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const [busy, setBusy] = useState(false);

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function goTo(newMode) {
    setMode(newMode);
    setError("");
    setMessage("");
    setDevLink("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (mode === "login") {
        onLogin(await api.login(form));
      } else if (mode === "register") {
        onLogin(await api.register(form));
      } else if (mode === "forgot") {
        const data = await api.forgot({ email: form.email });
        setMessage(data.message);
        setDevLink(data.devLink || "");
      } else {
        const data = await api.reset({ token: resetToken, password: form.password });
        window.history.replaceState({}, "", "/"); // remove the code from the address bar
        setMode("login");
        setMessage(data.message);
      }
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={submit}>
        <h1>Task Tracker</h1>
        <p className="muted">{TITLES[mode]}</p>

        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}

        {mode === "register" && (
          <label className="field">
            Name
            <input name="name" value={form.name} onChange={change} autoComplete="name" />
          </label>
        )}
        {mode !== "reset" && (
          <label className="field">
            Email
            <input name="email" type="email" value={form.email} onChange={change} autoComplete="email" />
          </label>
        )}
        {mode !== "forgot" && (
          <label className="field">
            {mode === "reset" ? "New password" : "Password"}
            <input name="password" type="password" value={form.password} onChange={change}
              autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>
        )}

        <button className="btn btn-primary full" type="submit" disabled={busy}>
          {busy ? "Please wait..." : { login: "Log in", register: "Create account", forgot: "Create reset link", reset: "Save new password" }[mode]}
        </button>

        {devLink && (
          <p className="muted small">
            No email is sent while running locally. <a href={devLink}>Open your reset link</a>
          </p>
        )}

        <p className="muted switch">
          {mode === "login" && (
            <>
              <button type="button" className="link" onClick={() => goTo("forgot")}>Forgot password?</button>
              {" | "}
              <button type="button" className="link" onClick={() => goTo("register")}>Register</button>
            </>
          )}
          {mode !== "login" && (
            <button type="button" className="link" onClick={() => goTo("login")}>Back to log in</button>
          )}
        </p>
      </form>
    </div>
  );
}
