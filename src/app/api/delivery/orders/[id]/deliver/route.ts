import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiDelivery } from "@/server/auth/session";
import { completeDelivery, completeInput } from "@/server/orders/fulfilment";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (req, { params }) => {
  const user = await requireApiDelivery();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Order not found.");
  const input = await readJson(req, completeInput);
  await completeDelivery({ id: user.id, ip: clientIp(req) }, id, input);
  return ok({ delivered: true });
});
