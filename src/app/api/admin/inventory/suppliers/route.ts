import { clientIp, handle, ok, readJson } from "@/server/http";
import { requireApiStaff } from "@/server/auth/session";
import { supplierInput } from "@/server/inventory/schema";
import { createSupplier, listSuppliers } from "@/server/inventory/suppliers";

export const GET = handle(async () => {
  await requireApiStaff(["admin", "inventory_manager"]);
  return ok({ suppliers: await listSuppliers() });
});

export const POST = handle(async (req) => {
  const { user } = await requireApiStaff(["admin", "inventory_manager"]);
  const body = await readJson(req, supplierInput);
  const id = await createSupplier({ id: user.id, ip: clientIp(req) }, body);
  return ok({ id }, { status: 201 });
});
