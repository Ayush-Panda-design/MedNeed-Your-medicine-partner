import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { listReminders, getRefillOptout } from "@/server/orders/refills";
import { RemindersManager } from "@/components/RemindersManager";

export const metadata: Metadata = { title: "Refill reminders" };
export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const claims = await requireUser("/account/reminders");
  const [reminders, optout] = await Promise.all([listReminders(claims.userId), getRefillOptout(claims.userId)]);
  return <RemindersManager initial={reminders} optout={optout} />;
}
