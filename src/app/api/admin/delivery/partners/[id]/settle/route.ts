import { z } from "zod";
import { ApiError, clientIp, handle, ok } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { settleCash } from "@/server/orders/fulfilment";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Delivery person not found.");
  return ok(await settleCash({ id: user.id, ip: clientIp(req) }, id));
});
