import { clientIp, handle, ok } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { autoCategorise } from "@/server/catalog/categorise";

export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  return ok(await autoCategorise(undefined, { id: user.id, ip: clientIp(req) }));
});
