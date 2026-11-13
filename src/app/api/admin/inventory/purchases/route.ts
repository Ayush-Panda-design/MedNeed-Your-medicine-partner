import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { createPurchase } from "@/server/inventory/purchases";
import { purchaseInput } from "@/server/inventory/schema";

export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin", "inventory_manager"]);
  const body = await readJson(req, purchaseInput);
  const result = await createPurchase({ id: user.id, ip: clientIp(req) }, body);
  return ok(result, { status: result.replayed ? 200 : 201 });
});
