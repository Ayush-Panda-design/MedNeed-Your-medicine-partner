import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { bulkAction } from "@/server/catalog/repo";
import { ACTIONS } from "@/server/catalog/schema";

const schema = z.object({ ids: z.array(z.uuid()).min(1, "Select at least one medicine").max(200, "Select at most 200 at a time"), action: z.enum(ACTIONS) });

export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin", "pharmacist"]);
  const { ids, action } = await readJson(req, schema);
  return ok(await bulkAction({ id: user.id, ip: clientIp(req) }, ids, action));
});
