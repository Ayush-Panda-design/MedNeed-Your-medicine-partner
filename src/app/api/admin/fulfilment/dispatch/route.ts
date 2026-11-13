import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { dispatchOrders } from "@/server/orders/fulfilment";

export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const { orderIds, partnerId } = await readJson(req, z.object({ orderIds: z.array(z.uuid()).min(1, "Choose at least one order").max(30), partnerId: z.uuid() }));
  await dispatchOrders({ id: user.id, ip: clientIp(req) }, orderIds, partnerId);
  return ok({ dispatched: orderIds.length });
});
