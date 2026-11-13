import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { listNotifications } from "@/server/notifications/queue";
import { channelConfigured } from "@/server/notifications/providers";
import { getSettings } from "@/server/orders/settings";
import { dateTime } from "@/lib/orderStatus";
import { RetryButton } from "./RetryButton";

export const metadata: Metadata = { title: "Customer messages" };
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { pending: "bg-amber-50 text-amber-800", sending: "bg-sky-50 text-sky-800", sent: "bg-emerald-50 text-emerald-800", dead: "bg-rose-50 text-rose-800" };
const EVENT: Record<string, string> = {
  order_confirmed: "Order confirmed", order_packed: "Packed", ready_for_pickup: "Ready for pickup", out_for_delivery: "Out for delivery", delivered: "Delivered", delivery_failed: "Delivery failed",
  order_cancelled: "Cancelled", order_expired: "Payment timed out", refund_processed: "Refund sent", rx_approved: "Prescription approved", rx_needs_info: "Prescription: more info", rx_rejected: "Prescription rejected",
};
const PAGE = 30;

export default async function Notifications({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireStaff("/admin/notifications", ["admin"]);
  const sp = await searchParams;
  const status = ["pending", "sent", "dead"].includes(sp.status ?? "") ? sp.status! : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ items, total, counts }, settings] = await Promise.all([listNotifications({ status, page, pageSize: PAGE }), getSettings()]);
  const channels = (["email", "sms", "whatsapp"] as const).map((c) => ({ c, on: settings.notifications[c], ready: channelConfigured(c) }));
  const tab = (key: string, label: string, n?: number) => (
    <Link key={key} href={`/admin/notifications${key === "all" ? "" : `?status=${key}`}`} aria-current={status === key ? "page" : undefined} className={`rounded-full px-4 py-2 text-sm font-semibold ${status === key ? "bg-teal-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{label}{n != null ? ` (${n})` : ""}</Link>
  );
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Customer messages</h1>
        <p className="mt-1 text-sm text-slate-500">Every email, SMS and WhatsApp message about orders. Failed messages are retried automatically; ones that gave up show as failed and can be sent again.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {channels.map(({ c, on, ready }) => (
          <li key={c} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-semibold capitalize">{c === "sms" ? "SMS" : c}</p>
            <p className={on && ready ? "text-emerald-700" : "text-slate-500"}>{on && ready ? "Sending" : !on ? "Switched off in Shop settings" : "Not set up on the server yet"}</p>
          </li>
        ))}
      </ul>
      <nav aria-label="Filter" className="flex flex-wrap gap-2">{tab("all", "All")}{tab("pending", "Waiting", (counts.pending ?? 0) + (counts.sending ?? 0))}{tab("sent", "Sent", counts.sent ?? 0)}{tab("dead", "Failed", counts.dead ?? 0)}</nav>
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        {items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No messages here yet.</p> : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Message</th><th className="px-4 py-2">To</th><th className="px-4 py-2">Status</th><th className="px-4 py-2" /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((n) => (
                <tr key={String(n.id)}>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">{dateTime(new Date(n.created_at).toISOString())}</td>
                  <td className="px-4 py-2">{EVENT[n.event] ?? n.event} <span className="text-xs uppercase text-slate-400">· {n.channel}</span>{n.order_id ? <> · <Link className="text-teal-700 hover:underline" href={`/admin/orders/${n.order_id}`}>{n.order_number}</Link></> : null}</td>
                  <td className="px-4 py-2 text-slate-600">{n.recipient}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[n.status] ?? ""}`}>{n.status === "dead" ? "failed" : n.status === "sending" ? "sending" : n.status}</span>{n.last_error && n.status !== "sent" && <span className="mt-1 block max-w-xs truncate text-xs text-rose-700" title={n.last_error}>{n.last_error}</span>}</td>
                  <td className="px-4 py-2 text-right">{n.status === "dead" && <RetryButton id={String(n.id)} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {total > PAGE && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? <Link className="text-teal-700 hover:underline" href={`/admin/notifications?${status !== "all" ? `status=${status}&` : ""}page=${page - 1}`}>← Newer</Link> : <span />}
          {page * PAGE < total && <Link className="text-teal-700 hover:underline" href={`/admin/notifications?${status !== "all" ? `status=${status}&` : ""}page=${page + 1}`}>Older →</Link>}
        </div>
      )}
    </div>
  );
}
