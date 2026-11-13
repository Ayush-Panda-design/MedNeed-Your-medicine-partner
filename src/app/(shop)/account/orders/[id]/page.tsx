import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getOrderDetail } from "@/server/orders/queries";
import { getSettings } from "@/server/orders/settings";
import { prescriptionsOfOrder } from "@/server/prescriptions/service";
import { RX_LABEL } from "@/lib/prescriptionStatus";
import { formatINR } from "@/lib/catalog";
import { PAYMENT_LABEL, STATUS_LABEL, STATUS_STYLE, dateTime, labelFor, slotText } from "@/lib/orderStatus";
import { OrderTracker } from "@/components/OrderTracker";
import { CancelOrder } from "./CancelOrder";
import { PayNow } from "./PayNow";
import { FileText } from "lucide-react";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const { id } = await params;
  const claims = await requireUser(`/account/orders/${id}`);
  const o = await getOrderDetail(id, { userId: claims.userId });
  if (!o) notFound();
  const placed = (await searchParams).placed === "1";
  const rxs = await prescriptionsOfOrder(o.id);
  const shop = (await getSettings()).shop;
  const canCancel = o.status === "pending_payment" || o.status === "confirmed";

  return (
    <div className="space-y-5">
      {placed && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <CheckCircle2 className="mn-tick mt-0.5 h-6 w-6 shrink-0" />
          <div><p className="font-bold">{o.status === "pending_payment" ? "Your order is saved. Complete the payment to confirm it." : "Thank you! Your order is placed."}</p>
            <p className="mt-1 text-sm">{o.fulfilment === "pickup" ? `We will keep it ready for you at ${shop.name}.` : "We will pack it and send it to you."} Your order number is {o.orderNumber}.</p></div>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-sm text-teal-700 hover:underline">← My orders</Link>
          <h2 className="mt-1 text-2xl font-bold">Order {o.orderNumber}</h2>
          <p className="text-sm text-slate-500">Placed {dateTime(o.createdAt)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[o.status] ?? ""}`}>{labelFor(o.status, o.fulfilment)}</span>
      </div>

      <OrderTracker status={o.status} fulfilment={o.fulfilment} events={o.events} partnerName={o.partnerName} partnerPhone={o.partnerPhone} deliveryCode={o.deliveryCode} collectAmount={o.paymentMethod === "cod" && o.paymentStatus === "unpaid" ? formatINR(o.total) : null} attempts={o.deliveryAttempts} />

      {o.status === "pending_payment" && o.paymentMethod === "online" && <PayNow orderId={o.id} total={formatINR(o.total)} expiresAt={o.expiresAt} />}
      {o.status === "expired" && o.paymentMethod === "online" && <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-700">The time to pay ran out, so the items were released. You can place the order again from your cart.</p>}
      {o.refunds.map((r) => (
        <p key={r.id} className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
          {r.status === "processed" ? `Your refund of ${formatINR(r.amount)} has been sent. It reaches your account in a few working days.` : `We are refunding ${formatINR(r.amount)} to your original payment method. This usually takes 5 to 7 working days.`}
        </p>
      ))}
      {o.requiresPrescription && o.status !== "cancelled" && o.status !== "expired" && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            {o.prescriptionStatus === "verified" ? "Your prescription has been verified." : o.prescriptionStatus === "rejected" ? "Your prescription could not be accepted." : "This order has prescription medicines. Our pharmacist will verify your prescription before it is sent."}</p>
          {rxs.length > 0 && <ul className="mt-2 space-y-1 pl-7">{rxs.map((r) => <li key={r.id}><Link href={`/account/prescriptions/${r.id}`} className="font-medium underline">Prescription{r.doctorName ? ` from Dr ${r.doctorName.replace(/^dr\.?\s*/i, "")}` : ""}</Link>: {RX_LABEL[r.status === "approved" && r.expired ? "expired" : r.status]}{r.status === "needs_info" && r.reviewNote ? ` (${r.reviewNote})` : ""}</li>)}</ul>}
          {o.prescriptionStatus === "pending" && rxs.some((r) => r.status === "needs_info") && <p className="mt-2 pl-7">Please reply to the pharmacist from the prescription page so we can continue.</p>}
        </div>
      )}
      {o.cancelReason && <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Cancelled: {o.cancelReason}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Items">
        <h3 className="font-bold">Items</h3>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {o.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2.5">
              <span><span className="font-medium">{i.name}</span><span className="block text-xs text-slate-500">{i.packSize} · {i.qty} × {formatINR(i.unitPrice)}</span></span>
              <span className="font-medium">{formatINR(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-slate-600">Items</dt><dd>{formatINR(o.subtotal)}</dd></div>
          {o.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon {o.couponCode}</dt><dd>− {formatINR(o.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-slate-600">{o.fulfilment === "pickup" ? "Pickup" : "Delivery"}</dt><dd>{o.deliveryFee === 0 ? "FREE" : formatINR(o.deliveryFee)}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatINR(o.total)}</dd></div>
        </dl>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          <h3 className="font-bold">{o.fulfilment === "pickup" ? "Pickup" : "Delivery"}</h3>
          {o.address ? <p className="mt-2 leading-relaxed text-slate-600">{o.address.fullName}<br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}<br />{o.address.city}, {o.address.state} {o.address.pincode}<br />+91 {o.address.phone}</p>
            : <p className="mt-2 leading-relaxed text-slate-600">{shop.name}<br />{shop.address}<br />Collected by {o.customerName}</p>}
          <p className="mt-2 text-slate-600">When: {slotText(o.slotDate, o.slotWindow)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
          <h3 className="font-bold">Payment</h3>
          <p className="mt-2 text-slate-600">{PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}</p>
          <p className="text-slate-600">{o.paymentStatus === "paid" ? "Paid" : o.paymentStatus === "refunded" ? "Refunded" : o.status === "cancelled" || o.status === "expired" ? "No payment due" : "Payment due: " + formatINR(o.total)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Progress">
        <h3 className="font-bold">Progress</h3>
        <ol className="mt-3 space-y-2 text-sm">
          {o.events.map((e, i) => (
            <li key={i} className="flex justify-between gap-3"><span>{labelFor(e.status, o.fulfilment)}{e.note ? <span className="text-slate-500"> · {e.note}</span> : null}</span><span className="shrink-0 text-slate-500">{dateTime(e.at)}</span></li>
          ))}
        </ol>
      </section>

      {o.invoiceNumber && (
        <a href={`/api/orders/${o.id}/invoice`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">
          <FileText className="h-4 w-4" /> Download invoice {o.invoiceNumber}
        </a>
      )}
      {canCancel && <CancelOrder id={o.id} />}
    </div>
  );
}
