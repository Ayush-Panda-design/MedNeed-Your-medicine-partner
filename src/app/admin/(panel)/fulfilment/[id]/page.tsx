import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/auth/session";
import { packingDetail } from "@/server/orders/fulfilment";
import { slotText } from "@/lib/orderStatus";
import { PackBoard } from "./PackBoard";

export const metadata: Metadata = { title: "Pack order" };
export const dynamic = "force-dynamic";

export default async function PackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff(`/admin/fulfilment/${id}`, ["admin", "pharmacist"]);
  const o = await packingDetail(id);
  if (!o) notFound();
  const blocked = o.requiresRx && o.rxStatus !== "verified";
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/admin/fulfilment" className="text-sm text-teal-700 hover:underline">← Fulfilment</Link>
        <h1 className="mt-1 text-2xl font-bold">Pack order {o.orderNumber}</h1>
        <p className="text-sm text-slate-500">{o.customerName} · {o.fulfilment === "pickup" ? "Pickup" : "Delivery"} · {slotText(o.slotDate, o.slotWindow)}</p>
      </div>
      {o.customerNote && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Customer note: {o.customerNote}</p>}
      {blocked && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This order has prescription medicines and the prescription is not verified yet. <Link href="/admin/prescriptions" className="font-semibold underline">Review prescriptions</Link></p>}
      {o.status !== "confirmed" ? (
        <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">This order is {o.status.replace(/_/g, " ")}, so there is nothing to pack. <Link href={`/admin/orders/${o.id}`} className="font-semibold text-teal-700 underline">Open the order</Link></p>
      ) : (
        <PackBoard orderId={o.id} items={o.items} blocked={blocked} />
      )}
    </div>
  );
}
