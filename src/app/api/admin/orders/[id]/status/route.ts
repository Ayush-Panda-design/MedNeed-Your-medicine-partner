import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { advanceOrder } from "@/server/orders/place";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Order not found.");
  const { to } = await readJson(req, z.object({ to: z.enum(["packed", "delivered"]) }));
  await advanceOrder({ id: user.id, ip: clientIp(req), staff: true }, id, to);
  return ok({ updated: true });
});
