import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { couponInput, updateCoupon } from "@/server/orders/coupons";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "Coupon not found.");
  await updateCoupon({ id: user.id, ip: clientIp(req) }, id, await readJson(req, couponInput));
  return ok({ updated: true });
});
