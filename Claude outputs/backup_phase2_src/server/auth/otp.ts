import { randomInt } from "node:crypto";
import { query } from "../db";
import { ApiError } from "../http";
import { hmac, safeEqual } from "../security/crypto";
import { rateLimit } from "../security/rate-limit";
import { isProd } from "../env";
import { sendSms, smsIsConsole } from "./sms";

export type OtpPurpose = "login" | "link";

const TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;

const codeHash = (phone: string, purpose: OtpPurpose, code: string) => hmac(`otp:${phone}:${purpose}:${code}`);

export async function sendOtp(phone: string, purpose: OtpPurpose, ip: string) {
  await rateLimit(`otp:send:phone:${phone}`, 5, 3600, "Too many codes requested for this number. Try again in an hour.");
  await rateLimit(`otp:send:ip:${ip}`, 20, 3600, "Too many requests from your network. Try again later.");

  const recent = await query<{ age: number }>(
    `select extract(epoch from (now() - created_at))::int as age from otp_codes
     where phone = $1 and purpose = $2 order by created_at desc limit 1`,
    [phone, purpose],
  );
  if (recent[0] && recent[0].age < RESEND_COOLDOWN_SECONDS) {
    throw new ApiError(429, `Please wait ${RESEND_COOLDOWN_SECONDS - recent[0].age}s before requesting another code.`, "otp_cooldown");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await query(`update otp_codes set consumed_at = now() where phone = $1 and purpose = $2 and consumed_at is null`, [phone, purpose]);
  await query(
    `insert into otp_codes (phone, purpose, code_hash, expires_at) values ($1, $2, $3, now() + make_interval(mins => $4::int))`,
    [phone, purpose, codeHash(phone, purpose, code), TTL_MINUTES],
  );
  await sendSms(phone, `${code} is your MedNeed verification code. It is valid for ${TTL_MINUTES} minutes. Do not share it with anyone.`);

  // Only in development with the console driver, so the UI can show the code without reading the terminal.
  return { devOtp: !isProd() && smsIsConsole() ? code : undefined, expiresInSeconds: TTL_MINUTES * 60 };
}

export async function verifyOtp(phone: string, purpose: OtpPurpose, code: string) {
  await rateLimit(`otp:verify:phone:${phone}`, 15, 3600, "Too many attempts. Request a new code in a while.");
  const fail = () => new ApiError(400, "That code is incorrect or has expired.", "otp_invalid");

  const rows = await query<{ id: string; code_hash: string; attempts: number }>(
    `select id, code_hash, attempts from otp_codes
     where phone = $1 and purpose = $2 and consumed_at is null and expires_at > now()
     order by created_at desc limit 1`,
    [phone, purpose],
  );
  const row = rows[0];
  if (!row) throw fail();

  if (row.attempts >= MAX_ATTEMPTS) {
    await query(`update otp_codes set consumed_at = now() where id = $1`, [row.id]);
    throw new ApiError(429, "Too many wrong attempts. Please request a new code.", "otp_locked");
  }

  await query(`update otp_codes set attempts = attempts + 1 where id = $1`, [row.id]);
  if (!safeEqual(row.code_hash, codeHash(phone, purpose, code))) throw fail();

  const used = await query(`update otp_codes set consumed_at = now() where id = $1 and consumed_at is null returning id`, [row.id]);
  if (!used[0]) throw fail();
}
