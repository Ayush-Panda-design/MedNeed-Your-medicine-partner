import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { getSettings, type StoreSettings } from "@/server/orders/settings";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Shop settings" };
export const dynamic = "force-dynamic";

/** What a payment-gateway reviewer looks for on the live website. Hidden once everything is in place. */
function GatewayReadiness({ s }: { s: StoreSettings }) {
  const checks: [string, boolean][] = [
    ["Legal business name (as on the GST certificate)", s.invoice.legalName.trim().length > 2 && s.invoice.legalName.trim().toUpperCase() !== "MED NEED"],
    ["GSTIN", s.invoice.gstin.trim() !== ""],
    ["Retail drug licence number", s.invoice.drugLicense.trim() !== ""],
    ["Shop address", s.shop.address.trim() !== ""],
    ["Shop phone", s.shop.phone.trim() !== ""],
    ["Support email", s.legal.supportEmail.trim() !== ""],
    ["Registered pharmacist name and registration number", s.legal.pharmacistName.trim() !== "" && s.legal.pharmacistRegNo.trim() !== ""],
    ["Grievance Officer name", s.legal.grievanceName.trim() !== ""],
    ["Policies marked as reviewed (removes the \"being finalised\" notice)", s.legal.policiesReviewed],
  ];
  const missing = checks.filter(([, ok]) => !ok);
  if (missing.length === 0) return null;
  return (
    <section role="note" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
      <strong>Before applying for live online payments (Razorpay)</strong>
      <p className="mt-1">The reviewer visits the public website and checks these details. Fill them in below, then check the Contact, Terms, Refunds and Shipping pages.</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5">
        {missing.map(([label]) => <li key={label}>{label}</li>)}
      </ul>
    </section>
  );
}

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
      <GatewayReadiness s={settings} />
      {!locationConfigured &&<p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>Set the shop location.</strong> Delivery distance is measured from it. Right now it is a placeholder, so distances and fees will be wrong until you save the real location.</p>}
      <SettingsForm initial={settings} locationConfigured={locationConfigured} />
    </div>
  );
}
