import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { listPurchases } from "@/server/inventory/purchases";
import { inr, prettyDate } from "../shared";

export const metadata: Metadata = { title: "Purchase bills" };
const PAGE = 25;

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireStaff("/admin/inventory/purchases", ["admin", "inventory_manager"]);
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const { items, total } = await listPurchases(page, PAGE);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/admin/inventory" className="text-sm text-teal-700 hover:underline">← Inventory</Link>
          <h1 className="mt-1 text-2xl font-bold">Purchase bills</h1>
          <p className="mt-1 text-sm text-slate-500">Every wholesaler bill entered into stock.</p>
        </div>
        <Link href="/admin/inventory/purchases/new" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">Receive stock</Link>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Bill</th><th className="px-5 py-3">Supplier</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Lines</th><th className="px-5 py-3">Units</th><th className="px-5 py-3">Amount</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">No bills entered yet.</td></tr>}
            {items.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3"><Link href={`/admin/inventory/purchases/${p.id}`} className="font-semibold text-teal-700 hover:underline">{p.billNumber}</Link></td>
                <td className="px-5 py-3">{p.supplier}</td>
                <td className="px-5 py-3">{prettyDate(p.billDate)}</td>
                <td className="px-5 py-3">{p.lines}</td>
                <td className="px-5 py-3">{p.units}</td>
                <td className="px-5 py-3 font-semibold">{inr.format(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
            {page > 1 ? <Link href={`?page=${page - 1}`} className="font-semibold text-teal-700">← Newer</Link> : <span />}
            <span className="text-slate-500">Page {page} of {pages}</span>
            {page < pages ? <Link href={`?page=${page + 1}`} className="font-semibold text-teal-700">Older →</Link> : <span />}
          </nav>
        )}
      </div>
    </div>
  );
}
