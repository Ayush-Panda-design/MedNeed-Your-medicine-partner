import { z } from "zod";
import { clientIp, handle, ok, readJson, ApiError } from "@/server/http";
import { startSession } from "@/server/auth/session";
import { emailLinksAvailable, sendEmailLink } from "@/server/auth/email-links";
import { audit, createUser, getUserByEmail, isUniqueViolation, normalizeEmail, publicUser } from "@/server/auth/users";
import { hashPassword, passwordProblem } from "@/server/security/password";
import { rateLimit } from "@/server/security/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().max(254).pipe(z.email("Enter a valid email address")),
  password: z.string().max(128),
});

export const POST = handle(async (req) => {
  const body = await readJson(req, schema);
  const ip = clientIp(req);
  await rateLimit(`register:ip:${ip}`, 10, 3600, "Too many sign-ups from your network. Try again later.");

  const email = normalizeEmail(body.email);
  const problem = passwordProblem(body.password, email);
  if (problem) throw new ApiError(400, problem, "weak_password");

  if (await getUserByEmail(email)) {
    throw new ApiError(409, "An account with this email already exists. Try signing in instead.", "email_taken");
  }

  try {
    const user = await createUser({ name: body.name, email, passwordHash: await hashPassword(body.password) });
    await audit(user.id, "user.created.email", undefined, ip);
    await startSession(user);
    // Best effort: the account works without it, and the link can be re-sent from the account page.
    let devLink: string | undefined;
    if (emailLinksAvailable()) {
      try {
        devLink = (await sendEmailLink({ id: user.id, name: user.name, email }, "verify_email")).devLink;
      } catch (e) {
        console.error("[auth] verification email failed:", (e as Error).message);
      }
    }
    return ok({ user: publicUser(user), ...(devLink ? { verifyLink: devLink } : {}) }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, "An account with this email already exists. Try signing in instead.", "email_taken");
    throw err;
  }
});
