import { z } from "zod";
import { ApiError, clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { audit } from "@/server/auth/users";
import { rateLimit } from "@/server/security/rate-limit";
import { verifyCheckoutSignature } from "@/server/payments/razorpay";
import { confirmPayment } from "@/server/payments/service";

// The browser reports a finished payment. The signature proves Razorpay (not the customer) produced it.
export const POST = handle(async (req) => {
  const claims = await requireApiUser();
  await rateLimit(`payverify:${claims.userId}`, Number(process.env.PAYMENT_RATE_LIMIT) || 20, 600, "Too many attempts. Please wait a few minutes.");
  const b = await readJson(req, z.object({ razorpay_order_id: z.string().min(5).max(60), razorpay_payment_id: z.string().min(5).max(60), razorpay_signature: z.string().min(10).max(200) }));
  if (!verifyCheckoutSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) {
    await audit(claims.userId, "payments.bad_signature", { gatewayOrderId: b.razorpay_order_id }, clientIp(req));
    throw new ApiError(400, "We could not verify this payment. If money was taken it will be matched or refunded automatically.", "bad_signature");
  }
  const r = await confirmPayment({ gatewayOrderId: b.razorpay_order_id, gatewayPaymentId: b.razorpay_payment_id, userId: claims.userId });
  if (!r) throw new ApiError(404, "Payment not found.");
  return ok({ orderId: r.orderId, outcome: r.outcome });
});
