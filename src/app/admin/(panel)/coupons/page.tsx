import type { Metadata } from "next";
import { requireStaff } from "@/server/auth/session";
import { listCoupons } from "@/server/orders/coupons";
import { CouponManager } from "./CouponManager";

export const metadata: Metadata = { title: "Coupons" };
export const dynamic = "force-dynamic";

export default async function CouponsPage() {
  await requireStaff("/admin/coupons", ["admin"]);
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Coupons</h1><p className="mt-1 text-sm text-slate-500">Discount codes customers type at checkout. A cancelled or expired order gives its coupon use back.</p></div>
      <CouponManager coupons={await listCoupons()} />
    </div>
  );
}
