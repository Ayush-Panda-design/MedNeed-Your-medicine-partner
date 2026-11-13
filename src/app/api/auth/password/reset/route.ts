import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { consumeEmailLink } from "@/server/auth/email-links";
import { revokeUserSessions } from "@/server/auth/session";
import { audit } from "@/server/auth/users";
import { hashPassword, passwordProblem } from "@/server/security/password";
import { clearRateLimit, rateLimit } from "@/server/security/rate-limit";

const schema = z.object({ token: z.string().max(200), password: z.string().max(128) });

export const POST = handle(async (req) => {
  const body = await readJson(req, schema);
  const ip = clientIp(req);
  await rateLimit(`pwreset-use:ip:${ip}`, 20, 3600, "Too many attempts from your network. Try again later.");

  // Hash before the transaction (scrypt is slow); the email is checked against the password inside it.
  const hashed = await hashPassword(body.password);
  const result = await consumeEmailLink(body.token, "reset_password", async (t, row) => {
    const problem = passwordProblem(body.password, row.email);
    if (problem) throw new ApiError(400, problem, "weak_password");
    // Following the emailed link also proves the address belongs to them.
    await t.query(`update users set password_hash = $2, email_verified = true, updated_at = now() where id = $1`, [row.userId, hashed]);
    return row;
  });
  if (!result) throw new ApiError(400, "This link has expired or was already used. Ask for a new one.", "link_invalid");

  // A reset means the old password may be known to someone else: sign out every device.
  await revokeUserSessions(result.userId);
  await clearRateLimit(`login:email:${result.email.toLowerCase()}`);
  await audit(result.userId, "user.password_reset.completed", undefined, ip);
  return ok({ reset: true });
});
