import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { couponInput, createCoupon, listCoupons } from "@/server/orders/coupons";

export const GET = handle(async () => {
  await requireApiStaff(["admin"]);
  return ok({ coupons: await listCoupons() });
});

export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin"]);
  const id = await createCoupon({ id: user.id, ip: clientIp(req) }, await readJson(req, couponInput));
  return ok({ id }, { status: 201 });
});
