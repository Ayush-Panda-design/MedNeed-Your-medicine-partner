import { z } from "zod";
import { ApiError, clientIp, handle, ok } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { removePartner } from "@/server/orders/fulfilment";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Delivery person not found.");
  await removePartner({ id: user.id, ip: clientIp(req) }, id);
  return ok({ removed: true });
});
