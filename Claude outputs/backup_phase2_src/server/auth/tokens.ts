import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import { authSecret } from "../env";
import type { Role } from "./users";

const ISSUER = "medneed";
const key = () => new TextEncoder().encode(authSecret());

export type Claims = { userId: string; sid: string; roles: Role[]; tfa: boolean };

export const ACCESS_TTL_SECONDS = 15 * 60;

export async function signAccess(c: Claims) {
  return new SignJWT({ sid: c.sid, roles: c.roles, tfa: c.tfa })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(c.userId)
    .setIssuer(ISSUER)
    .setAudience("medneed:access")
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(key());
}

export async function verifyAccess(token: string): Promise<Claims | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER, audience: "medneed:access", algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.sid !== "string") return null;
    return { userId: payload.sub, sid: payload.sid, roles: (payload.roles as Role[]) ?? [], tfa: payload.tfa === true };
  } catch {
    return null;
  }
}

/** Short-lived, single-purpose tokens (2FA pending state, OAuth state). Audience binds a token to its purpose. */
export async function signPurpose(purpose: string, claims: Record<string, unknown>, ttlSeconds: number) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(`medneed:${purpose}`)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key());
}

export async function verifyPurpose<T extends JWTPayload = JWTPayload>(purpose: string, token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER, audience: `medneed:${purpose}`, algorithms: ["HS256"] });
    return payload as T;
  } catch {
    return null;
  }
}
