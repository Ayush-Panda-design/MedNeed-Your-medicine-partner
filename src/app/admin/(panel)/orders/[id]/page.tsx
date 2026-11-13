import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/auth/session";
import { getOrderDetail } from "@/server/orders/queries";
import { prescriptionsOfOrder } from "@/server/prescriptions/service";
import { notificationsForOrder } from "@/server/notifications/queue";
import { query } from "@/server/db";
import { RX_LABEL } from "@/lib/prescriptionStatus";
import { formatINR } from "@/lib/catalog";
import { PAYMENT_LABEL, STATUS_LABEL, STATUS_STYLE, dateTime, slotText } from "@/lib/orderStatus";
import { OrderActions } from "./OrderActions";
import { FileText } from "lucide-react";

export const metadata: Metadata = { title: "Order" };
export const dynamic = "force-dynamic";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff(`/admin/orders/${id}`, ["admin", "pharmacist"]);
  const o = await getOrderDetail(id, { staff: true });
  if (!o) notFound();
  const rxs = await prescriptionsOfOrder(o.id);
  const messages = await notificationsForOrder(o.id);
  const attempts = await query<{ reason: string; note: string; created_at: string; partner: string | null }>(`select a.reason, a.note, a.created_at, u.name as partner from delivery_attempts a left join users u on u.id = a.partner_id where a.order_id = $1 order by a.id`, [o.id]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Link href="/admin/orders" className="text-sm text-teal-700 hover:underline">← Orders</Link>
          <h1 className="mt-1 text-2xl font-bold">Order {o.orderNumber}</h1><p className="text-sm text-slate-500">Placed {dateTime(o.createdAt)}</p></div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[o.status] ?? ""}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Items to pack</h2>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {o.items.map((i) => (
                <li key={i.id} className="py-3">
                  <div className="flex justify-between gap-3"><span><span className="font-medium">{i.name}</span> <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold">{i.schedule}</span><span className="block text-xs text-slate-500">{i.manufacturer} · {i.packSize}</span></span>
                    <span className="text-right"><span className="font-semibold">{i.qty} × {formatINR(i.unitPrice)}</span><span className="block text-xs text-slate-500">{formatINR(i.lineTotal)}</span></span></div>
                  {i.batches.length > 0 && <p className="mt-1 text-xs text-slate-600">Take from: {i.batches.map((b) => `batch ${b.batchNo} (exp ${b.expiry.slice(0, 7)}) × ${b.qty}`).join("; ")}</p>}
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
              <div className="flex justify-between"><dt>Items</dt><dd>{formatINR(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt>Coupon {o.couponCode}</dt><dd>− {formatINR(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt>{o.fulfilment === "pickup" ? "Pickup" : "Delivery"} fee</dt><dd>{formatINR(o.deliveryFee)}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatINR(o.total)}</dd></div>
            </dl>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold">History</h2>
            <ol className="mt-3 space-y-2 text-sm">{o.events.map((e, i) => <li key={i} className="flex justify-between gap-3"><span>{STATUS_LABEL[e.status] ?? e.status}{e.note ? <span className="text-slate-500"> · {e.note}</span> : null}{e.actor ? <span className="text-slate-400"> · {e.actor}</span> : null}</span><span className="shrink-0 text-slate-500">{dateTime(e.at)}</span></li>)}</ol>
          </section>
        </div>
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="font-bold">{o.fulfilment === "pickup" ? "Store pickup" : "Deliver to"}</h2>
            <p className="mt-2 leading-relaxed text-slate-700">{o.customerName} · +91 {o.customerPhone}{o.customerEmail ? <><br />{o.customerEmail}</> : null}
              {o.address && <><br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}{o.address.landmark ? `, near ${o.address.landmark}` : ""}<br />{o.address.city}, {o.address.state} {o.address.pincode}</>}</p>
            {o.fulfilment === "delivery" && o.distanceKm != null && <p className="mt-2 text-slate-600">About {o.distanceKm.toFixed(1)} km away ({o.distanceSource === "pin" ? "customer shared location" : "estimated from pincode"}).{o.address?.lat != null && <> <a className="text-teal-700 hover:underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${o.address.lat},${o.address.lng}`}>Open in Maps</a></>}</p>}
            <p className="mt-2 text-slate-600">When: {slotText(o.slotDate, o.slotWindow)}</p>
            <p className="mt-2 text-slate-600">{PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod} · {o.paymentStatus === "paid" ? "Paid" : `Collect ${formatINR(o.total)}`}</p>
            {o.customerNote && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-900">Note: {o.customerNote}</p>}
            {o.partnerName && <p className="mt-2 rounded-lg bg-violet-50 p-2 text-violet-900">Out with <strong>{o.partnerName}</strong>{o.partnerPhone ? ` (${o.partnerPhone})` : ""}</p>}
            {o.cancelReason && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-rose-800">Cancelled: {o.cancelReason}</p>}
          </section>
          {attempts.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm" aria-label="Failed deliveries">
              <h2 className="font-bold text-amber-900">Failed delivery attempts</h2>
              <ul className="mt-2 space-y-1 text-amber-900">{attempts.map((a, i) => <li key={i}>{a.reason}{a.note ? ` (${a.note})` : ""}{a.partner ? ` · ${a.partner}` : ""} · {dateTime(new Date(a.created_at).toISOString())}</li>)}</ul>
            </section>
          )}
          {rxs.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm" aria-label="Prescriptions">
              <h2 className="font-bold">Prescriptions</h2>
              <ul className="mt-2 space-y-1">{rxs.map((r) => <li key={r.id}><Link href={`/admin/prescriptions/${r.id}`} className="font-medium text-teal-700 hover:underline">Open prescription{r.doctorName ? ` (Dr ${r.doctorName.replace(/^dr\.?\s*/i, "")})` : ""}</Link> <span className="text-slate-500">· {RX_LABEL[r.status === "approved" && r.expired ? "expired" : r.status]}</span></li>)}</ul>
            </section>
          )}
          {(o.payments.length > 0 || o.refunds.length > 0) && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm" aria-label="Payments">
              <h2 className="font-bold">Online payment</h2>
              <ul className="mt-2 space-y-2">
                {o.payments.map((p) => (
                  <li key={p.gatewayOrderId} className="rounded-lg bg-slate-50 p-2">
                    {formatINR(p.amount)} · <strong>{p.status}</strong>{p.method ? ` · ${p.method}` : ""}
                    <span className="block break-all text-xs text-slate-500">{p.paymentId ?? p.gatewayOrderId}</span>
                    {p.error && <span className="block text-xs text-rose-700">{p.error}</span>}
                  </li>
                ))}
                {o.refunds.map((r) => (
                  <li key={r.id} className="rounded-lg bg-sky-50 p-2">
                    Refund {formatINR(r.amount)} · <strong>{r.status}</strong>
                    <span className="block text-xs text-slate-600">{r.reason}</span>
                    {r.error && <span className="block text-xs text-rose-700">{r.error}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {messages.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm" aria-label="Messages to the customer">
              <h2 className="font-bold">Messages to the customer</h2>
              <ul className="mt-2 space-y-1">{messages.map((m) => <li key={String(m.id)} className="flex justify-between gap-2"><span>{String(m.event).replace(/_/g, " ")} <span className="text-xs uppercase text-slate-400">· {m.channel}</span></span><span className={m.status === "sent" ? "text-emerald-700" : m.status === "dead" ? "text-rose-700" : "text-amber-700"}>{m.status === "dead" ? "failed" : m.status}</span></li>)}</ul>
            </section>
          )}
          {o.invoiceNumber && (
            <a href={`/api/admin/orders/${o.id}/invoice`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"><FileText className="h-4 w-4" /> Invoice {o.invoiceNumber}</a>
          )}
          <OrderActions id={o.id} status={o.status} fulfilment={o.fulfilment} requiresRx={o.requiresPrescription} hasUploaded={rxs.length > 0} rxStatus={o.prescriptionStatus} rxNote={o.prescriptionNote} canRetryRefund={o.refunds.some((r) => r.retryable)} />
        </div>
      </div>
    </div>
  );
}
