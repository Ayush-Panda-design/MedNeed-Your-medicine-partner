import { z } from "zod";
import { clientIp, handle, ok, readJson, ApiError } from "@/server/http";
import { requireApiUser, startSession } from "@/server/auth/session";
import { verifyOtp } from "@/server/auth/otp";
import { audit, createUser, getUserById, getUserByPhone, isUniqueViolation, normalizePhone, publicUser } from "@/server/auth/users";
import { query } from "@/server/db";

const schema = z.object({
  phone: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  purpose: z.enum(["login", "link"]).default("login"),
});

export const POST = handle(async (req) => {
  const { phone: raw, code, purpose } = await readJson(req, schema);
  const phone = normalizePhone(raw);
  if (!phone) throw new ApiError(400, "Enter a valid 10-digit mobile number.", "invalid_phone");
  const ip = clientIp(req);

  if (purpose === "link") {
    const claims = await requireApiUser();
    await verifyOtp(phone, "link", code);
    try {
      const updated = await query(`update users set phone = $2, phone_verified = true, updated_at = now() where id = $1 and phone is null returning id`, [claims.userId, phone]);
      if (!updated[0]) throw new ApiError(400, "A mobile number is already linked to this account.");
    } catch (err) {
      if (isUniqueViolation(err)) throw new ApiError(409, "That number is already used by another account.");
      throw err;
    }
    await audit(claims.userId, "phone.linked", undefined, ip);
    return ok({ user: publicUser((await getUserById(claims.userId))!) });
  }

  await verifyOtp(phone, "login", code);

  let user = await getUserByPhone(phone);
  if (!user) {
    try {
      user = await createUser({ phone, phoneVerified: true });
      await audit(user.id, "user.created.phone", undefined, ip);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      user = await getUserByPhone(phone);
    }
  }
  if (!user) throw new ApiError(500, "Could not create your account.");
  if (user.status !== "active") throw new ApiError(403, "This account has been disabled. Contact support.", "account_disabled");

  await startSession(user);
  return ok({ user: publicUser(user), isNew: !user.name });
});
