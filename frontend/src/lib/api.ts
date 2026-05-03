const API_URL = "http://localhost:3000";

interface TaskFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  sort?: string;
  order?: string;
}

export type TaskType = "write_article";

async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
    throw new Error("Not authenticated");
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message);
  }

  return await res.json();
}

export const register = async (username: string, password: string) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Registration failed");
  }

  return await res.json();
};

export const login = async (username: string, password: string) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Login failed");
  }

  return await res.json();
};

export const getTasks = async (filters: TaskFilters = {}) => {
  const params = new URLSearchParams();

  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 10));

  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.order) params.set("order", filters.order);

  return authFetch(`${API_URL}/api/tasks?${params.toString()}`);
};

export const createTask = async (type: TaskType, topic: string) => {
  return authFetch(`${API_URL}/api/tasks`, {
    method: "POST",
    body: JSON.stringify({ type, input: { topic } }),
  });
};
