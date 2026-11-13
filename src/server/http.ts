import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

/**
 * The caller's IP for rate limits and session records.
 * X-Forwarded-For is "client, proxy1, proxy2": each proxy appends the address it received the request from, so the
 * left-most entries are whatever the client chose to send. TRUSTED_PROXY_HOPS (default 1: one load balancer or
 * reverse proxy in front of the app) says how many entries from the right were written by our own infrastructure;
 * the entry at that position is the real client. Set 0 when the app is reached directly with no proxy.
 */
export function ipFromHeaders(h: Headers): string | null {
  const hops = Math.max(0, Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "1", 10) || 0);
  if (hops > 0) {
    const chain = (h.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (chain.length) return chain[Math.max(0, chain.length - hops)];
    const real = h.get("x-real-ip")?.trim();
    if (real) return real;
  }
  return null;
}

export function clientIp(req: Request) {
  return ipFromHeaders(req.headers) ?? "unknown";
}

/** CSRF defence in depth on top of SameSite=Lax cookies: browser POSTs must come from our own origin. */
export function assertSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      /* invalid origin header */
    }
    if (!host || originHost !== host) throw new ApiError(403, "Cross-origin request blocked.");
    return;
  }
  if (req.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "Cross-origin request blocked.");
}

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON.");
  }
  return schema.parse(body);
}

export function handle<C = unknown>(fn: (req: NextRequest, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      if (err instanceof ZodError) {
        const issue = err.issues[0];
        // Our schemas carry human-readable messages. Only fall back to naming the field for zod's generic ones.
        const generic = !issue?.message || issue.message.startsWith("Invalid");
        const field = generic && issue?.path?.length ? `${issue.path.join(".")}: ` : "";
        return NextResponse.json({ error: `${field}${issue?.message ?? "Invalid input."}`, code: "invalid_input" }, { status: 400 });
      }
      console.error("[api] Unhandled error", err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export const ok = (data: unknown = { ok: true }, init?: ResponseInit) => NextResponse.json(data, init);

/** Only allow same-site relative redirects after login. */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

/** Origin the browser used, honouring a reverse proxy's forwarded headers. Used for same-site redirects. */
export function publicOrigin(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}
