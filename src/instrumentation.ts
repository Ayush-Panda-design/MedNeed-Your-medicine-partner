/*
 * Server error reporting. Next.js calls onRequestError for every uncaught error while rendering a page,
 * running a route handler, server action or proxy. We:
 *   1. write one structured JSON line to the log (searchable in any log viewer: look for "medneed_error");
 *   2. if ALERT_WEBHOOK_URL is set (a Slack or Discord incoming-webhook URL), post a short alert, at most once
 *      per distinct error every 10 minutes so a crash loop cannot flood the channel.
 * No request bodies, cookies or query strings are reported: they can hold personal data or one-time tokens.
 */

export function register() {}

const lastSent = new Map<string, number>();
const QUIET_MS = 10 * 60 * 1000;

type ReqInfo = { path: string; method: string };
type Ctx = { routerKind: string; routePath: string; routeType: string };

export async function onRequestError(err: unknown, request: ReqInfo, context: Ctx) {
  const e = err as Error & { digest?: string };
  const path = (request.path ?? "").split("?")[0];
  const line = {
    level: "error",
    event: "medneed_error",
    time: new Date().toISOString(),
    method: request.method,
    path,
    route: context.routePath,
    routeType: context.routeType,
    message: (e?.message ?? String(err)).slice(0, 500),
    digest: e?.digest,
    stack: e?.stack?.split("\n").slice(0, 8).join("\n"),
  };
  console.error(JSON.stringify(line));

  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  const key = `${context.routePath}|${line.message.slice(0, 120)}`;
  const now = Date.now();
  if ((lastSent.get(key) ?? 0) > now - QUIET_MS) return;
  lastSent.set(key, now);
  if (lastSent.size > 500) lastSent.clear();
  const text = `MedNeed error on ${process.env.APP_URL ?? "server"}\n${request.method} ${context.routePath} (${context.routeType})\n${line.message}${line.digest ? `\ndigest ${line.digest}` : ""}`;
  try {
    // "text" is read by Slack, "content" by Discord; each ignores the other.
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, content: text.slice(0, 1900) }), signal: AbortSignal.timeout(5000) });
  } catch {
    // Alerting must never break the request or crash the process.
  }
}
