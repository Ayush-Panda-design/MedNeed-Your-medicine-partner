"use client";

import { api } from "./api";

type RzpResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RzpInstance = { open: () => void; on: (ev: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => RzpInstance }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    const s = existing ?? Object.assign(document.createElement("script"), { src: SCRIPT, async: true });
    s.addEventListener("load", () => resolve(true), { once: true });
    s.addEventListener("error", () => resolve(false), { once: true });
    if (!existing) document.body.appendChild(s);
  });
}

export type PayResult = { ok: true; orderId: string } | { ok: false; error: string; dismissed?: boolean };

/** Opens Razorpay Checkout for an order that is waiting for payment, then has our server verify the result. */
export async function payForOrder(orderId: string): Promise<PayResult> {
  const start = await api<{ keyId: string; gatewayOrderId: string; amountPaise: number; orderNumber: string; shopName: string; prefill: { name: string; email: string; contact: string } }>("/api/checkout/payments/start", { body: { orderId } });
  if (!start.ok) return { ok: false, error: start.error };
  if (!(await loadScript()) || !window.Razorpay) return { ok: false, error: "We could not load the payment window. Check your connection and try again." };
  const d = start.data;
  return new Promise<PayResult>((resolve) => {
    let settled = false;
    const done = (r: PayResult) => { if (!settled) { settled = true; resolve(r); } };
    const rzp = new window.Razorpay!({
      key: d.keyId, amount: d.amountPaise, currency: "INR", name: d.shopName, description: `Order ${d.orderNumber}`, order_id: d.gatewayOrderId,
      prefill: d.prefill, theme: { color: "#0d9488" },
      handler: async (resp: RzpResponse) => {
        const v = await api("/api/checkout/payments/verify", { body: resp });
        done(v.ok ? { ok: true, orderId } : { ok: false, error: v.error });
      },
      modal: { ondismiss: () => done({ ok: false, dismissed: true, error: "Payment was not completed." }) },
    });
    rzp.on("payment.failed", () => { /* Razorpay Checkout lets the customer retry inside the window. */ });
    rzp.open();
  });
}
