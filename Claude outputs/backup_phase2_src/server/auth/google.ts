import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { db } from "../db";
import { appUrl, googleConfig } from "../env";
import { randomToken } from "../security/crypto";
import { audit, createUser, getUserByEmail, getUserById, isUniqueViolation, type UserRecord } from "./users";

/**
 * "Sign in with Google" using the OAuth 2.0 authorization code flow with PKCE and OpenID Connect.
 * Setup: create an OAuth client (Web application) in Google Cloud Console and add this redirect URI:
 *   {APP_URL}/api/auth/google/callback
 * then set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
 */
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export const googleRedirectUri = () => `${appUrl()}/api/auth/google/callback`;

export function buildGoogleAuthUrl() {
  const cfg = googleConfig();
  if (!cfg) return null;
  const state = randomToken(24);
  const nonce = randomToken(24);
  const verifier = randomToken(48);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), state, nonce, verifier };
}

type GoogleProfile = { sub: string; email?: string; emailVerified: boolean; name?: string; picture?: string };

export async function exchangeGoogleCode(code: string, verifier: string, nonce: string): Promise<GoogleProfile> {
  const cfg = googleConfig();
  if (!cfg) throw new Error("Google sign-in is not configured");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const tokens = (await res.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error("Google did not return an id_token");

  const { payload } = await jwtVerify(tokens.id_token, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: cfg.clientId,
  });
  if (payload.nonce !== nonce) throw new Error("Google nonce mismatch");

  return {
    sub: String(payload.sub),
    email: typeof payload.email === "string" ? payload.email.toLowerCase() : undefined,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

/** Find, link or create the local user for a verified Google identity. */
export async function resolveGoogleUser(profile: GoogleProfile, ip?: string): Promise<UserRecord> {
  const database = await db();

  const linked = await database.query<{ user_id: string }>(`select user_id from identities where provider = 'google' and provider_user_id = $1`, [profile.sub]);
  if (linked[0]) {
    const user = await getUserById(linked[0].user_id);
    if (user) return user;
  }

  if (!profile.email || !profile.emailVerified) throw new Error("Your Google account has no verified email address.");

  const existing = await getUserByEmail(profile.email);
  if (existing) {
    // Account-takeover guard: if the existing account's email was never verified, someone may have pre-registered it with a
    // password they know. Google has proven ownership, so mark it verified and discard that password.
    await database.tx(async (t) => {
      await t.query(`insert into identities (user_id, provider, provider_user_id, email) values ($1, 'google', $2, $3) on conflict do nothing`, [existing.id, profile.sub, profile.email]);
      await t.query(
        `update users set email_verified = true,
           password_hash = case when email_verified then password_hash else null end,
           name = coalesce(name, $2), avatar_url = coalesce(avatar_url, $3), updated_at = now()
         where id = $1`,
        [existing.id, profile.name ?? null, profile.picture ?? null],
      );
    });
    await audit(existing.id, "identity.google.linked", undefined, ip);
    return (await getUserById(existing.id))!;
  }

  try {
    const user = await createUser({ name: profile.name ?? null, email: profile.email, emailVerified: true, avatarUrl: profile.picture ?? null });
    await database.query(`insert into identities (user_id, provider, provider_user_id, email) values ($1, 'google', $2, $3)`, [user.id, profile.sub, profile.email]);
    await audit(user.id, "user.created.google", undefined, ip);
    return user;
  } catch (err) {
    if (isUniqueViolation(err)) {
      const retry = await getUserByEmail(profile.email);
      if (retry) return retry;
    }
    throw err;
  }
}
