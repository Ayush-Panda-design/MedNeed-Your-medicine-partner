import { NextResponse } from "next/server";
import { handle, ok, publicOrigin, safeNext, ApiError } from "@/server/http";
import { refreshSession } from "@/server/auth/session";

// GET: used by server-rendered pages when the access token expired. Rotates cookies, then returns to the page.
export const GET = handle(async (req) => {
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const admin = req.nextUrl.searchParams.get("admin") === "1";
  const origin = publicOrigin(req);
  const claims = await refreshSession();
  if (claims) return NextResponse.redirect(new URL(next, origin), 303);
  const login = admin ? "/admin/login" : "/login";
  return NextResponse.redirect(new URL(`${login}?next=${encodeURIComponent(next)}`, origin), 303);
});

// POST: used by client code after a 401.
export const POST = handle(async () => {
  const claims = await refreshSession();
  if (!claims) throw new ApiError(401, "Session expired. Please sign in again.", "unauthenticated");
  return ok();
});
