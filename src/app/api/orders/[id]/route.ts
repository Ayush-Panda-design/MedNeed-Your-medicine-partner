import { ApiError, handle, ok } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { getOrderDetail } from "@/server/orders/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  const claims = await requireApiUser();
  const order = await getOrderDetail((await params).id, { userId: claims.userId });
  if (!order) throw new ApiError(404, "Order not found.");
  return ok({ order });
});
