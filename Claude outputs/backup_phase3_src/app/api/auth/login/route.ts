import { z } from "zod";
import { clientIp, handle, ok, readJson, ApiError } from "@/server/http";
import { startSession } from "@/server/auth/session";
import { audit, getUserByEmail, normalizeEmail, publicUser } from "@/server/auth/users";
import { burnPasswordCheck, verifyPassword } from "@/server/security/password";
import { clearRateLimit, rateLimit } from "@/server/security/rate-limit";

const schema = z.object({ email: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) });
const INVALID = "Incorrect email or password.";

export const POST = handle(async (req) => {
  const body = await readJson(req, schema);
  const ip = clientIp(req);
  const email = normalizeEmail(body.email);
  await rateLimit(`login:email:${email}`, 8, 900, "Too many failed attempts. Try again in 15 minutes.");
  await rateLimit(`login:ip:${ip}`, 40, 900, "Too many attempts from your network. Try again later.");

  const user = await getUserByEmail(email);
  if (!user?.passwordHash) {
    await burnPasswordCheck(body.password);
    await audit(null, "login.failed", { email }, ip);
    throw new ApiError(401, INVALID, "invalid_credentials");
  }
  if (!(await verifyPassword(body.password, user.passwordHash))) {
    await audit(user.id, "login.failed", undefined, ip);
    throw new ApiError(401, INVALID, "invalid_credentials");
  }
  if (user.status !== "active") throw new ApiError(403, "This account has been disabled. Contact support.", "account_disabled");

  await clearRateLimit(`login:email:${email}`);
  await startSession(user);
  return ok({ user: publicUser(user) });
});
