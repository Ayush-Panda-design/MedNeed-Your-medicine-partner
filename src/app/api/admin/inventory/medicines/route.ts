import { handle, ok } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { searchMedicinesForPurchase } from "@/server/inventory/queries";

export const GET = handle(async (req) => {
  await requireApiStaff(["admin", "inventory_manager", "pharmacist"]);
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return ok({ items: await searchMedicinesForPurchase(q.slice(0, 80)) });
});
