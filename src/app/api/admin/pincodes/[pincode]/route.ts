import { ApiError, clientIp, handle, ok } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { audit } from "@/server/auth/users";
import { query } from "@/server/db";

type Ctx = { params: Promise<{ pincode: string }> };

export const DELETE = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin"]);
  const { pincode } = await params;
  if (!/^[1-9]\d{5}$/.test(pincode)) throw new ApiError(404, "Pincode not found.");
  const gone = await query(`delete from service_pincodes where pincode = $1 returning pincode`, [pincode]);
  if (!gone[0]) throw new ApiError(404, "Pincode not found.");
  await audit(user.id, "orders.pincode.deleted", { pincode }, clientIp(req));
  return ok({ deleted: true });
});
