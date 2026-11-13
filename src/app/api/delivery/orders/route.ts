import { handle, ok } from "@/server/http";
import { requireApiDelivery } from "@/server/auth/session";
import { partnerWork } from "@/server/orders/fulfilment";

export const GET = handle(async () => {
  const user = await requireApiDelivery();
  return ok(await partnerWork(user.id), { headers: { "Cache-Control": "no-store" } });
});
