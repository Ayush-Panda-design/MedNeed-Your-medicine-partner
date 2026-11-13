import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiDelivery } from "@/server/auth/session";
import { failDelivery, failInput } from "@/server/orders/fulfilment";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (req, { params }) => {
  const user = await requireApiDelivery();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Order not found.");
  const { reason, note } = await readJson(req, failInput);
  await failDelivery({ id: user.id, ip: clientIp(req) }, id, reason, note);
  return ok({ failed: true });
});
