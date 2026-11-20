import { handle } from "@/server/http";
import { checkStaff, getClaims } from "@/server/auth/session";
import { eventsSince, latestEventId, pruneEvents } from "@/server/live/events";
import { rateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// One connection lives for under a minute; the browser reconnects by itself and resumes from the last signal it saw.
export const maxDuration = 60;

const LIFETIME_MS = 50_000;
const TICK_MS = 4_000; // same pace as the polling fallback; halves the database reads per signed-in visitor
const HEARTBEAT_MS = 15_000;

/**
 * Server-sent events: the server pushes a small "something changed" signal the moment it is recorded.
 * It works on serverless hosting (Vercel) where WebSockets cannot be held open, and the browser reconnects automatically.
 * Only signed-in people can listen, and each person only ever receives signals addressed to them (or, for staff, the staff ones).
 */
export const GET = handle(async (req) => {
  const claims = await getClaims();
  if (!claims) return new Response("Sign in to receive live updates.", { status: 401, headers: { "Cache-Control": "no-store" } });
  await rateLimit(`live:${claims.userId}`, 90, 60, "Too many live connections.");
  const staff = (await checkStaff(claims, ["admin", "pharmacist"])).ok;

  const header = Number(req.headers.get("last-event-id"));
  const query = Number(req.nextUrl.searchParams.get("after"));
  let cursor = Number.isFinite(header) && header > 0 ? header : Number.isFinite(query) && query > 0 ? query : await latestEventId();

  const enc = new TextEncoder();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      const started = Date.now();
      let lastBeat = started;
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) clearTimeout(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", close);
      const send = (s: string) => {
        if (!closed) controller.enqueue(enc.encode(s));
      };

      send(`id: ${cursor}\nretry: 1500\nevent: hello\ndata: ${JSON.stringify({ cursor, staff })}\n\n`);

      const tick = async () => {
        if (closed) return;
        try {
          const events = await eventsSince(claims.userId, staff, cursor);
          for (const e of events) {
            cursor = e.id;
            send(`id: ${e.id}\nevent: signal\ndata: ${JSON.stringify({ topic: e.topic, ...e.payload })}\n\n`);
          }
          if (Date.now() - lastBeat > HEARTBEAT_MS) {
            lastBeat = Date.now();
            send(`: keep-alive\n\n`);
          }
          if (Date.now() - started > LIFETIME_MS) return close();
          void pruneEvents();
        } catch {
          return close(); // the browser will reconnect
        }
        timer = setTimeout(tick, TICK_MS);
      };
      timer = setTimeout(tick, 400);
    },
    cancel() {
      if (timer) clearTimeout(timer);
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
});

