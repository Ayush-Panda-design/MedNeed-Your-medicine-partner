import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { emailLinksAvailable, sendEmailLink } from "@/server/auth/email-links";
import { audit, getUserByEmail, normalizeEmail } from "@/server/auth/users";
import { rateLimit } from "@/server/security/rate-limit";
import { ApiError } from "@/server/http";

const schema = z.object({ email: z.string().trim().max(254).pipe(z.email("Enter a valid email address")) });

/** Always answers the same way whether or not the account exists, so it cannot be used to find out who is registered. */
export const POST = handle(async (req) => {
  const body = await readJson(req, schema);
  const ip = clientIp(req);
  const email = normalizeEmail(body.email);
  await rateLimit(`pwreset:ip:${ip}`, 10, 3600, "Too many requests from your network. Try again later.");
  await rateLimit(`pwreset:email:${email}`, 3, 3600, "We've already sent several links to this address. Check your inbox (and spam), or try again in an hour.");
  if (!emailLinksAvailable()) throw new ApiError(503, "Password reset by email isn't available yet. Please call the store and we'll help you.", "email_unavailable");

  const user = await getUserByEmail(email);
  let devLink: string | undefined;
  if (user && user.status === "active" && user.email) {
    devLink = (await sendEmailLink({ id: user.id, name: user.name, email: user.email }, "reset_password")).devLink;
    await audit(user.id, "user.password_reset.requested", undefined, ip);
  }
  return ok({ sent: true, ...(devLink ? { devLink } : {}) });
});
