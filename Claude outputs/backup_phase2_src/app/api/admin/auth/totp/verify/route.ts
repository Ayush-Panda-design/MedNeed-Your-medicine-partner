import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { requirePending, verifySecondFactor } from "@/server/auth/admin2fa";
import { startSession } from "@/server/auth/session";
import { audit } from "@/server/auth/users";

const schema = z
  .object({ pendingToken: z.string().min(10), code: z.string().trim().optional(), recoveryCode: z.string().trim().max(32).optional() })
  .refine((v) => v.code || v.recoveryCode, { message: "Enter your authentication code" });

export const POST = handle(async (req) => {
  const body = await readJson(req, schema);
  const user = await requirePending(body.pendingToken);
  const result = await verifySecondFactor(user, { code: body.code, recoveryCode: body.recoveryCode });
  if (result.usedRecovery) await audit(user.id, "admin.2fa.recovery_code_used", undefined, clientIp(req));
  await startSession(user, { tfa: true });
  return ok();
});
