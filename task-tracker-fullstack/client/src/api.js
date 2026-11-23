// All talking to the server happens in this file.

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

async function request(path, method = "GET", body) {
  const response = await fetch("/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + getToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

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
  register: (form) => request("/auth/register", "POST", form),
  login: (form) => request("/auth/login", "POST", form),
  me: () => request("/auth/me"),

  getTasks: () => request("/tasks"),
  createTask: (task) => request("/tasks", "POST", task),
  updateTask: (id, changes) => request("/tasks/" + id, "PUT", changes),
  deleteTask: (id) => request("/tasks/" + id, "DELETE"),
  reorder: (items) => request("/tasks/reorder", "POST", { items }),

  addSubtask: (taskId, title) => request("/tasks/" + taskId + "/subtasks", "POST", { title }),
  updateSubtask: (id, changes) => request("/tasks/subtasks/" + id, "PUT", changes),
  deleteSubtask: (id) => request("/tasks/subtasks/" + id, "DELETE"),

  getStats: () => request("/stats"),
};
