import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { cancelOrder } from "@/server/orders/place";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Order not found.");
  const { reason } = await readJson(req, z.object({ reason: z.string().trim().min(3, "Give a reason").max(200) }));
  await cancelOrder({ id: user.id, ip: clientIp(req), staff: true }, id, reason);
  return ok({ cancelled: true });
});
