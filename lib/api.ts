export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const KEY = "nuri_admin_token";

export function getToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function setToken(t: string) {
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}
export function clearToken() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  body: any;
  constructor(status: number, message: string, code?: string, body?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

type Handlers = { onUnauthorized?: () => void; onMustChange?: () => void };
export const handlers: Handlers = {};

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; query?: Record<string, any> } = {}): Promise<T> {
  let url = API_URL + path;
  if (opts.query) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
    }
    const s = sp.toString();
    if (s) url += (path.includes("?") ? "&" : "?") + s;
  }
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(url, { method: opts.method || "GET", headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  } catch {
    throw new ApiError(0, "서버에 연결할 수 없어요. 잠시 뒤에 다시 시도해 주세요.");
  }
  let data: any = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = null; } }
  if (!res.ok) {
    const msg = (data && (Array.isArray(data.message) ? data.message.join(" ") : data.message)) || "문제가 생겼어요. 다시 시도해 주세요.";
    if (res.status === 401 && token && !path.startsWith("/auth/login")) handlers.onUnauthorized?.();
    if (res.status === 403 && data?.code === "MUST_CHANGE_PASSWORD") handlers.onMustChange?.();
    throw new ApiError(res.status, msg, data?.code, data);
  }
  return data as T;
}

export const get = <T = any>(path: string, query?: Record<string, any>) => api<T>(path, { query });
export const post = <T = any>(path: string, body?: unknown) => api<T>(path, { method: "POST", body: body ?? {} });
export const patch = <T = any>(path: string, body?: unknown) => api<T>(path, { method: "PATCH", body: body ?? {} });
export const del = <T = any>(path: string) => api<T>(path, { method: "DELETE" });

export type Page<T> = { items: T[]; total: number; page: number; size: number };
