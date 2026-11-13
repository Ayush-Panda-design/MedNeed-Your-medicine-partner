import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/auth/session";
import { getInventoryMedicine } from "@/server/inventory/queries";
import { inr, KIND_LABEL, prettyDate, STATE_LABEL } from "../shared";
import { BatchAdjust } from "./BatchAdjust";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Stock" };

export default async function MedicineStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireStaff(`/admin/inventory/${id}`, ["admin", "inventory_manager", "pharmacist"]);
  const m = await getInventoryMedicine(id);
  if (!m) notFound();
  const canEdit = user.roles.includes("admin") || user.roles.includes("inventory_manager");
  const time = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory" className="text-sm text-teal-700 hover:underline">← Inventory</Link>
        <h1 className="mt-1 text-2xl font-bold">{m.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{m.manufacturer} · {m.packSize} · <Link href={`/admin/catalog/${m.id}`} className="text-teal-700 hover:underline">Catalog details</Link></p>
      </div>

      {m.status !== "active" && m.stockQty > 0 && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">This medicine has stock but is <strong>{m.status}</strong>, so customers cannot order it. Verify and publish it from the catalog.</p>
      )}

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Available to sell", String(m.sellableQty)],
          ["On hand (all batches)", String(m.stockQty)],
          ["Current MRP", inr.format(m.mrp)],
          ["Selling price", `${inr.format(m.price)}${m.discountPercent > 0 ? ` (${m.discountPercent}% off)` : ""}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-slate-200 bg-white p-5"><dt className="text-sm text-slate-500">{k}</dt><dd className="mt-2 text-2xl font-bold">{v}</dd></div>
        ))}
      </dl>

      {canEdit && <SettingsForm id={m.id} discountPercent={m.discountPercent} reorderLevel={m.reorderLevel} gstPercent={m.gstPercent} hsn={m.hsn} mrp={m.mrp} ceiling={m.nppaCeilingPrice} />}

      <section aria-labelledby="batches" className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4"><h2 id="batches" className="font-bold">Batches</h2>
          <p className="text-xs text-slate-500">Sold in this order: earliest expiry first. Expired and nearly-expired batches are never sold online.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Batch</th><th className="px-5 py-3">Expiry</th><th className="px-5 py-3">MRP</th><th className="px-5 py-3">Cost</th><th className="px-5 py-3">Received</th><th className="px-5 py-3">On hand</th><th className="px-5 py-3">Status</th>{canEdit && <th className="px-5 py-3"><span className="sr-only">Actions</span></th>}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {m.batches.length === 0 && <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-500">No batches yet. Enter a purchase bill to add stock.</td></tr>}
              {m.batches.map((b) => (
                <tr key={b.id} className={b.qtyOnHand === 0 ? "text-slate-400" : ""}>
                  <td className="px-5 py-3 font-semibold">{b.batchNo}</td>
                  <td className="px-5 py-3">{prettyDate(b.expiryDate)}</td>
                  <td className="px-5 py-3">{inr.format(b.mrp)}</td>
                  <td className="px-5 py-3">{inr.format(b.purchaseRate)}</td>
                  <td className="px-5 py-3">{b.qtyReceived}</td>
                  <td className="px-5 py-3 font-semibold">{b.qtyOnHand}</td>
                  <td className="px-5 py-3">{b.qtyOnHand > 0 ? <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_LABEL[b.state].cls}`}>{STATE_LABEL[b.state].text}</span> : "Empty"}</td>
                  {canEdit && <td className="px-5 py-3"><BatchAdjust batchId={b.id} batchNo={b.batchNo} onHand={b.qtyOnHand} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="hist" className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4"><h2 id="hist" className="font-bold">History</h2><p className="text-xs text-slate-500">The last 50 changes. Entries can never be edited or removed.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">When</th><th className="px-5 py-3">What</th><th className="px-5 py-3">Batch</th><th className="px-5 py-3">Change</th><th className="px-5 py-3">Balance</th><th className="px-5 py-3">By</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {m.movements.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">No activity yet.</td></tr>}
              {m.movements.map((x) => (
                <tr key={x.id}>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-500">{time.format(new Date(x.createdAt))}</td>
                  <td className="px-5 py-3">{KIND_LABEL[x.kind] ?? x.kind}{x.note && <p className="text-xs text-slate-500">{x.note}</p>}</td>
                  <td className="px-5 py-3">{x.batchNo}</td>
                  <td className={`px-5 py-3 font-semibold ${x.delta > 0 ? "text-emerald-700" : "text-rose-700"}`}>{x.delta > 0 ? `+${x.delta}` : x.delta}</td>
                  <td className="px-5 py-3">{x.balanceAfter}</td>
                  <td className="px-5 py-3 text-slate-500">{x.actor ?? "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
