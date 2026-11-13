import { z } from "zod";
import { clientIp, handle, ok, readJson, ApiError } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { audit, getUserById, isUniqueViolation, normalizeEmail, publicUser } from "@/server/auth/users";
import { query } from "@/server/db";

export const GET = handle(async () => {
  const claims = await requireApiUser();
  const user = await getUserById(claims.userId);
  if (!user) throw new ApiError(401, "Please sign in to continue.");
  return ok({ user: publicUser(user) });
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80).optional(),
  // An email can be added once (phone or Google-less accounts). Changing an existing email needs verification, which comes later.
  email: z.string().trim().max(254).pipe(z.email("Enter a valid email address")).optional(),
});

export const PATCH = handle(async (req) => {
  const claims = await requireApiUser();
  const body = await readJson(req, schema);
  const user = await getUserById(claims.userId);
  if (!user) throw new ApiError(401, "Please sign in to continue.");

  if (body.email && user.email && normalizeEmail(body.email) !== user.email) {
    throw new ApiError(400, "Changing your email address isn't available yet. Contact support.", "email_change_unsupported");
  }

  try {
    await query(
      `update users set name = coalesce($2, name), email = coalesce(email, $3), updated_at = now() where id = $1`,
      [user.id, body.name ?? null, body.email ? normalizeEmail(body.email) : null],
    );
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "That email is already used by another account.", "email_taken");
    throw err;
  }
  await audit(user.id, "profile.updated", { fields: Object.keys(body) }, clientIp(req));
  return ok({ user: publicUser((await getUserById(user.id))!) });
});
