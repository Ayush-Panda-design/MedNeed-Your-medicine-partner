// What each message says. Pure functions: no database, no network.
//
// Privacy rule: messages never name medicines or give prescription details. SMS and WhatsApp carry only the order number,
// the amount and a link; anything more detailed stays behind the customer's login.

export type OrderEvent = "order_confirmed" | "order_packed" | "ready_for_pickup" | "out_for_delivery" | "delivered" | "delivery_failed" | "order_cancelled" | "order_expired" | "refund_processed";
export type RxEvent = "rx_approved" | "rx_needs_info" | "rx_rejected";
export type RefillEvent = "refill_due";
export type EventKey = OrderEvent | RxEvent | RefillEvent;

export type Ctx = {
  name: string;
  shopName: string;
  shopPhone: string;
  link: string;
  orderNumber?: string;
  total?: number;
  fulfilment?: "delivery" | "pickup";
  cod?: boolean;
  code?: string;
  partnerName?: string;
  partnerPhone?: string;
  reason?: string;
  amount?: number;
  paid?: boolean;
  medicine?: string;
};

export type Rendered = { subject: string; text: string; html: string; sms: string; params: string[]; template: string };

/** Short, transactional events also go to SMS and WhatsApp. The rest (for example "packed") are email only to keep costs and noise down. */
export const PHONE_EVENTS: ReadonlySet<EventKey> = new Set<EventKey>(["order_confirmed", "ready_for_pickup", "out_for_delivery", "delivered", "delivery_failed", "order_cancelled", "refund_processed", "rx_needs_info", "rx_rejected", "refill_due"]);

const inr = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(ctx: Ctx, heading: string, lines: string[], cta?: string): string {
  const body = lines.map((l) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#334155">${esc(l)}</p>`).join("");
  const button = cta ? `<p style="margin:22px 0 0"><a href="${esc(ctx.link)}" style="background:#0d9488;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px;display:inline-block">${esc(cta)}</a></p>` : "";
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px 12px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden" cellspacing="0" cellpadding="0">
<tr><td style="background:#0b5a2b;padding:18px 24px;color:#fff;font-size:20px;font-weight:700">${esc(ctx.shopName)}</td></tr>
<tr><td style="padding:24px"><h1 style="margin:0 0 16px;font-size:19px;color:#0f172a">${esc(heading)}</h1>${body}${button}</td></tr>
<tr><td style="padding:14px 24px;background:#f8fafc;font-size:12px;color:#64748b">Questions? Call ${esc(ctx.shopPhone)}. This is an automated message about your order.</td></tr>
</table></td></tr></table></body></html>`;
}

type Spec = { subject: string; heading: string; lines: string[]; cta: string; sms: string; params: string[] };

function spec(event: EventKey, c: Ctx): Spec {
  const no = c.orderNumber ?? "";
  const hi = `Hi ${c.name},`;
  const due = c.cod && !c.paid && c.total != null ? ` Please keep ${inr(c.total)} ready.` : "";
  switch (event) {
    case "order_confirmed":
      return {
        subject: `Order ${no} confirmed`, heading: "Your order is confirmed",
        lines: [`${hi} we have received your order ${no}${c.total != null ? ` for ${inr(c.total)}` : ""}.`, c.fulfilment === "pickup" ? "We will let you know when it is ready to collect." : "We will pack it and send it to you soon."],
        cta: "Track your order", sms: `${c.shopName}: Order ${no} confirmed${c.total != null ? ` (${inr(c.total)})` : ""}. Track: ${c.link}`, params: [c.name, no, c.total != null ? inr(c.total) : ""],
      };
    case "order_packed":
      return { subject: `Order ${no} is packed`, heading: "Your order is packed", lines: [`${hi} order ${no} is packed and waiting to be sent out.`], cta: "Track your order", sms: "", params: [c.name, no] };
    case "ready_for_pickup":
      return {
        subject: `Order ${no} is ready for pickup`, heading: "Ready for pickup",
        lines: [`${hi} order ${no} is ready at ${c.shopName}. Please bring your order number.${due}`],
        cta: "View order", sms: `${c.shopName}: Order ${no} is ready for pickup.${due} Details: ${c.link}`, params: [c.name, no],
      };
    case "out_for_delivery":
      return {
        subject: `Order ${no} is out for delivery`, heading: "Your order is on its way",
        lines: [`${hi} order ${no} is out for delivery${c.partnerName ? ` with ${c.partnerName}${c.partnerPhone ? ` (${c.partnerPhone})` : ""}` : ""}.`, `Your delivery code is ${c.code}. Share it with the delivery person only when you have received your order.${due}`],
        cta: "Track your order", sms: `${c.shopName}: Order ${no} is out for delivery. Delivery code ${c.code}: share it only when you receive the order.${due}`, params: [c.name, no, c.code ?? "", c.partnerName ?? ""],
      };
    case "delivered":
      return { subject: `Order ${no} delivered`, heading: "Delivered. Thank you!", lines: [`${hi} order ${no} has been delivered. Your invoice is in your account.`, "Wishing you good health."], cta: "View order and invoice", sms: `${c.shopName}: Order ${no} delivered. Thank you! Invoice: ${c.link}`, params: [c.name, no] };
    case "delivery_failed":
      return {
        subject: `We could not deliver order ${no}`, heading: "We could not deliver your order",
        lines: [`${hi} our delivery person could not deliver order ${no}${c.reason ? ` (${c.reason})` : ""}.`, `We will contact you to arrange another delivery. You can also call us on ${c.shopPhone}.`],
        cta: "View order", sms: `${c.shopName}: We could not deliver order ${no}. We will contact you to rearrange, or call ${c.shopPhone}.`, params: [c.name, no, c.shopPhone],
      };
    case "order_cancelled":
      return {
        subject: `Order ${no} cancelled`, heading: "Your order was cancelled",
        lines: [`${hi} order ${no} has been cancelled.`, ...(c.reason ? [`Reason: ${c.reason}`] : []), ...(c.paid ? ["Your online payment will be refunded to the original payment method in 5 to 7 working days."] : [])],
        cta: "View order", sms: `${c.shopName}: Order ${no} was cancelled.${c.paid ? " Any online payment will be refunded in 5-7 working days." : ""} Details: ${c.link}`, params: [c.name, no],
      };
    case "order_expired":
      return { subject: `Order ${no} was not completed`, heading: "Payment was not completed", lines: [`${hi} we did not receive payment for order ${no} in time, so we released the items.`, "You can place the order again from your cart any time."], cta: "Go to your orders", sms: "", params: [c.name, no] };
    case "refund_processed":
      return {
        subject: `Refund of ${inr(c.amount ?? 0)} sent`, heading: "Your refund has been sent",
        lines: [`${hi} we have sent a refund of ${inr(c.amount ?? 0)} for order ${no}.`, "It usually reaches your account within a few working days."],
        cta: "View order", sms: `${c.shopName}: Refund of ${inr(c.amount ?? 0)} for order ${no} has been sent. It reaches your account in a few working days.`, params: [c.name, no, inr(c.amount ?? 0)],
      };
    case "rx_approved":
      return { subject: "Your prescription was approved", heading: "Prescription approved", lines: [`${hi} our pharmacist has approved your prescription. You can now order the medicines it covers.`], cta: "View prescription", sms: "", params: [c.name] };
    case "rx_needs_info":
      return {
        subject: "We need a little more information", heading: "Your prescription needs more information",
        lines: [`${hi} our pharmacist needs more information to approve your prescription.`, ...(c.reason ? [`Pharmacist's note: ${c.reason}`] : []), "Please reply from your prescription page."],
        cta: "Open prescription", sms: `${c.shopName}: Our pharmacist needs more information about your prescription. Please open: ${c.link}`, params: [c.name],
      };
    case "rx_rejected":
      return {
        subject: "Your prescription could not be accepted", heading: "Prescription not accepted",
        lines: [`${hi} we could not accept your prescription.`, ...(c.reason ? [`Reason: ${c.reason}`] : []), "You can upload a new one any time."],
        cta: "View prescription", sms: `${c.shopName}: We could not accept your prescription. Details: ${c.link}`, params: [c.name],
      };
    case "refill_due":
      return {
        subject: `Time to refill ${c.medicine ?? "your medicine"}`, heading: "Running low? Time for a refill",
        lines: [`${hi} it may be time to reorder ${c.medicine ?? "your medicine"} so you don't run out.`, "Tap below to reorder in a few seconds, or ignore this if you still have enough."],
        cta: "Reorder now", sms: `${c.shopName}: Time to refill ${c.medicine ?? "your medicine"}? Reorder: ${c.link}`, params: [c.name, c.medicine ?? ""],
      };
  }
}

export function render(event: EventKey, c: Ctx): Rendered {
  const s = spec(event, c);
  const text = [...s.lines, "", `${s.cta}: ${c.link}`, "", `${c.shopName} · ${c.shopPhone}`].join("\n");
  return { subject: s.subject, text, html: layout(c, s.heading, s.lines, s.cta), sms: s.sms, params: s.params, template: `mn_${event}` };
}
