import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { createCategory } from "@/server/catalog/repo";
import { categoryInput } from "@/server/catalog/schema";

export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin"]);
  const body = await readJson(req, categoryInput);
  const id = await createCategory({ id: user.id, ip: clientIp(req) }, body);
  return ok({ id }, { status: 201 });
});
