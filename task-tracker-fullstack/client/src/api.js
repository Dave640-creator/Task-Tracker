async function req(path, opts = {}) {
  const res = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  list: () => req("/tasks"),
  create: (body) => req("/tasks", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => req("/tasks/" + id, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id) => req("/tasks/" + id, { method: "DELETE" }),
  clearDone: () => req("/tasks?completed=true", { method: "DELETE" }),
};
