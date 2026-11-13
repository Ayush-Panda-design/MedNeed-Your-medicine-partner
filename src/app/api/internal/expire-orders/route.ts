import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { expirePendingOrders } from "@/server/orders/place";
import { processDueRefunds } from "@/server/payments/refunds";
import { processDueNotifications } from "@/server/notifications/queue";
import { backfillRefillReminders, dispatchDueRefills } from "@/server/orders/refills";
import { backfillEmbeddings } from "@/server/ai/vector-index";

// Called by a scheduler (cron, uptime pinger) every few minutes. Orders are also expired when anyone places an order,
// so this only keeps stock from staying held on a quiet store. It also retries refunds and sends any queued customer messages. Disabled unless CRON_SECRET is set.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("x-cron-secret") ?? "";
  if (!secret || secret.length < 16) return new NextResponse(null, { status: 404 });
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new NextResponse(null, { status: 401 });
  const expired = await expirePendingOrders();
  const refunds = await processDueRefunds();
  const notifications = await processDueNotifications(50);
  // Refill reminders are best-effort: a slow or unavailable AI must never fail the cron run.
  let refills: { scanned: number; created: number } = { scanned: 0, created: 0 };
  let refillsSent: { sent: number } = { sent: 0 };
  try {
    refills = await backfillRefillReminders(20);
    refillsSent = await dispatchDueRefills(20);
  } catch (e) {
    console.error("[cron] refills", e);
  }
  // Embed new/changed products for semantic search, batched to respect free-tier limits. Best-effort.
  let embeddings: { embedded: number; touched: number; pending: number } = { embedded: 0, touched: 0, pending: 0 };
  try {
    embeddings = await backfillEmbeddings();
  } catch (e) {
    console.error("[cron] embeddings", e);
  }
  return NextResponse.json({ expired, refunds, notifications, refills, refillsSent, embeddings });
}
