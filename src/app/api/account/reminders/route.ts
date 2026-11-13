import { z } from "zod";
import { handle, ok, readJson } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { listReminders, getRefillOptout, setRefillOptout } from "@/server/orders/refills";

export const GET = handle(async () => {
  const { userId } = await requireApiUser();
  const [reminders, optout] = await Promise.all([listReminders(userId), getRefillOptout(userId)]);
  return ok({ reminders, optout }, { headers: { "Cache-Control": "no-store" } });
});

export const PATCH = handle(async (req) => {
  const { userId } = await requireApiUser();
  const { optout } = await readJson(req, z.object({ optout: z.boolean() }));
  await setRefillOptout(userId, optout);
  return ok({ optout });
});
