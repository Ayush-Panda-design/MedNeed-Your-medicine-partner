import { z } from "zod";
import { clientIp, handle, ok, readJson, ApiError } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { sendOtp } from "@/server/auth/otp";
import { getUserById, getUserByPhone, normalizePhone } from "@/server/auth/users";

const schema = z.object({ phone: z.string().min(1), purpose: z.enum(["login", "link"]).default("login") });

export const POST = handle(async (req) => {
  const { phone: raw, purpose } = await readJson(req, schema);
  const phone = normalizePhone(raw);
  if (!phone) throw new ApiError(400, "Enter a valid 10-digit mobile number.", "invalid_phone");

  if (purpose === "link") {
    const claims = await requireApiUser();
    const me = await getUserById(claims.userId);
    if (!me) throw new ApiError(401, "Please sign in to continue.");
    if (me.phone) throw new ApiError(400, "A mobile number is already linked to this account.");
    if (await getUserByPhone(phone)) throw new ApiError(409, "That number is already used by another account.");
  }

  const result = await sendOtp(phone, purpose, clientIp(req));
  return ok({ ok: true, ...result });
});
