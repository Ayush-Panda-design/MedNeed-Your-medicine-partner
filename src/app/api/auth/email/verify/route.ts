import { ApiError, clientIp, handle, ok } from "@/server/http";
import { sendEmailLink } from "@/server/auth/email-links";
import { requireApiUser } from "@/server/auth/session";
import { getUserById } from "@/server/auth/users";
import { rateLimit } from "@/server/security/rate-limit";

/** Send (or resend) the confirmation link to the signed-in user's email. */
export const POST = handle(async (req) => {
  const claims = await requireApiUser();
  await rateLimit(`verify-send:${claims.userId}`, 4, 3600, "We've sent several links already. Check your inbox (and spam), or try again in an hour.");
  await rateLimit(`verify-send:ip:${clientIp(req)}`, 20, 3600, "Too many requests from your network. Try again later.");
  const user = await getUserById(claims.userId);
  if (!user?.email) throw new ApiError(400, "Add an email address to your account first.", "no_email");
  if (user.emailVerified) return ok({ alreadyVerified: true });
  const { devLink } = await sendEmailLink({ id: user.id, name: user.name, email: user.email }, "verify_email");
  return ok({ sent: true, ...(devLink ? { devLink } : {}) });
});
