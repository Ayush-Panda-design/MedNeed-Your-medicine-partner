import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "../http";

/**
 * Thin Razorpay client. The secret key never leaves the server; the browser only gets the public key id and the
 * gateway order id. Amounts are in paise. `RAZORPAY_API_BASE` exists so tests can point at a local fake gateway.
 */
export const razorpayConfig = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return {
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || null,
    base: (process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1").replace(/\/$/, ""),
  };
};

export const razorpayConfigured = () => razorpayConfig() !== null;
export const toPaise = (rupees: number) => Math.round(rupees * 100);

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}
const hmac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");

/** Checks the signature Razorpay Checkout hands the browser after a successful payment. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const c = razorpayConfig();
  if (!c) return false;
  return safeEqualHex(hmac(c.keySecret, `${orderId}|${paymentId}`), signature);
}

/** Checks the signature on a webhook, computed over the exact raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const c = razorpayConfig();
  if (!c?.webhookSecret || !signature) return false;
  return safeEqualHex(hmac(c.webhookSecret, rawBody), signature);
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
  const c = razorpayConfig();
  if (!c) throw new ApiError(503, "Online payment is not set up yet.", "gateway_not_configured");
  let res: Response;
  try {
    res = await fetch(`${c.base}${path}`, {
      method,
      headers: { Authorization: `Basic ${Buffer.from(`${c.keyId}:${c.keySecret}`).toString("base64")}`, "Content-Type": "application/json", ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(502, "We could not reach the payment service. Please try again in a moment.", "gateway_unreachable");
  }
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const desc = (data as { error?: { description?: string } })?.error?.description;
    console.error("[razorpay]", method, path, res.status, desc ?? text.slice(0, 200));
    throw new ApiError(res.status >= 500 ? 502 : 400, desc ? `Payment service: ${desc}` : "The payment service could not process this request.", "gateway_error");
  }
  return data as T;
}

export type GatewayOrder = { id: string; amount: number; currency: string; status: string };
export const createGatewayOrder = (amountPaise: number, receipt: string, notes: Record<string, string>) =>
  call<GatewayOrder>("POST", "/orders", { amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40), notes });

export type GatewayRefund = { id: string; status: string; amount: number };
/** `idempotencyKey` makes a retried refund request safe: Razorpay returns the same refund instead of paying out twice. */
export const createGatewayRefund = (paymentId: string, amountPaise: number, receipt: string, idempotencyKey: string) =>
  call<GatewayRefund>("POST", `/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountPaise, speed: "normal", receipt: receipt.slice(0, 40) }, { "X-Refund-Idempotency": idempotencyKey });
