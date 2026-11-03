const BASE = "http://127.0.0.1:5000/api";

export async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  
  if (
    (res.status === 401 || res.status === 422) &&
    token &&
    !path.startsWith("/auth/login")
  ) {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  if (!res.ok) throw new Error(data.error || data.msg || "Request failed");
  return data;
}