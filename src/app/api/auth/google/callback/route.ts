import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clientIp, handle, publicOrigin, safeNext } from "@/server/http";
import { exchangeGoogleCode, resolveGoogleUser } from "@/server/auth/google";
import { startSession } from "@/server/auth/session";
import { verifyPurpose } from "@/server/auth/tokens";
import { isProd } from "@/server/env";

export const GET = handle(async (req) => {
  const origin = publicOrigin(req);
  const to = (path: string) => NextResponse.redirect(new URL(path, origin), 303);
  const jar = await cookies();
  const stored = jar.get("mn_oauth")?.value;
  jar.set("mn_oauth", "", { httpOnly: true, sameSite: "lax", secure: isProd(), path: "/api/auth/google", maxAge: 0 });

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return to("/login?error=google_denied");

  const flow = stored ? await verifyPurpose<{ state: string; nonce: string; verifier: string; redirectUri?: string; next: string }>("oauth", stored) : null;
  const code = params.get("code");
  if (!flow || !code || params.get("state") !== flow.state) return to("/login?error=google_failed");

  try {
    const profile = await exchangeGoogleCode(code, flow.verifier, flow.nonce, flow.redirectUri);
    const user = await resolveGoogleUser(profile, clientIp(req));
    if (user.status !== "active") return to("/login?error=account_disabled");
    await startSession(user);
    return to(safeNext(flow.next));
  } catch (err) {
    console.error("[auth] Google sign-in failed:", err);
    return to("/login?error=google_failed");
  }
});
