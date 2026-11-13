import { ApiError } from "../http";

/*
 * Optional bot check (Cloudflare Turnstile, free) on actions that cost money or invite abuse, such as sending an SMS OTP.
 * Off unless TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are both set, so development and existing setups are unaffected.
 */
export const captchaSiteKey = () => (process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY ? process.env.TURNSTILE_SITE_KEY : null);

export async function requireCaptcha(token: string | undefined, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!captchaSiteKey() || !secret) return;
  if (!token) throw new ApiError(400, "Please complete the security check and try again.", "captcha_required");
  let success = false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(8000) });
    success = Boolean(((await res.json()) as { success?: boolean }).success);
  } catch {
    // Cloudflare unreachable: fail closed for this request; the rate limits still apply when it is back.
    throw new ApiError(503, "The security check is unavailable right now. Please try again in a minute.", "captcha_unavailable");
  }
  if (!success) throw new ApiError(400, "The security check failed. Please try again.", "captcha_failed");
}
