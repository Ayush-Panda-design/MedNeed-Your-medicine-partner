import { handle, ok } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { listOrdersForUser } from "@/server/orders/queries";

export const GET = handle(async () => {
  const claims = await requireApiUser();
  return ok({ orders: await listOrdersForUser(claims.userId) });
});
