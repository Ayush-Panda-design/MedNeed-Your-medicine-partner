import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { pickBatch } from "@/server/orders/fulfilment";

type Ctx = { params: Promise<{ id: string }> };

// Confirm (batchNo given) or un-confirm (batchNo null) one batch on the packing screen.
export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Order not found.");
  const { rowId, batchNo } = await readJson(req, z.object({ rowId: z.uuid(), batchNo: z.string().trim().min(1, "Enter the batch number").max(60).nullable() }));
  await pickBatch({ id: user.id, ip: clientIp(req) }, id, rowId, batchNo);
  return ok({ updated: true });
});
