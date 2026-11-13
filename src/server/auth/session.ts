import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "../db";
import { isProd } from "../env";
import { ApiError } from "../http";
import { randomToken, sha256 } from "../security/crypto";
import { ACCESS_TTL_SECONDS, signAccess, verifyAccess, type Claims } from "./tokens";
import { audit, getRoles, getUserById, STAFF_ROLES, type Role, type UserRecord } from "./users";

const AT = "mn_at"; // short-lived access JWT
const RT = "mn_rt"; // opaque refresh token, only ever sent to /api/auth/*
const REFRESH_DAYS = 30;
const ROTATION_GRACE_MS = 15_000;

const base = () => ({ httpOnly: true, sameSite: "lax" as const, secure: isProd() });

async function setCookies(accessToken: string, refreshToken?: string) {
  const jar = await cookies();
  jar.set(AT, accessToken, { ...base(), path: "/", maxAge: ACCESS_TTL_SECONDS });
  if (refreshToken) jar.set(RT, refreshToken, { ...base(), path: "/api/auth", maxAge: REFRESH_DAYS * 86400 });
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.set(AT, "", { ...base(), path: "/", maxAge: 0 });
  jar.set(RT, "", { ...base(), path: "/api/auth", maxAge: 0 });
}

async function requestMeta() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

/** Create a session for a user and set cookies. `tfa` is true only after a second factor was verified. */
export async function startSession(user: Pick<UserRecord, "id" | "roles">, opts: { tfa?: boolean } = {}) {
  const tfa = opts.tfa === true;
  const refresh = randomToken(32);
  const meta = await requestMeta();
  const rows = await query<{ id: string }>(
    `insert into sessions (user_id, refresh_hash, tfa_verified, user_agent, ip, expires_at)
     values ($1, $2, $3, $4, $5, now() + make_interval(days => $6::int)) returning id`,
    [user.id, sha256(refresh), tfa, meta.userAgent, meta.ip, REFRESH_DAYS],
  );
  const accessToken = await signAccess({ userId: user.id, sid: rows[0].id, roles: user.roles, tfa });
  await setCookies(accessToken, refresh);
  await query(`update users set last_login_at = now() where id = $1`, [user.id]);
  await audit(user.id, tfa ? "login.success.2fa" : "login.success", undefined, meta.ip ?? undefined);
  return rows[0].id;
}

async function claimsForSession(sessionId: string): Promise<Claims | null> {
  const rows = await query<{ user_id: string; tfa_verified: boolean }>(
    `select s.user_id, s.tfa_verified from sessions s join users u on u.id = s.user_id
     where s.id = $1 and s.revoked_at is null and s.expires_at > now() and u.status = 'active'`,
    [sessionId],
  );
  if (!rows[0]) return null;
  return { userId: rows[0].user_id, sid: sessionId, roles: await getRoles(rows[0].user_id), tfa: rows[0].tfa_verified };
}

/**
 * Exchange the refresh cookie for a new access token and a rotated refresh token.
 * Presenting an already-rotated refresh token outside the grace window is treated as theft and revokes the session.
 * Only callable from route handlers (it sets cookies).
 */
export async function refreshSession(): Promise<Claims | null> {
  const jar = await cookies();
  const presented = jar.get(RT)?.value;
  if (!presented) return null;
  const hash = sha256(presented);

  const current = await query<{ id: string }>(
    `select s.id from sessions s join users u on u.id = s.user_id
     where s.refresh_hash = $1 and s.revoked_at is null and s.expires_at > now() and u.status = 'active'`,
    [hash],
  );

  if (!current[0]) {
    const prev = await query<{ id: string; rotated_at: string | null }>(
      `select id, rotated_at from sessions where prev_refresh_hash = $1 and revoked_at is null`,
      [hash],
    );
    if (!prev[0]) {
      await clearAuthCookies();
      return null;
    }
    const recent = prev[0].rotated_at && Date.now() - new Date(prev[0].rotated_at).getTime() < ROTATION_GRACE_MS;
    if (recent) {
      // Two parallel requests raced to refresh. The winner already set the new refresh cookie; just mint an access token.
      const claims = await claimsForSession(prev[0].id);
      if (!claims) return null;
      await setCookies(await signAccess(claims));
      return claims;
    }
    await query(`update sessions set revoked_at = now() where id = $1`, [prev[0].id]);
    await audit(null, "session.refresh_reuse_detected", { sessionId: prev[0].id });
    await clearAuthCookies();
    return null;
  }

  const next = randomToken(32);
  const rotated = await query<{ id: string }>(
    `update sessions set refresh_hash = $2, prev_refresh_hash = $1, rotated_at = now(), last_used_at = now(),
       expires_at = now() + make_interval(days => $4::int)
     where id = $3 and refresh_hash = $1 returning id`,
    [hash, sha256(next), current[0].id, REFRESH_DAYS],
  );
  const claims = await claimsForSession(current[0].id);
  if (!claims) return null;
  await setCookies(await signAccess(claims), rotated[0] ? next : undefined);
  return claims;
}

export async function getAccessClaims(): Promise<Claims | null> {
  const token = (await cookies()).get(AT)?.value;
  return token ? verifyAccess(token) : null;
}

/** For route handlers: valid access token, or transparently refresh. */
export async function getClaims(): Promise<Claims | null> {
  return (await getAccessClaims()) ?? (await refreshSession());
}

export async function revokeCurrentSession() {
  const jar = await cookies();
  const claims = await getAccessClaims();
  if (claims) await query(`update sessions set revoked_at = now() where id = $1`, [claims.sid]);
  const rt = jar.get(RT)?.value;
  if (rt) await query(`update sessions set revoked_at = now() where refresh_hash = $1 or prev_refresh_hash = $1`, [sha256(rt)]);
  await clearAuthCookies();
}

export async function revokeUserSessions(userId: string, exceptSessionId?: string) {
  await query(`update sessions set revoked_at = now() where user_id = $1 and revoked_at is null and ($2::uuid is null or id <> $2::uuid)`, [
    userId,
    exceptSessionId ?? null,
  ]);
}

/* ---------- Route handler guards ---------- */

export async function requireApiUser(): Promise<Claims> {
  const claims = await getClaims();
  if (!claims) throw new ApiError(401, "Please sign in to continue.", "unauthenticated");
  return claims;
}

type StaffCheck = { ok: true; claims: Claims; user: UserRecord } | { ok: false; reason: "no_session" | "no_tfa" | "forbidden" };

/** Staff access always re-checks the database: session still valid, user active, roles current, 2FA completed. */
export async function checkStaff(claims: Claims | null, allowed: Role[] = STAFF_ROLES): Promise<StaffCheck> {
  if (!claims) return { ok: false, reason: "no_session" };
  if (!claims.tfa) return { ok: false, reason: "no_tfa" };
  const fresh = await claimsForSession(claims.sid);
  if (!fresh || fresh.userId !== claims.userId || !fresh.tfa) return { ok: false, reason: "no_session" };
  if (!fresh.roles.some((r) => allowed.includes(r))) return { ok: false, reason: "forbidden" };
  const user = await getUserById(claims.userId);
  if (!user || user.status !== "active") return { ok: false, reason: "no_session" };
  return { ok: true, claims: fresh, user };
}

export async function requireApiStaff(allowed: Role[] = STAFF_ROLES) {
  const check = await checkStaff(await getClaims(), allowed);
  if (check.ok) return check;
  if (check.reason === "forbidden") throw new ApiError(403, "You do not have permission to do that.", "forbidden");
  if (check.reason === "no_tfa") throw new ApiError(403, "Two-factor sign-in required.", "tfa_required");
  throw new ApiError(401, "Please sign in to continue.", "unauthenticated");
}

/**
 * Delivery staff sign in like customers (mobile OTP, no 2FA) and may only use the delivery screens.
 * Like staff access, this re-checks the database every time: session still valid, user active, role still held.
 */
async function deliveryCheck(claims: Claims | null): Promise<{ ok: true; user: UserRecord } | { ok: false; reason: "no_session" | "forbidden" }> {
  if (!claims) return { ok: false, reason: "no_session" };
  const fresh = await claimsForSession(claims.sid);
  if (!fresh || fresh.userId !== claims.userId) return { ok: false, reason: "no_session" };
  if (!fresh.roles.includes("delivery")) return { ok: false, reason: "forbidden" };
  const user = await getUserById(claims.userId);
  if (!user || user.status !== "active") return { ok: false, reason: "no_session" };
  return { ok: true, user };
}

export async function requireApiDelivery() {
  const check = await deliveryCheck(await getClaims());
  if (check.ok) return check.user;
  if (check.reason === "forbidden") throw new ApiError(403, "You do not have permission to do that.", "forbidden");
  throw new ApiError(401, "Please sign in to continue.", "unauthenticated");
}

/* ---------- Server component guards ---------- */

/** Server components cannot set cookies, so an expired access token bounces through /api/auth/refresh. */
export async function requireUser(next: string): Promise<Claims> {
  const claims = await getAccessClaims();
  if (!claims) redirect(`/api/auth/refresh?next=${encodeURIComponent(next)}`);
  return claims;
}

export async function requireStaff(next: string, allowed: Role[] = STAFF_ROLES) {
  const claims = await getAccessClaims();
  if (!claims) redirect(`/api/auth/refresh?next=${encodeURIComponent(next)}&admin=1`);
  const check = await checkStaff(claims, allowed);
  if (check.ok) return check;
  if (check.reason === "forbidden") redirect("/admin/login?error=forbidden");
  redirect(`/admin/login?next=${encodeURIComponent(next)}`);
}

export async function requireDelivery(next: string) {
  const claims = await getAccessClaims();
  if (!claims) redirect(`/api/auth/refresh?next=${encodeURIComponent(next)}`);
  const check = await deliveryCheck(claims);
  if (check.ok) return check.user;
  if (check.reason === "forbidden") redirect("/");
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
