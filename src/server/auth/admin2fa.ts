import QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import { query } from "../db";
import { ApiError } from "../http";
import { decrypt, encrypt, hmac } from "../security/crypto";
import { rateLimit } from "../security/rate-limit";
import { base32Encode, generateTotpSecret, otpauthUrl, verifyTotp } from "../security/totp";
import { signPurpose, verifyPurpose } from "./tokens";
import { getUserById, isStaff, type UserRecord } from "./users";

const PENDING_TTL = 600; // 10 minutes between password and second factor

export const signPending = (userId: string) => signPurpose("tfa-pending", { uid: userId }, PENDING_TTL);

export async function requirePending(token: string): Promise<UserRecord> {
  const claims = await verifyPurpose<{ uid: string }>("tfa-pending", token);
  if (!claims?.uid) throw new ApiError(401, "Your sign-in expired. Start again.", "pending_expired");
  const user = await getUserById(claims.uid);
  if (!user || user.status !== "active" || !isStaff(user.roles)) throw new ApiError(401, "Your sign-in expired. Start again.", "pending_expired");
  return user;
}

type TotpRow = { secret_enc: string; confirmed_at: string | null; last_step: number };
export async function getTotp(userId: string) {
  const rows = await query<TotpRow>(`select secret_enc, confirmed_at, last_step from user_totp where user_id = $1`, [userId]);
  return rows[0] ?? null;
}

export async function beginEnrollment(user: UserRecord) {
  const existing = await getTotp(user.id);
  if (existing?.confirmed_at) throw new ApiError(400, "Two-factor authentication is already set up.", "already_enrolled");
  const secret = generateTotpSecret();
  await query(
    `insert into user_totp (user_id, secret_enc, confirmed_at, last_step) values ($1, $2, null, 0)
     on conflict (user_id) do update set secret_enc = excluded.secret_enc, confirmed_at = null, last_step = 0`,
    [user.id, encrypt(secret)],
  );
  const url = otpauthUrl(user.email ?? user.id, secret);
  return { secret, otpauthUrl: url, qr: await QRCode.toDataURL(url, { margin: 1, width: 220 }) };
}

const recoveryHash = (userId: string, code: string) => hmac(`recovery:${userId}:${code.toLowerCase().replace(/[^a-z0-9]/g, "")}`);

function newRecoveryCode() {
  const raw = base32Encode(randomBytes(7)).slice(0, 10).toLowerCase();
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export async function confirmEnrollment(user: UserRecord, code: string) {
  await rateLimit(`totp:${user.id}`, 8, 600, "Too many attempts. Wait a few minutes and try again.");
  const row = await getTotp(user.id);
  if (!row || row.confirmed_at) throw new ApiError(400, "Start two-factor setup again.", "no_enrollment");
  const check = verifyTotp(decrypt(row.secret_enc), code, 0);
  if (!check.ok) throw new ApiError(400, "That code is incorrect. Check your authenticator app and try again.", "totp_invalid");

  const codes = Array.from({ length: 8 }, newRecoveryCode);
  await query(`update user_totp set confirmed_at = now(), last_step = $2 where user_id = $1`, [user.id, check.step]);
  await query(`delete from totp_recovery_codes where user_id = $1`, [user.id]);
  for (const c of codes) await query(`insert into totp_recovery_codes (user_id, code_hash) values ($1, $2)`, [user.id, recoveryHash(user.id, c)]);
  return codes;
}

export async function verifySecondFactor(user: UserRecord, input: { code?: string; recoveryCode?: string }) {
  await rateLimit(`totp:${user.id}`, 8, 600, "Too many attempts. Wait a few minutes and try again.");
  const bad = () => new ApiError(400, "That code is incorrect.", "totp_invalid");

  if (input.recoveryCode) {
    const used = await query(
      `update totp_recovery_codes set used_at = now() where user_id = $1 and code_hash = $2 and used_at is null returning id`,
      [user.id, recoveryHash(user.id, input.recoveryCode)],
    );
    if (!used[0]) throw bad();
    return { usedRecovery: true };
  }

  const row = await getTotp(user.id);
  if (!row?.confirmed_at || !input.code) throw bad();
  const check = verifyTotp(decrypt(row.secret_enc), input.code, row.last_step);
  if (!check.ok) throw bad();
  // The step check above plus this conditional update stops the same code from being used twice.
  const advanced = await query(`update user_totp set last_step = $2 where user_id = $1 and last_step < $2 returning user_id`, [user.id, check.step]);
  if (!advanced[0]) throw bad();
  return { usedRecovery: false };
}

export async function remainingRecoveryCodes(userId: string) {
  const rows = await query<{ n: number }>(`select count(*)::int as n from totp_recovery_codes where user_id = $1 and used_at is null`, [userId]);
  return rows[0].n;
}
