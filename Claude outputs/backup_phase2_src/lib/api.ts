export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; code?: string };

/** Small fetch wrapper for our JSON API. Never throws: returns { ok: false, error } with a user-friendly message. */
export async function api<T = Record<string, unknown>>(url: string, init: { method?: string; body?: unknown } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: data.error ?? "Something went wrong. Please try again.", code: data.code };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 0, error: "Network problem. Check your connection and try again." };
  }
}

export const displayName = (u: { name: string | null; email: string | null; phone: string | null }) =>
  u.name?.trim() || u.email?.split("@")[0] || (u.phone ? `+91 ${u.phone.slice(-10, -6)}••••${u.phone.slice(-2)}` : "Account");
