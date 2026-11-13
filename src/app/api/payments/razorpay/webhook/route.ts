import { NextResponse, type NextRequest } from "next/server";
import { query } from "@/server/db";
import { razorpayConfig, verifyWebhookSignature } from "@/server/payments/razorpay";
import { confirmPayment, recordPaymentFailure } from "@/server/payments/service";
import { applyRefundWebhook } from "@/server/payments/refunds";

// Razorpay calls this (server to server, so there is no cookie or same-origin check). The only proof it is genuine is the
// signature over the raw body. Every handler below is safe to run more than once, because Razorpay retries deliveries.
type Entity<T> = { entity: T };
type Payload = {
  event?: string;
  payload?: {
    payment?: Entity<{ id: string; order_id?: string; amount?: number; method?: string; error_description?: string }>;
    order?: Entity<{ id: string }>;
    refund?: Entity<{ id: string; payment_id?: string; status?: string; notes?: unknown }>;
  };
};

export async function POST(req: NextRequest) {
  const cfg = razorpayConfig();
  if (!cfg?.webhookSecret) return new NextResponse(null, { status: 503 });
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) return new NextResponse(null, { status: 401 });

  let body: Payload;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const pay = body.payload?.payment?.entity;
  try {
    switch (body.event) {
      case "payment.captured":
      case "order.paid": {
        const orderId = pay?.order_id ?? body.payload?.order?.entity.id;
        if (orderId && pay?.id) await confirmPayment({ gatewayOrderId: orderId, gatewayPaymentId: pay.id, method: pay.method ?? null, amountPaise: pay.amount ?? null });
        break;
      }
      case "payment.failed":
        if (pay?.order_id) await recordPaymentFailure(pay.order_id, pay.error_description ?? "Payment failed");
        break;
      case "refund.processed":
      case "refund.failed": {
        const r = body.payload?.refund?.entity;
        if (r?.id) await applyRefundWebhook(r.id, r.payment_id ?? pay?.id ?? null, body.event === "refund.processed" ? "processed" : "failed", "Refund failed at the bank");
        break;
      }
    }
    const eventId = req.headers.get("x-razorpay-event-id");
    if (eventId) await query(`insert into payment_events (event_id, type) values ($1,$2) on conflict do nothing`, [eventId, body.event ?? "unknown"]);
  } catch (e) {
    console.error("[webhook]", body.event, e);
    return new NextResponse(null, { status: 500 }); // Razorpay will retry
  }
  return NextResponse.json({ ok: true });
}
