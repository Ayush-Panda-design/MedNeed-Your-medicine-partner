import { handle, ok } from "@/server/http";
import { checkStaff, getClaims } from "@/server/auth/session";
import { eventsSince, latestEventId } from "@/server/live/events";
import { rateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

/** Fallback for networks that block event streams: the same signals, fetched every few seconds. */
export const GET = handle(async (req) => {
  const claims = await getClaims();
  if (!claims) return ok({ events: [], cursor: 0 }, { status: 401 });
  await rateLimit(`livepoll:${claims.userId}`, 60, 60, "Too many requests.");
  const staff = (await checkStaff(claims, ["admin", "pharmacist"])).ok;
  const after = Number(req.nextUrl.searchParams.get("after"));
  if (!Number.isFinite(after) || after <= 0) return ok({ events: [], cursor: await latestEventId() }, { headers: { "Cache-Control": "no-store" } });
  const events = await eventsSince(claims.userId, staff, after);
  return ok({ events, cursor: events.length ? events[events.length - 1].id : after }, { headers: { "Cache-Control": "no-store" } });
});
