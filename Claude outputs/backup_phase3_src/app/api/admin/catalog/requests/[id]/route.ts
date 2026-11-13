import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { setRequestStatus } from "@/server/catalog/requests";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ status: z.enum(["new", "contacted", "fulfilled", "cancelled"]) });

export const PATCH = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "pharmacist", "inventory_manager"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return ok({}, { status: 404 });
  const { status } = await readJson(req, schema);
  await setRequestStatus({ id: user.id, ip: clientIp(req) }, id, status);
  return ok({ updated: true });
});
