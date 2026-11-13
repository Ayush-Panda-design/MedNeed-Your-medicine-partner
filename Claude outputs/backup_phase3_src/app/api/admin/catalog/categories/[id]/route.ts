import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { updateCategory } from "@/server/catalog/repo";
import { categoryInput } from "@/server/catalog/schema";

export const PATCH = handle<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin"]);
  const { id } = await params;
  const body = await readJson(req, categoryInput);
  await updateCategory({ id: user.id, ip: clientIp(req) }, id, body);
  return ok();
});
