import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/auth/session";
import { getPurchase } from "@/server/inventory/purchases";
import { inr, prettyDate } from "../../shared";

export const metadata: Metadata = { title: "Purchase bill" };

export default async function PurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff(`/admin/inventory/purchases/${id}`, ["admin", "inventory_manager"]);
  const p = await getPurchase(id);
  if (!p) notFound();
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory/purchases" className="text-sm text-teal-700 hover:underline">← Purchase bills</Link>
        <h1 className="mt-1 text-2xl font-bold">Bill {p.billNumber}</h1>
        <p className="mt-1 text-sm text-slate-500">{p.supplier} · {prettyDate(p.billDate)}{p.enteredBy && ` · entered by ${p.enteredBy}`}</p>
        {p.notes && <p className="mt-2 text-sm">{p.notes}</p>}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Medicine</th><th className="px-5 py-3">Batch</th><th className="px-5 py-3">Expiry</th><th className="px-5 py-3">Qty</th><th className="px-5 py-3">Free</th><th className="px-5 py-3">MRP</th><th className="px-5 py-3">Rate</th><th className="px-5 py-3">Amount</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {p.items.map((i) => (
              <tr key={i.id}>
                <td className="px-5 py-3"><Link href={`/admin/inventory/${i.medicineId}`} className="font-semibold hover:text-teal-700">{i.medicine}</Link><p className="text-xs text-slate-500">{i.manufacturer}</p></td>
                <td className="px-5 py-3">{i.batchNo}</td>
                <td className="px-5 py-3">{prettyDate(i.expiryDate)}</td>
                <td className="px-5 py-3">{i.qty}</td>
                <td className="px-5 py-3">{i.freeQty}</td>
                <td className="px-5 py-3">{inr.format(i.mrp)}</td>
                <td className="px-5 py-3">{inr.format(i.purchaseRate)}</td>
                <td className="px-5 py-3 font-semibold">{inr.format(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-slate-200 bg-slate-50"><td colSpan={7} className="px-5 py-3 text-right font-semibold">Total (before tax)</td><td className="px-5 py-3 font-bold">{inr.format(p.total)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}
