import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { listOrdersForUser } from "@/server/orders/queries";
import { formatINR } from "@/lib/catalog";
import { STATUS_STYLE, dateTime, labelFor } from "@/lib/orderStatus";

export const metadata: Metadata = { title: "My orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const claims = await requireUser("/account/orders");
  const orders = await listOrdersForUser(claims.userId);
  return (
    <div>
      <h2 className="text-lg font-bold">My orders</h2>
      {orders.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Package className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 font-semibold">No orders yet</p>
          <Link href="/medicines" className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline">Browse medicines</Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 hover:border-teal-300">
                <div>
                  <p className="font-semibold">Order {o.orderNumber}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{dateTime(o.createdAt)} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {o.fulfilment === "pickup" ? "Store pickup" : "Home delivery"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatINR(o.total)}</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[o.status] ?? ""}`}>{labelFor(o.status, o.fulfilment)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
