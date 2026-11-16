import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { adminListOrders } from "@/server/orders/queries";
import { formatINR } from "@/lib/catalog";
import { STATUS_LABEL, STATUS_STYLE, dateTime } from "@/lib/orderStatus";
import { LiveRefresh } from "@/lib/live";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const TABS = [["open", "To do"], ["pending_payment", "Awaiting payment"], ["delivered", "Delivered"], ["cancelled", "Cancelled"], ["all", "All"]] as const;
const PAGE = 25;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireStaff("/admin/orders", ["admin", "pharmacist"]);
  const sp = await searchParams;
  const status = sp.status ?? "open";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total, counts } = await adminListOrders({ status, q: sp.q, page, pageSize: PAGE });
  const open = (counts.confirmed ?? 0) + (counts.packed ?? 0) + (counts.out_for_delivery ?? 0);
  const href = (p: Record<string, string>) => `/admin/orders?${new URLSearchParams({ status, ...(sp.q ? { q: sp.q } : {}), ...p }).toString()}`;

  return (
    <div className="space-y-5">
      <LiveRefresh topics={["order"]} />
      <div><h1 className="text-2xl font-bold">Orders</h1><p className="mt-1 text-sm text-slate-500">{open} order{open === 1 ? "" : "s"} to pack or deliver.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(([v, label]) => (
          <Link key={v} href={`/admin/orders?status=${v}`} aria-current={status === v ? "page" : undefined} className={`rounded-full px-4 py-1.5 text-sm font-medium ${status === v ? "bg-teal-600 text-white" : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {label}{v === "open" ? ` (${open})` : v !== "all" && counts[v] ? ` (${counts[v]})` : ""}
          </Link>
        ))}
        <form className="ml-auto" role="search"><input type="hidden" name="status" value={status} /><input name="q" defaultValue={sp.q ?? ""} placeholder="Order no., name or phone" aria-label="Search orders" className="w-60 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600" /></form>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Placed</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No orders here.</td></tr>}
            {items.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold"><Link href={`/admin/orders/${o.id}`} className="text-teal-700 hover:underline">{o.orderNumber}</Link>{o.requiresPrescription && <span className="ml-2 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">Rx {o.prescriptionStatus === "verified" ? "✓" : ""}</span>}</td>
                <td className="px-4 py-3">{o.customerName}<span className="block text-xs text-slate-500">{o.customerPhone}</span></td>
                <td className="px-4 py-3">{o.fulfilment === "pickup" ? "Pickup" : `Delivery${o.distanceKm != null ? ` · ${o.distanceKm.toFixed(1)} km` : ""}`}</td>
                <td className="px-4 py-3">{formatINR(o.total)}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[o.status] ?? ""}`}>{STATUS_LABEL[o.status] ?? o.status}</span></td>
                <td className="px-4 py-3 text-slate-500">{dateTime(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{total} order{total === 1 ? "" : "s"}</span>
        <span className="flex gap-3">{page > 1 && <Link className="text-teal-700 hover:underline" href={href({ page: String(page - 1) })}>← Newer</Link>}{page * PAGE < total && <Link className="text-teal-700 hover:underline" href={href({ page: String(page + 1) })}>Older →</Link>}</span>
      </div>
    </div>
  );
}
