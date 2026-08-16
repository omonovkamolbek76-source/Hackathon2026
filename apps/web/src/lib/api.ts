const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bos_access");
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem("bos_access", access);
  localStorage.setItem("bos_refresh", refresh);
}

export function clearTokens() {
  localStorage.removeItem("bos_access");
  localStorage.removeItem("bos_refresh");
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || "Request failed");
  }
  return res.json() as Promise<T>;
}
