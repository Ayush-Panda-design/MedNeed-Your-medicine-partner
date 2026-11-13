import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { getSettings } from "@/server/orders/settings";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Shop settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireStaff("/admin/settings", ["admin"]);
  const { locationConfigured, ...settings } = await getSettings();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shop settings</h1>
        <p className="mt-1 text-sm text-slate-500">Delivery area, fees, minimum order, payment and time slots. Changes apply to new orders straight away.
          {" "}<Link href="/admin/pincodes" className="text-teal-700 hover:underline">Pincodes</Link> · <Link href="/admin/coupons" className="text-teal-700 hover:underline">Coupons</Link></p>
      </div>
      {!locationConfigured && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>Set the shop location.</strong> Delivery distance is measured from it. Right now it is a placeholder, so distances and fees will be wrong until you save the real location.</p>}
      <SettingsForm initial={settings} locationConfigured={locationConfigured} />
    </div>
  );
}
