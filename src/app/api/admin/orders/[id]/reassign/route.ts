import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { reassignOrder } from "@/server/orders/fulfilment";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Order not found.");
  const { partnerId } = await readJson(req, z.object({ partnerId: z.uuid() }));
  await reassignOrder({ id: user.id, ip: clientIp(req) }, id, partnerId);
  return ok({ updated: true });
});
