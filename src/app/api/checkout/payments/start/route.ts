import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { getUserById } from "@/server/auth/users";
import { ApiError } from "@/server/http";
import { rateLimit } from "@/server/security/rate-limit";
import { startPayment } from "@/server/payments/service";

export const POST = handle(async (req) => {
  const claims = await requireApiUser();
  await rateLimit(`paystart:${claims.userId}`, Number(process.env.PAYMENT_RATE_LIMIT) || 20, 600, "Too many payment attempts. Please wait a few minutes.");
  const { orderId } = await readJson(req, z.object({ orderId: z.uuid() }));
  const user = await getUserById(claims.userId);
  if (!user) throw new ApiError(401, "Please sign in again.");
  return ok(await startPayment({ id: user.id, name: user.name, email: user.email, phone: user.phone }, orderId, clientIp(req)));
});
