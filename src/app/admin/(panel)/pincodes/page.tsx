import type { Metadata } from "next";
import { requireStaff } from "@/server/auth/session";
import { query } from "@/server/db";
import { PincodeManager } from "./PincodeManager";

export const metadata: Metadata = { title: "Delivery pincodes" };
export const dynamic = "force-dynamic";

export default async function PincodesPage() {
  await requireStaff("/admin/pincodes", ["admin"]);
  const rows = await query(`select pincode, area, lat, lng, is_active from service_pincodes order by pincode`);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Delivery pincodes</h1>
        <p className="mt-1 text-sm text-slate-500">Used when a customer has not shared their exact location: the distance is measured to the middle of the pincode area. A pincode switched off is never delivered to, even with a shared location.</p>
      </div>
      <PincodeManager rows={rows.map((r) => ({ pincode: r.pincode as string, area: r.area as string, lat: Number(r.lat), lng: Number(r.lng), isActive: r.is_active as boolean }))} />
    </div>
  );
}
