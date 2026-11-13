import { z } from "zod";
import { clientIp, handle, ok, readJson, ApiError } from "@/server/http";
import { getTotp, signPending } from "@/server/auth/admin2fa";
import { audit, getUserByEmail, isStaff, normalizeEmail } from "@/server/auth/users";
import { burnPasswordCheck, verifyPassword } from "@/server/security/password";
import { clearRateLimit, rateLimit } from "@/server/security/rate-limit";

const schema = z.object({ email: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) });
const INVALID = "Incorrect email or password.";

// Step 1 of staff sign-in. Never creates a session: it returns a short-lived token that is only good for the 2FA step.
export const POST = handle(async (req) => {
  const body = await readJson(req, schema);
  const ip = clientIp(req);
  const email = normalizeEmail(body.email);
  await rateLimit(`admin-login:email:${email}`, 6, 900, "Too many failed attempts. Try again in 15 minutes.");
  await rateLimit(`admin-login:ip:${ip}`, 20, 900, "Too many attempts from your network. Try again later.");

  const user = await getUserByEmail(email);
  if (!user?.passwordHash || !isStaff(user.roles)) {
    await burnPasswordCheck(body.password);
    await audit(null, "admin.login.failed", { email }, ip);
    throw new ApiError(401, INVALID, "invalid_credentials");
  }
  if (!(await verifyPassword(body.password, user.passwordHash))) {
    await audit(user.id, "admin.login.failed", undefined, ip);
    throw new ApiError(401, INVALID, "invalid_credentials");
  }
  if (user.status !== "active") throw new ApiError(403, "This account has been disabled.", "account_disabled");

  await clearRateLimit(`admin-login:email:${email}`);
  const totp = await getTotp(user.id);
  return ok({ status: totp?.confirmed_at ? "totp_required" : "enroll_required", pendingToken: await signPending(user.id) });
});
