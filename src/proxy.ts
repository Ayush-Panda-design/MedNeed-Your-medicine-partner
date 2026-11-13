import { NextResponse, type NextRequest } from "next/server";

/*
 * Staging gate. When STAGING_BASIC_AUTH="user:password" is set, every page and API asks for that username and
 * password (browser Basic Auth) and tells search engines not to index anything. Leave it unset on the live site.
 *
 * Not gated, because machines call them with their own protection:
 *   /api/health                     uptime checks (returns only ok/not ok)
 *   /api/payments/razorpay/webhook  Razorpay, verified by its HMAC signature
 *   /api/internal/*                 the scheduled job, protected by CRON_SECRET
 */
const OPEN = ["/api/health", "/api/payments/razorpay/webhook", "/api/internal/"];

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function proxy(req: NextRequest) {
  const expected = process.env.STAGING_BASIC_AUTH;
  if (!expected) return NextResponse.next();

  const path = req.nextUrl.pathname;
  if (OPEN.some((p) => path === p || (p.endsWith("/") && path.startsWith(p)))) return NextResponse.next();

  const header = req.headers.get("authorization") ?? "";
  let given = "";
  if (header.startsWith("Basic ")) {
    try {
      given = atob(header.slice(6));
    } catch {
      given = "";
    }
  }
  if (!safeEqual(given, expected)) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="MedNeed staging", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow" },
    });
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Everything except Next's static build assets (those contain no data and are fingerprinted).
  matcher: ["/((?!_next/static|_next/image).*)"],
};
