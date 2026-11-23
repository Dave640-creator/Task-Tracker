// All talking to the server happens in this file.

// Online, if the React app is on a different website than the API,
// set VITE_API_URL (see README). Locally this stays empty.
const BASE = (import.meta.env.VITE_API_URL || "") + "/api";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

async function request(path, method = "GET", body) {
  const headers = { Authorization: "Bearer " + getToken() };
  let payload;

  if (body instanceof FormData) {
    payload = body; // used for file uploads
  } else if (body) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(BASE + path, { method, headers, body: payload });
  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Something went wrong");
    error.status = response.status;
    throw error;
  }
  return data;
}

export const api = {
  // Account
  register: (form) => request("/auth/register", "POST", form),
  login: (form) => request("/auth/login", "POST", form),
  forgot: (form) => request("/auth/forgot", "POST", form),
  reset: (form) => request("/auth/reset", "POST", form),
  me: () => request("/auth/me"),
  updateProfile: (form) => request("/account/profile", "PUT", form),
  changePassword: (form) => request("/account/password", "PUT", form),
  deleteAccount: (password) => request("/account", "DELETE", { password }),

  // Tasks
  getTasks: () => request("/tasks"),
  createTask: (task) => request("/tasks", "POST", task),
  updateTask: (id, changes) => request("/tasks/" + id, "PUT", changes),
  deleteTask: (id) => request("/tasks/" + id, "DELETE"),
  reorder: (items) => request("/tasks/reorder", "POST", { items }),
  getActivity: (id) => request("/tasks/" + id + "/activity"),

  // Subtasks
  addSubtask: (taskId, title) => request("/tasks/" + taskId + "/subtasks", "POST", { title }),
  updateSubtask: (id, changes) => request("/tasks/subtasks/" + id, "PUT", changes),
  deleteSubtask: (id) => request("/tasks/subtasks/" + id, "DELETE"),

  // Sharing
  share: (taskId, email) => request("/tasks/" + taskId + "/share", "POST", { email }),
  unshare: (taskId, userId) => request("/tasks/" + taskId + "/share/" + userId, "DELETE"),

  // Files
  uploadFile: (taskId, formData) => request("/tasks/" + taskId + "/attachments", "POST", formData),
  deleteFile: (id) => request("/tasks/attachments/" + id, "DELETE"),

  // Numbers
  getStats: () => request("/stats"),
  logFocus: (form) => request("/focus", "POST", form),
};

// Download a file. We use fetch so the login token is sent with the request.
export async function downloadFile(file) {
  const response = await fetch(BASE + "/tasks/attachments/" + file.id, {
    headers: { Authorization: "Bearer " + getToken() },
  });
  if (!response.ok) throw new Error("Could not download the file");

  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = file.original_name;
  link.click();
  URL.revokeObjectURL(link.href);
}
