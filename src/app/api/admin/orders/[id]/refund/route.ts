import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { query } from "@/server/db";
import { retryRefund } from "@/server/payments/refunds";

type Ctx = { params: Promise<{ id: string }> };

// Admin: try a refund again that failed on our side (for example, the payment service was unreachable).
export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Order not found.");
  await readJson(req, z.object({}).passthrough());
  const r = (await query<{ id: string }>(`select id from refunds where order_id = $1 and status = 'failed' and attempts < 8`, [id]))[0];
  if (!r) throw new ApiError(409, "There is no failed refund to retry on this order.", "nothing_to_retry");
  const result = await retryRefund(user.id, r.id, clientIp(req));
  return ok({ result });
});
