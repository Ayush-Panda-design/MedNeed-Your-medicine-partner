import { z } from "zod";
import { clientIp, handle, ok, readJson, ApiError } from "@/server/http";
import { requireApiUser, revokeUserSessions } from "@/server/auth/session";
import { audit, getUserById } from "@/server/auth/users";
import { hashPassword, passwordProblem, verifyPassword } from "@/server/security/password";
import { rateLimit } from "@/server/security/rate-limit";
import { query } from "@/server/db";

const schema = z.object({ currentPassword: z.string().max(128).optional(), newPassword: z.string().max(128) });

// Set a password (accounts created with OTP/Google that have an email) or change it (needs the current one).
export const POST = handle(async (req) => {
  const claims = await requireApiUser();
  const body = await readJson(req, schema);
  await rateLimit(`password:${claims.userId}`, 10, 900);
  const user = await getUserById(claims.userId);
  if (!user) throw new ApiError(401, "Please sign in to continue.");
  if (!user.email) throw new ApiError(400, "Add an email address to your profile before setting a password.", "email_required");

  if (user.passwordHash) {
    if (!body.currentPassword || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw new ApiError(400, "Your current password is incorrect.", "wrong_password");
    }
  }
  const problem = passwordProblem(body.newPassword, user.email);
  if (problem) throw new ApiError(400, problem, "weak_password");

  await query(`update users set password_hash = $2, updated_at = now() where id = $1`, [user.id, await hashPassword(body.newPassword)]);
  await revokeUserSessions(user.id, claims.sid); // sign out every other device
  await audit(user.id, user.passwordHash ? "password.changed" : "password.set", undefined, clientIp(req));
  return ok();
});
