import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ClipboardList, PackagePlus, Truck } from "lucide-react";
import { requireStaff } from "@/server/auth/session";
import { inventoryOverview, listStocked } from "@/server/inventory/queries";
import { inr, inrWhole, prettyDate, STATE_LABEL } from "./shared";

export const metadata: Metadata = { title: "Inventory" };
const PAGE = 25;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { user } = await requireStaff("/admin/inventory", ["admin", "inventory_manager", "pharmacist"]);
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [ov, list] = await Promise.all([inventoryOverview(), listStocked({ q: sp.q, page, pageSize: PAGE })]);
  const canEdit = user.roles.includes("admin") || user.roles.includes("inventory_manager");
  const pages = Math.max(1, Math.ceil(list.total / PAGE));
  const href = (p: number) => `/admin/inventory?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`;
  const stats = [
    { label: "Units on hand", value: ov.totals.units.toLocaleString("en-IN") },
    { label: "Medicines in stock", value: ov.totals.medicines.toLocaleString("en-IN") },
    { label: "Stock value (at cost)", value: inrWhole.format(ov.totals.costValue) },
    { label: "Stock value (at MRP)", value: inrWhole.format(ov.totals.mrpValue) },
  ];
  const expired = ov.nearExpiry.filter((b) => b.state === "expired");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">Stock comes in from wholesaler bills and goes out with sales, oldest expiry first. Every change is recorded.</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/inventory/purchases/new" className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"><PackagePlus className="h-4 w-4" /> Receive stock</Link>
            <Link href="/admin/inventory/purchases" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><ClipboardList className="h-4 w-4" /> Purchase bills</Link>
            <Link href="/admin/inventory/suppliers" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><Truck className="h-4 w-4" /> Suppliers</Link>
          </div>
        )}
      </div>

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <dt className="text-sm text-slate-500">{s.label}</dt>
            <dd className="mt-2 text-2xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      {ov.stockedButNotLive > 0 && (
        <p className="flex gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{ov.stockedButNotLive} medicine(s) have stock but are not published, so customers cannot order them yet. <Link href="/admin/catalog" className="font-semibold underline">Open the catalog</Link> to verify and publish them.</span></p>
      )}

      <section aria-labelledby="exp" className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 id="exp" className="font-bold">Expiry alerts</h2>
          <p className="text-xs text-slate-500">Batches that expire within {ov.settings.expiryAlertDays} days. Batches under {ov.settings.minShelfDays} days are no longer sold online.{expired.length > 0 && <span className="font-semibold text-rose-700"> {expired.length} expired batch(es) still on the shelf: remove them and write them off.</span>}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Medicine</th><th className="px-5 py-3">Batch</th><th className="px-5 py-3">Expiry</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {ov.nearExpiry.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Nothing is close to expiry.</td></tr>}
              {ov.nearExpiry.map((b) => (
                <tr key={b.id}>
                  <td className="px-5 py-3"><Link href={`/admin/inventory/${b.medicineId}`} className="font-semibold hover:text-teal-700">{b.medicine}</Link></td>
                  <td className="px-5 py-3">{b.batchNo}</td>
                  <td className="px-5 py-3">{prettyDate(b.expiryDate)} <span className="text-xs text-slate-500">({b.daysToExpiry < 0 ? `${-b.daysToExpiry}d ago` : `${b.daysToExpiry}d`})</span></td>
                  <td className="px-5 py-3">{b.qtyOnHand}</td>
                  <td className="px-5 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_LABEL[b.state].cls}`}>{STATE_LABEL[b.state].text}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="low" className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 id="low" className="font-bold">Low stock and out of stock</h2>
          <p className="text-xs text-slate-500">Published or stocked medicines at or below their reorder level.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Medicine</th><th className="px-5 py-3">Available</th><th className="px-5 py-3">Reorder level</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {ov.lowStock.length === 0 && <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-500">Everything is above its reorder level.</td></tr>}
              {ov.lowStock.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3"><Link href={`/admin/inventory/${m.id}`} className="font-semibold hover:text-teal-700">{m.name}</Link><p className="text-xs text-slate-500">{m.manufacturer} · {m.packSize}</p></td>
                  <td className="px-5 py-3"><span className={m.sellableQty === 0 ? "font-semibold text-rose-700" : "font-semibold text-amber-700"}>{m.sellableQty === 0 ? "Out of stock" : m.sellableQty}</span></td>
                  <td className="px-5 py-3">{m.reorderLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="all" className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 id="all" className="font-bold">All stocked medicines <span className="font-normal text-slate-500">({list.total})</span></h2>
          <form action="/admin/inventory" className="flex gap-2">
            <input name="q" defaultValue={sp.q ?? ""} aria-label="Search stocked medicines" placeholder="Search by name or salt" className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600" />
            <button className="rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">Search</button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Medicine</th><th className="px-5 py-3">Available</th><th className="px-5 py-3">On hand</th><th className="px-5 py-3">Next expiry</th><th className="px-5 py-3">MRP</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Store status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {list.items.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">No stock recorded yet. Use <strong>Receive stock</strong> to enter your first purchase bill.</td></tr>}
              {list.items.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3"><Link href={`/admin/inventory/${m.id}`} className="font-semibold hover:text-teal-700">{m.name}</Link><p className="text-xs text-slate-500">{m.manufacturer} · {m.packSize}</p></td>
                  <td className="px-5 py-3 font-semibold">{m.sellableQty}</td>
                  <td className="px-5 py-3">{m.stockQty}</td>
                  <td className="px-5 py-3">{m.nextExpiry ? prettyDate(m.nextExpiry) : "—"}</td>
                  <td className="px-5 py-3">{inr.format(m.mrp)}</td>
                  <td className="px-5 py-3">{inr.format(m.price)}</td>
                  <td className="px-5 py-3 capitalize">{m.status === "active" ? "Live" : m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
            {page > 1 ? <Link href={href(page - 1)} className="font-semibold text-teal-700">← Previous</Link> : <span />}
            <span className="text-slate-500">Page {page} of {pages}</span>
            {page < pages ? <Link href={href(page + 1)} className="font-semibold text-teal-700">Next →</Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
