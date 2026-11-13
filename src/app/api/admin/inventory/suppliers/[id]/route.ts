import { z } from "zod";
import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { supplierInput } from "@/server/inventory/schema";
import { updateSupplier } from "@/server/inventory/suppliers";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle<Ctx>(async (req, { params }) => {
  const { user } = await requireApiStaff(["admin", "inventory_manager"]);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return ok({ error: "Supplier not found." }, { status: 404 });
  const body = await readJson(req, supplierInput);
  await updateSupplier({ id: user.id, ip: clientIp(req) }, id, body);
  return ok({ updated: true });
});
