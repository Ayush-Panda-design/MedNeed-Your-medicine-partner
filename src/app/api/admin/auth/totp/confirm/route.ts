import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { confirmEnrollment, requirePending } from "@/server/auth/admin2fa";
import { startSession } from "@/server/auth/session";
import { audit } from "@/server/auth/users";

export const POST = handle(async (req) => {
  const { pendingToken, code } = await readJson(req, z.object({ pendingToken: z.string().min(10), code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }));
  const user = await requirePending(pendingToken);
  const recoveryCodes = await confirmEnrollment(user, code);
  await audit(user.id, "admin.2fa.enrolled", undefined, clientIp(req));
  await startSession(user, { tfa: true });
  return ok({ recoveryCodes });
});
