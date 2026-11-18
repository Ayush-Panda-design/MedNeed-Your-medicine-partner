import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handle, publicOrigin, safeNext } from "@/server/http";
import { isProd } from "@/server/env";
import { buildGoogleAuthUrl } from "@/server/auth/google";
import { signPurpose } from "@/server/auth/tokens";

export const GET = handle(async (req) => {
  const origin = publicOrigin(req);
  const flow = buildGoogleAuthUrl(origin);
  if (!flow) return NextResponse.redirect(new URL("/login?error=google_unavailable", origin), 303);

  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const token = await signPurpose("oauth", { state: flow.state, nonce: flow.nonce, verifier: flow.verifier, redirectUri: flow.redirectUri, next }, 600);
  (await cookies()).set("mn_oauth", token, { httpOnly: true, sameSite: "lax", secure: isProd(), path: "/api/auth/google", maxAge: 600 });
  return NextResponse.redirect(flow.url, 303);
});
