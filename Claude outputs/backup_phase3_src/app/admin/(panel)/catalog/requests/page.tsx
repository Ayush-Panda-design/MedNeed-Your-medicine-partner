import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { listRequests } from "@/server/catalog/requests";
import { RequestActions } from "./RequestActions";

export const metadata: Metadata = { title: "Medicine requests" };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff("/admin/catalog/requests");
  const { status } = await searchParams;
  const rows = await listRequests(status);
  const tabs = [["", "All"], ["new", "New"], ["contacted", "Contacted"], ["fulfilled", "Fulfilled"], ["cancelled", "Cancelled"]];
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/catalog" className="text-sm text-teal-700 hover:underline">← Catalog</Link>
        <h1 className="mt-1 text-2xl font-bold">Medicine requests</h1>
        <p className="mt-1 text-sm text-slate-500">Customers asking for medicines that are listed but not stocked. Call them to confirm the price, then source the item.</p>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Filter by status">
        {tabs.map(([v, l]) => (
          <Link key={v} href={v ? `/admin/catalog/requests?status=${v}` : "/admin/catalog/requests"} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${(status ?? "") === v ? "bg-slate-900 text-white" : "bg-white ring-1 ring-slate-300 hover:bg-slate-50"}`}>{l}</Link>
        ))}
      </nav>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Medicine</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No requests yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-3">
                  <Link href={`/medicines/${r.slug}`} target="_blank" className="font-semibold hover:text-teal-700">{r.medicine}</Link>
                  {r.schedule !== "OTC" && <p className="text-xs text-rose-700">Prescription needed (or unconfirmed)</p>}
                  {r.note && <p className="mt-1 text-xs text-slate-500">Note: {r.note}</p>}
                </td>
                <td className="px-4 py-3">{r.name}<br /><a href={`tel:${r.phone}`} className="font-semibold text-teal-700">{r.phone}</a></td>
                <td className="px-4 py-3">{r.quantity}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</td>
                <td className="px-4 py-3"><RequestActions id={r.id} status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
