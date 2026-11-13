import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { cancelOrder } from "@/server/orders/place";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (req, { params }) => {
  const claims = await requireApiUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Order not found.");
  const { reason } = await readJson(req, z.object({ reason: z.string().trim().min(3, "Tell us why you are cancelling").max(200) }));
  await cancelOrder({ id: claims.userId, ip: clientIp(req), staff: false }, id, reason);
  return ok({ cancelled: true });
});
