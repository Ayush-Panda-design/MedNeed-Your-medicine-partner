import { z } from "zod";
import { clientIp, handle, ok, readJson, ApiError } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { audit, createUser, getUserByEmail, isUniqueViolation, normalizeEmail, publicUser } from "@/server/auth/users";
import { hashPassword, passwordProblem } from "@/server/security/password";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().max(254).pipe(z.email("Enter a valid email address")),
  password: z.string().max(128),
  roles: z.array(z.enum(["admin", "pharmacist", "inventory_manager"])).min(1, "Choose at least one role"),
});

// Admin-only: create a staff account. The new person sets up 2FA at their first sign-in.
export const POST = handle(async (req) => {
  const { user: actor } = await requireApiStaff(["admin"]);
  const body = await readJson(req, schema);
  const email = normalizeEmail(body.email);
  const problem = passwordProblem(body.password, email);
  if (problem) throw new ApiError(400, problem, "weak_password");
  if (await getUserByEmail(email)) throw new ApiError(409, "An account with this email already exists.", "email_taken");

  try {
    const user = await createUser({
      name: body.name,
      email,
      emailVerified: true,
      passwordHash: await hashPassword(body.password),
      roles: Array.from(new Set(["customer", ...body.roles])) as never,
    });
    await audit(actor.id, "admin.staff.created", { userId: user.id, roles: body.roles }, clientIp(req));
    return ok({ user: publicUser(user) }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "An account with this email already exists.", "email_taken");
    throw err;
  }
});
