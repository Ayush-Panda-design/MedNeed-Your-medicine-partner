import { z } from "zod";
import { ApiError, handle, ok, readJson } from "@/server/http";
import { requireApiUser } from "@/server/auth/session";
import { cancelReminder, snoozeReminder } from "@/server/orders/refills";

const schema = z.object({ action: z.enum(["cancel", "snooze"]), days: z.number().int().min(1).max(90).optional() });

export const PATCH = handle(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { userId } = await requireApiUser();
  const { id } = await ctx.params;
  const { action, days } = await readJson(req, schema);
  const done = action === "cancel" ? await cancelReminder(userId, id) : await snoozeReminder(userId, id, days ?? 14);
  if (!done) throw new ApiError(404, "Reminder not found.");
  return ok({ ok: true });
});
