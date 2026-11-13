import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { adjustInput } from "@/server/inventory/schema";
import { adjustBatch } from "@/server/inventory/stock";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "inventory_manager"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return ok({ error: "Batch not found." }, { status: 404 });
  const body = await readJson(req, adjustInput);
  return ok(await adjustBatch({ id: user.id, ip: clientIp(req) }, id, body));
});
