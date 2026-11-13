import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { fulfilmentQueues, listPartners, FAILED_ATTEMPT_FLAG, type FulfilmentOrder } from "@/server/orders/fulfilment";
import { formatINR } from "@/lib/catalog";
import { PAYMENT_LABEL, dateTime, slotText } from "@/lib/orderStatus";
import { DispatchBoard } from "./DispatchBoard";
import { OnTheRoad } from "./OnTheRoad";
import { AutoRefresh } from "./AutoRefresh";

export const metadata: Metadata = { title: "Fulfilment" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "pack", label: "To pack" },
  { key: "send", label: "Ready to send" },
  { key: "road", label: "On the road" },
  { key: "pickup", label: "Pickup" },
  { key: "rx", label: "Waiting for prescription" },
] as const;

function Row({ o, action }: { o: FulfilmentOrder; action: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{o.orderNumber} <span className="font-normal text-slate-500">· {o.customerName}</span></p>
        <p className="text-slate-600">{o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {formatINR(o.total)} · {PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}{o.paymentStatus === "unpaid" ? " (collect)" : ""}</p>
        <p className="text-xs text-slate-500">{o.fulfilment === "delivery" ? `${o.area} · ` : "Pickup · "}{slotText(o.slotDate, o.slotWindow)} · placed {dateTime(o.createdAt)}</p>
        {o.deliveryAttempts > 0 && <p className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold ${o.deliveryAttempts >= FAILED_ATTEMPT_FLAG ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>{o.deliveryAttempts} failed delivery attempt{o.deliveryAttempts === 1 ? "" : "s"}{o.deliveryAttempts >= FAILED_ATTEMPT_FLAG ? ": decide whether to try again or cancel" : ""}</p>}
      </div>
      {action}
    </li>
  );
}

export default async function Fulfilment({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff("/admin/fulfilment", ["admin", "pharmacist"]);
  const { tab: wanted } = await searchParams;
  const tab = TABS.find((t) => t.key === wanted)?.key ?? "pack";
  const [q, partners] = await Promise.all([fulfilmentQueues(), listPartners()]);
  const count: Record<string, number> = { pack: q.toPack.length, send: q.readyToSend.length, road: q.onTheRoad.length, pickup: q.readyForPickup.length, rx: q.waitingRx.length };
  const link = "rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-700";

  return (
    <div className="space-y-5">
      <AutoRefresh />
      <div>
        <h1 className="text-2xl font-bold">Fulfilment</h1>
        <p className="text-sm text-slate-500">Pack orders, send them out with a delivery person, and follow them to the door. This page refreshes by itself.</p>
      </div>
      <nav aria-label="Queues" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/fulfilment?tab=${t.key}`} aria-current={tab === t.key ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t.key ? "bg-teal-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {t.label} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${tab === t.key ? "bg-white/20" : "bg-slate-100"}`}>{count[t.key]}</span>
          </Link>
        ))}
      </nav>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        {tab === "pack" && (q.toPack.length === 0 ? <Empty text="Nothing waiting to be packed." /> : <ul className="divide-y divide-slate-100">{q.toPack.map((o) => <Row key={o.id} o={o} action={
          <div className="flex items-center gap-3"><span className="text-xs text-slate-500">{o.batchesPicked}/{o.batchesTotal} confirmed</span><Link href={`/admin/fulfilment/${o.id}`} className={link}>{o.batchesPicked > 0 ? "Continue packing" : "Pack"}</Link></div>} />)}</ul>)}
        {tab === "send" && <DispatchBoard orders={q.readyToSend} partners={partners.map((p) => ({ id: p.id, name: p.name || p.phone, active: p.active }))} />}
        {tab === "road" && (q.onTheRoad.length === 0 ? <Empty text="No orders are out for delivery." /> : <OnTheRoad orders={q.onTheRoad} partners={partners.map((p) => ({ id: p.id, name: p.name || p.phone }))} />)}
        {tab === "pickup" && (q.readyForPickup.length === 0 ? <Empty text="No pickup orders are waiting." /> : <ul className="divide-y divide-slate-100">{q.readyForPickup.map((o) => <Row key={o.id} o={o} action={<Link href={`/admin/orders/${o.id}`} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold hover:bg-slate-50">Hand over</Link>} />)}</ul>)}
        {tab === "rx" && (q.waitingRx.length === 0 ? <Empty text="No orders are waiting for a prescription." /> : <ul className="divide-y divide-slate-100">{q.waitingRx.map((o) => <Row key={o.id} o={o} action={<Link href="/admin/prescriptions" className="rounded-lg border border-amber-300 px-3.5 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50">Review prescriptions</Link>} />)}</ul>)}
      </section>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{text}</p>;
}
